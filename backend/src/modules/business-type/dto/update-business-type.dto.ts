import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBusinessTypeDto {
  @ApiPropertyOptional({
    example: 'Công ty trách nhiệm hữu hạn một thành viên',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  typeName?: string;
}
