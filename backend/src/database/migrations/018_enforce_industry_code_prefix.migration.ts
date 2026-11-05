import type { MigrationInterface, QueryRunner } from 'typeorm';

export class EnforceIndustryCodePrefix1793955600000 implements MigrationInterface {
  name = 'EnforceIndustryCodePrefix1793955600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      -- Development databases may contain both the legacy numeric catalog and
      -- the new prefixed catalog. Keep the prefixed row, move every reference
      -- to it, and remove only the redundant legacy row before normalizing the
      -- remaining data.
      CREATE TEMP TABLE industry_prefix_merge (
        legacy_id INT PRIMARY KEY,
        target_id INT NOT NULL
      ) ON COMMIT DROP;

      INSERT INTO industry_prefix_merge (legacy_id, target_id)
      WITH RECURSIVE industry_tree AS (
        SELECT
          root.id,
          UPPER(LEFT(BTRIM(root.industry_code), 1)) AS root_prefix
        FROM industries root
        WHERE root.level = 1
          AND root.parent_id IS NULL

        UNION ALL

        SELECT child.id, tree.root_prefix
        FROM industries child
        INNER JOIN industry_tree tree ON tree.id = child.parent_id
        WHERE child.level BETWEEN 2 AND 4
      )
      SELECT legacy.id, target.id
      FROM industries legacy
      INNER JOIN industry_tree tree ON tree.id = legacy.id
      INNER JOIN industries target
        ON UPPER(BTRIM(target.industry_code)) =
          tree.root_prefix || UPPER(BTRIM(legacy.industry_code))
      WHERE legacy.level BETWEEN 2 AND 4
        AND BTRIM(legacy.industry_code) ~ '^[0-9]'
        AND target.id <> legacy.id;

      UPDATE enterprises enterprise
      SET industry_id = merge.target_id
      FROM industry_prefix_merge merge
      WHERE enterprise.industry_id = merge.legacy_id;

      UPDATE industries child
      SET parent_id = merge.target_id
      FROM industry_prefix_merge merge
      WHERE child.parent_id = merge.legacy_id;

      DELETE FROM industries legacy
      USING industry_prefix_merge merge
      WHERE legacy.id = merge.legacy_id;

      WITH RECURSIVE industry_tree AS (
        SELECT
          root.id,
          UPPER(LEFT(BTRIM(root.industry_code), 1)) AS root_prefix
        FROM industries root
        WHERE root.level = 1
          AND root.parent_id IS NULL

        UNION ALL

        SELECT child.id, tree.root_prefix
        FROM industries child
        INNER JOIN industry_tree tree ON tree.id = child.parent_id
        WHERE child.level BETWEEN 2 AND 4
      )
      UPDATE industries industry
      SET industry_code = tree.root_prefix || BTRIM(industry.industry_code)
      FROM industry_tree tree
      WHERE industry.id = tree.id
        AND industry.level BETWEEN 2 AND 4
        AND BTRIM(industry.industry_code) ~ '^[0-9]';

      DO $migration$
      BEGIN
        IF EXISTS (
          WITH RECURSIVE industry_tree AS (
            SELECT
              root.id,
              UPPER(LEFT(BTRIM(root.industry_code), 1)) AS root_prefix
            FROM industries root
            WHERE root.level = 1
              AND root.parent_id IS NULL

            UNION ALL

            SELECT child.id, tree.root_prefix
            FROM industries child
            INNER JOIN industry_tree tree ON tree.id = child.parent_id
            WHERE child.level BETWEEN 2 AND 4
          )
          SELECT 1
          FROM industries industry
          INNER JOIN industry_tree tree ON tree.id = industry.id
          WHERE industry.level BETWEEN 2 AND 4
            AND UPPER(LEFT(BTRIM(industry.industry_code), 1)) <> tree.root_prefix
        ) THEN
          RAISE EXCEPTION
            'Existing industry codes do not match their level-one prefix.'
            USING ERRCODE = '23514';
        END IF;

        IF EXISTS (
          SELECT 1
          FROM industries
          WHERE level = 1
            AND parent_id IS NULL
            AND BTRIM(industry_code) !~ '^[A-Za-z]'
        ) THEN
          RAISE EXCEPTION
            'Level-one industry codes must start with a letter.'
            USING ERRCODE = '23514';
        END IF;
      END
      $migration$;

      CREATE OR REPLACE FUNCTION enforce_industry_root_prefix()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      AS $function$
      DECLARE
        root_code VARCHAR(50);
        root_prefix VARCHAR(1);
      BEGIN
        NEW.industry_code := UPPER(BTRIM(NEW.industry_code));

        IF NEW.level = 1 THEN
          IF NEW.industry_code !~ '^[A-Z]' THEN
            RAISE EXCEPTION 'Level-one industry code must start with a letter.'
              USING ERRCODE = '23514',
                    CONSTRAINT = 'chk_industries_root_prefix';
          END IF;
          RETURN NEW;
        END IF;

        WITH RECURSIVE ancestors AS (
          SELECT
            parent.id,
            parent.industry_code,
            parent.level,
            parent.parent_id
          FROM industries parent
          WHERE parent.id = NEW.parent_id
            AND parent.deleted_at IS NULL

          UNION ALL

          SELECT
            parent.id,
            parent.industry_code,
            parent.level,
            parent.parent_id
          FROM industries parent
          INNER JOIN ancestors child ON child.parent_id = parent.id
          WHERE parent.deleted_at IS NULL
        )
        SELECT industry_code
        INTO root_code
        FROM ancestors
        WHERE level = 1
          AND parent_id IS NULL
        LIMIT 1;

        IF root_code IS NULL THEN
          RAISE EXCEPTION 'Industry hierarchy has no valid level-one ancestor.'
            USING ERRCODE = '23514',
                  CONSTRAINT = 'chk_industries_root_prefix';
        END IF;

        root_prefix := UPPER(LEFT(BTRIM(root_code), 1));
        IF NEW.industry_code ~ '^[0-9]' THEN
          NEW.industry_code := root_prefix || NEW.industry_code;
        ELSIF LEFT(NEW.industry_code, 1) <> root_prefix THEN
          RAISE EXCEPTION
            'Industry code % must start with level-one prefix %.',
            NEW.industry_code,
            root_prefix
            USING ERRCODE = '23514',
                  CONSTRAINT = 'chk_industries_root_prefix';
        END IF;

        IF CHAR_LENGTH(NEW.industry_code) > 50 THEN
          RAISE EXCEPTION
            'Industry code exceeds 50 characters after applying prefix.'
            USING ERRCODE = '22001',
                  CONSTRAINT = 'chk_industries_root_prefix';
        END IF;

        RETURN NEW;
      END
      $function$;

      DROP TRIGGER IF EXISTS trg_industries_root_prefix ON industries;
      CREATE TRIGGER trg_industries_root_prefix
        BEFORE INSERT OR UPDATE OF industry_code, parent_id, level
        ON industries
        FOR EACH ROW
        EXECUTE FUNCTION enforce_industry_root_prefix();
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_industries_root_prefix ON industries;
      DROP FUNCTION IF EXISTS enforce_industry_root_prefix();

      WITH RECURSIVE industry_tree AS (
        SELECT
          root.id,
          UPPER(LEFT(BTRIM(root.industry_code), 1)) AS root_prefix
        FROM industries root
        WHERE root.level = 1
          AND root.parent_id IS NULL

        UNION ALL

        SELECT child.id, tree.root_prefix
        FROM industries child
        INNER JOIN industry_tree tree ON tree.id = child.parent_id
        WHERE child.level BETWEEN 2 AND 4
      )
      UPDATE industries industry
      SET industry_code = SUBSTRING(BTRIM(industry.industry_code) FROM 2)
      FROM industry_tree tree
      WHERE industry.id = tree.id
        AND industry.level BETWEEN 2 AND 4
        AND UPPER(LEFT(BTRIM(industry.industry_code), 1)) = tree.root_prefix
        AND BTRIM(industry.industry_code) ~ '^[A-Z][0-9]';
    `);
  }
}
