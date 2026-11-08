import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ReturnOccupationalAccidentReportDto {
  @ApiProperty({
    example: 'Số liệu người bị thương nặng chưa khớp với chi tiết vụ tai nạn.',
    minLength: 10,
    maxLength: 1000,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  reason: string;
}
