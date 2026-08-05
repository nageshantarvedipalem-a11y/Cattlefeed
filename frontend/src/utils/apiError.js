export const parseApiErrorMessage = async (error, fallback = 'Something went wrong') => {
  const data = error?.response?.data;

  if (typeof data?.message === 'string') {
    return data.message;
  }

  if (data instanceof Blob) {
    try {
      const text = await data.text();
      const parsed = JSON.parse(text);
      if (typeof parsed?.message === 'string') {
        return parsed.message;
      }
    } catch {
      /* not JSON */
    }
  }

  if (typeof data === 'string') {
    return data;
  }

  return error?.message || fallback;
};
