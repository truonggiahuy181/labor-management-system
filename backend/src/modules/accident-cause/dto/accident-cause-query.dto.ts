import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { parseBooleanQueryParam } from '../../../commons/transforms/query.transform.js';
import { AccidentCauseGroup } from '../accident-cause.constants.js';

export class AccidentCauseQueryDto {
  @ApiPropertyOptional({ enum: Object.values(AccidentCauseGroup) })
  @IsOptional()
  @IsEnum(AccidentCauseGroup)
  causeGroup?: AccidentCauseGroup;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(parseBooleanQueryParam)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(parseBooleanQueryParam)
  @IsBoolean()
  includeInactive?: boolean;
}
