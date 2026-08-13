import dotenv from 'dotenv';

dotenv.config();

export const appConfig = {
  name: process.env.APP_NAME || 'Cattle Feed ERP',
  projectSlug: process.env.API_PROJECT_SLUG || 'cattlefeed',
  version: process.env.API_VERSION || 'v1',
  port: parseInt(process.env.PORT, 10) || 5001,
  env: process.env.NODE_ENV || 'development',
};

export const getApiPrefix = () => `/api/${appConfig.projectSlug}/${appConfig.version}`;

export const getApiUrl = (req) => {
  const protocol = req.protocol || 'http';
  const host = req.get('host') || `localhost:${appConfig.port}`;
  return `${protocol}://${host}${getApiPrefix()}`;
};

export const getPublicAppUrl = () => (process.env.APP_PUBLIC_URL || '').replace(/\/$/, '');

const PRODUCTION_FRONTEND_ORIGINS = [
  'https://dineshcattlefeed.com',
  'https://www.dineshcattlefeed.com',
  'https://lightsteelblue-bison-593262.hostingersite.com',
];

export const getCorsOrigins = () => {
  const raw = process.env.CORS_ORIGIN || 'http://localhost:5173';
  const fromEnv = raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (appConfig.env === 'production') {
    return [...new Set([...fromEnv, ...PRODUCTION_FRONTEND_ORIGINS])];
  }

  return fromEnv;
};

export default appConfig;
