package org.myweb.flowmat.global.rbac.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "user_roles")
public class UserRole {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "user_roles_id")
    private UUID userRolesId;

    /** References users.id (UUID PK), not users.user_id (varchar). */
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "role_id", nullable = false)
    private UUID roleId;

    @Column(name = "scope_type")
    private String scopeType;

    @Column(name = "scope_id")
    private UUID scopeId;

    @Column(name = "granted_by")
    private UUID grantedBy;

    @Column(name = "granted_at")
    private OffsetDateTime grantedAt;
}
