import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { CardMatrixService } from '../cards/card-matrix.service';
import { TransactionEntity } from '../database/entities/transaction.entity';
import { AccountEntity } from '../database/entities/account.entity';
import { BudgetEntity } from '../database/entities/budget.entity';
import { CreditCardEntity } from '../database/entities/credit-card.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TransactionEntity,
      AccountEntity,
      BudgetEntity,
      CreditCardEntity,
    ]),
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService, CardMatrixService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
