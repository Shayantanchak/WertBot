import {
  Injectable,
  Logger,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UserEntity } from '../database/entities/user.entity';
import { DeviceSessionEntity } from '../database/entities/device-session.entity';
import { MfaService } from './mfa.service';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
} from './dto/auth.dto';
import { AuthTokensDto, User, UserRole } from '@wertbot/shared-types';

// =============================================================================
// WertBot — AuthService (Production-ready, PostgreSQL + Redis backed)
//
// Flow:
//   Register → hash password → save user → send verify email (TODO)
//   Login    → validate creds → check MFA → issue JWT pair → store refresh in Redis + DB
//   Refresh  → validate hash in DB/Redis → rotate tokens
//   Logout   → revoke session in DB + Redis
// =============================================================================

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_TTL  = '15m';   // Short-lived
const REFRESH_TOKEN_TTL = 60 * 60 * 24 * 30; // 30 days (seconds, for Redis)

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,

    @InjectRepository(DeviceSessionEntity)
    private readonly sessionRepo: Repository<DeviceSessionEntity>,

    @InjectRedis()
    private readonly redis: Redis,

    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mfaService: MfaService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // Register
  // ─────────────────────────────────────────────────────────────────────────

  async register(dto: RegisterDto): Promise<{ user: Partial<User>; message: string }> {
    // Check for existing user
    const existing = await this.userRepo.findOne({ where: { email: dto.email.toLowerCase() } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    // Create user
    const user = this.userRepo.create({
      email: dto.email.toLowerCase().trim(),
      passwordHash,
      fullName: dto.fullName.trim(),
      phone: dto.phone ?? null,
      role: UserRole.USER,
      isEmailVerified: false,
      isMfaEnabled: false,
    });

    await this.userRepo.save(user);
    this.logger.log(`New user registered: ${user.email} (${user.id})`);

    // TODO: Send verification email via email service

    return {
      user: this.toPublicUser(user),
      message: 'Registration successful. Please verify your email.',
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Login
  // ─────────────────────────────────────────────────────────────────────────

  async login(
    dto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthTokensDto & { user: Partial<User>; requiresMfa?: boolean }> {
    // Find user
    const user = await this.userRepo.findOne({
      where: { email: dto.email.toLowerCase(), isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Verify password
    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // MFA check
    if (user.isMfaEnabled) {
      if (!dto.totpCode) {
        // Return intermediate state — client must submit TOTP
        return {
          requiresMfa: true,
          accessToken:  '',
          refreshToken: '',
          expiresIn:    0,
          tokenType:    'Bearer',
          user: this.toPublicUser(user),
        };
      }
      const mfaValid = await this.mfaService.verifyToken(user.mfaSecret!, dto.totpCode);
      if (!mfaValid) {
        throw new UnauthorizedException('Invalid MFA code');
      }
    }

    // Update last login
    await this.userRepo.update(user.id, { lastLoginAt: new Date() });

    // Issue tokens
    const tokens = await this.issueTokens(user, dto.deviceId, ipAddress, userAgent);
    this.logger.log(`User logged in: ${user.email}`);

    return { ...tokens, user: this.toPublicUser(user), requiresMfa: false };
  }

  async loginWithWebauthnUser(
    user: UserEntity,
    deviceId?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthTokensDto & { user: Partial<User>; requiresMfa?: boolean }> {
    // Update last login
    await this.userRepo.update(user.id, { lastLoginAt: new Date() });

    // Issue tokens
    const tokens = await this.issueTokens(user, deviceId, ipAddress, userAgent);
    this.logger.log(`User logged in via WebAuthn: ${user.email}`);

    return { ...tokens, user: this.toPublicUser(user), requiresMfa: false };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Validate User (used by Local Strategy)
  // ─────────────────────────────────────────────────────────────────────────

  async validateUser(email: string, password: string): Promise<UserEntity | null> {
    const user = await this.userRepo.findOne({
      where: { email: email.toLowerCase(), isActive: true },
    });
    if (!user) return null;
    const valid = await bcrypt.compare(password, user.passwordHash);
    return valid ? user : null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Refresh Tokens
  // ─────────────────────────────────────────────────────────────────────────

  async refresh(dto: RefreshTokenDto): Promise<AuthTokensDto> {
    // Hash incoming refresh token
    const tokenHash = this.hashToken(dto.refreshToken);

    // Look up session
    const session = await this.sessionRepo.findOne({
      where: { tokenHash, isRevoked: false },
      relations: ['user'],
    });

    if (!session) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (new Date() > session.expiresAt) {
      await this.sessionRepo.update(session.id, { isRevoked: true });
      throw new UnauthorizedException('Refresh token has expired. Please log in again.');
    }

    // Rotate: revoke old session
    await this.sessionRepo.update(session.id, { isRevoked: true });
    await this.redis.del(`wertbot:session:${tokenHash}`);

    // Issue new token pair
    return this.issueTokens(session.user, session.deviceId ?? undefined);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Logout
  // ─────────────────────────────────────────────────────────────────────────

  async logout(userId: string, refreshToken?: string, revokeAll = false): Promise<void> {
    if (revokeAll) {
      // Revoke all sessions for this user
      await this.sessionRepo.update({ userId, isRevoked: false }, { isRevoked: true });
      // Delete all Redis session keys for this user
      const keys = await this.redis.keys(`wertbot:session:${userId}:*`);
      if (keys.length > 0) await this.redis.del(...keys);
    } else if (refreshToken) {
      const tokenHash = this.hashToken(refreshToken);
      await this.sessionRepo.update({ tokenHash }, { isRevoked: true });
      await this.redis.del(`wertbot:session:${tokenHash}`);
    }
    this.logger.log(`User logged out: ${userId}${revokeAll ? ' (all sessions)' : ''}`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Get Current User
  // ─────────────────────────────────────────────────────────────────────────

  async getUserById(userId: string): Promise<Partial<User>> {
    const user = await this.userRepo.findOne({ where: { id: userId, isActive: true } });
    if (!user) throw new NotFoundException('User not found');
    return this.toPublicUser(user);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MFA Setup
  // ─────────────────────────────────────────────────────────────────────────

  async setupMfa(userId: string): Promise<{ secret: string; qrCodeDataUrl: string; backupCodes: string[] }> {
    const user = await this.userRepo.findOneOrFail({ where: { id: userId } });
    const { secret, otpAuthUrl, backupCodes } = await this.mfaService.generateSecret(user.email);
    const qrCodeDataUrl = await this.mfaService.generateQrCode(otpAuthUrl);

    // Store secret temporarily (not activated until verify)
    await this.redis.setex(`wertbot:mfa:setup:${userId}`, 600, JSON.stringify({ secret, backupCodes }));

    return { secret, qrCodeDataUrl, backupCodes };
  }

  async activateMfa(userId: string, totpCode: string): Promise<{ message: string }> {
    const raw = await this.redis.get(`wertbot:mfa:setup:${userId}`);
    if (!raw) throw new BadRequestException('MFA setup session expired. Please start again.');

    const { secret, backupCodes } = JSON.parse(raw) as { secret: string; backupCodes: string[] };
    const valid = await this.mfaService.verifyToken(secret, totpCode);
    if (!valid) throw new UnauthorizedException('Invalid TOTP code');

    await this.userRepo.update(userId, {
      mfaSecret:      secret,
      isMfaEnabled:   true,
      mfaBackupCodes: JSON.stringify(backupCodes),
    });

    await this.redis.del(`wertbot:mfa:setup:${userId}`);
    this.logger.log(`MFA activated for user: ${userId}`);
    return { message: 'MFA enabled successfully. Store your backup codes safely.' };
  }

  async disableMfa(userId: string, totpCode: string): Promise<{ message: string }> {
    const user = await this.userRepo.findOneOrFail({ where: { id: userId } });
    if (!user.isMfaEnabled || !user.mfaSecret) {
      throw new BadRequestException('MFA is not enabled');
    }
    const valid = await this.mfaService.verifyToken(user.mfaSecret, totpCode);
    if (!valid) throw new UnauthorizedException('Invalid TOTP code');

    await this.userRepo.update(userId, {
      mfaSecret: null, isMfaEnabled: false, mfaBackupCodes: null,
    });
    return { message: 'MFA disabled successfully' };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private Helpers
  // ─────────────────────────────────────────────────────────────────────────

  private async issueTokens(
    user: UserEntity,
    deviceId?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthTokensDto> {
    const payload = {
      sub:   user.id,
      email: user.email,
      role:  user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: ACCESS_TOKEN_TTL,
      issuer:    'wertbot',
      audience:  'wertbot-clients',
    });

    // Generate opaque refresh token
    const rawRefreshToken = crypto.randomBytes(64).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL * 1000);

    // Save session to DB
    const session = this.sessionRepo.create({
      userId:    user.id,
      tokenHash,
      deviceId:  deviceId ?? null,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      expiresAt,
      lastUsedAt: new Date(),
    });
    await this.sessionRepo.save(session);

    // Cache in Redis for fast validation
    await this.redis.setex(
      `wertbot:session:${tokenHash}`,
      REFRESH_TOKEN_TTL,
      JSON.stringify({ userId: user.id, sessionId: session.id }),
    );

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn:    15 * 60, // 15 min in seconds
      tokenType: 'Bearer',
    };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private toPublicUser(user: UserEntity): Partial<User> {
    return {
      id:              user.id,
      email:           user.email,
      fullName:        user.fullName,
      phone:           user.phone ?? undefined,
      role:            user.role as UserRole,
      isEmailVerified: user.isEmailVerified,
      isMfaEnabled:    user.isMfaEnabled,
      createdAt:       user.createdAt,
      updatedAt:       user.updatedAt,
    };
  }
}
