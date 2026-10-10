-- V63: A BOM material line can be a phantom: its sub-assembly is not stocked, so the line is replaced by that item's own
-- BOM materials wherever the BOM is used (docs/domain/multi-level-bom.md P1-P7, DECISIONS-2026-10-05 section 5). Only a
-- material line (blank line type counts as material) can be one.
ALTER TABLE bom_line ADD COLUMN IF NOT EXISTS phantom_yn char(1) NOT NULL DEFAULT 'N';
ALTER TABLE bom_line ADD CONSTRAINT ck_bom_line_phantom_yn CHECK (phantom_yn IN ('Y', 'N'));
ALTER TABLE bom_line ADD CONSTRAINT ck_bom_line_phantom_material CHECK (phantom_yn = 'N' OR line_type IS NULL OR line_type = 'material');
