import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInjuryTypeDto {
  @ApiProperty({ example: '110', maxLength: 3 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{1,3}$/, {
    message: 'Mã loại chấn thương phải gồm từ 1 đến 3 chữ số',
  })
  injuryTypeCode: string;

  @ApiProperty({ example: 'Chấn thương sọ não', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  injuryTypeName: string;

  @ApiPropertyOptional({ example: 11, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  parentId?: number | null;
}
