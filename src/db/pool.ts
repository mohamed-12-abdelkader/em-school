import { Pool } from 'pg';
import { config } from '../utils';

const pool = new Pool({
  connectionString: config.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: config.NODE_ENV === 'test' ? 2000 : 10000,
});

export default pool;
