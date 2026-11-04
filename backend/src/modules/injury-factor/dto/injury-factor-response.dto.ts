import { ApiProperty } from '@nestjs/swagger';

export class InjuryFactorResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Mã 1' })
  factorCode: string;

  @ApiProperty({ example: 'Điện' })
  factorName: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  updatedAt: Date;
}
