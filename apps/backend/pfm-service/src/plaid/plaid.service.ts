import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlaidApi, Configuration, PlaidEnvironments, Products, CountryCode } from 'plaid';
import { Transaction, Account, AccountType, CurrencyCode, TransactionType } from '@wertbot/shared-types';

// =============================================================================
// Plaid Open Banking Connector
//
// Integrates with Plaid to:
// - Create link tokens for account connection (UI flow)
// - Exchange public tokens for access tokens
// - Fetch real-time account balances
// - Sync transactions from connected bank accounts
// - Handle webhooks for real-time transaction updates
// =============================================================================

@Injectable()
export class PlaidService {
  private readonly logger = new Logger(PlaidService.name);
  private readonly plaidClient: PlaidApi;

  constructor(private readonly configService: ConfigService) {
    const environment = this.configService.get<string>('PLAID_ENV', 'sandbox');
    
    const config = new Configuration({
      basePath: PlaidEnvironments[environment as keyof typeof PlaidEnvironments],
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': this.configService.get<string>('PLAID_CLIENT_ID'),
          'PLAID-SECRET': this.configService.get<string>('PLAID_SECRET'),
        },
      },
    });

    this.plaidClient = new PlaidApi(config);
    this.logger.log(`Plaid initialized in ${environment} environment`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Link Token — Step 1 of Plaid Link flow
  // Frontend uses this token to open Plaid Link modal
  // ─────────────────────────────────────────────────────────────────────────

  async createLinkToken(userId: string): Promise<string> {
    const response = await this.plaidClient.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: 'WertBot',
      products: [Products.Transactions, Products.Auth, Products.Investments],
      country_codes: [CountryCode.Us, CountryCode.Gb],
      language: 'en',
      webhook: `${this.configService.get('API_BASE_URL', 'http://localhost:3000')}/api/v1/plaid/webhook`,
    });

    return response.data.link_token;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Exchange Public Token — Step 2: After user completes Plaid Link
  // ─────────────────────────────────────────────────────────────────────────

  async exchangePublicToken(publicToken: string): Promise<{
    accessToken: string;
    itemId: string;
  }> {
    const response = await this.plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    // IMPORTANT: Store access_token encrypted in DB, never expose to client
    return {
      accessToken: response.data.access_token,
      itemId: response.data.item_id,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Fetch Accounts
  // ─────────────────────────────────────────────────────────────────────────

  async getAccounts(accessToken: string, userId: string): Promise<Partial<Account>[]> {
    const response = await this.plaidClient.accountsGet({ access_token: accessToken });

    return response.data.accounts.map((acc) => ({
      userId,
      accountType: this.mapPlaidAccountType(acc.type, acc.subtype),
      currency: (acc.balances.iso_currency_code as CurrencyCode) ?? CurrencyCode.USD,
      balanceMinor: Math.round((acc.balances.current ?? 0) * 100),
      availableMinor: Math.round((acc.balances.available ?? 0) * 100),
      plaidAccountId: acc.account_id,
      mask: acc.mask ?? undefined,
      name: acc.name,
      institutionName: undefined, // fetched separately via getInstitution
      isActive: true,
      isPrimary: false,
    }));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Sync Transactions (Incremental)
  // ─────────────────────────────────────────────────────────────────────────

  async syncTransactions(
    accessToken: string,
    userId: string,
    cursor?: string,
  ): Promise<{
    added: Partial<Transaction>[];
    modified: Partial<Transaction>[];
    removed: string[];
    nextCursor: string;
    hasMore: boolean;
  }> {
    const response = await this.plaidClient.transactionsSync({
      access_token: accessToken,
      cursor,
      count: 100,
    });

    const { added, modified, removed, next_cursor, has_more } = response.data;

    return {
      added: added.map((t) => this.mapPlaidTransaction(t, userId)),
      modified: modified.map((t) => this.mapPlaidTransaction(t, userId)),
      removed: removed.map((r) => r.transaction_id),
      nextCursor: next_cursor,
      hasMore: has_more,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Handle Plaid Webhooks (Real-time transaction updates)
  // ─────────────────────────────────────────────────────────────────────────

  async handleWebhook(body: Record<string, unknown>): Promise<void> {
    const webhookType = body.webhook_type as string;
    const webhookCode = body.webhook_code as string;

    this.logger.log(`Plaid webhook: ${webhookType}/${webhookCode}`);

    switch (`${webhookType}/${webhookCode}`) {
      case 'TRANSACTIONS/SYNC_UPDATES_AVAILABLE':
        // Trigger a background transaction sync job
        // await this.transactionSyncQueue.add({ itemId: body.item_id });
        this.logger.log(`Transaction sync available for item: ${body.item_id}`);
        break;
      
      case 'ITEM/ERROR':
        this.logger.error(`Plaid item error for ${body.item_id}: ${JSON.stringify(body.error)}`);
        // TODO: Notify user their bank connection needs re-authentication
        break;

      default:
        this.logger.debug(`Unhandled Plaid webhook: ${webhookType}/${webhookCode}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private: Type Mappers
  // ─────────────────────────────────────────────────────────────────────────

  private mapPlaidAccountType(type: string, subtype: string | null): AccountType {
    const map: Record<string, AccountType> = {
      depository_checking: AccountType.CHECKING,
      depository_savings: AccountType.SAVINGS,
      investment_brokerage: AccountType.INVESTMENT,
      investment_ira: AccountType.INVESTMENT,
      credit_credit_card: AccountType.CHECKING,
      loan_mortgage: AccountType.CHECKING,
    };
    const key = `${type}_${subtype ?? ''}`.toLowerCase();
    return map[key] ?? AccountType.CHECKING;
  }

  private mapPlaidTransaction(t: any, userId: string): Partial<Transaction> {
    return {
      userId,
      transactionType: t.amount > 0 ? TransactionType.DEBIT : TransactionType.CREDIT,
      amountMinor: Math.abs(Math.round(t.amount * 100)),
      currency: (t.iso_currency_code as CurrencyCode) ?? CurrencyCode.USD,
      merchantName: t.merchant_name ?? t.name,
      merchantMcc: t.payment_meta?.payment_method ?? undefined,
      merchantCity: t.location?.city ?? undefined,
      merchantCountry: t.location?.country ?? undefined,
      category: t.personal_finance_category?.primary?.toLowerCase(),
      subcategory: t.personal_finance_category?.detailed?.toLowerCase(),
      referenceId: t.transaction_id,
      source: 'plaid',
      transactionDate: new Date(t.date),
      postedDate: t.datetime ? new Date(t.datetime) : undefined,
      isRecurring: t.payment_meta?.recurring ?? false,
      aiMetadata: {},
    };
  }
}
