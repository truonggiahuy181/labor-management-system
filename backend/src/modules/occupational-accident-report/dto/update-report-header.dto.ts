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
  @Min(1, { message: 'Tổng số lao động phải lớn hơn 0.' })
  @Max(2_147_483_647)
  totalEmployees: number;

  @ApiProperty({ example: 50 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  femaleEmployees: number;

  @ApiProperty({ example: '1200000000', description: 'Số tiền VND lớn hơn 0' })
  @IsString()
  @MaxLength(19)
  @Matches(/^(?=.*[1-9])\d{1,19}$/, {
    message: 'Tổng quỹ lương phải là số nguyên lớn hơn 0.',
  })
  payrollFundVnd: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  noAccidentsDeclared: boolean;
}
