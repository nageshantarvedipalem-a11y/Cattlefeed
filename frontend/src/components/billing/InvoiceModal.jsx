import { FiMessageCircle } from 'react-icons/fi';
import { formatCurrency } from '../../utils/format';

const InvoiceModal = ({ sale, whatsappResult, onClose, onDownload, onPrint, onSendWhatsApp, sendingWhatsApp }) => {
  if (!sale) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
        <div id="invoice-print-area" className="p-6">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold text-slate-900">Cattle Feed ERP</h2>
            <p className="text-sm text-slate-500">Tax Invoice</p>
          </div>

          <div className="mb-4 grid gap-2 text-sm sm:grid-cols-2">
            <div><span className="text-slate-500">Invoice:</span> <strong>{sale.invoiceNumber}</strong></div>
            <div><span className="text-slate-500">Date:</span> {new Date(sale.saleDate).toLocaleString()}</div>
            <div><span className="text-slate-500">Customer:</span> {sale.customerName || 'Walk-in'}</div>
            <div><span className="text-slate-500">Payment:</span> <span className="capitalize">{sale.paymentStatus}</span></div>
          </div>

          <table className="mb-4 w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                <th className="py-2">Item</th>
                <th className="py-2">Qty</th>
                <th className="py-2">Rate</th>
                <th className="py-2">GST</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item) => (
                <tr key={item.id} className="border-b border-slate-100">
                  <td className="py-2">{item.productName}</td>
                  <td className="py-2">{item.quantity}</td>
                  <td className="py-2">{formatCurrency(item.sellingPrice)}</td>
                  <td className="py-2">{item.gstRate}%</td>
                  <td className="py-2 text-right">{formatCurrency(item.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(sale.subtotal)}</span></div>
            <div className="flex justify-between"><span>Tax</span><span>{formatCurrency(sale.taxAmount)}</span></div>
            {sale.discountAmount > 0 && (
              <div className="flex justify-between text-red-600"><span>Discount</span><span>-{formatCurrency(sale.discountAmount)}</span></div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold">
              <span>Grand Total</span><span>{formatCurrency(sale.totalAmount)}</span>
            </div>
            <div className="flex justify-between"><span>Paid</span><span>{formatCurrency(sale.paidAmount)}</span></div>
            {sale.pendingAmount > 0 && (
              <div className="flex justify-between text-amber-600"><span>Pending</span><span>{formatCurrency(sale.pendingAmount)}</span></div>
            )}
          </div>

          {whatsappResult && (
            <div className={`mt-4 rounded-lg p-3 text-xs ${whatsappResult.sent ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-600'}`}>
              {whatsappResult.sent
                ? `Invoice sent to WhatsApp (${whatsappResult.phone})`
                : `WhatsApp: ${whatsappResult.reason || 'Not sent'}`}
            </div>
          )}

          {sale.payments?.length > 0 && (
            <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs">
              <p className="mb-1 font-semibold text-slate-700">Payments</p>
              {sale.payments.map((p) => (
                <div key={p.id} className="flex justify-between capitalize">
                  <span>{p.paymentMethod}</span>
                  <span>{formatCurrency(p.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 p-4 print:hidden">
          {onSendWhatsApp && sale.customerPhone && (
            <button
              type="button"
              onClick={onSendWhatsApp}
              disabled={sendingWhatsApp}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
            >
              <FiMessageCircle className="h-4 w-4" />
              {sendingWhatsApp ? 'Sending...' : 'Send WhatsApp'}
            </button>
          )}
          <button type="button" onClick={onPrint} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50">
            Print
          </button>
          <button type="button" onClick={onDownload} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50">
            Download PDF
          </button>
          <button type="button" onClick={onClose} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
            New Bill
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;
