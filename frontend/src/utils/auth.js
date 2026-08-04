const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'auth_user';

export const getStoredToken = () => sessionStorage.getItem(AUTH_TOKEN_KEY);

export const getStoredUser = () => {
  const user = sessionStorage.getItem(AUTH_USER_KEY);
  return user ? JSON.parse(user) : null;
};

export const setAuthSession = (token, user) => {
  sessionStorage.setItem(AUTH_TOKEN_KEY, token);
  sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
};

export const clearAuthSession = () => {
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_USER_KEY);
};

export const hasPermission = (user, module, action = 'view') => {
  if (!user?.permissions) return false;
  if (user.roleName === 'owner') return true;

  const modulePerms = user.permissions[module];
  if (modulePerms === true) return true;
  if (typeof modulePerms === 'object') return Boolean(modulePerms[action]);
  return false;
};

export const formatRoleName = (role) => {
  if (!role) return '';
  return role.charAt(0).toUpperCase() + role.slice(1);
};
