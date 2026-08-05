import dashboardService from '../services/dashboard.service.js';
import { asyncHandler, sendSuccess } from '../utils/apiResponse.js';

export const getDashboard = asyncHandler(async (req, res) => {
  const result = await dashboardService.getDashboard();
  sendSuccess(res, result, 'Dashboard data fetched successfully');
});

export const getChartData = asyncHandler(async (req, res) => {
  const { chartKey } = req.params;
  const { period, dateFrom, dateTo } = req.query;
  const result = await dashboardService.getChartData(chartKey, { period, dateFrom, dateTo });
  sendSuccess(res, result, 'Chart data fetched successfully');
});
