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

export const profileRules = {
  fullName: {
    required: 'Full name is required',
    maxLength: {
      value: 100,
      message: 'Full name is too long',
    },
  },
  username: {
    required: 'Username is required',
    minLength: {
      value: 3,
      message: 'Username must be at least 3 characters',
    },
    maxLength: {
      value: 50,
      message: 'Username is too long',
    },
    pattern: {
      value: /^[a-zA-Z0-9_]+$/,
      message: 'Username can only contain letters, numbers, and underscores',
    },
  },
  email: {
    required: 'Email is required',
    pattern: {
      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Enter a valid email address',
    },
  },
  phone: {
    maxLength: {
      value: 20,
      message: 'Phone number is too long',
    },
  },
};
