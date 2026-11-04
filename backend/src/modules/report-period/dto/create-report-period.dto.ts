import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

  @ApiProperty({ example: 'Cả năm', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  reportPeriod: string;

  @ApiProperty({ example: '2026-01-01', format: 'date' })
  @IsDateString({}, { message: 'Ngày bắt đầu không hợp lệ' })
  @Matches(DATE_ONLY_RE, { message: 'Ngày bắt đầu phải có dạng YYYY-MM-DD' })
  startDate: string;

  @ApiProperty({ example: '2026-12-31', format: 'date' })
  @IsDateString({}, { message: 'Ngày kết thúc không hợp lệ' })
  @Matches(DATE_ONLY_RE, { message: 'Ngày kết thúc phải có dạng YYYY-MM-DD' })
  endDate: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
