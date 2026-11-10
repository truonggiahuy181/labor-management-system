import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const NAME_START_RE = /^[\p{L}\p{N}]/u;

export class UpdateIndustryDto {
  @ApiPropertyOptional({ example: 'Lập trình máy vi tính', maxLength: 255 })
  @IsOptional()
  @IsString({ message: 'Tên ngành nghề phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Tên ngành nghề không được để trống' })
  @MaxLength(255, {
    message: 'Tên ngành nghề không được vượt quá 255 ký tự',
  })
  @Matches(NAME_START_RE, {
    message: 'Tên ngành nghề phải bắt đầu bằng chữ cái hoặc chữ số',
  })
  industryName?: string;

  @ApiPropertyOptional({ example: 10, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  parentId?: number | null;
}
