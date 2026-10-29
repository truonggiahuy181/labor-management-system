'use client';
import { useEffect, useMemo, useState } from 'react';
import { catalogApi, type BusinessType, type Industry } from '@/services/enterprise';
import { type CatalogOptions, type Option } from '@/Components/BusinessRegister/options';
import useLocations from './useLocations';

export type { Option };

export default function useCatalogs() {
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const locations = useLocations();

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
      catalog,       // truyền vào form dùng chung (EnterpriseForm / ConfirmStep)
      businessTypeOptions,
      industryOptions,
      locations,
      // Các phường/xã của những tỉnh đã được tải – trang doanh nghiệp tải theo dữ liệu đang có
      allWardOptions: locations.allWardOptions,
      businessTypeLabel: (id: number | null | undefined) => find(businessTypeOptions, id),
      industryLabel: (id: number | null | undefined) => find(industryOptions, id),
      wardLabel: locations.wardLabel,
    };
  }, [businessTypes, industries, locations]);
}
