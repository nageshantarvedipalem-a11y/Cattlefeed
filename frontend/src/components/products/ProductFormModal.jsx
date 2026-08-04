import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import productService from '../../services/productService';
import LoadingSpinner from '../common/LoadingSpinner';

const ProductFormModal = ({ isOpen, onClose, onSuccess, product = null }) => {
  const isEdit = Boolean(product);
  const [metaLoading, setMetaLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      name: '',
      sku: '',
      barcode: '',
      categoryId: '',
      brandId: '',
      purchasePrice: 0,
      sellingPrice: 0,
      gstRate: 0,
      currentStock: 0,
      minStock: 0,
      status: 'active',
    },
  });

  useEffect(() => {
    if (!isOpen) return;

    const fetchMeta = async () => {
      setMetaLoading(true);
      try {
        const response = await productService.getProductMeta();
        setCategories(response.data.data.categories);
        setBrands(response.data.data.brands);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load categories and brands');
      } finally {
        setMetaLoading(false);
      }
    };

    fetchMeta();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      reset({
        name: product?.name || '',
        sku: product?.sku || '',
        barcode: product?.barcode || '',
        categoryId: product?.categoryId ? String(product.categoryId) : '',
        brandId: product?.brandId ? String(product.brandId) : '',
        purchasePrice: product?.purchasePrice ?? 0,
        sellingPrice: product?.sellingPrice ?? 0,
        gstRate: product?.gstRate ?? 0,
        currentStock: product?.currentStock ?? 0,
        minStock: product?.minStock ?? 0,
        status: product?.status || 'active',
      });
    }
  }, [isOpen, product, reset]);

  const onSubmit = async (data) => {
    try {
      const payload = {
        name: data.name.trim(),
        sku: data.sku.trim().toUpperCase(),
        barcode: data.barcode?.trim() || '',
        categoryId: data.categoryId ? Number(data.categoryId) : null,
        brandId: data.brandId ? Number(data.brandId) : null,
        purchasePrice: Number(data.purchasePrice) || 0,
        sellingPrice: Number(data.sellingPrice) || 0,
        gstRate: Number(data.gstRate) || 0,
        currentStock: Number(data.currentStock) || 0,
        minStock: Number(data.minStock) || 0,
        status: data.status,
      };

      if (isEdit) {
        await productService.updateProduct(product.id, payload);
        toast.success('Product updated successfully');
      } else {
        await productService.createProduct(payload);
        toast.success('Product created successfully');
      }

      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  if (metaLoading) {
    return (
      <div className="py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">Product Name *</label>
          <input
            {...register('name', { required: 'Product name is required' })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            placeholder="Enter product name"
          />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">SKU *</label>
          <input
            {...register('sku', { required: 'SKU is required' })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            placeholder="CF-001"
          />
          {errors.sku && <p className="mt-1 text-xs text-red-600">{errors.sku.message}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Barcode</label>
          <input
            {...register('barcode')}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            placeholder="Optional barcode"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
          <select
            {...register('categoryId')}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          >
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Brand</label>
          <select
            {...register('brandId')}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          >
            <option value="">Select brand</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>{brand.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Purchase Price</label>
          <input
            type="number"
            step="0.01"
            min="0"
            {...register('purchasePrice', { min: { value: 0, message: 'Must be 0 or greater' } })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Selling Price</label>
          <input
            type="number"
            step="0.01"
            min="0"
            {...register('sellingPrice', { min: { value: 0, message: 'Must be 0 or greater' } })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">GST Rate (%)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="100"
            {...register('gstRate', {
              min: { value: 0, message: 'Must be 0 or greater' },
              max: { value: 100, message: 'Must be 100 or less' },
            })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
          <select
            {...register('status')}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="discontinued">Discontinued</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Current Stock</label>
          <input
            type="number"
            step="0.001"
            min="0"
            {...register('currentStock', { min: { value: 0, message: 'Must be 0 or greater' } })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Minimum Stock</label>
          <input
            type="number"
            step="0.001"
            min="0"
            {...register('minStock', { min: { value: 0, message: 'Must be 0 or greater' } })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-70"
        >
          {isSubmitting ? <LoadingSpinner size="sm" /> : isEdit ? 'Update Product' : 'Create Product'}
        </button>
      </div>
    </form>
  );
};

export default ProductFormModal;
