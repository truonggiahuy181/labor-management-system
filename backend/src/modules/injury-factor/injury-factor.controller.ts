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
import { CreateInjuryFactorDto } from './dto/create-injury-factor.dto.js';
import { InjuryFactorQueryDto } from './dto/injury-factor-query.dto.js';
import { InjuryFactorResponseDto } from './dto/injury-factor-response.dto.js';
import { UpdateInjuryFactorStatusDto } from './dto/update-injury-factor-status.dto.js';
import { UpdateInjuryFactorDto } from './dto/update-injury-factor.dto.js';
import { InjuryFactorService } from './injury-factor.service.js';

@ApiTags('Injury Factors – Yếu tố gây chấn thương')
@ApiBearerAuth()
@Controller('injury-factors')
export class InjuryFactorController {
  constructor(private readonly injuryFactorService: InjuryFactorService) {}

  @Get()
  @Roles(RoleCode.ADMIN, RoleCode.ENTERPRISE_USER)
  @ApiOperation({ summary: 'Lấy danh sách và lọc yếu tố gây chấn thương' })
  @ApiOkResponse({ type: InjuryFactorResponseDto, isArray: true })
  getAll(@Query() query: InjuryFactorQueryDto = {}) {
    return this.injuryFactorService.getAll(query);
  }

  @Get(':id')
  @Roles(RoleCode.ADMIN, RoleCode.ENTERPRISE_USER)
  @ApiOperation({ summary: 'Lấy chi tiết yếu tố gây chấn thương theo ID' })
  @ApiOkResponse({ type: InjuryFactorResponseDto })
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.injuryFactorService.getById(id);
  }

  @Post()
  @Roles(RoleCode.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo yếu tố gây chấn thương' })
  @ApiCreatedResponse({ type: InjuryFactorResponseDto })
  create(
    @Body() dto: CreateInjuryFactorDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.injuryFactorService.create(dto, user?.id);
  }

  @Patch(':id')
  @Roles(RoleCode.ADMIN)
  @ApiOperation({ summary: 'Cập nhật yếu tố gây chấn thương' })
  @ApiOkResponse({ type: InjuryFactorResponseDto })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInjuryFactorDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.injuryFactorService.update(id, dto, user?.id);
  }

  @Patch(':id/status')
  @Roles(RoleCode.ADMIN)
  @ApiOperation({ summary: 'Cập nhật trạng thái yếu tố gây chấn thương' })
  @ApiOkResponse({ type: InjuryFactorResponseDto })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInjuryFactorStatusDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.injuryFactorService.updateStatus(id, dto.isActive, user?.id);
  }

  @Delete(':id')
  @Roles(RoleCode.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa mềm yếu tố đã ngừng sử dụng' })
  @ApiNoContentResponse()
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.injuryFactorService.remove(id);
  }
}
