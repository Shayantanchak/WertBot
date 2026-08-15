import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { UserRole } from '@wertbot/shared-types';

// =============================================================================
// WertBot — User Entity (TypeORM)
// Maps to: public.users table
// =============================================================================

@Entity('users')
@Index('idx_users_email', ['email'], { unique: true })
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255, name: 'password_hash' })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 100, name: 'full_name' })
  fullName!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone!: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: UserRole.USER,
    enum: UserRole,
  })
  role!: UserRole;

  @Column({ type: 'boolean', default: false, name: 'is_email_verified' })
  isEmailVerified!: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_mfa_enabled' })
  isMfaEnabled!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'mfa_secret' })
  mfaSecret!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'mfa_backup_codes' })
  mfaBackupCodes!: string | null; // JSON-encoded array

  @Column({ type: 'jsonb', nullable: true, name: 'webauthn_credential' })
  webauthnCredential!: Array<{
    credentialID: string;
    credentialPublicKey: string;
    counter: number;
    transports?: string[];
  }> | null;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'last_login_at' })
  lastLoginAt!: Date | null;

  @Column({ type: 'jsonb', default: {}, name: 'preferences' })
  preferences!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
