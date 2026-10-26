'use client';
import { useEffect, useMemo, useState } from 'react';
import { catalogApi, type BusinessType, type Industry } from '@/services/enterprise';
import { PROVINCES, wardsOf, type CatalogOptions, type Option } from '@/Components/BusinessRegister/options';

export type { Option };

export default function useCatalogs() {
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);

  useEffect(() => {
    // Lỗi tải danh mục chỉ làm ô chọn trống, không chặn trang
    catalogApi.businessTypes().then(setBusinessTypes).catch(() => setBusinessTypes([]));
    catalogApi.industries().then(setIndustries).catch(() => setIndustries([]));
  }, []);

  return useMemo(() => {
    const businessTypeOptions: Option[] = businessTypes.map((b) => ({ value: String(b.id), label: b.typeName }));
    const industryOptions: Option[] = industries.map((i) => ({ value: String(i.id), label: `${i.industryCode} - ${i.industryName}` }));
    const find = (options: Option[], value: string | number | null | undefined) =>
      options.find((o) => o.value === String(value ?? ''))?.label ?? '';
    const catalog: CatalogOptions = { businessTypes: businessTypeOptions, industries: industryOptions };
    return {
      catalog,       // truyền vào form dùng chung (BusinessRegisterDialog / ConfirmStep)
      businessTypeOptions,
      industryOptions,
      // Tất cả phường/xã của mọi tỉnh – dùng cho ô lọc trên bảng
      allWardOptions: PROVINCES.flatMap((p) => p.wards),
      businessTypeLabel: (id: number | null | undefined) => find(businessTypeOptions, id),
      industryLabel: (id: number | null | undefined) => find(industryOptions, id),
      wardLabel: (province: string | null | undefined, ward: string | null | undefined) => find(wardsOf(province ?? ''), ward),
    };
  }, [businessTypes, industries]);
}
