import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { AiSessionType } from '@wertbot/shared-types';

@Entity('ai_context_cache')
@Index('idx_ai_context_user_session', ['userId', 'sessionType', 'sessionId'], { unique: true })
export class AiContextEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({
    type: 'varchar',
    length: 50,
    enum: AiSessionType,
    name: 'session_type',
  })
  sessionType!: AiSessionType;

  @Column({ type: 'varchar', length: 255, name: 'session_id' })
  sessionId!: string;

  @Column({ type: 'jsonb', default: '[]' })
  messages!: Array<{ role: string; content: string; timestamp: string }>;

  @Column({ type: 'jsonb', default: {} })
  insights!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
