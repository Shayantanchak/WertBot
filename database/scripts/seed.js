const { Client } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from root .env
dotenv.config({ path: path.join(__dirname, '../../.env') });

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'wertbot',
  user: process.env.DB_USER || 'wertbot_user',
  password: process.env.DB_PASSWORD,
});

// Pre-hashed bcrypt string for "SecureP@ssw0rd!" (cost = 12)
const demoPasswordHash = '$2b$12$R.SDR/y108mQ/nUWhH2P6.j.vH3oU.Z.YtQzN1e1Fj4N3S4b.4v5q';

async function run() {
  console.log('Connecting to database...');
  await client.connect();

  console.log('Seeding initial demo data...');

  // 1. Insert Demo User
  const userRes = await client.query(`
    INSERT INTO users (email, password_hash, full_name, status, is_active, mfa_enabled, kyc_verified)
    VALUES ($1, $2, $3, 'active', true, false, true)
    ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
    RETURNING id
  `, ['alex@example.com', demoPasswordHash, 'Alex Johnson']);

  const userId = userRes.rows[0].id;
  console.log(`Demo user seeded with ID: ${userId}`);

  // 2. Insert Demo Account (depository)
  const accountRes = await client.query(`
    INSERT INTO accounts (user_id, account_type, currency, balance_minor, available_minor, name, is_primary, is_active)
    VALUES ($1, 'checking', 'USD', 1245000, 1245000, 'Primary Checking', true, true)
    RETURNING id
  `, [userId]);

  const accountId = accountRes.rows[0].id;
  console.log(`Demo account seeded with ID: ${accountId}`);

  // 3. Insert Demo Credit Cards
  // Amex Gold (4x on dining [5812, 5813, 5814], 4x on groceries [5411])
  await client.query(`
    INSERT INTO credit_cards (user_id, card_name, card_network, issuer, last_four, reward_categories, mcc_multipliers, annual_fee_minor, is_active)
    VALUES ($1, 'Amex Gold', 'amex', 'amex', '1005', 
      '{"dining": 4, "groceries": 4, "default": 1}', 
      '{"5812": 4, "5813": 4, "5814": 4, "5411": 4}', 
      25000, true)
  `, [userId]);

  // Chase Sapphire Preferred (3x on dining [5812, 5813, 5814], 2x on travel/airline [4511])
  await client.query(`
    INSERT INTO credit_cards (user_id, card_name, card_network, issuer, last_four, reward_categories, mcc_multipliers, annual_fee_minor, is_active)
    VALUES ($1, 'Chase Sapphire Preferred', 'mastercard', 'chase', '4321', 
      '{"dining": 3, "travel": 2, "default": 1}', 
      '{"5812": 3, "5813": 3, "5814": 3, "4511": 2}', 
      9500, true)
  `, [userId]);

  console.log('Demo credit cards seeded.');

  // 4. Insert Demo Budget (Food budget: $1400)
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  await client.query(`
    INSERT INTO budgets (user_id, category, amount_minor, currency, period, start_date, end_date, alert_threshold, is_active)
    VALUES ($1, 'dining', 140000, 'USD', 'monthly', $2, $3, 80.0, true)
    ON CONFLICT (user_id, category, period, start_date) DO NOTHING
  `, [userId, startOfMonth, endOfMonth]);

  console.log('Demo budget seeded.');

  // 5. Insert Demo Transactions
  const txDate = new Date();
  await client.query(`
    INSERT INTO transactions (user_id, account_id, type, status, amount_minor, currency, merchant_name, merchant_mcc, category, source, transaction_date)
    VALUES 
    ($1, $2, 'debit', 'completed', 8432, 'USD', 'Whole Foods Market', '5411', 'groceries', 'manual', $3),
    ($1, $2, 'debit', 'completed', 2350, 'USD', 'Uber', '4121', 'transport', 'manual', $3),
    ($1, $2, 'credit', 'completed', 850000, 'USD', 'Salary — Acme Corp', '', 'income', 'manual', $3),
    ($1, $2, 'debit', 'completed', 18240, 'USD', 'Nobu Restaurant', '5812', 'dining', 'manual', $3),
    ($1, $2, 'debit', 'completed', 1599, 'USD', 'Netflix', '4899', 'subscriptions', 'manual', $3)
  `, [userId, accountId, txDate]);

  console.log('Demo transactions seeded.');
  console.log('Database seeding finished successfully!');

  await client.end();
}

run().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
