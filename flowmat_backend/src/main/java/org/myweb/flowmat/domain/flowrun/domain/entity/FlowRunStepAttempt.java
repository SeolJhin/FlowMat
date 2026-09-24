package org.myweb.flowmat.domain.flowrun.domain.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "flow_run_step_attempt")
public class FlowRunStepAttempt {
    @Id private String attemptId;
    private String stepId;
    private Integer attemptNo;
    private String status;
    private OffsetDateTime startedAt;
    private OffsetDateTime endedAt;
    private OffsetDateTime retryAt;
    private String errorCode;
    private String errorMessage;
}
