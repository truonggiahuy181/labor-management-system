import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const INDUSTRY_CODE_RE = /^[A-Z0-9][A-Z0-9_-]*$/;

export class CreateIndustryDto {
  @ApiProperty({ example: '6201', maxLength: 50 })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(INDUSTRY_CODE_RE, {
    message: 'Mã ngành chỉ gồm chữ in hoa, số, gạch dưới hoặc gạch ngang',
  })
  industryCode: string;

  @ApiProperty({ example: 'Lập trình máy vi tính', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  industryName: string;

  @ApiProperty({ example: 4, minimum: 1, maximum: 4 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4)
  level: number;

  @ApiPropertyOptional({ example: 10, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  parentId?: number | null;
}
