import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  OnModuleInit,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Client, ClientGrpc } from '@nestjs/microservices';
import { Transport } from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import * as path from 'path';
import { lastValueFrom, Observable } from 'rxjs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// gRPC client interface matching proto
interface GrpcTransactionService {
  getTransaction(data: { transactionId: string; userId: string }): Observable<any>;
  listTransactions(data: {
    userId: string;
    accountId?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    fromDate?: string;
    toDate?: string;
    category?: string;
  }): Observable<any>;
  createTransaction(data: {
    userId: string;
    accountId: string;
    type: string;
    amountMinor: string;
    currency: string;
    merchantName?: string;
    merchantMcc?: string;
    source?: string;
    transactionDate?: string;
  }): Observable<any>;
  updateTransactionStatus(data: { transactionId: string; newStatus: string }): Observable<any>;
  getBudgetStatus(data: { userId: string; category: string; period?: string }): Observable<any>;
  getCardRecommendation(data: {
    userId: string;
    merchantMcc: string;
    amountMinor: string;
    currency: string;
  }): Observable<any>;
}

@ApiTags('Transactions & PFM')
@Controller('api/v1/transactions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TransactionsController implements OnModuleInit {
  @Client({
    transport: Transport.GRPC,
    options: {
      package: 'wertbot.transaction',
      protoPath: path.join(__dirname, '../../../../../libs/proto/transaction.proto'),
      url: process.env.PFM_GRPC_URL || 'localhost:50052',
    },
  })
  private client!: ClientGrpc;

  private gService!: GrpcTransactionService;

  onModuleInit() {
    this.gService = this.client.getService<GrpcTransactionService>('TransactionService');
  }

  @Get()
  @ApiOperation({ summary: 'List transactions for the authenticated user (paginated)' })
  async listTransactions(
    @Request() req: any,
    @Query('accountId') accountId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('category') category?: string,
  ) {
    const res = await lastValueFrom(
      this.gService.listTransactions({
        userId: req.user.sub,
        accountId,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        fromDate,
        toDate,
        category,
      }),
    );
    return { success: true, data: res };
  }

  @Get('budget-status')
  @ApiOperation({ summary: 'Get budget status and AI savings suggestions for a category' })
  async getBudgetStatus(
    @Request() req: any,
    @Query('category') category: string,
    @Query('period') period?: string,
  ) {
    const res = await lastValueFrom(
      this.gService.getBudgetStatus({
        userId: req.user.sub,
        category,
        period,
      }),
    );
    return { success: true, data: res };
  }

  @Get('card-recommendation')
  @ApiOperation({ summary: 'Get optimal credit card reward recommendation for a merchant MCC' })
  async getCardRecommendation(
    @Request() req: any,
    @Query('merchantMcc') merchantMcc: string,
    @Query('amountMinor') amountMinor: string,
    @Query('currency') currency: string,
  ) {
    const res = await lastValueFrom(
      this.gService.getCardRecommendation({
        userId: req.user.sub,
        merchantMcc,
        amountMinor,
        currency,
      }),
    );
    return { success: true, data: res };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transaction details by ID' })
  async getTransaction(@Request() req: any, @Param('id') id: string) {
    const res = await lastValueFrom(
      this.gService.getTransaction({
        transactionId: id,
        userId: req.user.sub,
      }),
    );
    return { success: true, data: res };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Manually record a transaction (debit/credit)' })
  async createTransaction(
    @Request() req: any,
    @Body()
    body: {
      accountId: string;
      type: string;
      amountMinor: string;
      currency: string;
      merchantName?: string;
      merchantMcc?: string;
      source?: string;
      transactionDate?: string;
    },
  ) {
    const res = await lastValueFrom(
      this.gService.createTransaction({
        userId: req.user.sub,
        ...body,
      }),
    );
    return { success: true, data: res };
  }
}
