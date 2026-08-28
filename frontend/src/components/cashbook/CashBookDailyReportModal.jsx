import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import cashBookService from '../../services/cashBookService';
import { formatCurrency, formatDate } from '../../utils/format';
import LoadingSpinner from '../common/LoadingSpinner';

const CashBookDailyReportModal = ({ isOpen, onClose, initialDate }) => {
  const [date, setDate] = useState(initialDate || new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const nextDate = initialDate || new Date().toISOString().slice(0, 10);
    setDate(nextDate);

    const load = async (reportDate) => {
      setLoading(true);
      try {
        const response = await cashBookService.getDailyReport({ date: reportDate });
        setReport(response.data.data);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load daily report');
      } finally {
        setLoading(false);
      }
    };

    load(nextDate);
    return undefined;
  }, [isOpen, initialDate]);

  const handleDateChange = async (value) => {
    setDate(value);
    setLoading(true);
    try {
      const response = await cashBookService.getDailyReport({ date: value });
      setReport(response.data.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load daily report');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const summary = report?.summary;
  const breakdown = report?.breakdown;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 print:block">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Daily Cash Book Report</h2>
            <p className="text-sm text-slate-500">{date ? formatDate(date) : ''}</p>
          </div>
          <div className="flex gap-2 print:hidden">
            <button type="button" onClick={() => window.print()} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
              Print
            </button>
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
              Close
            </button>
          </div>
        </div>

        <div className="space-y-4 p-6">
          <input
            type="date"
            value={date}
            onChange={(e) => handleDateChange(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 print:hidden"
          />

          {loading ? (
            <div className="py-10"><LoadingSpinner /></div>
          ) : summary ? (
            <>
              <div className="rounded-lg bg-slate-50 p-4 text-sm">
                <div className="flex justify-between"><span>Opening Balance</span><span className="font-semibold">{formatCurrency(summary.openingBalance)}</span></div>
                <div className="mt-2 flex justify-between text-emerald-700"><span>Total Jama</span><span className="font-semibold">+{formatCurrency(summary.totalJama)}</span></div>
                <div className="mt-1 flex justify-between text-red-700"><span>Total Karchulu</span><span className="font-semibold">−{formatCurrency(summary.totalKarchulu)}</span></div>
                <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 font-bold">
                  <span>Closing Balance</span>
                  <span className="text-amber-700">{formatCurrency(summary.closingBalance)}</span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {formatCurrency(summary.openingBalance)} + {formatCurrency(summary.totalJama)} − {formatCurrency(summary.totalKarchulu)} = {formatCurrency(summary.closingBalance)}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-emerald-800">JAMA</h3>
                {(report?.parties?.jama?.length ? report.parties.jama : breakdown?.jama)?.length ? (
                  (report?.parties?.jama?.length ? report.parties.jama : breakdown.jama).map((item) => (
                    <div key={item.party || item.category} className="flex justify-between py-1 text-sm">
                      <span>{item.party || item.category}</span>
                      <span>{formatCurrency(item.amount)}</span>
                    </div>
                  ))
                ) : <p className="text-sm text-slate-500">No Jama on this date</p>}
                <div className="mt-2 flex justify-between border-t border-slate-100 pt-2 text-sm font-semibold text-emerald-800">
                  <span>Total Jama</span>
                  <span>{formatCurrency(summary.totalJama)}</span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-red-800">KARCHULU</h3>
                {(report?.parties?.karchulu?.length ? report.parties.karchulu : breakdown?.karchulu)?.length ? (
                  (report?.parties?.karchulu?.length ? report.parties.karchulu : breakdown.karchulu).map((item) => (
                    <div key={item.party || item.category} className="flex justify-between py-1 text-sm">
                      <span>{item.party || item.category}</span>
                      <span>{formatCurrency(item.amount)}</span>
                    </div>
                  ))
                ) : <p className="text-sm text-slate-500">No Karchulu on this date</p>}
                <div className="mt-2 flex justify-between border-t border-slate-100 pt-2 text-sm font-semibold text-red-800">
                  <span>Total Karchulu</span>
                  <span>{formatCurrency(summary.totalKarchulu)}</span>
                </div>
              </div>

              {summary.modeBalances && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Payment modes</h3>
                  {['cash', 'upi', 'bank', 'other'].map((mode) => (
                    <div key={mode} className="flex justify-between py-1 text-sm capitalize">
                      <span>{mode}</span>
                      <span>{formatCurrency(summary.modeBalances[mode]?.closing || 0)}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-500">No report data</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CashBookDailyReportModal;
