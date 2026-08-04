import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FiMinus,
  FiPlus,
  FiSearch,
  FiShoppingCart,
  FiTrash2,
  FiUser,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import billingService from '../../services/billingService';
import whatsappService from '../../services/whatsappService';
import customerService from '../../services/customerService';
import { formatCurrency } from '../../utils/format';
import { downloadBlob } from '../../utils/download';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PaymentModal from '../../components/billing/PaymentModal';
import InvoiceModal from '../../components/billing/InvoiceModal';

const calculateCartLine = (item) => {
  const quantity = Number(item.quantity) || 0;
  const sellingPrice = Number(item.sellingPrice) || 0;
  const gstRate = Number(item.gstRate) || 0;
  const discountAmount = Number(item.discountAmount) || 0;
  const lineSubtotal = quantity * sellingPrice;
  const taxable = Math.max(lineSubtotal - discountAmount, 0);
  const taxAmount = (taxable * gstRate) / 100;
  const totalAmount = taxable + taxAmount;

  return { lineSubtotal, taxAmount, totalAmount };
};

const BillingPage = () => {
  const [search, setSearch] = useState('');
  const [barcode, setBarcode] = useState('');
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [cart, setCart] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [billDiscount, setBillDiscount] = useState(0);
  const [remarks, setRemarks] = useState('');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);
  const [whatsappResult, setWhatsappResult] = useState(null);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [recentSales, setRecentSales] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const fetchProducts = useCallback(async (searchTerm = '', barcodeValue = '') => {
    setProductsLoading(true);
    try {
      const response = await billingService.searchProducts({
        search: searchTerm || undefined,
        barcode: barcodeValue || undefined,
      });
      setProducts(response.data.data.products);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Product search failed');
    } finally {
      setProductsLoading(false);
    }
  }, []);

  const fetchCustomers = useCallback(async () => {
    try {
      const response = await customerService.getCustomers({ page: 1, limit: 100, isActive: 'true' });
      setCustomers(response.data.data);
    } catch {
      // non-blocking
    }
  }, []);

  const fetchRecentSales = useCallback(async () => {
    try {
      const response = await billingService.getSales({ page: 1, limit: 10 });
      setRecentSales(response.data.data);
    } catch {
      // non-blocking
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    fetchRecentSales();
  }, [fetchProducts, fetchCustomers, fetchRecentSales]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, fetchProducts]);

  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    if (!barcode.trim()) return;
    fetchProducts('', barcode.trim()).then(() => {
      // auto-add if single barcode match handled after fetch
    });
  };

  useEffect(() => {
    if (barcode && products.length === 1 && products[0].barcode === barcode.trim()) {
      addToCart(products[0]);
      setBarcode('');
      setProducts([]);
      fetchProducts();
    }
  }, [products, barcode]);

  const addToCart = (product) => {
    if (product.currentStock <= 0) {
      toast.error('Product out of stock');
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.currentStock) {
          toast.error('Cannot exceed available stock');
          return prev;
        }
        return prev.map((item) => (
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ));
      }

      return [...prev, {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        sellingPrice: product.sellingPrice,
        purchasePrice: product.purchasePrice,
        gstRate: product.gstRate,
        currentStock: product.currentStock,
        quantity: 1,
        discountAmount: 0,
      }];
    });
  };

  const updateCartItem = (productId, field, value) => {
    setCart((prev) => prev.map((item) => {
      if (item.productId !== productId) return item;

      if (field === 'quantity') {
        const qty = Math.max(Number(value) || 0, 0.001);
        if (qty > item.currentStock) {
          toast.error('Cannot exceed available stock');
          return item;
        }
        return { ...item, quantity: qty };
      }

      return { ...item, [field]: value };
    }));
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const totals = useMemo(() => {
    let subtotal = 0;
    let tax = 0;

    cart.forEach((item) => {
      const line = calculateCartLine(item);
      subtotal += line.lineSubtotal;
      tax += line.taxAmount;
    });

    const discount = Number(billDiscount) || 0;
    const total = Math.max(subtotal + tax - discount, 0);

    return { subtotal, tax, discount, total };
  }, [cart, billDiscount]);

  const resetBill = () => {
    setCart([]);
    setCustomerId('');
    setBillDiscount(0);
    setRemarks('');
    setCompletedSale(null);
    setWhatsappResult(null);
    fetchProducts();
    fetchRecentSales();
  };

  const handleCheckout = (payments) => {
    setIsSubmitting(true);
    billingService.createSale({
      customerId: customerId ? Number(customerId) : null,
      discountAmount: Number(billDiscount) || 0,
      remarks: remarks.trim() || undefined,
      items: cart.map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
        sellingPrice: Number(item.sellingPrice),
        discountAmount: Number(item.discountAmount) || 0,
        gstRate: Number(item.gstRate),
      })),
      payments,
    })
      .then((response) => {
        toast.success('Bill created successfully');
        setPaymentOpen(false);
        setCompletedSale(response.data.data.sale);
        setWhatsappResult(response.data.data.whatsapp || null);
        if (response.data.data.whatsapp?.sent) {
          toast.success('Invoice sent to customer WhatsApp');
        }
      })
      .catch((error) => {
        toast.error(error.response?.data?.message || 'Checkout failed');
      })
      .finally(() => setIsSubmitting(false));
  };

  const handleDownloadInvoice = async () => {
    if (!completedSale) return;
    try {
      const response = await billingService.downloadInvoice(completedSale.id);
      downloadBlob(response.data, `${completedSale.invoiceNumber}.pdf`);
    } catch {
      toast.error('Failed to download invoice');
    }
  };

  const handleSendWhatsApp = async () => {
    if (!completedSale) return;
    setSendingWhatsApp(true);
    try {
      const response = await whatsappService.sendInvoice(completedSale.id);
      setWhatsappResult({ sent: true, ...response.data.data });
      toast.success('Invoice sent via WhatsApp');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send WhatsApp invoice');
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col lg:flex-row lg:gap-4">
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h1 className="text-xl font-bold text-slate-900">Billing (POS)</h1>
            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              className="text-sm font-medium text-primary-700 hover:text-primary-800"
            >
              {showHistory ? 'Back to POS' : 'Recent Bills'}
            </button>
          </div>

          {!showHistory && (
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search product name, SKU..."
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary-500"
                />
              </div>
              <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Scan barcode..."
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-primary-500"
                />
                <button type="submit" className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900">
                  Scan
                </button>
              </form>
            </div>
          )}
        </div>

        {!showHistory ? (
          <div className="flex-1 overflow-y-auto p-4">
            {productsLoading ? (
              <div className="py-12"><LoadingSpinner /></div>
            ) : products.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-500">Search or scan products to add to cart</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {products.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addToCart(product)}
                    disabled={product.currentStock <= 0}
                    className="rounded-xl border border-slate-200 p-4 text-left transition hover:border-primary-300 hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <p className="font-semibold text-slate-900">{product.name}</p>
                    <p className="text-xs text-slate-500">{product.sku}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm font-bold text-primary-700">{formatCurrency(product.sellingPrice)}</span>
                      <span className={`text-xs ${product.currentStock <= 0 ? 'text-red-600' : 'text-slate-500'}`}>
                        Stock: {product.currentStock}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {['Invoice', 'Customer', 'Total', 'Paid', 'Status', 'Date'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{sale.invoiceNumber}</td>
                    <td className="px-4 py-3">{sale.customerName || 'Walk-in'}</td>
                    <td className="px-4 py-3">{formatCurrency(sale.totalAmount)}</td>
                    <td className="px-4 py-3">{formatCurrency(sale.paidAmount)}</td>
                    <td className="px-4 py-3 capitalize">{sale.paymentStatus}</td>
                    <td className="px-4 py-3">{new Date(sale.saleDate).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-4 flex w-full flex-col rounded-xl border border-slate-200 bg-white shadow-sm lg:mt-0 lg:w-96">
        <div className="border-b border-slate-200 p-4">
          <div className="flex items-center gap-2">
            <FiShoppingCart className="h-5 w-5 text-slate-500" />
            <h2 className="font-bold text-slate-900">Cart ({cart.length})</h2>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">Cart is empty</p>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => {
                const line = calculateCartLine(item);
                return (
                  <div key={item.productId} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-500">{item.sku}</p>
                      </div>
                      <button type="button" onClick={() => removeFromCart(item.productId)} className="text-red-500 hover:text-red-700">
                        <FiTrash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <button type="button" onClick={() => updateCartItem(item.productId, 'quantity', item.quantity - 1)} className="rounded border border-slate-300 p-1">
                        <FiMinus className="h-3 w-3" />
                      </button>
                      <input
                        type="number"
                        step="0.001"
                        min="0.001"
                        value={item.quantity}
                        onChange={(e) => updateCartItem(item.productId, 'quantity', e.target.value)}
                        className="w-16 rounded border border-slate-300 px-2 py-1 text-center text-sm"
                      />
                      <button type="button" onClick={() => updateCartItem(item.productId, 'quantity', item.quantity + 1)} className="rounded border border-slate-300 p-1">
                        <FiPlus className="h-3 w-3" />
                      </button>
                      <span className="ml-auto text-sm font-semibold">{formatCurrency(line.totalAmount)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-3 border-t border-slate-200 p-4">
          <div>
            <label className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-600">
              <FiUser className="h-3.5 w-3.5" /> Customer (optional)
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
            >
              <option value="">Walk-in Customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Bill Discount (₹)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={billDiscount}
              onChange={(e) => setBillDiscount(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
            />
          </div>

          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(totals.subtotal)}</span></div>
            <div className="flex justify-between"><span>Tax</span><span>{formatCurrency(totals.tax)}</span></div>
            {totals.discount > 0 && (
              <div className="flex justify-between text-red-600"><span>Discount</span><span>-{formatCurrency(totals.discount)}</span></div>
            )}
            <div className="mt-1 flex justify-between border-t border-slate-200 pt-2 text-base font-bold">
              <span>Total</span><span>{formatCurrency(totals.total)}</span>
            </div>
          </div>

          <button
            type="button"
            disabled={cart.length === 0}
            onClick={() => setPaymentOpen(true)}
            className="w-full rounded-lg bg-primary-600 py-3 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-50"
          >
            Checkout — {formatCurrency(totals.total)}
          </button>
        </div>
      </div>

      <PaymentModal
        isOpen={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        totalAmount={totals.total}
        customerRequired={Boolean(customerId)}
        onConfirm={handleCheckout}
        isSubmitting={isSubmitting}
      />

      {completedSale && (
        <InvoiceModal
          sale={completedSale}
          whatsappResult={whatsappResult}
          onClose={resetBill}
          onDownload={handleDownloadInvoice}
          onPrint={handlePrint}
          onSendWhatsApp={handleSendWhatsApp}
          sendingWhatsApp={sendingWhatsApp}
        />
      )}
    </div>
  );
};

export default BillingPage;
