package org.myweb.flowmat.domain.production.domain.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;

/** An operator's confirmation of one instruction step on one production run (docs/domain/work-instruction.md). */
@Getter
@Setter
@Entity
@Table(name = "run_instruction_check")
public class RunInstructionCheck {

    @Id
    private String checkId;

    private String productionRunId;
    private String instructionId;
    private String stepId;
    private String checkValue;
    private String note;
    private String checkedBy;
    private OffsetDateTime checkedAt;
}
