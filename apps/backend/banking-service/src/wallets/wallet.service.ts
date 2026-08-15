import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CurrencyCode } from '@wertbot/shared-types';
import { UserEntity } from '../database/entities/user.entity';
import { MultiCurrencyWalletEntity } from '../database/entities/wallet.entity';
import { WalletTransferEntity } from '../database/entities/transfer.entity';

export interface WalletBalance {
  currency: string;
  flag: string;
  balance: number;
  reserved: number;
  rateToUSD: number;
}

export interface WalletTransferDto {
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  recipientName?: string;
  recipientAccount?: string;
}

@Injectable()
export class WalletService {
  private rates: Record<string, number> = {
    USD: 1.0,
    EUR: 0.9186,
    GBP: 0.7834,
    INR: 83.425,
    BTC: 0.0000148,
    ETH: 0.000284,
  };

  private flags: Record<string, string> = {
    USD: '🇺🇸',
    EUR: '🇪🇺',
    GBP: '🇬🇧',
    INR: '🇮🇳',
    BTC: '₿',
    ETH: 'Ξ',
  };

  // Dual-mode: In-Memory Fallback State (used if PostgreSQL is offline)
  private inMemoryBalances: Record<string, number> = {
    USD: 12450.0,
    EUR: 4820.5,
    GBP: 2100.0,
    INR: 185000,
    BTC: 0.5,
    ETH: 3.2,
  };

  private inMemoryTransfers: Array<{
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

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(MultiCurrencyWalletEntity)
    private readonly walletRepository: Repository<MultiCurrencyWalletEntity>,
    @InjectRepository(WalletTransferEntity)
    private readonly transferRepository: Repository<WalletTransferEntity>,
  ) {}

  private get useDb(): boolean {
    return this.dataSource && this.dataSource.isInitialized;
  }

  private getFactor(currency: string): number {
    const curr = currency.toUpperCase();
    if (curr === 'BTC' || curr === 'ETH') {
      return 100000000; // 8 decimal places
    }
    return 100; // 2 decimal places for fiat
  }

  private minorToMajor(amountMinor: number | string, currency: string): number {
    const val = typeof amountMinor === 'string' ? parseInt(amountMinor, 10) : Number(amountMinor);
    return val / this.getFactor(currency);
  }

  private majorToMinor(amountMajor: number, currency: string): number {
    return Math.round(amountMajor * this.getFactor(currency));
  }

  private async getOrCreateUser(): Promise<UserEntity> {
    let user = await this.userRepository.findOne({ where: { email: 'alex@example.com' } });
    if (!user) {
      user = await this.userRepository.findOne({ where: {} });
    }
    if (!user) {
      user = this.userRepository.create({
        email: 'alex@example.com',
        fullName: 'Alex Johnson',
        isActive: true,
      });
      await this.userRepository.save(user);
    }
    return user;
  }

  private async ensureWalletsExist(userId: string): Promise<MultiCurrencyWalletEntity[]> {
    const existing = await this.walletRepository.find({ where: { userId } });
    const currencies = Object.keys(this.inMemoryBalances);
    
    if (existing.length < currencies.length) {
      const existingCurrs = new Set(existing.map(w => w.currency));
      const newWallets: MultiCurrencyWalletEntity[] = [];
      
      for (const curr of currencies) {
        if (!existingCurrs.has(curr as CurrencyCode)) {
          const w = this.walletRepository.create({
            userId,
            currency: curr as CurrencyCode,
            balanceMinor: this.majorToMinor(this.inMemoryBalances[curr], curr),
            reservedMinor: curr === 'USD' ? this.majorToMinor(500, curr) : 0,
            iban: curr === 'EUR' ? 'EE802200220123456789' : null,
            accountNumber: curr === 'USD' ? '1234567890' : null,
            routingNumber: curr === 'USD' ? '021000021' : null,
            isActive: true,
          });
          newWallets.push(w);
        }
      }
      
      if (newWallets.length > 0) {
        await this.walletRepository.save(newWallets);
        return await this.walletRepository.find({ where: { userId } });
      }
    }
    
    return existing;
  }

  async getBalances(): Promise<WalletBalance[]> {
    if (!this.useDb) {
      return Object.keys(this.inMemoryBalances).map((curr) => ({
        currency: curr,
        flag: this.flags[curr] || '🌐',
        balance: this.inMemoryBalances[curr],
        reserved: curr === 'USD' ? 500 : 0,
        rateToUSD: this.rates[curr] || 1.0,
      }));
    }

    const user = await this.getOrCreateUser();
    const wallets = await this.ensureWalletsExist(user.id);
    
    return wallets.map((w) => ({
      currency: w.currency,
      flag: this.flags[w.currency] || '🌐',
      balance: this.minorToMajor(w.balanceMinor, w.currency),
      reserved: this.minorToMajor(w.reservedMinor, w.currency),
      rateToUSD: this.rates[w.currency] || 1.0,
    }));
  }

  async getTransfers(): Promise<any[]> {
    if (!this.useDb) {
      return this.inMemoryTransfers;
    }

    const user = await this.getOrCreateUser();
    const transfers = await this.transferRepository.find({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
    });
    
    if (transfers.length === 0) {
      const initial = this.inMemoryTransfers.map((tx) =>
        this.transferRepository.create({
          userId: user.id,
          type: tx.type,
          name: tx.name,
          amount: tx.amount,
          currency: tx.currency as CurrencyCode,
          date: tx.date,
          flag: tx.flag,
        }),
      );
      await this.transferRepository.save(initial);
      return await this.transferRepository.find({
        where: { userId: user.id },
        order: { createdAt: 'DESC' },
      });
    }
    
    return transfers;
  }

  async deposit(currency: string, amount: number) {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');
    const curr = currency.toUpperCase() as CurrencyCode;

    if (!this.useDb) {
      if (this.inMemoryBalances[curr] === undefined) {
        this.inMemoryBalances[curr] = 0;
      }
      this.inMemoryBalances[curr] += amount;
      const newTx = {
        id: 'tx_' + Date.now(),
        type: 'received' as const,
        name: `Deposit (${curr})`,
        amount,
        currency: curr,
        date: 'Just now',
        flag: this.flags[curr] || '🌐',
      };
      this.inMemoryTransfers.unshift(newTx);
      return {
        success: true,
        newBalance: this.inMemoryBalances[curr],
        transfer: newTx,
      };
    }

    const user = await this.getOrCreateUser();
    await this.ensureWalletsExist(user.id);
    
    let wallet = await this.walletRepository.findOne({
      where: { userId: user.id, currency: curr },
    });
    
    if (!wallet) {
      wallet = this.walletRepository.create({
        userId: user.id,
        currency: curr,
        balanceMinor: 0,
        reservedMinor: 0,
        isActive: true,
      });
    }
    
    const amountMinor = this.majorToMinor(amount, curr);
    wallet.balanceMinor = Number(wallet.balanceMinor) + amountMinor;
    await this.walletRepository.save(wallet);
    
    const newTx = this.transferRepository.create({
      userId: user.id,
      type: 'received',
      name: `Deposit (${curr})`,
      amount: amount,
      currency: curr,
      date: 'Just now',
      flag: this.flags[curr] || '🌐',
    });
    await this.transferRepository.save(newTx);
    
    return {
      success: true,
      newBalance: this.minorToMajor(wallet.balanceMinor, curr),
      transfer: newTx,
    };
  }

  async sendMoney(dto: WalletTransferDto) {
    const curr = dto.fromCurrency.toUpperCase() as CurrencyCode;

    if (!this.useDb) {
      if (this.inMemoryBalances[curr] === undefined || this.inMemoryBalances[curr] < dto.amount) {
        throw new BadRequestException(`Insufficient ${curr} balance`);
      }
      this.inMemoryBalances[curr] -= dto.amount;
      const newTx = {
        id: 'tx_' + Date.now(),
        type: 'sent' as const,
        name: dto.recipientName || 'External Recipient',
        amount: dto.amount,
        currency: curr,
        date: 'Just now',
        flag: this.flags[curr] || '🌐',
      };
      this.inMemoryTransfers.unshift(newTx);
      return {
        success: true,
        newBalance: this.inMemoryBalances[curr],
        transfer: newTx,
      };
    }

    const user = await this.getOrCreateUser();
    await this.ensureWalletsExist(user.id);
    
    const wallet = await this.walletRepository.findOne({
      where: { userId: user.id, currency: curr },
    });
    
    const amountMinor = this.majorToMinor(dto.amount, curr);
    if (!wallet || Number(wallet.balanceMinor) < amountMinor) {
      throw new BadRequestException(`Insufficient ${curr} balance`);
    }
    
    wallet.balanceMinor = Number(wallet.balanceMinor) - amountMinor;
    await this.walletRepository.save(wallet);
    
    const newTx = this.transferRepository.create({
      userId: user.id,
      type: 'sent',
      name: dto.recipientName || 'External Recipient',
      amount: dto.amount,
      currency: curr,
      date: 'Just now',
      flag: this.flags[curr] || '🌐',
    });
    await this.transferRepository.save(newTx);
    
    return {
      success: true,
      newBalance: this.minorToMajor(wallet.balanceMinor, curr),
      transfer: newTx,
    };
  }

  async convertCurrency(fromCurr: string, toCurr: string, amount: number) {
    const from = fromCurr.toUpperCase() as CurrencyCode;
    const to = toCurr.toUpperCase() as CurrencyCode;

    const fromRateUSD = this.rates[from] || 1.0;
    const toRateUSD = this.rates[to] || 1.0;
    const amountInUSD = from === 'USD' ? amount : amount / fromRateUSD;
    const convertedAmount = to === 'USD' ? amountInUSD : amountInUSD * toRateUSD;

    if (!this.useDb) {
      if (this.inMemoryBalances[from] === undefined || this.inMemoryBalances[from] < amount) {
        throw new BadRequestException(`Insufficient ${from} balance`);
      }
      this.inMemoryBalances[from] -= amount;
      if (this.inMemoryBalances[to] === undefined) {
        this.inMemoryBalances[to] = 0;
      }
      this.inMemoryBalances[to] += convertedAmount;

      const newTx = {
        id: 'tx_' + Date.now(),
        type: 'convert' as const,
        name: `FX Convert (${from} → ${to})`,
        amount: convertedAmount,
        currency: to,
        date: 'Just now',
        flag: this.flags[to] || '🌐',
      };
      this.inMemoryTransfers.unshift(newTx);
      return {
        success: true,
        fromBalance: this.inMemoryBalances[from],
        toBalance: this.inMemoryBalances[to],
        convertedAmount,
        rate: toRateUSD / fromRateUSD,
      };
    }

    const user = await this.getOrCreateUser();
    await this.ensureWalletsExist(user.id);
    
    const fromWallet = await this.walletRepository.findOne({
      where: { userId: user.id, currency: from },
    });
    
    const fromAmountMinor = this.majorToMinor(amount, from);
    if (!fromWallet || Number(fromWallet.balanceMinor) < fromAmountMinor) {
      throw new BadRequestException(`Insufficient ${from} balance`);
    }
    
    let toWallet = await this.walletRepository.findOne({
      where: { userId: user.id, currency: to },
    });
    
    if (!toWallet) {
      toWallet = this.walletRepository.create({
        userId: user.id,
        currency: to,
        balanceMinor: 0,
        reservedMinor: 0,
        isActive: true,
      });
    }
    
    const toAmountMinor = this.majorToMinor(convertedAmount, to);
    
    fromWallet.balanceMinor = Number(fromWallet.balanceMinor) - fromAmountMinor;
    toWallet.balanceMinor = Number(toWallet.balanceMinor) + toAmountMinor;
    
    await this.walletRepository.save([fromWallet, toWallet]);
    
    const newTx = this.transferRepository.create({
      userId: user.id,
      type: 'convert',
      name: `FX Convert (${from} → ${to})`,
      amount: convertedAmount,
      currency: to,
      date: 'Just now',
      flag: this.flags[to] || '🌐',
    });
    await this.transferRepository.save(newTx);
    
    return {
      success: true,
      fromBalance: this.minorToMajor(fromWallet.balanceMinor, from),
      toBalance: this.minorToMajor(toWallet.balanceMinor, to),
      convertedAmount,
      rate: toRateUSD / fromRateUSD,
    };
  }
}
