ALTER TABLE project ADD COLUMN time_zone varchar(100) NOT NULL DEFAULT 'Asia/Seoul';
ALTER TABLE project ADD COLUMN time_zone_version bigint NOT NULL DEFAULT 0 CHECK (time_zone_version >= 0);
ALTER TABLE project ADD COLUMN time_zone_updated_by varchar(50);
