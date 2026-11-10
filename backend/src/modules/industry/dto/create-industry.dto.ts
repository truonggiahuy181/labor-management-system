import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const INDUSTRY_CODE_RE = /^[A-V0-9]{1,4}$/;
const NAME_START_RE = /^[\p{L}\p{N}]/u;

export class CreateIndustryDto {
  @ApiProperty({
    example: '6201',
    maxLength: 4,
    description:
      'Mã ngành chính thức: cấp 1 là chữ cái A-V; cấp 2-4 lần lượt là 2, 3, 4 chữ số. Không ghép mã chữ cái cấp 1 vào mã cấp 2-4.',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(4)
  @Matches(INDUSTRY_CODE_RE, {
    message: 'Mã ngành chỉ gồm chữ cái A-V hoặc tối đa 4 chữ số',
  })
  industryCode: string;

  @ApiProperty({ example: 'Lập trình máy vi tính', maxLength: 255 })
  @IsString({ message: 'Tên ngành nghề phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Tên ngành nghề không được để trống' })
  @MaxLength(255, {
    message: 'Tên ngành nghề không được vượt quá 255 ký tự',
  })
  @Matches(NAME_START_RE, {
    message: 'Tên ngành nghề phải bắt đầu bằng chữ cái hoặc chữ số',
  })
  industryName: string;

  @ApiPropertyOptional({ example: 10, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  parentId?: number | null;
}
