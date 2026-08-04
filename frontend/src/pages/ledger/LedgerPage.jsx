import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiBook, FiSearch } from 'react-icons/fi';
import toast from 'react-hot-toast';
import ledgerService from '../../services/ledgerService';
import { formatCurrency } from '../../utils/format';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const LedgerPage = () => {
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('currentBalance');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchSummaries = useCallback(async () => {
    setLoading(true);
    try {
      const response = await ledgerService.getCustomerSummaries({
        page,
        limit,
        search,
        sortBy,
        sortOrder,
      });
      setSummaries(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load ledger summaries');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, sortBy, sortOrder]);

  useEffect(() => {
    fetchSummaries();
  }, [fetchSummaries]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const sortIndicator = (column) => (sortBy === column ? (sortOrder === 'asc' ? ' ↑' : ' ↓') : '');

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Customer Ledger</h1>
        <p className="mt-1 text-sm text-slate-500">Customer-wise balances, pending amounts, and ledger entries</p>
      </div>

      <div className="mb-4 relative max-w-md">
        <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search customer name, phone, village..."
          className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary-500"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="py-16"><LoadingSpinner /></div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    {[
                      { key: 'name', label: 'Customer' },
                      { key: 'village', label: 'Village' },
                      { key: 'currentBalance', label: 'Balance' },
                      { key: 'pendingAmount', label: 'Pending' },
                    ].map((col) => (
                      <th
                        key={col.key}
                        onClick={() => handleSort(col.key)}
                        className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-700"
                      >
                        {col.label}{sortIndicator(col.key)}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summaries.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-500">No customers found</td>
                    </tr>
                  ) : (
                    summaries.map((item) => (
                      <tr key={item.customerId} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <FiBook className="h-4 w-4 text-slate-400" />
                            <div>
                              <p className="font-medium text-slate-900">{item.customerName}</p>
                              <p className="text-xs text-slate-500">{item.phone}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">{item.village || '—'}</td>
                        <td className={`px-4 py-3 text-sm font-medium ${item.currentBalance > 0 ? 'text-amber-700' : 'text-slate-700'}`}>
                          {formatCurrency(item.currentBalance)}
                        </td>
                        <td className="px-4 py-3 text-sm text-amber-600">{formatCurrency(item.pendingAmount)}</td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            to={`/ledger/${item.customerId}`}
                            className="text-sm font-medium text-primary-700 hover:text-primary-800"
                          >
                            View Ledger
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={pagination.totalPages} total={pagination.total} limit={limit} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
};

export default LedgerPage;
