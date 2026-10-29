'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { locationApi } from '@/services/location';

export type LocationOption = { value: string; label: string };

export type LocationCatalog = {
  provinceOptions: LocationOption[];
  allWardOptions: LocationOption[];
  wardsOf: (provinceCode?: string | null) => LocationOption[];
  ensureWards: (provinceCode?: string | null) => Promise<LocationOption[]>;
  provinceLabel: (provinceCode?: string | null) => string;
  wardLabel: (provinceCode?: string | null, wardCode?: string | null) => string;
  loadingProvinces: boolean;
  isLoadingWards: (provinceCode?: string | null) => boolean;
};

export default function useLocations(): LocationCatalog {
  const [provinceOptions, setProvinceOptions] = useState<LocationOption[]>([]);
  const [wardsByProvince, setWardsByProvince] = useState<
    Record<string, LocationOption[]>
  >({});
  const [loadingProvinces, setLoadingProvinces] = useState(true);
  const [loadingWardCodes, setLoadingWardCodes] = useState<Set<string>>(
    () => new Set(),
  );
  const wardCache = useRef<Record<string, LocationOption[]>>({});
  const pendingRequests = useRef<
    Partial<Record<string, Promise<LocationOption[]>>>
  >({});

  useEffect(() => {
    let cancelled = false;
    locationApi
      .provinces()
      .then((provinces) => {
        if (!cancelled) {
          setProvinceOptions(
            provinces.map(({ code, name }) => ({ value: code, label: name })),
          );
        }
      })
      .catch(() => {
        if (!cancelled) setProvinceOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingProvinces(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const ensureWards = useCallback(
    async (provinceCode?: string | null): Promise<LocationOption[]> => {
      if (!provinceCode) return [];
      if (wardCache.current[provinceCode]) {
        return wardCache.current[provinceCode];
      }
      const pendingRequest = pendingRequests.current[provinceCode];
      if (pendingRequest) {
        return pendingRequest;
      }

      setLoadingWardCodes((current) => new Set(current).add(provinceCode));
      const request = locationApi
        .wards(provinceCode)
        .then((wards) => {
          const options = wards.map(({ code, name }) => ({
            value: code,
            label: name,
          }));
          wardCache.current[provinceCode] = options;
          setWardsByProvince((current) => ({
            ...current,
            [provinceCode]: options,
          }));
          return options;
        })
        .catch(() => [])
        .finally(() => {
          delete pendingRequests.current[provinceCode];
          setLoadingWardCodes((current) => {
            const next = new Set(current);
            next.delete(provinceCode);
            return next;
          });
        });

      pendingRequests.current[provinceCode] = request;
      return request;
    },
    [],
  );

  return useMemo(() => {
    const wardsOf = (provinceCode?: string | null) =>
      provinceCode ? (wardsByProvince[provinceCode] ?? []) : [];
    const findLabel = (
      options: LocationOption[],
      value?: string | null,
    ) => options.find((option) => option.value === value)?.label ?? '';

    return {
      provinceOptions,
      allWardOptions: Object.values(wardsByProvince).flat(),
      wardsOf,
      ensureWards,
      provinceLabel: (provinceCode?: string | null) =>
        findLabel(provinceOptions, provinceCode),
      wardLabel: (provinceCode?: string | null, wardCode?: string | null) =>
        findLabel(wardsOf(provinceCode), wardCode),
      loadingProvinces,
      isLoadingWards: (provinceCode?: string | null) =>
        !!provinceCode && loadingWardCodes.has(provinceCode),
    };
  }, [ensureWards, loadingProvinces, loadingWardCodes, provinceOptions, wardsByProvince]);
}
