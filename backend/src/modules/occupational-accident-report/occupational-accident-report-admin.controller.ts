import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RoleCode } from '../../commons/constants/role-codes.js';
import { CurrentUser } from '../../commons/decorators/current-user.decorator.js';
import { Roles } from '../../commons/decorators/roles.decorator.js';
import { AdminOccupationalAccidentReportQueryDto } from './dto/admin-occupational-accident-report-query.dto.js';
import { ReturnOccupationalAccidentReportDto } from './dto/return-occupational-accident-report.dto.js';
import { OccupationalAccidentReportService } from './occupational-accident-report.service.js';

@ApiTags('Admin – Tiếp nhận báo cáo định kỳ TNLĐ')
@ApiBearerAuth()
@Roles(RoleCode.ADMIN)
@Controller('admin/occupational-accident-reports')
export class OccupationalAccidentReportAdminController {
  constructor(private readonly service: OccupationalAccidentReportService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách báo cáo doanh nghiệp đã gửi' })
  @ApiOkResponse()
  getReports(@Query() query: AdminOccupationalAccidentReportQueryDto) {
    return this.service.getAdminReports(query);
  }

  @Get('summary')
  @ApiOperation({
    summary: 'Tổng hợp các báo cáo tai nạn lao động đã tiếp nhận',
  })
  @ApiOkResponse()
  getSummary(@Query() query: AdminOccupationalAccidentReportQueryDto) {
    return this.service.getAdminSummary(query);
  }

  @Get(':id/overview')
  @ApiOperation({ summary: 'Số liệu tổng hợp của báo cáo để thẩm định' })
  @ApiOkResponse()
  getOverview(@Param('id', ParseIntPipe) id: number) {
    return this.service.getAdminOverview(id);
  }

  @Get(':id/signed-document/access-url')
  @ApiOperation({ summary: 'Lấy đường dẫn xem bản báo cáo PDF đã ký' })
  @ApiOkResponse()
  getSignedDocumentAccess(@Param('id', ParseIntPipe) id: number) {
    return this.service.getAdminSignedDocumentAccess(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết báo cáo và lịch sử xử lý' })
  @ApiOkResponse()
  getReport(@Param('id', ParseIntPipe) id: number) {
    return this.service.getAdminReport(id);
  }

  @Post(':id/receive')
  @ApiOperation({ summary: 'Tiếp nhận báo cáo đã gửi' })
  @ApiOkResponse()
  receive(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.receiveReport(user.id, id);
  }

  @Post(':id/return')
  @ApiOperation({ summary: 'Trả báo cáo cho doanh nghiệp bổ sung' })
  @ApiOkResponse()
  returnReport(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReturnOccupationalAccidentReportDto,
  ) {
    return this.service.returnReport(user.id, id, dto.reason);
  }
}
