import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';
import * as path from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('PFM-Service-Bootstrap');

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.GRPC,
    options: {
      package: 'wertbot.transaction',
      protoPath: path.join(__dirname, '../../../../libs/proto/transaction.proto'),
      url: `0.0.0.0:${process.env.PFM_GRPC_PORT || '50052'}`,
    },
  });

  await app.listen();
  logger.log(`🚀 WertBot PFM gRPC microservice running on port ${process.env.PFM_GRPC_PORT || '50052'}`);
}
bootstrap();
