import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import stockService from '../../services/stockService';
import productService from '../../services/productService';
import LoadingSpinner from '../common/LoadingSpinner';

const AdjustmentFormModal = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      productId: '',
      movementType: 'in',
      quantity: 1,
      remarks: '',
    },
  });

  useEffect(() => {
    if (!isOpen) return;

    reset({
      productId: '',
      movementType: 'in',
      quantity: 1,
      remarks: '',
    });

    const fetchProducts = async () => {
      setLoading(true);
      try {
        const response = await productService.getProducts({ page: 1, limit: 100, status: 'active' });
        setProducts(response.data.data);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [isOpen, reset]);

  const onSubmit = async (data) => {
    try {
      await stockService.createAdjustment({
        productId: Number(data.productId),
        movementType: data.movementType,
        quantity: Number(data.quantity),
        remarks: data.remarks?.trim() || '',
      });
      toast.success('Stock adjustment saved successfully');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Adjustment failed');
    }
  };

  if (loading) {
    return <div className="py-8"><LoadingSpinner /></div>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Product *</label>
        <select
          {...register('productId', { required: 'Product is required' })}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
        >
          <option value="">Select product</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name} ({product.sku}) — Stock: {product.currentStock}
            </option>
          ))}
        </select>
        {errors.productId && <p className="mt-1 text-xs text-red-600">{errors.productId.message}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Type *</label>
          <select
            {...register('movementType', { required: true })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
          >
            <option value="in">Stock In (+)</option>
            <option value="out">Stock Out (-)</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Quantity *</label>
          <input
            type="number"
            step="0.001"
            min="0.001"
            {...register('quantity', { required: 'Quantity is required', min: 0.001 })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Remarks</label>
        <textarea
          {...register('remarks')}
          rows={2}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
          placeholder="Reason for adjustment..."
        />
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
        <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-70"
        >
          {isSubmitting ? <LoadingSpinner size="sm" /> : 'Save Adjustment'}
        </button>
      </div>
    </form>
  );
};

export default AdjustmentFormModal;
