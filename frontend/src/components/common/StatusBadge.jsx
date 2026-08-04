import { FiActivity, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';

const StatusBadge = ({ status, label }) => {
  const config = {
    healthy: {
      icon: FiCheckCircle,
      className: 'bg-emerald-100 text-emerald-700',
    },
    unhealthy: {
      icon: FiAlertCircle,
      className: 'bg-red-100 text-red-700',
    },
    loading: {
      icon: FiActivity,
      className: 'bg-amber-100 text-amber-700',
    },
  };

  const { icon: Icon, className } = config[status] || config.loading;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${className}`}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
};

export default StatusBadge;
