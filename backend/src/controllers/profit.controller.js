import profitService from '../services/profit.service.js';
import { asyncHandler, sendSuccess } from '../utils/apiResponse.js';

export const getProfitDashboard = asyncHandler(async (req, res) => {
  const result = await profitService.getProfitDashboard(req.query);
  sendSuccess(res, result, 'Profit data fetched successfully');
});

export const exportProfit = asyncHandler(async (req, res) => {
  const format = req.query.format === 'pdf' ? 'pdf' : 'excel';
  const result = await profitService.exportProfit(req.query, format);
  res.setHeader('Content-Type', result.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
  res.send(result.buffer);
});
