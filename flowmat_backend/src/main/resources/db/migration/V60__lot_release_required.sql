-- V60: Items whose new LOTs wait for their receipt checks before their stock can be used (docs/domain/lot-release.md,
-- DECISIONS-2026-10-05 section 6). Existing items keep 'N', so their new LOTs start available as before.
ALTER TABLE item ADD COLUMN IF NOT EXISTS lot_release_required_yn char(1) NOT NULL DEFAULT 'N';
ALTER TABLE item ADD CONSTRAINT ck_item_lot_release_required_yn CHECK (lot_release_required_yn IN ('Y', 'N'));
