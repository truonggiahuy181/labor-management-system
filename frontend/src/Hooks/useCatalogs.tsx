'use client';
import { useEffect, useMemo, useState } from 'react';
import { catalogApi, type BusinessType, type Industry } from '@/services/enterprise';
import { type CatalogOptions, type Option } from '@/Components/BusinessRegister/options';
import useLocations from './useLocations';

export type { Option };

export default function useCatalogs() {
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const locations = useLocations();

  useEffect(() => {
    let cancelled = false;

    Promise.all([catalogApi.businessTypes(), catalogApi.industries()])
      .then(([nextBusinessTypes, nextIndustries]) => {
        if (cancelled) return;
        setBusinessTypes(nextBusinessTypes);
        setIndustries(nextIndustries);
      })
      .catch(() => {
        if (cancelled) return;
        setBusinessTypes([]);
        setIndustries([]);
        setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return useMemo(() => {
    const businessTypeOptions: Option[] = businessTypes.map((b) => ({ value: String(b.id), label: b.typeName }));
    const industryOptions: Option[] = industries
      .filter((industry) => industry.level === 4)
      .map((industry) => ({ value: String(industry.id), label: `${industry.industryCode} - ${industry.industryName}` }));
    const find = (options: Option[], value: string | number | null | undefined) =>
      options.find((o) => o.value === String(value ?? ''))?.label ?? '';
    const catalog: CatalogOptions = { businessTypes: businessTypeOptions, industries: industryOptions, industryTree: industries };
    return {
      catalog,       // truyền vào form dùng chung (EnterpriseForm / ConfirmStep)
      businessTypeOptions,
      industryOptions,
      locations,
      loading: loading || locations.loadingProvinces,
      loadError: loadError || locations.loadError,
      retry: () => {
        setLoading(true);
        setLoadError(false);
        setReloadKey((current) => current + 1);
        locations.retry();
      },
      // Các phường/xã của những tỉnh đã được tải – trang doanh nghiệp tải theo dữ liệu đang có
      allWardOptions: locations.allWardOptions,
      businessTypeLabel: (id: number | null | undefined) => find(businessTypeOptions, id),
      industryLabel: (id: number | null | undefined) => find(industryOptions, id),
      wardLabel: locations.wardLabel,
    };
  }, [businessTypes, industries, loadError, loading, locations]);
}
