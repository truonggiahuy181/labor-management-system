import type { OccupationalAccidentCase } from "@/services/occupationalAccidentReport";

export const MAX_EMPLOYEES = 2_147_483_647;

export const getReportHeaderErrors = (
  totalEmployees: string,
  femaleEmployees: string,
  cases: Pick<OccupationalAccidentCase, "victimGroups">[],
  payrollFundVnd: string,
) => {
  const errors: {
    totalEmployees?: string;
    femaleEmployees?: string;
    payrollFundVnd?: string;
  } = {};
  const total = Number(totalEmployees);
  const female = Number(femaleEmployees);
  const validCount = (value: string) =>
    /^\d+$/.test(value) && Number(value) <= MAX_EMPLOYEES;
  const required = cases.reduce(
    (minimum, accidentCase) => {
      const managed = accidentCase.victimGroups.reduce(
        (sum, group) => {
          if (group.isUnderEnterpriseManagement) {
            sum.employees += group.victimCount;
            sum.femaleEmployees += group.femaleCount;
          }
          return sum;
        },
        { employees: 0, femaleEmployees: 0 },
      );
      return {
        employees: Math.max(minimum.employees, managed.employees),
        femaleEmployees: Math.max(
          minimum.femaleEmployees,
          managed.femaleEmployees,
        ),
      };
    },
    { employees: 0, femaleEmployees: 0 },
  );

  if (!validCount(totalEmployees) || total < 1) {
    errors.totalEmployees = "Tổng số lao động phải từ 1 trở lên.";
  } else if (total < required.employees) {
    errors.totalEmployees = `Không được nhỏ hơn ${required.employees} nạn nhân thuộc quyền quản lý trong một vụ.`;
  }

  if (!validCount(femaleEmployees)) {
    errors.femaleEmployees =
      "Số lao động nữ phải là số nguyên từ 0 đến 2.147.483.647.";
  } else if (!errors.totalEmployees && female > total) {
    errors.femaleEmployees = "Không được lớn hơn tổng số lao động.";
  } else if (female < required.femaleEmployees) {
    errors.femaleEmployees = `Không được nhỏ hơn ${required.femaleEmployees} lao động nữ bị nạn thuộc quyền quản lý trong một vụ.`;
  }

  if (
    !/^\d{1,19}$/.test(payrollFundVnd) ||
    BigInt(payrollFundVnd) <= BigInt(0)
  ) {
    errors.payrollFundVnd = "Tổng quỹ lương phải là số nguyên lớn hơn 0.";
  } else if (BigInt(payrollFundVnd) > BigInt("9223372036854775807")) {
    errors.payrollFundVnd = "Tổng quỹ lương vượt quá giá trị cho phép.";
  }

  return errors;
};
