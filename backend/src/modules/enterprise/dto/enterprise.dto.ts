import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

const TAX_CODE_RE = /^\d{10}(-\d{3})?$/;
const PHONE_RE = /^0\d{9}$/;
const LEVEL_FOUR_INDUSTRY_CODE_RE = /^\d{4}$/;

export class CreateEnterpriseDto {
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

  @ApiProperty({ example: '6201', description: 'Mã ngành nghề kinh doanh cấp 4' })
  @Matches(LEVEL_FOUR_INDUSTRY_CODE_RE, {
    message: 'Ngành nghề kinh doanh phải là mã ngành cấp 4 gồm 4 chữ số',
  })
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

  @ApiProperty({ example: 'contact@company.vn' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  foreignName?: string;

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

  @ApiPropertyOptional({ description: 'Đường dẫn giấy phép kinh doanh đã tải lên' })
  @IsOptional()
  @IsString()
  businessLicensePath?: string;

  @ApiPropertyOptional({ description: 'Đường dẫn giấy tờ đính kèm khác đã tải lên' })
  @IsOptional()
  @IsString()
  otherDocumentPath?: string;
}

export class UpdateEnterpriseDto extends PartialType(CreateEnterpriseDto) {
  @ApiPropertyOptional({ description: 'Trạng thái hoạt động' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateEnterpriseStatusDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isActive: boolean;
}
