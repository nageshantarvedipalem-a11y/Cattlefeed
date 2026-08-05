import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import authService from '../services/authService';
import {
  clearAuthSession,
  getStoredToken,
  getStoredUser,
  hasPermission,
  setAuthSession,
} from '../utils/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getStoredUser);
  const [token, setToken] = useState(getStoredToken);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = Boolean(token && user);

  const bootstrapAuth = useCallback(async () => {
    const storedToken = getStoredToken();
    const storedUser = getStoredUser();

    if (!storedToken) {
      setLoading(false);
      return;
    }

    try {
      const response = await authService.me();
      const freshUser = response.data.data.user;
      setUser(freshUser);
      setToken(storedToken);
      setAuthSession(storedToken, freshUser);
    } catch (error) {
      // Only clear session on auth failure — keep session on network/backend errors
      if (error.response?.status === 401) {
        clearAuthSession();
        setUser(null);
        setToken(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrapAuth();
  }, [bootstrapAuth]);

  const login = async (identifier, password) => {
    const response = await authService.login(identifier, password);
    const { user: loggedInUser, token: accessToken } = response.data.data;
    setAuthSession(accessToken, loggedInUser);
    setUser(loggedInUser);
    setToken(accessToken);
    return loggedInUser;
  };

  const logout = async () => {
    try {
      if (token) {
        await authService.logout();
      }
    } finally {
      clearAuthSession();
      setUser(null);
      setToken(null);
    }
  };

  const checkPermission = useCallback(
    (module, action = 'view') => hasPermission(user, module, action),
    [user]
  );

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated,
      login,
      logout,
      checkPermission,
      refreshUser: bootstrapAuth,
    }),
    [user, token, loading, isAuthenticated, checkPermission, bootstrapAuth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default AuthContext;
