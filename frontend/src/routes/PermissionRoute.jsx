import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';

const PermissionRoute = ({ module, action = 'view', children }) => {
  const { loading, checkPermission } = useAuth();

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!checkPermission(module, action)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default PermissionRoute;
