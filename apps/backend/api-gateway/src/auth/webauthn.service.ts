import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../database/entities/user.entity';

@Injectable()
export class WebauthnService {
  private readonly rpName: string;
  private readonly rpID: string;
  private readonly origin: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRedis() private readonly redis: Redis,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {
    this.rpName = this.configService.get<string>('WEBAUTHN_RP_NAME', 'WertBot');
    this.rpID = this.configService.get<string>('WEBAUTHN_RP_ID', 'localhost');
    this.origin = this.configService.get<string>('WEBAUTHN_ORIGIN', 'http://localhost:5173');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Registration Options
  // ─────────────────────────────────────────────────────────────────────────
  async generateRegisterOptions(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const userCredentials = user.webauthnCredential || [];

    const options = await generateRegistrationOptions({
      rpName: this.rpName,
      rpID: this.rpID,
      userID: Buffer.from(user.id),
      userName: user.email,
      userDisplayName: user.fullName,
      // Exclude already registered credentials to prevent registering the same key twice
      excludeCredentials: userCredentials.map((cred) => ({
        id: cred.credentialID,
        type: 'public-key',
      })),
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'preferred',
      },
      attestationType: 'none',
    });

    // Store challenge in Redis with 5 min TTL
    await this.redis.set(
      `webauthn:challenge:register:${user.id}`,
      options.challenge,
      'EX',
      300,
    );

    return options;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Verify Registration
  // ─────────────────────────────────────────────────────────────────────────
  async verifyRegister(userId: string, body: any) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const expectedChallenge = await this.redis.get(`webauthn:challenge:register:${user.id}`);
    if (!expectedChallenge) {
      throw new BadRequestException('Registration challenge expired or not found');
    }
    await this.redis.del(`webauthn:challenge:register:${user.id}`);

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: body,
        expectedChallenge,
        expectedOrigin: this.origin,
        expectedRPID: this.rpID,
        requireUserVerification: false,
      });
    } catch (error: any) {
      throw new BadRequestException(`WebAuthn registration verification failed: ${error.message}`);
    }

    const { verified, registrationInfo } = verification;
    if (!verified || !registrationInfo) {
      throw new BadRequestException('WebAuthn verification failed');
    }

    const { credential } = registrationInfo;
    const { id, publicKey, counter, transports } = credential;

    // Save credential to user's credentials array
    const userCredentials = user.webauthnCredential || [];
    userCredentials.push({
      credentialID: id,
      credentialPublicKey: Buffer.from(publicKey).toString('base64url'),
      counter,
      transports: (transports || []) as string[],
    });

    user.webauthnCredential = userCredentials;
    await this.userRepo.save(user);

    return { success: true };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Authentication Options
  // ─────────────────────────────────────────────────────────────────────────
  async generateLoginOptions(email: string) {
    const user = await this.userRepo.findOne({ where: { email: email.toLowerCase() } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const userCredentials = user.webauthnCredential || [];

    const options = await generateAuthenticationOptions({
      rpID: this.rpID,
      allowCredentials: userCredentials.map((cred) => ({
        id: cred.credentialID,
        type: 'public-key' as const,
        transports: cred.transports as any,
      })),
      userVerification: 'preferred',
    });

    // Store challenge in Redis with 5 min TTL
    await this.redis.set(
      `webauthn:challenge:login:${user.id}`,
      options.challenge,
      'EX',
      300,
    );

    return options;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Verify Authentication
  // ─────────────────────────────────────────────────────────────────────────
  async verifyLogin(email: string, body: any) {
    const user = await this.userRepo.findOne({ where: { email: email.toLowerCase() } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const expectedChallenge = await this.redis.get(`webauthn:challenge:login:${user.id}`);
    if (!expectedChallenge) {
      throw new BadRequestException('Authentication challenge expired or not found');
    }
    await this.redis.del(`webauthn:challenge:login:${user.id}`);

    // Find the matching credential ID in user's saved credentials
    const credentialID = body.id;
    const storedCredential = user.webauthnCredential?.find(
      (cred) => cred.credentialID === credentialID,
    );

    if (!storedCredential) {
      throw new BadRequestException('Credential not recognized for this user');
    }

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: body,
        expectedChallenge,
        expectedOrigin: this.origin,
        expectedRPID: this.rpID,
        credential: {
          id: storedCredential.credentialID,
          publicKey: Buffer.from(storedCredential.credentialPublicKey, 'base64url'),
          counter: storedCredential.counter,
        },
        requireUserVerification: false,
      });
    } catch (error: any) {
      throw new BadRequestException(`WebAuthn authentication verification failed: ${error.message}`);
    }

    const { verified, authenticationInfo } = verification;
    if (!verified || !authenticationInfo) {
      throw new BadRequestException('WebAuthn verification failed');
    }

    // Update credential counter in DB
    storedCredential.counter = authenticationInfo.newCounter;
    await this.userRepo.save(user);

    return user;
  }
}
