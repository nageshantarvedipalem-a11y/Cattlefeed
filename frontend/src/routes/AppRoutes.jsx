import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '../context/AuthContext';
import ProtectedRoute from './ProtectedRoute';
import GuestRoute from './GuestRoute';
import PermissionRoute from './PermissionRoute';
import DashboardLayout from '../layouts/DashboardLayout';
import LoadingSpinner from '../components/common/LoadingSpinner';

const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const ForgotPasswordPage = lazy(() => import('../pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('../pages/auth/ResetPasswordPage'));
const DashboardPage = lazy(() => import('../pages/dashboard/DashboardPage'));
const ChangePasswordPage = lazy(() => import('../pages/auth/ChangePasswordPage'));
const ProfilePage = lazy(() => import('../pages/auth/ProfilePage'));
const UsersPage = lazy(() => import('../pages/users/UsersPage'));
const CustomersPage = lazy(() => import('../pages/customers/CustomersPage'));
const CustomerDetailPage = lazy(() => import('../pages/customers/CustomerDetailPage'));
const SuppliersPage = lazy(() => import('../pages/suppliers/SuppliersPage'));
const SupplierDetailPage = lazy(() => import('../pages/suppliers/SupplierDetailPage'));
const ProductsPage = lazy(() => import('../pages/products/ProductsPage'));
const ProductDetailPage = lazy(() => import('../pages/products/ProductDetailPage'));
const StockPage = lazy(() => import('../pages/stock/StockPage'));
const BillingPage = lazy(() => import('../pages/billing/BillingPage'));
const LedgerPage = lazy(() => import('../pages/ledger/LedgerPage'));
const LedgerDetailPage = lazy(() => import('../pages/ledger/LedgerDetailPage'));
const CashBookPage = lazy(() => import('../pages/cashbook/CashBookPage'));
const PendingPaymentsPage = lazy(() => import('../pages/payments/PendingPaymentsPage'));
const ProfitPage = lazy(() => import('../pages/profit/ProfitPage'));
const ReportsPage = lazy(() => import('../pages/reports/ReportsPage'));
const WhatsAppPage = lazy(() => import('../pages/whatsapp/WhatsAppPage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner fullScreen />}>
        <Routes>
          <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
          <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
          <Route path="/reset-password" element={<GuestRoute><ResetPasswordPage /></GuestRoute>} />

          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/users" element={
                <PermissionRoute module="users" action="view">
                  <UsersPage />
                </PermissionRoute>
              } />
              <Route path="/customers" element={
                <PermissionRoute module="customers" action="view">
                  <CustomersPage />
                </PermissionRoute>
              } />
              <Route path="/customers/:id" element={
                <PermissionRoute module="customers" action="view">
                  <CustomerDetailPage />
                </PermissionRoute>
              } />
              <Route path="/suppliers" element={
                <PermissionRoute module="suppliers" action="view">
                  <SuppliersPage />
                </PermissionRoute>
              } />
              <Route path="/suppliers/:id" element={
                <PermissionRoute module="suppliers" action="view">
                  <SupplierDetailPage />
                </PermissionRoute>
              } />
              <Route path="/products" element={
                <PermissionRoute module="products" action="view">
                  <ProductsPage />
                </PermissionRoute>
              } />
              <Route path="/products/:id" element={
                <PermissionRoute module="products" action="view">
                  <ProductDetailPage />
                </PermissionRoute>
              } />
              <Route path="/stock" element={
                <PermissionRoute module="stock" action="view">
                  <StockPage />
                </PermissionRoute>
              } />
              <Route path="/billing" element={
                <PermissionRoute module="billing" action="view">
                  <BillingPage />
                </PermissionRoute>
              } />
              <Route path="/ledger" element={
                <PermissionRoute module="ledger" action="view">
                  <LedgerPage />
                </PermissionRoute>
              } />
              <Route path="/ledger/:customerId" element={
                <PermissionRoute module="ledger" action="view">
                  <LedgerDetailPage />
                </PermissionRoute>
              } />
              <Route path="/cashbook" element={
                <PermissionRoute module="cashbook" action="view">
                  <CashBookPage />
                </PermissionRoute>
              } />
              <Route path="/payments" element={
                <PermissionRoute module="payments" action="view">
                  <PendingPaymentsPage />
                </PermissionRoute>
              } />
              <Route path="/profit" element={
                <PermissionRoute module="reports" action="view">
                  <ProfitPage />
                </PermissionRoute>
              } />
              <Route path="/reports" element={
                <PermissionRoute module="reports" action="view">
                  <ReportsPage />
                </PermissionRoute>
              } />
              <Route path="/whatsapp" element={
                <PermissionRoute module="settings" action="view">
                  <WhatsAppPage />
                </PermissionRoute>
              } />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/change-password" element={<ChangePasswordPage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1e293b',
            color: '#f8fafc',
          },
        }}
      />
    </BrowserRouter>
  );
};

const App = () => (
  <AuthProvider>
    <AppRoutes />
  </AuthProvider>
);

export default App;
