export const resolveChartConfig = (period, dateFrom, dateTo) => {
  if (dateFrom && dateTo) {
    const start = new Date(dateFrom);
    const end = new Date(dateTo);
    const daySpan = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    if (daySpan <= 31) {
      return { grouping: 'day', dateFrom, dateTo, custom: true };
    }
    if (daySpan <= 366) {
      return { grouping: 'month', dateFrom, dateTo, custom: true };
    }
    return { grouping: 'year', dateFrom, dateTo, custom: true };
  }

  switch (period) {
    case 'monthly':
      return { grouping: 'month', relativeMonths: 12 };
    case 'yearly':
      return { grouping: 'year', relativeYears: 5 };
    case 'daily':
    default:
      return { grouping: 'day', relativeDays: 7 };
  }
};

export const buildDateWhere = (config, column) => {
  if (config.custom) {
    return {
      clause: ` AND DATE(${column}) BETWEEN ? AND ?`,
      params: [config.dateFrom, config.dateTo],
    };
  }

  if (config.relativeDays) {
    return {
      clause: ` AND ${column} >= DATE_SUB(CURDATE(), INTERVAL ? DAY)`,
      params: [config.relativeDays - 1],
    };
  }

  if (config.relativeMonths) {
    return {
      clause: ` AND ${column} >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)`,
      params: [config.relativeMonths - 1],
    };
  }

  if (config.relativeYears) {
    return {
      clause: ` AND ${column} >= DATE_SUB(CURDATE(), INTERVAL ? YEAR)`,
      params: [config.relativeYears - 1],
    };
  }

  return { clause: '', params: [] };
};

export const buildGroupSelect = (grouping, column) => {
  switch (grouping) {
    case 'month':
      return {
        groupExpr: `DATE_FORMAT(${column}, '%Y-%m')`,
        labelExpr: `DATE_FORMAT(${column}, '%b %Y')`,
        sortExpr: `DATE_FORMAT(${column}, '%Y-%m')`,
      };
    case 'year':
      return {
        groupExpr: `YEAR(${column})`,
        labelExpr: `YEAR(${column})`,
        sortExpr: `YEAR(${column})`,
      };
    case 'day':
    default:
      return {
        groupExpr: `DATE(${column})`,
        labelExpr: `DATE(${column})`,
        sortExpr: `DATE(${column})`,
      };
  }
};
