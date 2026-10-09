import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import cashBookService from '../../services/cashBookService';
import { formatCurrency, formatDate } from '../../utils/format';
import LoadingSpinner from '../common/LoadingSpinner';

const ReportRow = ({ label, value, valueClassName = 'text-slate-900' }) => (
  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-1 text-sm">
    <span className="min-w-0 truncate text-slate-700" title={label}>{label}</span>
    <span className={`shrink-0 whitespace-nowrap text-right tabular-nums font-medium ${valueClassName}`}>
      {value}
    </span>
  </div>
);

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
  const jamaRows = report?.parties?.jama?.length ? report.parties.jama : (breakdown?.jama || []);
  const karchuluRows = report?.parties?.karchulu?.length ? report.parties.karchulu : (breakdown?.karchulu || []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
      <div className="flex max-h-[min(78vh,560px)] w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900">Daily Cash Book Report</h2>
            <p className="text-xs text-slate-500">{date ? formatDate(date) : ''}</p>
          </div>
          <div className="flex shrink-0 gap-1.5 print:hidden">
            <button type="button" onClick={() => window.print()} className="rounded-md border border-slate-300 px-2.5 py-1 text-xs hover:bg-slate-50">
              Print
            </button>
            <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-2.5 py-1 text-xs hover:bg-slate-50">
              Close
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
          <input
            type="date"
            value={date}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-primary-500 print:hidden"
          />

          {loading ? (
            <div className="py-8"><LoadingSpinner /></div>
          ) : summary ? (
            <>
              <div className="rounded-lg bg-slate-50 px-3 py-2.5 text-sm">
                <ReportRow label="Opening Balance" value={formatCurrency(summary.openingBalance)} />
                <ReportRow
                  label="Total Jamalu"
                  value={`+${formatCurrency(summary.totalJama)}`}
                  valueClassName="text-emerald-700"
                />
                <ReportRow
                  label="Total Karchulu"
                  value={`−${formatCurrency(summary.totalKarchulu)}`}
                  valueClassName="text-red-700"
                />
                <div className="mt-1.5 border-t border-slate-200 pt-1.5">
                  <ReportRow
                    label="Closing Balance"
                    value={formatCurrency(summary.closingBalance)}
                    valueClassName="font-bold text-amber-700"
                  />
                </div>
                <p className="mt-1.5 text-[11px] leading-snug text-slate-500">
                  {formatCurrency(summary.openingBalance)} + {formatCurrency(summary.totalJama)} − {formatCurrency(summary.totalKarchulu)} = {formatCurrency(summary.closingBalance)}
                </p>
              </div>

              <div>
                <h3 className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-800">Jamalu</h3>
                {jamaRows.length ? (
                  jamaRows.map((item) => {
                    const label = item.party || item.category || '—';
                    return (
                      <ReportRow
                        key={`jama-${label}`}
                        label={label}
                        value={formatCurrency(item.amount)}
                        valueClassName="text-emerald-700"
                      />
                    );
                  })
                ) : (
                  <p className="py-1 text-sm text-slate-500">No Jamalu on this date</p>
                )}
                <div className="mt-1 border-t border-slate-100 pt-1">
                  <ReportRow
                    label="Total Jamalu"
                    value={formatCurrency(summary.totalJama)}
                    valueClassName="font-semibold text-emerald-800"
                  />
                </div>
              </div>

              <div>
                <h3 className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-red-800">Karchulu</h3>
                {karchuluRows.length ? (
                  karchuluRows.map((item) => {
                    const label = item.party || item.category || '—';
                    return (
                      <ReportRow
                        key={`karchulu-${label}`}
                        label={label}
                        value={formatCurrency(item.amount)}
                        valueClassName="text-red-700"
                      />
                    );
                  })
                ) : (
                  <p className="py-1 text-sm text-slate-500">No Karchulu on this date</p>
                )}
                <div className="mt-1 border-t border-slate-100 pt-1">
                  <ReportRow
                    label="Total Karchulu"
                    value={formatCurrency(summary.totalKarchulu)}
                    valueClassName="font-semibold text-red-800"
                  />
                </div>
              </div>

              {summary.modeBalances && (
                <div>
                  <h3 className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-slate-800">Payment modes</h3>
                  {['cash', 'upi', 'bank', 'other'].map((mode) => (
                    <ReportRow
                      key={mode}
                      label={mode}
                      value={formatCurrency(summary.modeBalances[mode]?.closing || 0)}
                    />
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
