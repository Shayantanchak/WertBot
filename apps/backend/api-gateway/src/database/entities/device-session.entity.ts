import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

// =============================================================================
// WertBot — Device Session Entity (TypeORM)
// Tracks refresh tokens per device — supports multi-device login + revocation
// Maps to: public.device_sessions table
// =============================================================================

@Entity('device_sessions')
@Index('idx_device_sessions_user_id', ['userId'])
@Index('idx_device_sessions_token_hash', ['tokenHash'])
export class DeviceSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({ type: 'varchar', length: 512, name: 'token_hash' })
  tokenHash!: string;  // SHA-256 hash of refresh token (never store raw)

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'device_id' })
  deviceId!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'device_name' })
  deviceName!: string | null;  // e.g., "Chrome on macOS"

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'ip_address' })
  ipAddress!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'user_agent' })
  userAgent!: string | null;

  @Column({ type: 'timestamp', name: 'expires_at' })
  expiresAt!: Date;

  @Column({ type: 'boolean', default: false, name: 'is_revoked' })
  isRevoked!: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'last_used_at' })
  lastUsedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;
}
