import {
  Column,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Index('uq_business_types_type_code', ['typeCode'], { unique: true })
@Entity('business_types')
export class BusinessTypeEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'type_code', type: 'varchar', length: 50 })
  typeCode: string;

  @Column({ name: 'type_name', type: 'varchar', length: 255 })
  typeName: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;
}
