import type { TableData } from '../../types/research';

export type ChartType = 'line' | 'bar' | 'barH' | 'pie' | 'radar' | 'area' | 'scatter' | 'none';

export interface ChartConfig {
  type: ChartType;
  title: string;
  categories: string[];
  series: {
    name: string;
    data: number[];
    color?: string;
  }[];
  yAxisName?: string;
  canChart: boolean;
  reason?: string;
}

const CHART_COLORS = [
  '#4da6ff', '#95de64', '#ffc53d', '#ff7a45', '#b37feb',
  '#5cdbd3', '#ff85c0', '#ffd666', '#87e8de', '#d3adf7',
];

function parseNumeric(val: string): number | null {
  if (!val || val === '-' || val === '—' || val === 'N/A') return null;
  const cleaned = val
    .replace(/[*_~`#]/g, '')
    .replace(/[,，亿万元xX%％]/g, '')
    .replace(/[🔴🟢🟡✅⚠️★☆⭐]/g, '')
    .trim();
  if (cleaned === '' || cleaned === '-') return null;
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function isYearLike(val: string): boolean {
  return /^(19|20)\d{2}/.test(val.trim());
}

function isQuarterLike(val: string): boolean {
  return /Q[1-4]/.test(val.trim()) || /[一二三四]季度/.test(val.trim());
}

function isScoreLike(val: string): boolean {
  return /[★☆⭐]/.test(val) || /^\d{1,2}\/\d{1,2}$/.test(val.trim());
}

function isPercentageLike(val: string): boolean {
  return val.includes('%') || val.includes('％');
}

function isNumericColumn(rows: string[][], colIdx: number): boolean {
  let numericCount = 0;
  let totalCount = 0;
  for (const row of rows) {
    if (colIdx < row.length) {
      totalCount++;
      if (parseNumeric(row[colIdx]) !== null) numericCount++;
    }
  }
  return totalCount > 0 && numericCount / totalCount >= 0.5;
}

function detectChartType(table: TableData): ChartConfig {
  const { headers, rows } = table;
  if (!headers || headers.length < 2 || !rows || rows.length < 2) {
    return { type: 'none', title: '', categories: [], series: [], canChart: false, reason: '数据不足' };
  }

  const numericCols: number[] = [];
  for (let i = 1; i < headers.length; i++) {
    if (isNumericColumn(rows, i)) {
      numericCols.push(i);
    }
  }

  if (numericCols.length === 0) {
    return { type: 'none', title: '', categories: [], series: [], canChart: false, reason: '无数值列' };
  }

  const categories: string[] = [];
  for (const row of rows) {
    const cat = row[0]?.replace(/[*_~`#]/g, '').trim() || '';
    if (cat) categories.push(cat);
  }

  const hasYearCategories = rows.some(r => isYearLike(r[0] || ''));
  const hasQuarterCategories = rows.some(r => isQuarterLike(r[0] || ''));
  const isTimeSeries = hasYearCategories || hasQuarterCategories;

  const hasScoreHeaders = headers.some(h => /评分|score|评级/i.test(h));
  const hasScoreValues = rows.some(r => numericCols.some(ci => {
    const v = r[ci] || '';
    return isScoreLike(v) || (parseNumeric(v) !== null && parseNumeric(v)! <= 10 && parseNumeric(v)! >= 0);
  }));

  const series: ChartConfig['series'] = [];
  for (let i = 0; i < numericCols.length; i++) {
    const colIdx = numericCols[i];
    const data: number[] = [];
    for (const row of rows) {
      const val = parseNumeric(row[colIdx] || '');
      data.push(val !== null ? val : 0);
    }
    const name = headers[colIdx].replace(/[*_~`#]/g, '').trim();
    series.push({
      name,
      data,
      color: CHART_COLORS[i % CHART_COLORS.length],
    });
  }

  let chartType: ChartType = 'none';
  let yAxisName = '';

  if (isTimeSeries && numericCols.length >= 1) {
    chartType = numericCols.length === 1 ? 'area' : 'line';
    yAxisName = isPercentageLike(headers[numericCols[0]]) ? '%' : '';
  } else if (hasScoreHeaders && hasScoreValues && categories.length >= 3) {
    chartType = 'radar';
  } else if (numericCols.length === 1 && categories.length >= 2) {
    chartType = 'barH';
    yAxisName = headers[numericCols[0]];
  } else if (numericCols.length >= 2 && categories.length >= 2) {
    chartType = 'bar';
  } else {
    return { type: 'none', title: '', categories: [], series: [], canChart: false, reason: '无法匹配图表类型' };
  }

  const title = headers[0] || '';

  return {
    type: chartType,
    title,
    categories,
    series,
    yAxisName,
    canChart: true,
  };
}

export { detectChartType, parseNumeric, CHART_COLORS };