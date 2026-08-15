import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CurrencyCode } from '@wertbot/shared-types';

const numericTransformer = {
  to: (value: number) => value,
  from: (value: string) => parseFloat(value),
};

@Entity('wallet_transfers')
export class WalletTransferEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({ type: 'text' })
  type!: 'sent' | 'received' | 'convert';

  @Column({ type: 'text' })
  name!: string;

  @Column({
    type: 'numeric',
    precision: 20,
    scale: 4,
    transformer: numericTransformer,
  })
  amount!: number;

  @Column({
    type: 'varchar',
    length: 10,
    enum: CurrencyCode,
  })
  currency!: CurrencyCode;

  @Column({ type: 'text' })
  date!: string;

  @Column({ type: 'text' })
  flag!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
