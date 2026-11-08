import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { parseBooleanQueryParam } from '../../../commons/transforms/query.transform.js';
import {
  ReportPeriodCode,
  ReportTypeCode,
} from '../report-period.constants.js';

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

export class ReportPeriodQueryDto {
  @ApiPropertyOptional({ example: 'tai nạn' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @ApiPropertyOptional({ example: 'Báo cáo tai nạn lao động' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reportName?: string;

  @ApiPropertyOptional({ example: 2026, minimum: 2000, maximum: 2100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  reportYear?: number;

  @ApiPropertyOptional({ enum: Object.values(ReportTypeCode) })
  @IsOptional()
  @IsEnum(ReportTypeCode)
  reportTypeCode?: ReportTypeCode;

  @ApiPropertyOptional({ enum: Object.values(ReportPeriodCode) })
  @IsOptional()
  @IsEnum(ReportPeriodCode)
  periodCode?: ReportPeriodCode;

  @ApiPropertyOptional({ example: '2026-01-01', format: 'date' })
  @IsOptional()
  @IsDateString()
  @Matches(DATE_ONLY_RE)
  submissionStartDate?: string;

  @ApiPropertyOptional({ example: '2026-12-31', format: 'date' })
  @IsOptional()
  @IsDateString()
  @Matches(DATE_ONLY_RE)
  submissionEndDate?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(parseBooleanQueryParam)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(parseBooleanQueryParam)
  @IsBoolean()
  includeInactive?: boolean;
}
