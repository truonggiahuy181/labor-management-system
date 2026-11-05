import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateInjuryTypeDto {
  @ApiProperty({ example: 'Chấn thương sọ não', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  injuryTypeName: string;
}
