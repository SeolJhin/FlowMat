-- V15: make unit_master usable as shared master data.

-- Unit codes are looked up case-insensitively, so keep them unique that way.
CREATE UNIQUE INDEX IF NOT EXISTS ux_unit_master_unit_code ON unit_master (lower(unit_code));

-- New permission for editing global master data (units); granted to the built-in admin role.
INSERT INTO role_permissions (role_permissions_id, role_id, resource, action, permission_code)
SELECT gen_random_uuid(), r.role_id, 'master_data', 'manage', 'master_data:manage'
FROM roles r
WHERE r.role_name = 'admin'
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp
      WHERE rp.role_id = r.role_id
        AND rp.permission_code = 'master_data:manage'
  );

-- Common units. Base units carry rate 1; derived units convert to their base (1 g = 0.001 kg).
INSERT INTO unit_master (unit_id, unit_code, unit_name, unit_type, base_unit_code, conversion_rate, active_yn)
VALUES
    ('unit_ea', 'ea', 'Each',       'count',  NULL, 1,     'Y'),
    ('unit_kg', 'kg', 'Kilogram',   'mass',   NULL, 1,     'Y'),
    ('unit_g',  'g',  'Gram',       'mass',   'kg', 0.001, 'Y'),
    ('unit_t',  't',  'Tonne',      'mass',   'kg', 1000,  'Y'),
    ('unit_l',  'l',  'Litre',      'volume', NULL, 1,     'Y'),
    ('unit_ml', 'ml', 'Millilitre', 'volume', 'l',  0.001, 'Y'),
    ('unit_m',  'm',  'Metre',      'length', NULL, 1,     'Y'),
    ('unit_cm', 'cm', 'Centimetre', 'length', 'm',  0.01,  'Y'),
    ('unit_mm', 'mm', 'Millimetre', 'length', 'm',  0.001, 'Y')
ON CONFLICT DO NOTHING;
