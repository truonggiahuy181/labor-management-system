import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiBody,
  ApiConsumes,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RoleCode } from '../../commons/constants/role-codes.js';
import { CurrentUser } from '../../commons/decorators/current-user.decorator.js';
import { Roles } from '../../commons/decorators/roles.decorator.js';
import { MAX_DOCUMENT_FILE_SIZE } from '../file/file.constants.js';
import type { MultipartFile } from '../file/file.types.js';
import { CreateOccupationalAccidentReportDto } from './dto/create-occupational-accident-report.dto.js';
import { OccupationalAccidentReportQueryDto } from './dto/occupational-accident-report-query.dto.js';
import { SaveAccidentCaseDto } from './dto/save-accident-case.dto.js';
import { UpdateArticle39SummaryDto } from './dto/update-article39-summary.dto.js';
import { UpdateReportHeaderDto } from './dto/update-report-header.dto.js';
import { OccupationalAccidentReportService } from './occupational-accident-report.service.js';

@ApiTags('Occupational Accident Reports – Báo cáo định kỳ TNLĐ')
@ApiBearerAuth()
@Roles(RoleCode.ENTERPRISE_USER)
@Controller('occupational-accident-reports')
export class OccupationalAccidentReportController {
  constructor(private readonly service: OccupationalAccidentReportService) {}

  @Get('me')
  @ApiOperation({ summary: 'Lấy báo cáo tai nạn lao động của doanh nghiệp' })
  @ApiOkResponse()
  getMyReports(
    @CurrentUser() user: { id: number },
    @Query() query: OccupationalAccidentReportQueryDto = {},
  ) {
    return this.service.getMyReports(user.id, query);
  }

  @Post('me')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo hoặc lấy bản nháp theo kỳ báo cáo' })
  @ApiCreatedResponse()
  createDraft(
    @CurrentUser() user: { id: number },
    @Body() dto: CreateOccupationalAccidentReportDto,
  ) {
    return this.service.createDraft(user.id, dto);
  }

  @Get('me/:id/overview')
  @ApiOperation({ summary: 'Tổng hợp tự động số liệu báo cáo' })
  @ApiOkResponse()
  getOverview(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.getOverview(user.id, id);
  }

  @Get('me/:id')
  @ApiOperation({ summary: 'Lấy chi tiết báo cáo của doanh nghiệp' })
  @ApiOkResponse()
  getMyReport(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.getMyReport(user.id, id);
  }

  @Patch('me/:id/header')
  @ApiOperation({ summary: 'Cập nhật lao động, quỹ lương và khai báo số 0' })
  @ApiOkResponse()
  updateHeader(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReportHeaderDto,
  ) {
    return this.service.updateHeader(user.id, id, dto);
  }

  @Post('me/:id/cases')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Thêm vụ tai nạn vào báo cáo' })
  @ApiCreatedResponse()
  createCase(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveAccidentCaseDto,
  ) {
    return this.service.createCase(user.id, id, dto);
  }

  @Put('me/:id/cases/:caseId')
  @ApiOperation({ summary: 'Thay thế dữ liệu một vụ tai nạn' })
  @ApiOkResponse()
  updateCase(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
    @Param('caseId', ParseIntPipe) caseId: number,
    @Body() dto: SaveAccidentCaseDto,
  ) {
    return this.service.updateCase(user.id, id, caseId, dto);
  }

  @Delete('me/:id/cases/:caseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa vụ tai nạn khỏi bản nháp' })
  @ApiNoContentResponse()
  removeCase(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
    @Param('caseId', ParseIntPipe) caseId: number,
  ) {
    return this.service.removeCase(user.id, id, caseId);
  }

  @Put('me/:id/article-39-summary')
  @ApiOperation({ summary: 'Cập nhật số liệu Khoản 2 Điều 39' })
  @ApiOkResponse()
  updateArticle39Summary(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateArticle39SummaryDto,
  ) {
    return this.service.updateArticle39Summary(user.id, id, dto);
  }

  @Post('me/:id/signed-document')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_DOCUMENT_FILE_SIZE },
    }),
  )
  @ApiOperation({ summary: 'Tải lên bản báo cáo PDF đã ký, đóng dấu' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Chỉ nhận PDF, tối đa 10 MB',
        },
      },
    },
  })
  @ApiOkResponse()
  uploadSignedDocument(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: MultipartFile | undefined,
  ) {
    return this.service.uploadSignedDocument(user.id, id, file);
  }

  @Get('me/:id/signed-document/access-url')
  @ApiOperation({ summary: 'Lấy đường dẫn xem bản báo cáo đã ký' })
  @ApiOkResponse()
  getSignedDocumentAccess(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.getMySignedDocumentAccess(user.id, id);
  }

  @Delete('me/:id/signed-document')
  @ApiOperation({ summary: 'Gỡ bản báo cáo đã ký khỏi bản nháp' })
  @ApiOkResponse()
  removeSignedDocument(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.removeSignedDocument(user.id, id);
  }

  @Post('me/:id/submit')
  @ApiOperation({ summary: 'Gửi báo cáo và khóa chỉnh sửa' })
  @ApiOkResponse()
  submit(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.submit(user.id, id);
  }
}
