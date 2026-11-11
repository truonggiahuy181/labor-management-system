import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { OccupationalAccidentReportStatus } from '../occupational-accident-report.constants.js';

const REVIEW_STATUSES = [
  OccupationalAccidentReportStatus.SUBMITTED,
  OccupationalAccidentReportStatus.RECEIVED,
  OccupationalAccidentReportStatus.RETURNED,
] as const;

export class AdminOccupationalAccidentReportQueryDto {
  @ApiPropertyOptional({
    description: 'Tìm theo tên doanh nghiệp hoặc mã số thuế.',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @ApiPropertyOptional({ description: 'Tìm theo tên doanh nghiệp.', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  enterpriseName?: string;

  @ApiPropertyOptional({ description: 'Tìm theo mã số thuế.', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  taxCode?: string;

  @ApiPropertyOptional({ example: 2026, minimum: 2000, maximum: 2100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  reportPeriodId?: number;

  @ApiPropertyOptional({ enum: REVIEW_STATUSES })
  @IsOptional()
  @IsIn(REVIEW_STATUSES)
  status?: (typeof REVIEW_STATUSES)[number];

  @ApiPropertyOptional({
    description: 'Mã tỉnh/thành phố của doanh nghiệp (trụ sở chính).',
    example: '79',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}$/)
  provinceId?: string;

  @ApiPropertyOptional({
    description: 'Mã phường/xã của doanh nghiệp (trụ sở chính).',
    example: '26740',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{5}$/)
  wardId?: string;

  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 100, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 10;
}
