import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import billingService from '../services/billingService';
import whatsappService from '../services/whatsappService';
import { validateIndianMobile } from '../utils/phoneValidation';
import {
  buildSalePayments,
  calculateBillTotals,
  calculateCartLine,
  calculatePaymentAllocation,
  resolvePaymentStatus,
} from '../utils/posCalculations';

const emptyCustomer = {
  name: '',
  phone: '',
  village: '',
  address: '',
  notes: '',
};

export const usePosBilling = () => {
  const [stockBatches, setStockBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [barcode, setBarcode] = useState('');
  const [productsLoading, setProductsLoading] = useState(false);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [quantityPromptProduct, setQuantityPromptProduct] = useState(null);
  const [editCartProductId, setEditCartProductId] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const [cart, setCart] = useState([]);
  const [billDiscount, setBillDiscount] = useState(0);
  const [customer, setCustomer] = useState(emptyCustomer);
  const [customerMode, setCustomerMode] = useState('new');
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [previousPendingBalance, setPreviousPendingBalance] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paidAmount, setPaidAmount] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);
  const [whatsappResult, setWhatsappResult] = useState(null);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);

  const productSearchRef = useRef(null);
  const barcodeRef = useRef(null);

  const fetchStockBatches = useCallback(async () => {
    setBatchesLoading(true);
    try {
      const response = await billingService.getStockBatches();
      setStockBatches(response.data.data.batches);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load stock batches');
    } finally {
      setBatchesLoading(false);
    }
  }, []);

  const fetchProducts = useCallback(async (search = '', barcodeValue = '') => {
    setProductsLoading(true);
    try {
      let response;
      if (selectedBatch?.id) {
        response = await billingService.getStockBatchProducts(selectedBatch.id, {
          search: search || undefined,
          barcode: barcodeValue || undefined,
        });
      } else {
        response = await billingService.searchProducts({
          search: search || undefined,
          barcode: barcodeValue || undefined,
        });
      }
      setProducts(response.data.data.products);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Product search failed');
    } finally {
      setProductsLoading(false);
    }
  }, [selectedBatch]);

  useEffect(() => {
    fetchStockBatches();
  }, [fetchStockBatches]);

  useEffect(() => {
    fetchProducts('');
  }, [selectedBatch, fetchProducts]);

  useEffect(() => {
    const timer = setTimeout(() => fetchProducts(productSearch), 250);
    return () => clearTimeout(timer);
  }, [productSearch, selectedBatch, fetchProducts]);

  useEffect(() => {
    if (!barcode.trim()) return;
    fetchProducts('', barcode.trim());
  }, [barcode, fetchProducts]);

  useEffect(() => {
    if (barcode && products.length === 1 && products[0].barcode === barcode.trim()) {
      setQuantityPromptProduct(products[0]);
      setBarcode('');
    }
  }, [products, barcode]);

  const totals = useMemo(
    () => calculateBillTotals(cart, billDiscount),
    [cart, billDiscount]
  );

  const effectivePaidAmount = useMemo(() => {
    if (paymentMethod === 'credit') return 0;
    if (paidAmount === '' || paidAmount === null) return totals.grandTotal;
    return Math.max(Number(paidAmount) || 0, 0);
  }, [paymentMethod, paidAmount, totals.grandTotal]);

  const paymentAllocation = useMemo(
    () => calculatePaymentAllocation({
      previousPending: previousPendingBalance,
      newBillTotal: totals.grandTotal,
      amountReceived: effectivePaidAmount,
    }),
    [previousPendingBalance, totals.grandTotal, effectivePaidAmount]
  );

  const rawPendingAmount = useMemo(
    () => paymentAllocation.newBillPending,
    [paymentAllocation.newBillPending]
  );

  const pendingAmount = rawPendingAmount;

  const balanceReturn = useMemo(
    () => paymentAllocation.balanceReturn,
    [paymentAllocation.balanceReturn]
  );

  const paymentStatus = useMemo(
    () => resolvePaymentStatus(effectivePaidAmount, totals.grandTotal),
    [effectivePaidAmount, totals.grandTotal]
  );

  useEffect(() => {
    if (!checkoutOpen) return;
    setPaidAmount((prev) => {
      if (prev === '' || prev === null) return String(totals.grandTotal);
      const paid = Number(prev) || 0;
      if (paid > totals.grandTotal) return String(totals.grandTotal);
      return prev;
    });
  }, [totals.grandTotal, checkoutOpen]);

  const customerRequired = pendingAmount > 0 || paymentMethod === 'credit' || selectedCustomerId;

  const switchCustomerMode = useCallback((mode) => {
    setCustomerMode(mode);
    setSelectedCustomerId(null);
    setPreviousPendingBalance(0);
    setCustomer(emptyCustomer);
  }, []);

  const selectExistingCustomer = useCallback((existingCustomer) => {
    setSelectedCustomerId(existingCustomer.id);
    setPreviousPendingBalance(Number(existingCustomer.currentBalance) || 0);
    setCustomer({
      name: existingCustomer.name || '',
      phone: existingCustomer.phone || '',
      village: existingCustomer.village || '',
      address: existingCustomer.address || '',
      notes: existingCustomer.notes || '',
    });
  }, []);

  const clearSelectedCustomer = useCallback(() => {
    setSelectedCustomerId(null);
    setPreviousPendingBalance(0);
    setCustomer(emptyCustomer);
  }, []);

  const addToCart = useCallback((product, quantity = 1) => {
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      toast.error('Enter a valid quantity');
      return;
    }

    if (product.currentStock <= 0) {
      toast.error('Product out of stock');
      return;
    }

    if (qty > product.currentStock) {
      toast.error(`Only ${product.currentStock} available in stock`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        const newQty = existing.quantity + qty;
        if (newQty > product.currentStock) {
          toast.error('Cannot exceed available stock');
          return prev;
        }
        return prev.map((item) => (
          item.productId === product.id
            ? { ...item, quantity: newQty }
            : item
        ));
      }

      return [...prev, {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        sellingPrice: product.sellingPrice,
        purchasePrice: product.purchasePrice,
        gstRate: product.gstRate,
        currentStock: product.currentStock,
        batchNumber: product.batchNumber || selectedBatch?.batchNumber,
        quantity: qty,
        discountAmount: 0,
      }];
    });

    toast.success(`${product.name} added to bill`);
  }, [selectedBatch]);

  const promptProductForCart = useCallback((product) => {
    if (product.currentStock <= 0) {
      toast.error('Product out of stock');
      return;
    }
    setEditCartProductId(null);
    setQuantityPromptProduct(product);
  }, []);

  const updateCartItem = useCallback((productId, field, value) => {
    setCart((prev) => {
      if (field === 'quantity') {
        const qty = Number(value) || 0;
        if (qty <= 0) {
          return prev.filter((item) => item.productId !== productId);
        }

        return prev.map((item) => {
          if (item.productId !== productId) return item;

          const nextQty = Math.max(qty, 0.001);
          if (nextQty > item.currentStock) {
            toast.error('Cannot exceed available stock');
            return item;
          }
          return { ...item, quantity: nextQty };
        });
      }

      return prev.map((item) => {
        if (item.productId !== productId) return item;
        return { ...item, [field]: value };
      });
    });
  }, []);

  const removeFromCart = useCallback((productId) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
    toast.success('Item removed from bill');
  }, []);

  const confirmQuantityAdd = useCallback((product, quantity) => {
    if (editCartProductId) {
      updateCartItem(editCartProductId, 'quantity', quantity);
      toast.success('Quantity updated');
      setEditCartProductId(null);
    } else {
      addToCart(product, quantity);
    }
    setQuantityPromptProduct(null);
  }, [editCartProductId, addToCart, updateCartItem]);

  const editCartItem = useCallback((item) => {
    setEditCartProductId(item.productId);
    setQuantityPromptProduct({
      id: item.productId,
      name: item.name,
      currentStock: item.currentStock,
    });
  }, []);

  const closeQuantityPrompt = useCallback(() => {
    setQuantityPromptProduct(null);
    setEditCartProductId(null);
  }, []);

  const openCheckout = useCallback(() => {
    if (cart.length === 0) {
      toast.error('Add at least one product to the bill');
      return;
    }
    setPaidAmount(String(totals.grandTotal));
    setCheckoutOpen(true);
  }, [cart.length, totals.grandTotal]);

  const closeCheckout = useCallback(() => {
    setCheckoutOpen(false);
  }, []);

  const selectBatch = useCallback((batch) => {
    setSelectedBatch(batch);
    setProductSearch('');
    setBarcode('');
  }, []);

  const clearBatch = useCallback(() => {
    setSelectedBatch(null);
    setProductSearch('');
    setBarcode('');
  }, []);

  const resetBill = useCallback(() => {
    setCart([]);
    setBillDiscount(0);
    setCustomer(emptyCustomer);
    setCustomerMode('new');
    setSelectedCustomerId(null);
    setPreviousPendingBalance(0);
    setPaymentMethod('cash');
    setPaidAmount('');
    setCheckoutOpen(false);
    setCompletedSale(null);
    setWhatsappResult(null);
    fetchProducts(productSearch);
  }, [fetchProducts, productSearch]);

  const generateBill = async () => {
    if (cart.length === 0) {
      toast.error('Add at least one product');
      return;
    }

    if (customerMode === 'existing') {
      if (!selectedCustomerId) {
        toast.error('Please select an existing customer');
        return;
      }
    } else if (!customer.name.trim() || !customer.phone.trim()) {
      toast.error('Customer name and WhatsApp mobile number are required');
      return;
    }

    let phoneCheck = null;
    if (customerMode === 'new') {
      phoneCheck = validateIndianMobile(customer.phone);
      if (!phoneCheck.valid) {
        toast.error(phoneCheck.error);
        return;
      }
    }

    const payments = buildSalePayments(paymentMethod, effectivePaidAmount, totals.grandTotal);

    setIsSubmitting(true);
    try {
      const payload = {
        discountAmount: Number(billDiscount) || 0,
        remarks: customer.notes.trim() || undefined,
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          sellingPrice: Number(item.sellingPrice),
          discountAmount: Number(item.discountAmount) || 0,
          gstRate: Number(item.gstRate),
        })),
        payments,
        customerId: customerMode === 'existing' ? selectedCustomerId : undefined,
        customer: {
          name: customer.name.trim(),
          phone: customerMode === 'new' ? phoneCheck.normalized : undefined,
          village: customer.village.trim() || undefined,
          address: customer.address.trim() || undefined,
          notes: customer.notes.trim() || undefined,
        },
        trackPendingBalance: true,
      };

      const response = await billingService.createSale(payload);
      const result = response.data.data;

      setCompletedSale(result.sale);
      setWhatsappResult(result.whatsapp || null);
      setCheckoutOpen(false);

      const status = resolvePaymentStatus(effectivePaidAmount, totals.grandTotal);
      if (result.whatsapp?.sent) {
        toast.success(status === 'PAID'
          ? 'Bill paid. Invoice sent on WhatsApp.'
          : 'Bill saved to Pending Payments. Invoice sent on WhatsApp.');
      } else if (result.whatsapp && !result.whatsapp.sent) {
        toast.success('Bill generated. WhatsApp failed — resend from Pending Payments.');
      } else if (status === 'PAID') {
        toast.success('Bill completed successfully.');
      } else {
        toast.success('Bill saved to Pending Payments.');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate bill');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resendWhatsApp = async () => {
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

  return {
    stockBatches,
    selectedBatch,
    selectBatch,
    clearBatch,
    batchesLoading,
    products,
    productSearch,
    setProductSearch,
    barcode,
    setBarcode,
    productsLoading,
    fetchProducts,
    cart,
    addToCart,
    promptProductForCart,
    quantityPromptProduct,
    confirmQuantityAdd,
    editCartItem,
    editCartProductId,
    checkoutOpen,
    openCheckout,
    closeCheckout,
    closeQuantityPrompt,
    updateCartItem,
    removeFromCart,
    billDiscount,
    setBillDiscount,
    customer,
    setCustomer,
    customerMode,
    switchCustomerMode,
    selectedCustomerId,
    selectExistingCustomer,
    clearSelectedCustomer,
    previousPendingBalance,
    paymentAllocation,
    paymentMethod,
    setPaymentMethod,
    paidAmount,
    setPaidAmount,
    rawPendingAmount,
    totals,
    effectivePaidAmount,
    pendingAmount,
    balanceReturn,
    paymentStatus,
    customerRequired,
    isSubmitting,
    generateBill,
    completedSale,
    whatsappResult,
    resetBill,
    resendWhatsApp,
    sendingWhatsApp,
    calculateCartLine,
    productSearchRef,
    barcodeRef,
  };
};

export default usePosBilling;
