import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiMessageCircle, FiRefreshCw, FiSave, FiWifi } from 'react-icons/fi';
import toast from 'react-hot-toast';
import whatsappService from '../../services/whatsappService';
import { useAuth } from '../../context/AuthContext';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { catalogLabel } from '../../utils/catalogI18n';

const statusBadge = {
  sent: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
  pending: 'bg-amber-100 text-amber-700',
};

const formatLogPhone = (phone) => {
  if (!phone) return '—';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  return phone;
};

const WhatsAppPage = () => {
  const { t } = useTranslation();
  const typeLabels = {
    invoice: t('whatsapp.typeInvoice'),
    reminder: t('whatsapp.typeReminder'),
    test: t('whatsapp.typeTest'),
    text: t('whatsapp.typeText'),
  };
    const { checkPermission } = useAuth();
  const canEdit = checkPermission('settings', 'edit');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [config, setConfig] = useState(null);
  const [form, setForm] = useState({
    enabled: false,
    autoSendInvoice: true,
    provider: 'meta',
    apiToken: '',
    phoneNumberId: '',
    aisensyApiKey: '',
    aisensyInvoiceCampaign: '',
    aisensyReminderCampaign: '',
  });
  const [messages, setMessages] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const fetchConfig = useCallback(async () => {
    try {
      const response = await whatsappService.getSettings();
      const data = response.data.data;
      setConfig(data);
      setForm((prev) => ({
        ...prev,
        enabled: data.enabled,
        autoSendInvoice: data.autoSendInvoice,
        provider: data.provider || 'meta',
        phoneNumberId: data.phoneNumberId || '',
        aisensyInvoiceCampaign: data.aisensyInvoiceCampaign || '',
        aisensyReminderCampaign: data.aisensyReminderCampaign || '',
      }));
    } catch (error) {
      toast.error(error.response?.data?.message || t('whatsapp.loadFailed'));
    }
  }, [t]);

  const fetchMessages = useCallback(async () => {
    try {
      const response = await whatsappService.getMessages({ page, limit: 10 });
      setMessages(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error(error.response?.data?.message || t('whatsapp.loadLogFailed'));
    }
  }, [page]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchConfig(), fetchMessages()]);
      setLoading(false);
    };
    load();
  }, [fetchConfig, fetchMessages]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        enabled: form.enabled,
        autoSendInvoice: form.autoSendInvoice,
        provider: form.provider,
        phoneNumberId: form.phoneNumberId,
        aisensyInvoiceCampaign: form.aisensyInvoiceCampaign,
        aisensyReminderCampaign: form.aisensyReminderCampaign,
      };
      if (form.apiToken.trim()) {
        payload.apiToken = form.apiToken.trim();
      }
      if (form.aisensyApiKey.trim()) {
        payload.aisensyApiKey = form.aisensyApiKey.trim();
      }
      const response = await whatsappService.updateSettings(payload);
      setConfig(response.data.data);
      setForm((prev) => ({ ...prev, apiToken: '', aisensyApiKey: '' }));
      toast.success(t('whatsapp.settingsSaved'));
    } catch (error) {
      toast.error(error.response?.data?.message || t('whatsapp.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const response = await whatsappService.testConnection();
      const data = response.data.data;
      if (data.provider === 'aisensy') {
        toast.success(
          data.pdfVerified
            ? `AiSensy OK — campaign "${data.campaignName}", public PDF verified (${data.pdfBytes} bytes)`
            : `AiSensy configured: campaign "${data.campaignName}"`
        );
      } else {
        toast.success(
          data.verifiedName
            ? `Connected: ${data.verifiedName} (${data.displayPhoneNumber || 'verified'})`
            : t('whatsapp.connectionOk')
        );
      }
      fetchMessages();
    } catch (error) {
      toast.error(error.response?.data?.message || t('whatsapp.connectionTestFailed'));
    } finally {
      setTesting(false);
    }
  };

  const isAiSensy = form.provider === 'aisensy';

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{t('whatsapp.integrationTitle')}</h1>
        <p className="mt-1 text-slate-600">
          {t('whatsapp.integrationSubtitle')}
        </p>
      </div>

      {config?.stats && (
        <div className="mb-6 grid gap-4 sm:grid-cols-4">
          {[
            { label: t('whatsapp.totalMessages'), value: config.stats.total },
            { label: t('common.sent'), value: config.stats.sent },
            { label: t('common.failed'), value: config.stats.failed },
            { label: t('common.today'), value: config.stats.today },
          ].map((card) => (
            <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">{card.label}</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{card.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <form onSubmit={handleSave} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <FiMessageCircle className="h-4 w-4" /> {t('whatsapp.apiConfiguration')}
          </h2>

          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                disabled={!canEdit}
                className="h-4 w-4 rounded border-slate-300 text-primary-600"
              />
              <span className="text-sm text-slate-700">{t('whatsapp.enableIntegration')}</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={form.autoSendInvoice}
                onChange={(e) => setForm({ ...form, autoSendInvoice: e.target.checked })}
                disabled={!canEdit}
                className="h-4 w-4 rounded border-slate-300 text-primary-600"
              />
              <span className="text-sm text-slate-700">{t('whatsapp.autoSendInvoice')}</span>
            </label>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">{t('whatsapp.provider')}</label>
              <select
                value={form.provider}
                onChange={(e) => setForm({ ...form, provider: e.target.value })}
                disabled={!canEdit}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 disabled:bg-slate-50"
              >
                <option value="aisensy">{t('whatsapp.providerAisensy')}</option>
                <option value="meta">{t('whatsapp.providerMeta')}</option>
              </select>
            </div>

            {isAiSensy ? (
              <>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Project API Key {config?.hasAisensyApiKey && `(saved: ${config.aisensyApiKeyMasked})`}
                  </label>
                  <input
                    type="password"
                    value={form.aisensyApiKey}
                    onChange={(e) => setForm({ ...form, aisensyApiKey: e.target.value })}
                    disabled={!canEdit}
                    placeholder={config?.hasAisensyApiKey ? 'Leave blank to keep current key' : 'From AiSensy Developer Hub'}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 disabled:bg-slate-50"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Invoice API Campaign Name</label>
                  <input
                    type="text"
                    value={form.aisensyInvoiceCampaign}
                    onChange={(e) => setForm({ ...form, aisensyInvoiceCampaign: e.target.value })}
                    disabled={!canEdit}
                    placeholder="Exact Live campaign name from AiSensy"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 disabled:bg-slate-50"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Reminder API Campaign Name (optional)
                  </label>
                  <input
                    type="text"
                    value={form.aisensyReminderCampaign}
                    onChange={(e) => setForm({ ...form, aisensyReminderCampaign: e.target.value })}
                    disabled={!canEdit}
                    placeholder="Leave empty to use wa.me links for reminders"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 disabled:bg-slate-50"
                  />
                </div>

                {config?.publicAppUrl ? (
                  <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                    Backend public URL: <strong>{config.publicAppUrl}</strong>
                  </p>
                ) : (
                  <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
                    Set <strong>APP_PUBLIC_URL</strong> on the backend server (e.g. your Hostinger backend domain) so AiSensy can download invoice PDFs.
                  </p>
                )}
              </>
            ) : (
              <>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Phone Number ID</label>
                  <input
                    type="text"
                    value={form.phoneNumberId}
                    onChange={(e) => setForm({ ...form, phoneNumberId: e.target.value })}
                    disabled={!canEdit}
                    placeholder="From Meta Business Manager"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 disabled:bg-slate-50"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    API Token {config?.hasApiToken && `(saved: ${config.apiTokenMasked})`}
                  </label>
                  <input
                    type="password"
                    value={form.apiToken}
                    onChange={(e) => setForm({ ...form, apiToken: e.target.value })}
                    disabled={!canEdit}
                    placeholder={config?.hasApiToken ? 'Leave blank to keep current token' : 'Permanent access token'}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 disabled:bg-slate-50"
                  />
                </div>
              </>
            )}

            <div className={`rounded-lg p-3 text-xs ${config?.configured ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              {config?.configured
                ? t('whatsapp.configuredOk', { provider: isAiSensy ? 'AiSensy' : 'Meta Cloud API' })
                : isAiSensy
                  ? t('whatsapp.configureAiSensy')
                  : t('whatsapp.configureMeta')}
            </div>
          </div>

          {canEdit && (
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
              >
                <FiSave className="h-4 w-4" /> {saving ? t('common.saving') : t('common.saveSettings')}
              </button>
              <button
                type="button"
                onClick={handleTest}
                disabled={testing}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
              >
                <FiWifi className="h-4 w-4" /> {testing ? t('common.testing') : t('common.testConnection')}
              </button>
            </div>
          )}
        </form>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">{t('whatsapp.howItWorksTitle')}</h2>
          <ul className="space-y-3 text-sm text-slate-600">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <li key={n}>{t(`whatsapp.how${n}`)}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-700">{t('whatsapp.messageLog')}</h2>
          <button
            type="button"
            onClick={fetchMessages}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:underline"
          >
            <FiRefreshCw className="h-3.5 w-3.5" /> {t('whatsapp.refresh')}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {[
                  t('common.date'),
                  t('common.type'),
                  t('common.customer'),
                  t('common.invoice'),
                  t('common.phone'),
                  t('common.status'),
                  t('common.sentBy'),
                ].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {messages.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">{t('whatsapp.noMessages')}</td></tr>
              ) : (
                messages.map((msg) => (
                  <tr key={msg.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">{new Date(msg.createdAt).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3">{typeLabels[msg.messageType] || msg.messageType}</td>
                    <td className="px-4 py-3">{msg.customerName ? catalogLabel(msg.customerName, 'customers') : '—'}</td>
                    <td className="px-4 py-3">{msg.invoiceNumber || '—'}</td>
                    <td className="px-4 py-3">{formatLogPhone(msg.phone)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${statusBadge[msg.status]}`}>
                        {msg.status === 'sent' && !msg.whatsappMessageId ? 'queued' : msg.status}
                      </span>
                      {msg.messageBody && msg.status === 'sent' && (
                        <p className="mt-1 max-w-xs text-xs text-slate-500" title={msg.messageBody}>
                          {msg.messageBody}
                        </p>
                      )}
                      {msg.errorMessage && (
                        <p className="mt-1 max-w-xs truncate text-xs text-red-500" title={msg.errorMessage}>
                          {msg.errorMessage}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">{msg.sentByName || t('common.system')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={pagination.limit || 10}
          itemLabel="messages"
          onPageChange={setPage}
        />
      </div>
    </div>
  );
};

export default WhatsAppPage;
