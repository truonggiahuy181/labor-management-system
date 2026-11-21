import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class ReviewReportVersionDto {
  @ApiPropertyOptional({
    minimum: 1,
    description: 'Phiên bản đã được rà soát.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;
}
