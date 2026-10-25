import { EnterpriseEntity } from './enterprise.entity.js';

export interface EnterpriseResponse {
  id: number;
  companyName: string;
  taxCode: string;
  businessType: string;
  mainIndustry: string;
  licenseDate: string;
  province: string;
  ward: string;
  address: string;
  foreignName: string | null;
  email: string;
  officePhone: string | null;
  leaderName: string | null;
  leaderPhone: string | null;
  operatingProvince: string | null;
  operatingWard: string | null;
  businessLocation: string | null;
  businessLicensePath: string | null;
  otherDocumentPath: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class EnterpriseMapper {
  static toResponse(entity: EnterpriseEntity): EnterpriseResponse {
    return {
      id: entity.id,
      companyName: entity.companyName,
      taxCode: entity.taxCode,
      businessType: entity.businessType,
      mainIndustry: entity.mainIndustry,
      licenseDate: entity.licenseDate,
      province: entity.province,
      ward: entity.ward,
      address: entity.address,
      foreignName: entity.foreignName,
      email: entity.email,
      officePhone: entity.officePhone,
      leaderName: entity.leaderName,
      leaderPhone: entity.leaderPhone,
      operatingProvince: entity.operatingProvince,
      operatingWard: entity.operatingWard,
      businessLocation: entity.businessLocation,
      businessLicensePath: entity.businessLicensePath,
      otherDocumentPath: entity.otherDocumentPath,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  static toResponseList(entities: EnterpriseEntity[]): EnterpriseResponse[] {
    return entities.map((entity) => this.toResponse(entity));
  }
}
