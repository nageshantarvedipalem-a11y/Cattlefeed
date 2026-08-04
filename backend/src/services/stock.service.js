import {
  findPurchases,
  findPurchaseById,
  findPurchaseItems,
  findPurchaseByInvoiceNumber,
  createPurchaseRecord,
  createPurchaseItemRecord,
  formatPurchase,
  getConnection,
} from '../repositories/purchase.repository.js';
import {
  findStockMovements,
  findStockMovementsForExport,
  findProductStockHistory,
  createStockMovementRecord,
  getProductStockForUpdate,
  updateProductStock,
} from '../repositories/stockMovement.repository.js';
import { findSupplierById } from '../repositories/supplier.repository.js';
import { findProductById, findProducts } from '../repositories/product.repository.js';
import { getNextPurchaseNumber } from '../repositories/settings.repository.js';
import { logActivity } from '../repositories/activityLog.repository.js';
import { buildStockHistoryWorkbook, buildLowStockWorkbook } from '../helpers/exportExcel.helper.js';
import { buildStockHistoryPdf, buildLowStockPdf } from '../helpers/exportPdf.helper.js';
import { AppError } from '../utils/apiResponse.js';

const calculateLineItem = (item) => {
  const quantity = Number(item.quantity);
  const purchasePrice = Number(item.purchasePrice);
  const sellingPrice = Number(item.sellingPrice);
  const gstRate = Number(item.gstRate) || 0;
  const lineSubtotal = quantity * purchasePrice;
  const taxAmount = (lineSubtotal * gstRate) / 100;
  const totalAmount = lineSubtotal + taxAmount;

  return {
    quantity,
    purchasePrice,
    sellingPrice,
    gstRate,
    lineSubtotal,
    taxAmount,
    totalAmount,
  };
};

const resolvePaymentStatus = (paidAmount, totalAmount) => {
  if (paidAmount >= totalAmount) return 'paid';
  if (paidAmount > 0) return 'partial';
  return 'pending';
};

export class StockService {
  async listPurchases(queryParams) {
    const page = Math.max(parseInt(queryParams.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(queryParams.limit, 10) || 10, 1), 100);

    const { purchases, total } = await findPurchases({
      search: queryParams.search?.trim() || '',
      supplierId: queryParams.supplierId || null,
      paymentStatus: queryParams.paymentStatus || null,
      dateFrom: queryParams.dateFrom || null,
      dateTo: queryParams.dateTo || null,
      page,
      limit,
      sortBy: queryParams.sortBy || 'createdAt',
      sortOrder: queryParams.sortOrder || 'desc',
    });

    return {
      purchases,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async getPurchaseById(purchaseId) {
    const purchase = await findPurchaseById(purchaseId);
    if (!purchase) {
      throw new AppError('Purchase not found', 404);
    }

    const items = await findPurchaseItems(purchaseId);
    return { purchase: formatPurchase(purchase, items) };
  }

  async createPurchase(currentUser, data, ipAddress) {
    const supplier = await findSupplierById(data.supplierId);
    if (!supplier) {
      throw new AppError('Supplier not found', 404);
    }
    if (!supplier.is_active) {
      throw new AppError('Selected supplier is inactive', 400);
    }

    if (!Array.isArray(data.items) || data.items.length === 0) {
      throw new AppError('At least one product item is required', 400);
    }

    const connection = await getConnection();
    try {
      await connection.beginTransaction();

      const invoiceNumber = data.invoiceNumber?.trim()
        || await getNextPurchaseNumber(connection);

      const duplicateInvoice = await findPurchaseByInvoiceNumber(invoiceNumber);
      if (duplicateInvoice) {
        throw new AppError('A purchase with this invoice number already exists', 409);
      }

      const processedItems = [];
      for (const item of data.items) {
        const product = await getProductStockForUpdate(connection, item.productId);
        if (!product) {
          throw new AppError(`Product not found (ID: ${item.productId})`, 404);
        }

        const calculated = calculateLineItem(item);
        if (calculated.quantity <= 0) {
          throw new AppError(`Invalid quantity for product ${product.name}`, 400);
        }

        processedItems.push({
          productId: item.productId,
          productName: product.name,
          ...calculated,
        });
      }

      const subtotal = processedItems.reduce((sum, item) => sum + item.lineSubtotal, 0);
      const taxAmount = processedItems.reduce((sum, item) => sum + item.taxAmount, 0);
      const discountAmount = Number(data.discountAmount) || 0;
      const totalAmount = subtotal + taxAmount - discountAmount;
      const paidAmount = Math.min(Number(data.paidAmount) || 0, totalAmount);

      if (totalAmount < 0) {
        throw new AppError('Total amount cannot be negative', 400);
      }

      const purchaseId = await createPurchaseRecord(connection, {
        supplierId: data.supplierId,
        invoiceNumber,
        purchaseDate: data.purchaseDate,
        subtotal,
        taxAmount,
        discountAmount,
        totalAmount,
        paidAmount,
        paymentStatus: resolvePaymentStatus(paidAmount, totalAmount),
        remarks: data.remarks?.trim() || null,
        createdBy: currentUser.id,
      });

      for (const item of processedItems) {
        await createPurchaseItemRecord(connection, {
          purchaseId,
          productId: item.productId,
          quantity: item.quantity,
          purchasePrice: item.purchasePrice,
          sellingPrice: item.sellingPrice,
          gstRate: item.gstRate,
          taxAmount: item.taxAmount,
          totalAmount: item.totalAmount,
        });

        const productRow = await getProductStockForUpdate(connection, item.productId);
        const newStock = Number(productRow.current_stock) + item.quantity;

        await updateProductStock(connection, item.productId, newStock, {
          purchasePrice: item.purchasePrice,
          sellingPrice: item.sellingPrice,
          gstRate: item.gstRate,
        });

        await createStockMovementRecord(connection, {
          productId: item.productId,
          movementType: 'in',
          quantity: item.quantity,
          referenceType: 'purchase',
          referenceId: purchaseId,
          purchasePrice: item.purchasePrice,
          sellingPrice: item.sellingPrice,
          balanceAfter: newStock,
          remarks: `Stock in via purchase ${invoiceNumber}`,
          createdBy: currentUser.id,
        });
      }

      await connection.commit();

      await logActivity({
        userId: currentUser.id,
        action: 'purchase_created',
        entityType: 'purchase',
        entityId: purchaseId,
        details: { invoiceNumber, supplierId: data.supplierId, totalAmount },
        ipAddress,
      });

      return this.getPurchaseById(purchaseId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async createAdjustment(currentUser, data, ipAddress) {
    const connection = await getConnection();
    try {
      await connection.beginTransaction();

      const product = await getProductStockForUpdate(connection, data.productId);
      if (!product) {
        throw new AppError('Product not found', 404);
      }

      const quantity = Number(data.quantity);
      if (quantity <= 0) {
        throw new AppError('Quantity must be greater than 0', 400);
      }

      const movementType = data.movementType;
      if (!['in', 'out'].includes(movementType)) {
        throw new AppError('Movement type must be in or out', 400);
      }

      const currentStock = Number(product.current_stock);
      let newStock;

      if (movementType === 'in') {
        newStock = currentStock + quantity;
      } else {
        if (currentStock < quantity) {
          throw new AppError(`Insufficient stock. Available: ${currentStock}`, 400);
        }
        newStock = currentStock - quantity;
      }

      await updateProductStock(connection, data.productId, newStock);

      const movementId = await createStockMovementRecord(connection, {
        productId: data.productId,
        movementType,
        quantity,
        referenceType: 'adjustment',
        referenceId: null,
        purchasePrice: null,
        sellingPrice: null,
        balanceAfter: newStock,
        remarks: data.remarks?.trim() || `Manual stock ${movementType}`,
        createdBy: currentUser.id,
      });

      await connection.commit();

      await logActivity({
        userId: currentUser.id,
        action: 'stock_adjusted',
        entityType: 'stock_movement',
        entityId: movementId,
        details: { productId: data.productId, movementType, quantity },
        ipAddress,
      });

      const productData = await findProductById(data.productId);
      return {
        movement: {
          id: movementId,
          productId: data.productId,
          productName: productData.name,
          movementType,
          quantity,
          balanceAfter: newStock,
        },
        product: {
          id: data.productId,
          currentStock: newStock,
        },
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async listStockHistory(queryParams) {
    const page = Math.max(parseInt(queryParams.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(queryParams.limit, 10) || 10, 1), 100);

    const { movements, total } = await findStockMovements({
      search: queryParams.search?.trim() || '',
      productId: queryParams.productId || null,
      movementType: queryParams.movementType || null,
      referenceType: queryParams.referenceType || null,
      period: queryParams.period || null,
      dateFrom: queryParams.dateFrom || null,
      dateTo: queryParams.dateTo || null,
      page,
      limit,
      sortOrder: queryParams.sortOrder || 'desc',
    });

    return {
      movements,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async getProductStockHistory(productId, queryParams) {
    const product = await findProductById(productId);
    if (!product) {
      throw new AppError('Product not found', 404);
    }

    const page = Math.max(parseInt(queryParams.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(queryParams.limit, 10) || 10, 1), 100);
    const { movements, total } = await findProductStockHistory(productId, page, limit);

    return {
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        currentStock: Number(product.current_stock),
        minStock: Number(product.min_stock),
      },
      movements,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async listLowStock(queryParams) {
    const page = Math.max(parseInt(queryParams.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(queryParams.limit, 10) || 10, 1), 100);

    const { products, total } = await findProducts({
      search: queryParams.search?.trim() || '',
      status: 'active',
      lowStock: true,
      page,
      limit,
      sortBy: queryParams.sortBy || 'currentStock',
      sortOrder: queryParams.sortOrder || 'asc',
    });

    return {
      products,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async exportStockHistory(queryParams, format) {
    const filters = {
      search: queryParams.search?.trim() || '',
      productId: queryParams.productId || null,
      movementType: queryParams.movementType || null,
      referenceType: queryParams.referenceType || null,
      period: queryParams.period || null,
      dateFrom: queryParams.dateFrom || null,
      dateTo: queryParams.dateTo || null,
    };

    const movements = await findStockMovementsForExport(filters);

    if (format === 'excel') {
      const workbook = await buildStockHistoryWorkbook(movements, filters);
      const buffer = await workbook.xlsx.writeBuffer();
      return {
        buffer,
        filename: `stock-history-${Date.now()}.xlsx`,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    }

    const buffer = await buildStockHistoryPdf(movements, filters);
    return {
      buffer,
      filename: `stock-history-${Date.now()}.pdf`,
      contentType: 'application/pdf',
    };
  }

  async exportLowStock(format) {
    const { products } = await findProducts({
      status: 'active',
      lowStock: true,
      page: 1,
      limit: 10000,
      sortBy: 'currentStock',
      sortOrder: 'asc',
    });

    if (format === 'excel') {
      const workbook = await buildLowStockWorkbook(products);
      const buffer = await workbook.xlsx.writeBuffer();
      return {
        buffer,
        filename: `low-stock-${Date.now()}.xlsx`,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    }

    const buffer = await buildLowStockPdf(products);
    return {
      buffer,
      filename: `low-stock-${Date.now()}.pdf`,
      contentType: 'application/pdf',
    };
  }
}

export default new StockService();
