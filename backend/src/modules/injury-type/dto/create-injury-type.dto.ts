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
  @ApiProperty({
    example: '0',
    minLength: 1,
    maxLength: 1,
    description:
      'Một chữ số cuối của mã. Backend tự ghép với mã nhóm cha và tự xác định cấp.',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d$/, {
    message: 'Phần mã loại chấn thương phải gồm đúng 1 chữ số',
  })
  codeSegment: string;

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
