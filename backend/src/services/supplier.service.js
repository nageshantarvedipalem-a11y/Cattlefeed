import {
  findSuppliers,
  findSupplierById,
  findSupplierByName,
  createSupplierRecord,
  updateSupplierRecord,
  findSupplierPurchases,
  formatSupplier,
  getConnection,
} from '../repositories/supplier.repository.js';
import { createSupplierPaymentRecord } from '../repositories/purchase.repository.js';
import { allocateAmountToPendingPurchases } from '../helpers/supplierPaymentAllocation.helper.js';
import { postCashBookEntry } from '../helpers/cashBookPost.helper.js';
import { logActivity } from '../repositories/activityLog.repository.js';
import { AppError } from '../utils/apiResponse.js';

export class SupplierService {
  async listSuppliers(queryParams) {
    const page = Math.max(parseInt(queryParams.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(queryParams.limit, 10) || 10, 1), 100);

    const { suppliers, total } = await findSuppliers({
      search: queryParams.search?.trim() || '',
      isActive: queryParams.isActive,
      page,
      limit,
      sortBy: queryParams.sortBy || 'createdAt',
      sortOrder: queryParams.sortOrder || 'desc',
    });

    return {
      suppliers,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async getSupplierById(supplierId) {
    const supplier = await findSupplierById(supplierId);
    if (!supplier) {
      throw new AppError('Supplier not found', 404);
    }
    return { supplier: formatSupplier(supplier) };
  }

  async getSupplierPurchases(supplierId, queryParams) {
    const supplier = await findSupplierById(supplierId);
    if (!supplier) {
      throw new AppError('Supplier not found', 404);
    }

    const page = Math.max(parseInt(queryParams.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(queryParams.limit, 10) || 10, 1), 100);
    const { purchases, total } = await findSupplierPurchases(supplierId, page, limit);

    return {
      purchases,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async createSupplier(currentUser, data, ipAddress) {
    const duplicate = await findSupplierByName(data.name);
    if (duplicate) {
      throw new AppError('A supplier with this name already exists', 409);
    }

    const connection = await getConnection();
    try {
      await connection.beginTransaction();

      const supplierId = await createSupplierRecord(connection, {
        name: data.name.trim(),
        phone: data.phone?.trim() || null,
        address: data.address?.trim() || null,
        gstNumber: data.gstNumber?.trim().toUpperCase() || null,
        openingBalance: Number(data.openingBalance) || 0,
        notes: data.notes?.trim() || null,
        isActive: data.isActive !== false,
      });

      await connection.commit();

      await logActivity({
        userId: currentUser.id,
        action: 'supplier_created',
        entityType: 'supplier',
        entityId: supplierId,
        details: { name: data.name },
        ipAddress,
      });

      return this.getSupplierById(supplierId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateSupplier(currentUser, supplierId, data, ipAddress) {
    const existing = await findSupplierById(supplierId);
    if (!existing) {
      throw new AppError('Supplier not found', 404);
    }

    if (data.name) {
      const duplicate = await findSupplierByName(data.name, supplierId);
      if (duplicate) {
        throw new AppError('A supplier with this name already exists', 409);
      }
    }

    const connection = await getConnection();
    try {
      await connection.beginTransaction();

      const updateData = {};
      if (data.name !== undefined) updateData.name = data.name.trim();
      if (data.phone !== undefined) updateData.phone = data.phone?.trim() || null;
      if (data.address !== undefined) updateData.address = data.address?.trim() || null;
      if (data.gstNumber !== undefined) updateData.gstNumber = data.gstNumber?.trim().toUpperCase() || null;
      if (data.openingBalance !== undefined) updateData.openingBalance = Number(data.openingBalance) || 0;
      if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;

      await updateSupplierRecord(connection, supplierId, updateData);
      await connection.commit();

      await logActivity({
        userId: currentUser.id,
        action: 'supplier_updated',
        entityType: 'supplier',
        entityId: supplierId,
        details: { name: data.name || existing.name },
        ipAddress,
      });

      return this.getSupplierById(supplierId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateSupplierStatus(currentUser, supplierId, isActive, ipAddress) {
    const existing = await findSupplierById(supplierId);
    if (!existing) {
      throw new AppError('Supplier not found', 404);
    }

    const connection = await getConnection();
    try {
      await connection.beginTransaction();
      await updateSupplierRecord(connection, supplierId, { isActive });
      await connection.commit();

      await logActivity({
        userId: currentUser.id,
        action: isActive ? 'supplier_enabled' : 'supplier_disabled',
        entityType: 'supplier',
        entityId: supplierId,
        details: { name: existing.name },
        ipAddress,
      });

      return this.getSupplierById(supplierId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async deleteSupplier(currentUser, supplierId, ipAddress) {
    const existing = await findSupplierById(supplierId);
    if (!existing) {
      throw new AppError('Supplier not found', 404);
    }

    const connection = await getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(
        'UPDATE purchases SET supplier_id = NULL WHERE supplier_id = ?',
        [supplierId]
      );
      await connection.execute('DELETE FROM suppliers WHERE id = ?', [supplierId]);
      await connection.commit();

      await logActivity({
        userId: currentUser.id,
        action: 'supplier_deleted',
        entityType: 'supplier',
        entityId: supplierId,
        details: { name: existing.name },
        ipAddress,
      });

      return { message: 'Supplier deleted successfully' };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async paySupplier(currentUser, supplierId, data, ipAddress) {
    const supplier = await findSupplierById(supplierId);
    if (!supplier) {
      throw new AppError('Supplier not found', 404);
    }

    const amount = Number(data.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new AppError('Payment amount must be greater than 0', 400);
    }

    const paymentMethod = data.paymentMethod || 'cash';
    const paymentDate = data.paymentDate
      ? String(data.paymentDate).slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    const connection = await getConnection();
    try {
      await connection.beginTransaction();

      const allocation = await allocateAmountToPendingPurchases(connection, {
        supplierId: Number(supplierId),
        amount,
      });

      if (allocation.allocated + 0.01 < amount) {
        throw new AppError(
          `Payment amount cannot exceed this supplier's pending balance of ${allocation.allocated.toFixed(2)}`,
          400
        );
      }

      const primaryPurchase = allocation.updatedPurchases[0] || null;
      const supplierPaymentId = await createSupplierPaymentRecord(connection, {
        supplierId: Number(supplierId),
        purchaseId: primaryPurchase?.id || null,
        paymentDate,
        amount,
        paymentMethod,
        referenceNumber: data.referenceNumber?.trim() || primaryPurchase?.invoiceNumber || null,
        remarks: data.remarks?.trim() || `Supplier payment to ${supplier.name}`,
        createdBy: currentUser.id,
      });

      await postCashBookEntry(connection, {
        transactionDate: paymentDate,
        transactionType: 'expense',
        category: 'Supplier Payment',
        description: data.remarks?.trim() || 'Feed purchase payment',
        amount,
        paymentMethod,
        referenceType: 'supplier_payment',
        referenceId: supplierPaymentId,
        referenceNumber: data.referenceNumber?.trim() || primaryPurchase?.invoiceNumber || `PAY-${supplierPaymentId}`,
        remarks: `Supplier payment #${supplierPaymentId}`,
        partyName: supplier.name,
        partyType: 'supplier',
        partyId: Number(supplierId),
        source: 'supplier_payment',
        createdBy: currentUser.id,
      }, { allowNegative: true });

      await connection.commit();

      await logActivity({
        userId: currentUser.id,
        action: 'supplier_payment_created',
        entityType: 'supplier_payment',
        entityId: supplierPaymentId,
        details: {
          supplierId: Number(supplierId),
          amount,
          paymentMethod,
          purchases: allocation.updatedPurchases.map((item) => item.invoiceNumber),
        },
        ipAddress,
      });

      const updated = await this.getSupplierById(supplierId);
      return {
        ...updated,
        payment: {
          id: supplierPaymentId,
          amount,
          paymentMethod,
          paymentDate,
          allocations: allocation.updatedPurchases,
        },
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

export default new SupplierService();
