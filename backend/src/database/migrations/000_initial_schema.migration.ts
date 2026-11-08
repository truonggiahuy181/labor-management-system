import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Clean database baseline.
 *
 * This migration contains schema only. Catalog and sample data belong to
 * dedicated seed processes and must not be inserted here.
 */
export class InitialSchema1800000000000 implements MigrationInterface {
  name = 'InitialSchema1800000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE roles (
        id SERIAL PRIMARY KEY,
        role_code VARCHAR(50) NOT NULL,
        role_name VARCHAR(100) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        deleted_at TIMESTAMP NULL
      );
      CREATE UNIQUE INDEX uq_roles_role_code ON roles (role_code);

      CREATE TABLE business_types (
        id SERIAL PRIMARY KEY,
        type_code VARCHAR(50) NOT NULL,
        type_name VARCHAR(255) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        deleted_at TIMESTAMP NULL
      );
      CREATE UNIQUE INDEX uq_business_types_type_code
        ON business_types (type_code);

      CREATE TABLE industries (
        id SERIAL PRIMARY KEY,
        industry_code VARCHAR(4) NOT NULL,
        industry_name VARCHAR(255) NOT NULL,
        level SMALLINT NOT NULL,
        parent_id INT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        deleted_at TIMESTAMP NULL,
        CONSTRAINT fk_industries_parent
          FOREIGN KEY (parent_id) REFERENCES industries(id)
          ON DELETE RESTRICT,
        CONSTRAINT chk_industries_level_range
          CHECK (level BETWEEN 1 AND 4),
        CONSTRAINT chk_industries_parent_required
          CHECK (
            (level = 1 AND parent_id IS NULL)
            OR (level BETWEEN 2 AND 4 AND parent_id IS NOT NULL)
          ),
        CONSTRAINT chk_industries_parent_not_self
          CHECK (parent_id IS NULL OR parent_id <> id),
        CONSTRAINT chk_industries_code_format
          CHECK (
            (level = 1 AND industry_code ~ '^[A-V]$')
            OR (level = 2 AND industry_code ~ '^[0-9]{2}$')
            OR (level = 3 AND industry_code ~ '^[0-9]{3}$')
            OR (level = 4 AND industry_code ~ '^[0-9]{4}$')
          )
      );
      CREATE UNIQUE INDEX uq_industries_industry_code
        ON industries (industry_code);
      CREATE UNIQUE INDEX uq_industries_parent_name
        ON industries (COALESCE(parent_id, 0), LOWER(industry_name));
      CREATE INDEX idx_industries_name ON industries (industry_name);
      CREATE INDEX idx_industries_level ON industries (level);
      CREATE INDEX idx_industries_parent_id ON industries (parent_id);
      CREATE INDEX idx_industries_is_active ON industries (is_active);

      CREATE TABLE provinces (
        code VARCHAR(2) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        division_type VARCHAR(30) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        CONSTRAINT chk_provinces_code_format
          CHECK (code ~ '^[0-9]{2}$')
      );

      CREATE TABLE wards (
        code VARCHAR(5) PRIMARY KEY,
        province_code VARCHAR(2) NOT NULL,
        name VARCHAR(100) NOT NULL,
        division_type VARCHAR(30) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        CONSTRAINT chk_wards_code_format
          CHECK (code ~ '^[0-9]{5}$'),
        CONSTRAINT fk_wards_province
          FOREIGN KEY (province_code) REFERENCES provinces(code)
          ON DELETE RESTRICT
      );
      CREATE UNIQUE INDEX uq_wards_code_province_code
        ON wards (code, province_code);
      CREATE INDEX idx_wards_province_code ON wards (province_code);

      CREATE TABLE enterprises (
        id SERIAL PRIMARY KEY,
        created_by INT NULL,
        updated_by INT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now(),
        deleted_at TIMESTAMP NULL,
        enterprise_name VARCHAR(255) NOT NULL,
        tax_code VARCHAR(50) NOT NULL,
        business_type_id INT NOT NULL,
        industry_id INT NOT NULL,
        registration_date DATE NOT NULL,
        province_id VARCHAR(2) NOT NULL,
        ward_id VARCHAR(5) NOT NULL,
        address VARCHAR(255) NOT NULL,
        foreign_name VARCHAR(255) NULL,
        email VARCHAR(100) NOT NULL,
        phone_number VARCHAR(20) NULL,
        op_province_id VARCHAR(2) NULL,
        op_ward_id VARCHAR(5) NULL,
        op_address VARCHAR(255) NULL,
        representative_name VARCHAR(100) NULL,
        representative_phone VARCHAR(20) NULL,
        business_license_key VARCHAR(255) NULL,
        other_document_key VARCHAR(255) NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        files JSONB NOT NULL DEFAULT '{}'::jsonb,
        CONSTRAINT fk_enterprises_business_type
          FOREIGN KEY (business_type_id) REFERENCES business_types(id)
          ON DELETE RESTRICT,
        CONSTRAINT fk_enterprises_industry
          FOREIGN KEY (industry_id) REFERENCES industries(id)
          ON DELETE RESTRICT,
        CONSTRAINT fk_enterprises_province
          FOREIGN KEY (province_id) REFERENCES provinces(code)
          ON DELETE RESTRICT,
        CONSTRAINT fk_enterprises_ward_province
          FOREIGN KEY (ward_id, province_id)
          REFERENCES wards(code, province_code)
          ON DELETE RESTRICT,
        CONSTRAINT fk_enterprises_operating_province
          FOREIGN KEY (op_province_id) REFERENCES provinces(code)
          ON DELETE RESTRICT,
        CONSTRAINT fk_enterprises_operating_ward_province
          FOREIGN KEY (op_ward_id, op_province_id)
          REFERENCES wards(code, province_code)
          ON DELETE RESTRICT,
        CONSTRAINT chk_enterprises_operating_location
          CHECK (
            (op_province_id IS NULL AND op_ward_id IS NULL)
            OR (op_province_id IS NOT NULL AND op_ward_id IS NOT NULL)
          )
      );
      CREATE UNIQUE INDEX uq_enterprises_tax_code
        ON enterprises (tax_code);
      CREATE INDEX idx_enterprises_business_type_id
        ON enterprises (business_type_id);
      CREATE INDEX idx_enterprises_industry_id
        ON enterprises (industry_id);
      CREATE INDEX idx_enterprises_province_id
        ON enterprises (province_id);
      CREATE INDEX idx_enterprises_is_active
        ON enterprises (is_active);

      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        created_by INT NULL,
        updated_by INT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now(),
        deleted_at TIMESTAMP NULL,
        username VARCHAR(50) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        dob DATE NULL,
        gender SMALLINT NULL,
        email VARCHAR(100) NULL,
        phone_number VARCHAR(20) NULL,
        title VARCHAR(100) NULL,
        avatar_object_key VARCHAR(255) NULL,
        province_id VARCHAR(2) NULL,
        district_id VARCHAR(20) NULL,
        ward_id VARCHAR(5) NULL,
        address VARCHAR(255) NULL,
        role_id INT NOT NULL,
        enterprise_id INT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        reset_password_token VARCHAR(255) NULL,
        reset_password_expires TIMESTAMP NULL,
        password_changed_at TIMESTAMP NULL,
        email_change_otp VARCHAR(10) NULL,
        email_change_otp_expires TIMESTAMP NULL,
        email_change_pending VARCHAR(100) NULL,
        CONSTRAINT fk_users_role
          FOREIGN KEY (role_id) REFERENCES roles(id)
          ON DELETE RESTRICT,
        CONSTRAINT fk_users_enterprise
          FOREIGN KEY (enterprise_id) REFERENCES enterprises(id)
          ON DELETE RESTRICT,
        CONSTRAINT fk_users_province
          FOREIGN KEY (province_id) REFERENCES provinces(code)
          ON DELETE RESTRICT,
        CONSTRAINT fk_users_ward_province
          FOREIGN KEY (ward_id, province_id)
          REFERENCES wards(code, province_code)
          ON DELETE RESTRICT,
        CONSTRAINT chk_users_location
          CHECK (
            (province_id IS NULL AND ward_id IS NULL)
            OR (province_id IS NOT NULL AND ward_id IS NOT NULL)
          )
      );
      CREATE UNIQUE INDEX uq_users_username ON users (username);
      CREATE UNIQUE INDEX uq_users_enterprise_id ON users (enterprise_id);
      CREATE INDEX idx_users_role_id ON users (role_id);
      CREATE INDEX idx_users_is_active ON users (is_active);

      CREATE TABLE report_periods (
        id SERIAL PRIMARY KEY,
        created_by INT NULL,
        updated_by INT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now(),
        deleted_at TIMESTAMP NULL,
        report_name VARCHAR(255) NOT NULL,
        report_type_code VARCHAR(50) NOT NULL DEFAULT 'OTHER',
        report_year SMALLINT NOT NULL,
        period_code VARCHAR(30) NOT NULL DEFAULT 'CUSTOM',
        submission_start_date DATE NOT NULL,
        submission_end_date DATE NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        CONSTRAINT chk_report_periods_year
          CHECK (report_year BETWEEN 2000 AND 2100),
        CONSTRAINT chk_report_periods_period_code
          CHECK (period_code IN ('FIRST_HALF', 'ANNUAL', 'CUSTOM')),
        CONSTRAINT chk_report_periods_type_period
          CHECK (
            (report_type_code = 'OCCUPATIONAL_ACCIDENT'
              AND period_code IN ('FIRST_HALF', 'ANNUAL'))
            OR (report_type_code <> 'OCCUPATIONAL_ACCIDENT'
              AND period_code = 'CUSTOM')
          ),
        CONSTRAINT chk_report_periods_submission_range
          CHECK (submission_end_date >= submission_start_date)
      );
      CREATE UNIQUE INDEX uq_report_periods_type_year_period
        ON report_periods (report_type_code, report_year, period_code);
      CREATE INDEX idx_report_periods_report_year
        ON report_periods (report_year);
      CREATE INDEX idx_report_periods_submission_start_date
        ON report_periods (submission_start_date);
      CREATE INDEX idx_report_periods_submission_end_date
        ON report_periods (submission_end_date);
      CREATE INDEX idx_report_periods_is_active
        ON report_periods (is_active);

      CREATE TABLE injury_factors (
        id SERIAL PRIMARY KEY,
        created_by INT NULL,
        updated_by INT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now(),
        deleted_at TIMESTAMP NULL,
        factor_code VARCHAR(50) NOT NULL,
        factor_name VARCHAR(255) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE
      );
      CREATE UNIQUE INDEX uq_injury_factors_factor_code
        ON injury_factors (factor_code);
      CREATE INDEX idx_injury_factors_factor_name
        ON injury_factors (factor_name);
      CREATE INDEX idx_injury_factors_is_active
        ON injury_factors (is_active);

      CREATE TABLE injury_types (
        id SERIAL PRIMARY KEY,
        created_by INT NULL,
        updated_by INT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now(),
        deleted_at TIMESTAMP NULL,
        injury_type_code VARCHAR(3) NOT NULL,
        injury_type_name VARCHAR(255) NOT NULL,
        level SMALLINT NOT NULL,
        parent_id INT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        CONSTRAINT fk_injury_types_parent
          FOREIGN KEY (parent_id) REFERENCES injury_types(id)
          ON DELETE RESTRICT,
        CONSTRAINT chk_injury_types_level_range
          CHECK (level BETWEEN 1 AND 3),
        CONSTRAINT chk_injury_types_parent_required
          CHECK (
            (level = 1 AND parent_id IS NULL)
            OR (level IN (2, 3) AND parent_id IS NOT NULL)
          ),
        CONSTRAINT chk_injury_types_parent_not_self
          CHECK (parent_id IS NULL OR parent_id <> id),
        CONSTRAINT chk_injury_types_code_format
          CHECK (injury_type_code ~ '^[0-9]{1,3}$'),
        CONSTRAINT chk_injury_types_code_length
          CHECK (char_length(injury_type_code) = level)
      );
      CREATE UNIQUE INDEX uq_injury_types_code
        ON injury_types (injury_type_code);
      CREATE UNIQUE INDEX uq_injury_types_parent_name
        ON injury_types (COALESCE(parent_id, 0), LOWER(injury_type_name));
      CREATE INDEX idx_injury_types_name ON injury_types (injury_type_name);
      CREATE INDEX idx_injury_types_level ON injury_types (level);
      CREATE INDEX idx_injury_types_parent_id ON injury_types (parent_id);
      CREATE INDEX idx_injury_types_is_active ON injury_types (is_active);

      CREATE TABLE occupations (
        id SERIAL PRIMARY KEY,
        created_by INT NULL,
        updated_by INT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now(),
        deleted_at TIMESTAMP NULL,
        occupation_code VARCHAR(4) NOT NULL,
        occupation_name VARCHAR(255) NOT NULL,
        level SMALLINT NOT NULL,
        parent_id INT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        CONSTRAINT fk_occupations_parent
          FOREIGN KEY (parent_id) REFERENCES occupations(id)
          ON DELETE RESTRICT,
        CONSTRAINT chk_occupations_level_range
          CHECK (level BETWEEN 1 AND 4),
        CONSTRAINT chk_occupations_parent_required
          CHECK (
            (level = 1 AND parent_id IS NULL)
            OR (level BETWEEN 2 AND 4 AND parent_id IS NOT NULL)
          ),
        CONSTRAINT chk_occupations_parent_not_self
          CHECK (parent_id IS NULL OR parent_id <> id),
        CONSTRAINT chk_occupations_code_format
          CHECK (occupation_code ~ '^[0-9]{1,4}$'),
        CONSTRAINT chk_occupations_code_length
          CHECK (char_length(occupation_code) = level)
      );
      CREATE UNIQUE INDEX uq_occupations_code
        ON occupations (occupation_code);
      CREATE UNIQUE INDEX uq_occupations_parent_name
        ON occupations (COALESCE(parent_id, 0), LOWER(occupation_name));
      CREATE INDEX idx_occupations_name ON occupations (occupation_name);
      CREATE INDEX idx_occupations_level ON occupations (level);
      CREATE INDEX idx_occupations_parent_id ON occupations (parent_id);
      CREATE INDEX idx_occupations_is_active ON occupations (is_active);

      CREATE TABLE accident_causes (
        id SERIAL PRIMARY KEY,
        created_by INT NULL,
        updated_by INT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now(),
        deleted_at TIMESTAMP NULL,
        cause_code VARCHAR(20) NOT NULL,
        cause_name VARCHAR(255) NOT NULL,
        cause_group VARCHAR(20) NOT NULL,
        display_order SMALLINT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        CONSTRAINT chk_accident_causes_group
          CHECK (cause_group IN ('EMPLOYER', 'EMPLOYEE', 'OBJECTIVE')),
        CONSTRAINT chk_accident_causes_display_order
          CHECK (display_order > 0)
      );
      CREATE UNIQUE INDEX uq_accident_causes_code
        ON accident_causes (cause_code);
      CREATE INDEX idx_accident_causes_group
        ON accident_causes (cause_group);
      CREATE INDEX idx_accident_causes_is_active
        ON accident_causes (is_active);

      CREATE TABLE occupational_accident_reports (
        id SERIAL PRIMARY KEY,
        created_by INT NULL,
        updated_by INT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now(),
        deleted_at TIMESTAMP NULL,
        enterprise_id INT NOT NULL,
        report_period_id INT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
        enterprise_name VARCHAR(255) NOT NULL,
        tax_code VARCHAR(50) NOT NULL,
        enterprise_address VARCHAR(500) NOT NULL,
        business_type_code VARCHAR(50) NOT NULL,
        business_type_name VARCHAR(255) NOT NULL,
        industry_code VARCHAR(4) NOT NULL,
        industry_name VARCHAR(255) NOT NULL,
        administrative_unit_code VARCHAR(10) NULL,
        administrative_unit_name VARCHAR(255) NULL,
        administrative_unit_level VARCHAR(20) NULL,
        recipient_agency_name VARCHAR(255) NULL,
        total_employees INT NOT NULL DEFAULT 0,
        female_employees INT NOT NULL DEFAULT 0,
        payroll_fund_vnd BIGINT NOT NULL DEFAULT 0,
        no_accidents_declared BOOLEAN NOT NULL DEFAULT FALSE,
        submitted_at TIMESTAMP NULL,
        received_at TIMESTAMP NULL,
        returned_at TIMESTAMP NULL,
        returned_reason VARCHAR(1000) NULL,
        version INT NOT NULL DEFAULT 1,
        CONSTRAINT fk_oa_reports_enterprise
          FOREIGN KEY (enterprise_id) REFERENCES enterprises(id)
          ON DELETE RESTRICT,
        CONSTRAINT fk_oa_reports_period
          FOREIGN KEY (report_period_id) REFERENCES report_periods(id)
          ON DELETE RESTRICT,
        CONSTRAINT chk_oa_reports_status
          CHECK (status IN ('DRAFT', 'SUBMITTED', 'RECEIVED', 'RETURNED')),
        CONSTRAINT chk_oa_reports_workforce
          CHECK (
            total_employees >= 0
            AND female_employees BETWEEN 0 AND total_employees
            AND payroll_fund_vnd >= 0
          ),
        CONSTRAINT chk_oa_reports_admin_unit_level
          CHECK (
            administrative_unit_level IS NULL
            OR administrative_unit_level IN ('PROVINCE', 'WARD')
          )
      );
      CREATE UNIQUE INDEX uq_oa_reports_enterprise_period
        ON occupational_accident_reports (enterprise_id, report_period_id);
      CREATE INDEX idx_oa_reports_status
        ON occupational_accident_reports (status);
      CREATE INDEX idx_oa_reports_enterprise
        ON occupational_accident_reports (enterprise_id);
      CREATE INDEX idx_oa_reports_period
        ON occupational_accident_reports (report_period_id);

      CREATE TABLE occupational_accident_cases (
        id SERIAL PRIMARY KEY,
        created_by INT NULL,
        updated_by INT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now(),
        deleted_at TIMESTAMP NULL,
        report_id INT NOT NULL,
        accident_date DATE NOT NULL,
        primary_cause_id INT NOT NULL,
        injury_factor_id INT NOT NULL,
        medical_cost_vnd BIGINT NOT NULL DEFAULT 0,
        salary_cost_vnd BIGINT NOT NULL DEFAULT 0,
        compensation_cost_vnd BIGINT NOT NULL DEFAULT 0,
        lost_work_days INT NOT NULL DEFAULT 0,
        property_damage_vnd BIGINT NOT NULL DEFAULT 0,
        CONSTRAINT fk_oa_cases_report
          FOREIGN KEY (report_id) REFERENCES occupational_accident_reports(id)
          ON DELETE CASCADE,
        CONSTRAINT fk_oa_cases_primary_cause
          FOREIGN KEY (primary_cause_id) REFERENCES accident_causes(id)
          ON DELETE RESTRICT,
        CONSTRAINT fk_oa_cases_factor
          FOREIGN KEY (injury_factor_id) REFERENCES injury_factors(id)
          ON DELETE RESTRICT,
        CONSTRAINT chk_oa_cases_damage
          CHECK (
            medical_cost_vnd >= 0
            AND salary_cost_vnd >= 0
            AND compensation_cost_vnd >= 0
            AND lost_work_days >= 0
            AND property_damage_vnd >= 0
          )
      );
      CREATE INDEX idx_oa_cases_report
        ON occupational_accident_cases (report_id);
      CREATE INDEX idx_oa_cases_accident_date
        ON occupational_accident_cases (accident_date);
      CREATE INDEX idx_oa_cases_primary_cause
        ON occupational_accident_cases (primary_cause_id);
      CREATE INDEX idx_oa_cases_factor
        ON occupational_accident_cases (injury_factor_id);

      CREATE TABLE occupational_accident_victim_groups (
        id SERIAL PRIMARY KEY,
        created_by INT NULL,
        updated_by INT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now(),
        deleted_at TIMESTAMP NULL,
        accident_case_id INT NOT NULL,
        occupation_id INT NOT NULL,
        is_under_enterprise_management BOOLEAN NOT NULL,
        victim_count INT NOT NULL,
        female_count INT NOT NULL DEFAULT 0,
        death_count INT NOT NULL DEFAULT 0,
        severe_count INT NOT NULL DEFAULT 0,
        CONSTRAINT fk_oa_victim_groups_case
          FOREIGN KEY (accident_case_id) REFERENCES occupational_accident_cases(id)
          ON DELETE CASCADE,
        CONSTRAINT fk_oa_victim_groups_occupation
          FOREIGN KEY (occupation_id) REFERENCES occupations(id)
          ON DELETE RESTRICT,
        CONSTRAINT chk_oa_victim_groups_counts
          CHECK (
            victim_count > 0
            AND female_count BETWEEN 0 AND victim_count
            AND death_count >= 0
            AND severe_count >= 0
            AND death_count + severe_count <= victim_count
          )
      );
      CREATE UNIQUE INDEX uq_oa_victim_groups_dimension
        ON occupational_accident_victim_groups (
          accident_case_id,
          occupation_id,
          is_under_enterprise_management
        );
      CREATE INDEX idx_oa_victim_groups_case
        ON occupational_accident_victim_groups (accident_case_id);
      CREATE INDEX idx_oa_victim_groups_occupation
        ON occupational_accident_victim_groups (occupation_id);

      CREATE TABLE occupational_accident_article39_summaries (
        report_id INT PRIMARY KEY,
        created_by INT NULL,
        updated_by INT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now(),
        total_cases INT NOT NULL DEFAULT 0,
        fatal_cases INT NOT NULL DEFAULT 0,
        multi_victim_cases INT NOT NULL DEFAULT 0,
        victim_count INT NOT NULL DEFAULT 0,
        female_count INT NOT NULL DEFAULT 0,
        death_count INT NOT NULL DEFAULT 0,
        severe_count INT NOT NULL DEFAULT 0,
        unmanaged_victim_count INT NOT NULL DEFAULT 0,
        unmanaged_female_count INT NOT NULL DEFAULT 0,
        unmanaged_death_count INT NOT NULL DEFAULT 0,
        unmanaged_severe_count INT NOT NULL DEFAULT 0,
        medical_cost_vnd BIGINT NOT NULL DEFAULT 0,
        salary_cost_vnd BIGINT NOT NULL DEFAULT 0,
        compensation_cost_vnd BIGINT NOT NULL DEFAULT 0,
        lost_work_days INT NOT NULL DEFAULT 0,
        property_damage_vnd BIGINT NOT NULL DEFAULT 0,
        CONSTRAINT fk_oa_article39_report
          FOREIGN KEY (report_id) REFERENCES occupational_accident_reports(id)
          ON DELETE CASCADE,
        CONSTRAINT chk_oa_article39_counts
          CHECK (
            total_cases >= 0
            AND fatal_cases BETWEEN 0 AND total_cases
            AND multi_victim_cases BETWEEN 0 AND total_cases
            AND victim_count >= total_cases + multi_victim_cases
            AND female_count BETWEEN 0 AND victim_count
            AND death_count >= 0
            AND severe_count >= 0
            AND death_count + severe_count <= victim_count
            AND fatal_cases <= death_count
            AND unmanaged_victim_count BETWEEN 0 AND victim_count
            AND unmanaged_female_count BETWEEN 0 AND unmanaged_victim_count
            AND unmanaged_death_count >= 0
            AND unmanaged_severe_count >= 0
            AND unmanaged_death_count + unmanaged_severe_count
              <= unmanaged_victim_count
          ),
        CONSTRAINT chk_oa_article39_damage
          CHECK (
            medical_cost_vnd >= 0
            AND salary_cost_vnd >= 0
            AND compensation_cost_vnd >= 0
            AND lost_work_days >= 0
            AND property_damage_vnd >= 0
          )
      );

      CREATE TABLE occupational_accident_report_submissions (
        id SERIAL PRIMARY KEY,
        report_id INT NOT NULL,
        submission_no INT NOT NULL,
        report_date DATE NOT NULL,
        submitted_by INT NOT NULL,
        submitted_at TIMESTAMP NOT NULL,
        payload_snapshot JSONB NOT NULL,
        document_object_key VARCHAR(500) NOT NULL,
        document_original_name VARCHAR(255) NOT NULL,
        document_content_type VARCHAR(100) NOT NULL,
        document_size BIGINT NOT NULL,
        document_sha256 CHAR(64) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT fk_oa_submissions_report
          FOREIGN KEY (report_id) REFERENCES occupational_accident_reports(id)
          ON DELETE RESTRICT,
        CONSTRAINT fk_oa_submissions_user
          FOREIGN KEY (submitted_by) REFERENCES users(id)
          ON DELETE RESTRICT,
        CONSTRAINT chk_oa_submissions_number
          CHECK (submission_no > 0),
        CONSTRAINT chk_oa_submissions_document_size
          CHECK (document_size > 0),
        CONSTRAINT chk_oa_submissions_document_sha256
          CHECK (document_sha256 ~ '^[0-9a-f]{64}$')
      );
      CREATE UNIQUE INDEX uq_oa_submissions_report_number
        ON occupational_accident_report_submissions (report_id, submission_no);
      CREATE INDEX idx_oa_submissions_report
        ON occupational_accident_report_submissions (report_id);
      CREATE INDEX idx_oa_submissions_submitted_at
        ON occupational_accident_report_submissions (submitted_at);

      CREATE TABLE occupational_accident_report_draft_documents (
        report_id INT PRIMARY KEY,
        document_object_key VARCHAR(500) NOT NULL,
        document_original_name VARCHAR(255) NOT NULL,
        document_content_type VARCHAR(100) NOT NULL,
        document_size BIGINT NOT NULL,
        document_sha256 CHAR(64) NOT NULL,
        uploaded_by INT NOT NULL,
        uploaded_at TIMESTAMP NOT NULL,
        CONSTRAINT fk_oa_draft_documents_report
          FOREIGN KEY (report_id) REFERENCES occupational_accident_reports(id)
          ON DELETE CASCADE,
        CONSTRAINT fk_oa_draft_documents_user
          FOREIGN KEY (uploaded_by) REFERENCES users(id)
          ON DELETE RESTRICT,
        CONSTRAINT chk_oa_draft_documents_size
          CHECK (document_size > 0),
        CONSTRAINT chk_oa_draft_documents_sha256
          CHECK (document_sha256 ~ '^[0-9a-f]{64}$')
      );

      CREATE TABLE occupational_accident_report_histories (
        id SERIAL PRIMARY KEY,
        report_id INT NOT NULL,
        submission_id INT NULL,
        from_status VARCHAR(20) NULL,
        to_status VARCHAR(20) NOT NULL,
        reason VARCHAR(1000) NULL,
        created_by INT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT fk_oa_report_histories_report
          FOREIGN KEY (report_id) REFERENCES occupational_accident_reports(id)
          ON DELETE CASCADE,
        CONSTRAINT fk_oa_report_histories_submission
          FOREIGN KEY (submission_id)
          REFERENCES occupational_accident_report_submissions(id)
          ON DELETE RESTRICT,
        CONSTRAINT chk_oa_report_histories_from_status
          CHECK (
            from_status IS NULL
            OR from_status IN ('DRAFT', 'SUBMITTED', 'RECEIVED', 'RETURNED')
          ),
        CONSTRAINT chk_oa_report_histories_to_status
          CHECK (to_status IN ('DRAFT', 'SUBMITTED', 'RECEIVED', 'RETURNED'))
      );
      CREATE INDEX idx_oa_report_histories_report
        ON occupational_accident_report_histories (report_id);
      CREATE INDEX idx_oa_report_histories_submission
        ON occupational_accident_report_histories (submission_id);

      CREATE OR REPLACE FUNCTION enforce_industry_hierarchy()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      AS $function$
      DECLARE
        parent_code VARCHAR(4);
        parent_level SMALLINT;
      BEGIN
        NEW.industry_code := UPPER(BTRIM(NEW.industry_code));
        IF NEW.level = 1 THEN RETURN NEW; END IF;

        SELECT industry_code, level INTO parent_code, parent_level
        FROM industries
        WHERE id = NEW.parent_id AND deleted_at IS NULL;

        IF parent_code IS NULL OR parent_level <> NEW.level - 1 THEN
          RAISE EXCEPTION
            'Industry parent must belong to the immediately preceding level.'
            USING ERRCODE = '23514';
        END IF;
        IF NEW.level IN (3, 4)
          AND NEW.industry_code !~ ('^' || parent_code || '[0-9]$') THEN
          RAISE EXCEPTION
            'Industry code must extend its numeric parent with one digit.'
            USING ERRCODE = '23514';
        END IF;
        RETURN NEW;
      END
      $function$;

      CREATE TRIGGER trg_industries_hierarchy
        BEFORE INSERT OR UPDATE OF industry_code, parent_id, level
        ON industries
        FOR EACH ROW
        EXECUTE FUNCTION enforce_industry_hierarchy();

      CREATE OR REPLACE FUNCTION enforce_numeric_catalog_hierarchy()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      AS $function$
      DECLARE
        parent_code TEXT;
        parent_level SMALLINT;
        child_code TEXT;
      BEGIN
        IF TG_TABLE_NAME = 'occupations' THEN
          child_code := NEW.occupation_code;
          IF NEW.level = 1 THEN RETURN NEW; END IF;
          SELECT occupation_code, level INTO parent_code, parent_level
          FROM occupations
          WHERE id = NEW.parent_id AND deleted_at IS NULL;
        ELSE
          child_code := NEW.injury_type_code;
          IF NEW.level = 1 THEN RETURN NEW; END IF;
          SELECT injury_type_code, level INTO parent_code, parent_level
          FROM injury_types
          WHERE id = NEW.parent_id AND deleted_at IS NULL;
        END IF;

        IF parent_code IS NULL OR parent_level <> NEW.level - 1 THEN
          RAISE EXCEPTION
            'Catalog parent must belong to the immediately preceding level.'
            USING ERRCODE = '23514';
        END IF;
        IF child_code <> (parent_code || RIGHT(child_code, 1)) THEN
          RAISE EXCEPTION 'Catalog code must extend its parent with one digit.'
            USING ERRCODE = '23514';
        END IF;
        RETURN NEW;
      END
      $function$;

      CREATE TRIGGER trg_occupations_hierarchy
        BEFORE INSERT OR UPDATE OF occupation_code, parent_id, level
        ON occupations
        FOR EACH ROW
        EXECUTE FUNCTION enforce_numeric_catalog_hierarchy();

      CREATE TRIGGER trg_injury_types_hierarchy
        BEFORE INSERT OR UPDATE OF injury_type_code, parent_id, level
        ON injury_types
        FOR EACH ROW
        EXECUTE FUNCTION enforce_numeric_catalog_hierarchy();
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_injury_types_hierarchy ON injury_types;
      DROP TRIGGER IF EXISTS trg_occupations_hierarchy ON occupations;
      DROP FUNCTION IF EXISTS enforce_numeric_catalog_hierarchy();
      DROP TRIGGER IF EXISTS trg_industries_hierarchy ON industries;
      DROP FUNCTION IF EXISTS enforce_industry_hierarchy();

      DROP TABLE occupational_accident_report_histories;
      DROP TABLE occupational_accident_report_draft_documents;
      DROP TABLE occupational_accident_report_submissions;
      DROP TABLE occupational_accident_article39_summaries;
      DROP TABLE occupational_accident_victim_groups;
      DROP TABLE occupational_accident_cases;
      DROP TABLE occupational_accident_reports;
      DROP TABLE accident_causes;
      DROP TABLE occupations;
      DROP TABLE injury_types;
      DROP TABLE injury_factors;
      DROP TABLE report_periods;
      DROP TABLE users;
      DROP TABLE enterprises;
      DROP TABLE wards;
      DROP TABLE provinces;
      DROP TABLE industries;
      DROP TABLE business_types;
      DROP TABLE roles;
    `);
  }
}
