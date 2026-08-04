export const formatCurrency = (amount) => {
  const value = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatQuantity = (quantity, decimals = 3) => {
  const value = Number(quantity) || 0;
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value);
};

export const formatStatusLabel = (status) => {
  const labels = {
    active: 'Active',
    inactive: 'Inactive',
    discontinued: 'Discontinued',
  };
  return labels[status] || status;
};
