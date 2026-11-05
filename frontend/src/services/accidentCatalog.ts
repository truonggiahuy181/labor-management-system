import api from "./api";
import type { BackendResponse } from "./user";

export interface InjuryFactor {
  id: number;
  factorCode: string;
  factorName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InjuryType {
  id: number;
  injuryTypeCode: string;
  injuryTypeName: string;
  level: number;
  parentId: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Occupation {
  id: number;
  occupationCode: string;
  occupationName: string;
  level: number;
  parentId: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogFilters {
  isActive?: boolean;
  includeInactive?: boolean;
}

export interface InjuryTypeFilters extends CatalogFilters {
  injuryTypeCode?: string;
  injuryTypeName?: string;
  level?: number;
  parentId?: number;
}

export interface OccupationFilters extends CatalogFilters {
  occupationCode?: string;
  occupationName?: string;
  level?: number;
  parentId?: number;
}

export const injuryFactorApi = {
  list: (params: CatalogFilters = {}) =>
    api
      .get<BackendResponse<InjuryFactor[]>>("/injury-factors", { params })
      .then((response) => response.data.data ?? []),
  create: (
    body: Pick<InjuryFactor, "factorCode" | "factorName" | "isActive">,
  ) =>
    api
      .post<BackendResponse<InjuryFactor>>("/injury-factors", body)
      .then((response) => response.data.data),
  update: (
    id: number,
    body: Partial<Pick<InjuryFactor, "factorCode" | "factorName" | "isActive">>,
  ) =>
    api
      .patch<BackendResponse<InjuryFactor>>(`/injury-factors/${id}`, body)
      .then((response) => response.data.data),
  updateStatus: (id: number, isActive: boolean) =>
    api
      .patch<BackendResponse<InjuryFactor>>(`/injury-factors/${id}/status`, {
        isActive,
      })
      .then((response) => response.data.data),
  remove: (id: number) =>
    api.delete(`/injury-factors/${id}`).then(() => undefined),
};

export const injuryTypeApi = {
  list: (params: InjuryTypeFilters = {}) =>
    api
      .get<BackendResponse<InjuryType[]>>("/injury-types", { params })
      .then((response) => response.data.data ?? []),
  selectable: () =>
    api
      .get<BackendResponse<InjuryType[]>>("/injury-types/selectable")
      .then((response) => response.data.data ?? []),
  create: (
    body: Pick<InjuryType, "injuryTypeCode" | "injuryTypeName" | "parentId">,
  ) =>
    api
      .post<BackendResponse<InjuryType>>("/injury-types", body)
      .then((response) => response.data.data),
  update: (id: number, body: Pick<InjuryType, "injuryTypeName">) =>
    api
      .patch<BackendResponse<InjuryType>>(`/injury-types/${id}`, body)
      .then((response) => response.data.data),
  updateStatus: (id: number, isActive: boolean) =>
    api
      .patch<BackendResponse<InjuryType>>(`/injury-types/${id}/status`, {
        isActive,
      })
      .then((response) => response.data.data),
  remove: (id: number) =>
    api.delete(`/injury-types/${id}`).then(() => undefined),
};

export const occupationApi = {
  list: (params: OccupationFilters = {}) =>
    api
      .get<BackendResponse<Occupation[]>>("/occupations", { params })
      .then((response) => response.data.data ?? []),
  selectable: () =>
    api
      .get<BackendResponse<Occupation[]>>("/occupations/selectable")
      .then((response) => response.data.data ?? []),
  create: (
    body: Pick<Occupation, "occupationCode" | "occupationName" | "parentId">,
  ) =>
    api
      .post<BackendResponse<Occupation>>("/occupations", body)
      .then((response) => response.data.data),
  update: (id: number, body: Pick<Occupation, "occupationName">) =>
    api
      .patch<BackendResponse<Occupation>>(`/occupations/${id}`, body)
      .then((response) => response.data.data),
  updateStatus: (id: number, isActive: boolean) =>
    api
      .patch<BackendResponse<Occupation>>(`/occupations/${id}/status`, {
        isActive,
      })
      .then((response) => response.data.data),
  remove: (id: number) =>
    api.delete(`/occupations/${id}`).then(() => undefined),
};
