import { ApiProperty } from '@nestjs/swagger';

export class ReportPeriodResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Báo cáo tai nạn lao động' })
  reportName: string;

  @ApiProperty({ example: 2026 })
  reportYear: number;

  @ApiProperty({ example: 'Cả năm' })
  reportPeriod: string;

  @ApiProperty({ example: '2026-01-01', format: 'date' })
  startDate: string;

  @ApiProperty({ example: '2026-12-31', format: 'date' })
  endDate: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  updatedAt: Date;
}
