package org.myweb.flowmat.global.rbac.repository;

import java.util.Collection;
import java.util.UUID;
import org.myweb.flowmat.global.rbac.entity.RolePermission;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RolePermissionRepository extends JpaRepository<RolePermission, UUID> {

    boolean existsByRoleIdInAndPermissionCode(Collection<UUID> roleIds, String permissionCode);
}
