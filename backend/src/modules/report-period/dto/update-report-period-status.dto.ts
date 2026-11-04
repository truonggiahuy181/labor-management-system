import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateReportPeriodStatusDto {
  @ApiProperty({ example: false })
  @IsBoolean()
  isActive: boolean;
}
