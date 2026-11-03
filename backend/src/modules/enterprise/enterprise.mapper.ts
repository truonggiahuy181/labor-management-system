import {
  EnterpriseEntity,
  type EnterpriseFiles,
  type EnterpriseStoredFile,
} from './enterprise.entity.js';

export interface EnterpriseFileResponse extends EnterpriseStoredFile {
  accessUrl: string;
}

export type EnterpriseFilesResponse = Partial<
  Record<keyof EnterpriseFiles, EnterpriseFileResponse>
>;

export interface EnterpriseResponse {
  id: number;
  enterpriseName: string;
  taxCode: string;
  businessTypeId: number;
  industryId: number;
  registrationDate: string;
  provinceId: string;
  wardId: string;
  address: string;
  foreignName: string | null;
  email: string;
  phoneNumber: string | null;
  representativeName: string | null;
  representativePhone: string | null;
  operatingProvinceId: string | null;
  operatingWardId: string | null;
  operatingAddress: string | null;
  files: EnterpriseFilesResponse;
  businessLicenseKey?: string | null;
  otherDocumentKey?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class EnterpriseMapper {
  static toResponse(
    entity: EnterpriseEntity,
    files: EnterpriseFilesResponse = {},
  ): EnterpriseResponse {
    return {
      id: entity.id,
      enterpriseName: entity.enterpriseName,
      taxCode: entity.taxCode,
      businessTypeId: entity.businessTypeId,
      industryId: entity.industryId,
      registrationDate: entity.registrationDate,
      provinceId: entity.provinceId,
      wardId: entity.wardId,
      address: entity.address,
      foreignName: entity.foreignName,
      email: entity.email,
      phoneNumber: entity.phoneNumber,
      representativeName: entity.representativeName,
      representativePhone: entity.representativePhone,
      operatingProvinceId: entity.operatingProvinceId,
      operatingWardId: entity.operatingWardId,
      operatingAddress: entity.operatingAddress,
      files,
      businessLicenseKey: entity.businessLicenseKey ?? null,
      otherDocumentKey: entity.otherDocumentKey ?? null,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  static toResponseList(
    entities: EnterpriseEntity[],
    filesByEnterprise: EnterpriseFilesResponse[] = [],
  ): EnterpriseResponse[] {
    return entities.map((entity, index) =>
      this.toResponse(entity, filesByEnterprise[index]),
    );
  }
}
