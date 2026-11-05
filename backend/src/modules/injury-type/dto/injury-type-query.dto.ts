import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { parseBooleanQueryParam } from '../../../commons/transforms/query.transform.js';

export class InjuryTypeQueryDto {
  @ApiPropertyOptional({ example: '11' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  @Matches(/^\d{1,3}$/)
  injuryTypeCode?: string;

  @ApiPropertyOptional({ example: 'sọ não' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  injuryTypeName?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3)
  level?: number;

  @ApiPropertyOptional({ example: 10, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  parentId?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(parseBooleanQueryParam)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(parseBooleanQueryParam)
  @IsBoolean()
  includeInactive?: boolean;
}
