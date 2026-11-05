import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateOccupationDto {
  @ApiProperty({ example: 'Trưởng ban, Phó Trưởng ban', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  occupationName: string;
}
