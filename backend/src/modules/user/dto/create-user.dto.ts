import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsInt,
  IsBoolean,
  IsEmail,
  MinLength,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateUserDto {
  @ApiProperty({ description: 'Tên đăng nhập', example: 'admin-vna' })
  @IsString({ message: 'Tên đăng nhập phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Tên đăng nhập không được để trống' })
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

  @ApiProperty({ description: 'Họ và tên', example: 'Nguyễn Văn A' })
  @IsString({ message: 'Họ và tên phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Họ và tên không được để trống' })
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
  @Min(0, { message: 'Giới tính không hợp lệ' })
  @Max(2, { message: 'Giới tính không hợp lệ' })
  gender?: number;

  @ApiProperty({ description: 'Email liên hệ', example: 'phanthanhthung093@gmail.com' })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @ApiPropertyOptional({ description: 'Số điện thoại', example: '0901234567' })
  @IsOptional()
  @IsString({ message: 'Số điện thoại phải là chuỗi ký tự' })
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Chức danh', example: 'Chuyên viên' })
  @IsOptional()
  @IsString({ message: 'Chức danh phải là chuỗi ký tự' })
  title?: string;

  @ApiPropertyOptional({
    description: 'URL ảnh đại diện',
    example: 'https://example.com/avatar.jpg',
  })
  @IsOptional()
  @IsString({ message: 'URL ảnh đại diện phải là chuỗi ký tự' })
  avatarUrl?: string;

  @ApiProperty({
    description: 'ID Vai trò trong hệ thống (1: Quản trị viên, 2: Chuyên viên,...)',
    example: 1,
  })
  @Type(() => Number)
  @IsInt({ message: 'ID vai trò phải là số nguyên' })
  @IsNotEmpty({ message: 'Vai trò không được để trống' })
  roleId: number;

  @ApiPropertyOptional({
    description: 'ID Doanh nghiệp (nếu là tài khoản thuộc doanh nghiệp)',
    example: null,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'ID doanh nghiệp phải là số nguyên' })
  enterpriseId?: number;

  @ApiPropertyOptional({
    description: 'Trạng thái kích hoạt tài khoản',
    default: true,
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Trạng thái kích hoạt phải là boolean' })
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Mã tỉnh/thành phố', example: '79' })
  @IsOptional()
  @IsString({ message: 'Mã tỉnh/thành phố phải là chuỗi ký tự' })
  provinceId?: string;

  @ApiPropertyOptional({ description: 'Mã quận/huyện', example: '764' })
  @IsOptional()
  @IsString({ message: 'Mã quận/huyện phải là chuỗi ký tự' })
  districtId?: string;

  @ApiPropertyOptional({ description: 'Mã phường/xã', example: '26740' })
  @IsOptional()
  @IsString({ message: 'Mã phường/xã phải là chuỗi ký tự' })
  wardId?: string;

  @ApiPropertyOptional({
    description: 'Địa chỉ cụ thể',
    example: 'Phường Gò Vấp, TP Hồ Chí Minh',
  })
  @IsOptional()
  @IsString({ message: 'Địa chỉ phải là chuỗi ký tự' })
  address?: string;
}
