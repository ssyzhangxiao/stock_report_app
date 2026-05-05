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
          dataSource={financialIndicators}
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
          dataSource={balanceSheet}
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
          dataSource={cashflow}
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
          dataSource={incomeStatement || []}
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
    const fi = financialIndicators as any[];
    if (!fi || fi.length < 2) return null;

    // 只保留年报数据（12-31）
    const annualData = fi.filter(r => {
      const dateStr = String(r['日期'] || '');
      return dateStr.includes('12-31');
    });

    if (annualData.length < 2) {
      // 如果年报数据不足，回退到原始数据
      const dates = fi.map(r => String(r['日期'] || '').slice(0, 7)).reverse();
      const revs = fi.map(r => { const v = r['营业总收入(元)']; return v ? +(v / 1e8).toFixed(1) : 0; }).reverse();
      const profs = fi.map(r => { const v = r['净利润(元)']; return v ? +(v / 1e8).toFixed(1) : 0; }).reverse();
      const roes = fi.map(r => { const v = r['净资产收益率(%)']; return v ? +v.toFixed(1) : 0; }).reverse();

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
          { type: 'bar' as const, data: revs, name: '营收', barWidth: '30%', itemStyle: { color: '#1890ff', borderRadius: [2, 2, 0, 0] } },
          { type: 'bar' as const, data: profs, name: '净利', barWidth: '30%', itemStyle: { color: '#52c41a', borderRadius: [2, 2, 0, 0] } },
          { type: 'line' as const, data: roes, name: 'ROE', yAxisIndex: 1, smooth: true, lineStyle: { width: 2, color: '#2f54eb' }, symbol: 'diamond', symbolSize: 6, itemStyle: { color: '#2f54eb' }, areaStyle: { color: 'rgba(47,84,235,0.08)' } },
        ],
      };
    }

    // 使用年报数据
    const dates = annualData.map(r => String(r['日期'] || '').slice(0, 4)).reverse();
    const revs = annualData.map(r => { const v = r['营业总收入(元)']; return v ? +(v / 1e8).toFixed(1) : 0; }).reverse();
    const profs = annualData.map(r => { const v = r['净利润(元)']; return v ? +(v / 1e8).toFixed(1) : 0; }).reverse();
    const roes = annualData.map(r => { const v = r['净资产收益率(%)']; return v ? +v.toFixed(1) : 0; }).reverse();

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
        { type: 'bar' as const, data: revs, name: '营收', barWidth: '30%', itemStyle: { color: '#1890ff', borderRadius: [2, 2, 0, 0] } },
        { type: 'bar' as const, data: profs, name: '净利', barWidth: '30%', itemStyle: { color: '#52c41a', borderRadius: [2, 2, 0, 0] } },
        { type: 'line' as const, data: roes, name: 'ROE', yAxisIndex: 1, smooth: true, lineStyle: { width: 2, color: '#2f54eb' }, symbol: 'diamond', symbolSize: 6, itemStyle: { color: '#2f54eb' }, areaStyle: { color: 'rgba(47,84,235,0.08)' } },
      ],
    };
  }, [financialIndicators]);

  return (
    <Card title="💹 财务数据分析" style={{ marginBottom: 6 }} bodyStyle={{ padding: 12 }}>
      {trendChart && (
        <Row gutter={12} style={{ marginBottom: 12 }}>
          <Col span={24}>
            <ReactECharts option={trendChart} style={{ height: 180 }} opts={{ renderer: 'canvas' }} notMerge />
          </Col>
        </Row>
      )}
      <Tabs defaultActiveKey="1" items={items} size="small" />
      <div style={{ marginTop: 12, padding: 10, backgroundColor: 'var(--bg-elevated)', borderRadius: 4 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          💡 提示：图表仅展示年度数据（12-31年报），ROE {'>'} 15% 为优秀，资产负债率 {'>'} 70% 需警惕
        </Text>
      </div>
    </Card>
  );
};

export default DeepFinancialTable;
