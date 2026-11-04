import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { parseBooleanQueryParam } from '../../../commons/transforms/query.transform.js';

export class InjuryFactorQueryDto {
  @ApiPropertyOptional({
    example: 'Mã 1',
    description: 'Tìm gần đúng theo mã yếu tố',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  factorCode?: string;

  @ApiPropertyOptional({
    example: 'Điện',
    description: 'Tìm gần đúng theo tên yếu tố gây chấn thương',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  factorName?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(parseBooleanQueryParam)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    default: false,
    description: 'Lấy cả bản ghi inactive khi chưa truyền isActive',
  })
  @IsOptional()
  @Transform(parseBooleanQueryParam)
  @IsBoolean()
  includeInactive?: boolean;
}
