-- Remove the abandoned database-backed collaboration log; RedisGraphChangeStore is canonical.
DROP INDEX IF EXISTS "idx_graph_change_log_workflow_seq";
DROP TABLE IF EXISTS "graph_change_log";
