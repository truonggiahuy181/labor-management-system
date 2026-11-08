export const BUSINESS_TYPE_CATALOG = [
  ['TNHH1', 'Công ty TNHH một thành viên'],
  ['TNHH2', 'Công ty TNHH hai thành viên trở lên'],
  ['CTCP', 'Công ty cổ phần'],
  ['HD', 'Công ty hợp danh'],
  ['DNTN', 'Doanh nghiệp tư nhân'],
] as const;

export type BusinessTypeCode = (typeof BUSINESS_TYPE_CATALOG)[number][0];
