ALTER TABLE users
    ADD COLUMN IF NOT EXISTS user_nickname varchar(50);

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_nickname
    ON users (lower(user_nickname))
    WHERE user_nickname IS NOT NULL;

CREATE TABLE IF NOT EXISTS social_accounts (
    social_account_id bigserial PRIMARY KEY,
    user_pk uuid NOT NULL,
    provider varchar(20) NOT NULL,
    provider_user_id varchar(100) NOT NULL,
    provider_email varchar(255),
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_social_accounts_user_pk
        FOREIGN KEY (user_pk) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT uq_social_accounts_provider_user UNIQUE (provider, provider_user_id),
    CONSTRAINT uq_social_accounts_user_provider UNIQUE (user_pk, provider)
);

CREATE INDEX IF NOT EXISTS ix_social_accounts_user_pk
    ON social_accounts (user_pk);
