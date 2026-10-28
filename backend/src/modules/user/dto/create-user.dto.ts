import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsInt,
  IsBoolean,
  IsEmail,
  MinLength,
  MaxLength,
  IsIn,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateUserDto {
  @ApiProperty({
    description: 'Tên đăng nhập',
    example: 'admin-vna',
    maxLength: 50,
  })
  @IsString({ message: 'Tên đăng nhập phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Tên đăng nhập không được để trống' })
  @MaxLength(50, { message: 'Tên đăng nhập không được vượt quá 50 ký tự' })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message:
      'Tên đăng nhập chỉ được chứa chữ cái, chữ số, gạch dưới (_) và gạch ngang (-)',
  })
  username: string;

  @ApiProperty({
    description: 'Mật khẩu khởi tạo (tối thiểu 8 ký tự)',
    example: '12345678',
    minLength: 8,
  })
  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
  password: string;

  @ApiProperty({
    description: 'Họ và tên',
    example: 'Nguyễn Văn A',
    maxLength: 100,
  })
  @IsString({ message: 'Họ và tên phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Họ và tên không được để trống' })
  @MaxLength(100, { message: 'Họ và tên không được vượt quá 100 ký tự' })
  fullName: string;

  @ApiPropertyOptional({
    description: 'Ngày tháng năm sinh (ISO 8601: YYYY-MM-DD)',
    example: '1995-06-01',
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

  @ApiProperty({
    description: 'Email liên hệ',
    example: 'phanthanhthung093@gmail.com',
    maxLength: 100,
  })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  @MaxLength(100, { message: 'Email không được vượt quá 100 ký tự' })
  email: string;

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

  @ApiProperty({
    description:
      'ID vai trò nội bộ. Không nhận vai trò ENTERPRISE_USER; tài khoản doanh nghiệp được tạo qua POST /enterprises.',
    example: 1,
  })
  @Type(() => Number)
  @IsInt({ message: 'ID vai trò phải là số nguyên' })
  @IsNotEmpty({ message: 'Vai trò không được để trống' })
  roleId: number;

  @ApiPropertyOptional({
    description: 'Trạng thái kích hoạt tài khoản',
    default: true,
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Trạng thái kích hoạt phải là boolean' })
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Mã tỉnh/thành phố',
    example: '79',
    maxLength: 20,
  })
  @IsOptional()
  @IsString({ message: 'Mã tỉnh/thành phố phải là chuỗi ký tự' })
  @MaxLength(20, { message: 'Mã tỉnh/thành phố không được vượt quá 20 ký tự' })
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
    maxLength: 20,
  })
  @IsOptional()
  @IsString({ message: 'Mã phường/xã phải là chuỗi ký tự' })
  @MaxLength(20, { message: 'Mã phường/xã không được vượt quá 20 ký tự' })
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
