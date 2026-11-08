import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RoleCode } from '../../commons/constants/role-codes.js';
import { Roles } from '../../commons/decorators/roles.decorator.js';
import { AccidentCauseService } from './accident-cause.service.js';
import { AccidentCauseQueryDto } from './dto/accident-cause-query.dto.js';
import { AccidentCauseResponseDto } from './dto/accident-cause-response.dto.js';

@ApiTags('Accident Causes – Nguyên nhân tai nạn lao động')
@ApiBearerAuth()
@Roles(RoleCode.ADMIN, RoleCode.ENTERPRISE_USER)
@Controller('accident-causes')
export class AccidentCauseController {
  constructor(private readonly service: AccidentCauseService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh mục nguyên nhân tai nạn lao động' })
  @ApiOkResponse({ type: AccidentCauseResponseDto, isArray: true })
  getAll(@Query() query: AccidentCauseQueryDto = {}) {
    return this.service.getAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy nguyên nhân tai nạn lao động theo ID' })
  @ApiOkResponse({ type: AccidentCauseResponseDto })
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.service.getById(id);
  }
}
