package org.myweb.flowmat.domain.workflow.domain.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Column;
import lombok.Getter;
import lombok.Setter;
import org.myweb.flowmat.global.common.CreatedUpdatedAuditEntity;

@Getter
@Setter
@Entity
@Table(name = "process")
public class Process extends CreatedUpdatedAuditEntity {

    @Id
    private String processId;

    private String projectId;
    private String workflowId;
    private String templateId;
    private String processName;
    private String processType;
    private String nodeType;
    private String processStatus;
    private String colorScheme;

    @Column(name = "pos_x")
    private Double posX;

    @Column(name = "pos_y")
    private Double posY;

    private Double width;
    private Double height;
    private String processDesc;

    @Column(name = "version")
    private int version = 1;

    @Column(name = "version_nonce")
    private int versionNonce;
}
