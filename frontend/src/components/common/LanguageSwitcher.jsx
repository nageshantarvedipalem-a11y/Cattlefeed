import { useTranslation } from 'react-i18next';
import { FiGlobe } from 'react-icons/fi';
import { SUPPORTED_LANGS } from '../../i18n';

const LanguageSwitcher = ({ className = '' }) => {
  const { t, i18n } = useTranslation();
  const current = i18n.resolvedLanguage || i18n.language || 'en';

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-xl border border-emerald-100 bg-white/90 p-0.5 shadow-sm ${className}`}
      role="group"
      aria-label={t('app.language')}
    >
      <span className="hidden items-center pl-1.5 text-slate-400 sm:inline-flex" aria-hidden="true">
        <FiGlobe className="h-3.5 w-3.5" />
      </span>
      {SUPPORTED_LANGS.map(({ code, labelKey }) => {
        const active = current.startsWith(code);
        return (
          <button
            key={code}
            type="button"
            onClick={() => i18n.changeLanguage(code)}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
              active
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-emerald-50 hover:text-primary-800'
            }`}
            aria-pressed={active}
          >
            {t(labelKey)}
          </button>
        );
      })}
    </div>
  );
};

export default LanguageSwitcher;
