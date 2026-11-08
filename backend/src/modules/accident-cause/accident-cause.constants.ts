export const AccidentCauseGroup = {
  EMPLOYER: 'EMPLOYER',
  EMPLOYEE: 'EMPLOYEE',
  OBJECTIVE: 'OBJECTIVE',
} as const;

export type AccidentCauseGroup =
  (typeof AccidentCauseGroup)[keyof typeof AccidentCauseGroup];
