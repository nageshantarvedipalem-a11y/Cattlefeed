import { useTranslation } from 'react-i18next';

const Pagination = ({ page, totalPages, total = 0, limit = 10, itemLabel, onPageChange }) => {
  const { t } = useTranslation();
  if (!totalPages || totalPages <= 1) return null;

  const safeTotal = Number(total) || 0;
  const safeLimit = Number(limit) || 10;
  const start = safeTotal === 0 ? 0 : (page - 1) * safeLimit + 1;
  const end = Math.min(page * safeLimit, safeTotal);
  const label = itemLabel || t('common.items');

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-500">
        {t('common.showingOf', { start, end, total: safeTotal, itemLabel: label })}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t('common.previous')}
        </button>
        <span className="text-sm text-slate-600">
          {t('common.pageOf', { page, totalPages })}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t('common.next')}
        </button>
      </div>
    </div>
  );
};

export default Pagination;
