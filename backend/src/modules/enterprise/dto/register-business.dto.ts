import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsDateString,
  IsNumberString,
  Length,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Khớp TAX_CODE_RE / PHONE_RE ở frontend (BusinessInfoStep.tsx)
const TAX_CODE_RE = /^\d{10}(-\d{3})?$/;
const PHONE_RE = /^0\d{9}$/;

// ─── BƯỚC 1: Gửi OTP tới email doanh nghiệp ─────────────────────────────────
export class SendBusinessOtpDto {
  @ApiProperty({ example: 'contact@company.vn' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @ApiProperty({ example: '0101234567' })
  @Matches(TAX_CODE_RE, { message: 'Mã số thuế không hợp lệ' })
  taxCode: string;
}

// ─── BƯỚC 2: Xác thực OTP ────────────────────────────────────────────────────
export class VerifyBusinessOtpDto {
  @ApiProperty({ example: 'contact@company.vn' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @ApiProperty({ example: '123456' })
  @IsNumberString({}, { message: 'OTP phải là chuỗi số' })
  @Length(6, 6, { message: 'OTP phải có đúng 6 chữ số' })
  otp: string;
}

// ─── BƯỚC 3: Gửi hồ sơ (multipart/form-data) ────────────────────────────────
// File businessLicense / otherDocument được nhận qua FileFieldsInterceptor, không nằm trong DTO.
export class RegisterBusinessDto {
  @ApiProperty({ example: 'Công ty TNHH ABC' })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiProperty({ example: '0101234567' })
  @Matches(TAX_CODE_RE, { message: 'Mã số thuế không hợp lệ' })
  taxCode: string;

  @ApiProperty({ example: 'TNHH1' })
  @IsString()
  @IsNotEmpty()
  businessType: string;

  @ApiProperty({ example: '6201' })
  @IsString()
  @IsNotEmpty()
  mainIndustry: string;

  @ApiProperty({ example: '2020-01-15' })
  @IsDateString({}, { message: 'Ngày cấp phép không hợp lệ' })
  licenseDate: string;

  @ApiProperty({ example: 'HCM' })
  @IsString()
  @IsNotEmpty()
  province: string;

  @ApiProperty({ example: 'TAN_DINH' })
  @IsString()
  @IsNotEmpty()
  ward: string;

  @ApiProperty({ example: '12 Nguyễn Huệ' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  foreignName?: string;

  @ApiProperty({ example: 'contact@company.vn' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  officePhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  leaderName?: string;

  @ApiPropertyOptional({ example: '0912345678' })
  @IsOptional()
  @Matches(PHONE_RE, { message: 'Số điện thoại không hợp lệ' })
  leaderPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  operatingProvince?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  operatingWard?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessLocation?: string;

  @ApiProperty({ description: 'Token nhận được ở bước 2 (verify-otp)' })
  @IsString()
  @IsNotEmpty()
  verifyToken: string;
}
