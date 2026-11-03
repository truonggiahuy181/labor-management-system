// src/services/enterprise.ts
// Quản lý doanh nghiệp (chỉ Quản trị viên) – khớp EnterpriseController / CreateEnterpriseDto của backend.
import api from './api';
import type { BusinessFileInfo, BusinessFiles, BusinessInfo } from './business';
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
  files: Partial<Record<keyof BusinessFiles, BusinessFileInfo>>;
  // File doanh nghiệp tự tải lên khi đăng ký (POST /files/public-document), chỉ có objectKey
  businessLicenseKey?: string | null;
  otherDocumentKey?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Body tạo / sửa: các trường tuỳ chọn để trống thì không gửi
export type EnterpriseBody = Omit<Enterprise, 'id' | 'files' | 'isActive' | 'createdAt' | 'updatedAt'>;

export type EnterpriseFileType = keyof BusinessFiles;

export interface BusinessType { id: number; typeCode: string; typeName: string; isActive: boolean }
export interface Industry { id: number; industryCode: string; industryName: string; level: number; parentId: number | null }

// Backend tạo tài khoản doanh nghiệp với username = MST và mật khẩu cố định
// (backend/src/modules/enterprise/enterprise.service.ts: argon2.hash('12345678')), API không trả mật khẩu về
export interface CreatedEnterprise {
  enterprise: Enterprise;
  initialAccess: { username: string; temporaryPassword: string };
}

export const enterpriseApi = {
  list: () => api.get<BackendResponse<Enterprise[]>>('/enterprises').then((r) => r.data.data ?? []),
  get: (id: number) => api.get<BackendResponse<Enterprise>>(`/enterprises/${id}`).then((r) => r.data.data),
  create: (body: Partial<EnterpriseBody>) =>
    api.post<BackendResponse<CreatedEnterprise>>('/enterprises', body).then((r) => r.data.data),
  update: (id: number, body: Partial<EnterpriseBody>) =>
    api.patch<BackendResponse<Enterprise>>(`/enterprises/${id}`, body).then((r) => r.data.data),
  uploadFile: (id: number, fileType: EnterpriseFileType, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<BackendResponse<Enterprise>>(`/enterprises/${id}/files/${fileType}`, form).then((r) => r.data.data);
  },
  removeFile: (id: number, fileType: EnterpriseFileType) =>
    api.delete<BackendResponse<Enterprise>>(`/enterprises/${id}/files/${fileType}`).then((r) => r.data.data),
  updateStatus: (id: number, isActive: boolean) =>
    api.patch<BackendResponse<Enterprise>>(`/enterprises/${id}/status`, { isActive }).then((r) => r.data.data),
  remove: (id: number) => api.delete(`/enterprises/${id}`).then(() => undefined),
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

// Backend lưu file ở 2 nơi: `files` (admin tải lên, đủ tên gốc + accessUrl) và businessLicenseKey / otherDocumentKey
// (tải lên lúc đăng ký, chỉ có objectKey). Ưu tiên `files`, thiếu thì lấy file đăng ký.
const REGISTRATION_KEY = { businessLicense: 'businessLicenseKey', otherDocument: 'otherDocumentKey' } as const;

const fromRegistrationKey = (objectKey?: string | null): BusinessFileInfo | null =>
  objectKey
    ? { objectKey, originalName: objectKey.split('/').pop() ?? objectKey, contentType: '', size: 0, accessUrl: '' }
    : null;

export const toBusinessFiles = (e: Enterprise): BusinessFiles => ({
  businessLicense: e.files?.businessLicense ?? fromRegistrationKey(e.businessLicenseKey),
  otherDocument: e.files?.otherDocument ?? fromRegistrationKey(e.otherDocumentKey),
});

// File đăng ký bị xoá / thay khi sửa: DELETE /enterprises/:id/files chỉ xoá trong `files`,
// nên phải gửi key = null trong body cập nhật thì file cũ mới không hiện lại
export const clearedRegistrationKeys = (e: Enterprise, files: BusinessFiles) => {
  const body: Partial<Record<(typeof REGISTRATION_KEY)[EnterpriseFileType], null>> = {};
  (Object.keys(REGISTRATION_KEY) as EnterpriseFileType[]).forEach((type) => {
    const key = REGISTRATION_KEY[type];
    const current = files[type];
    const unchanged = current && !(current instanceof File) && current.objectKey === e[key];
    if (!e.files?.[type] && e[key] && !unchanged) body[key] = null;
  });
  return body;
};

// File đăng ký chưa có accessUrl sẵn → hỏi endpoint công khai
export const fileAccessUrl = async (file: BusinessFileInfo) =>
  file.accessUrl ||
  api.get<BackendResponse<{ accessUrl: string }>>('/files/public-access-url', { params: { objectKey: file.objectKey } })
    .then((r) => r.data.data.accessUrl);

// Cập nhật: ô trống gửi null để xoá giá trị cũ; mã số thuế (= tên đăng nhập) không gửi
// vì UpdateEnterpriseDto của backend không cho đổi mã số thuế; email được đồng bộ sang tài khoản doanh nghiệp.
export const toEnterpriseBody = (info: BusinessInfo, isEdit = false): Partial<EnterpriseBody> => {
  const fields: Record<string, string> = {
    enterpriseName: info.companyName, taxCode: info.taxCode, businessTypeId: info.businessType, industryId: info.mainIndustry,
    registrationDate: info.licenseDate, provinceId: info.province, wardId: info.ward, address: info.address,
    foreignName: info.foreignName, email: info.email, phoneNumber: info.officePhone,
    representativeName: info.leaderName, representativePhone: info.leaderPhone,
    operatingProvinceId: info.operatingProvince, operatingWardId: info.operatingWard, operatingAddress: info.businessLocation,
  };
  // Mã số thuế là tên đăng nhập nên không gửi khi sửa; email đổi được (backend đồng bộ sang tài khoản doanh nghiệp)
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
