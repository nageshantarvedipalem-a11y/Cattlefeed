import customerService from '../services/customer.service.js';
import { asyncHandler, sendSuccess, sendPaginated } from '../utils/apiResponse.js';
import { getClientIp } from '../middlewares/validate.middleware.js';

export const listCustomers = asyncHandler(async (req, res) => {
  const result = await customerService.listCustomers(req.query);
  sendPaginated(res, result.customers, result.pagination, 'Customers fetched successfully');
});

export const getVillages = asyncHandler(async (_req, res) => {
  const result = await customerService.getVillages();
  sendSuccess(res, result, 'Villages fetched successfully');
});

export const getCustomer = asyncHandler(async (req, res) => {
  const result = await customerService.getCustomerById(req.params.id);
  sendSuccess(res, result, 'Customer fetched successfully');
});

export const getCustomerSales = asyncHandler(async (req, res) => {
  const result = await customerService.getCustomerSales(req.params.id, req.query);
  sendPaginated(res, result.sales, result.pagination, 'Purchase history fetched successfully');
});

export const getCustomerLedger = asyncHandler(async (req, res) => {
  const result = await customerService.getCustomerLedger(req.params.id, req.query);
  sendPaginated(res, result.ledger, result.pagination, 'Customer ledger fetched successfully');
});

export const createCustomer = asyncHandler(async (req, res) => {
  const result = await customerService.createCustomer(req.user, req.body, getClientIp(req));
  sendSuccess(res, result, 'Customer created successfully', 201);
});

export const updateCustomer = asyncHandler(async (req, res) => {
  const result = await customerService.updateCustomer(req.user, req.params.id, req.body, getClientIp(req));
  sendSuccess(res, result, 'Customer updated successfully');
});

export const updateCustomerStatus = asyncHandler(async (req, res) => {
  const result = await customerService.updateCustomerStatus(
    req.user,
    req.params.id,
    req.body.isActive,
    getClientIp(req)
  );
  sendSuccess(res, result, `Customer ${req.body.isActive ? 'enabled' : 'disabled'} successfully`);
});

export const deleteCustomer = asyncHandler(async (req, res) => {
  const result = await customerService.deleteCustomer(req.user, req.params.id, getClientIp(req));
  sendSuccess(res, result, result.message);
});
