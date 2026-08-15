import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '@wertbot/shared-types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET')!,
      issuer: 'wertbot',
      audience: 'wertbot-clients',
    });
  }

  async validate(payload: JwtPayload): Promise<{
    userId: string;
    email: string;
    sessionId: string;
    deviceId: string;
  }> {
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // TODO: Optionally check if session is still valid in Redis/DB
    // const session = await this.redisService.get(`session:${payload.sessionId}`);
    // if (!session) throw new UnauthorizedException('Session expired');

    return {
      userId: payload.sub,
      email: payload.email,
      sessionId: payload.sessionId || '',
      deviceId: payload.deviceId || '',
    };
  }
}
