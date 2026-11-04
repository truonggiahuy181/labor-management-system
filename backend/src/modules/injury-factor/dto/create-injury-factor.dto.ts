import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInjuryFactorDto {
  @ApiProperty({ example: 'Mã 1', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  factorCode: string;

  @ApiProperty({ example: 'Điện', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  factorName: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
