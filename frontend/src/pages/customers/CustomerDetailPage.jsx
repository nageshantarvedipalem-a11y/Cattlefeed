import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiArrowLeft, FiPhone, FiMapPin } from 'react-icons/fi';
import toast from 'react-hot-toast';
import customerService from '../../services/customerService';
import { formatCurrency } from '../../utils/format';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const CustomerDetailPage = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState(null);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [sales, setSales] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchCustomer = useCallback(async () => {
    setLoading(true);
    try {
      const [detailRes, salesRes, ledgerRes] = await Promise.all([
        customerService.getCustomer(id),
        customerService.getSales(id, { page: 1, limit: 10 }),
        customerService.getLedger(id, { page: 1, limit: 10 }),
      ]);

      setCustomer(detailRes.data.data.customer);
      setPendingPayments(detailRes.data.data.pendingPayments);
      setSales(salesRes.data.data);
      setLedger(ledgerRes.data.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load customer');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Customer not found</p>
        <Link to="/customers" className="mt-4 inline-block text-primary-700 hover:underline">Back to customers</Link>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'sales', label: `Purchase History (${customer.totalSales})` },
    { id: 'ledger', label: 'Ledger' },
    { id: 'pending', label: `Pending (${pendingPayments.length})` },
  ];

  return (
    <div>
      <Link to="/customers" className="mb-4 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-primary-700">
        <FiArrowLeft /> Back to Customers
      </Link>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{customer.name}</h1>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-600">
              <span className="inline-flex items-center gap-1"><FiPhone className="h-4 w-4" />{customer.phone}</span>
              {customer.village && (
                <span className="inline-flex items-center gap-1"><FiMapPin className="h-4 w-4" />{customer.village}</span>
              )}
            </div>
            {customer.address && <p className="mt-2 text-sm text-slate-500">{customer.address}</p>}
          </div>
          <span className={`self-start rounded-full px-3 py-1 text-sm font-medium ${
            customer.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
          }`}>
            {customer.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Current Balance</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{formatCurrency(customer.currentBalance)}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Opening Balance</p>
            <p className="mt-1 text-lg font-bold text-slate-900">
              {formatCurrency(customer.openingBalance)}
              <span className="ml-1 text-xs font-normal text-slate-500">({customer.openingBalanceType})</span>
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Credit Limit</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{formatCurrency(customer.creditLimit)}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Pending Amount</p>
            <p className="mt-1 text-lg font-bold text-amber-600">{formatCurrency(customer.pendingAmount)}</p>
          </div>
        </div>

        {customer.notes && (
          <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            <strong>Notes:</strong> {customer.notes}
          </div>
        )}
      </div>

      <div className="mb-4 flex gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.id
                ? 'bg-primary-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {activeTab === 'overview' && (
          <div className="p-6 text-sm text-slate-600">
            <p>Customer since {new Date(customer.createdAt).toLocaleDateString()}.</p>
            <p className="mt-2">Total purchases: <strong>{customer.totalSales}</strong></p>
            <p className="mt-1">Use the tabs above to view purchase history, ledger entries, and pending payments.</p>
          </div>
        )}

        {activeTab === 'sales' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {['Invoice', 'Date', 'Total', 'Paid', 'Pending', 'Status'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sales.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">No purchase history yet</td></tr>
                ) : (
                  sales.map((sale) => (
                    <tr key={sale.id}>
                      <td className="px-4 py-3 text-sm font-medium">{sale.invoiceNumber}</td>
                      <td className="px-4 py-3 text-sm">{new Date(sale.saleDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm">{formatCurrency(sale.totalAmount)}</td>
                      <td className="px-4 py-3 text-sm">{formatCurrency(sale.paidAmount)}</td>
                      <td className="px-4 py-3 text-sm">{formatCurrency(sale.pendingAmount)}</td>
                      <td className="px-4 py-3 text-sm capitalize">{sale.paymentStatus}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'ledger' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {['Date', 'Type', 'Debit', 'Credit', 'Balance', 'Remarks'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledger.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">No ledger entries yet</td></tr>
                ) : (
                  ledger.map((entry) => (
                    <tr key={entry.id}>
                      <td className="px-4 py-3 text-sm">{new Date(entry.transactionDate).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm capitalize">{entry.transactionType}</td>
                      <td className="px-4 py-3 text-sm">{formatCurrency(entry.debit)}</td>
                      <td className="px-4 py-3 text-sm">{formatCurrency(entry.credit)}</td>
                      <td className="px-4 py-3 text-sm font-medium">{formatCurrency(entry.balance)}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{entry.remarks || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'pending' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {['Invoice', 'Date', 'Total', 'Paid', 'Pending', 'Due Date'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingPayments.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">No pending payments</td></tr>
                ) : (
                  pendingPayments.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-sm font-medium">{item.invoiceNumber}</td>
                      <td className="px-4 py-3 text-sm">{new Date(item.saleDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm">{formatCurrency(item.totalAmount)}</td>
                      <td className="px-4 py-3 text-sm">{formatCurrency(item.paidAmount)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-amber-600">{formatCurrency(item.pendingAmount)}</td>
                      <td className="px-4 py-3 text-sm">{item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDetailPage;
