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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../commons/decorators/current-user.decorator.js';
import {
  CreateEnterpriseDto,
  UpdateEnterpriseDto,
  UpdateEnterpriseStatusDto,
} from './dto/enterprise.dto.js';
import { EnterpriseService } from './enterprise.service.js';

@ApiTags('Enterprises – Quản lý doanh nghiệp')
@ApiBearerAuth()
@Controller('enterprises')
export class EnterpriseController {
  constructor(private readonly enterpriseService: EnterpriseService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách doanh nghiệp' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách doanh nghiệp thành công.' })
  getAll() {
    return this.enterpriseService.getAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết doanh nghiệp theo ID' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 404, description: 'Không tìm thấy doanh nghiệp.' })
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.enterpriseService.getById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Tạo doanh nghiệp',
    description: 'Ngành nghề kinh doanh phải là mã ngành cấp 4 gồm đúng 4 chữ số.',
  })
  @ApiResponse({ status: 201, description: 'Tạo doanh nghiệp thành công.' })
  @ApiResponse({ status: 409, description: 'Mã số thuế đã tồn tại.' })
  create(
    @Body() dto: CreateEnterpriseDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.enterpriseService.create(dto, user?.id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Cập nhật doanh nghiệp',
    description: 'Nếu thay đổi ngành nghề kinh doanh, chỉ chấp nhận mã ngành cấp 4.',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEnterpriseDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.enterpriseService.update(id, dto, user?.id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái hoạt động của doanh nghiệp' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEnterpriseStatusDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.enterpriseService.updateStatus(id, dto.isActive, user?.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa mềm doanh nghiệp' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.enterpriseService.remove(id);
  }
}
