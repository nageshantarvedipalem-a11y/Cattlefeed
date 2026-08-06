import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import {
  FiActivity,
  FiAlertTriangle,
  FiArrowRight,
  FiBox,
  FiCreditCard,
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
import {
  formatChartCurrency,
  prepareTimeSeries,
  withDisplayLabels,
} from '../../utils/chartFormat';
import { getCached } from '../../utils/apiCache';
import DashboardChartCard from '../../components/dashboard/DashboardChartCard';
import DashboardStatCard from '../../components/dashboard/DashboardStatCard';
import DashboardSummaryCard from '../../components/dashboard/DashboardSummaryCard';

const formatAction = (action) => action.replace(/_/g, ' ');

const statusBadge = {
  paid: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200/60',
  partial: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200/60',
  pending: 'bg-red-100 text-red-800 ring-1 ring-red-200/60',
};

const chartTooltipStyle = {
  borderRadius: '12px',
  border: '1px solid #bbf7d0',
  boxShadow: '0 4px 12px rgb(20 83 45 / 0.12)',
  fontSize: '12px',
};

const axisStyle = { fill: '#64748b', fontSize: 11 };
const chartMargin = { top: 12, right: 16, left: 4, bottom: 28 };

const CHART = {
  green: '#15803d',
  greenLight: '#22c55e',
  amber: '#d97706',
  amberLight: '#f59e0b',
  teal: '#0d9488',
  red: '#dc2626',
  blue: '#2563eb',
  grid: '#e2e8f0',
};

const PIE_COLORS = ['#15803d', '#d97706', '#0d9488', '#16a34a', '#b45309', '#059669', '#ca8a04', '#047857'];

const pieLabel = ({ name, percent }) =>
  `${String(name).slice(0, 14)} ${(percent * 100).toFixed(0)}%`;

const SectionHeading = ({ title, subtitle }) => (
  <div className="mb-4">
    <h2 className="text-base font-bold text-slate-800">{title}</h2>
    {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
  </div>
);

const DashboardPage = () => {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(null);

  const fetchDashboard = async (background = false) => {
    if (!background) setLoading(true);
    setLoadError(null);

    const cached = getCached('dashboard:summary');
    if (cached?.data?.data) {
      setData(cached.data.data);
      setLoading(false);
    }

    try {
      const response = await dashboardService.getDashboard();
      setData(response.data.data);
    } catch (error) {
      if (!cached?.data?.data) {
        const message = error.code === 'ERR_NETWORK'
          ? 'Cannot reach backend API. Make sure backend is running on port 5001.'
          : error.response?.data?.message || error.message || 'Failed to load dashboard';
        setLoadError(message);
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;

    const cached = getCached('dashboard:summary');
    if (cached?.data?.data) {
      setData(cached.data.data);
      setLoading(false);
      fetchDashboard(true);
    } else {
      fetchDashboard(false);
    }
  }, [authLoading, isAuthenticated]);

  if (!data && !loading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-100 bg-white py-16 text-center shadow-sm">
        <p className="text-slate-600">Unable to load dashboard data.</p>
        {loadError && <p className="mt-2 text-sm text-slate-400">{loadError}</p>}
        <button
          type="button"
          onClick={fetchDashboard}
          className="mt-4 rounded-xl bg-gradient-to-r from-primary-700 to-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:from-primary-800"
        >
          Retry
        </button>
      </div>
    );
  }

  const cards = data?.cards;
  const recentSales = data?.recentSales ?? [];
  const recentActivities = data?.recentActivities ?? [];
  const chartsEnabled = Boolean(data);

  const todayCards = cards
    ? [
        { label: "Today's Sales", value: formatCurrency(cards.today.sales), sub: `${cards.today.salesCount} bills`, icon: FiShoppingCart, accent: 'emerald' },
        { label: "Today's Purchase", value: formatCurrency(cards.today.purchases), sub: `${cards.today.purchaseCount} records`, icon: FiPackage, accent: 'amber' },
        { label: "Today's Profit", value: formatCurrency(cards.today.profit), sub: 'From sales', icon: FiTrendingUp, accent: 'green' },
        { label: "Today's Collection", value: formatCurrency(cards.today.collection), sub: 'Cash inflow', icon: FiDollarSign, accent: 'teal' },
        { label: "Today's Pending", value: formatCurrency(cards.today.pending), sub: `${cards.today.pendingCount} bills`, icon: FiAlertTriangle, accent: 'orange' },
      ]
    : Array.from({ length: 5 }, (_, i) => ({
        label: 'Loading...',
        value: '—',
        sub: '—',
        icon: FiShoppingCart,
        accent: 'slate',
        skeleton: true,
        key: i,
      }));

  const summaryCards = cards
    ? [
        { label: 'Monthly Sales', value: formatCurrency(cards.monthly.sales), sub: `${cards.monthly.salesCount} bills`, icon: FiTrendingUp },
        { label: 'Monthly Profit', value: formatCurrency(cards.monthly.profit), sub: 'This month', icon: FiDollarSign },
        { label: 'Overall Revenue', value: formatCurrency(cards.overall.revenue), sub: 'All time', icon: FiShoppingCart },
        { label: 'Total Customers', value: cards.totals.customers, sub: 'Active', icon: FiUsers },
        { label: 'Total Products', value: cards.totals.products, sub: 'Active', icon: FiBox },
        { label: 'Total Stock', value: cards.totals.stockUnits, sub: 'Units in hand', icon: FiPackage },
        { label: 'Low Stock', value: cards.totals.lowStock, sub: 'Products', icon: FiAlertTriangle, alert: true },
        { label: 'Pending Bills', value: cards.totals.pendingBills, sub: 'Outstanding', icon: FiCreditCard, alert: true },
      ]
    : Array.from({ length: 8 }, (_, i) => ({
        label: 'Loading...',
        value: '—',
        sub: '—',
        skeleton: true,
        key: i,
      }));

  const firstName = user?.fullName?.split(' ')[0] || 'there';

  return (
    <div className={`space-y-6 ${loading ? 'pointer-events-none' : ''}`}>
      {/* Hero banner */}
      <div className="dashboard-hero relative overflow-hidden rounded-2xl px-5 py-6 sm:px-7 sm:py-7">
        <div className="dashboard-hero-pattern absolute inset-0 opacity-80" aria-hidden="true" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300/90">
              Business Overview
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
              Welcome back, {firstName}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-emerald-100/90">
              Track sales, stock, collections and profit for your cattle feed business — all in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/billing"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-4 py-2 text-xs font-semibold text-white ring-1 ring-white/25 backdrop-blur-sm transition hover:bg-white/25"
            >
              <FiShoppingCart className="h-3.5 w-3.5" />
              Open Billing
            </Link>
            <Link
              to="/stock"
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500/90 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-amber-900/20 transition hover:bg-amber-500"
            >
              View Stock
              <FiArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Today's performance */}
      <section>
        <SectionHeading title="Today's Performance" subtitle="Live snapshot of your feed shop for today" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {todayCards.map((card) => (
            <DashboardStatCard
              key={card.label + (card.key ?? '')}
              {...card}
              skeleton={card.skeleton}
            />
          ))}
        </div>
      </section>

      {/* Business summary */}
      <section>
        <SectionHeading title="Business Summary" subtitle="Monthly totals, inventory and outstanding items" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map((card) => (
            <DashboardSummaryCard
              key={card.label + (card.key ?? '')}
              {...card}
              skeleton={card.skeleton}
            />
          ))}
        </div>
      </section>

      {/* Graph types — bar, line, scatter, histogram, pie */}
      <section>
        <SectionHeading
          title="Analytics Charts"
          subtitle="Bar, line, scatter, histogram and pie views of your cattle feed business"
        />
        <div className="grid gap-5 lg:grid-cols-2">
          <DashboardChartCard
            title="Purchase vs Sales"
            chartType="Bar Graph"
            description="Compare purchase and sales amounts by period — good for comparing groups."
            chartKey="purchaseVsSales"
            defaultPeriod="monthly"
            enabled={chartsEnabled}
          >
            {(chartData, period) => {
              const rows = prepareTimeSeries(chartData, period, ['sales', 'purchases']);
              return (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rows} margin={chartMargin}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                    <XAxis
                      dataKey="displayLabel"
                      tick={axisStyle}
                      axisLine={false}
                      tickLine={false}
                      label={{ value: 'Period', position: 'insideBottom', offset: -18, fontSize: 11, fill: '#475569' }}
                    />
                    <YAxis
                      tick={axisStyle}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={formatChartCurrency}
                      label={{ value: 'Amount (₹)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: '#475569' }}
                    />
                    <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={chartTooltipStyle} />
                    <Legend verticalAlign="top" height={28} />
                    <Bar dataKey="sales" name="Sales" fill={CHART.green} radius={[4, 4, 0, 0]} maxBarSize={36} />
                    <Bar dataKey="purchases" name="Purchases" fill={CHART.amber} radius={[4, 4, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              );
            }}
          </DashboardChartCard>

          <DashboardChartCard
            title="Sales Trend"
            chartType="Line Graph"
            description="Continuous data over time — track daily, monthly or yearly sales."
            chartKey="sales"
            defaultPeriod="daily"
            enabled={chartsEnabled}
          >
            {(chartData, period) => {
              const rows = prepareTimeSeries(chartData, period, ['sales']);
              return (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={rows} margin={chartMargin}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                    <XAxis
                      dataKey="displayLabel"
                      tick={axisStyle}
                      axisLine={false}
                      tickLine={false}
                      label={{ value: 'Time', position: 'insideBottom', offset: -18, fontSize: 11, fill: '#475569' }}
                    />
                    <YAxis
                      tick={axisStyle}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={formatChartCurrency}
                      label={{ value: 'Sales (₹)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: '#475569' }}
                    />
                    <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={chartTooltipStyle} />
                    <Legend verticalAlign="top" height={28} />
                    <Line
                      type="monotone"
                      dataKey="sales"
                      name="Sales"
                      stroke={CHART.green}
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: CHART.green, strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              );
            }}
          </DashboardChartCard>

          <DashboardChartCard
            title="Purchase vs Sales Correlation"
            chartType="Scatter Plot"
            description="Shows relationship between purchase spend and sales revenue per period."
            chartKey="purchaseVsSales"
            defaultPeriod="monthly"
            enabled={chartsEnabled}
          >
            {(chartData, period) => {
              const rows = withDisplayLabels(chartData, period);
              return (
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={chartMargin}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                    <XAxis
                      type="number"
                      dataKey="purchases"
                      name="Purchases"
                      tick={axisStyle}
                      tickFormatter={formatChartCurrency}
                      label={{ value: 'Purchases (₹)', position: 'insideBottom', offset: -18, fontSize: 11, fill: '#475569' }}
                    />
                    <YAxis
                      type="number"
                      dataKey="sales"
                      name="Sales"
                      tick={axisStyle}
                      tickFormatter={formatChartCurrency}
                      label={{ value: 'Sales (₹)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: '#475569' }}
                    />
                    <ZAxis dataKey="displayLabel" name="Period" />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      formatter={(v) => formatCurrency(v)}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.displayLabel || ''}
                      contentStyle={chartTooltipStyle}
                    />
                    <Legend verticalAlign="top" height={28} />
                    <Scatter name="Period" data={rows} fill={CHART.amber} />
                  </ScatterChart>
                </ResponsiveContainer>
              );
            }}
          </DashboardChartCard>

          <DashboardChartCard
            title="Daily Bill Count"
            chartType="Histogram"
            description="Frequency of bills — how often sales occur each day."
            chartKey="sales"
            defaultPeriod="daily"
            enabled={chartsEnabled}
          >
            {(chartData, period) => {
              const rows = prepareTimeSeries(chartData, period, ['count', 'sales']);
              return (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rows} margin={chartMargin}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                    <XAxis
                      dataKey="displayLabel"
                      tick={axisStyle}
                      axisLine={false}
                      tickLine={false}
                      label={{ value: 'Date', position: 'insideBottom', offset: -18, fontSize: 11, fill: '#475569' }}
                    />
                    <YAxis
                      tick={axisStyle}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                      label={{ value: 'Number of Bills', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: '#475569' }}
                    />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Legend verticalAlign="top" height={28} />
                    <Bar
                      dataKey="count"
                      name="Bill count"
                      fill={CHART.teal}
                      barCategoryGap={0}
                      maxBarSize={48}
                    />
                  </BarChart>
                </ResponsiveContainer>
              );
            }}
          </DashboardChartCard>

          <DashboardChartCard
            title="Top Customers Share"
            chartType="Pie Chart"
            description="Parts of a whole — share of revenue from top customers."
            chartKey="topCustomers"
            defaultPeriod="monthly"
            enabled={chartsEnabled}
          >
            {(chartData) => (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <Pie
                    data={chartData}
                    dataKey="totalSpent"
                    nameKey="name"
                    cx="50%"
                    cy="46%"
                    outerRadius={88}
                    label={pieLabel}
                    labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                  >
                    {chartData.map((_, index) => (
                      <Cell key={`customer-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={chartTooltipStyle} />
                  <Legend verticalAlign="bottom" formatter={(value) => String(value).slice(0, 18)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </DashboardChartCard>

          <DashboardChartCard
            title="Top Products Share"
            chartType="Pie Chart"
            description="Composition of sales volume — which products sell the most."
            chartKey="topProducts"
            defaultPeriod="monthly"
            enabled={chartsEnabled}
          >
            {(chartData) => (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <Pie
                    data={chartData}
                    dataKey="quantity"
                    nameKey="name"
                    cx="50%"
                    cy="46%"
                    outerRadius={88}
                    label={pieLabel}
                    labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                  >
                    {chartData.map((_, index) => (
                      <Cell key={`product-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Legend verticalAlign="bottom" formatter={(value) => String(value).slice(0, 18)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </DashboardChartCard>
        </div>
      </section>

      {/* Extended trends */}
      <section>
        <SectionHeading title="Profit & Stock Trends" subtitle="Multi-line and bar views for profit and inventory movement" />
        <div className="grid gap-5 lg:grid-cols-2">
          <DashboardChartCard
            title="Profit vs Revenue"
            chartType="Line Graph"
            description="Compare profit margin against total revenue over time."
            chartKey="profit"
            defaultPeriod="daily"
            enabled={chartsEnabled}
          >
            {(chartData, period) => {
              const rows = prepareTimeSeries(chartData, period, ['profit', 'revenue']);
              return (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={rows} margin={chartMargin}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                    <XAxis dataKey="displayLabel" tick={axisStyle} axisLine={false} tickLine={false} />
                    <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={formatChartCurrency} />
                    <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={chartTooltipStyle} />
                    <Legend verticalAlign="top" height={28} />
                    <Line type="monotone" dataKey="profit" name="Profit" stroke={CHART.greenLight} strokeWidth={2.5} dot={{ r: 4, fill: CHART.greenLight }} />
                    <Line type="monotone" dataKey="revenue" name="Revenue" stroke={CHART.amber} strokeWidth={2.5} dot={{ r: 4, fill: CHART.amber }} />
                  </LineChart>
                </ResponsiveContainer>
              );
            }}
          </DashboardChartCard>

          <DashboardChartCard
            title="Stock In vs Out"
            chartType="Bar Graph"
            description="Grouped comparison of stock received vs stock sold."
            chartKey="stockInOut"
            defaultPeriod="daily"
            enabled={chartsEnabled}
          >
            {(chartData, period) => {
              const rows = prepareTimeSeries(chartData, period, ['stockIn', 'stockOut']);
              return (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rows} margin={chartMargin}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                    <XAxis dataKey="displayLabel" tick={axisStyle} axisLine={false} tickLine={false} />
                    <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Legend verticalAlign="top" height={28} />
                    <Bar dataKey="stockIn" name="Stock In" fill={CHART.greenLight} radius={[4, 4, 0, 0]} maxBarSize={32} />
                    <Bar dataKey="stockOut" name="Stock Out" fill={CHART.red} radius={[4, 4, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              );
            }}
          </DashboardChartCard>

          <DashboardChartCard
            title="Top Selling Products"
            chartType="Bar Graph"
            description="Categorical comparison — quantity sold per product."
            chartKey="topProducts"
            defaultPeriod="monthly"
            enabled={chartsEnabled}
          >
            {(chartData) => (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={chartData}
                  margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} horizontal={false} />
                  <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={96}
                    tick={{ ...axisStyle, fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Legend verticalAlign="top" height={28} />
                  <Bar dataKey="quantity" name="Qty sold" fill={CHART.teal} radius={[0, 4, 4, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </DashboardChartCard>

          <DashboardChartCard
            title="Yearly Sales"
            chartType="Line Graph"
            description="Long-term sales trend by year."
            chartKey="sales"
            defaultPeriod="yearly"
            enabled={chartsEnabled}
          >
            {(chartData, period) => {
              const rows = withDisplayLabels(chartData, period);
              return (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={rows} margin={chartMargin}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                    <XAxis
                      dataKey="displayLabel"
                      tick={axisStyle}
                      axisLine={false}
                      tickLine={false}
                      label={{ value: 'Year', position: 'insideBottom', offset: -18, fontSize: 11, fill: '#475569' }}
                    />
                    <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={formatChartCurrency} />
                    <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={chartTooltipStyle} />
                    <Legend verticalAlign="top" height={28} />
                    <Line type="monotone" dataKey="sales" name="Sales" stroke={CHART.blue} strokeWidth={2.5} dot={{ r: 5, fill: CHART.blue }} />
                  </LineChart>
                </ResponsiveContainer>
              );
            }}
          </DashboardChartCard>
        </div>
      </section>

      {/* Recent activity */}
      <section>
        <SectionHeading title="Recent Activity" subtitle="Latest bills and system actions" />
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-emerald-100/80 bg-white shadow-sm shadow-emerald-950/5">
            <div className="dashboard-panel-header flex items-center justify-between border-b border-emerald-50 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-800">Recent Bills</h2>
              <Link to="/billing" className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:text-primary-800">
                View all <FiArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-emerald-50">
                <thead>
                  <tr className="bg-emerald-50/50">
                    {['Invoice', 'Customer', 'Amount', 'Status'].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentSales.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-500">
                        No recent bills
                      </td>
                    </tr>
                  ) : (
                    recentSales.map((sale) => (
                      <tr key={sale.id} className="transition hover:bg-emerald-50/40">
                        <td className="px-4 py-2.5 text-sm font-semibold text-slate-800">{sale.invoiceNumber}</td>
                        <td className="px-4 py-2.5 text-sm text-slate-600">{sale.customerName}</td>
                        <td className="px-4 py-2.5 text-sm font-medium text-primary-800">{formatCurrency(sale.totalAmount)}</td>
                        <td className="px-4 py-2.5">
                          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${statusBadge[sale.paymentStatus]}`}>
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

          <div className="overflow-hidden rounded-2xl border border-emerald-100/80 bg-white shadow-sm shadow-emerald-950/5">
            <div className="dashboard-panel-header border-b border-emerald-50 px-4 py-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <FiActivity className="h-4 w-4 text-primary-600" />
                Recent Activities
              </h2>
            </div>
            <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
              {recentActivities.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-slate-500">No recent activity</p>
              ) : (
                recentActivities.map((activity) => (
                  <div key={activity.id} className="flex gap-3 px-4 py-3 transition hover:bg-emerald-50/30">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                      <FiActivity className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium capitalize text-slate-800">{formatAction(activity.action)}</p>
                      <p className="text-xs text-slate-500">
                        {activity.userName}
                        {activity.entityType ? ` · ${activity.entityType}` : ''}
                        {activity.entityId ? ` #${activity.entityId}` : ''}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {new Date(activity.createdAt).toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DashboardPage;
