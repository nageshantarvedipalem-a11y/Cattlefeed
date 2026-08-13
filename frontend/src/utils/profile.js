export const resolveProfileImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;

  const apiBase = import.meta.env.VITE_API_BASE_URL || '/api/cattlefeed/v1';
  const origin = apiBase.replace(/\/api\/.*$/, '') || window.location.origin;
  return `${origin}${url.startsWith('/') ? url : `/${url}`}`;
};

export const getUserInitials = (fullName, fallback = 'CF') =>
  fullName
    ?.split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || fallback;
