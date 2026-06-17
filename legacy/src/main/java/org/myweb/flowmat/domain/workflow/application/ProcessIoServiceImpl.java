package org.myweb.flowmat.domain.workflow.application;

import java.math.BigDecimal;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.catalog.domain.entity.Item;
import org.myweb.flowmat.domain.catalog.repository.ItemRepository;
import org.myweb.flowmat.domain.workflow.api.dto.request.ProcessIoCreateRequest;
import org.myweb.flowmat.domain.workflow.api.dto.request.ProcessIoUpdateRequest;
import org.myweb.flowmat.domain.workflow.api.dto.response.ProcessIoResponse;
import org.myweb.flowmat.domain.workflow.domain.entity.Process;
import org.myweb.flowmat.domain.workflow.domain.entity.ProcessIo;
import org.myweb.flowmat.domain.workflow.repository.ProcessIoRepository;
import org.myweb.flowmat.domain.workflow.repository.ProcessRepository;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.myweb.flowmat.global.id.IdGenerator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProcessIoServiceImpl implements ProcessIoService {

    private static final String NOT_DELETED = "N";
    private static final String DELETED = "Y";
    private static final String INPUT_DEFAULT_COLOR = "sky";
    private static final String OUTPUT_DEFAULT_COLOR = "emerald";
    private static final String DEFAULT_COLOR = "slate";

    private final ProcessIoRepository processIoRepository;
    private final ProcessRepository processRepository;
    private final ItemRepository itemRepository;
    private final IdGenerator idGenerator;

    @Override
    public List<ProcessIoResponse> listProcessIos(String processId) {
        findActiveProcess(processId);
        return processIoRepository.findAllByProcessIdAndDeletedYnOrderByCreatedAtAsc(processId, NOT_DELETED).stream()
            .map(ProcessIoServiceImpl::toResponse)
            .toList();
    }

    @Override
    @Transactional
    public ProcessIoResponse createProcessIo(ProcessIoCreateRequest request) {
        Process process = findActiveProcess(request.processId());
        Item item = findActiveItem(request.itemId());
        validateSameProject(process.getProjectId(), item.getProjectId());

        ProcessIo processIo = new ProcessIo();
        processIo.setProcessIoId(idGenerator.generate());
        processIo.setProcessId(process.getProcessId());
        processIo.setItemId(item.getItemId());
        processIo.setIoName(trimToNull(request.ioName()));
        processIo.setDirection(request.direction().trim().toLowerCase());
        processIo.setIoType(defaultIfBlank(request.ioType(), "material"));
        processIo.setQuantity(defaultIfNull(request.quantity(), BigDecimal.ZERO));
        processIo.setUnit(request.unit().trim());
        processIo.setFormula(trimToNull(request.formula()));
        processIo.setColorScheme(defaultColorScheme(request.colorScheme(), request.direction()));
        processIo.setRequiredYn(defaultYn(request.requiredYn(), "Y"));
        processIo.setAllowShortageYn(defaultYn(request.allowShortageYn(), "N"));
        processIo.setDeletedYn(NOT_DELETED);
        return toResponse(processIoRepository.save(processIo));
    }

    @Override
    public ProcessIoResponse getProcessIo(String processIoId) {
        return toResponse(findActiveProcessIo(processIoId));
    }

    @Override
    @Transactional
    public ProcessIoResponse updateProcessIo(String processIoId, ProcessIoUpdateRequest request) {
        ProcessIo processIo = findActiveProcessIo(processIoId);

        if (hasText(request.itemId())) {
            Item item = findActiveItem(request.itemId());
            Process process = findActiveProcess(processIo.getProcessId());
            validateSameProject(process.getProjectId(), item.getProjectId());
            processIo.setItemId(item.getItemId());
        }
        if (request.ioName() != null) {
            processIo.setIoName(trimToNull(request.ioName()));
        }
        if (hasText(request.direction())) {
            processIo.setDirection(request.direction().trim().toLowerCase());
        }
        if (hasText(request.ioType())) {
            processIo.setIoType(request.ioType().trim().toLowerCase());
        }
        if (request.quantity() != null) {
            processIo.setQuantity(request.quantity());
        }
        if (hasText(request.unit())) {
            processIo.setUnit(request.unit().trim());
        }
        if (request.formula() != null) {
            processIo.setFormula(trimToNull(request.formula()));
        }
        if (request.colorScheme() != null) {
            processIo.setColorScheme(normalizeColorScheme(request.colorScheme()));
        } else if (request.direction() != null && processIo.getColorScheme() == null) {
            processIo.setColorScheme(defaultColorScheme(null, processIo.getDirection()));
        }
        if (request.requiredYn() != null) {
            processIo.setRequiredYn(defaultYn(request.requiredYn(), processIo.getRequiredYn()));
        }
        if (request.allowShortageYn() != null) {
            processIo.setAllowShortageYn(defaultYn(request.allowShortageYn(), processIo.getAllowShortageYn()));
        }
        return toResponse(processIoRepository.save(processIo));
    }

    @Override
    @Transactional
    public void deleteProcessIo(String processIoId) {
        ProcessIo processIo = findActiveProcessIo(processIoId);
        processIo.setDeletedYn(DELETED);
        processIoRepository.save(processIo);
    }

    private Process findActiveProcess(String processId) {
        return processRepository.findByProcessIdAndDeletedYn(processId, NOT_DELETED)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    private Item findActiveItem(String itemId) {
        return itemRepository.findByItemIdAndDeletedYn(itemId, NOT_DELETED)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    private ProcessIo findActiveProcessIo(String processIoId) {
        return processIoRepository.findByProcessIoIdAndDeletedYn(processIoId, NOT_DELETED)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    private static ProcessIoResponse toResponse(ProcessIo processIo) {
        return new ProcessIoResponse(
            processIo.getProcessIoId(),
            processIo.getProcessId(),
            processIo.getItemId(),
            processIo.getIoName(),
            processIo.getDirection(),
            processIo.getIoType(),
            processIo.getQuantity(),
            processIo.getUnit(),
            processIo.getFormula(),
            processIo.getColorScheme(),
            processIo.getRequiredYn(),
            processIo.getAllowShortageYn()
        );
    }

    private static void validateSameProject(String processProjectId, String itemProjectId) {
        if (!processProjectId.equals(itemProjectId)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST);
        }
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private static String trimToNull(String value) {
        return hasText(value) ? value.trim() : null;
    }

    private static String defaultIfBlank(String value, String defaultValue) {
        return hasText(value) ? value.trim().toLowerCase() : defaultValue;
    }

    private static BigDecimal defaultIfNull(BigDecimal value, BigDecimal defaultValue) {
        return value != null ? value : defaultValue;
    }

    private static String defaultYn(String value, String defaultValue) {
        return hasText(value) ? value.trim().toUpperCase() : defaultValue;
    }

    private static String defaultColorScheme(String value, String direction) {
        if (hasText(value)) {
            return normalizeColorScheme(value);
        }
        if ("input".equalsIgnoreCase(direction)) {
            return INPUT_DEFAULT_COLOR;
        }
        if ("output".equalsIgnoreCase(direction)) {
            return OUTPUT_DEFAULT_COLOR;
        }
        return DEFAULT_COLOR;
    }

    private static String normalizeColorScheme(String value) {
        return value.trim().toLowerCase();
    }
}
