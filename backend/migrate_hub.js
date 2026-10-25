require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  await client.connect();
  console.log('Connected to DB');

  try {
    // 1. Add ordenId (UUID unique) to reservas
    await client.query(`
      ALTER TABLE reservas 
      ADD COLUMN IF NOT EXISTS "ordenId" UUID UNIQUE;
    `);
    console.log('Column ordenId added to reservas');

    await client.query(`
      UPDATE reservas 
      SET "ordenId" = gen_random_uuid() 
      WHERE "ordenId" IS NULL;
    `);
    console.log('Existing reservas populated with UUIDs');

    // 2. Create idempotency_keys table
    await client.query(`
      CREATE TABLE IF NOT EXISTS idempotency_keys (
        key VARCHAR(100) PRIMARY KEY,
        body_hash VARCHAR(64) NOT NULL,
        status_code INT NOT NULL,
        response_body JSONB NOT NULL,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Table idempotency_keys ready');

    // 3. Webhook subscriptions table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS webhook_subscriptions (
        id UUID PRIMARY KEY,
        url TEXT NOT NULL,
        events TEXT[] NOT NULL,
        secret TEXT,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Table webhook_subscriptions ready');

  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
