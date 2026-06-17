package org.myweb.flowmat.domain.project.domain.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;
import org.myweb.flowmat.global.common.BaseTimeEntity;

@Getter
@Setter
@Entity
@Table(name = "project_invite")
public class ProjectInvite extends BaseTimeEntity {

    @Id
    private String inviteId;

    private String projectId;
    private String invitedEmail;
    private String invitedUserId;
    private String projectRole;
    private String inviteStatus;
    private String inviteToken;
    private String invitedBy;
    private OffsetDateTime expiredAt;
}
