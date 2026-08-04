export const formatCurrency = (amount, symbol = '₹') => {
  const value = Number(amount) || 0;
  return `${symbol}${value.toFixed(2)}`;
};
