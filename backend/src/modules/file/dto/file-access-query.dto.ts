import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';
import { STORAGE_OBJECT_KEY_PATTERN } from '../file.constants.js';

export class FileAccessQueryDto {
  @ApiProperty({
    example:
      'documents/12/2026/10/550e8400-e29b-41d4-a716-446655440000.pdf',
  })
  @IsString()
  @Matches(STORAGE_OBJECT_KEY_PATTERN, { message: 'objectKey không hợp lệ' })
  objectKey: string;
}
