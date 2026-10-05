-- V49: Who should do a warehouse task (docs/domain/warehouse-task.md W7); empty while no one is named.
ALTER TABLE warehouse_task ADD COLUMN assigned_to varchar(50);
