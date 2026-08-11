import billingService from '../services/billing.service.js';
import { verifyInvoicePublicToken } from '../helpers/invoicePublicToken.helper.js';
import { asyncHandler } from '../utils/apiResponse.js';

export const downloadPublicInvoicePdf = asyncHandler(async (req, res) => {
  const saleId = parseInt(req.params.saleId, 10);
  const token = req.query.token;

  if (!Number.isFinite(saleId) || saleId < 1) {
    return res.status(400).json({ success: false, message: 'Invalid invoice reference' });
  }

  if (!verifyInvoicePublicToken(saleId, token)) {
    return res.status(403).json({ success: false, message: 'Invalid or expired download link' });
  }

  const result = await billingService.downloadInvoicePdf(saleId, false);
  res.setHeader('Content-Type', result.contentType);
  res.setHeader('Content-Disposition', `inline; filename="${result.filename}"`);
  res.setHeader('Cache-Control', 'private, max-age=3600');
  return res.send(result.buffer);
});
