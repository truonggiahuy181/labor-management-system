import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRoleStatusDto {
  @ApiProperty({ example: false })
  @IsBoolean()
  isActive: boolean;
}
