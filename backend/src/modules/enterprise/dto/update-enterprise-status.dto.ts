import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateEnterpriseStatusDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isActive: boolean;
}
