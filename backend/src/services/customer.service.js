import {
  findCustomers,
  findCustomerById,
  findCustomerByPhone,
  findDistinctVillages,
  createCustomerRecord,
  updateCustomerRecord,
  deleteCustomerRecord,
  countCustomerReferences,
  findCustomerSales,
  findCustomerLedger,
  findPendingPayments,
  formatCustomer,
  getConnection,
} from '../repositories/customer.repository.js';
import {
  createOpeningLedgerEntry,
  findOpeningLedgerEntry,
  updateOpeningLedgerEntry,
  countNonOpeningLedgerEntries,
} from '../repositories/customerLedger.repository.js';
import { logActivity } from '../repositories/activityLog.repository.js';
import { AppError } from '../utils/apiResponse.js';

export class CustomerService {
  async listCustomers(queryParams) {
    const page = Math.max(parseInt(queryParams.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(queryParams.limit, 10) || 10, 1), 100);

    const { customers, total } = await findCustomers({
      search: queryParams.search?.trim() || '',
      village: queryParams.village?.trim() || '',
      isActive: queryParams.isActive,
      page,
      limit,
      sortBy: queryParams.sortBy || 'createdAt',
      sortOrder: queryParams.sortOrder || 'desc',
    });

    return {
      customers,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async getVillages() {
    const villages = await findDistinctVillages();
    return { villages };
  }

  async getCustomerById(customerId) {
    const customer = await findCustomerById(customerId);
    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    const pendingPayments = await findPendingPayments(customerId);

    return {
      customer: formatCustomer(customer),
      pendingPayments,
    };
  }

  async getCustomerSales(customerId, queryParams) {
    const customer = await findCustomerById(customerId);
    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    const page = Math.max(parseInt(queryParams.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(queryParams.limit, 10) || 10, 1), 100);
    const { sales, total } = await findCustomerSales(customerId, page, limit);

    return {
      sales,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async getCustomerLedger(customerId, queryParams) {
    const customer = await findCustomerById(customerId);
    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    const page = Math.max(parseInt(queryParams.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(queryParams.limit, 10) || 10, 1), 100);
    const { ledger, total } = await findCustomerLedger(customerId, page, limit);

    return {
      ledger,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async createCustomer(currentUser, data, ipAddress) {
    const duplicate = await findCustomerByPhone(data.phone);
    if (duplicate) {
      throw new AppError('A customer with this phone number already exists', 409);
    }

    const connection = await getConnection();
    try {
      await connection.beginTransaction();

      const customerId = await createCustomerRecord(connection, {
        name: data.name.trim(),
        phone: data.phone.trim(),
        village: data.village?.trim() || null,
        address: data.address?.trim() || null,
        openingBalance: Number(data.openingBalance) || 0,
        openingBalanceType: data.openingBalanceType || 'debit',
        creditLimit: Number(data.creditLimit) || 0,
        notes: data.notes?.trim() || null,
        isActive: data.isActive !== false,
      });

      if (Number(data.openingBalance) > 0) {
        await createOpeningLedgerEntry(connection, {
          customerId,
          openingBalance: Number(data.openingBalance),
          openingBalanceType: data.openingBalanceType || 'debit',
          createdBy: currentUser.id,
        });
      }

      await connection.commit();

      await logActivity({
        userId: currentUser.id,
        action: 'customer_created',
        entityType: 'customer',
        entityId: customerId,
        details: { name: data.name, phone: data.phone },
        ipAddress,
      });

      return this.getCustomerById(customerId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateCustomer(currentUser, customerId, data, ipAddress) {
    const existing = await findCustomerById(customerId);
    if (!existing) {
      throw new AppError('Customer not found', 404);
    }

    if (data.phone) {
      const duplicate = await findCustomerByPhone(data.phone, customerId);
      if (duplicate) {
        throw new AppError('A customer with this phone number already exists', 409);
      }
    }

    const connection = await getConnection();
    try {
      await connection.beginTransaction();

      const updateData = {};
      if (data.name !== undefined) updateData.name = data.name.trim();
      if (data.phone !== undefined) updateData.phone = data.phone.trim();
      if (data.village !== undefined) updateData.village = data.village?.trim() || null;
      if (data.address !== undefined) updateData.address = data.address?.trim() || null;
      if (data.creditLimit !== undefined) updateData.creditLimit = Number(data.creditLimit) || 0;
      if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;

      const openingChanged = data.openingBalance !== undefined || data.openingBalanceType !== undefined;
      if (openingChanged) {
        const otherEntries = await countNonOpeningLedgerEntries(customerId);
        if (otherEntries > 0) {
          throw new AppError(
            'Opening balance cannot be changed after transactions exist. Use ledger adjustment in Phase 9.',
            400
          );
        }

        const openingBalance = Number(data.openingBalance ?? existing.opening_balance);
        const openingBalanceType = data.openingBalanceType || existing.opening_balance_type;

        updateData.openingBalance = openingBalance;
        updateData.openingBalanceType = openingBalanceType;

        const openingEntry = await findOpeningLedgerEntry(customerId);

        if (openingBalance > 0) {
          if (openingEntry) {
            await updateOpeningLedgerEntry(connection, openingEntry.id, {
              openingBalance,
              openingBalanceType,
            });
          } else {
            await createOpeningLedgerEntry(connection, {
              customerId,
              openingBalance,
              openingBalanceType,
              createdBy: currentUser.id,
            });
          }
        } else if (openingEntry) {
          await connection.execute('DELETE FROM customer_ledger WHERE id = ?', [openingEntry.id]);
        }
      }

      await updateCustomerRecord(connection, customerId, updateData);
      await connection.commit();

      await logActivity({
        userId: currentUser.id,
        action: 'customer_updated',
        entityType: 'customer',
        entityId: customerId,
        details: { name: data.name || existing.name },
        ipAddress,
      });

      return this.getCustomerById(customerId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateCustomerStatus(currentUser, customerId, isActive, ipAddress) {
    const existing = await findCustomerById(customerId);
    if (!existing) {
      throw new AppError('Customer not found', 404);
    }

    const connection = await getConnection();
    try {
      await connection.beginTransaction();
      await updateCustomerRecord(connection, customerId, { isActive });
      await connection.commit();

      await logActivity({
        userId: currentUser.id,
        action: isActive ? 'customer_enabled' : 'customer_disabled',
        entityType: 'customer',
        entityId: customerId,
        details: { name: existing.name },
        ipAddress,
      });

      return this.getCustomerById(customerId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async deleteCustomer(currentUser, customerId, ipAddress) {
    const existing = await findCustomerById(customerId);
    if (!existing) {
      throw new AppError('Customer not found', 404);
    }

    const refs = await countCustomerReferences(customerId);
    if (refs > 0) {
      throw new AppError(
        'Cannot delete customer with existing sales or payments. Disable the customer instead.',
        400
      );
    }

    const connection = await getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute('DELETE FROM customer_ledger WHERE customer_id = ?', [customerId]);
      await connection.execute('DELETE FROM customers WHERE id = ?', [customerId]);
      await connection.commit();

      await logActivity({
        userId: currentUser.id,
        action: 'customer_deleted',
        entityType: 'customer',
        entityId: customerId,
        details: { name: existing.name },
        ipAddress,
      });

      return { message: 'Customer deleted successfully' };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

export default new CustomerService();
