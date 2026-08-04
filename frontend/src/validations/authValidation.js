export const loginRules = {
  identifier: {
    required: 'Username or email is required',
  },
  password: {
    required: 'Password is required',
  },
};

export const forgotPasswordRules = {
  email: {
    required: 'Email is required',
    pattern: {
      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Enter a valid email address',
    },
  },
};

export const resetPasswordRules = {
  password: {
    required: 'New password is required',
    minLength: {
      value: 8,
      message: 'Password must be at least 8 characters',
    },
  },
  confirmPassword: {
    required: 'Confirm password is required',
  },
};

export const changePasswordRules = {
  currentPassword: {
    required: 'Current password is required',
  },
  newPassword: {
    required: 'New password is required',
    minLength: {
      value: 8,
      message: 'Password must be at least 8 characters',
    },
  },
  confirmPassword: {
    required: 'Confirm password is required',
  },
};
