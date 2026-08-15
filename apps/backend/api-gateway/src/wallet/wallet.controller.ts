import { Controller, Get, Post, Body } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller('wallet')
export class WalletController {
  private bankingServiceUrl: string;

  private fallbackBalances = [
    { currency: 'USD', flag: '🇺🇸', balance: 12450.00, reserved: 500, rateToUSD: 1.0000 },
    { currency: 'EUR', flag: '🇪🇺', balance: 4820.50, reserved: 0, rateToUSD: 0.9186 },
    { currency: 'GBP', flag: '🇬🇧', balance: 2100.00, reserved: 0, rateToUSD: 0.7834 },
    { currency: 'INR', flag: '🇮🇳', balance: 185000, reserved: 0, rateToUSD: 83.4250 },
    { currency: 'BTC', flag: '₿', balance: 0.5, reserved: 0, rateToUSD: 67240 },
    { currency: 'ETH', flag: 'Ξ', balance: 3.2, reserved: 0, rateToUSD: 3520 },
  ];

  private fallbackTransfers: Array<{
    id: string;
    type: 'sent' | 'received' | 'convert';
    name: string;
    amount: number;
    currency: string;
    date: string;
    flag: string;
  }> = [
    { id: 'tx_1', type: 'sent', name: 'Alice Johnson', amount: 500, currency: 'USD', date: 'Today, 3:12 PM', flag: '🇺🇸' },
    { id: 'tx_2', type: 'received', name: 'Bob Smith', amount: 1200, currency: 'GBP', date: 'Yesterday', flag: '🇬🇧' },
    { id: 'tx_3', type: 'sent', name: 'Priya Nair', amount: 50000, currency: 'INR', date: 'Jul 15', flag: '🇮🇳' },
    { id: 'tx_4', type: 'received', name: 'Crypto Rewards', amount: 0.01, currency: 'BTC', date: 'Jul 14', flag: '₿' },
  ];

  constructor(private readonly configService: ConfigService) {
    const port = this.configService.get<number>('BANKING_SERVICE_PORT', 3004);
    const host = this.configService.get<string>('BANKING_SERVICE_HOST', 'localhost');
    this.bankingServiceUrl = `http://${host}:${port}/banking`;
  }

  @Get('balance')
  async getBalances() {
    try {
      const res = await fetch(`${this.bankingServiceUrl}/wallets`);
      if (!res.ok) throw new Error('Unreachable');
      const json = (await res.json()) as any;
      return {
        success: true,
        data: {
          balances: json.data,
          transfers: json.transfers,
        },
      };
    } catch {
      return {
        success: true,
        data: {
          balances: this.fallbackBalances,
          transfers: this.fallbackTransfers,
        },
      };
    }
  }

  @Post('transfer')
  async transfer(@Body() body: { recipientName: string; amount: number; currency: string }) {
    try {
      const res = await fetch(`${this.bankingServiceUrl}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromCurrency: body.currency,
          toCurrency: body.currency,
          amount: body.amount,
          recipientName: body.recipientName,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }
      return await res.json();
    } catch {
      const target = this.fallbackBalances.find((b) => b.currency === body.currency);
      if (target && target.balance >= body.amount) {
        target.balance -= body.amount;
      }
      const newTx = {
        id: 'tx_' + Date.now(),
        type: 'sent' as const,
        name: body.recipientName || 'External Account',
        amount: body.amount,
        currency: body.currency,
        date: 'Just now',
        flag: target?.flag || '🌐',
      };
      this.fallbackTransfers.unshift(newTx);
      return {
        success: true,
        message: `Transferred ${body.amount} ${body.currency} to ${body.recipientName} (Fallback)`,
        data: newTx,
      };
    }
  }

  @Post('deposit')
  async deposit(@Body() body: { currency: string; amount: number }) {
    try {
      const res = await fetch(`${this.bankingServiceUrl}/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }
      return await res.json();
    } catch {
      const target = this.fallbackBalances.find((b) => b.currency === body.currency);
      if (target) {
        target.balance += body.amount;
      }
      const newTx = {
        id: 'tx_' + Date.now(),
        type: 'received' as const,
        name: `Deposit (${body.currency})`,
        amount: body.amount,
        currency: body.currency,
        date: 'Just now',
        flag: target?.flag || '🌐',
      };
      this.fallbackTransfers.unshift(newTx);
      return {
        success: true,
        message: `Deposited ${body.amount} ${body.currency} (Fallback)`,
        data: newTx,
      };
    }
  }

  @Post('convert')
  async convert(@Body() body: { fromCurrency: string; toCurrency: string; amount: number }) {
    try {
      const res = await fetch(`${this.bankingServiceUrl}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }
      return await res.json();
    } catch {
      const fromW = this.fallbackBalances.find((b) => b.currency === body.fromCurrency);
      const toW = this.fallbackBalances.find((b) => b.currency === body.toCurrency);
      if (fromW && toW && fromW.balance >= body.amount) {
        const amountInUSD = body.fromCurrency === 'USD' ? body.amount : body.amount / fromW.rateToUSD;
        const convertedValue = body.toCurrency === 'USD' ? amountInUSD : amountInUSD * toW.rateToUSD;

        fromW.balance -= body.amount;
        toW.balance += convertedValue;

        const newTx = {
          id: 'tx_' + Date.now(),
          type: 'convert' as const,
          name: `FX Convert (${body.fromCurrency} → ${body.toCurrency})`,
          amount: convertedValue,
          currency: body.toCurrency,
          date: 'Just now',
          flag: toW.flag || '🌐',
        };
        this.fallbackTransfers.unshift(newTx);
        return {
          success: true,
          message: `Converted ${body.fromCurrency} ${body.amount} into ${body.toCurrency} (Fallback)`,
          data: newTx,
        };
      }
      return { success: false, message: 'Conversion failed' };
    }
  }
}
