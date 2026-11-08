import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateReportHeaderDto {
  @ApiProperty({ example: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  totalEmployees: number;

  @ApiProperty({ example: 50 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  femaleEmployees: number;

  @ApiProperty({ example: '1200000000', description: 'Số tiền VND' })
  @IsString()
  @MaxLength(19)
  @Matches(/^\d{1,19}$/)
  payrollFundVnd: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  noAccidentsDeclared: boolean;
}
