import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../commons/decorators/current-user.decorator.js';
import { Public } from '../../commons/decorators/public.decorator.js';
import { FileAccessQueryDto } from './dto/file-access-query.dto.js';
import { UploadFileDto } from './dto/upload-file.dto.js';
import { MAX_UPLOAD_FILE_SIZE } from './file.constants.js';
import { FileService } from './file.service.js';
import type { AuthenticatedFileUser, MultipartFile } from './file.types.js';

@ApiTags('Files – Lưu trữ Cloudflare R2')
@ApiBearerAuth()
@Controller('files')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Header('Cache-Control', 'no-store')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_UPLOAD_FILE_SIZE },
    }),
  )
  @ApiOperation({ summary: 'Tải một ảnh hoặc tài liệu lên Cloudflare R2' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'folder'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Ảnh tối đa 5 MB; tài liệu tối đa 10 MB',
        },
        folder: {
          type: 'string',
          enum: ['avatars', 'logos', 'documents'],
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Tải tệp lên R2 thành công.' })
  @ApiResponse({ status: 400, description: 'Tệp hoặc thư mục không hợp lệ.' })
  @ApiResponse({ status: 413, description: 'Tệp vượt quá giới hạn.' })
  upload(
    @UploadedFile() file: MultipartFile | undefined,
    @Body() dto: UploadFileDto,
    @CurrentUser() user: AuthenticatedFileUser,
  ) {
    return this.fileService.upload(file, dto.folder, user.id);
  }

  @Get('access-url')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Lấy URL public của ảnh hoặc URL tạm thời của tài liệu R2',
  })
  @ApiResponse({ status: 200, description: 'Tạo presigned URL thành công.' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập tệp.' })
  getAccessUrl(
    @Query() query: FileAccessQueryDto,
    @CurrentUser() user: AuthenticatedFileUser,
  ) {
    return this.fileService.getAccessUrl(query.objectKey, user);
  }

  @Public()
  @Post('public-document')
  @HttpCode(HttpStatus.CREATED)
  @Header('Cache-Control', 'no-store')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_UPLOAD_FILE_SIZE },
    }),
  )
  @ApiOperation({
    summary: 'Tải giấy tờ/tài liệu công khai khi đăng ký doanh nghiệp',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Tài liệu tối đa 10 MB (.pdf, .doc, .docx, .xls, .xlsx)',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Tải tài liệu công khai thành công.' })
  @ApiResponse({ status: 400, description: 'Tệp không hợp lệ.' })
  @ApiResponse({ status: 413, description: 'Tệp vượt quá giới hạn.' })
  uploadPublicDocument(@UploadedFile() file: MultipartFile | undefined) {
    return this.fileService.upload(file, 'documents', 0);
  }

  @Public()
  @Get('public-access-url')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Lấy URL xem trước tài liệu công khai khi đăng ký doanh nghiệp',
  })
  @ApiResponse({ status: 200, description: 'Tạo presigned URL thành công.' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập tệp.' })
  getPublicAccessUrl(@Query() query: FileAccessQueryDto) {
    return this.fileService.getPublicDocumentAccessUrl(query.objectKey);
  }
}
