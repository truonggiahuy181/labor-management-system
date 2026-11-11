import { OmitType, PartialType } from '@nestjs/swagger';
import { IsDefined, ValidateIf } from 'class-validator';
import { CreateEnterpriseDto } from './create-enterprise.dto.js';

// Mã số thuế là tên đăng nhập nên không cho đổi; email được đổi và đồng bộ sang tài khoản doanh nghiệp
export class UpdateEnterpriseDto extends PartialType(
  OmitType(CreateEnterpriseDto, ['taxCode'] as const),
) {
  @ValidateIf((_, value) => value !== undefined)
  @IsDefined({ message: 'Số điện thoại cơ quan không được để trống' })
  override phoneNumber?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsDefined({ message: 'Tỉnh/thành phố hoạt động không được để trống' })
  override operatingProvinceId?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsDefined({ message: 'Phường/xã hoạt động không được để trống' })
  override operatingWardId?: string;
}

