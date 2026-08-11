import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { apiRateLimiter } from './middlewares/rateLimiter.js';
import { notFoundHandler, errorHandler } from './middlewares/errorHandler.js';
import healthRoutes from './routes/health.routes.js';
import indexRoutes from './routes/index.routes.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import customerRoutes from './routes/customer.routes.js';
import supplierRoutes from './routes/supplier.routes.js';
import productRoutes from './routes/product.routes.js';
import stockRoutes from './routes/stock.routes.js';
import billingRoutes from './routes/billing.routes.js';
import ledgerRoutes from './routes/ledger.routes.js';
import cashBookRoutes from './routes/cashBook.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import profitRoutes from './routes/profit.routes.js';
import reportRoutes from './routes/report.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import whatsappRoutes from './routes/whatsapp.routes.js';
import publicRoutes from './routes/public.routes.js';
import appConfig, { getApiPrefix } from '../config/app.config.js';
import { sendSuccess } from './utils/apiResponse.js';

dotenv.config();

const app = express();
const API_PREFIX = getApiPrefix();

app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(`${API_PREFIX}/health`, healthRoutes);
app.use(`${API_PREFIX}/public`, publicRoutes);
app.use(apiRateLimiter);

app.use(API_PREFIX, indexRoutes);
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/customers`, customerRoutes);
app.use(`${API_PREFIX}/suppliers`, supplierRoutes);
app.use(`${API_PREFIX}/products`, productRoutes);
app.use(`${API_PREFIX}/stock`, stockRoutes);
app.use(`${API_PREFIX}/billing`, billingRoutes);
app.use(`${API_PREFIX}/ledger`, ledgerRoutes);
app.use(`${API_PREFIX}/cashbook`, cashBookRoutes);
app.use(`${API_PREFIX}/payments`, paymentRoutes);
app.use(`${API_PREFIX}/profit`, profitRoutes);
app.use(`${API_PREFIX}/reports`, reportRoutes);
app.use(`${API_PREFIX}/dashboard`, dashboardRoutes);
app.use(`${API_PREFIX}/whatsapp`, whatsappRoutes);

app.get('/', (req, res) => {
  sendSuccess(res, {
    service: appConfig.name,
    message: 'This is the API server. Use the endpoints below — there is no website at /.',
    api: `${req.protocol}://${req.get('host')}${API_PREFIX}`,
    health: `${req.protocol}://${req.get('host')}${API_PREFIX}/health`,
    frontend: process.env.CORS_ORIGIN || null,
  }, `${appConfig.name} API`);
});

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
