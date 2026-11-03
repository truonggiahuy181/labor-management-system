import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, Min } from 'class-validator';

export const ENTERPRISE_FILE_TYPES = [
  'businessLicense',
  'otherDocument',
] as const;

export type EnterpriseFileType = (typeof ENTERPRISE_FILE_TYPES)[number];

export class EnterpriseFileParamDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id: number;

  @ApiProperty({ enum: ENTERPRISE_FILE_TYPES })
  @IsIn(ENTERPRISE_FILE_TYPES)
  fileType: EnterpriseFileType;
}

export class MyEnterpriseFileParamDto {
  @ApiProperty({ enum: ENTERPRISE_FILE_TYPES })
  @IsIn(ENTERPRISE_FILE_TYPES)
  fileType: EnterpriseFileType;
}
