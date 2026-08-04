import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiArrowLeft, FiPhone, FiMapPin, FiFileText } from 'react-icons/fi';
import toast from 'react-hot-toast';
import supplierService from '../../services/supplierService';
import { formatCurrency } from '../../utils/format';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const SupplierDetailPage = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [supplier, setSupplier] = useState(null);
  const [purchases, setPurchases] = useState([]);

  const fetchSupplier = useCallback(async () => {
    setLoading(true);
    try {
      const [detailRes, purchasesRes] = await Promise.all([
        supplierService.getSupplier(id),
        supplierService.getPurchases(id, { page: 1, limit: 20 }),
      ]);

      setSupplier(detailRes.data.data.supplier);
      setPurchases(purchasesRes.data.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load supplier');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSupplier();
  }, [fetchSupplier]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!supplier) {
    return (
      <div className="py-12 text-center">
        <p className="text-slate-500">Supplier not found</p>
        <Link to="/suppliers" className="mt-4 inline-block text-primary-700 hover:underline">Back to suppliers</Link>
      </div>
    );
  }

  return (
    <div>
      <Link to="/suppliers" className="mb-4 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-primary-700">
        <FiArrowLeft /> Back to Suppliers
      </Link>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{supplier.name}</h1>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-600">
              {supplier.phone && (
                <span className="inline-flex items-center gap-1"><FiPhone className="h-4 w-4" />{supplier.phone}</span>
              )}
              {supplier.gstNumber && (
                <span className="inline-flex items-center gap-1"><FiFileText className="h-4 w-4" />GST: {supplier.gstNumber}</span>
              )}
            </div>
            {supplier.address && (
              <p className="mt-2 inline-flex items-start gap-1 text-sm text-slate-500">
                <FiMapPin className="mt-0.5 h-4 w-4 shrink-0" />{supplier.address}
              </p>
            )}
          </div>
          <span className={`self-start rounded-full px-3 py-1 text-sm font-medium ${
            supplier.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
          }`}>
            {supplier.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Total Purchases</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{supplier.totalPurchases}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Purchase Amount</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{formatCurrency(supplier.totalPurchaseAmount)}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Opening Balance</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{formatCurrency(supplier.openingBalance)}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Pending Payment</p>
            <p className="mt-1 text-lg font-bold text-amber-600">{formatCurrency(supplier.pendingAmount)}</p>
          </div>
        </div>

        {supplier.notes && (
          <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            <strong>Notes:</strong> {supplier.notes}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="font-semibold text-slate-900">Purchase History</h2>
          <p className="text-sm text-slate-500">All stock-in entries from this supplier</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {['Invoice', 'Date', 'Subtotal', 'Tax', 'Total', 'Paid', 'Pending', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {purchases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-500">
                    No purchase history yet.
                  </td>
                </tr>
              ) : (
                purchases.map((purchase) => (
                  <tr key={purchase.id}>
                    <td className="px-4 py-3 text-sm font-medium">{purchase.invoiceNumber}</td>
                    <td className="px-4 py-3 text-sm">{new Date(purchase.purchaseDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm">{formatCurrency(purchase.subtotal)}</td>
                    <td className="px-4 py-3 text-sm">{formatCurrency(purchase.taxAmount)}</td>
                    <td className="px-4 py-3 text-sm font-medium">{formatCurrency(purchase.totalAmount)}</td>
                    <td className="px-4 py-3 text-sm">{formatCurrency(purchase.paidAmount)}</td>
                    <td className="px-4 py-3 text-sm text-amber-600">{formatCurrency(purchase.pendingAmount)}</td>
                    <td className="px-4 py-3 text-sm capitalize">{purchase.paymentStatus}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SupplierDetailPage;
