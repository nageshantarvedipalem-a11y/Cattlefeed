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
}

export default new SupplierService();
