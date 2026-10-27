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
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { BusinessTypeService } from './business-type.service.js';
import { BusinessTypeResponseDto } from './dto/business-type-response.dto.js';
import { BusinessTypeQueryDto } from './dto/business-type-query.dto.js';
import { CreateBusinessTypeDto } from './dto/create-business-type.dto.js';
import { UpdateBusinessTypeDto } from './dto/update-business-type.dto.js';
import { UpdateBusinessTypeStatusDto } from './dto/update-business-type-status.dto.js';
import { Roles } from '../../commons/decorators/roles.decorator.js';
import { RoleCode } from '../../commons/constants/role-codes.js';

@ApiTags('Business Types – Loại hình kinh doanh')
@ApiBearerAuth()
@Controller('business-types')
export class BusinessTypeController {
  constructor(private readonly businessTypeService: BusinessTypeService) {}

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách loại hình kinh doanh đang hoạt động',
  })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Đặt true để lấy cả loại hình đã ngừng sử dụng',
  })
  @ApiOkResponse({ type: BusinessTypeResponseDto, isArray: true })
  getAll(@Query() query: BusinessTypeQueryDto = {}) {
    return this.businessTypeService.getAll(query);
  }

  @Post()
  @Roles(RoleCode.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo loại hình kinh doanh' })
  @ApiCreatedResponse({ type: BusinessTypeResponseDto })
  create(@Body() dto: CreateBusinessTypeDto) {
    return this.businessTypeService.create(dto);
  }

  @Patch(':id')
  @Roles(RoleCode.ADMIN)
  @ApiOperation({ summary: 'Cập nhật tên loại hình kinh doanh' })
  @ApiOkResponse({ type: BusinessTypeResponseDto })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBusinessTypeDto,
  ) {
    return this.businessTypeService.update(id, dto);
  }

  @Patch(':id/status')
  @Roles(RoleCode.ADMIN)
  @ApiOperation({ summary: 'Cập nhật trạng thái loại hình kinh doanh' })
  @ApiOkResponse({ type: BusinessTypeResponseDto })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBusinessTypeStatusDto,
  ) {
    return this.businessTypeService.updateStatus(id, dto.isActive);
  }

  @Delete(':id')
  @Roles(RoleCode.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Xóa loại hình kinh doanh đã ngừng sử dụng và chưa được doanh nghiệp sử dụng',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.businessTypeService.remove(id);
  }
}
