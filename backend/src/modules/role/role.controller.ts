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
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  CreateRoleDto,
  RoleResponseDto,
  UpdateRoleDto,
  UpdateRoleStatusDto,
} from './dto/role.dto.js';
import { RoleService } from './role.service.js';

@ApiTags('Roles – Vai trò')
@ApiBearerAuth()
@Controller('roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách vai trò' })
  @ApiOkResponse({ type: RoleResponseDto, isArray: true })
  getAll() {
    return this.roleService.getAll();
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
    summary: 'Xóa vai trò đã ngừng sử dụng và chưa được gán cho người dùng',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.roleService.remove(id);
  }
}
