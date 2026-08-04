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

export default appConfig;
