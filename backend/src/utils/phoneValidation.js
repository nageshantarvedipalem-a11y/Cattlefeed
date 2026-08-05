const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

export const validateIndianMobile = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');

  if (!digits) {
    return { valid: false, normalized: null, display: null, error: 'Mobile number is required' };
  }

  let mobile = digits;

  if (digits.length === 12 && digits.startsWith('91')) {
    mobile = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    mobile = digits.slice(1);
  }

  if (mobile.length !== 10) {
    return {
      valid: false,
      normalized: null,
      display: null,
      error: 'Enter a valid 10-digit Indian mobile number',
    };
  }

  if (!INDIAN_MOBILE_REGEX.test(mobile)) {
    return {
      valid: false,
      normalized: null,
      display: null,
      error: 'Mobile number must start with 6, 7, 8, or 9',
    };
  }

  return {
    valid: true,
    normalized: `91${mobile}`,
    display: mobile,
    error: null,
  };
};

export const normalizeIndianMobile = (phone) => {
  const result = validateIndianMobile(phone);
  return result.valid ? result.normalized : null;
};
