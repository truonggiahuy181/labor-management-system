import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
  Min,
} from 'class-validator';
import {
  MAX_REPORT_REVIEW_FLAGS,
  REPORT_REVIEW_FLAG_PATTERN,
  type ReportReviewFlag,
} from '../report-review-flags.js';

export class UpdateReportReviewFlagsDto {
  @ApiProperty({ type: [String], maxItems: MAX_REPORT_REVIEW_FLAGS })
  @IsArray()
  @ArrayMaxSize(MAX_REPORT_REVIEW_FLAGS)
  @ArrayUnique()
  @IsString({ each: true })
  @Matches(REPORT_REVIEW_FLAG_PATTERN, { each: true })
  flags: ReportReviewFlag[];

  @ApiPropertyOptional({
    maxLength: 500,
    description: 'Ghi chú nội bộ, không gửi doanh nghiệp.',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  version: number;
}
