const sizeClasses = {
  xs: 'h-7 w-7',
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
  lg: 'h-16 w-16',
  xl: 'h-24 w-24',
};

const AppLogo = ({
  size = 'md',
  showText = false,
  subtitle = 'Feed Business Suite',
  className = '',
  imageClassName = '',
  titleClassName = 'text-slate-900',
  subtitleClassName = 'text-emerald-700/80',
}) => (
  <div className={`flex min-w-0 items-center gap-3 ${className}`}>
    <img
      src="/images/logo.png"
      alt="Cattle Feed ERP"
      className={`${sizeClasses[size] || sizeClasses.md} shrink-0 rounded-xl object-contain bg-white/95 p-0.5 shadow-sm ring-1 ring-emerald-100 ${imageClassName}`}
    />
    {showText && (
      <div className="min-w-0">
        <p className={`truncate text-sm font-bold leading-tight ${titleClassName}`}>Cattle Feed ERP</p>
        {subtitle && (
          <p className={`truncate text-[10px] font-medium uppercase tracking-wider ${subtitleClassName}`}>
            {subtitle}
          </p>
        )}
      </div>
    )}
  </div>
);

export default AppLogo;
