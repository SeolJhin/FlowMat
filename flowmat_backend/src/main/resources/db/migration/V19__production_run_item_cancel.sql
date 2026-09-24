-- V19: A recorded production run item can be cancelled (wrong item, LOT or quantity). The row stays for the audit
-- trail; its stock movement is reversed and the run's LOT genealogy is rebuilt without it.
ALTER TABLE production_run_item ADD COLUMN IF NOT EXISTS cancelled_yn char(1) NOT NULL DEFAULT 'N';
ALTER TABLE production_run_item ADD COLUMN IF NOT EXISTS cancelled_by varchar(50);
ALTER TABLE production_run_item ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
ALTER TABLE production_run_item ADD COLUMN IF NOT EXISTS cancel_reason varchar(500);
