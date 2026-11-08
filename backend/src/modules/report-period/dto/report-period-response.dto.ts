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

  @ApiProperty({ example: 'OCCUPATIONAL_ACCIDENT' })
  reportTypeCode: ReportTypeCode;

  @ApiProperty({ example: 'FIRST_HALF' })
  periodCode: ReportPeriodCode;

  @ApiProperty({ example: '2026-07-01', format: 'date' })
  submissionStartDate: string;

  @ApiProperty({ example: '2026-07-04', format: 'date' })
  submissionEndDate: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  updatedAt: Date;
}
