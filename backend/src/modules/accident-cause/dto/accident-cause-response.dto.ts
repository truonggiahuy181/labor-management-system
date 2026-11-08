import { ApiProperty } from '@nestjs/swagger';
import type { AccidentCauseGroup } from '../accident-cause.constants.js';

export class AccidentCauseResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '1' })
  causeCode: string;

  @ApiProperty({ example: 'Không có thiết bị an toàn' })
  causeName: string;

  @ApiProperty({ example: 'EMPLOYER' })
  causeGroup: AccidentCauseGroup;

  @ApiProperty({ example: 1 })
  displayOrder: number;

  @ApiProperty({ example: true })
  isActive: boolean;
}
