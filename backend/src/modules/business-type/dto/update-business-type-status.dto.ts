import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateBusinessTypeStatusDto {
  @ApiProperty({ example: false })
  @IsBoolean()
  isActive: boolean;
}
