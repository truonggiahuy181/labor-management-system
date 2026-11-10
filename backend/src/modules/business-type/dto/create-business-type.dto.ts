import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const BUSINESS_TYPE_CODE_RE = /^[A-Z0-9][A-Z0-9_-]*$/;
const NAME_START_RE = /^[\p{L}\p{N}]/u;

export class CreateBusinessTypeDto {
  @ApiProperty({ example: 'TNHH1', maxLength: 50 })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(BUSINESS_TYPE_CODE_RE, {
    message:
      'Mã loại hình phải bắt đầu bằng chữ in hoa (A-Z) hoặc số (0-9); chỉ được dùng A-Z, 0-9, "_" và "-"',
  })
  typeCode: string;

  @ApiProperty({ example: 'Công ty TNHH một thành viên', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Matches(NAME_START_RE, {
    message: 'Tên loại hình kinh doanh phải bắt đầu bằng chữ cái hoặc chữ số',
  })
  typeName: string;
}
