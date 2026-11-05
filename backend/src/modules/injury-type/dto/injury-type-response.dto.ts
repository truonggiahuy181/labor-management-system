import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InjuryTypeResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '110' })
  injuryTypeCode: string;

  @ApiProperty({ example: 'Chấn thương sọ não' })
  injuryTypeName: string;

  @ApiProperty({ example: 3 })
  level: number;

  @ApiPropertyOptional({ example: 11, nullable: true })
  parentId: number | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2026-11-05T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-11-05T00:00:00.000Z' })
  updatedAt: Date;
}
