import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WalletService } from './wallets/wallet.service';
import { BankingController } from './banking.controller';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
  ],
  controllers: [BankingController],
  providers: [WalletService],
  exports: [WalletService],
})
export class BankingModule {}
