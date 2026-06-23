package org.myweb.flowmat.domain.user.repository;

import java.util.Optional;
import java.util.UUID;
import org.myweb.flowmat.domain.user.domain.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByUserId(String userId);

    Optional<User> findByUserEmail(String userEmail);

    Optional<User> findByUserIdOrUserEmail(String userId, String userEmail);

    boolean existsByUserId(String userId);

    boolean existsByUserEmail(String userEmail);
}