import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const NAME_START_RE = /^[\p{L}\p{N}]/u;

export class CreateInjuryFactorDto {
  @ApiProperty({ example: 'Mã 1', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(NAME_START_RE, {
    message: 'Mã yếu tố chấn thương phải bắt đầu bằng chữ cái hoặc chữ số',
  })
  factorCode: string;

  @ApiProperty({ example: 'Điện', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Matches(NAME_START_RE, {
    message: 'Tên yếu tố chấn thương phải bắt đầu bằng chữ cái hoặc chữ số',
  })
  factorName: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
