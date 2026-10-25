import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { IndustryService } from './industry.service.js';
import { IndustryResponseDto } from './dto/industry-response.dto.js';

@ApiTags('Industries – Ngành nghề kinh doanh')
@ApiBearerAuth()
@Controller('industries')
export class IndustryController {
  constructor(private readonly industryService: IndustryService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách ngành nghề cấp 4' })
  @ApiOkResponse({ type: IndustryResponseDto, isArray: true })
  getAll() {
    return this.industryService.getAllLevelFour();
  }
}
