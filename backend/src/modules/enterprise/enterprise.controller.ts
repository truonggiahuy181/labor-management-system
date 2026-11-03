import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../commons/decorators/current-user.decorator.js';
import { Roles } from '../../commons/decorators/roles.decorator.js';
import { RoleCode } from '../../commons/constants/role-codes.js';
import { CreateEnterpriseDto } from './dto/create-enterprise.dto.js';
import { EnterpriseQueryDto } from './dto/enterprise-query.dto.js';
import { UpdateEnterpriseDto } from './dto/update-enterprise.dto.js';
import { UpdateEnterpriseStatusDto } from './dto/update-enterprise-status.dto.js';
import { EnterpriseService } from './enterprise.service.js';
import {
  EnterpriseFileParamDto,
  MyEnterpriseFileParamDto,
} from './dto/enterprise-file-param.dto.js';
import { MAX_DOCUMENT_FILE_SIZE } from '../file/file.constants.js';
import type { MultipartFile } from '../file/file.types.js';

@ApiTags('Enterprises – Quản lý doanh nghiệp')
@ApiBearerAuth()
@Controller('enterprises')
export class EnterpriseController {
  constructor(private readonly enterpriseService: EnterpriseService) {}

  @Get('me')
  @Roles(RoleCode.ENTERPRISE_USER, RoleCode.ADMIN)
  @ApiOperation({ summary: 'Lấy thông tin doanh nghiệp của tài khoản đang đăng nhập' })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin doanh nghiệp thành công.',
  })
  @ApiResponse({ status: 404, description: 'Tài khoản không thuộc doanh nghiệp nào.' })
  getMyEnterprise(@CurrentUser() user: { id: number }) {
    return this.enterpriseService.getMyEnterprise(user.id);
  }

  @Patch('me')
  @Roles(RoleCode.ENTERPRISE_USER)
  @ApiOperation({ summary: 'Cập nhật thông tin doanh nghiệp của tài khoản đang đăng nhập' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật doanh nghiệp thành công.',
  })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy doanh nghiệp.' })
  updateMyEnterprise(
    @CurrentUser() user: { id: number },
    @Body() dto: UpdateEnterpriseDto,
  ) {
    return this.enterpriseService.updateMyEnterprise(user.id, dto);
  }

  @Post('me/files/:fileType')
  @Roles(RoleCode.ENTERPRISE_USER)
  @HttpCode(HttpStatus.CREATED)
  @Header('Cache-Control', 'no-store')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_DOCUMENT_FILE_SIZE },
    }),
  )
  @ApiOperation({ summary: 'Tải tệp public và gắn vào doanh nghiệp đang đăng nhập' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Ảnh, PDF, Word hoặc Excel; tối đa 10 MB',
        },
      },
    },
  })
  uploadMyEnterpriseFile(
    @Param() params: MyEnterpriseFileParamDto,
    @UploadedFile() file: MultipartFile | undefined,
    @CurrentUser() user: { id: number },
  ) {
    return this.enterpriseService.uploadMyEnterpriseFile(
      user.id,
      params.fileType,
      file,
    );
  }

  @Delete('me/files/:fileType')
  @Roles(RoleCode.ENTERPRISE_USER)
  @ApiOperation({ summary: 'Gỡ tệp khỏi doanh nghiệp đang đăng nhập' })
  removeMyEnterpriseFile(
    @Param() params: MyEnterpriseFileParamDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.enterpriseService.removeMyEnterpriseFile(
      user.id,
      params.fileType,
    );
  }

  @Get()
  @Roles(RoleCode.ADMIN)
  @ApiOperation({ summary: 'Lấy danh sách doanh nghiệp' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách doanh nghiệp thành công.',
  })
  getAll(@Query() query: EnterpriseQueryDto = {}) {
    return this.enterpriseService.getAll(query);
  }

  @Get(':id')
  @Roles(RoleCode.ADMIN)
  @ApiOperation({ summary: 'Lấy chi tiết doanh nghiệp theo ID' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, description: 'Lấy doanh nghiệp thành công.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy doanh nghiệp.' })
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.enterpriseService.getById(id);
  }

  @Post()
  @Roles(RoleCode.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Tạo doanh nghiệp',
    description:
      'businessTypeId phải tham chiếu loại hình đang hoạt động; industryId phải tham chiếu ngành nghề cấp 4.',
  })
  @ApiResponse({
    status: 201,
    description:
      'Tạo doanh nghiệp và tài khoản đăng nhập đầu tiên thành công. Response trả username và mật khẩu tạm thời để hiển thị một lần.',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu hoặc danh mục không hợp lệ.',
  })
  @ApiResponse({ status: 409, description: 'Mã số thuế đã tồn tại.' })
  create(
    @Body() dto: CreateEnterpriseDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.enterpriseService.create(dto, user?.id);
  }

  @Patch(':id')
  @Roles(RoleCode.ADMIN)
  @ApiOperation({
    summary: 'Cập nhật doanh nghiệp',
    description:
      'Nếu thay đổi danh mục, businessTypeId phải hợp lệ và industryId phải là ngành nghề cấp 4.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật doanh nghiệp thành công.',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu hoặc danh mục không hợp lệ.',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy doanh nghiệp.' })
  @ApiResponse({
    status: 409,
    description: 'Mã số thuế hoặc email đã tồn tại.',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEnterpriseDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.enterpriseService.update(id, dto, user?.id);
  }

  @Post(':id/files/:fileType')
  @Roles(RoleCode.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @Header('Cache-Control', 'no-store')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_DOCUMENT_FILE_SIZE },
    }),
  )
  @ApiOperation({ summary: 'Tải tệp public và gắn vào doanh nghiệp' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Ảnh, PDF, Word hoặc Excel; tối đa 10 MB',
        },
      },
    },
  })
  uploadFile(
    @Param() params: EnterpriseFileParamDto,
    @UploadedFile() file: MultipartFile | undefined,
    @CurrentUser() user: { id: number },
  ) {
    return this.enterpriseService.uploadFile(
      params.id,
      params.fileType,
      file,
      user?.id,
    );
  }

  @Delete(':id/files/:fileType')
  @Roles(RoleCode.ADMIN)
  @ApiOperation({ summary: 'Gỡ tệp khỏi doanh nghiệp' })
  removeFile(
    @Param() params: EnterpriseFileParamDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.enterpriseService.removeFile(
      params.id,
      params.fileType,
      user?.id,
    );
  }

  @Patch(':id/status')
  @Roles(RoleCode.ADMIN)
  @ApiOperation({ summary: 'Cập nhật trạng thái hoạt động của doanh nghiệp' })
  @ApiResponse({ status: 200, description: 'Cập nhật trạng thái thành công.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy doanh nghiệp.' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEnterpriseStatusDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.enterpriseService.updateStatus(id, dto.isActive, user?.id);
  }

  @Delete(':id')
  @Roles(RoleCode.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Xóa mềm doanh nghiệp đã ngừng hoạt động và không còn người dùng chưa bị xóa',
  })
  @ApiResponse({ status: 204, description: 'Xóa doanh nghiệp thành công.' })
  @ApiResponse({
    status: 400,
    description: 'Doanh nghiệp vẫn đang hoạt động.',
  })
  @ApiResponse({
    status: 409,
    description: 'Doanh nghiệp vẫn còn người dùng trực thuộc.',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.enterpriseService.remove(id);
  }
}
