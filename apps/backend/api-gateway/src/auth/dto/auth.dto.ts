import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
  IsNumberString,
  Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// =============================================================================
// WertBot — Auth DTOs with class-validator decorators
// These enforce input validation at the API Gateway level
// =============================================================================

export class RegisterDto {
  @ApiProperty({ example: 'alex@example.com' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email!: string;

  @ApiProperty({ example: 'SecureP@ssw0rd!', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    { message: 'Password must include uppercase, lowercase, number, and special character' },
  )
  password!: string;

  @ApiProperty({ example: 'Alex Johnson' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName!: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'alex@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'SecureP@ssw0rd!' })
  @IsString()
  @MinLength(1)
  password!: string;

  @ApiPropertyOptional({ example: 'device_abc123' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  deviceId?: string;

  @ApiPropertyOptional({ description: 'TOTP code (6 digits) if MFA is enabled', example: '123456' })
  @IsOptional()
  @IsNumberString()
  @Length(6, 6, { message: 'TOTP code must be exactly 6 digits' })
  totpCode?: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @MinLength(10)
  refreshToken!: string;
}

export class MfaVerifyDto {
  @ApiProperty({ description: '6-digit TOTP code', example: '123456' })
  @IsNumberString()
  @Length(6, 6, { message: 'TOTP code must be exactly 6 digits' })
  totpCode!: string;
}

export class MfaBackupDto {
  @ApiProperty({ description: '8-character backup code', example: 'AB12CD34' })
  @IsString()
  @Length(8, 8)
  backupCode!: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'alex@example.com' })
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  token!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    { message: 'Password must include uppercase, lowercase, number, and special character' },
  )
  newPassword!: string;
}
