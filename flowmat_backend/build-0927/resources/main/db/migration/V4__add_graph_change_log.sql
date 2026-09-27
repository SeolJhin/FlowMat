CREATE TABLE "graph_change_log" (
    "seq" BIGSERIAL PRIMARY KEY,
    "workflow_id" VARCHAR(64) NOT NULL,
    "change_type" VARCHAR(64) NOT NULL,
    "entity_id" VARCHAR(64) NOT NULL,
    "user_id" VARCHAR(64),
    "payload_json" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ
);

CREATE INDEX "idx_graph_change_log_workflow_seq"
    ON "graph_change_log" ("workflow_id", "seq");
