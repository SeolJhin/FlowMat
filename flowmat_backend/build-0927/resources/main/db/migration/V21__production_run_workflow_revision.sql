ALTER TABLE production_run
    ADD COLUMN workflow_revision_id varchar(50);

ALTER TABLE production_run
    ADD CONSTRAINT fk_production_run_workflow_revision
    FOREIGN KEY (workflow_revision_id) REFERENCES workflow_revision(workflow_revision_id);

CREATE INDEX idx_production_run_workflow_revision_id
    ON production_run (workflow_revision_id);
