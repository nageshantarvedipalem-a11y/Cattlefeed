import { useCallback, useEffect, useRef, useState } from 'react';
import dashboardService from '../services/dashboardService';
import { getCached } from '../utils/apiCache';

export const useDashboardChart = (chartKey, defaultPeriod = 'daily', enabled = true) => {
  const [period, setPeriod] = useState(defaultPeriod);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const hasLoadedOnce = useRef(false);

  const fetchChart = useCallback(async () => {
    if (!enabled) return;

    if (period === 'custom' && (!dateFrom || !dateTo)) {
      setData([]);
      setLoading(false);
      return;
    }

    if (!hasLoadedOnce.current) setLoading(true);
    try {
      const params = {};
      if (period === 'custom') {
        params.dateFrom = dateFrom;
        params.dateTo = dateTo;
      } else {
        params.period = period;
      }

      const cacheKey = `dashboard:chart:${chartKey}:${JSON.stringify(params)}`;
      const cached = getCached(cacheKey);
      if (cached?.data?.data?.length) {
        setData(cached.data.data);
        hasLoadedOnce.current = true;
        setLoading(false);
      }

      const response = await dashboardService.getChartData(chartKey, params);
      setData(response.data.data || []);
      hasLoadedOnce.current = true;
    } catch {
      if (!hasLoadedOnce.current) setData([]);
    } finally {
      setLoading(false);
    }
  }, [chartKey, period, dateFrom, dateTo, enabled]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    if (period === 'custom' && (!dateFrom || !dateTo)) {
      setLoading(false);
      return;
    }
    fetchChart();
  }, [fetchChart, period, dateFrom, dateTo, enabled]);

  return {
    data,
    loading,
    period,
    setPeriod,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    refetch: fetchChart,
  };
};

export default useDashboardChart;
