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

export class CreateOccupationDto {
  @ApiProperty({ example: '1111', maxLength: 4 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{1,4}$/, {
    message: 'Mã nghề phải gồm từ 1 đến 4 chữ số',
  })
  occupationCode: string;

  @ApiProperty({ example: 'Trưởng ban, Phó Trưởng ban', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  occupationName: string;

  @ApiPropertyOptional({ example: 111, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  parentId?: number | null;
}
