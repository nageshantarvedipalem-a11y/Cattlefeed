import {
  getProfitSummary,
  getProfitChartData,
  findProfitEntries,
  findProfitEntriesForExport,
  getFilteredProfitTotals,
} from '../repositories/profit.repository.js';
import { buildProfitWorkbook } from '../helpers/exportExcel.helper.js';
import { buildProfitPdf } from '../helpers/exportPdf.helper.js';

export class ProfitService {
  async getProfitDashboard(queryParams) {
    const page = Math.max(parseInt(queryParams.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(queryParams.limit, 10) || 10, 1), 100);

    const filters = {
      search: queryParams.search?.trim() || '',
      period: queryParams.period || null,
      dateFrom: queryParams.dateFrom || null,
      dateTo: queryParams.dateTo || null,
    };

    const [summary, chartData, filteredTotals, { entries, total }] = await Promise.all([
      getProfitSummary(),
      getProfitChartData(filters),
      getFilteredProfitTotals(filters),
      findProfitEntries({
        ...filters,
        page,
        limit,
        sortBy: queryParams.sortBy || 'saleDate',
        sortOrder: queryParams.sortOrder || 'desc',
      }),
    ]);

    return {
      summary,
      filteredTotals,
      chartData,
      entries,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async exportProfit(queryParams, format) {
    const filters = {
      search: queryParams.search?.trim() || '',
      period: queryParams.period || null,
      dateFrom: queryParams.dateFrom || null,
      dateTo: queryParams.dateTo || null,
    };

    const [entries, summary, filteredTotals, chartData] = await Promise.all([
      findProfitEntriesForExport(filters),
      getProfitSummary(),
      getFilteredProfitTotals(filters),
      getProfitChartData(filters),
    ]);

    if (format === 'excel') {
      const workbook = await buildProfitWorkbook(entries, { summary, filteredTotals });
      const buffer = await workbook.xlsx.writeBuffer();
      return {
        buffer,
        filename: `profit-report-${Date.now()}.xlsx`,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    }

    const buffer = await buildProfitPdf(entries, { summary, filteredTotals, chartData });
    return {
      buffer,
      filename: `profit-report-${Date.now()}.pdf`,
      contentType: 'application/pdf',
    };
  }
}

export default new ProfitService();
