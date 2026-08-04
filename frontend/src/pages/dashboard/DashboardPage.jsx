import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  FiActivity,
  FiAlertTriangle,
  FiDollarSign,
  FiPackage,
  FiShoppingCart,
  FiTrendingUp,
  FiUsers,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import dashboardService from '../../services/dashboardService';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../utils/format';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const formatAction = (action) => action.replace(/_/g, ' ');

const statusBadge = {
  paid: 'bg-emerald-100 text-emerald-700',
  partial: 'bg-amber-100 text-amber-700',
  pending: 'bg-red-100 text-red-700',
};

const chartLabel = (value) => {
  if (!value) return '';
  const str = String(value);
  return str.length > 10 ? str.slice(5) : str;
};

const DashboardPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await dashboardService.getDashboard();
        setData(response.data.data);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!data) {
    return (
      <div className="py-12 text-center text-slate-500">
        Unable to load dashboard data.
      </div>
    );
  }

  const { cards, charts, recentSales, recentActivities } = data;

  const todayCards = [
    { label: "Today's Sales", value: cards.today.sales, sub: `${cards.today.salesCount} bills`, icon: FiShoppingCart, color: 'bg-blue-100 text-blue-700' },
    { label: "Today's Purchase", value: cards.today.purchases, sub: `${cards.today.purchaseCount} records`, icon: FiPackage, color: 'bg-violet-100 text-violet-700' },
    { label: "Today's Profit", value: cards.today.profit, sub: 'From sales', icon: FiTrendingUp, color: 'bg-emerald-100 text-emerald-700' },
    { label: "Today's Collection", value: cards.today.collection, sub: 'Cash inflow', icon: FiDollarSign, color: 'bg-teal-100 text-teal-700' },
    { label: "Today's Pending", value: cards.today.pending, sub: `${cards.today.pendingCount} bills`, icon: FiAlertTriangle, color: 'bg-amber-100 text-amber-700' },
  ];

  const summaryCards = [
    { label: 'Monthly Sales', value: cards.monthly.sales, sub: `${cards.monthly.salesCount} bills` },
    { label: 'Monthly Profit', value: cards.monthly.profit, sub: 'This month' },
    { label: 'Overall Revenue', value: cards.overall.revenue, sub: 'All time' },
    { label: 'Total Customers', value: cards.totals.customers, sub: 'Active', format: 'number' },
    { label: 'Total Products', value: cards.totals.products, sub: 'Active', format: 'number' },
    { label: 'Total Stock', value: cards.totals.stockUnits, sub: 'Units in hand', format: 'number' },
    { label: 'Low Stock', value: cards.totals.lowStock, sub: 'Products', format: 'number', alert: true },
    { label: 'Pending Bills', value: cards.totals.pendingBills, sub: 'Outstanding', format: 'number', alert: true },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-slate-600">Welcome back, {user?.fullName}. Here is your business overview.</p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {todayCards.map((card) => (
          <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500">{card.label}</p>
              <div className={`rounded-lg p-2 ${card.color}`}>
                <card.icon className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-xl font-bold text-slate-900">{formatCurrency(card.value)}</p>
            <p className="mt-1 text-xs text-slate-500">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.label} className={`rounded-xl border bg-white p-4 shadow-sm ${card.alert ? 'border-amber-200' : 'border-slate-200'}`}>
            <p className="text-xs text-slate-500">{card.label}</p>
            <p className={`mt-1 text-lg font-bold ${card.alert ? 'text-amber-700' : 'text-slate-900'}`}>
              {card.format === 'number' ? card.value : formatCurrency(card.value)}
            </p>
            <p className="mt-1 text-xs text-slate-500">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Daily Sales (7 days)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.dailySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tickFormatter={chartLabel} fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Line type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Profit Trend (30 days)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.profitTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tickFormatter={chartLabel} fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Line type="monotone" dataKey="profit" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Monthly Sales (12 months)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.monthlySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tickFormatter={(v) => String(v).slice(0, 6)} fontSize={10} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Purchase vs Sales (6 months)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={charts.purchaseVsSales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tickFormatter={(v) => String(v).slice(0, 6)} fontSize={10} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="sales" name="Sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="purchases" name="Purchases" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Yearly Sales</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.yearlySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Bar dataKey="sales" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Stock In vs Out (14 days)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.stockInOut}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tickFormatter={chartLabel} fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Legend />
                <Bar dataKey="stockIn" name="Stock In" fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="stockOut" name="Stock Out" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Top Selling Products (30 days)</h2>
          <div className="h-64">
            {charts.topProducts.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-500">No sales data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.topProducts} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" fontSize={11} />
                  <YAxis type="category" dataKey="name" width={120} fontSize={10} tickFormatter={(v) => String(v).slice(0, 18)} />
                  <Tooltip />
                  <Bar dataKey="quantity" name="Qty Sold" fill="#16a34a" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <FiUsers className="h-4 w-4" /> Top Customers (90 days)
          </h2>
          <div className="h-64">
            {charts.topCustomers.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-500">No customer sales yet</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.topCustomers} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" fontSize={11} tickFormatter={(v) => `₹${v / 1000}k`} />
                  <YAxis type="category" dataKey="name" width={100} fontSize={10} tickFormatter={(v) => String(v).slice(0, 14)} />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Bar dataKey="totalSpent" name="Total Spent" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-700">Recent Bills</h2>
            <Link to="/billing" className="text-xs font-medium text-primary-700 hover:underline">View all</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {['Invoice', 'Customer', 'Amount', 'Status'].map((h) => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-semibold uppercase text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentSales.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-500">No recent bills</td></tr>
                ) : (
                  recentSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 text-sm font-medium">{sale.invoiceNumber}</td>
                      <td className="px-4 py-2 text-sm">{sale.customerName}</td>
                      <td className="px-4 py-2 text-sm">{formatCurrency(sale.totalAmount)}</td>
                      <td className="px-4 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${statusBadge[sale.paymentStatus]}`}>
                          {sale.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <FiActivity className="h-4 w-4" /> Recent Activities
            </h2>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {recentActivities.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">No recent activity</p>
            ) : (
              recentActivities.map((activity) => (
                <div key={activity.id} className="px-4 py-3">
                  <p className="text-sm font-medium capitalize text-slate-800">{formatAction(activity.action)}</p>
                  <p className="text-xs text-slate-500">
                    {activity.userName}
                    {activity.entityType ? ` · ${activity.entityType}` : ''}
                    {activity.entityId ? ` #${activity.entityId}` : ''}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {new Date(activity.createdAt).toLocaleString('en-IN')}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
