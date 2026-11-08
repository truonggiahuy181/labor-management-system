import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { UserEntity } from '../../user/user.entity.js';
import { OccupationalAccidentReportEntity } from './occupational-accident-report.entity.js';

@Check('chk_oa_draft_documents_size', 'document_size > 0')
@Check(
  'chk_oa_draft_documents_sha256',
  "document_sha256 ~ '^[0-9a-f]{64}$'",
)
@Entity('occupational_accident_report_draft_documents')
export class OccupationalAccidentReportDraftDocumentEntity {
  @PrimaryColumn({ name: 'report_id', type: 'int' })
  reportId: number;

  @OneToOne(
    () => OccupationalAccidentReportEntity,
    (report) => report.draftDocument,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({
    name: 'report_id',
    foreignKeyConstraintName: 'fk_oa_draft_documents_report',
  })
  report: Relation<OccupationalAccidentReportEntity>;

  @Column({ name: 'document_object_key', type: 'varchar', length: 500 })
  documentObjectKey: string;

  @Column({ name: 'document_original_name', type: 'varchar', length: 255 })
  documentOriginalName: string;

  @Column({ name: 'document_content_type', type: 'varchar', length: 100 })
  documentContentType: string;

  @Column({ name: 'document_size', type: 'bigint' })
  documentSize: string;

  @Column({ name: 'document_sha256', type: 'char', length: 64 })
  documentSha256: string;

  @Column({ name: 'uploaded_by', type: 'int' })
  uploadedBy: number;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'uploaded_by',
    foreignKeyConstraintName: 'fk_oa_draft_documents_user',
  })
  uploader: Relation<UserEntity>;

  @Column({ name: 'uploaded_at', type: 'timestamp' })
  uploadedAt: Date;
}
