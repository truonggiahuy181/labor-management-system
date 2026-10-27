import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const BUSINESS_TYPE_CODE_RE = /^[A-Z0-9][A-Z0-9_-]*$/;

export class CreateBusinessTypeDto {
  @ApiProperty({ example: 'TNHH1', maxLength: 50 })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(BUSINESS_TYPE_CODE_RE, {
    message: 'Mã loại hình chỉ gồm chữ in hoa, số, gạch dưới hoặc gạch ngang',
  })
  typeCode: string;

  @ApiProperty({ example: 'Công ty TNHH một thành viên', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  typeName: string;
}
