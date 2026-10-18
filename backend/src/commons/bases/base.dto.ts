import { IsOptional, IsInt, IsPositive, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetAllDto {
  @ApiPropertyOptional({ description: 'Số trang', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageNumber?: number = 1;

  @ApiPropertyOptional({ description: 'Số bản ghi mỗi trang', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  pageSize?: number = 10;

  @ApiPropertyOptional({ description: 'Các trường cần lấy (select)' })
  @IsOptional()
  select?: string[];

  @ApiPropertyOptional({ description: 'Các quan hệ cần load (relations)' })
  @IsOptional()
  relations?: string[];
}
