package org.myweb.flowmat.domain.user.repository;

import java.util.UUID;
import org.myweb.flowmat.domain.user.domain.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, UUID> {
}
