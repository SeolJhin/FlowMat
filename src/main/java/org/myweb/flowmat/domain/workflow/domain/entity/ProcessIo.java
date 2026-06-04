package org.myweb.flowmat.domain.workflow.domain.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.myweb.flowmat.global.common.CreatedUpdatedAuditEntity;

@Getter
@Setter
@Entity
@Table(name = "process_io")
public class ProcessIo extends CreatedUpdatedAuditEntity {

    @Id
    private String processIoId;

    private String processId;
    private String itemId;
    private String direction;
    private String ioType;
    private String unit;
}
