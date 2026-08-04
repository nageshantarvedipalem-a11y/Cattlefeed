import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiArrowLeft, FiDownload, FiEdit2, FiPrinter } from 'react-icons/fi';
import toast from 'react-hot-toast';
import ledgerService from '../../services/ledgerService';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../utils/format';
import { downloadBlob, getExportFilename } from '../../utils/download';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import AdjustmentModal from '../../components/ledger/AdjustmentModal';

const LedgerDetailPage = () => {
  const { customerId } = useParams();
  const { checkPermission } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [entries, setEntries] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [period, setPeriod] = useState('');
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);

  const canEdit = checkPermission('ledger', 'edit');

  const fetchLedger = useCallback(async () => {
    setLoading(true);
    try {
      const response = await ledgerService.getCustomerLedger(customerId, {
        page,
        limit,
        period: period || undefined,
      });
      setSummary(response.data.data.summary);
      setEntries(response.data.data.entries);
      setPagination(response.data.data.pagination);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load ledger');
    } finally {
      setLoading(false);
    }
  }, [customerId, page, limit, period]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  const handleExport = async (format) => {
    try {
      const response = await ledgerService.exportLedger(customerId, {
        format,
        period: period || undefined,
      });
      downloadBlob(response.data, getExportFilename(response, `ledger.${format === 'pdf' ? 'pdf' : 'xlsx'}`));
      toast.success(`Ledger exported as ${format.toUpperCase()}`);
    } catch {
      toast.error('Export failed');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading && !summary) {
    return <LoadingSpinner />;
  }

  if (!summary) {
    return (
      <div className="py-12 text-center">
        <p className="text-slate-500">Ledger not found</p>
        <Link to="/ledger" className="mt-4 inline-block text-primary-700 hover:underline">Back to ledger</Link>
      </div>
    );
  }

  return (
    <div>
      <Link to="/ledger" className="mb-4 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-primary-700 print:hidden">
        <FiArrowLeft /> Back to Ledger
      </Link>

      <div id="ledger-print-area">
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{summary.customer.name}</h1>
              <p className="mt-1 text-sm text-slate-500">{summary.customer.phone} · {summary.customer.village || 'No village'}</p>
            </div>
            <div className="flex flex-wrap gap-2 print:hidden">
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setAdjustmentOpen(true)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
                >
                  <FiEdit2 className="h-4 w-4" /> Adjust
                </button>
              )}
              <button type="button" onClick={() => handleExport('excel')} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
                <FiDownload className="h-4 w-4" /> Excel
              </button>
              <button type="button" onClick={() => handleExport('pdf')} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
                <FiDownload className="h-4 w-4" /> PDF
              </button>
              <button type="button" onClick={handlePrint} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
                <FiPrinter className="h-4 w-4" /> Print
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { label: 'Opening Balance', value: summary.openingBalance, color: 'text-slate-900' },
              { label: 'Total Debit', value: summary.totalDebit, color: 'text-red-700' },
              { label: 'Total Credit', value: summary.totalCredit, color: 'text-emerald-700' },
              { label: 'Closing Balance', value: summary.closingBalance, color: 'text-amber-700' },
              { label: 'Pending Amount', value: summary.pendingAmount, color: 'text-amber-600' },
            ].map((card) => (
              <div key={card.label} className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs text-slate-500">{card.label}</p>
                <p className={`mt-1 text-lg font-bold ${card.color}`}>{formatCurrency(card.value)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2 print:hidden">
          <select
            value={period}
            onChange={(e) => { setPeriod(e.target.value); setPage(1); }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
          >
            <option value="">All Time</option>
            <option value="daily">Today</option>
            <option value="monthly">This Month</option>
            <option value="yearly">This Year</option>
          </select>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="py-12"><LoadingSpinner /></div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      {['Date', 'Type', 'Reference', 'Debit', 'Credit', 'Balance', 'Remarks'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {entries.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">No ledger entries for this period</td>
                      </tr>
                    ) : (
                      entries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm">{new Date(entry.transactionDate).toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm capitalize">{entry.transactionType}</td>
                          <td className="px-4 py-3 text-sm capitalize">
                            {entry.referenceType}{entry.referenceId ? ` #${entry.referenceId}` : ''}
                          </td>
                          <td className="px-4 py-3 text-sm text-red-700">{entry.debit > 0 ? formatCurrency(entry.debit) : '—'}</td>
                          <td className="px-4 py-3 text-sm text-emerald-700">{entry.credit > 0 ? formatCurrency(entry.credit) : '—'}</td>
                          <td className="px-4 py-3 text-sm font-medium">{formatCurrency(entry.balance)}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{entry.remarks || '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="print:hidden">
                <Pagination page={page} totalPages={pagination.totalPages} total={pagination.total} limit={limit} onPageChange={setPage} />
              </div>
            </>
          )}
        </div>
      </div>

      <AdjustmentModal
        isOpen={adjustmentOpen}
        onClose={() => setAdjustmentOpen(false)}
        onSuccess={fetchLedger}
        customerId={Number(customerId)}
        customerName={summary.customer.name}
      />
    </div>
  );
};

export default LedgerDetailPage;
