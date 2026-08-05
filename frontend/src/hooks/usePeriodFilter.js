import { useCallback, useMemo, useState } from 'react';

/** Build API query params: preset period OR custom dateFrom/dateTo */
export const buildPeriodApiParams = (period, dateFrom, dateTo) => {
  if (period === 'custom') {
    if (!dateFrom || !dateTo) return null;
    if (dateFrom > dateTo) return { invalid: true };
    return { dateFrom, dateTo };
  }
  if (!period) return {};
  return { period };
};

const usePeriodFilter = (initialPeriod = '') => {
  const [period, setPeriodState] = useState(initialPeriod);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const setPeriod = useCallback((value) => {
    setPeriodState(value);
    if (value !== 'custom') {
      setDateFrom('');
      setDateTo('');
    }
  }, []);

  const apiParams = useMemo(
    () => buildPeriodApiParams(period, dateFrom, dateTo),
    [period, dateFrom, dateTo],
  );

  const isReady = apiParams !== null && !apiParams?.invalid;
  const isCustomPending = period === 'custom' && (!dateFrom || !dateTo);
  const isInvalidRange = period === 'custom' && dateFrom && dateTo && dateFrom > dateTo;

  return {
    period,
    setPeriod,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    apiParams: isReady ? apiParams : {},
    isReady,
    isCustomPending,
    isInvalidRange,
  };
};

export default usePeriodFilter;
