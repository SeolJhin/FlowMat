-- V74: In-app notifications of work given to someone (docs/domain/notification.md NT1-NT6) use the V1 notification
-- table. A notification about project work names the project, so it can be opened and shown only while the person can
-- still read that project; newest first per person.
ALTER TABLE notification ADD COLUMN project_id varchar(50);
CREATE INDEX ix_notification_user_created ON notification (user_id, created_at DESC);
