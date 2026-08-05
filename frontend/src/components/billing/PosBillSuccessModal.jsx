import { Link } from 'react-router-dom';
import { FiCheckCircle, FiMessageCircle, FiPrinter } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { formatCurrency, formatPaymentStatus } from '../../utils/format';
import { downloadBlob } from '../../utils/download';
import { printInvoicePdf } from '../../utils/printInvoice';
import { parseApiErrorMessage } from '../../utils/apiError';
import billingService from '../../services/billingService';

const PosBillSuccessModal = ({
  sale,
  whatsappResult,
  onClose,
  onResendWhatsApp,
  sendingWhatsApp,
}) => {
  if (!sale) return null;

  const handleDownload = async () => {
    try {
      const response = await billingService.downloadInvoice(sale.id, false);
      downloadBlob(response.data, `${sale.invoiceNumber}.pdf`);
    } catch (error) {
      const message = await parseApiErrorMessage(error, 'Failed to download invoice PDF');
      toast.error(message);
    }
  };

  const handlePrint = async () => {
    try {
      await printInvoicePdf(sale.id);
    } catch (error) {
      toast.error(error.message || 'Failed to print invoice PDF');
    }
  };

  const whatsappFailed = whatsappResult && !whatsappResult.sent;
  const statusLabel = formatPaymentStatus(sale.paymentStatus, sale.paidAmount);
  const isPaid = statusLabel === 'PAID';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:hidden">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-6 py-5 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <FiCheckCircle className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Bill Generated Successfully</h2>
          <p className="mt-1 text-sm text-slate-500">{sale.invoiceNumber}</p>
        </div>

        <div className="space-y-2 px-6 py-4 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Customer</span><span>{sale.customerName || 'Walk-in'}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Grand Total</span><span className="font-semibold">{formatCurrency(sale.totalAmount)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Paid</span><span>{formatCurrency(sale.paidAmount)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Pending</span><span>{formatCurrency(sale.pendingAmount)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Status</span><span className="font-semibold uppercase">{formatPaymentStatus(sale.paymentStatus, sale.paidAmount)}</span></div>
        </div>

        {whatsappResult && (
          <div className={`mx-6 mb-2 rounded-xl p-3 text-xs ${whatsappResult.sent ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>
            {whatsappResult.sent
              ? `Invoice PDF sent to WhatsApp (${whatsappResult.phone || sale.customerPhone || 'customer'})`
              : (whatsappResult.reason || 'WhatsApp delivery failed. Check the 10-digit mobile number and resend.')}
          </div>
        )}

        <div className={`mx-6 mb-2 rounded-xl p-3 text-xs ${isPaid ? 'bg-blue-50 text-blue-800' : 'bg-amber-50 text-amber-800'}`}>
          {isPaid
            ? 'Full payment received. Customer saved. View in Customers list.'
            : 'Partial/Credit bill saved. View in Pending Payments to collect balance.'}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-6 py-4">
          {whatsappFailed && sale.customerPhone && (
            <button
              type="button"
              onClick={onResendWhatsApp}
              disabled={sendingWhatsApp}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700"
            >
              <FiMessageCircle className="h-4 w-4" />
              {sendingWhatsApp ? 'Sending...' : 'Resend WhatsApp Invoice'}
            </button>
          )}
          <button type="button" onClick={handlePrint} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium">
            <FiPrinter className="h-4 w-4" /> Print Invoice
          </button>
          <button type="button" onClick={handleDownload} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium">
            Download PDF
          </button>
          <button type="button" onClick={onClose} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
            New Bill
          </button>
          {!isPaid && (
            <Link to="/payments" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100">
              Pending Payments
            </Link>
          )}
          {isPaid && (
            <Link to="/customers" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50">
              Customers
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default PosBillSuccessModal;
