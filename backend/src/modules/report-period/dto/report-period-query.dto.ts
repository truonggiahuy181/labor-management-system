import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { parseBooleanQueryParam } from '../../../commons/transforms/query.transform.js';

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

export class ReportPeriodQueryDto {
  @ApiPropertyOptional({
    example: 'tai nạn',
    description: 'Tìm gần đúng theo tên báo cáo hoặc kỳ báo cáo',
  })
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

  @ApiPropertyOptional({ example: 'Cả năm' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  reportPeriod?: string;

  @ApiPropertyOptional({ example: '2026-01-01', format: 'date' })
  @IsOptional()
  @IsDateString()
  @Matches(DATE_ONLY_RE)
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-12-31', format: 'date' })
  @IsOptional()
  @IsDateString()
  @Matches(DATE_ONLY_RE)
  endDate?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(parseBooleanQueryParam)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    default: false,
    description: 'Lấy cả bản ghi inactive khi chưa truyền isActive',
  })
  @IsOptional()
  @Transform(parseBooleanQueryParam)
  @IsBoolean()
  includeInactive?: boolean;
}
