import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

export class UpdateRoleDto {
  @ApiPropertyOptional({ example: 'Quản lý doanh nghiệp', maxLength: 100 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  roleName?: string;
}

export class UpdateRoleStatusDto {
  @ApiProperty({ example: false })
  @IsBoolean()
  isActive: boolean;
}

export class RoleResponseDto {
  @ApiProperty({ example: 2 })
  id: number;

  @ApiProperty({ example: 'ENTERPRISE_USER' })
  roleCode: string;

  @ApiProperty({ example: 'Người dùng doanh nghiệp' })
  roleName: string;

  @ApiProperty({ example: true })
  isActive: boolean;
}
