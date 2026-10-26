// src/services/enterprise.ts
// Quản lý doanh nghiệp (chỉ Quản trị viên) – khớp EnterpriseController / CreateEnterpriseDto của backend.
// Những gì backend chưa hỗ trợ (xoá, file đính kèm, mật khẩu mặc định...) ghi ở frontend/BACKEND_CHANGES.md
import api from './api';
import type { BusinessInfo } from './business';
import type { BackendResponse } from './user';

export interface Enterprise {
  id: number;
  enterpriseName: string;
  taxCode: string;
  businessTypeId: number;
  industryId: number;
  registrationDate: string;          // 'YYYY-MM-DD'
  provinceId: string;
  wardId: string;
  address: string;
  foreignName: string | null;
  email: string;
  phoneNumber: string | null;
  representativeName: string | null;
  representativePhone: string | null;
  operatingProvinceId: string | null;
  operatingWardId: string | null;
  operatingAddress: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Body tạo / sửa: các trường tuỳ chọn để trống thì không gửi
export type EnterpriseBody = Omit<Enterprise, 'id' | 'isActive' | 'createdAt' | 'updatedAt'>;

export interface BusinessType { id: number; typeCode: string; typeName: string; isActive: boolean }
export interface Industry { id: number; industryCode: string; industryName: string; level: number; parentId: number | null }

// Backend tạo tài khoản doanh nghiệp với username = MST và mật khẩu cố định
// (backend/src/modules/enterprise/enterprise.service.ts: argon2.hash('12345678')), API không trả mật khẩu về
export const ENTERPRISE_DEFAULT_PASSWORD = '12345678';

export const enterpriseApi = {
  list: () => api.get<BackendResponse<Enterprise[]>>('/enterprises').then((r) => r.data.data ?? []),
  get: (id: number) => api.get<BackendResponse<Enterprise>>(`/enterprises/${id}`).then((r) => r.data.data),
  create: (body: Partial<EnterpriseBody>) =>
    api.post<BackendResponse<Enterprise>>('/enterprises', body).then((r) => r.data.data),
  update: (id: number, body: Partial<EnterpriseBody>) =>
    api.patch<BackendResponse<Enterprise>>(`/enterprises/${id}`, body).then((r) => r.data.data),
  updateStatus: (id: number, isActive: boolean) =>
    api.patch<BackendResponse<Enterprise>>(`/enterprises/${id}/status`, { isActive }).then((r) => r.data.data),
  // Backend CHƯA có route này (xem BACKEND_CHANGES.md) – gọi sẽ nhận 404 cho tới khi được bổ sung
  remove: (ids: number[]) =>
    api.delete<BackendResponse<{ deleted: number }>>('/enterprises', { data: { ids } }).then((r) => r.data.data),
};

// ─── Chuyển đổi với form dùng chung của luồng đăng ký (BusinessInfo, Components/BusinessRegister) ───
// Ô chọn loại hình / ngành nghề giữ id dạng chuỗi

export const toBusinessInfo = (e: Enterprise): BusinessInfo => ({
  companyName: e.enterpriseName, taxCode: e.taxCode, businessType: String(e.businessTypeId), mainIndustry: String(e.industryId),
  licenseDate: e.registrationDate?.slice(0, 10) ?? '', province: e.provinceId, ward: e.wardId, address: e.address,
  foreignName: e.foreignName ?? '', email: e.email, officePhone: e.phoneNumber ?? '',
  leaderName: e.representativeName ?? '', leaderPhone: e.representativePhone ?? '',
  operatingProvince: e.operatingProvinceId ?? '', operatingWard: e.operatingWardId ?? '', businessLocation: e.operatingAddress ?? '',
});

// Thêm mới: ô trống không gửi (DTO backend kiểm tra định dạng nếu có giá trị).
// Cập nhật: ô trống gửi null để xoá giá trị cũ; mã số thuế (= tên đăng nhập) không gửi.
export const toEnterpriseBody = (info: BusinessInfo, isEdit = false): Partial<EnterpriseBody> => {
  const fields: Record<string, string> = {
    enterpriseName: info.companyName, taxCode: info.taxCode, businessTypeId: info.businessType, industryId: info.mainIndustry,
    registrationDate: info.licenseDate, provinceId: info.province, wardId: info.ward, address: info.address,
    foreignName: info.foreignName, email: info.email, phoneNumber: info.officePhone,
    representativeName: info.leaderName, representativePhone: info.leaderPhone,
    operatingProvinceId: info.operatingProvince, operatingWardId: info.operatingWard, operatingAddress: info.businessLocation,
  };
  if (isEdit) delete fields.taxCode;
  const body: Record<string, string | number | null> = {};
  Object.entries(fields).forEach(([key, value]) => {
    if (value?.trim()) body[key] = value.trim();
    else if (isEdit) body[key] = null;
  });
  if (body.businessTypeId) body.businessTypeId = Number(body.businessTypeId);
  if (body.industryId) body.industryId = Number(body.industryId);
  return body as Partial<EnterpriseBody>;
};

export const catalogApi = {
  businessTypes: () => api.get<BackendResponse<BusinessType[]>>('/business-types').then((r) => r.data.data ?? []),
  industries: () => api.get<BackendResponse<Industry[]>>('/industries').then((r) => r.data.data ?? []),   // chỉ cấp 4
};
