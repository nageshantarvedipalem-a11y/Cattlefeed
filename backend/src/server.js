import dotenv from 'dotenv';
import app from './app.js';
import { testConnection } from '../config/database.js';
import { logger } from './utils/logger.js';
import { getApiPrefix } from '../config/app.config.js';

dotenv.config();

const PORT = parseInt(process.env.PORT, 10) || 5001;
const API_PREFIX = getApiPrefix();

const startServer = async () => {
  try {
    await testConnection();
    logger.info('MySQL database connected successfully');
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      logger.warn('MySQL connection failed. Check DB_HOST, DB_USER, and DB_PASSWORD in backend/.env');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      logger.warn(`MySQL access denied for user "${process.env.DB_USER}". Update DB_PASSWORD in backend/.env`);
    } else {
      logger.warn(`MySQL connection failed: ${error.message}`);
    }
  }

  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
    logger.info(`Cattle Feed API: http://localhost:${PORT}${API_PREFIX}`);
  });
};

startServer();
