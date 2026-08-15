import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('credit_cards')
@Index('idx_credit_cards_user_id', ['userId'])
export class CreditCardEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({ type: 'varchar', length: 100, name: 'card_name' })
  cardName!: string;

  @Column({ type: 'varchar', length: 50, name: 'card_network' })
  cardNetwork!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  issuer!: string | null;

  @Column({ type: 'varchar', length: 4, nullable: true, name: 'last_four' })
  lastFour!: string | null;

  @Column({ type: 'jsonb', default: {}, name: 'reward_categories' })
  rewardCategories!: Record<string, number>; // e.g. {"dining": 4, "groceries": 4}

  @Column({ type: 'jsonb', default: {}, name: 'mcc_multipliers' })
  mccMultipliers!: Record<string, number>; // e.g. {"5812": 4, "5411": 4}

  @Column({ type: 'integer', default: 0, name: 'annual_fee_minor' })
  annualFeeMinor!: number;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
