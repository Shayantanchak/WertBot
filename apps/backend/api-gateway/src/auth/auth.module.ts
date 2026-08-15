import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { MfaService } from './mfa.service';
import { WebauthnService } from './webauthn.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { UserEntity } from '../database/entities/user.entity';
import { DeviceSessionEntity } from '../database/entities/device-session.entity';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '15m',
          issuer: 'wertbot',
          audience: 'wertbot-clients',
        },
      }),
    }),
    TypeOrmModule.forFeature([UserEntity, DeviceSessionEntity]),
  ],
  controllers: [AuthController],
  providers:   [AuthService, MfaService, WebauthnService, JwtStrategy, LocalStrategy],
  exports:     [AuthService, WebauthnService, JwtModule],
})
export class AuthModule {}
