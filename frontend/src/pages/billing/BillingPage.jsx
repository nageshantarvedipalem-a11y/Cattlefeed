import { useEffect } from 'react';
import usePosBilling from '../../hooks/usePosBilling';
import StockBatchPanel from '../../components/billing/StockBatchPanel';
import PosSummaryPanel from '../../components/billing/PosSummaryPanel';
import PosBillSuccessModal from '../../components/billing/PosBillSuccessModal';
import QuantityPromptModal from '../../components/billing/QuantityPromptModal';
import CheckoutFormModal from '../../components/billing/CheckoutFormModal';

const BillingPage = () => {
  const pos = usePosBilling();

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'F4') {
        event.preventDefault();
        pos.barcodeRef.current?.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pos]);

  const handleBarcodeSubmit = (event) => {
    event.preventDefault();
    if (!pos.barcode.trim()) return;
    pos.fetchProducts('', pos.barcode.trim());
  };

  const editingItem = pos.editCartProductId
    ? pos.cart.find((item) => item.productId === pos.editCartProductId)
    : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mb-4 shrink-0">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-600">Point of Sale</p>
            <h1 className="text-xl font-bold text-slate-900">Professional Billing</h1>
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-1 py-1 text-[11px] font-medium shadow-sm">
            <span className="rounded-lg bg-emerald-600 px-3 py-1.5 text-white">1 · Add Products</span>
            <span className="px-2 text-slate-300">→</span>
            <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-slate-600">2 · Bill Summary</span>
            <span className="px-2 text-slate-300">→</span>
            <span className="rounded-lg px-3 py-1.5 text-slate-400">3 · Payment</span>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
        <StockBatchPanel
          batches={pos.stockBatches}
          batchesLoading={pos.batchesLoading}
          selectedBatch={pos.selectedBatch}
          onSelectBatch={pos.selectBatch}
          products={pos.products}
          productsLoading={pos.productsLoading}
          productSearch={pos.productSearch}
          onProductSearchChange={pos.setProductSearch}
          onSelectProduct={pos.promptProductForCart}
        />

        <PosSummaryPanel
          barcode={pos.barcode}
          onBarcodeChange={pos.setBarcode}
          onBarcodeSubmit={handleBarcodeSubmit}
          barcodeRef={pos.barcodeRef}
          cart={pos.cart}
          calculateCartLine={pos.calculateCartLine}
          onUpdateCartItem={pos.updateCartItem}
          onRemoveCartItem={pos.removeFromCart}
          onEditCartItem={pos.editCartItem}
          billDiscount={pos.billDiscount}
          onBillDiscountChange={pos.setBillDiscount}
          totals={pos.totals}
          onProceed={pos.openCheckout}
        />
      </div>

      {pos.quantityPromptProduct && (
        <QuantityPromptModal
          product={pos.quantityPromptProduct}
          editMode={Boolean(pos.editCartProductId)}
          initialQuantity={editingItem?.quantity}
          onConfirm={pos.confirmQuantityAdd}
          onClose={pos.closeQuantityPrompt}
        />
      )}

      <CheckoutFormModal
        isOpen={pos.checkoutOpen}
        onClose={pos.closeCheckout}
        customer={pos.customer}
        onCustomerChange={pos.setCustomer}
        paymentMethod={pos.paymentMethod}
        onPaymentMethodChange={pos.setPaymentMethod}
        paidAmount={pos.paidAmount}
        onPaidAmountChange={pos.setPaidAmount}
        totals={pos.totals}
        effectivePaidAmount={pos.effectivePaidAmount}
        pendingAmount={pos.pendingAmount}
        balanceReturn={pos.balanceReturn}
        paymentStatus={pos.paymentStatus}
        onSubmit={pos.generateBill}
        isSubmitting={pos.isSubmitting}
      />

      {pos.completedSale && (
        <PosBillSuccessModal
          sale={pos.completedSale}
          whatsappResult={pos.whatsappResult}
          onClose={pos.resetBill}
          onResendWhatsApp={pos.resendWhatsApp}
          sendingWhatsApp={pos.sendingWhatsApp}
        />
      )}
    </div>
  );
};

export default BillingPage;
