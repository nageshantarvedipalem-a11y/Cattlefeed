import supplierService from '../services/supplier.service.js';
import { asyncHandler, sendSuccess, sendPaginated } from '../utils/apiResponse.js';
import { getClientIp } from '../middlewares/validate.middleware.js';

export const listSuppliers = asyncHandler(async (req, res) => {
  const result = await supplierService.listSuppliers(req.query);
  sendPaginated(res, result.suppliers, result.pagination, 'Suppliers fetched successfully');
});

export const getSupplier = asyncHandler(async (req, res) => {
  const result = await supplierService.getSupplierById(req.params.id);
  sendSuccess(res, result, 'Supplier fetched successfully');
});

export const getSupplierPurchases = asyncHandler(async (req, res) => {
  const result = await supplierService.getSupplierPurchases(req.params.id, req.query);
  sendPaginated(res, result.purchases, result.pagination, 'Purchase history fetched successfully');
});

export const createSupplier = asyncHandler(async (req, res) => {
  const result = await supplierService.createSupplier(req.user, req.body, getClientIp(req));
  sendSuccess(res, result, 'Supplier created successfully', 201);
});

export const updateSupplier = asyncHandler(async (req, res) => {
  const result = await supplierService.updateSupplier(req.user, req.params.id, req.body, getClientIp(req));
  sendSuccess(res, result, 'Supplier updated successfully');
});

export const updateSupplierStatus = asyncHandler(async (req, res) => {
  const result = await supplierService.updateSupplierStatus(
    req.user,
    req.params.id,
    req.body.isActive,
    getClientIp(req)
  );
  sendSuccess(res, result, `Supplier ${req.body.isActive ? 'enabled' : 'disabled'} successfully`);
});

export const deleteSupplier = asyncHandler(async (req, res) => {
  const result = await supplierService.deleteSupplier(req.user, req.params.id, getClientIp(req));
  sendSuccess(res, result, result.message);
});
