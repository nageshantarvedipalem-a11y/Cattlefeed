import { useCallback, useEffect, useState } from 'react';
import { FiMessageCircle, FiRefreshCw, FiSave, FiWifi } from 'react-icons/fi';
import toast from 'react-hot-toast';
import whatsappService from '../../services/whatsappService';
import { useAuth } from '../../context/AuthContext';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const statusBadge = {
  sent: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
  pending: 'bg-amber-100 text-amber-700',
};

const typeLabels = {
  invoice: 'Invoice',
  reminder: 'Reminder',
  test: 'Test',
  text: 'Text',
};

const WhatsAppPage = () => {
  const { checkPermission } = useAuth();
  const canEdit = checkPermission('settings', 'edit');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [config, setConfig] = useState(null);
  const [form, setForm] = useState({
    enabled: false,
    autoSendInvoice: true,
    apiToken: '',
    phoneNumberId: '',
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
        phoneNumberId: data.phoneNumberId || '',
      }));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load WhatsApp settings');
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      const response = await whatsappService.getMessages({ page, limit: 10 });
      setMessages(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load message log');
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
        phoneNumberId: form.phoneNumberId,
      };
      if (form.apiToken.trim()) {
        payload.apiToken = form.apiToken.trim();
      }
      const response = await whatsappService.updateSettings(payload);
      setConfig(response.data.data);
      setForm((prev) => ({ ...prev, apiToken: '' }));
      toast.success('WhatsApp settings saved');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const response = await whatsappService.testConnection();
      const data = response.data.data;
      toast.success(
        data.verifiedName
          ? `Connected: ${data.verifiedName} (${data.displayPhoneNumber || 'verified'})`
          : 'WhatsApp API connection successful'
      );
      fetchMessages();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">WhatsApp Integration</h1>
        <p className="mt-1 text-slate-600">
          Send invoice PDFs and payment reminders via WhatsApp Cloud API.
        </p>
      </div>

      {config?.stats && (
        <div className="mb-6 grid gap-4 sm:grid-cols-4">
          {[
            { label: 'Total Messages', value: config.stats.total },
            { label: 'Sent', value: config.stats.sent },
            { label: 'Failed', value: config.stats.failed },
            { label: 'Today', value: config.stats.today },
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
            <FiMessageCircle className="h-4 w-4" /> API Configuration
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
              <span className="text-sm text-slate-700">Enable WhatsApp integration</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={form.autoSendInvoice}
                onChange={(e) => setForm({ ...form, autoSendInvoice: e.target.checked })}
                disabled={!canEdit}
                className="h-4 w-4 rounded border-slate-300 text-primary-600"
              />
              <span className="text-sm text-slate-700">Auto-send invoice PDF after billing</span>
            </label>

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

            <div className={`rounded-lg p-3 text-xs ${config?.configured ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              {config?.configured
                ? 'WhatsApp Cloud API is configured. Invoices can be sent automatically and manually.'
                : 'Configure API token and Phone Number ID from Meta WhatsApp Business Platform. Without API, payment reminders fall back to wa.me links.'}
            </div>
          </div>

          {canEdit && (
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
              >
                <FiSave className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Settings'}
              </button>
              <button
                type="button"
                onClick={handleTest}
                disabled={testing}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
              >
                <FiWifi className="h-4 w-4" /> {testing ? 'Testing...' : 'Test Connection'}
              </button>
            </div>
          )}
        </form>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">How it works</h2>
          <ul className="space-y-3 text-sm text-slate-600">
            <li>After each bill, the invoice PDF is automatically sent to the customer&apos;s WhatsApp if enabled and configured.</li>
            <li>Use the <strong>Send WhatsApp</strong> button on the invoice screen to resend manually.</li>
            <li>Pending payment reminders are sent via API when configured, otherwise a wa.me link opens.</li>
            <li>Get credentials from <a href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started" target="_blank" rel="noreferrer" className="text-primary-700 underline">Meta WhatsApp Cloud API</a>.</li>
          </ul>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-700">Message Log</h2>
          <button
            type="button"
            onClick={fetchMessages}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:underline"
          >
            <FiRefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['Date', 'Type', 'Customer', 'Invoice', 'Phone', 'Status', 'Sent By'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {messages.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No messages yet</td></tr>
              ) : (
                messages.map((msg) => (
                  <tr key={msg.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">{new Date(msg.createdAt).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3">{typeLabels[msg.messageType] || msg.messageType}</td>
                    <td className="px-4 py-3">{msg.customerName || '—'}</td>
                    <td className="px-4 py-3">{msg.invoiceNumber || '—'}</td>
                    <td className="px-4 py-3">{msg.phone}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${statusBadge[msg.status]}`}>
                        {msg.status}
                      </span>
                      {msg.errorMessage && (
                        <p className="mt-1 max-w-xs truncate text-xs text-red-500" title={msg.errorMessage}>
                          {msg.errorMessage}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">{msg.sentByName || 'System'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={pagination.totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
};

export default WhatsAppPage;
