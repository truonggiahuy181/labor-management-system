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
import { CreateOccupationDto } from './dto/create-occupation.dto.js';
import { OccupationQueryDto } from './dto/occupation-query.dto.js';
import { OccupationResponseDto } from './dto/occupation-response.dto.js';
import { UpdateOccupationStatusDto } from './dto/update-occupation-status.dto.js';
import { UpdateOccupationDto } from './dto/update-occupation.dto.js';
import { OccupationService } from './occupation.service.js';

@ApiTags('Occupations – Danh mục nghề nghiệp')
@ApiBearerAuth()
@Controller('occupations')
export class OccupationController {
  constructor(private readonly occupationService: OccupationService) {}

  @Get()
  @Roles(RoleCode.ADMIN, RoleCode.ENTERPRISE_USER)
  @ApiOperation({ summary: 'Lấy danh sách nghề nghiệp' })
  @ApiOkResponse({ type: OccupationResponseDto, isArray: true })
  getAll(@Query() query: OccupationQueryDto = {}) {
    return this.occupationService.getAll(query);
  }

  @Get('selectable')
  @Roles(RoleCode.ADMIN, RoleCode.ENTERPRISE_USER)
  @ApiOperation({ summary: 'Lấy nghề nghiệp cấp 4 đang hoạt động' })
  @ApiOkResponse({ type: OccupationResponseDto, isArray: true })
  getSelectable() {
    return this.occupationService.getSelectable();
  }

  @Get(':id')
  @Roles(RoleCode.ADMIN, RoleCode.ENTERPRISE_USER)
  @ApiOperation({ summary: 'Lấy chi tiết nghề nghiệp theo ID' })
  @ApiOkResponse({ type: OccupationResponseDto })
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.occupationService.getById(id);
  }

  @Post()
  @Roles(RoleCode.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo nghề nghiệp' })
  @ApiCreatedResponse({ type: OccupationResponseDto })
  create(
    @Body() dto: CreateOccupationDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.occupationService.create(dto, user?.id);
  }

  @Patch(':id')
  @Roles(RoleCode.ADMIN)
  @ApiOperation({ summary: 'Cập nhật tên nghề nghiệp' })
  @ApiOkResponse({ type: OccupationResponseDto })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOccupationDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.occupationService.update(id, dto, user?.id);
  }

  @Patch(':id/status')
  @Roles(RoleCode.ADMIN)
  @ApiOperation({ summary: 'Cập nhật trạng thái nghề nghiệp' })
  @ApiOkResponse({ type: OccupationResponseDto })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOccupationStatusDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.occupationService.updateStatus(id, dto.isActive, user?.id);
  }

  @Delete(':id')
  @Roles(RoleCode.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa mềm nghề nghiệp đã ngừng sử dụng' })
  @ApiNoContentResponse()
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.occupationService.remove(id);
  }
}
