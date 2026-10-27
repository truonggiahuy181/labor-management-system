import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: 'Tên đăng nhập', example: 'admin' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập đầy đủ thông tin.' })
  username: string;

  @ApiProperty({ description: 'Mật khẩu', example: 'password123' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập đầy đủ thông tin.' })
  password: string;

  @ApiPropertyOptional({
    description: 'Ghi nhớ đăng nhập',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
