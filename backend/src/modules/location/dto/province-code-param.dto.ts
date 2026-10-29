import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class ProvinceCodeParamDto {
  @ApiProperty({ example: '79' })
  @IsString()
  @Matches(/^\d{2}$/, {
    message: 'Mã tỉnh/thành phố phải gồm đúng 2 chữ số',
  })
  provinceCode: string;
}
