import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import cashBookService from '../../services/cashBookService';
import { formatCurrency } from '../../utils/format';
import LoadingSpinner from '../common/LoadingSpinner';

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const CashBookMonthlySummaryModal = ({ isOpen, onClose }) => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);

  const load = async (nextYear, nextMonth) => {
    setLoading(true);
    try {
      const response = await cashBookService.getMonthlySummary({ year: nextYear, month: nextMonth });
      setReport(response.data.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load monthly summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return undefined;
    const current = new Date();
    const nextYear = current.getFullYear();
    const nextMonth = current.getMonth() + 1;
    setYear(nextYear);
    setMonth(nextMonth);
    load(nextYear, nextMonth);
    return undefined;
  }, [isOpen]);

  if (!isOpen) return null;

  const summary = report?.summary;
  const breakdown = report?.breakdown;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">Monthly Summary</h2>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
            Close
          </button>
        </div>
        <div className="space-y-4 p-6">
          <div className="flex gap-2">
            <select
              value={month}
              onChange={(e) => {
                const next = Number(e.target.value);
                setMonth(next);
                load(year, next);
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {monthNames.map((name, index) => (
                <option key={name} value={index + 1}>{name}</option>
              ))}
            </select>
            <input
              type="number"
              value={year}
              onChange={(e) => {
                const next = Number(e.target.value);
                setYear(next);
                if (next >= 2000 && next <= 2100) load(next, month);
              }}
              className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          {loading ? (
            <div className="py-10"><LoadingSpinner /></div>
          ) : summary ? (
            <>
              <div className="rounded-lg bg-slate-50 p-4 text-sm">
                <div className="flex justify-between"><span>Opening Balance</span><span className="font-semibold">{formatCurrency(summary.openingBalance)}</span></div>
                <div className="mt-2 flex justify-between text-emerald-700"><span>Total Jama</span><span className="font-semibold">{formatCurrency(summary.totalJama)}</span></div>
                <div className="mt-1 flex justify-between text-red-700"><span>Total Karchulu</span><span className="font-semibold">{formatCurrency(summary.totalKarchulu)}</span></div>
                <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 font-bold">
                  <span>Closing Balance</span>
                  <span className="text-amber-700">{formatCurrency(summary.closingBalance)}</span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {formatCurrency(summary.openingBalance)} + {formatCurrency(summary.totalJama)} − {formatCurrency(summary.totalKarchulu)} = {formatCurrency(summary.closingBalance)}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-emerald-800">Jama by category</h3>
                {breakdown?.jama?.length ? breakdown.jama.map((item) => (
                  <div key={item.category} className="flex justify-between py-1 text-sm">
                    <span>{item.category}</span>
                    <span>{formatCurrency(item.amount)}</span>
                  </div>
                )) : <p className="text-sm text-slate-500">No Jama this month</p>}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-red-800">Karchulu by category</h3>
                {breakdown?.karchulu?.length ? breakdown.karchulu.map((item) => (
                  <div key={item.category} className="flex justify-between py-1 text-sm">
                    <span>{item.category}</span>
                    <span>{formatCurrency(item.amount)}</span>
                  </div>
                )) : <p className="text-sm text-slate-500">No Karchulu this month</p>}
              </div>

              {summary.modeBalances && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Payment-mode summary</h3>
                  {['cash', 'upi', 'bank', 'other'].map((mode) => (
                    <div key={mode} className="flex justify-between py-1 text-sm capitalize">
                      <span>{mode}</span>
                      <span>{formatCurrency(summary.modeBalances[mode]?.closing || 0)}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default CashBookMonthlySummaryModal;
