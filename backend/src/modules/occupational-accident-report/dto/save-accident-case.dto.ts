import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AccidentVictimGroupDto } from './accident-victim-group.dto.js';

const MONEY_PATTERN = /^\d{1,19}$/;

export class SaveAccidentCaseDto {
  @ApiProperty({ example: '2026-03-15', format: 'date' })
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  accidentDate: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  accidentCauseId: number;

  @ApiProperty({ example: 4 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  injuryFactorId: number;

  @ApiProperty({ example: '1000000' })
  @IsString()
  @MaxLength(19)
  @Matches(MONEY_PATTERN)
  medicalCostVnd: string;

  @ApiProperty({ example: '2000000' })
  @IsString()
  @MaxLength(19)
  @Matches(MONEY_PATTERN)
  salaryCostVnd: string;

  @ApiProperty({ example: '3000000' })
  @IsString()
  @MaxLength(19)
  @Matches(MONEY_PATTERN)
  compensationCostVnd: string;

  @ApiProperty({ example: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  lostWorkDays: number;

  @ApiProperty({ example: '5000000' })
  @IsString()
  @MaxLength(19)
  @Matches(MONEY_PATTERN)
  propertyDamageVnd: string;

  @ApiProperty({ type: AccidentVictimGroupDto, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AccidentVictimGroupDto)
  victimGroups: AccidentVictimGroupDto[];
}
