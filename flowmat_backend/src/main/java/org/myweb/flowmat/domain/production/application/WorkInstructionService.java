package org.myweb.flowmat.domain.production.application;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.catalog.application.publicapi.CatalogItemView;
import org.myweb.flowmat.domain.catalog.application.publicapi.CatalogQuery;
import org.myweb.flowmat.domain.production.api.dto.request.WorkInstructionRequest;
import org.myweb.flowmat.domain.production.api.dto.request.WorkInstructionStepRequest;
import org.myweb.flowmat.domain.production.api.dto.response.WorkInstructionResponse;
import org.myweb.flowmat.domain.production.domain.entity.WorkInstruction;
import org.myweb.flowmat.domain.production.domain.entity.WorkInstructionStep;
import org.myweb.flowmat.domain.production.repository.WorkInstructionRepository;
import org.myweb.flowmat.domain.production.repository.WorkInstructionStepRepository;
import org.myweb.flowmat.domain.project.application.ProjectAccessService;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.myweb.flowmat.global.id.IdGenerator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Work instruction revisions per product (docs/domain/work-instruction.md). Only a draft changes; releasing retires the
 * released revision before it, and a new revision starts as a copy of a released or retired one.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkInstructionService {

    static final String DRAFT = "draft";
    static final String RELEASED = "released";
    static final String RETIRED = "retired";
    private static final String NOT_DELETED = "N";

    private final WorkInstructionRepository instructionRepository;
    private final InstructionAttachmentService attachments;
    private final WorkInstructionStepRepository stepRepository;
    private final CatalogQuery catalogQuery;
    private final ProjectAccessService projectAccessService;
    private final IdGenerator idGenerator;

    public List<WorkInstructionResponse> list(String projectId, String itemId) {
        if (projectId == null || projectId.isBlank()) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "projectId is required.");
        }
        projectAccessService.requireProjectReadAccess(projectId);
        List<WorkInstruction> instructions = instructionRepository
            .findAllByProjectIdAndDeletedYnOrderByItemIdAscRevisionNoDesc(projectId.trim(), NOT_DELETED).stream()
            .filter(instruction -> itemId == null || itemId.isBlank() || instruction.getItemId().equals(itemId.trim()))
            .toList();
        return responses(instructions);
    }

    @Transactional
    public WorkInstructionResponse create(WorkInstructionRequest request) {
        if (request == null || request.projectId() == null || request.projectId().isBlank()) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "projectId is required.");
        }
        String projectId = request.projectId().trim();
        projectAccessService.requireProjectWriteAccess(projectId);
        CatalogItemView item = catalogQuery.findProjectItem(projectId, request.itemId() == null ? "" : request.itemId().trim())
            .orElseThrow(() -> new BusinessException(ErrorCode.BAD_REQUEST, "itemId is not an item of this project."));
        List<WorkInstruction> revisions = instructionRepository.findAllByItemIdAndDeletedYnOrderByRevisionNoDesc(item.itemId(), NOT_DELETED);
        requireNoDraft(revisions);
        WorkInstruction instruction = new WorkInstruction();
        instruction.setInstructionId(idGenerator.generate());
        instruction.setProjectId(projectId);
        instruction.setItemId(item.itemId());
        instruction.setRevisionNo(nextRevision(item.itemId(), revisions));
        instruction.setStatus(DRAFT);
        applyText(instruction, request);
        instruction.setCreatedBy(projectAccessService.requireCurrentUserId());
        return response(instructionRepository.save(instruction));
    }

    @Transactional
    public WorkInstructionResponse update(String instructionId, WorkInstructionRequest request) {
        WorkInstruction instruction = findDraft(instructionId);
        if (request == null) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "title is required.");
        }
        applyText(instruction, request);
        instruction.setUpdatedBy(projectAccessService.requireCurrentUserId());
        return response(instructionRepository.save(instruction));
    }

    @Transactional
    public WorkInstructionResponse addStep(String instructionId, WorkInstructionStepRequest request) {
        WorkInstruction instruction = findDraft(instructionId);
        String text = ProductionText.trimToNull(request == null ? null : request.text(), "text");
        if (text == null) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "The step needs a text.");
        }
        if (text.length() > 500) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "A step can be at most 500 characters.");
        }
        boolean recordsValue = Boolean.TRUE.equals(request.recordsValue());
        String label = recordsValue ? ProductionText.trimToNull(request.valueLabel(), "valueLabel") : null;
        if (label != null && label.length() > 100) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "valueLabel can be at most 100 characters.");
        }
        if (!recordsValue && (request.valueMin() != null || request.valueMax() != null)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Limits need a step that records a value.");
        }
        if (request.valueMin() != null && request.valueMax() != null && request.valueMin().compareTo(request.valueMax()) > 0) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "valueMin must not be above valueMax.");
        }
        List<WorkInstructionStep> steps = stepRepository.findAllByInstructionIdOrderByStepNoAsc(instruction.getInstructionId());
        WorkInstructionStep step = new WorkInstructionStep();
        step.setStepId(idGenerator.generate());
        step.setInstructionId(instruction.getInstructionId());
        step.setStepNo(steps.isEmpty() ? 1 : steps.get(steps.size() - 1).getStepNo() + 1);
        step.setStepText(text);
        step.setRequiredYn(Boolean.FALSE.equals(request.required()) ? "N" : "Y");
        step.setRecordsValueYn(recordsValue ? "Y" : "N");
        step.setValueLabel(label);
        step.setValueMin(request.valueMin());
        step.setValueMax(request.valueMax());
        stepRepository.save(step);
        touch(instruction);
        return response(instruction);
    }

    /** Removes a draft's step and numbers the rest again from 1. */
    @Transactional
    public WorkInstructionResponse removeStep(String instructionId, String stepId) {
        WorkInstruction instruction = findDraft(instructionId);
        List<WorkInstructionStep> steps = new ArrayList<>(stepRepository.findAllByInstructionIdOrderByStepNoAsc(instruction.getInstructionId()));
        WorkInstructionStep removed = steps.stream().filter(step -> step.getStepId().equals(stepId)).findFirst()
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        steps.remove(removed);
        stepRepository.delete(removed);
        stepRepository.flush();
        for (int index = 0; index < steps.size(); index++) {
            steps.get(index).setStepNo(index + 1);
        }
        stepRepository.saveAll(steps);
        touch(instruction);
        return response(instruction);
    }

    /** A draft with at least one step becomes the released revision; the one released before it is retired. */
    @Transactional
    public WorkInstructionResponse release(String instructionId) {
        WorkInstruction instruction = findInstructionForUpdate(instructionId);
        projectAccessService.requireProjectOwnerAccess(instruction.getProjectId());
        if (!DRAFT.equals(instruction.getStatus())) {
            throw new BusinessException(ErrorCode.CONFLICT, "Revision " + instruction.getRevisionNo() + " is " + instruction.getStatus() + ".");
        }
        if (stepRepository.findAllByInstructionIdOrderByStepNoAsc(instruction.getInstructionId()).isEmpty()) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Add at least one step before releasing.");
        }
        String actor = projectAccessService.requireCurrentUserId();
        instructionRepository.findFirstByItemIdAndStatusAndDeletedYn(instruction.getItemId(), RELEASED, NOT_DELETED).ifPresent(previous -> {
            previous.setStatus(RETIRED);
            previous.setUpdatedBy(actor);
            instructionRepository.saveAndFlush(previous);
        });
        instruction.setStatus(RELEASED);
        instruction.setReleasedBy(actor);
        instruction.setReleasedAt(OffsetDateTime.now());
        instruction.setUpdatedBy(actor);
        return response(instructionRepository.save(instruction));
    }

    /** A new draft revision copied from a released or retired one. */
    @Transactional
    public WorkInstructionResponse revise(String instructionId) {
        WorkInstruction source = findInstructionForUpdate(instructionId);
        projectAccessService.requireProjectWriteAccess(source.getProjectId());
        if (DRAFT.equals(source.getStatus())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Revision " + source.getRevisionNo() + " is a draft; edit it instead.");
        }
        List<WorkInstruction> revisions = instructionRepository.findAllByItemIdAndDeletedYnOrderByRevisionNoDesc(source.getItemId(), NOT_DELETED);
        requireNoDraft(revisions);
        String actor = projectAccessService.requireCurrentUserId();
        WorkInstruction copy = new WorkInstruction();
        copy.setInstructionId(idGenerator.generate());
        copy.setProjectId(source.getProjectId());
        copy.setItemId(source.getItemId());
        copy.setRevisionNo(nextRevision(source.getItemId(), revisions));
        copy.setStatus(DRAFT);
        copy.setTitle(source.getTitle());
        copy.setBody(source.getBody());
        copy.setDocumentUrl(source.getDocumentUrl());
        copy.setBlocksFinishYn(source.getBlocksFinishYn());
        copy.setCreatedBy(actor);
        instructionRepository.save(copy);
        attachments.copyReferences(source.getInstructionId(), copy.getInstructionId(), actor);
        for (WorkInstructionStep sourceStep : stepRepository.findAllByInstructionIdOrderByStepNoAsc(source.getInstructionId())) {
            WorkInstructionStep step = new WorkInstructionStep();
            step.setStepId(idGenerator.generate());
            step.setInstructionId(copy.getInstructionId());
            step.setStepNo(sourceStep.getStepNo());
            step.setStepText(sourceStep.getStepText());
            step.setRequiredYn(sourceStep.getRequiredYn());
            step.setRecordsValueYn(sourceStep.getRecordsValueYn());
            step.setValueLabel(sourceStep.getValueLabel());
            step.setValueMin(sourceStep.getValueMin());
            step.setValueMax(sourceStep.getValueMax());
            stepRepository.save(step);
        }
        return response(copy);
    }

    @Transactional
    public void delete(String instructionId) {
        WorkInstruction instruction = findDraft(instructionId);
        instruction.setDeletedYn("Y");
        instruction.setUpdatedBy(projectAccessService.requireCurrentUserId());
        instructionRepository.save(instruction);
    }

    /** The released revision for an item, or null. For the run checklist. */
    WorkInstruction released(String itemId) {
        return itemId == null ? null
            : instructionRepository.findFirstByItemIdAndStatusAndDeletedYn(itemId, RELEASED, NOT_DELETED).orElse(null);
    }

    WorkInstructionResponse response(WorkInstruction instruction) {
        return responses(List.of(instruction)).get(0);
    }

    private List<WorkInstructionResponse> responses(List<WorkInstruction> instructions) {
        if (instructions.isEmpty()) {
            return List.of();
        }
        Map<String, List<WorkInstructionStep>> steps = stepRepository.findAllByInstructionIdInOrderByStepNoAsc(
                instructions.stream().map(WorkInstruction::getInstructionId).toList()).stream()
            .collect(Collectors.groupingBy(WorkInstructionStep::getInstructionId));
        Map<String, CatalogItemView> items = catalogQuery.findItems(instructions.stream().map(WorkInstruction::getItemId).distinct().toList());
        return instructions.stream()
            .map(instruction -> {
                CatalogItemView item = items.get(instruction.getItemId());
                List<WorkInstructionResponse.Step> stepResponses = steps.getOrDefault(instruction.getInstructionId(), List.of()).stream()
                    .sorted(Comparator.comparing(WorkInstructionStep::getStepNo))
                    .map(step -> new WorkInstructionResponse.Step(step.getStepId(), step.getStepNo(), step.getStepText(),
                        "Y".equals(step.getRequiredYn()), "Y".equals(step.getRecordsValueYn()), step.getValueLabel(),
                        step.getValueMin(), step.getValueMax()))
                    .toList();
                return new WorkInstructionResponse(instruction.getInstructionId(), instruction.getProjectId(), instruction.getItemId(),
                    item == null ? null : item.itemCode(), item == null ? null : item.itemName(), instruction.getRevisionNo(),
                    instruction.getStatus(), instruction.getTitle(), instruction.getBody(), instruction.getDocumentUrl(),
                    instruction.getReleasedBy(), instruction.getReleasedAt(), instruction.getUpdatedAt(), stepResponses,
                    "Y".equals(instruction.getBlocksFinishYn()));
            })
            .toList();
    }

    /**
     * One more than the highest revision the item ever had, deleted drafts included, so a number is never used twice
     * (a deleted draft's row keeps its number).
     */
    private int nextRevision(String itemId, List<WorkInstruction> live) {
        int highest = live.isEmpty() ? 0 : live.get(0).getRevisionNo();
        for (WorkInstruction any : instructionRepository.findAllByItemIdAndDeletedYnOrderByRevisionNoDesc(itemId, "Y")) {
            highest = Math.max(highest, any.getRevisionNo());
        }
        return highest + 1;
    }

    private void applyText(WorkInstruction instruction, WorkInstructionRequest request) {
        String title = ProductionText.trimToNull(request.title(), "title");
        if (title == null) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "title is required.");
        }
        if (title.length() > 200) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "title can be at most 200 characters.");
        }
        ProductionText.requireStorable(request.body(), "body");
        String body = request.body() == null || request.body().isBlank() ? null : request.body().strip();
        if (body != null && body.length() > 20000) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "body can be at most 20000 characters.");
        }
        instruction.setTitle(title);
        instruction.setBody(body);
        instruction.setDocumentUrl(documentUrl(request.documentUrl()));
        if (request.blocksFinish() != null) {
            instruction.setBlocksFinishYn(request.blocksFinish() ? "Y" : "N");
        }
    }

    /** Blank clears it; only an absolute http or https address with a host is kept, since the link is opened from the run. */
    private static String documentUrl(String value) {
        String url = ProductionText.trimToNull(value, "documentUrl");
        if (url == null) {
            return null;
        }
        if (url.length() <= 500) {
            try {
                java.net.URI uri = new java.net.URI(url);
                String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
                if ((scheme.equals("http") || scheme.equals("https")) && uri.getHost() != null && !uri.getHost().isBlank()) {
                    return url;
                }
            } catch (java.net.URISyntaxException exception) {
                // Refused below.
            }
        }
        throw new BusinessException(ErrorCode.BAD_REQUEST,
            "documentUrl must be an http or https address of at most 500 characters, like https://docs.example.com/wi-12.pdf.");
    }

    private void touch(WorkInstruction instruction) {
        instruction.setUpdatedBy(projectAccessService.requireCurrentUserId());
        instruction.setUpdatedAt(OffsetDateTime.now());
        instructionRepository.save(instruction);
    }

    private static void requireNoDraft(List<WorkInstruction> revisions) {
        revisions.stream().filter(revision -> DRAFT.equals(revision.getStatus())).findFirst().ifPresent(draft -> {
            throw new BusinessException(ErrorCode.CONFLICT,
                "Revision " + draft.getRevisionNo() + " is still a draft; edit it or delete it first.");
        });
    }

    private WorkInstruction findDraft(String instructionId) {
        WorkInstruction instruction = findInstructionForUpdate(instructionId);
        projectAccessService.requireProjectWriteAccess(instruction.getProjectId());
        if (!DRAFT.equals(instruction.getStatus())) {
            throw new BusinessException(ErrorCode.CONFLICT, "Revision " + instruction.getRevisionNo() + " is " + instruction.getStatus()
                + "; make a new revision to change it.");
        }
        return instruction;
    }

    private WorkInstruction findInstructionForUpdate(String instructionId) {
        return instructionRepository.findForUpdate(instructionId)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }
}
