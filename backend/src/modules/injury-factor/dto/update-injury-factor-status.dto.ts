import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateInjuryFactorStatusDto {
  @ApiProperty({ example: false })
  @IsBoolean()
  isActive: boolean;
}
