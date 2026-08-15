import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Ip,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { WebauthnService } from './webauthn.service';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  MfaVerifyDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';

// =============================================================================
// WertBot — Auth Controller
// Base path: /api/v1/auth
// =============================================================================

@ApiTags('Authentication')
@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly webauthnService: WebauthnService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // POST /api/v1/auth/register
  // ─────────────────────────────────────────────────────────────────────────

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ short: { limit: 3, ttl: 60000 } })   // 3 registrations per minute per IP
  @ApiOperation({ summary: 'Register a new WertBot account' })
  @ApiResponse({ status: 201, description: 'Account created successfully' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  @ApiBody({ type: RegisterDto })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // POST /api/v1/auth/login
  // ─────────────────────────────────────────────────────────────────────────

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 5, ttl: 60000 } })   // 5 login attempts per minute
  @ApiOperation({ summary: 'Log in with email + password (+ optional TOTP)' })
  @ApiResponse({ status: 200, description: 'Login successful, tokens returned' })
  @ApiResponse({ status: 401, description: 'Invalid credentials or MFA code' })
  @ApiBody({ type: LoginDto })
  async login(
    @Body() dto: LoginDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.authService.login(dto, ip, userAgent);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // POST /api/v1/auth/refresh
  // ─────────────────────────────────────────────────────────────────────────

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate JWT access + refresh tokens' })
  @ApiResponse({ status: 200, description: 'New token pair returned' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // POST /api/v1/auth/logout
  // ─────────────────────────────────────────────────────────────────────────

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke current session (or all sessions)' })
  async logout(
    @Request() req: { user: { sub: string } },
    @Body() body: { refreshToken?: string; revokeAll?: boolean },
  ) {
    return this.authService.logout(req.user.sub, body.refreshToken, body.revokeAll);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GET /api/v1/auth/me
  // ─────────────────────────────────────────────────────────────────────────

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({ status: 200, description: 'User profile returned' })
  async me(@Request() req: { user: { sub: string } }) {
    return this.authService.getUserById(req.user.sub);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MFA Endpoints
  // ─────────────────────────────────────────────────────────────────────────

  @Post('mfa/setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate TOTP secret + QR code for MFA setup' })
  async mfaSetup(@Request() req: { user: { sub: string } }) {
    return this.authService.setupMfa(req.user.sub);
  }

  @Post('mfa/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify TOTP code to activate MFA' })
  @ApiBody({ type: MfaVerifyDto })
  async mfaVerify(
    @Request() req: { user: { sub: string } },
    @Body() dto: MfaVerifyDto,
  ) {
    return this.authService.activateMfa(req.user.sub, dto.totpCode);
  }

  @Post('mfa/disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable MFA (requires current TOTP code to confirm)' })
  @ApiBody({ type: MfaVerifyDto })
  async mfaDisable(
    @Request() req: { user: { sub: string } },
    @Body() dto: MfaVerifyDto,
  ) {
    return this.authService.disableMfa(req.user.sub, dto.totpCode);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // WebAuthn/Passkey MFA Endpoints
  // ─────────────────────────────────────────────────────────────────────────

  @Get('mfa/webauthn/register-options')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate WebAuthn registration options for a user' })
  async registerOptions(@Request() req: { user: { sub: string } }) {
    return this.webauthnService.generateRegisterOptions(req.user.sub);
  }

  @Post('mfa/webauthn/register-verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify WebAuthn registration response' })
  async registerVerify(
    @Request() req: { user: { sub: string } },
    @Body() body: any,
  ) {
    return this.webauthnService.verifyRegister(req.user.sub, body);
  }

  @Post('mfa/webauthn/login-options')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate WebAuthn login options (assertion)' })
  async loginOptions(@Body() body: { email: string }) {
    return this.webauthnService.generateLoginOptions(body.email);
  }

  @Post('mfa/webauthn/login-verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify WebAuthn login assertion and issue tokens' })
  async loginVerify(
    @Body() body: { email: string; credentialResponse: any; deviceId?: string },
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const user = await this.webauthnService.verifyLogin(body.email, body.credentialResponse);
    return this.authService.loginWithWebauthnUser(user, body.deviceId, ip, userAgent);
  }
}
