import { IsBoolean, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserStatusDto {
  @ApiProperty({
    description: 'Trạng thái hoạt động của tài khoản (true: kích hoạt, false: khóa)',
    example: false,
  })
  @IsNotEmpty({ message: 'Trạng thái hoạt động không được để trống' })
  @IsBoolean({ message: 'Trạng thái hoạt động phải là kiểu boolean (true/false)' })
  isActive: boolean;
}
