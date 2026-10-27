import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const ROLE_CODE_RE = /^[A-Z][A-Z0-9_]*$/;

export class CreateRoleDto {
  @ApiProperty({ example: 'ENTERPRISE_USER', maxLength: 50 })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(ROLE_CODE_RE, {
    message: 'Mã vai trò chỉ gồm chữ in hoa, số và dấu gạch dưới',
  })
  roleCode: string;

  @ApiProperty({ example: 'Người dùng doanh nghiệp', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  roleName: string;
}
