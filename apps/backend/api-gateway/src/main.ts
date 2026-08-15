import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('WertBot API Gateway');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('API_GATEWAY_PORT', 3000);
  const corsOrigins = configService.get<string>('CORS_ORIGINS', 'http://localhost:5173');

  // ─────────────────────────────────────────────────────────────────────────
  // Security Middleware
  // ─────────────────────────────────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    }),
  );

  // ─────────────────────────────────────────────────────────────────────────
  // CORS Configuration
  // ─────────────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: corsOrigins.split(',').map((o: string) => o.trim()),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-ID', 'X-Request-ID'],
    credentials: true,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Global Validation Pipe
  // ─────────────────────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,          // Strip unknown properties
      forbidNonWhitelisted: true,
      transform: true,          // Auto-transform types
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ─────────────────────────────────────────────────────────────────────────
  // API Prefix
  // ─────────────────────────────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ─────────────────────────────────────────────────────────────────────────
  // Swagger Documentation
  // ─────────────────────────────────────────────────────────────────────────
  if (configService.get('NODE_ENV') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('WertBot API')
      .setDescription(
        'Enterprise-grade AI Financial Ecosystem API — PFM, Trading, AI Advisory, Neobanking',
      )
      .setVersion('1.0.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'JWT-Auth',
      )
      .addTag('auth', 'Authentication & MFA')
      .addTag('transactions', 'Transaction Management & PFM')
      .addTag('ai', 'Gemini AI Advisory Chat')
      .addTag('trading', 'Algorithmic Trading Engine')
      .addTag('wallets', 'Multi-Currency Neobanking')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
    logger.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Graceful Shutdown
  // ─────────────────────────────────────────────────────────────────────────
  app.enableShutdownHooks();

  await app.listen(port);
  logger.log(`🚀 WertBot Gateway running on: http://localhost:${port}`);
  logger.log(`🌍 Environment: ${configService.get('NODE_ENV', 'development')}`);
}

bootstrap();
