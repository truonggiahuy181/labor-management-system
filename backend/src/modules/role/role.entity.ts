import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Index('uq_roles_role_code', ['roleCode'], { unique: true })
@Entity('roles')
export class RoleEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'role_code', type: 'varchar', length: 50 })
  roleCode: string;

  @Column({ name: 'role_name', type: 'varchar', length: 100 })
  roleName: string;
}
