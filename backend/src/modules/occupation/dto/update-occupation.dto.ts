import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const NAME_START_RE = /^[\p{L}\p{N}]/u;

export class UpdateOccupationDto {
  @ApiProperty({ example: 'Trưởng ban, Phó Trưởng ban', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Matches(NAME_START_RE, {
    message: 'Tên nghề nghiệp phải bắt đầu bằng chữ cái hoặc chữ số',
  })
  occupationName: string;
}
