import { Module } from '@nestjs/common';
import { FileController } from './file.controller.js';
import { FileService } from './file.service.js';
import { r2ClientProvider } from './r2-client.provider.js';

@Module({
  controllers: [FileController],
  providers: [r2ClientProvider, FileService],
  exports: [FileService],
})
export class FileModule {}
