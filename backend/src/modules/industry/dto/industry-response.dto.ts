import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class IndustryResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '6201' })
  industryCode: string;

  @ApiProperty({ example: 'Lập trình máy vi tính' })
  industryName: string;

  @ApiProperty({ example: 4 })
  level: number;

  @ApiPropertyOptional({ example: null, nullable: true })
  parentId: number | null;

  @ApiProperty({ example: true })
  isActive: boolean;
}
