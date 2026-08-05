import { Router } from 'express';
import { query } from '../../config/database.js';
import { asyncHandler, sendSuccess } from '../utils/apiResponse.js';
import appConfig, { getApiPrefix } from '../../config/app.config.js';

const router = Router();
let healthCache = { at: 0, payload: null };

router.get('/', asyncHandler(async (_req, res) => {
  const now = Date.now();
  if (healthCache.payload && now - healthCache.at < 60000) {
    return sendSuccess(
      res,
      healthCache.payload.data,
      healthCache.payload.message
    );
  }

  const payload = {
    status: 'healthy',
    project: appConfig.projectSlug,
    service: `${appConfig.name} API`,
    version: '1.0.0',
    apiVersion: appConfig.version,
    phase: 1,
    api: 'online',
    database: 'offline',
    databaseError: null,
    databaseName: process.env.DB_NAME || 'cattle_feed_erp',
    serverTime: new Date().toISOString(),
    healthCheck: `GET ${getApiPrefix()}/health`,
  };

  try {
    const [dbInfo] = await query('SELECT DATABASE() AS db_name, NOW() AS server_time');
    payload.database = 'online';
    payload.databaseName = dbInfo?.db_name || payload.databaseName;
    payload.serverTime = dbInfo?.server_time || payload.serverTime;
    payload.status = 'healthy';
  } catch (error) {
    payload.status = 'degraded';
    payload.databaseError = error.code === 'ECONNREFUSED'
      ? 'Cannot connect to MySQL. Check DB_HOST, DB_USER, and DB_PASSWORD in backend/.env'
      : error.message;
  }

  sendSuccess(res, payload, payload.database === 'online' ? 'API is running' : 'API is running but database is offline');
  healthCache = {
    at: Date.now(),
    payload: {
      data: payload,
      message: payload.database === 'online' ? 'API is running' : 'API is running but database is offline',
    },
  };
}));

export default router;
