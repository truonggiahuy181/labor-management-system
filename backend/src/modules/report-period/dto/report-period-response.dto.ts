import { ApiProperty } from '@nestjs/swagger';
import type {
  ReportPeriodCode,
  ReportTypeCode,
} from '../report-period.constants.js';

export class ReportPeriodResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Báo cáo tai nạn lao động' })
  reportName: string;

  @ApiProperty({ example: 2026 })
  reportYear: number;

  @ApiProperty({ example: 'Cả năm' })
  reportPeriod: string;

  @ApiProperty({ example: 'OCCUPATIONAL_ACCIDENT' })
  reportTypeCode: ReportTypeCode;

  @ApiProperty({ example: 'FIRST_HALF' })
  periodCode: ReportPeriodCode;

  @ApiProperty({ example: '2027-01-01', format: 'date' })
  startDate: string;

  @ApiProperty({ example: '2027-01-09', format: 'date' })
  endDate: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  updatedAt: Date;
}
