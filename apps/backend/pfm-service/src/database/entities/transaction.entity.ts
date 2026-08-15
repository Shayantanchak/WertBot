import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { TransactionType, TransactionStatus, CurrencyCode } from '@wertbot/shared-types';

@Entity('transactions')
@Index('idx_transactions_user_id', ['userId'])
@Index('idx_transactions_account_id', ['accountId'])
@Index('idx_transactions_date', ['transactionDate'])
export class TransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({ type: 'uuid', name: 'account_id' })
  accountId!: string;

  @Column({
    type: 'varchar',
    length: 20,
    enum: TransactionType,
    name: 'transaction_type',
  })
  transactionType!: TransactionType;

  @Column({
    type: 'varchar',
    length: 20,
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status!: TransactionStatus;

  @Column({ type: 'bigint', name: 'amount_minor' })
  amountMinor!: number;

  @Column({
    type: 'varchar',
    length: 10,
    enum: CurrencyCode,
  })
  currency!: CurrencyCode;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'merchant_name' })
  merchantName!: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true, name: 'merchant_mcc' })
  merchantMcc!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'merchant_city' })
  merchantCity!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'merchant_country' })
  merchantCountry!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  subcategory!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'reference_id' })
  referenceId!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  source!: string | null;

  @Column({ type: 'text', nullable: true, name: 'raw_sms_text' })
  rawSmsText!: string | null;

  @Column({ type: 'jsonb', default: {}, name: 'ai_metadata' })
  aiMetadata!: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'text', array: true, nullable: true })
  tags!: string[] | null;

  @Column({ type: 'boolean', default: false, name: 'is_recurring' })
  isRecurring!: boolean;

  @Column({ type: 'timestamp', name: 'transaction_date' })
  transactionDate!: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'posted_date' })
  postedDate!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
