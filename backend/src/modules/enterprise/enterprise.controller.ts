import {
  Body,
  Controller,
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
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách doanh nghiệp thành công.',
  })
  getAll() {
    return this.enterpriseService.getAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết doanh nghiệp theo ID' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, description: 'Lấy doanh nghiệp thành công.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy doanh nghiệp.' })
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.enterpriseService.getById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Tạo doanh nghiệp',
    description:
      'businessTypeId phải tham chiếu loại hình đang hoạt động; industryId phải tham chiếu ngành nghề cấp 4.',
  })
  @ApiResponse({ status: 201, description: 'Tạo doanh nghiệp thành công.' })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu hoặc danh mục không hợp lệ.',
  })
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
    description:
      'Nếu thay đổi danh mục, businessTypeId phải hợp lệ và industryId phải là ngành nghề cấp 4.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật doanh nghiệp thành công.',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu hoặc danh mục không hợp lệ.',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy doanh nghiệp.' })
  @ApiResponse({
    status: 409,
    description: 'Mã số thuế hoặc email đã tồn tại.',
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
  @ApiResponse({ status: 200, description: 'Cập nhật trạng thái thành công.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy doanh nghiệp.' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEnterpriseStatusDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.enterpriseService.updateStatus(id, dto.isActive, user?.id);
  }
}
