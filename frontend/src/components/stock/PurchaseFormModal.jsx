import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import stockService from '../../services/stockService';
import supplierService from '../../services/supplierService';
import productService from '../../services/productService';
import LoadingSpinner from '../common/LoadingSpinner';

const emptyItem = {
  productId: '',
  quantity: 1,
  purchasePrice: 0,
  sellingPrice: 0,
  gstRate: 0,
};

const PurchaseFormModal = ({ isOpen, onClose, onSuccess }) => {
  const [metaLoading, setMetaLoading] = useState(true);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      supplierId: '',
      invoiceNumber: '',
      purchaseDate: new Date().toISOString().slice(0, 10),
      discountAmount: 0,
      paidAmount: 0,
      remarks: '',
      items: [{ ...emptyItem }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchedItems = watch('items');

  useEffect(() => {
    if (!isOpen) return;

    reset({
      supplierId: '',
      invoiceNumber: '',
      purchaseDate: new Date().toISOString().slice(0, 10),
      discountAmount: 0,
      paidAmount: 0,
      remarks: '',
      items: [{ ...emptyItem }],
    });

    const fetchMeta = async () => {
      setMetaLoading(true);
      try {
        const [suppliersRes, productsRes] = await Promise.all([
          supplierService.getSuppliers({ page: 1, limit: 100, isActive: 'true' }),
          productService.getProducts({ page: 1, limit: 100, status: 'active' }),
        ]);
        setSuppliers(suppliersRes.data.data);
        setProducts(productsRes.data.data);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load form data');
      } finally {
        setMetaLoading(false);
      }
    };

    fetchMeta();
  }, [isOpen, reset]);

  const handleProductChange = (index, productId) => {
    const product = products.find((p) => p.id === Number(productId));
    if (!product) return;

    setValue(`items.${index}.purchasePrice`, product.purchasePrice);
    setValue(`items.${index}.sellingPrice`, product.sellingPrice);
    setValue(`items.${index}.gstRate`, product.gstRate);
  };

  const calculateTotals = () => {
    const items = watchedItems || [];
    let subtotal = 0;
    let tax = 0;

    items.forEach((item) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.purchasePrice) || 0;
      const gst = Number(item.gstRate) || 0;
      const lineSubtotal = qty * price;
      subtotal += lineSubtotal;
      tax += (lineSubtotal * gst) / 100;
    });

    const discount = Number(watch('discountAmount')) || 0;
    const total = subtotal + tax - discount;

    return { subtotal, tax, total };
  };

  const totals = calculateTotals();

  const onSubmit = async (data) => {
    try {
      const payload = {
        supplierId: Number(data.supplierId),
        invoiceNumber: data.invoiceNumber?.trim() || undefined,
        purchaseDate: data.purchaseDate,
        discountAmount: Number(data.discountAmount) || 0,
        paidAmount: Number(data.paidAmount) || 0,
        remarks: data.remarks?.trim() || '',
        items: data.items.map((item) => ({
          productId: Number(item.productId),
          quantity: Number(item.quantity),
          purchasePrice: Number(item.purchasePrice),
          sellingPrice: Number(item.sellingPrice),
          gstRate: Number(item.gstRate) || 0,
        })),
      };

      await stockService.createPurchase(payload);
      toast.success('Stock-in entry created successfully');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create purchase');
    }
  };

  if (metaLoading) {
    return <div className="py-8"><LoadingSpinner /></div>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Supplier *</label>
          <select
            {...register('supplierId', { required: 'Supplier is required' })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
          >
            <option value="">Select supplier</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
            ))}
          </select>
          {errors.supplierId && <p className="mt-1 text-xs text-red-600">{errors.supplierId.message}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Invoice Number</label>
          <input
            {...register('invoiceNumber')}
            placeholder="Auto-generated if empty"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Purchase Date *</label>
          <input
            type="date"
            {...register('purchaseDate', { required: 'Purchase date is required' })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Paid Amount</label>
          <input
            type="number"
            step="0.01"
            min="0"
            {...register('paidAmount', { min: { value: 0, message: 'Must be 0 or greater' } })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
          />
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Products</h3>
          <button
            type="button"
            onClick={() => append({ ...emptyItem })}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <FiPlus className="h-3.5 w-3.5" /> Add Item
          </button>
        </div>

        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="rounded-lg border border-slate-200 p-3">
              <div className="grid gap-3 sm:grid-cols-6">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-slate-600">Product *</label>
                  <select
                    {...register(`items.${index}.productId`, { required: 'Product is required' })}
                    onChange={(e) => handleProductChange(index, e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-primary-500"
                  >
                    <option value="">Select product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} ({product.sku})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Qty *</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    {...register(`items.${index}.quantity`, { required: true, min: 0.001 })}
                    className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Purchase</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register(`items.${index}.purchasePrice`, { min: 0 })}
                    className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Selling</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register(`items.${index}.sellingPrice`, { min: 0 })}
                    className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-primary-500"
                  />
                </div>

                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="mb-1 block text-xs font-medium text-slate-600">GST %</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      {...register(`items.${index}.gstRate`, { min: 0 })}
                      className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-primary-500"
                    />
                  </div>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                      title="Remove item"
                    >
                      <FiTrash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Discount Amount</label>
          <input
            type="number"
            step="0.01"
            min="0"
            {...register('discountAmount', { min: 0 })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Remarks</label>
          <input
            {...register('remarks')}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
            placeholder="Optional remarks"
          />
        </div>
      </div>

      <div className="rounded-lg bg-slate-50 p-4 text-sm">
        <div className="flex justify-between"><span>Subtotal</span><span>₹{totals.subtotal.toFixed(2)}</span></div>
        <div className="flex justify-between"><span>Tax</span><span>₹{totals.tax.toFixed(2)}</span></div>
        <div className="mt-1 flex justify-between border-t border-slate-200 pt-2 font-semibold">
          <span>Total</span><span>₹{totals.total.toFixed(2)}</span>
        </div>
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
          {isSubmitting ? <LoadingSpinner size="sm" /> : 'Save Stock In'}
        </button>
      </div>
    </form>
  );
};

export default PurchaseFormModal;
