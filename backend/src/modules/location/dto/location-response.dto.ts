import { ApiProperty } from '@nestjs/swagger';

export class ProvinceResponseDto {
  @ApiProperty({ example: '79' })
  code: string;

  @ApiProperty({ example: 'Thành phố Hồ Chí Minh' })
  name: string;

  @ApiProperty({ example: 'thành phố trung ương' })
  divisionType: string;
}

export class WardResponseDto {
  @ApiProperty({ example: '26740' })
  code: string;

  @ApiProperty({ example: '79' })
  provinceCode: string;

  @ApiProperty({ example: 'Phường Bà Rịa' })
  name: string;

  @ApiProperty({ example: 'phường' })
  divisionType: string;
}
