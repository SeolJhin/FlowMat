CREATE TABLE IF NOT EXISTS admin_user_action_log (
    action_log_id UUID PRIMARY KEY,
    actor_user_id VARCHAR(100) NOT NULL,
    target_user_id VARCHAR(100) NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    previous_value VARCHAR(100),
    new_value VARCHAR(100),
    reason VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_user_action_log_target_created
    ON admin_user_action_log (target_user_id, created_at DESC);
