import { findSales } from '../repositories/sale.repository.js';
import { findPurchases } from '../repositories/purchase.repository.js';
import { findProfitEntries, findProfitEntriesForExport, getFilteredProfitTotals } from '../repositories/profit.repository.js';
import { findStockMovements, findStockMovementsForExport } from '../repositories/stockMovement.repository.js';
import { findPayments } from '../repositories/payment.repository.js';
import {
  getSummaryReport,
  findCustomerReportRows,
  findCustomerReportForExport,
} from '../repositories/report.repository.js';
import {
  buildSummaryReportWorkbook,
  buildSalesReportWorkbook,
  buildPurchasesReportWorkbook,
  buildCustomersReportWorkbook,
  buildPaymentsReportWorkbook,
  buildProfitWorkbook,
  buildStockHistoryWorkbook,
} from '../helpers/exportExcel.helper.js';
import {
  buildSummaryReportPdf,
  buildSalesReportPdf,
  buildPurchasesReportPdf,
  buildCustomersReportPdf,
  buildPaymentsReportPdf,
} from '../helpers/exportReportPdf.helper.js';
import { buildProfitPdf, buildStockHistoryPdf } from '../helpers/exportPdf.helper.js';
import { AppError } from '../utils/apiResponse.js';

const VALID_TYPES = ['summary', 'sales', 'purchases', 'profit', 'customers', 'stock', 'payments'];

const resolveDateRange = (period, dateFrom, dateTo) => {
  if (dateFrom && dateTo) {
    return {
      dateFrom: typeof dateFrom === 'string' ? dateFrom.slice(0, 10) : new Date(dateFrom).toISOString().slice(0, 10),
      dateTo: typeof dateTo === 'string' ? dateTo.slice(0, 10) : new Date(dateTo).toISOString().slice(0, 10),
    };
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const today = `${year}-${month}-${day}`;

  switch (period) {
    case 'daily':
      return { dateFrom: today, dateTo: today };
    case 'monthly':
      return { dateFrom: `${year}-${month}-01`, dateTo: today };
    case 'yearly':
      return { dateFrom: `${year}-01-01`, dateTo: today };
    default:
      return { dateFrom: null, dateTo: null };
  }
};

export class ReportService {
  async getReport(type, queryParams) {
    if (!VALID_TYPES.includes(type)) {
      throw new AppError('Invalid report type', 400);
    }

    const page = Math.max(parseInt(queryParams.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(queryParams.limit, 10) || 10, 1), 100);
    const period = queryParams.period || null;
    const { dateFrom, dateTo } = resolveDateRange(period, queryParams.dateFrom, queryParams.dateTo);
    const search = queryParams.search?.trim() || '';
    const dateParams = dateFrom && dateTo
      ? { dateFrom, dateTo, period: null }
      : { dateFrom: null, dateTo: null, period };
    const filters = { ...dateParams, search };

    switch (type) {
      case 'summary': {
        const summary = await getSummaryReport(filters);
        return { type, summary, rows: [], pagination: { page: 1, limit, total: 0, totalPages: 1 } };
      }
      case 'sales': {
        const { sales, total } = await findSales({
          search,
          dateFrom,
          dateTo,
          page,
          limit,
          sortBy: queryParams.sortBy || 'saleDate',
          sortOrder: queryParams.sortOrder || 'desc',
        });
        return {
          type,
          rows: sales,
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
        };
      }
      case 'purchases': {
        const { purchases, total } = await findPurchases({
          search,
          dateFrom,
          dateTo,
          page,
          limit,
          sortBy: queryParams.sortBy || 'purchaseDate',
          sortOrder: queryParams.sortOrder || 'desc',
        });
        return {
          type,
          rows: purchases,
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
        };
      }
      case 'profit': {
        const [filteredTotals, { entries, total }] = await Promise.all([
          getFilteredProfitTotals(filters),
          findProfitEntries({ ...filters, page, limit, sortBy: 'saleDate', sortOrder: 'desc' }),
        ]);
        return {
          type,
          summary: filteredTotals,
          rows: entries,
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
        };
      }
      case 'customers': {
        const { rows, total } = await findCustomerReportRows({ ...filters, page, limit });
        return {
          type,
          rows,
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
        };
      }
      case 'stock': {
        const { movements, total } = await findStockMovements({
          search,
          period,
          dateFrom,
          dateTo,
          page,
          limit,
          sortOrder: 'desc',
        });
        return {
          type,
          rows: movements,
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
        };
      }
      case 'payments': {
        const { payments, total } = await findPayments({
          search,
          period,
          dateFrom,
          dateTo,
          page,
          limit,
          sortOrder: 'desc',
        });
        return {
          type,
          rows: payments,
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
        };
      }
      default:
        throw new AppError('Invalid report type', 400);
    }
  }

  async exportReport(type, queryParams, format) {
    if (!VALID_TYPES.includes(type)) {
      throw new AppError('Invalid report type', 400);
    }

    const period = queryParams.period || null;
    const { dateFrom, dateTo } = resolveDateRange(period, queryParams.dateFrom, queryParams.dateTo);
    const search = queryParams.search?.trim() || '';
    const dateParams = dateFrom && dateTo
      ? { dateFrom, dateTo, period: null }
      : { dateFrom: null, dateTo: null, period };
    const filters = { ...dateParams, search };

    let buffer;
    let filename;
    let contentType;

    if (format === 'excel') {
      switch (type) {
        case 'summary': {
          const summary = await getSummaryReport(filters);
          const workbook = await buildSummaryReportWorkbook(summary);
          buffer = await workbook.xlsx.writeBuffer();
          filename = `summary-report-${Date.now()}.xlsx`;
          break;
        }
        case 'sales': {
          const { sales } = await findSales({ search, dateFrom, dateTo, page: 1, limit: 10000 });
          const workbook = await buildSalesReportWorkbook(sales);
          buffer = await workbook.xlsx.writeBuffer();
          filename = `sales-report-${Date.now()}.xlsx`;
          break;
        }
        case 'purchases': {
          const { purchases } = await findPurchases({ search, dateFrom, dateTo, page: 1, limit: 10000 });
          const workbook = await buildPurchasesReportWorkbook(purchases);
          buffer = await workbook.xlsx.writeBuffer();
          filename = `purchase-report-${Date.now()}.xlsx`;
          break;
        }
        case 'profit': {
          const entries = await findProfitEntriesForExport(filters);
          const totals = await getFilteredProfitTotals(filters);
          const workbook = await buildProfitWorkbook(entries, { filteredTotals: totals });
          buffer = await workbook.xlsx.writeBuffer();
          filename = `profit-report-${Date.now()}.xlsx`;
          break;
        }
        case 'customers': {
          const rows = await findCustomerReportForExport(filters);
          const workbook = await buildCustomersReportWorkbook(rows);
          buffer = await workbook.xlsx.writeBuffer();
          filename = `customer-report-${Date.now()}.xlsx`;
          break;
        }
        case 'stock': {
          const movements = await findStockMovementsForExport(filters);
          const workbook = await buildStockHistoryWorkbook(movements, filters);
          buffer = await workbook.xlsx.writeBuffer();
          filename = `stock-report-${Date.now()}.xlsx`;
          break;
        }
        case 'payments': {
          const { payments } = await findPayments({ ...filters, page: 1, limit: 10000 });
          const workbook = await buildPaymentsReportWorkbook(payments);
          buffer = await workbook.xlsx.writeBuffer();
          filename = `payment-report-${Date.now()}.xlsx`;
          break;
        }
        default:
          throw new AppError('Invalid report type', 400);
      }
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else {
      switch (type) {
        case 'summary': {
          const summary = await getSummaryReport(filters);
          buffer = await buildSummaryReportPdf(summary);
          filename = `summary-report-${Date.now()}.pdf`;
          break;
        }
        case 'sales': {
          const { sales } = await findSales({ search, dateFrom, dateTo, page: 1, limit: 10000 });
          buffer = await buildSalesReportPdf(sales);
          filename = `sales-report-${Date.now()}.pdf`;
          break;
        }
        case 'purchases': {
          const { purchases } = await findPurchases({ search, dateFrom, dateTo, page: 1, limit: 10000 });
          buffer = await buildPurchasesReportPdf(purchases);
          filename = `purchase-report-${Date.now()}.pdf`;
          break;
        }
        case 'profit': {
          const entries = await findProfitEntriesForExport(filters);
          const totals = await getFilteredProfitTotals(filters);
          buffer = await buildProfitPdf(entries, { filteredTotals: totals });
          filename = `profit-report-${Date.now()}.pdf`;
          break;
        }
        case 'customers': {
          const rows = await findCustomerReportForExport(filters);
          buffer = await buildCustomersReportPdf(rows);
          filename = `customer-report-${Date.now()}.pdf`;
          break;
        }
        case 'stock': {
          const movements = await findStockMovementsForExport(filters);
          buffer = await buildStockHistoryPdf(movements, filters);
          filename = `stock-report-${Date.now()}.pdf`;
          break;
        }
        case 'payments': {
          const { payments } = await findPayments({ ...filters, page: 1, limit: 10000 });
          buffer = await buildPaymentsReportPdf(payments);
          filename = `payment-report-${Date.now()}.pdf`;
          break;
        }
        default:
          throw new AppError('Invalid report type', 400);
      }
      contentType = 'application/pdf';
    }

    return { buffer, filename, contentType };
  }
}

export default new ReportService();
