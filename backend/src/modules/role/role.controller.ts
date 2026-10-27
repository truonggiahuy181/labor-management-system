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
  ApiTags,
} from '@nestjs/swagger';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { RoleQueryDto } from './dto/role-query.dto.js';
import { RoleResponseDto } from './dto/role-response.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
import { UpdateRoleStatusDto } from './dto/update-role-status.dto.js';
import { RoleService } from './role.service.js';
import { Roles } from '../../commons/decorators/roles.decorator.js';
import { RoleCode } from '../../commons/constants/role-codes.js';

@ApiTags('Roles – Vai trò')
@ApiBearerAuth()
@Roles(RoleCode.ADMIN)
@Controller('roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách vai trò' })
  @ApiOkResponse({ type: RoleResponseDto, isArray: true })
  getAll(@Query() query: RoleQueryDto = {}) {
    return this.roleService.getAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết vai trò theo ID' })
  @ApiOkResponse({ type: RoleResponseDto })
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.roleService.getById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo vai trò' })
  @ApiCreatedResponse({ type: RoleResponseDto })
  create(@Body() dto: CreateRoleDto) {
    return this.roleService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật tên vai trò' })
  @ApiOkResponse({ type: RoleResponseDto })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRoleDto) {
    return this.roleService.update(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái vai trò' })
  @ApiOkResponse({ type: RoleResponseDto })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleStatusDto,
  ) {
    return this.roleService.updateStatus(id, dto.isActive);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Xóa mềm vai trò đã ngừng sử dụng và chưa được gán cho người dùng chưa bị xóa',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.roleService.remove(id);
  }
}
