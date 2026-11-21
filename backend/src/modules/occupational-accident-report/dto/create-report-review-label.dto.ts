import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { normalizeReviewLabel } from '../report-review-flags.js';

export class CreateReportReviewLabelDto {
  @ApiProperty({
    minLength: 2,
    maxLength: 100,
    example: 'Thiếu số liệu quý III',
  })
  @Transform(({ value }) => normalizeReviewLabel(value))
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/^[^\u0000-\u001f\u007f]+$/u)
  label: string;
}
