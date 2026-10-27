import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { parseBooleanQueryParam } from '../../../commons/transforms/query.transform.js';

export class EnterpriseQueryDto {
  @ApiPropertyOptional({
    example: 'ABC',
    description:
      'Tìm theo tên doanh nghiệp, mã số thuế, email hoặc người đại diện',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  businessTypeId?: number;

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  industryId?: number;

  @ApiPropertyOptional({ example: '79', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  provinceId?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(parseBooleanQueryParam)
  @IsBoolean()
  isActive?: boolean;
}
