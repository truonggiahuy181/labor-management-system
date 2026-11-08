import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  ReportPeriodCode,
  ReportTypeCode,
} from '../report-period.constants.js';

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

export class CreateReportPeriodDto {
  @ApiProperty({ example: 'Báo cáo tai nạn lao động', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  reportName: string;

  @ApiProperty({ example: 2026, minimum: 2000, maximum: 2100 })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  reportYear: number;

  @ApiProperty({ enum: Object.values(ReportTypeCode) })
  @IsEnum(ReportTypeCode)
  reportTypeCode: ReportTypeCode;

  @ApiProperty({ enum: Object.values(ReportPeriodCode) })
  @IsEnum(ReportPeriodCode)
  periodCode: ReportPeriodCode;

  @ApiProperty({ example: '2027-01-01', format: 'date' })
  @IsDateString({}, { message: 'Ngày bắt đầu không hợp lệ' })
  @Matches(DATE_ONLY_RE, { message: 'Ngày bắt đầu phải có dạng YYYY-MM-DD' })
  submissionStartDate: string;

  @ApiProperty({ example: '2027-01-09', format: 'date' })
  @IsDateString({}, { message: 'Ngày kết thúc không hợp lệ' })
  @Matches(DATE_ONLY_RE, { message: 'Ngày kết thúc phải có dạng YYYY-MM-DD' })
  submissionEndDate: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
