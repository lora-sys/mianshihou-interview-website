import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const poolMaxRaw = Number(process.env.PG_POOL_MAX ?? '10');
const poolMax = Number.isFinite(poolMaxRaw) && poolMaxRaw > 0 ? poolMaxRaw : 10;
const idleTimeoutMillisRaw = Number(process.env.PG_POOL_IDLE_TIMEOUT_MS ?? '10000');
const idleTimeoutMillis =
  Number.isFinite(idleTimeoutMillisRaw) && idleTimeoutMillisRaw >= 0 ? idleTimeoutMillisRaw : 10000;
const connectionTimeoutMillisRaw = Number(process.env.PG_POOL_CONN_TIMEOUT_MS ?? '3000');
const connectionTimeoutMillis =
  Number.isFinite(connectionTimeoutMillisRaw) && connectionTimeoutMillisRaw >= 0
    ? connectionTimeoutMillisRaw
    : 3000;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  max: poolMax,
  idleTimeoutMillis,
  connectionTimeoutMillis,
});

pool.on('error', (err) => {
  console.error('pg pool error', err);
});

const statementTimeoutMsRaw = Number(process.env.PG_STATEMENT_TIMEOUT_MS ?? '0');
const statementTimeoutMs =
  Number.isFinite(statementTimeoutMsRaw) && statementTimeoutMsRaw >= 0 ? statementTimeoutMsRaw : 0;
const idleInTxTimeoutMsRaw = Number(process.env.PG_IDLE_IN_TX_TIMEOUT_MS ?? '0');
const idleInTxTimeoutMs =
  Number.isFinite(idleInTxTimeoutMsRaw) && idleInTxTimeoutMsRaw >= 0 ? idleInTxTimeoutMsRaw : 0;

pool.on('connect', async (client) => {
  if (statementTimeoutMs > 0) {
    await client.query(`set statement_timeout = ${statementTimeoutMs}`);
  }
  if (idleInTxTimeoutMs > 0) {
    await client.query(`set idle_in_transaction_session_timeout = ${idleInTxTimeoutMs}`);
  }
});

export async function closeDb() {
  await pool.end();
}

export const db = drizzle({ client: pool });
