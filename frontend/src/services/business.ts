// src/services/business.ts
// API đăng ký tài khoản doanh nghiệp: điền form → xác thực email bằng OTP → xác nhận đăng ký.
// Tên đăng nhập của tài khoản mới = mã số thuế; tài khoản dùng được ngay sau khi xác nhận.
import api from './api';
import type { ApiResponse } from './auth';
import { toEnterpriseBody, type CreatedEnterprise } from './enterprise';

export interface BusinessInfo {
  // Thêm mới doanh nghiệp
  companyName: string;
  taxCode: string;
  businessType: string;
  mainIndustry: string;
  licenseDate: string;      // YYYY-MM-DD
  province: string;
  ward: string;
  address: string;
  // Thông tin liên hệ
  foreignName: string;
  email: string;
  officePhone: string;
  leaderName: string;
  leaderPhone: string;
  operatingProvince: string;
  operatingWard: string;
  businessLocation: string;
}

export interface BusinessFileInfo {
  objectKey: string;
  originalName: string;
  contentType: string;
  size: number;
  accessUrl: string;
}

export type BusinessFileValue = File | BusinessFileInfo | null;

export interface BusinessFiles {
  businessLicense: BusinessFileValue;
  otherDocument: BusinessFileValue;
}

export interface RegisteredAccount { username: string; tempPassword: string; companyName: string; email: string }

export type RegisterBusinessBody = BusinessInfo & BusinessFiles & { verifyToken: string };

// Lưu tạm kết quả tải file (POST /files/public-document) để vừa xem trước trên trình duyệt vừa tái sử dụng khi gửi hồ sơ
const uploadedFileCache = new WeakMap<File, Promise<BusinessFileInfo>>();

export const ensureUploadedPublicDocument = (file: File): Promise<BusinessFileInfo> => {
  let pending = uploadedFileCache.get(file);
  if (!pending) {
    const form = new FormData();
    form.append('file', file);
    pending = api
      .post<ApiResponse<BusinessFileInfo>>('/files/public-document', form)
      .then((res) => res.data.data)
      .catch((err) => {
        uploadedFileCache.delete(file);
        throw err;
      });
    uploadedFileCache.set(file, pending);
  }
  return pending;
};

// Chưa đăng nhập nên file đăng ký tải lên endpoint công khai trước, rồi gửi objectKey kèm hồ sơ
const uploadPublicDocument = async (file: BusinessFileValue) => {
  if (!file) return undefined;
  if (!(file instanceof File)) return file.objectKey;
  const uploaded = await ensureUploadedPublicDocument(file);
  return uploaded.objectKey;
};

const realBusinessApi = {
  // Bước 1 → 2: gửi mã OTP tới email doanh nghiệp (kiểm tra trùng MST/email trước khi gửi)
  sendOtp: (body: { email: string; taxCode: string }) =>
    api.post<ApiResponse<null>>('/auth/register-enterprise/request-otp', body).then((r) => r.data),

  // Bước 2: kiểm tra OTP, server trả token ngắn hạn (15 phút) chứng minh email đã xác thực
  verifyOtp: (body: { email: string; otp: string }) =>
    api.post<ApiResponse<{ verifyToken: string }>>('/auth/register-enterprise/verify-otp', body).then((r) => r.data),

  // Bước 3: tải file → gửi hồ sơ (JSON, khớp CreateEnterpriseDto) + objectKey + verifyToken
  register: async ({ businessLicense, otherDocument, verifyToken, ...info }: RegisterBusinessBody): Promise<ApiResponse<RegisteredAccount>> => {
    const [businessLicenseKey, otherDocumentKey] = await Promise.all([
      uploadPublicDocument(businessLicense),
      uploadPublicDocument(otherDocument),
    ]);
    const res = await api.post<ApiResponse<CreatedEnterprise>>('/auth/register-enterprise', {
      ...toEnterpriseBody(info),
      businessLicenseKey,
      otherDocumentKey,
      verifyToken,
    });
    const { enterprise, initialAccess } = res.data.data ?? {};
    return {
      ...res.data,
      data: enterprise && {
        username: initialAccess.username,
        tempPassword: initialAccess.temporaryPassword,
        companyName: enterprise.enterpriseName,
        email: enterprise.email,
      },
    };
  },
  // Quản trị viên thêm doanh nghiệp: dùng enterpriseApi.create (services/enterprise.ts)
};

export type BusinessApi = typeof realBusinessApi;

// ---------- API giả (NEXT_PUBLIC_MOCK_API=true), OTP luôn là 123456 ----------
const MOCK_OTP = '123456';
const delay = <T>(body: ApiResponse<T>) =>
  new Promise<ApiResponse<T>>((resolve) => setTimeout(() => resolve(body), 600));
const fail = (code: string) => delay<never>({ success: false, data: null as never, code });

const mockBusinessApi: BusinessApi = {
  sendOtp: ({ email }) => {
    console.info(`[mock] OTP đăng ký gửi tới ${email}: ${MOCK_OTP}`);
    return delay({ success: true, data: null });
  },
  verifyOtp: ({ otp }) =>
    otp === MOCK_OTP ? delay({ success: true, data: { verifyToken: 'mock-token' } }) : fail('OTP_INVALID'),
  register: ({ taxCode, companyName, email }) =>
    delay({ success: true, data: { username: taxCode, tempPassword: 'Mock1234Aa1', companyName, email } }),
};

export const businessApi: BusinessApi =
  process.env.NEXT_PUBLIC_MOCK_API === 'true' ? mockBusinessApi : realBusinessApi;
