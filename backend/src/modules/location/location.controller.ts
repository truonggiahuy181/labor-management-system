import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../commons/decorators/public.decorator.js';
import {
  ProvinceResponseDto,
  WardResponseDto,
} from './dto/location-response.dto.js';
import { ProvinceCodeParamDto } from './dto/province-code-param.dto.js';
import { LocationService } from './location.service.js';

@Public()
@ApiTags('Locations – Địa giới hành chính')
@Controller('locations')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Get('provinces')
  @ApiOperation({ summary: 'Lấy danh sách tỉnh/thành phố đang sử dụng' })
  @ApiOkResponse({ type: ProvinceResponseDto, isArray: true })
  getProvinces() {
    return this.locationService.getProvinces();
  }

  @Get('provinces/:provinceCode/wards')
  @ApiOperation({ summary: 'Lấy danh sách phường/xã theo mã tỉnh' })
  @ApiOkResponse({ type: WardResponseDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Không tìm thấy tỉnh/thành phố' })
  getWards(@Param() params: ProvinceCodeParamDto) {
    return this.locationService.getWards(params.provinceCode);
  }
}
