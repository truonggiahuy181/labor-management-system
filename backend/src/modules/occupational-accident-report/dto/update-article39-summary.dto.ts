import { Type } from 'class-transformer';
import { IsInt, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const MONEY_PATTERN = /^\d{1,19}$/;

export class UpdateArticle39SummaryDto {
  @ApiProperty({ example: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  totalCases: number;

  @ApiProperty({ example: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  fatalCases: number;

  @ApiProperty({ example: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  multiVictimCases: number;

  @ApiProperty({ example: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  victimCount: number;

  @ApiProperty({ example: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  femaleCount: number;

  @ApiProperty({ example: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  deathCount: number;

  @ApiProperty({ example: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  severeCount: number;

  @ApiProperty({ example: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  unmanagedVictimCount: number;

  @ApiProperty({ example: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  unmanagedFemaleCount: number;

  @ApiProperty({ example: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  unmanagedDeathCount: number;

  @ApiProperty({ example: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  unmanagedSevereCount: number;

  @ApiProperty({ example: '0' })
  @IsString()
  @MaxLength(19)
  @Matches(MONEY_PATTERN)
  medicalCostVnd: string;

  @ApiProperty({ example: '0' })
  @IsString()
  @MaxLength(19)
  @Matches(MONEY_PATTERN)
  salaryCostVnd: string;

  @ApiProperty({ example: '0' })
  @IsString()
  @MaxLength(19)
  @Matches(MONEY_PATTERN)
  compensationCostVnd: string;

  @ApiProperty({ example: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  lostWorkDays: number;

  @ApiProperty({ example: '0' })
  @IsString()
  @MaxLength(19)
  @Matches(MONEY_PATTERN)
  propertyDamageVnd: string;
}
