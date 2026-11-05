import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateInjuryTypeStatusDto {
  @ApiProperty({ example: false })
  @IsBoolean()
  isActive: boolean;
}
