import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { BankingModule } from './banking.module';

async function bootstrap() {
  const app = await NestFactory.create(BankingModule);
  app.enableCors();
  const configService = app.get(ConfigService);
  const port = configService.get<number>('BANKING_SERVICE_PORT', 3004);
  await app.listen(port);
  console.log(`🏦 Banking Service listening on port ${port}`);
}

bootstrap();
