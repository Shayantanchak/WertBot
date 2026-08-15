const { Client } = require('pg');
const fs = require('fs');
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

async function run() {
  console.log('Connecting to PostgreSQL database...');
  await client.connect();
  console.log('Reading migration file...');
  const sql = fs.readFileSync(path.join(__dirname, '../migrations/001_initial_schema.sql'), 'utf8');
  console.log('Running migration...');
  await client.query(sql);
  console.log('Migration completed successfully!');
  await client.end();
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
