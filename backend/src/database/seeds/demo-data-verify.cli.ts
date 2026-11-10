import dataSource from '../data-source.js';

interface DemoDataSummary {
  users: number;
  enterprises: number;
  reportPeriods: number;
  openReportPeriods: number;
  injuryFactors: number;
  injuryTypes: number;
  accidentCauses: number;
  reports: number;
  cases: number;
  victimGroups: number;
  article39Summaries: number;
  submissions: number;
  histories: number;
  draftDocuments: number;
  draftReports: number;
  submittedReports: number;
  receivedReports: number;
  returnedReports: number;
  orphanRows: number;
}

function assertMinimum(
  summary: DemoDataSummary,
  key: keyof DemoDataSummary,
  minimum: number,
): void {
  if (summary[key] < minimum) {
    throw new Error(
      `Demo data verification failed: ${key} expected at least ${minimum}, found ${summary[key]}.`,
    );
  }
}

try {
  await dataSource.initialize();
  const [summary] = await dataSource.query<DemoDataSummary[]>(`
    SELECT
      (SELECT COUNT(*)::int FROM users WHERE deleted_at IS NULL) AS "users",
      (SELECT COUNT(*)::int FROM enterprises WHERE deleted_at IS NULL) AS "enterprises",
      (SELECT COUNT(*)::int FROM report_periods WHERE deleted_at IS NULL) AS "reportPeriods",
      (
        SELECT COUNT(*)::int
        FROM report_periods
        WHERE report_type_code = 'OCCUPATIONAL_ACCIDENT'
          AND is_active = TRUE
          AND deleted_at IS NULL
          AND CURRENT_DATE BETWEEN submission_start_date AND submission_end_date
      ) AS "openReportPeriods",
      (SELECT COUNT(*)::int FROM injury_factors WHERE deleted_at IS NULL) AS "injuryFactors",
      (SELECT COUNT(*)::int FROM injury_types WHERE deleted_at IS NULL) AS "injuryTypes",
      (SELECT COUNT(*)::int FROM accident_causes WHERE deleted_at IS NULL) AS "accidentCauses",
      (SELECT COUNT(*)::int FROM occupational_accident_reports WHERE deleted_at IS NULL) AS "reports",
      (SELECT COUNT(*)::int FROM occupational_accident_cases WHERE deleted_at IS NULL) AS "cases",
      (SELECT COUNT(*)::int FROM occupational_accident_victim_groups WHERE deleted_at IS NULL) AS "victimGroups",
      (SELECT COUNT(*)::int FROM occupational_accident_article39_summaries) AS "article39Summaries",
      (SELECT COUNT(*)::int FROM occupational_accident_report_submissions) AS "submissions",
      (SELECT COUNT(*)::int FROM occupational_accident_report_histories) AS "histories",
      (SELECT COUNT(*)::int FROM occupational_accident_report_draft_documents) AS "draftDocuments",
      (SELECT COUNT(*)::int FROM occupational_accident_reports WHERE status = 'DRAFT' AND deleted_at IS NULL) AS "draftReports",
      (SELECT COUNT(*)::int FROM occupational_accident_reports WHERE status = 'SUBMITTED' AND deleted_at IS NULL) AS "submittedReports",
      (SELECT COUNT(*)::int FROM occupational_accident_reports WHERE status = 'RECEIVED' AND deleted_at IS NULL) AS "receivedReports",
      (SELECT COUNT(*)::int FROM occupational_accident_reports WHERE status = 'RETURNED' AND deleted_at IS NULL) AS "returnedReports",
      (
        SELECT
          (SELECT COUNT(*) FROM occupational_accident_cases child
            LEFT JOIN occupational_accident_reports parent ON parent.id = child.report_id
            WHERE parent.id IS NULL)
          + (SELECT COUNT(*) FROM occupational_accident_victim_groups child
            LEFT JOIN occupational_accident_cases parent ON parent.id = child.accident_case_id
            WHERE parent.id IS NULL)
          + (SELECT COUNT(*) FROM occupational_accident_report_submissions child
            LEFT JOIN occupational_accident_reports parent ON parent.id = child.report_id
            WHERE parent.id IS NULL)
          + (SELECT COUNT(*) FROM occupational_accident_report_histories child
            LEFT JOIN occupational_accident_reports parent ON parent.id = child.report_id
            WHERE parent.id IS NULL)
      )::int AS "orphanRows"
  `);

  const minimums: Array<[keyof DemoDataSummary, number]> = [
    ['users', 31],
    ['enterprises', 30],
    ['reportPeriods', 5],
    ['openReportPeriods', 1],
    ['injuryFactors', 9],
    ['injuryTypes', 31],
    ['accidentCauses', 8],
    ['reports', 6],
    ['cases', 3],
    ['victimGroups', 3],
    ['article39Summaries', 2],
    ['submissions', 3],
    ['histories', 11],
    ['draftDocuments', 2],
    ['draftReports', 1],
    ['submittedReports', 1],
    ['receivedReports', 1],
    ['returnedReports', 1],
  ];
  for (const [key, minimum] of minimums) {
    assertMinimum(summary, key, minimum);
  }
  if (summary.orphanRows !== 0) {
    throw new Error(
      `Demo data verification failed: found ${summary.orphanRows} orphan row(s).`,
    );
  }

  console.log('Demo data verification passed.');
  console.table(summary);
} catch (error) {
  console.error('Demo data verification failed.', error);
  process.exitCode = 1;
} finally {
  if (dataSource.isInitialized) await dataSource.destroy();
}
