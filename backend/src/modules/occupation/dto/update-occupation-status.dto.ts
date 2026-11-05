import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateOccupationStatusDto {
  @ApiProperty({ example: false })
  @IsBoolean()
  isActive: boolean;
}
