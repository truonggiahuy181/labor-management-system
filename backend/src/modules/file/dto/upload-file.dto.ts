import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { DIRECT_FILE_UPLOAD_FOLDERS } from '../file.constants.js';
import type { FileUploadFolder } from '../file.constants.js';

export class UploadFileDto {
  @ApiProperty({
    enum: DIRECT_FILE_UPLOAD_FOLDERS,
    example: 'avatars',
    description: 'avatars/logos nhận ảnh; documents nhận PDF, Word hoặc Excel',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(DIRECT_FILE_UPLOAD_FOLDERS)
  folder: FileUploadFolder;
}
