import api from './api';
import type { BackendResponse } from './user';

export interface Province {
  code: string;
  name: string;
  divisionType: string;
}

export interface Ward {
  code: string;
  provinceCode: string;
  name: string;
  divisionType: string;
}

export const locationApi = {
  provinces: () =>
    api
      .get<BackendResponse<Province[]>>('/locations/provinces')
      .then((response) => response.data.data ?? []),
  wards: (provinceCode: string) =>
    api
      .get<BackendResponse<Ward[]>>(
        `/locations/provinces/${provinceCode}/wards`,
      )
      .then((response) => response.data.data ?? []),
};
