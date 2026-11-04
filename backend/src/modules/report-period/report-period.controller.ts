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
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RoleCode } from '../../commons/constants/role-codes.js';
import { CurrentUser } from '../../commons/decorators/current-user.decorator.js';
import { Roles } from '../../commons/decorators/roles.decorator.js';
import { CreateReportPeriodDto } from './dto/create-report-period.dto.js';
import { ReportPeriodQueryDto } from './dto/report-period-query.dto.js';
import { ReportPeriodResponseDto } from './dto/report-period-response.dto.js';
import { UpdateReportPeriodStatusDto } from './dto/update-report-period-status.dto.js';
import { UpdateReportPeriodDto } from './dto/update-report-period.dto.js';
import { ReportPeriodService } from './report-period.service.js';

@ApiTags('Report Periods – Quản lý kỳ báo cáo')
@ApiBearerAuth()
@Roles(RoleCode.ADMIN)
@Controller('report-periods')
export class ReportPeriodController {
  constructor(private readonly reportPeriodService: ReportPeriodService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách và lọc kỳ báo cáo' })
  @ApiOkResponse({ type: ReportPeriodResponseDto, isArray: true })
  getAll(@Query() query: ReportPeriodQueryDto = {}) {
    return this.reportPeriodService.getAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết kỳ báo cáo theo ID' })
  @ApiOkResponse({ type: ReportPeriodResponseDto })
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.reportPeriodService.getById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo kỳ báo cáo' })
  @ApiCreatedResponse({ type: ReportPeriodResponseDto })
  create(
    @Body() dto: CreateReportPeriodDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.reportPeriodService.create(dto, user?.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật kỳ báo cáo' })
  @ApiOkResponse({ type: ReportPeriodResponseDto })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReportPeriodDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.reportPeriodService.update(id, dto, user?.id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái kỳ báo cáo' })
  @ApiOkResponse({ type: ReportPeriodResponseDto })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReportPeriodStatusDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.reportPeriodService.updateStatus(id, dto.isActive, user?.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Xóa mềm kỳ báo cáo đã ngừng hoạt động',
  })
  @ApiNoContentResponse()
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.reportPeriodService.remove(id);
  }
}
