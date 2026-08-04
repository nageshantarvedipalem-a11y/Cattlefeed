import { Router } from 'express';
import { testConnection, query } from '../../config/database.js';
import { asyncHandler, sendSuccess } from '../utils/apiResponse.js';
import appConfig, { getApiPrefix, getApiUrl } from '../../config/app.config.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  let database = 'offline';
  let databaseName = process.env.DB_NAME || 'cattle_feed_erp';

  try {
    await testConnection(true);
    const [dbInfo] = await query('SELECT DATABASE() AS db_name');
    database = 'online';
    databaseName = dbInfo?.db_name || databaseName;
  } catch {
    database = 'offline';
  }

  const apiPrefix = getApiPrefix();
  const baseUrl = getApiUrl(req);

  sendSuccess(res, {
    project: appConfig.projectSlug,
    service: appConfig.name,
    version: '1.0.0',
    apiVersion: appConfig.version,
    phase: 1,
    status: database === 'online' ? 'running' : 'degraded',
    database,
    databaseName,
    baseUrl,
    documentation: 'Cattle Feed ERP REST API. Frontend: http://localhost:5173',
    endpoints: {
      root: `GET ${apiPrefix}`,
      health: `GET ${apiPrefix}/health`,
      login: `POST ${apiPrefix}/auth/login`,
      me: `GET ${apiPrefix}/auth/me`,
      logout: `POST ${apiPrefix}/auth/logout`,
      forgotPassword: `POST ${apiPrefix}/auth/forgot-password`,
      resetPassword: `POST ${apiPrefix}/auth/reset-password`,
      changePassword: `POST ${apiPrefix}/auth/change-password`,
      users: `GET ${apiPrefix}/users`,
      createUser: `POST ${apiPrefix}/users`,
    },
  }, `${appConfig.name} API`);
}));

export default router;
