import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { CurrencyCode } from '@wertbot/shared-types';

@Entity('budgets')
@Index('idx_budgets_user_id', ['userId'])
export class BudgetEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({ type: 'varchar', length: 100 })
  category!: string;

  @Column({ type: 'bigint', name: 'amount_minor' })
  amountMinor!: number;

  @Column({
    type: 'varchar',
    length: 10,
    enum: CurrencyCode,
    default: CurrencyCode.USD,
  })
  currency!: CurrencyCode;

  @Column({ type: 'varchar', length: 50, default: 'monthly' })
  period!: string;

  @Column({ type: 'date', name: 'start_date' })
  startDate!: Date;

  @Column({ type: 'date', nullable: true, name: 'end_date' })
  endDate!: Date | null;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 80.0, name: 'alert_threshold' })
  alertThreshold!: number;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
