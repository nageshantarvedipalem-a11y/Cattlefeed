import { forwardRef, useState } from 'react';
import { FiEye, FiEyeOff, FiLock } from 'react-icons/fi';

const PasswordInput = forwardRef(({
  placeholder = 'Enter password',
  autoComplete = 'current-password',
  className = '',
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative">
      <FiLock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        ref={ref}
        type={showPassword ? 'text' : 'password'}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-11 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 ${className}`}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShowPassword((prev) => !prev)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        tabIndex={-1}
      >
        {showPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
      </button>
    </div>
  );
});

PasswordInput.displayName = 'PasswordInput';

export default PasswordInput;
