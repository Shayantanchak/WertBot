import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CurrencyCode } from '@wertbot/shared-types';

@Entity('multi_currency_wallets')
export class MultiCurrencyWalletEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({
    type: 'varchar',
    length: 10,
    enum: CurrencyCode,
  })
  currency!: CurrencyCode;

  @Column({ type: 'bigint', name: 'balance_minor', default: 0 })
  balanceMinor!: number;

  @Column({ type: 'bigint', name: 'reserved_minor', default: 0 })
  reservedMinor!: number;

  @Column({ type: 'text', nullable: true })
  iban!: string | null;

  @Column({ type: 'text', nullable: true, name: 'account_number' })
  accountNumber!: string | null;

  @Column({ type: 'text', nullable: true, name: 'routing_number' })
  routingNumber!: string | null;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
