import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { AccountType, CurrencyCode } from '@wertbot/shared-types';

@Entity('accounts')
@Index('idx_accounts_user_id', ['userId'])
@Index('idx_accounts_plaid_id', ['plaidAccountId'])
export class AccountEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({
    type: 'varchar',
    length: 20,
    enum: AccountType,
    name: 'account_type',
  })
  accountType!: AccountType;

  @Column({
    type: 'varchar',
    length: 10,
    enum: CurrencyCode,
    default: CurrencyCode.USD,
  })
  currency!: CurrencyCode;

  @Column({ type: 'bigint', name: 'balance_minor', default: 0 })
  balanceMinor!: number;

  @Column({ type: 'bigint', name: 'available_minor', default: 0 })
  availableMinor!: number;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'plaid_account_id', unique: true })
  plaidAccountId!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'plaid_item_id' })
  plaidItemId!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'institution_name' })
  institutionName!: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  mask!: string | null;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'boolean', default: false, name: 'is_primary' })
  isPrimary!: boolean;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
