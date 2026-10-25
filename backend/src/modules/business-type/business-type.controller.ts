import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { BusinessTypeService } from './business-type.service.js';
import { BusinessTypeResponseDto } from './dto/business-type-response.dto.js';

@ApiTags('Business Types – Loại hình kinh doanh')
@ApiBearerAuth()
@Controller('business-types')
export class BusinessTypeController {
  constructor(private readonly businessTypeService: BusinessTypeService) {}

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách loại hình kinh doanh đang hoạt động',
  })
  @ApiOkResponse({ type: BusinessTypeResponseDto, isArray: true })
  getAll() {
    return this.businessTypeService.getAllActive();
  }
}
