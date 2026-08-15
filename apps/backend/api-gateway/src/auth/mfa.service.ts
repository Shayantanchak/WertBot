import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import * as crypto from 'crypto';

@Injectable()
export class MfaService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Generate a new TOTP secret and backup codes for a user.
   */
  async generateSecret(email: string): Promise<{
    secret: string;
    otpAuthUrl: string;
    backupCodes: string[];
  }> {
    const issuer = this.configService.get<string>('TOTP_ISSUER', 'WertBot');

    const secretObject = speakeasy.generateSecret({
      name: `${issuer}:${email}`,
      issuer,
      length: 32,
    });

    // Generate 10 random 8-character alphanumeric backup codes
    const backupCodes: string[] = [];
    for (let i = 0; i < 10; i++) {
      backupCodes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }

    return {
      secret: secretObject.base32,
      otpAuthUrl: secretObject.otpauth_url!,
      backupCodes,
    };
  }

  /**
   * Verify a TOTP code against the user's secret.
   */
  async verifyToken(secret: string, token: string): Promise<boolean> {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1, // Allow ±30s clock drift
    });
  }

  /**
   * Generate a QR code data URL for authenticator setup.
   */
  async generateQrCode(otpAuthUrl: string): Promise<string> {
    return qrcode.toDataURL(otpAuthUrl);
  }
}
