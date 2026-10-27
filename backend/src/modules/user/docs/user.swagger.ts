import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

const USER_EXAMPLE = {
  id: 2,
  username: 'admin-vna',
  fullName: 'Nguyễn Văn A',
  dob: '1995-06-01',
  gender: 1,
  email: 'user@example.com',
  phoneNumber: '0901234567',
  title: 'Chuyên viên',
  avatarUrl: 'https://example.com/avatar.jpg',
  provinceId: '79',
  districtId: '764',
  wardId: '26740',
  address: 'Phường Gò Vấp, TP Hồ Chí Minh',
  roleId: 1,
  enterpriseId: null,
  isActive: true,
  createdAt: '2026-10-22T08:00:00.000Z',
  updatedAt: '2026-10-22T08:00:00.000Z',
};

const successExample = (data: unknown, code = 200) => ({
  message: 'Thành công',
  success: true,
  data,
  code,
});

export function ApiCreateUserDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Tạo mới người dùng (Quản trị viên)',
      description:
        'Tạo tài khoản nội bộ. Tài khoản ENTERPRISE_USER chỉ được tạo tự động cùng doanh nghiệp qua POST /enterprises. Mật khẩu được băm bằng Argon2.',
    }),
    ApiResponse({
      status: 201,
      description: 'Tạo người dùng mới thành công.',
      schema: { example: successExample(USER_EXAMPLE, 201) },
    }),
    ApiResponse({
      status: 400,
      description: 'Dữ liệu hoặc ID tham chiếu không hợp lệ.',
    }),
    ApiResponse({ status: 401, description: 'Chưa đăng nhập.' }),
    ApiResponse({
      status: 409,
      description: 'Tên đăng nhập hoặc email đã tồn tại.',
    }),
  );
}

export function ApiGetAllUsersDocs() {
  return applyDecorators(
    ApiOperation({
      summary:
        'Lấy danh sách người dùng khác tài khoản hiện tại (Quản trị viên)',
      description:
        'Danh sách không bao gồm tài khoản đang đăng nhập, được sắp xếp theo ID giảm dần và không chứa mật khẩu, OTP hoặc token.',
    }),
    ApiResponse({
      status: 200,
      description: 'Lấy danh sách người dùng thành công.',
      schema: { example: successExample([USER_EXAMPLE]) },
    }),
    ApiResponse({ status: 401, description: 'Chưa đăng nhập.' }),
  );
}

export function ApiGetMyProfileDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Xem thông tin tài khoản của tôi' }),
    ApiResponse({
      status: 200,
      description: 'Lấy thông tin tài khoản thành công.',
      schema: { example: successExample(USER_EXAMPLE) },
    }),
    ApiResponse({
      status: 401,
      description: 'Chưa đăng nhập hoặc token không hợp lệ.',
    }),
  );
}

export function ApiGetUserByIdDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Xem chi tiết người dùng theo ID (Quản trị viên)',
    }),
    ApiParam({ name: 'id', description: 'ID người dùng', example: 2 }),
    ApiResponse({
      status: 200,
      description: 'Lấy thông tin chi tiết người dùng thành công.',
      schema: { example: successExample(USER_EXAMPLE) },
    }),
    ApiResponse({ status: 401, description: 'Chưa đăng nhập.' }),
    ApiResponse({ status: 404, description: 'Không tìm thấy người dùng.' }),
  );
}

export function ApiUpdateMyProfileDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Cập nhật thông tin tài khoản',
      description:
        'Username là trường chỉ đọc. Để thay đổi email, sử dụng luồng OTP tại /auth/request-email-change.',
    }),
    ApiResponse({
      status: 200,
      description: 'Cập nhật thành công.',
      schema: { example: successExample(USER_EXAMPLE) },
    }),
    ApiResponse({
      status: 400,
      description: 'Dữ liệu cập nhật không hợp lệ.',
    }),
    ApiResponse({ status: 401, description: 'Chưa đăng nhập.' }),
  );
}

export function ApiUpdateUserDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Cập nhật người dùng theo ID (Quản trị viên)',
      description:
        'Cập nhật hồ sơ, trạng thái, email hoặc đặt lại mật khẩu. Vai trò và liên kết doanh nghiệp không được thay đổi sau khi tạo.',
    }),
    ApiParam({ name: 'id', description: 'ID người dùng', example: 2 }),
    ApiResponse({
      status: 200,
      description: 'Cập nhật thông tin người dùng thành công.',
      schema: { example: successExample(USER_EXAMPLE) },
    }),
    ApiResponse({
      status: 400,
      description: 'Dữ liệu hoặc ID tham chiếu không hợp lệ.',
    }),
    ApiResponse({ status: 401, description: 'Chưa đăng nhập.' }),
    ApiResponse({ status: 404, description: 'Không tìm thấy người dùng.' }),
    ApiResponse({ status: 409, description: 'Email đã tồn tại.' }),
  );
}

export function ApiUpdateUserStatusDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Cập nhật trạng thái người dùng (Quản trị viên)',
      description:
        'Kích hoạt hoặc khóa tài khoản; không cho phép tự khóa chính mình.',
    }),
    ApiParam({ name: 'id', description: 'ID người dùng', example: 2 }),
    ApiResponse({
      status: 200,
      description: 'Cập nhật trạng thái thành công.',
      schema: {
        example: successExample({ ...USER_EXAMPLE, isActive: false }),
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Dữ liệu không hợp lệ hoặc tự khóa tài khoản.',
    }),
    ApiResponse({ status: 401, description: 'Chưa đăng nhập.' }),
    ApiResponse({ status: 404, description: 'Không tìm thấy người dùng.' }),
  );
}

export function ApiDeleteUserDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Xóa mềm người dùng đã bị khóa (Quản trị viên)',
      description:
        'Đặt deleted_at cho tài khoản inactive; không xóa vật lý và không được tự xóa tài khoản đang đăng nhập.',
    }),
    ApiParam({ name: 'id', description: 'ID người dùng', example: 2 }),
    ApiResponse({ status: 204, description: 'Xóa người dùng thành công.' }),
    ApiResponse({
      status: 400,
      description: 'Tài khoản còn active hoặc quản trị viên tự xóa chính mình.',
    }),
    ApiResponse({ status: 404, description: 'Không tìm thấy người dùng.' }),
  );
}
