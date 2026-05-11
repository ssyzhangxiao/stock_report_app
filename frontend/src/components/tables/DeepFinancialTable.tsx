import React, { useMemo } from 'react';
import { Card, Table, Tabs, Typography, Tag, Row, Col } from 'antd';
import ReactECharts from 'echarts-for-react';
import type { ColumnsType } from 'antd/es/table';
import { FinancialIndicator, BalanceSheet, Cashflow, IncomeStatement } from '../../types/stock';

const { Text } = Typography;

/** 同比变化箭头组件 */
const YoY: React.FC<{ current: number; previous: number }> = ({ current, previous }) => {
  if (!current || !previous) return null;
  const pct = ((current - previous) / previous) * 100;
  return (
    <Tag color={pct >= 0 ? 'success' : 'error'} style={{ fontSize: 12, lineHeight: '16px', padding: '0 4px' }}>
      {pct >= 0 ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
    </Tag>
  );
};

interface DeepFinancialTableProps {
  financialIndicators: FinancialIndicator[];
  balanceSheet: BalanceSheet[];
  cashflow: Cashflow[];
  incomeStatement?: IncomeStatement[];
}

const DeepFinancialTable: React.FC<DeepFinancialTableProps> = ({
  financialIndicators,
  balanceSheet,
  cashflow,
  incomeStatement
}) => {
  // 按日期降序排序（最新数据在前）
  const sortedFinancialIndicators = useMemo(() => {
    return [...financialIndicators].sort((a, b) => {
      const dateA = String(a['日期'] || '');
      const dateB = String(b['日期'] || '');
      return dateB.localeCompare(dateA); // 降序排列
    });
  }, [financialIndicators]);

  const sortedBalanceSheet = useMemo(() => {
    return [...balanceSheet].sort((a, b) => {
      const dateA = String(a['report_date'] || '');
      const dateB = String(b['report_date'] || '');
      return dateB.localeCompare(dateA);
    });
  }, [balanceSheet]);

  const sortedCashflow = useMemo(() => {
    return [...cashflow].sort((a, b) => {
      const dateA = String(a['report_date'] || '');
      const dateB = String(b['report_date'] || '');
      return dateB.localeCompare(dateA);
    });
  }, [cashflow]);

  const sortedIncomeStatement = useMemo(() => {
    return [...(incomeStatement || [])].sort((a, b) => {
      const dateA = String(a['report_date'] || '');
      const dateB = String(b['report_date'] || '');
      return dateB.localeCompare(dateA);
    });
  }, [incomeStatement]);
  // 财务指标列定义
  const indicatorColumns: ColumnsType<FinancialIndicator> = [
    {
      title: '报告期',
      dataIndex: '日期',
      key: 'date',
      width: 120,
      fixed: 'left'
    },
    {
      title: 'ROE(%)',
      dataIndex: '净资产收益率(%)',
      key: 'roe',
      width: 100,
      render: (value: number) => (
        <Text style={{ color: value > 15 ? 'var(--color-down)' : value < 5 ? 'var(--color-up)' : undefined }}>
          {value?.toFixed(2) ?? 'N/A'}
        </Text>
      )
    },
    {
      title: '营收(亿)',
      dataIndex: '营业总收入(元)',
      key: 'revenue',
      width: 150,
      render: (value: number, _: any, idx: number) => {
        const prev = (financialIndicators as any[])[idx + 1]?.['营业总收入(元)'];
        return <span>{value ? (value / 1e8).toFixed(2) : 'N/A'} {value && prev ? <YoY current={value} previous={prev} /> : null}</span>;
      }
    },
    {
      title: '净利润(亿)',
      dataIndex: '净利润(元)',
      key: 'profit',
      width: 150,
      render: (value: number, _: any, idx: number) => {
        const prev = (financialIndicators as any[])[idx + 1]?.['净利润(元)'];
        return <span>{value ? (value / 1e8).toFixed(2) : 'N/A'} {value && prev ? <YoY current={value} previous={prev} /> : null}</span>;
      }
    },
    {
      title: '毛利率(%)',
      dataIndex: '销售毛利率(%)',
      key: 'grossMargin',
      width: 100,
      render: (value: number) => value?.toFixed(2) ?? 'N/A'
    },
    {
      title: '净利率(%)',
      dataIndex: '总资产净利润率(%)',
      key: 'netMargin',
      width: 100,
      render: (value: number) => value?.toFixed(2) ?? 'N/A'
    },
    {
      title: '资产负债率(%)',
      dataIndex: '资产负债率',
      key: 'debtRatio',
      width: 120,
      render: (value: number) => (
        <Text style={{ color: value > 70 ? 'var(--color-up)' : undefined }}>
          {value?.toFixed(2) ?? 'N/A'}
        </Text>
      )
    },
    {
      title: '流动比率',
      dataIndex: '流动比率',
      key: 'currentRatio',
      width: 100,
      render: (value: number) => value?.toFixed(2) ?? 'N/A'
    },
    {
      title: '每股收益',
      dataIndex: '每股收益',
      key: 'eps',
      width: 100,
      render: (value: number) => value?.toFixed(2) ?? 'N/A'
    },
    {
      title: 'TTM EPS',
      key: 'ttm_eps',
      width: 100,
      render: (_: any, __: any, idx: number) => {
        const fi = financialIndicators as any[];
        // TTM = 当前累积EPS + (去年年报EPS - 去年同季EPS)
        const curEps = fi[idx]?.['每股收益'] as number;
        if (!curEps || fi.length < 4) return <Text type="secondary">--</Text>;
        const fullYearRow = fi.find((r: any) => String(r['日期'] || '').includes('12-31'));
        const sameQtrLastYear = fi.slice(idx + 4)[0]; // 4 rows back = same quarter last year
        const lastYearEps = fullYearRow?.['每股收益'] as number;
        const lastYearSame = sameQtrLastYear?.['每股收益'] as number;
        if (lastYearEps && lastYearSame) {
          const ttm = curEps + (lastYearEps - lastYearSame);
          return <Text strong style={{ color: 'var(--color-primary)' }}>{ttm.toFixed(2)}</Text>;
        }
        return <Text type="secondary">--</Text>;
      }
    }
  ];

  // 资产负债表列定义
  const balanceSheetColumns: ColumnsType<BalanceSheet> = [
    {
      title: '报告期',
      dataIndex: 'report_date',
      key: 'date',
      width: 120,
      fixed: 'left'
    },
    {
      title: '总资产(亿)',
      dataIndex: 'total_assets',
      key: 'totalAssets',
      width: 120,
      render: (value: number) => value ? (value / 1e8).toFixed(2) : 'N/A'
    },
    {
      title: '总负债(亿)',
      dataIndex: 'total_liability',
      key: 'totalLiability',
      width: 120,
      render: (value: number) => value ? (value / 1e8).toFixed(2) : 'N/A'
    },
    {
      title: '所有者权益(亿)',
      dataIndex: 'total_holders_equity',
      key: 'equity',
      width: 140,
      render: (value: number) => value ? (value / 1e8).toFixed(2) : 'N/A'
    },
    {
      title: '货币资金(亿)',
      dataIndex: 'cash_and_equivalents',
      key: 'cash',
      width: 140,
      render: (value: number) => value ? (value / 1e8).toFixed(2) : 'N/A'
    }
  ];

  // 现金流量表列定义
  const cashflowColumns: ColumnsType<Cashflow> = [
    {
      title: '报告期',
      dataIndex: 'report_date',
      key: 'date',
      width: 120,
      fixed: 'left'
    },
    {
      title: '经营现金流(亿)',
      dataIndex: 'net_operate_cash_flow',
      key: 'operateCashflow',
      width: 140,
      render: (value: number) => (
        <Text style={{ color: value > 0 ? 'var(--color-down)' : 'var(--color-up)' }}>
          {value ? (value / 1e8).toFixed(2) : 'N/A'}
        </Text>
      )
    },
    {
      title: '投资现金流(亿)',
      dataIndex: 'net_invest_cash_flow',
      key: 'investCashflow',
      width: 140,
      render: (value: number) => (
        <Text style={{ color: value > 0 ? 'var(--color-down)' : 'var(--color-up)' }}>
          {value ? (value / 1e8).toFixed(2) : 'N/A'}
        </Text>
      )
    },
    {
      title: '筹资现金流(亿)',
      dataIndex: 'net_finance_cash_flow',
      key: 'financeCashflow',
      width: 140,
      render: (value: number) => (
        <Text style={{ color: value > 0 ? 'var(--color-down)' : 'var(--color-up)' }}>
          {value ? (value / 1e8).toFixed(2) : 'N/A'}
        </Text>
      )
    },
    {
      title: '现金净增加额(亿)',
      dataIndex: 'net_increase_in_cash',
      key: 'netCashIncrease',
      width: 140,
      render: (value: number) => (
        <Text style={{ color: value > 0 ? 'var(--color-down)' : 'var(--color-up)' }}>
          {value ? (value / 1e8).toFixed(2) : 'N/A'}
        </Text>
      )
    },
    {
      title: '自由现金流(亿)',
      key: 'fcf',
      width: 130,
      render: (_: any, record: Cashflow) => {
        const op = record.net_operate_cash_flow;
        const inv = record.net_invest_cash_flow;
        if (op != null && inv != null) {
          const fcf = op + inv; // inv is negative for investments
          return <Text style={{ color: fcf > 0 ? 'var(--color-down)' : 'var(--color-up)', fontWeight: 600 }}>{(fcf / 1e8).toFixed(2)}</Text>;
        }
        return <Text type="secondary">N/A</Text>;
      }
    }
  ];

  const incomeStatementColumns: ColumnsType<IncomeStatement> = [
    {
      title: '报告期',
      dataIndex: 'report_date',
      key: 'date',
      width: 120,
      fixed: 'left'
    },
    {
      title: '营业总收入(亿)',
      dataIndex: 'total_operating_revenue',
      key: 'total_rev',
      width: 140,
      render: (value: number) => value ? (value / 1e8).toFixed(2) : 'N/A'
    },
    {
      title: '营业成本(亿)',
      dataIndex: 'operating_cost',
      key: 'cost',
      width: 120,
      render: (value: number) => value ? (value / 1e8).toFixed(2) : 'N/A'
    },
    {
      title: '销售费用(亿)',
      dataIndex: 'sales_expense',
      key: 'sales',
      width: 120,
      render: (value: number) => value ? (value / 1e8).toFixed(2) : 'N/A'
    },
    {
      title: '管理费用(亿)',
      dataIndex: 'admin_expense',
      key: 'admin',
      width: 120,
      render: (value: number) => value ? (value / 1e8).toFixed(2) : 'N/A'
    },
    {
      title: '研发费用(亿)',
      dataIndex: 'rnd_expense',
      key: 'rnd',
      width: 120,
      render: (value: number) => value ? (value / 1e8).toFixed(2) : 'N/A'
    },
    {
      title: '财务费用(亿)',
      dataIndex: 'financial_expense',
      key: 'finance',
      width: 120,
      render: (value: number) => value ? (value / 1e8).toFixed(2) : 'N/A'
    },
    {
      title: '营业利润(亿)',
      dataIndex: 'operating_profit',
      key: 'op_profit',
      width: 130,
      render: (value: number) => (
        <Text style={{ color: value >= 0 ? 'var(--color-down)' : 'var(--color-up)' }}>
          {value ? (value / 1e8).toFixed(2) : 'N/A'}
        </Text>
      )
    },
    {
      title: '净利润(亿)',
      dataIndex: 'net_profit',
      key: 'net_profit',
      width: 120,
      render: (value: number) => (
        <Text style={{ color: value >= 0 ? 'var(--color-down)' : 'var(--color-up)' }}>
          {value ? (value / 1e8).toFixed(2) : 'N/A'}
        </Text>
      )
    },
    {
      title: '每股收益',
      dataIndex: 'eps',
      key: 'eps',
      width: 100,
      render: (value: number) => value?.toFixed(2) ?? 'N/A'
    },
  ];

  const items = [
    {
      key: '1',
      label: '📊 财务指标',
      children: (
        <Table
          columns={indicatorColumns}
          dataSource={sortedFinancialIndicators}
          rowKey={(_, index) => `indicator_${index}`}
          pagination={{ pageSize: 5, showSizeChanger: false }}
          scroll={{ x: 1000 }}
          size="small"
        />
      )
    },
    {
      key: '2',
      label: '📋 资产负债表',
      children: (
        <Table
          columns={balanceSheetColumns}
          dataSource={sortedBalanceSheet}
          rowKey={(_, index) => `balance_${index}`}
          pagination={{ pageSize: 5, showSizeChanger: false }}
          scroll={{ x: 800 }}
          size="small"
        />
      )
    },
    {
      key: '3',
      label: '💰 现金流量表',
      children: (
        <Table
          columns={cashflowColumns}
          dataSource={sortedCashflow}
          rowKey={(_, index) => `cashflow_${index}`}
          pagination={{ pageSize: 5, showSizeChanger: false }}
          scroll={{ x: 800 }}
          size="small"
        />
      )
    },
    {
      key: '4',
      label: '📈 损益表',
      children: (
        <Table
          columns={incomeStatementColumns}
          dataSource={sortedIncomeStatement}
          rowKey={(_, index) => `income_${index}`}
          pagination={{ pageSize: 5, showSizeChanger: false }}
          scroll={{ x: 1200 }}
          size="small"
        />
      )
    }
  ];

  // 营收/净利柱状图 + ROE折线 复合图表
  const trendChart = useMemo(() => {
    // 使用排序后的数据（最新在前），但图表需要按时间正序（从左到右）
    const fi = [...sortedFinancialIndicators].reverse() as any[];
    if (!fi || fi.length < 2) return null;

    // 只保留年报数据（12-31）
    const annualData = fi.filter(r => {
      const dateStr = String(r['日期'] || '');
      return dateStr.includes('12-31');
    });

    if (annualData.length < 2) {
      // 如果年报数据不足，回退到原始数据
      const dates = fi.map(r => String(r['日期'] || '').slice(0, 7));
      const revs = fi.map(r => { const v = r['营业总收入(元)']; return v ? +(v / 1e8).toFixed(1) : 0; });
      const profs = fi.map(r => { const v = r['净利润(元)']; return v ? +(v / 1e8).toFixed(1) : 0; });
      const roes = fi.map(r => { const v = r['净资产收益率(%)']; return v ? +v.toFixed(1) : 0; });

      return {
        tooltip: {
          trigger: 'axis' as const,
          formatter: (params: any) => {
            let result = `${params[0].axisValue}<br/>`;
            params.forEach((p: any) => {
              if (p.seriesName === 'ROE') {
                result += `${p.marker}${p.seriesName}: ${p.value.toFixed(1)}%<br/>`;
              } else {
                result += `${p.marker}${p.seriesName}: ¥${p.value.toFixed(1)}亿<br/>`;
              }
            });
            return result;
          }
        },
        legend: { data: ['营收', '净利', 'ROE'], bottom: 2, icon: 'roundRect', itemWidth: 10, itemHeight: 8, fontSize: 11 },
        grid: { left: 50, right: 20, top: 20, bottom: 40 },
        xAxis: { type: 'category' as const, data: dates, axisLabel: { fontSize: 10 } },
        yAxis: [
          { type: 'value' as const, name: '亿元', nameTextStyle: { fontSize: 10 }, axisLabel: { fontSize: 10 }, splitLine: { lineStyle: { type: 'dashed' as const } } },
          { type: 'value' as const, name: '%', nameTextStyle: { fontSize: 10 }, axisLabel: { fontSize: 10, formatter: '{value}%' }, splitLine: { show: false } },
        ],
        series: [
          { type: 'bar' as const, data: revs, name: '营收', barWidth: '20%', itemStyle: { color: '#1890ff', borderRadius: [2, 2, 0, 0] } },
          { type: 'bar' as const, data: profs, name: '净利', barWidth: '20%', itemStyle: { color: '#52c41a', borderRadius: [2, 2, 0, 0] } },
          { type: 'line' as const, data: roes, name: 'ROE', yAxisIndex: 1, smooth: true, lineStyle: { width: 2, color: '#2f54eb' }, symbol: 'diamond', symbolSize: 6, itemStyle: { color: '#2f54eb' }, areaStyle: { color: 'rgba(47,84,235,0.08)' } },
        ],
      };
    }

    // 使用年报数据 - 数据已经是正序（从早到晚）
    const dates = annualData.map(r => String(r['日期'] || '').slice(0, 4));
    const revs = annualData.map(r => { const v = r['营业总收入(元)']; return v ? +(v / 1e8).toFixed(1) : 0; });
    const profs = annualData.map(r => { const v = r['净利润(元)']; return v ? +(v / 1e8).toFixed(1) : 0; });
    const roes = annualData.map(r => { const v = r['净资产收益率(%)']; return v ? +v.toFixed(1) : 0; });

    return {
      tooltip: {
        trigger: 'axis' as const,
        formatter: (params: any) => {
          let result = `${params[0].axisValue}年<br/>`;
          params.forEach((p: any) => {
            if (p.seriesName === 'ROE') {
              result += `${p.marker}${p.seriesName}: ${p.value.toFixed(1)}%<br/>`;
            } else {
              result += `${p.marker}${p.seriesName}: ¥${p.value.toFixed(1)}亿<br/>`;
            }
          });
          return result;
        }
      },
      legend: { data: ['营收', '净利', 'ROE'], bottom: 2, icon: 'roundRect', itemWidth: 10, itemHeight: 8, fontSize: 11 },
      grid: { left: 50, right: 20, top: 20, bottom: 40 },
      xAxis: { type: 'category' as const, data: dates, axisLabel: { fontSize: 10 } },
      yAxis: [
        { type: 'value' as const, name: '亿元', nameTextStyle: { fontSize: 10 }, axisLabel: { fontSize: 10 }, splitLine: { lineStyle: { type: 'dashed' as const } } },
        { type: 'value' as const, name: '%', nameTextStyle: { fontSize: 10 }, axisLabel: { fontSize: 10, formatter: '{value}%' }, splitLine: { show: false } },
      ],
      series: [
        { type: 'bar' as const, data: revs, name: '营收', barWidth: '20%', itemStyle: { color: '#1890ff', borderRadius: [2, 2, 0, 0] } },
        { type: 'bar' as const, data: profs, name: '净利', barWidth: '20%', itemStyle: { color: '#52c41a', borderRadius: [2, 2, 0, 0] } },
        { type: 'line' as const, data: roes, name: 'ROE', yAxisIndex: 1, smooth: true, lineStyle: { width: 2, color: '#2f54eb' }, symbol: 'diamond', symbolSize: 6, itemStyle: { color: '#2f54eb' }, areaStyle: { color: 'rgba(47,84,235,0.08)' } },
      ],
    };
  }, [financialIndicators]);

  // 最新一期数据摘要
  const latestPeriod = sortedFinancialIndicators[0] as any;
  const latestSummary = latestPeriod ? {
    date: String(latestPeriod['日期'] || ''),
    roe: latestPeriod['净资产收益率(%)'],
    revenue: latestPeriod['营业总收入(元)'],
    profit: latestPeriod['净利润(元)'],
    grossMargin: latestPeriod['销售毛利率(%)'],
    netMargin: latestPeriod['总资产净利润率(%)'],
    debtRatio: latestPeriod['资产负债率'],
  } : null;

  return (
    <Card title="💹 财务数据分析" style={{ marginBottom: 6 }} bodyStyle={{ padding: 12 }}>
      {latestSummary && (
        <Row gutter={8} style={{ marginBottom: 12 }}>
          <Col span={4}><Text type="secondary" style={{ fontSize: 11 }}>报告期</Text><br /><Text strong style={{ fontSize: 13 }}>{latestSummary.date}</Text></Col>
          <Col span={4}><Text type="secondary" style={{ fontSize: 11 }}>ROE</Text><br /><Text strong style={{ fontSize: 13, color: latestSummary.roe > 15 ? '#52c41a' : '#faad14' }}>{latestSummary.roe?.toFixed(2) ?? 'N/A'}%</Text></Col>
          <Col span={4}><Text type="secondary" style={{ fontSize: 11 }}>营收</Text><br /><Text strong style={{ fontSize: 13 }}>{latestSummary.revenue ? (latestSummary.revenue / 1e8).toFixed(2) : 'N/A'}亿</Text></Col>
          <Col span={4}><Text type="secondary" style={{ fontSize: 11 }}>净利润</Text><br /><Text strong style={{ fontSize: 13 }}>{latestSummary.profit ? (latestSummary.profit / 1e8).toFixed(2) : 'N/A'}亿</Text></Col>
          <Col span={4}><Text type="secondary" style={{ fontSize: 11 }}>毛利率</Text><br /><Text strong style={{ fontSize: 13 }}>{latestSummary.grossMargin?.toFixed(2) ?? 'N/A'}%</Text></Col>
          <Col span={4}><Text type="secondary" style={{ fontSize: 11 }}>资产负债率</Text><br /><Text strong style={{ fontSize: 13, color: latestSummary.debtRatio > 70 ? '#ff4d4f' : undefined }}>{latestSummary.debtRatio?.toFixed(2) ?? 'N/A'}%</Text></Col>
        </Row>
      )}
      {trendChart && (
        <Row gutter={12} style={{ marginBottom: 12 }}>
          <Col span={24}>
            <ReactECharts option={trendChart} style={{ height: 160 }} opts={{ renderer: 'canvas' }} notMerge />
          </Col>
        </Row>
      )}

      {/* 整合财务指标和盈利能力分析 */}
      <Row gutter={12} style={{ marginBottom: 12 }}>
        {/* 财务指标 */}
        <Col span={12}>
          {(() => {
            if (!sortedFinancialIndicators || sortedFinancialIndicators.length === 0) return null;
            const annualIndicators = sortedFinancialIndicators.filter((item: any) => {
              const dateStr = String(item['日期'] || '');
              return dateStr.includes('12-31');
            });
            const useIndicators = annualIndicators.length >= 1 ? annualIndicators : sortedFinancialIndicators;
            const latest = useIndicators[0];
            const formatNum = (num: any, unit = '') => {
              if (num === null || num === undefined) return 'N/A';
              const n = Number(num);
              if (isNaN(n)) return String(num);
              if (Math.abs(n) >= 1e8) return (n / 1e8).toFixed(2) + '亿';
              if (Math.abs(n) >= 1e4) return (n / 1e4).toFixed(2) + '万';
              return n.toFixed(2) + unit;
            };
            const getDisplayDate = (item: any) => {
              const dateStr = String(item['日期'] || '');
              if (dateStr.includes('12-31')) return dateStr.slice(0, 4) + '年报';
              return dateStr;
            };
            const items = [
              { label: '营业总收入', value: formatNum(latest['营业总收入(元)']) },
              { label: '净利润', value: formatNum(latest['净利润(元)']) },
              { label: '净资产收益率', value: formatNum(latest['净资产收益率(%)'], '%') },
              { label: '销售毛利率', value: formatNum(latest['销售毛利率(%)'], '%') },
              { label: '资产负债率', value: formatNum(latest['资产负债率'], '%') },
            ];
            return (
              <div style={{ padding: '12px', background: 'var(--component-bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>📊 财务指标</h3>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', background: 'var(--bg-elevated)', padding: '3px 8px', borderRadius: 4 }}>
                    {getDisplayDate(latest)}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8 }}>
                  {items.map((item, i) => (
                    <div key={i} style={{ padding: 8, background: 'var(--bg-elevated)', borderRadius: 6, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 3 }}>{item.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </Col>

        {/* 盈利能力分析 */}
        <Col span={12}>
          {(() => {
            if (!sortedFinancialIndicators || sortedFinancialIndicators.length === 0) return null;
            const annualIndicators = sortedFinancialIndicators.filter((item: any) => {
              const dateStr = String(item['日期'] || '');
              return dateStr.includes('12-31');
            });
            const useIndicators = annualIndicators.length >= 2 ? annualIndicators : sortedFinancialIndicators;
            const latest = useIndicators[0];
            const getValue = (item: any, key: string) => {
              const v = item[key];
              return v !== null && v !== undefined ? Number(v) : 0;
            };
            const roe = getValue(latest, '净资产收益率(%)');
            const grossMargin = getValue(latest, '销售毛利率(%)');
            const getLevel = (val: number, goodThreshold: number, warnThreshold: number) => {
              if (val >= goodThreshold) return { color: '#52c41a', level: '优秀' };
              if (val >= warnThreshold) return { color: '#faad14', level: '一般' };
              return { color: '#ff4d4f', level: '需关注' };
            };
            const roeLevel = getLevel(roe, 15, 8);
            const marginLevel = getLevel(grossMargin, 40, 20);
            const renderGauge = (value: number, max: number, color: string, label: string) => {
              const percent = Math.min(100, Math.max(0, (value / max) * 100));
              return (
                <div style={{ flex: 1, textAlign: 'center', padding: 10, background: 'var(--bg-elevated)', borderRadius: 6, border: '1px solid var(--border)' }}>
                  <div style={{ marginBottom: 8 }}>
                    <svg width="100" height="60" viewBox="0 0 120 70">
                      <path d="M10 65 A50 50 0 0 1 110 65" fill="none" stroke="var(--border)" strokeWidth="8" strokeLinecap="round" />
                      <path d="M10 65 A50 50 0 0 1 110 65" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${percent * 1.57} 314`} />
                    </svg>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{value.toFixed(1)}%</div>
                  <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2, color: color }}>{label}</div>
                </div>
              );
            };
            const getDisplayDate = (item: any) => {
              const dateStr = String(item['日期'] || '');
              if (dateStr.includes('12-31')) return dateStr.slice(0, 4);
              return dateStr.slice(0, 7);
            };
            return (
              <div style={{ padding: '12px', background: 'var(--component-bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <h3 style={{ marginBottom: 12, fontSize: 14, fontWeight: 600 }}>📈 盈利能力分析</h3>
                <div style={{ display: 'flex', gap: 12 }}>
                  {renderGauge(roe, 30, roeLevel.color, `ROE ${roeLevel.level}`)}
                  {renderGauge(grossMargin, 80, marginLevel.color, `毛利率 ${marginLevel.level}`)}
                </div>
                {useIndicators.length > 1 && (
                  <div style={{ marginTop: 12, padding: 10, background: 'var(--bg-elevated)', borderRadius: 6, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>历史趋势（最近5年）</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {useIndicators.slice(0, 5).reverse().map((item, i) => {
                        const r = getValue(item, '净资产收益率(%)');
                        const m = getValue(item, '销售毛利率(%)');
                        return (
                          <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                            <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{getDisplayDate(item)}</div>
                            <div style={{ fontSize: 11, color: r >= 0 ? '#52c41a' : '#ff4d4f' }}>ROE: {r.toFixed(1)}%</div>
                            <div style={{ fontSize: 11, color: 'var(--text-primary)' }}>毛利: {m.toFixed(1)}%</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </Col>
      </Row>

      <Tabs defaultActiveKey="1" items={items} size="small" style={{ marginBottom: 12 }} />

      {/* 整合财务趋势分析 */}
      <Row gutter={12} style={{ marginBottom: 12 }}>
        <Col span={24}>
          {(() => {
            if (!sortedFinancialIndicators || sortedFinancialIndicators.length === 0) return null;

            const getValue = (item: any, key: string) => {
              const v = item[key];
              return v !== null && v !== undefined ? Number(v) : 0;
            };
            const formatNum = (num: number) => {
              if (Math.abs(num) >= 1e8) return (num / 1e8).toFixed(1) + '亿';
              if (Math.abs(num) >= 1e4) return (num / 1e4).toFixed(1) + '万';
              return num.toFixed(1);
            };

            const annualIndicators = sortedFinancialIndicators.filter((item: any) => {
              const dateStr = String(item['日期'] || '');
              return dateStr.includes('12-31');
            });

            const pastThreeYears = annualIndicators.slice(0, 3);
            const latest = sortedFinancialIndicators[sortedFinancialIndicators.length - 1];
            const latestDate = String(latest['日期'] || '');
            const isLatestInAnnual = pastThreeYears.some(item => String(item['日期']) === latestDate);
            const useIndicators = isLatestInAnnual
              ? pastThreeYears
              : [latest, ...pastThreeYears];

            const displayData = useIndicators.slice(0, 4).reverse();
            const dates = displayData.map((item: any) => {
              const dateStr = String(item['日期'] || '');
              if (dateStr.includes('12-31')) return dateStr.slice(0, 4);
              return dateStr.slice(0, 7);
            });
            const revValues = displayData.map((item: any) => getValue(item, '营业总收入(元)'));
            const profValues = displayData.map((item: any) => getValue(item, '净利润(元)'));
            const roeValues = displayData.map((item: any) => getValue(item, '净资产收益率(%)'));

            const latestForDuPont = useIndicators[0];
            const netProfit = getValue(latestForDuPont, '净利润(元)');
            const totalRevenue = getValue(latestForDuPont, '营业总收入(元)');
            const totalAssets = getValue(latestForDuPont, '资产总额(元)');
            const totalEquity = getValue(latestForDuPont, '所有者权益合计(元)');

            const netProfitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
            const assetTurnover = totalAssets > 0 ? totalRevenue / totalAssets : 0;
            const equityMultiplier = totalEquity > 0 ? totalAssets / totalEquity : 0;

            const assetLiabilityRatio = getValue(latestForDuPont, '资产负债率');
            const grossMargin = getValue(latestForDuPont, '销售毛利率(%)');

            const calculateRiskScore = () => {
              let score = 50;
              if (assetLiabilityRatio > 70) score -= 20;
              else if (assetLiabilityRatio > 50) score -= 10;
              else if (assetLiabilityRatio < 30) score += 10;
              if (roeValues.length >= 2 && roeValues[roeValues.length - 1] < roeValues[roeValues.length - 2]) score -= 10;
              if (netProfitMargin < 5) score -= 15;
              else if (netProfitMargin > 20) score += 10;
              return Math.max(0, Math.min(100, score));
            };
            const riskScore = calculateRiskScore();

            const getRiskLevel = (score: number) => {
              if (score >= 70) return { label: '低风险', color: '#52c41a' };
              if (score >= 40) return { label: '中等风险', color: '#faad14' };
              return { label: '高风险', color: '#ff4d4f' };
            };
            const riskLevel = getRiskLevel(riskScore);

            const chartOption = {
              tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'cross', crossStyle: { color: '#999' } },
                formatter: (params: any) => {
                  let result = `${params[0].axisValue}<br/>`;
                  params.forEach((p: any) => {
                    if (p.seriesName === '营业总收入' || p.seriesName === '净利润') {
                      result += `${p.marker}${p.seriesName}: ${formatNum(p.value)}<br/>`;
                    } else if (p.seriesName === 'ROE') {
                      result += `${p.marker}ROE: ${p.value.toFixed(2)}%<br/>`;
                    }
                  });
                  return result;
                },
              },
              legend: {
                data: ['营业总收入', '净利润', 'ROE'],
                bottom: 0,
                icon: 'roundRect',
                itemWidth: 10,
                itemHeight: 8,
                fontSize: 11,
              },
              grid: { left: '10%', right: '10%', top: '8%', bottom: '12%' },
              xAxis: {
                type: 'category',
                data: dates,
                axisLabel: { fontSize: 10 },
              },
              yAxis: [
                {
                  type: 'value',
                  name: '金额',
                  position: 'left',
                  nameTextStyle: { fontSize: 10 },
                  axisLabel: {
                    fontSize: 10,
                    formatter: (v: number) => {
                      if (Math.abs(v) >= 1e8) return (v / 1e8).toFixed(0) + '亿';
                      if (Math.abs(v) >= 1e4) return (v / 1e4).toFixed(0) + '万';
                      return v.toString();
                    },
                  },
                  splitLine: { lineStyle: { type: 'dashed' } },
                },
                {
                  type: 'value',
                  name: '%',
                  position: 'right',
                  nameTextStyle: { fontSize: 10 },
                  axisLabel: { fontSize: 10, formatter: '{value}%' },
                  splitLine: { show: false },
                },
              ],
              series: [
                {
                  name: '营业总收入',
                  type: 'bar',
                  data: revValues,
                  yAxisIndex: 0,
                  barWidth: '30%',
                  itemStyle: {
                    color: '#1890ff',
                    borderRadius: [2, 2, 0, 0],
                  },
                  label: {
                    show: true,
                    position: 'top',
                    fontSize: 9,
                    formatter: (p: any) => formatNum(p.value),
                    color: '#1890ff',
                  },
                },
                {
                  name: '净利润',
                  type: 'bar',
                  data: profValues,
                  yAxisIndex: 0,
                  barWidth: '30%',
                  itemStyle: {
                    color: '#52c41a',
                    borderRadius: [2, 2, 0, 0],
                  },
                  label: {
                    show: true,
                    position: 'top',
                    fontSize: 9,
                    formatter: (p: any) => formatNum(p.value),
                    color: '#52c41a',
                  },
                },
                {
                  name: 'ROE',
                  type: 'line',
                  data: roeValues,
                  yAxisIndex: 1,
                  smooth: true,
                  lineStyle: { width: 3, color: '#2f54eb' },
                  symbol: 'circle',
                  symbolSize: 10,
                  itemStyle: { color: '#2f54eb', borderColor: '#fff', borderWidth: 2 },
                  label: {
                    show: true,
                    position: 'top',
                    fontSize: 10,
                    formatter: '{c}%',
                    color: '#2f54eb',
                    fontWeight: 600,
                  },
                },
              ],
            };

            return (
              <div style={{ padding: '12px', background: 'var(--component-bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <h3 style={{ marginBottom: 12, fontSize: 14, fontWeight: 600 }}>📈 财务趋势分析</h3>

                <div style={{ padding: 12, background: 'var(--bg-elevated)', borderRadius: 6, border: '1px solid var(--border)', marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, color: 'var(--text-primary)' }}>财务趋势（过去三年+最新一期）</div>
                  <ReactECharts option={chartOption} style={{ height: 260 }} notMerge={true} />
                </div>

                <div style={{ padding: 12, background: 'var(--bg-elevated)', borderRadius: 6, border: '1px solid var(--border)', marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, color: 'var(--text-primary)' }}>📊 财务风险数轴</div>
                  <div style={{ position: 'relative', height: 40, marginBottom: 10 }}>
                    <div style={{
                      position: 'absolute', left: 0, right: 0, top: '50%',
                      height: 8, borderRadius: 4,
                      background: 'linear-gradient(to right, #52c41a 0%, #faad14 50%, #ff4d4f 100%)',
                      transform: 'translateY(-50%)',
                    }} />
                    <div style={{
                      position: 'absolute', left: `${riskScore}%`, top: '50%',
                      width: 16, height: 16, borderRadius: '50%',
                      background: riskLevel.color, border: '3px solid #fff',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                      transform: 'translate(-50%, -50%)',
                      zIndex: 2,
                    }} />
                    <div style={{
                      position: 'absolute', left: `${riskScore}%`, top: -8,
                      transform: 'translateX(-50%)',
                      fontSize: 11, fontWeight: 700, color: riskLevel.color,
                      whiteSpace: 'nowrap',
                    }}>
                      {riskScore}分 · {riskLevel.label}
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-secondary)' }}>
                    <span style={{ color: '#52c41a' }}>低风险(0-30)</span>
                    <span style={{ color: '#faad14' }}>中等风险(30-70)</span>
                    <span style={{ color: '#ff4d4f' }}>高风险(70-100)</span>
                  </div>
                  <div style={{ marginTop: 10, display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                    <div>资产负债率: <span style={{ fontWeight: 600, color: assetLiabilityRatio > 60 ? '#ff4d4f' : '#52c41a' }}>{assetLiabilityRatio.toFixed(1)}%</span></div>
                    <div>销售毛利率: <span style={{ fontWeight: 600, color: grossMargin > 30 ? '#52c41a' : '#faad14' }}>{grossMargin.toFixed(1)}%</span></div>
                    <div>净利率: <span style={{ fontWeight: 600, color: netProfitMargin > 15 ? '#52c41a' : '#faad14' }}>{netProfitMargin.toFixed(1)}%</span></div>
                  </div>
                </div>

                <div style={{ padding: 12, background: 'var(--bg-elevated)', borderRadius: 6, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, color: 'var(--text-primary)' }}>📊 杜邦分析（最新一期）</div>
                  <div style={{ textAlign: 'center', marginBottom: 10 }}>
                    <div style={{
                      display: 'inline-block', padding: '10px 20px', background: '#e6f7ff',
                      borderRadius: 8, border: '2px solid #1890ff',
                    }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#1890ff' }}>
                        {(netProfitMargin * assetTurnover * equityMultiplier).toFixed(2)}%
                      </div>
                      <div style={{ fontSize: 11, color: '#666' }}>净资产收益率(ROE)</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                    <div style={{
                      flex: 1, textAlign: 'center', padding: 8, background: '#f6ffed',
                      borderRadius: 6, border: '1px solid #52c41a',
                    }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#52c41a' }}>{netProfitMargin.toFixed(2)}%</div>
                      <div style={{ fontSize: 10, color: '#666' }}>销售净利率</div>
                    </div>
                    <div style={{
                      flex: 1, textAlign: 'center', padding: 8, background: '#fff7e6',
                      borderRadius: 6, border: '1px solid #faad14',
                    }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#faad14' }}>{assetTurnover.toFixed(3)}</div>
                      <div style={{ fontSize: 10, color: '#666' }}>总资产周转率</div>
                    </div>
                    <div style={{
                      flex: 1, textAlign: 'center', padding: 8, background: '#fff1f0',
                      borderRadius: 6, border: '1px solid #ff4d4f',
                    }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#ff4d4f' }}>{equityMultiplier.toFixed(2)}</div>
                      <div style={{ fontSize: 10, color: '#666' }}>权益乘数</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </Col>
      </Row>

      <div style={{ marginTop: 12, padding: 10, backgroundColor: 'var(--bg-elevated)', borderRadius: 4 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          💡 提示：图表仅展示年度数据（12-31年报），ROE {'>'} 15% 为优秀，资产负债率 {'>'} 70% 需警惕
        </Text>
      </div>
    </Card>
  );
};

export default DeepFinancialTable;
