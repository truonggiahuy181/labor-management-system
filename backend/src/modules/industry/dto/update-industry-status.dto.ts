import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateIndustryStatusDto {
  @ApiProperty({ example: false })
  @IsBoolean()
  isActive: boolean;
}
