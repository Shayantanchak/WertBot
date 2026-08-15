import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';
import * as path from 'path';
import { TradingModule } from './trading.module';

async function bootstrap() {
  const logger = new Logger('Trading-Service-Bootstrap');

  // Create hybrid app supporting HTTP/WS + gRPC
  const app = await NestFactory.create(TradingModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'wertbot.trading',
      protoPath: path.join(__dirname, '../../../libs/proto/trading.proto'),
      url: `0.0.0.0:${process.env.TRADING_GRPC_PORT || '50053'}`,
    },
  });

  await app.startAllMicroservices();

  const port = process.env.TRADING_HTTP_PORT || 3003;
  await app.listen(port);

  logger.log(`🚀 WertBot Trading Service running:`);
  logger.log(`   - gRPC server: 0.0.0.0:${process.env.TRADING_GRPC_PORT || '50053'}`);
  logger.log(`   - HTTP/WS server: http://localhost:${port}/ws/trading`);
}

bootstrap().catch((err) => {
  console.error('Fatal bootstrap error in Trading Service:', err);
  process.exit(1);
});
