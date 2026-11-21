import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

@Entity('occupational_accident_review_labels')
@Index('uq_oa_review_labels_normalized', ['normalizedLabel'], { unique: true })
export class ReportReviewLabelEntity {
  @PrimaryColumn({ name: 'code', type: 'varchar', length: 60 })
  value: string;

  @Column({ type: 'varchar', length: 100 })
  label: string;

  @Column({ name: 'normalized_label', type: 'varchar', length: 100 })
  normalizedLabel: string;

  @Column({ type: 'varchar', length: 1000 })
  reason: string;

  @Column({ name: 'sort_order', type: 'int', default: 100 })
  sortOrder: number;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
