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
import { IndustryResponseDto } from './dto/industry-response.dto.js';
import { CreateIndustryDto } from './dto/create-industry.dto.js';
import { IndustryQueryDto } from './dto/industry-query.dto.js';
import { UpdateIndustryDto } from './dto/update-industry.dto.js';
import { UpdateIndustryStatusDto } from './dto/update-industry-status.dto.js';
import { IndustryService } from './industry.service.js';
import { Roles } from '../../commons/decorators/roles.decorator.js';
import { RoleCode } from '../../commons/constants/role-codes.js';

@ApiTags('Industries – Ngành nghề kinh doanh')
@ApiBearerAuth()
@Controller('industries')
export class IndustryController {
  constructor(private readonly industryService: IndustryService) {}

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách ngành nghề đang hoạt động',
    description:
      'Dùng level=1..4 để lọc theo cấp và includeInactive=true để lấy cả ngành đã ngừng sử dụng.',
  })
  @ApiOkResponse({ type: IndustryResponseDto, isArray: true })
  getAll(@Query() query: IndustryQueryDto) {
    return this.industryService.getAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết ngành nghề theo ID' })
  @ApiOkResponse({ type: IndustryResponseDto })
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.industryService.getById(id);
  }

  @Post()
  @Roles(RoleCode.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo ngành nghề' })
  @ApiCreatedResponse({ type: IndustryResponseDto })
  create(@Body() dto: CreateIndustryDto) {
    return this.industryService.create(dto);
  }

  @Patch(':id')
  @Roles(RoleCode.ADMIN)
  @ApiOperation({ summary: 'Cập nhật ngành nghề' })
  @ApiOkResponse({ type: IndustryResponseDto })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateIndustryDto,
  ) {
    return this.industryService.update(id, dto);
  }

  @Patch(':id/status')
  @Roles(RoleCode.ADMIN)
  @ApiOperation({ summary: 'Cập nhật trạng thái ngành nghề' })
  @ApiOkResponse({ type: IndustryResponseDto })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateIndustryStatusDto,
  ) {
    return this.industryService.updateStatus(id, dto.isActive);
  }

  @Delete(':id')
  @Roles(RoleCode.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Xóa mềm ngành nghề đã ngừng sử dụng, chưa được dùng và không có ngành con chưa bị xóa',
  })
  @ApiNoContentResponse()
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.industryService.remove(id);
  }
}
