BEGIN;kk

CREATE TABLE business_types (
  id SERIAL PRIMARY KEY,
  type_code VARCHAR(50) NOT NULL,
  type_name VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE UNIQUE INDEX "IDX_89816b980411fcf28091eebb9c" ON business_types (type_code);

CREATE TABLE industries (
  id SERIAL PRIMARY KEY,
  industry_code VARCHAR(50) NOT NULL,
  industry_name VARCHAR(255) NOT NULL,
  level INT NOT NULL,
  parent_id INT NULL,
  CONSTRAINT fk_industries_parent FOREIGN KEY (parent_id) REFERENCES industries(id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX "IDX_a5f1789ac5745079968d31cd14" ON industries (industry_code);

-- Baseline catalogue entries used by the existing Enterprise CRUD collection.
INSERT INTO business_types (type_code, type_name)
VALUES ('TNHH1', 'Công ty TNHH một thành viên')
ON CONFLICT (type_code) DO NOTHING;

INSERT INTO industries (industry_code, industry_name, level)
VALUES ('6201', 'Lập trình máy vi tính', 4)
ON CONFLICT (industry_code) DO NOTHING;

ALTER TABLE enterprises
  ADD COLUMN business_type_id INT,
  ADD COLUMN industry_id INT;

INSERT INTO business_types (type_code, type_name)
SELECT DISTINCT business_type, business_type
FROM enterprises
WHERE business_type IS NOT NULL
ON CONFLICT (type_code) DO NOTHING;

INSERT INTO industries (industry_code, industry_name, level)
SELECT DISTINCT main_industry, main_industry, 4
FROM enterprises
WHERE main_industry IS NOT NULL
ON CONFLICT (industry_code) DO NOTHING;

UPDATE enterprises enterprise
SET business_type_id = business_type.id
FROM business_types business_type
WHERE business_type.type_code = enterprise.business_type;

UPDATE enterprises enterprise
SET industry_id = industry.id
FROM industries industry
WHERE industry.industry_code = enterprise.main_industry;

ALTER TABLE enterprises
  ALTER COLUMN business_type_id SET NOT NULL,
  ALTER COLUMN industry_id SET NOT NULL,
  ADD CONSTRAINT fk_enterprises_business_type
    FOREIGN KEY (business_type_id) REFERENCES business_types(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_enterprises_industry
    FOREIGN KEY (industry_id) REFERENCES industries(id) ON DELETE RESTRICT;

ALTER TABLE enterprises RENAME COLUMN company_name TO enterprise_name;
ALTER TABLE enterprises RENAME COLUMN license_date TO registration_date;
ALTER TABLE enterprises RENAME COLUMN province TO province_id;
ALTER TABLE enterprises RENAME COLUMN ward TO ward_id;
ALTER TABLE enterprises RENAME COLUMN office_phone TO phone_number;
ALTER TABLE enterprises RENAME COLUMN operating_province TO op_province_id;
ALTER TABLE enterprises RENAME COLUMN operating_ward TO op_ward_id;
ALTER TABLE enterprises RENAME COLUMN business_location TO op_address;
ALTER TABLE enterprises RENAME COLUMN leader_name TO representative_name;
ALTER TABLE enterprises RENAME COLUMN leader_phone TO representative_phone;

ALTER TABLE enterprises
  ALTER COLUMN tax_code TYPE VARCHAR(50),
  ALTER COLUMN enterprise_name TYPE VARCHAR(255),
  ALTER COLUMN foreign_name TYPE VARCHAR(255),
  ALTER COLUMN email TYPE VARCHAR(100),
  ALTER COLUMN phone_number TYPE VARCHAR(20),
  ALTER COLUMN province_id TYPE VARCHAR(20),
  ALTER COLUMN ward_id TYPE VARCHAR(20),
  ALTER COLUMN address TYPE VARCHAR(255),
  ALTER COLUMN op_province_id TYPE VARCHAR(20),
  ALTER COLUMN op_ward_id TYPE VARCHAR(20),
  ALTER COLUMN op_address TYPE VARCHAR(255),
  ALTER COLUMN representative_name TYPE VARCHAR(100),
  ALTER COLUMN representative_phone TYPE VARCHAR(20);

ALTER TABLE enterprises
  DROP COLUMN business_type,
  DROP COLUMN main_industry,
  DROP COLUMN business_license_path,
  DROP COLUMN other_document_path;

ALTER TABLE users
  ADD CONSTRAINT fk_users_enterprise
    FOREIGN KEY (enterprise_id) REFERENCES enterprises(id) ON DELETE SET NULL;

COMMIT;
