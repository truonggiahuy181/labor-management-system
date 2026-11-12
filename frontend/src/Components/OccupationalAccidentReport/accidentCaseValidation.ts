import type {
  AccidentCaseBody,
  AccidentVictimGroupBody,
  OccupationalAccidentCase,
} from "@/services/occupationalAccidentReport";

export const createEmptyVictimGroup = (): AccidentVictimGroupBody => ({
  occupationId: 0,
  isUnderEnterpriseManagement: true,
  victimCount: 0,
  femaleCount: 0,
  deathCount: 0,
  severeCount: 0,
});

export const createEmptyAccidentCase = (): AccidentCaseBody => ({
  accidentDate: "",
  primaryCauseId: 0,
  injuryFactorId: 0,
  medicalCostVnd: "0",
  salaryCostVnd: "0",
  compensationCostVnd: "0",
  lostWorkDays: 0,
  propertyDamageVnd: "0",
  victimGroups: [createEmptyVictimGroup()],
});

export const toAccidentCaseBody = (
  item: OccupationalAccidentCase | null,
): AccidentCaseBody =>
  item
    ? {
        accidentDate: item.accidentDate.slice(0, 10),
        primaryCauseId: item.accidentCause.id,
        injuryFactorId: item.injuryFactor.id,
        medicalCostVnd: item.medicalCostVnd,
        salaryCostVnd: item.salaryCostVnd,
        compensationCostVnd: item.compensationCostVnd,
        lostWorkDays: item.lostWorkDays,
        propertyDamageVnd: item.propertyDamageVnd,
        victimGroups: item.victimGroups.map((group) => ({
          occupationId: group.occupation.id,
          isUnderEnterpriseManagement: group.isUnderEnterpriseManagement,
          victimCount: group.victimCount,
          femaleCount: group.femaleCount,
          deathCount: group.deathCount,
          severeCount: group.severeCount,
        })),
      }
    : createEmptyAccidentCase();

export const isEmptyAccidentCase = (body: AccidentCaseBody) =>
  JSON.stringify(body) === JSON.stringify(createEmptyAccidentCase());

export interface AccidentCaseConstraints {
  totalEmployees: number;
  femaleEmployees: number;
  minDate: string;
  maxDate: string;
}

const displayDate = (value: string) => value.split("-").reverse().join("/");
const validCount = (value: number, minimum = 0) =>
  Number.isInteger(value) && value >= minimum && value <= 2_147_483_647;
const validDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
};

export const getAccidentCaseErrors = (
  form: AccidentCaseBody,
  {
    totalEmployees,
    femaleEmployees,
    minDate,
    maxDate,
  }: AccidentCaseConstraints,
): Record<string, string> => {
  const errors: Record<string, string> = {};
  if (!form.accidentDate)
    errors.accidentDate = "Vui lòng nhập ngày xảy ra tai nạn.";
  else if (!validDate(form.accidentDate))
    errors.accidentDate = "Ngày xảy ra tai nạn không hợp lệ.";
  else if (form.accidentDate < minDate || form.accidentDate > maxDate)
    errors.accidentDate = `Ngày xảy ra tai nạn phải từ ${displayDate(minDate)} đến ${displayDate(maxDate)}.`;
  if (!validCount(form.primaryCauseId, 1))
    errors.primaryCauseId = "Vui lòng chọn nguyên nhân xảy ra tai nạn.";
  if (!validCount(form.injuryFactorId, 1))
    errors.injuryFactorId = "Vui lòng chọn yếu tố gây chấn thương.";
  if (!form.victimGroups.length)
    errors.victimGroups = "Vui lòng thêm ít nhất một nhóm nạn nhân.";

  const selectedGroups = new Set<string>();
  let managedVictims = 0;
  let managedFemaleVictims = 0;
  form.victimGroups.forEach((group, index) => {
    const prefix = `victimGroups.${index}`;
    if (!validCount(group.occupationId, 1))
      errors[`${prefix}.occupationId`] = "Vui lòng chọn nghề nghiệp.";
    for (const key of [
      "victimCount",
      "femaleCount",
      "deathCount",
      "severeCount",
    ] as const) {
      if (!validCount(group[key], key === "victimCount" ? 1 : 0))
        errors[`${prefix}.${key}`] =
          key === "victimCount"
            ? "Số nạn nhân phải là số nguyên lớn hơn 0."
            : "Vui lòng nhập số nguyên không âm.";
    }
    if (group.femaleCount > group.victimCount)
      errors[`${prefix}.femaleCount`] = "Số nữ không được lớn hơn số nạn nhân.";
    if (group.deathCount + group.severeCount > group.victimCount)
      errors[`${prefix}.severeCount`] =
        "Tổng số người chết và thương nặng không được lớn hơn số nạn nhân.";
    if (group.occupationId > 0) {
      const key = `${group.occupationId}:${group.isUnderEnterpriseManagement}`;
      if (selectedGroups.has(key))
        errors[`${prefix}.occupationId`] =
          "Nghề nghiệp và phạm vi quản lý bị trùng với nhóm khác.";
      selectedGroups.add(key);
    }
    if (group.isUnderEnterpriseManagement) {
      managedVictims += group.victimCount;
      managedFemaleVictims += group.femaleCount;
    }
  });
  if (managedVictims > totalEmployees)
    errors.victimGroups = `Số nạn nhân thuộc quyền quản lý trong vụ này không được lớn hơn tổng số ${totalEmployees} lao động của cơ sở.`;
  else if (managedFemaleVictims > femaleEmployees)
    errors.victimGroups = `Số lao động nữ bị nạn thuộc quyền quản lý trong vụ này không được lớn hơn tổng số ${femaleEmployees} lao động nữ.`;
  if (!validCount(form.lostWorkDays))
    errors.lostWorkDays = "Tổng số ngày nghỉ phải là số nguyên không âm.";
  return errors;
};
