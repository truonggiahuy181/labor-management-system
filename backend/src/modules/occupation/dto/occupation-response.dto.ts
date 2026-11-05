import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OccupationResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '1111' })
  occupationCode: string;

  @ApiProperty({ example: 'Trưởng ban, Phó Trưởng ban' })
  occupationName: string;

  @ApiProperty({ example: 4 })
  level: number;

  @ApiPropertyOptional({ example: 111, nullable: true })
  parentId: number | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2026-11-05T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-11-05T00:00:00.000Z' })
  updatedAt: Date;
}
