import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionsModule } from './transactions/transactions.module';
import { SmsParserModule } from './sms/sms-parser.module';
import { AccountEntity } from './database/entities/account.entity';
import { TransactionEntity } from './database/entities/transaction.entity';
import { BudgetEntity } from './database/entities/budget.entity';
import { CreditCardEntity } from './database/entities/credit-card.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USER', 'wertbot_user'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME', 'wertbot'),
        entities: [
          AccountEntity,
          TransactionEntity,
          BudgetEntity,
          CreditCardEntity,
        ],
        synchronize: false, // Use database migrations instead
        logging: config.get<string>('NODE_ENV') === 'development',
      }),
    }),
    TransactionsModule,
    SmsParserModule,
  ],
})
export class AppModule {}
