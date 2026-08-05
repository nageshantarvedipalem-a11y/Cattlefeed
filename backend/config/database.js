import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { logger } from '../src/utils/logger.js';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'cattle_feed_erp',
  connectTimeout: 30000,
  timezone: '+05:30',
};

const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 100,
  queueLimit: 20,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
});

const RETRYABLE_DB_ERRORS = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'PROTOCOL_CONNECTION_LOST',
  'ER_CON_COUNT_ERROR',
]);

const isRetryableDbError = (error) =>
  RETRYABLE_DB_ERRORS.has(error?.code) || error?.errno === 'ECONNRESET';

pool.on('connection', (connection) => {
  connection.on('error', (err) => {
    logger.warn(`MySQL pool connection error: ${err.code || err.message}`);
  });
});

export const testConnection = async (silent = false) => {
  await pool.query('SELECT 1');
  if (!silent) {
    logger.info('MySQL database connected successfully');
  }
  return true;
};

export const query = async (sql, params = [], retries = 2) => {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const [rows] = await pool.execute(sql, params);
      return rows;
    } catch (error) {
      lastError = error;

      if (attempt < retries && isRetryableDbError(error)) {
        logger.warn(`DB query retry ${attempt + 1}/${retries}: ${error.code || error.message}`);
        await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
        continue;
      }

      throw error;
    }
  }

  throw lastError;
};

export const getConnection = async () => {
  const connection = await pool.getConnection();

  const originalRelease = connection.release.bind(connection);
  connection.release = () => {
    originalRelease();
  };

  return connection;
};

export default pool;
