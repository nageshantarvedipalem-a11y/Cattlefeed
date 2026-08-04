import {
  findProducts,
  findProductById,
  findProductBySku,
  findProductByBarcode,
  createProductRecord,
  updateProductRecord,
  deleteProductRecord,
  countProductTransactions,
  formatProduct,
  getConnection,
} from '../repositories/product.repository.js';
import { findActiveCategories, findCategoryById } from '../repositories/category.repository.js';
import { findActiveBrands, findBrandById } from '../repositories/brand.repository.js';
import { logActivity } from '../repositories/activityLog.repository.js';
import { AppError } from '../utils/apiResponse.js';

const VALID_STATUSES = ['active', 'inactive', 'discontinued'];

const validateReferences = async (categoryId, brandId) => {
  if (categoryId) {
    const category = await findCategoryById(categoryId);
    if (!category) {
      throw new AppError('Selected category not found', 400);
    }
    if (!category.is_active) {
      throw new AppError('Selected category is inactive', 400);
    }
  }

  if (brandId) {
    const brand = await findBrandById(brandId);
    if (!brand) {
      throw new AppError('Selected brand not found', 400);
    }
    if (!brand.is_active) {
      throw new AppError('Selected brand is inactive', 400);
    }
  }
};

const validateUniqueFields = async (data, excludeId = null) => {
  if (data.sku) {
    const duplicateSku = await findProductBySku(data.sku, excludeId);
    if (duplicateSku) {
      throw new AppError('A product with this SKU already exists', 409);
    }
  }

  if (data.barcode) {
    const duplicateBarcode = await findProductByBarcode(data.barcode, excludeId);
    if (duplicateBarcode) {
      throw new AppError('A product with this barcode already exists', 409);
    }
  }
};

export class ProductService {
  async listProducts(queryParams) {
    const page = Math.max(parseInt(queryParams.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(queryParams.limit, 10) || 10, 1), 100);

    const { products, total } = await findProducts({
      search: queryParams.search?.trim() || '',
      categoryId: queryParams.categoryId || null,
      brandId: queryParams.brandId || null,
      status: queryParams.status || null,
      lowStock: queryParams.lowStock,
      page,
      limit,
      sortBy: queryParams.sortBy || 'createdAt',
      sortOrder: queryParams.sortOrder || 'desc',
    });

    return {
      products,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async getProductById(productId) {
    const product = await findProductById(productId);
    if (!product) {
      throw new AppError('Product not found', 404);
    }
    return { product: formatProduct(product) };
  }

  async getProductMeta() {
    const [categories, brands] = await Promise.all([
      findActiveCategories(),
      findActiveBrands(),
    ]);

    return { categories, brands };
  }

  async createProduct(currentUser, data, ipAddress) {
    if (data.status && !VALID_STATUSES.includes(data.status)) {
      throw new AppError('Invalid product status', 400);
    }

    await validateReferences(data.categoryId || null, data.brandId || null);
    await validateUniqueFields(data);

    const connection = await getConnection();
    try {
      await connection.beginTransaction();

      const productId = await createProductRecord(connection, {
        categoryId: data.categoryId ? Number(data.categoryId) : null,
        brandId: data.brandId ? Number(data.brandId) : null,
        name: data.name.trim(),
        sku: data.sku.trim().toUpperCase(),
        barcode: data.barcode?.trim() || null,
        purchasePrice: Number(data.purchasePrice) || 0,
        sellingPrice: Number(data.sellingPrice) || 0,
        gstRate: Number(data.gstRate) || 0,
        currentStock: Number(data.currentStock) || 0,
        minStock: Number(data.minStock) || 0,
        status: data.status || 'active',
      });

      await connection.commit();

      await logActivity({
        userId: currentUser.id,
        action: 'product_created',
        entityType: 'product',
        entityId: productId,
        details: { name: data.name, sku: data.sku },
        ipAddress,
      });

      return this.getProductById(productId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateProduct(currentUser, productId, data, ipAddress) {
    const existing = await findProductById(productId);
    if (!existing) {
      throw new AppError('Product not found', 404);
    }

    if (data.status && !VALID_STATUSES.includes(data.status)) {
      throw new AppError('Invalid product status', 400);
    }

    const categoryId = data.categoryId !== undefined
      ? (data.categoryId ? Number(data.categoryId) : null)
      : existing.category_id;
    const brandId = data.brandId !== undefined
      ? (data.brandId ? Number(data.brandId) : null)
      : existing.brand_id;

    await validateReferences(categoryId, brandId);

    if (data.sku || data.barcode) {
      await validateUniqueFields(
        {
          sku: data.sku || existing.sku,
          barcode: data.barcode !== undefined ? data.barcode : existing.barcode,
        },
        productId
      );
    }

    const connection = await getConnection();
    try {
      await connection.beginTransaction();

      const updateData = {};
      if (data.categoryId !== undefined) updateData.categoryId = data.categoryId ? Number(data.categoryId) : null;
      if (data.brandId !== undefined) updateData.brandId = data.brandId ? Number(data.brandId) : null;
      if (data.name !== undefined) updateData.name = data.name.trim();
      if (data.sku !== undefined) updateData.sku = data.sku.trim().toUpperCase();
      if (data.barcode !== undefined) updateData.barcode = data.barcode?.trim() || null;
      if (data.purchasePrice !== undefined) updateData.purchasePrice = Number(data.purchasePrice) || 0;
      if (data.sellingPrice !== undefined) updateData.sellingPrice = Number(data.sellingPrice) || 0;
      if (data.gstRate !== undefined) updateData.gstRate = Number(data.gstRate) || 0;
      if (data.currentStock !== undefined) updateData.currentStock = Number(data.currentStock) || 0;
      if (data.minStock !== undefined) updateData.minStock = Number(data.minStock) || 0;
      if (data.status !== undefined) updateData.status = data.status;

      await updateProductRecord(connection, productId, updateData);
      await connection.commit();

      await logActivity({
        userId: currentUser.id,
        action: 'product_updated',
        entityType: 'product',
        entityId: productId,
        details: { name: data.name || existing.name, sku: data.sku || existing.sku },
        ipAddress,
      });

      return this.getProductById(productId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateProductStatus(currentUser, productId, status, ipAddress) {
    if (!VALID_STATUSES.includes(status)) {
      throw new AppError('Invalid product status', 400);
    }

    const existing = await findProductById(productId);
    if (!existing) {
      throw new AppError('Product not found', 404);
    }

    const connection = await getConnection();
    try {
      await connection.beginTransaction();
      await updateProductRecord(connection, productId, { status });
      await connection.commit();

      await logActivity({
        userId: currentUser.id,
        action: 'product_status_updated',
        entityType: 'product',
        entityId: productId,
        details: { name: existing.name, status },
        ipAddress,
      });

      return this.getProductById(productId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async deleteProduct(currentUser, productId, ipAddress) {
    const existing = await findProductById(productId);
    if (!existing) {
      throw new AppError('Product not found', 404);
    }

    const transactionCount = await countProductTransactions(productId);
    if (transactionCount > 0) {
      throw new AppError(
        'Cannot delete product with existing purchase or sale records. Set status to discontinued instead.',
        400
      );
    }

    await deleteProductRecord(productId);

    await logActivity({
      userId: currentUser.id,
      action: 'product_deleted',
      entityType: 'product',
      entityId: productId,
      details: { name: existing.name, sku: existing.sku },
      ipAddress,
    });

    return { message: 'Product deleted successfully' };
  }
}

export default new ProductService();
