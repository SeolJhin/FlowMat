package org.myweb.flowmat.domain.project.domain.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.myweb.flowmat.global.common.CreatedUpdatedAuditEntity;

@Getter
@Setter
@Entity
@Table(name = "project")
public class Project extends CreatedUpdatedAuditEntity {

    @Id
    private String projectId;

    private String projectName;
    private String ownerId;
    private String projectDesc;
    private String projectStatus;
    private String visibility;
    private String currentWorkflowId;
}
