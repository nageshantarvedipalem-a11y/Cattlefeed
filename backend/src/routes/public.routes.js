import { Router } from 'express';
import { downloadPublicInvoicePdf } from '../controllers/public.controller.js';

const router = Router();

router.get('/invoices/:saleId.pdf', downloadPublicInvoicePdf);

export default router;
