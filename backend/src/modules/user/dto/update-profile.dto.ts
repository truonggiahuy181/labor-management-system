import {
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  MaxLength,
  IsIn,
  Matches,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateProfileDto {
  // ── Tên đăng nhập & Email: KHÔNG được phép thay đổi qua endpoint này (xử lý ở service/luồng OTP)

  @ApiPropertyOptional({
    description: 'Họ và tên',
    example: 'Nguyễn Văn A',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'Họ và tên phải là chuỗi ký tự' })
  @MaxLength(100, { message: 'Họ và tên không được vượt quá 100 ký tự' })
  fullName?: string;

  @ApiPropertyOptional({
    description: 'Ngày sinh (ISO 8601: YYYY-MM-DD)',
    example: '1990-01-15',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Ngày sinh không đúng định dạng YYYY-MM-DD' })
  dob?: string;

  @ApiPropertyOptional({
    description: 'Giới tính (0: Nữ, 1: Nam, 2: Khác)',
    example: 1,
    enum: [0, 1, 2],
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Giới tính phải là số nguyên' })
  @IsIn([0, 1, 2], {
    message: 'Giới tính không hợp lệ (0: Nữ, 1: Nam, 2: Khác)',
  })
  gender?: number;

  @ApiPropertyOptional({
    description: 'Số điện thoại (10-11 số)',
    example: '0901234567',
  })
  @IsOptional()
  @IsString({ message: 'Số điện thoại phải là chuỗi ký tự' })
  @Matches(/^[0-9]{10,11}$/, {
    message: 'Số điện thoại không hợp lệ (phải gồm 10 hoặc 11 chữ số)',
  })
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: 'Chức danh',
    example: 'Chuyên viên',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'Chức danh phải là chuỗi ký tự' })
  @MaxLength(100, { message: 'Chức danh không được vượt quá 100 ký tự' })
  title?: string;

  @ApiPropertyOptional({
    description:
      'Khóa ảnh đại diện nhận từ POST /files với folder=avatars; gửi null để gỡ avatar',
    example: 'avatars/1/2026/10/550e8400-e29b-41d4-a716-446655440000.png',
    maxLength: 255,
    nullable: true,
  })
  @IsOptional()
  @IsString({ message: 'Khóa ảnh đại diện phải là chuỗi ký tự' })
  @MaxLength(255, {
    message: 'Khóa ảnh đại diện không được vượt quá 255 ký tự',
  })
  avatarObjectKey?: string | null;

  @ApiPropertyOptional({
    description:
      'Trường tương thích FE cũ; backend bỏ qua giá trị này vì avatarUrl được tự tạo từ avatarObjectKey',
    deprecated: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  avatarUrl?: string | null;

  @ApiPropertyOptional({
    description: 'Mã tỉnh/thành phố',
    example: '79',
    minLength: 2,
    maxLength: 2,
  })
  @IsOptional()
  @IsString({ message: 'Mã tỉnh/thành phố phải là chuỗi ký tự' })
  @MaxLength(2, { message: 'Mã tỉnh/thành phố không được vượt quá 2 ký tự' })
  @Matches(/^\d{2}$/, {
    message: 'Mã tỉnh/thành phố phải gồm đúng 2 chữ số',
  })
  provinceId?: string;

  @ApiPropertyOptional({
    description: 'Mã quận/huyện',
    example: '764',
    maxLength: 20,
  })
  @IsOptional()
  @IsString({ message: 'Mã quận/huyện phải là chuỗi ký tự' })
  @MaxLength(20, { message: 'Mã quận/huyện không được vượt quá 20 ký tự' })
  districtId?: string;

  @ApiPropertyOptional({
    description: 'Mã phường/xã',
    example: '26740',
    minLength: 5,
    maxLength: 5,
  })
  @IsOptional()
  @IsString({ message: 'Mã phường/xã phải là chuỗi ký tự' })
  @MaxLength(5, { message: 'Mã phường/xã không được vượt quá 5 ký tự' })
  @Matches(/^\d{5}$/, {
    message: 'Mã phường/xã phải gồm đúng 5 chữ số',
  })
  wardId?: string;

  @ApiPropertyOptional({
    description: 'Địa chỉ cụ thể',
    example: 'Phường Gò Vấp, TP Hồ Chí Minh',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: 'Địa chỉ phải là chuỗi ký tự' })
  @MaxLength(255, { message: 'Địa chỉ không được vượt quá 255 ký tự' })
  address?: string;
}
