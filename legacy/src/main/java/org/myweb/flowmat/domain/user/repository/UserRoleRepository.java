package org.myweb.flowmat.domain.user.repository;

import java.util.UUID;
import org.myweb.flowmat.domain.user.domain.entity.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRoleRepository extends JpaRepository<UserRole, UUID> {
}
