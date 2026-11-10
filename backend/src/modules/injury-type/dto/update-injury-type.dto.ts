import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const NAME_START_RE = /^[\p{L}\p{N}]/u;

export class UpdateInjuryTypeDto {
  @ApiProperty({ example: 'Chấn thương sọ não', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Matches(NAME_START_RE, {
    message: 'Tên loại chấn thương phải bắt đầu bằng chữ cái hoặc chữ số',
  })
  injuryTypeName: string;
}
