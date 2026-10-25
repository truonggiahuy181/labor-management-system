import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseBoolPipe,
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
import {
  CreateBusinessTypeDto,
  UpdateBusinessTypeDto,
  UpdateBusinessTypeStatusDto,
} from './dto/business-type.dto.js';

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
  getAll(
    @Query('includeInactive', new DefaultValuePipe(false), ParseBoolPipe)
    includeInactive: boolean,
  ) {
    return this.businessTypeService.getAll(includeInactive);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo loại hình kinh doanh' })
  @ApiCreatedResponse({ type: BusinessTypeResponseDto })
  create(@Body() dto: CreateBusinessTypeDto) {
    return this.businessTypeService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật tên loại hình kinh doanh' })
  @ApiOkResponse({ type: BusinessTypeResponseDto })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBusinessTypeDto,
  ) {
    return this.businessTypeService.update(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái loại hình kinh doanh' })
  @ApiOkResponse({ type: BusinessTypeResponseDto })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBusinessTypeStatusDto,
  ) {
    return this.businessTypeService.updateStatus(id, dto.isActive);
  }
}
