import { Injectable, Logger } from '@nestjs/common';
import { TransactionType, CurrencyCode } from '@wertbot/shared-types';

export interface ParsedSms {
  amountMinor: number;
  currency: CurrencyCode;
  merchantName: string;
  transactionType: TransactionType;
  cardLastFour?: string;
}

// =============================================================================
// WertBot — SMS Transaction Parser Service
// Scrapes transaction alerts from SMS strings using regex patterns
// Supports major Indian banks (INR) and US credit/debit alerts (USD)
// =============================================================================

@Injectable()
export class SmsParserService {
  private readonly logger = new Logger(SmsParserService.name);

  // Common transaction alert SMS patterns
  private readonly patterns = [
    // Pattern 1: Indian cards / UPI spending
    // e.g. "Rs. 1,247 spent on card ending 1005 at Starbucks"
    // e.g. "INR 500 spent on UPI at Amazon"
    {
      regex: /(?:rs\.?|inr)\s*([\d,]+(?:\.\d{2})?)\s*spent\s*on\s*(?:card|a\/c|upi)?\s*(?:ending)?\s*(\d{4})?\s*at\s*([^.]+)/i,
      type: TransactionType.DEBIT,
      currency: CurrencyCode.INR,
      mapping: { amount: 1, card: 2, merchant: 3 },
    },
    // Pattern 2: US credit card transaction alert
    // e.g. "Alert: $42.50 charged on Card 4321 at Uber"
    {
      regex: /(?:\$)\s*([\d,]+(?:\.\d{2})?)\s*charged\s*on\s*(?:card)?\s*(\d{4})\s*at\s*([^.]+)/i,
      type: TransactionType.DEBIT,
      currency: CurrencyCode.USD,
      mapping: { amount: 1, card: 2, merchant: 3 },
    },
    // Pattern 3: Generic debit/spent alert
    // e.g. "Transaction of USD 12.00 on Visa 9999 at H&M"
    {
      regex: /transaction\s*of\s*(usd|\$|inr|rs\.?)\s*([\d,]+(?:\.\d{2})?)\s*on\s*(?:visa|mastercard|amex|card)\s*(\d{4})\s*at\s*([^.]+)/i,
      type: TransactionType.DEBIT,
      mapping: { currency: 1, amount: 2, card: 3, merchant: 4 },
    },
  ];

  parse(text: string): ParsedSms | null {
    for (const pattern of this.patterns) {
      const match = text.match(pattern.regex);
      if (match) {
        try {
          const map = pattern.mapping as Record<string, number>;
          let currency = pattern.currency || CurrencyCode.USD;

          if (map.currency !== undefined && match[map.currency]) {
            const curStr = match[map.currency].toLowerCase();
            currency = curStr.includes('rs') || curStr.includes('inr')
              ? CurrencyCode.INR
              : CurrencyCode.USD;
          }

          const amountStr = match[map.amount];
          const amountMinor = Math.round(parseFloat(amountStr.replace(/,/g, '')) * 100);

          const cardLastFour = map.card && match[map.card] ? match[map.card] : undefined;
          const merchantName = match[map.merchant].trim();

          return {
            amountMinor,
            currency,
            merchantName,
            transactionType: pattern.type,
            cardLastFour,
          };
        } catch (err) {
          this.logger.error(`Failed to parse matched SMS group: ${(err as Error).message}`);
        }
      }
    }
    return null;
  }
}
