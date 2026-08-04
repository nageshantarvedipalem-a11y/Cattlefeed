import reportService from '../services/report.service.js';
import { asyncHandler, sendSuccess } from '../utils/apiResponse.js';

export const getReport = asyncHandler(async (req, res) => {
  const result = await reportService.getReport(req.params.type, req.query);
  sendSuccess(res, result, 'Report fetched successfully');
});

export const exportReport = asyncHandler(async (req, res) => {
  const format = req.query.format === 'pdf' ? 'pdf' : 'excel';
  const result = await reportService.exportReport(req.params.type, req.query, format);
  res.setHeader('Content-Type', result.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
  res.send(result.buffer);
});
