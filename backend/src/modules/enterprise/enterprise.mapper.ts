import { EnterpriseEntity } from './enterprise.entity.js';

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
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class EnterpriseMapper {
  static toResponse(entity: EnterpriseEntity): EnterpriseResponse {
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
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  static toResponseList(entities: EnterpriseEntity[]): EnterpriseResponse[] {
    return entities.map((entity) => this.toResponse(entity));
  }
}
