import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';
import * as path from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('AI-Service-Bootstrap');

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.GRPC,
    options: {
      package: 'wertbot.ai',
      protoPath: path.join(__dirname, '../../../../libs/proto/ai.proto'),
      url: `0.0.0.0:${process.env.AI_GRPC_PORT || '50053'}`,
    },
  });

  await app.listen();
  logger.log(`🚀 WertBot AI gRPC microservice running on port ${process.env.AI_GRPC_PORT || '50053'}`);
}
bootstrap();
