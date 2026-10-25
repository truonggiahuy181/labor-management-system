import { ApiProperty } from '@nestjs/swagger';

export class BusinessTypeResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'TNHH1' })
  typeCode: string;

  @ApiProperty({ example: 'Công ty TNHH một thành viên' })
  typeName: string;

  @ApiProperty({ example: true })
  isActive: boolean;
}
