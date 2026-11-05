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
import { CreateInjuryTypeDto } from './dto/create-injury-type.dto.js';
import { InjuryTypeQueryDto } from './dto/injury-type-query.dto.js';
import { InjuryTypeResponseDto } from './dto/injury-type-response.dto.js';
import { UpdateInjuryTypeStatusDto } from './dto/update-injury-type-status.dto.js';
import { UpdateInjuryTypeDto } from './dto/update-injury-type.dto.js';
import { InjuryTypeService } from './injury-type.service.js';

@ApiTags('Injury Types – Loại chấn thương')
@ApiBearerAuth()
@Controller('injury-types')
export class InjuryTypeController {
  constructor(private readonly injuryTypeService: InjuryTypeService) {}

  @Get()
  @Roles(RoleCode.ADMIN, RoleCode.ENTERPRISE_USER)
  @ApiOperation({ summary: 'Lấy danh sách loại chấn thương' })
  @ApiOkResponse({ type: InjuryTypeResponseDto, isArray: true })
  getAll(@Query() query: InjuryTypeQueryDto = {}) {
    return this.injuryTypeService.getAll(query);
  }

  @Get('selectable')
  @Roles(RoleCode.ADMIN, RoleCode.ENTERPRISE_USER)
  @ApiOperation({ summary: 'Lấy loại chấn thương cấp 3 đang hoạt động' })
  @ApiOkResponse({ type: InjuryTypeResponseDto, isArray: true })
  getSelectable() {
    return this.injuryTypeService.getSelectable();
  }

  @Get(':id')
  @Roles(RoleCode.ADMIN, RoleCode.ENTERPRISE_USER)
  @ApiOperation({ summary: 'Lấy chi tiết loại chấn thương theo ID' })
  @ApiOkResponse({ type: InjuryTypeResponseDto })
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.injuryTypeService.getById(id);
  }

  @Post()
  @Roles(RoleCode.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo loại chấn thương' })
  @ApiCreatedResponse({ type: InjuryTypeResponseDto })
  create(
    @Body() dto: CreateInjuryTypeDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.injuryTypeService.create(dto, user?.id);
  }

  @Patch(':id')
  @Roles(RoleCode.ADMIN)
  @ApiOperation({ summary: 'Cập nhật tên loại chấn thương' })
  @ApiOkResponse({ type: InjuryTypeResponseDto })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInjuryTypeDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.injuryTypeService.update(id, dto, user?.id);
  }

  @Patch(':id/status')
  @Roles(RoleCode.ADMIN)
  @ApiOperation({ summary: 'Cập nhật trạng thái loại chấn thương' })
  @ApiOkResponse({ type: InjuryTypeResponseDto })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInjuryTypeStatusDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.injuryTypeService.updateStatus(id, dto.isActive, user?.id);
  }

  @Delete(':id')
  @Roles(RoleCode.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa mềm loại chấn thương đã ngừng sử dụng' })
  @ApiNoContentResponse()
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.injuryTypeService.remove(id);
  }
}
