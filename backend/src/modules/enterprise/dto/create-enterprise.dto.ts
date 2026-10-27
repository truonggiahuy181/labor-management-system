import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const TAX_CODE_RE = /^\d{10}(-\d{3})?$/;
const PHONE_RE = /^0\d{9}$/;

export class CreateEnterpriseDto {
  @ApiProperty({ example: 'Công ty TNHH ABC', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  enterpriseName: string;

  @ApiProperty({ example: '0101234567' })
  @Matches(TAX_CODE_RE, { message: 'Mã số thuế không hợp lệ' })
  @MaxLength(50)
  taxCode: string;

  @ApiProperty({ example: 1, description: 'ID loại hình kinh doanh' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  businessTypeId: number;

  @ApiProperty({ example: 1, description: 'ID ngành nghề kinh doanh chính' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  industryId: number;

  @ApiProperty({ example: '2020-01-15' })
  @IsDateString({}, { message: 'Ngày cấp phép không hợp lệ' })
  registrationDate: string;

  @ApiProperty({ example: '79', maxLength: 20 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  provinceId: string;

  @ApiProperty({ example: '26734', maxLength: 20 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  wardId: string;

  @ApiProperty({ example: '12 Nguyễn Huệ', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  address: string;

  @ApiProperty({ example: 'contact@company.vn', maxLength: 100 })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @MaxLength(100)
  email: string;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  foreignName?: string;

  @ApiPropertyOptional({ maxLength: 20 })
  @IsOptional()
  @IsString()
  @Matches(PHONE_RE, { message: 'Số điện thoại không hợp lệ' })
  phoneNumber?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  representativeName?: string;

  @ApiPropertyOptional({ example: '0912345678' })
  @IsOptional()
  @Matches(PHONE_RE, { message: 'Số điện thoại không hợp lệ' })
  representativePhone?: string;

  @ApiPropertyOptional({ maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  operatingProvinceId?: string;

  @ApiPropertyOptional({ maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  operatingWardId?: string;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  operatingAddress?: string;
}
