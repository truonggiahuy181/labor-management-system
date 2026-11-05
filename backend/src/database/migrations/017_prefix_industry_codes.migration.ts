import type { MigrationInterface, QueryRunner } from 'typeorm';

export class PrefixIndustryCodes1793869200000 implements MigrationInterface {
  name = 'PrefixIndustryCodes1793869200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
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
        AND UPPER(LEFT(BTRIM(industry.industry_code), 1)) <> tree.root_prefix;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
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
        AND UPPER(LEFT(BTRIM(industry.industry_code), 1)) = tree.root_prefix;
    `);
  }
}
