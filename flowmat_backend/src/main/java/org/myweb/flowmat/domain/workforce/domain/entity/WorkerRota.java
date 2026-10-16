package org.myweb.flowmat.domain.workforce.domain.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;

/**
 * A worker's rota in a project (docs/domain/worker-calendar.md WC44, V87): their weekly shifts repeat every
 * {@code cycleWeeks} weeks, week 1 being the week that starts on the Monday {@code startsOn}. None for a one-week pattern.
 */
@Getter
@Setter
@Entity
@Table(name = "worker_rota")
public class WorkerRota {

    @Id
    private String workerRotaId;

    private String projectId;
    private String userId;
    private int cycleWeeks;
    private LocalDate startsOn;
    private String updatedBy;
    private OffsetDateTime updatedAt;
}
