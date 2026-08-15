import { Controller, Get, Post, Body } from '@nestjs/common';
import { WalletService, WalletTransferDto } from './wallets/wallet.service';

@Controller('banking')
export class BankingController {
  constructor(private readonly walletService: WalletService) {}

  @Get('wallets')
  async getBalances() {
    return {
      success: true,
      data: await this.walletService.getBalances(),
      transfers: await this.walletService.getTransfers(),
    };
  }

  @Post('deposit')
  async deposit(@Body() body: { currency: string; amount: number }) {
    return await this.walletService.deposit(body.currency, body.amount);
  }

  @Post('transfer')
  async sendMoney(@Body() dto: WalletTransferDto) {
    return await this.walletService.sendMoney(dto);
  }

  @Post('convert')
  async convert(@Body() body: { fromCurrency: string; toCurrency: string; amount: number }) {
    return await this.walletService.convertCurrency(body.fromCurrency, body.toCurrency, body.amount);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Primary Ingress Driver: Open Banking / Plaid Webhooks
  // ─────────────────────────────────────────────────────────────────────────
  @Post('webhooks/open-banking')
  async handleOpenBankingWebhook(@Body() body: {
    webhookType: string;
    itemId: string;
    newTransactionsCount: number;
    transactions?: Array<{ id: string; amountMinor: number; merchantName: string; mcc: string; currency: string }>;
  }) {
    return {
      success: true,
      ingressDriver: 'open_banking_webhook_primary',
      processedCount: body.newTransactionsCount || (body.transactions ? body.transactions.length : 0),
      timestamp: new Date().toISOString(),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Secondary Ingress Driver: Android SMS Scraping Fallback
  // ─────────────────────────────────────────────────────────────────────────
  @Post('transactions/sms-scrape')
  async handleSmsScrapeFallback(@Body() body: {
    rawSms: string;
    sender: string;
    receivedAt: string;
    platform: 'android';
  }) {
    return {
      success: true,
      ingressDriver: 'android_sms_fallback',
      status: 'scraped_and_queued',
      timestamp: new Date().toISOString(),
    };
  }
}
