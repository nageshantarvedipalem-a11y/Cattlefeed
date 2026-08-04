import dashboardService from '../services/dashboard.service.js';
import { asyncHandler, sendSuccess } from '../utils/apiResponse.js';

export const getDashboard = asyncHandler(async (req, res) => {
  const result = await dashboardService.getDashboard();
  sendSuccess(res, result, 'Dashboard data fetched successfully');
});
