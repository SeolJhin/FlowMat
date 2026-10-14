-- V79: Notifications people choose per project (docs/domain/notification.md NS1-NS9; user decision 2026-10-13). A row means
-- the person wants that topic in that project. A reminder the hourly sweep sends carries a key, so the same reminder reaches
-- a person once.
CREATE TABLE notification_subscription (
    subscription_id varchar(50) PRIMARY KEY,
    project_id varchar(50) NOT NULL REFERENCES project(project_id),
    user_id varchar(50) NOT NULL,
    topic varchar(30) NOT NULL CHECK (topic IN ('stock_alert', 'ncr_check_overdue', 'work_order_due')),
    days_ahead integer CHECK (days_ahead IS NULL OR days_ahead BETWEEN 0 AND 30),
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL,
    CONSTRAINT uq_notification_subscription UNIQUE (project_id, user_id, topic),
    CONSTRAINT ck_notification_subscription_days CHECK ((topic = 'work_order_due') = (days_ahead IS NOT NULL))
);
CREATE INDEX ix_notification_subscription_topic ON notification_subscription(topic, project_id);

ALTER TABLE notification ADD COLUMN IF NOT EXISTS dedupe_key varchar(200);
CREATE UNIQUE INDEX ux_notification_dedupe ON notification(user_id, dedupe_key) WHERE dedupe_key IS NOT NULL;
