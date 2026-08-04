import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NotFoundPage = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <h1 className="text-6xl font-bold text-slate-300">404</h1>
      <p className="mt-4 text-lg text-slate-600">Page not found</p>
      {isAuthenticated ? (
        <Link
          to="/"
          className="mt-6 rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
        >
          Go to Dashboard
        </Link>
      ) : (
        <Navigate to="/login" replace />
      )}
    </div>
  );
};

export default NotFoundPage;
