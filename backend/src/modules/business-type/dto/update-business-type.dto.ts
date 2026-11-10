import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const NAME_START_RE = /^[\p{L}\p{N}]/u;

export class UpdateBusinessTypeDto {
  @ApiPropertyOptional({
    example: 'Công ty trách nhiệm hữu hạn một thành viên',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Matches(NAME_START_RE, {
    message: 'Tên loại hình kinh doanh phải bắt đầu bằng chữ cái hoặc chữ số',
  })
  typeName?: string;
}
