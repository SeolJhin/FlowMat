package org.myweb.flowmat.domain.user.domain.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "role_permissions")
public class RolePermission {

    @Id
    private UUID rolePermissionsId;

    private UUID roleId;
    private String resource;
    private String action;
    private String permissionCode;
}
