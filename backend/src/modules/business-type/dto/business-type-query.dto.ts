import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { parseBooleanQueryParam } from '../../../commons/transforms/query.transform.js';

export class BusinessTypeQueryDto {
  @ApiPropertyOptional({
    example: 'TNHH',
    description: 'Tìm theo mã hoặc tên loại hình kinh doanh',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

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
