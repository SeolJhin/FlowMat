-- V34: BOM line types (docs/domain/bom-by-products.md, benchmark FM-MFG-002). bom_line.line_type has existed since V1
-- and was always 'material'; a line can now also be a by-product or waste the batch gives off.
ALTER TABLE bom_line ADD CONSTRAINT ck_bom_line_type CHECK (line_type IN ('material', 'by_product', 'waste'));
