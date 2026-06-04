package org.myweb.flowmat.domain.user.domain.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "user_login_history")
public class UserLoginHistory {

    @Id
    private UUID loginHistoryId;

    private UUID userId;
    private String loginIp;
    private String loginResult;
    private OffsetDateTime loginAt;
}
