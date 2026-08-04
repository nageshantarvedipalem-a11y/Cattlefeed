import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { logger } from '../src/utils/logger.js';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'cattle_feed_erp',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  timezone: '+05:30',
});

export const testConnection = async (silent = false) => {
  const connection = await pool.getConnection();
  try {
    await connection.ping();
    if (!silent) {
      logger.info('MySQL database connected successfully');
    }
    return true;
  } finally {
    connection.release();
  }
};

export const query = async (sql, params = []) => {
  const [rows] = await pool.execute(sql, params);
  return rows;
};

export const getConnection = async () => pool.getConnection();

export default pool;
