import React from 'react';
import { Card, Typography } from 'antd';
import ReactECharts from 'echarts-for-react';
import MarkdownTable from './MarkdownTable';
import type { FinancialSubData } from '../../types/research';

const { Title, Text } = Typography;

interface Props {
  financialData: Record<string, FinancialSubData>;
}

const parseNumericValue = (val: string): number | null => {
  if (!val) return null;
  const cleaned = val.replace(/[,%亿万元x]/g, '').replace(/-/g, '-');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
};

const FinancialDataPanel: React.FC<Props> = ({ financialData }) => {
  if (!financialData || Object.keys(financialData).length === 0) {
    return <Text type="secondary">暂无财务数据</Text>;
  }

  const keyMetrics = financialData.key_metrics;
  const cashflow = financialData.cashflow;
  const peerComparison = financialData.peer_comparison;

  const renderKeyMetricsChart = () => {
    if (!keyMetrics || !keyMetrics.tables || keyMetrics.tables.length === 0) return null;

    const revenueTable = keyMetrics.tables.find(
      t => t.headers.some(h => h.includes('营收') || h.includes('营业总收入'))
    );
    if (!revenueTable) return null;

    const yearColIdx = revenueTable.headers.findIndex(h => h.includes('指标'));
    if (yearColIdx === -1) return null;

    const revenueIdx = revenueTable.headers.findIndex(h => h.includes('营业总收入'));
    const profitIdx = revenueTable.headers.findIndex(h => h.includes('归母净利润'));

    if (revenueIdx === -1 || profitIdx === -1) return null;

    const years: string[] = [];
    const revenues: number[] = [];
    const profits: number[] = [];

    for (const row of revenueTable.rows) {
      const yearVal = row[yearColIdx];
      if (yearVal && (yearVal.includes('202') || yearVal.includes('201'))) {
        years.push(yearVal.replace('年', ''));
        revenues.push(parseNumericValue(row[revenueIdx]) || 0);
        profits.push(parseNumericValue(row[profitIdx]) || 0);
      }
    }

    if (years.length === 0) return null;

    const option = {
      tooltip: { trigger: 'axis' },
      legend: { data: ['营业总收入', '归母净利润'], textStyle: { color: '#8892a4' } },
      grid: { left: 60, right: 30, bottom: 30, top: 40 },
      xAxis: { type: 'category', data: years, axisLabel: { color: '#8892a4' } },
      yAxis: {
        type: 'value',
        name: '亿元',
        axisLabel: { color: '#8892a4' },
        splitLine: { lineStyle: { color: '#2a3347' } },
      },
      series: [
        {
          name: '营业总收入',
          type: 'bar',
          data: revenues,
          itemStyle: { color: '#4da6ff', borderRadius: [4, 4, 0, 0] },
        },
        {
          name: '归母净利润',
          type: 'bar',
          data: profits,
          itemStyle: { color: '#95de64', borderRadius: [4, 4, 0, 0] },
        },
      ],
    };

    return (
      <Card style={{ borderRadius: 10, marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
        <Title level={5}>📈 营收与利润趋势</Title>
        <ReactECharts option={option} style={{ height: 300 }} />
      </Card>
    );
  };

  const renderPeerComparisonChart = () => {
    if (!peerComparison || !peerComparison.tables || peerComparison.tables.length === 0) return null;

    const table = peerComparison.tables[0];
    const nameIdx = table.headers.findIndex(h => h.includes('指标') || h.includes('公司'));
    const peIdx = table.headers.findIndex(h => h.includes('PE'));
    const roeIdx = table.headers.findIndex(h => h.includes('ROE'));

    if (nameIdx === -1 || peIdx === -1) return null;

    const names: string[] = [];
    const peValues: number[] = [];
    const roeValues: number[] = [];

    for (const row of table.rows) {
      const name = row[nameIdx]?.replace(/\*+/g, '').trim();
      if (name) {
        names.push(name);
        peValues.push(parseNumericValue(row[peIdx]) || 0);
        if (roeIdx !== -1) roeValues.push(parseNumericValue(row[roeIdx]) || 0);
      }
    }

    if (names.length === 0) return null;

    const option = {
      tooltip: { trigger: 'axis' },
      legend: {
        data: roeValues.length > 0 ? ['PE(TTM)', 'ROE(%)'] : ['PE(TTM)'],
        textStyle: { color: '#8892a4' },
      },
      grid: { left: 60, right: 30, bottom: 30, top: 40 },
      xAxis: { type: 'category', data: names, axisLabel: { color: '#8892a4', rotate: 15 } },
      yAxis: [
        {
          type: 'value',
          name: 'PE',
          axisLabel: { color: '#8892a4' },
          splitLine: { lineStyle: { color: '#2a3347' } },
        },
        roeValues.length > 0 ? {
          type: 'value',
          name: 'ROE(%)',
          axisLabel: { color: '#8892a4' },
          splitLine: { show: false },
        } : undefined,
      ].filter(Boolean),
      series: [
        {
          name: 'PE(TTM)',
          type: 'bar',
          data: peValues,
          itemStyle: {
            color: (params: any) => params.dataIndex === 0 ? '#4da6ff' : '#5a6a8a',
            borderRadius: [4, 4, 0, 0],
          },
        },
        roeValues.length > 0 ? {
          name: 'ROE(%)',
          type: 'line',
          yAxisIndex: 1,
          data: roeValues,
          lineStyle: { color: '#95de64' },
          itemStyle: { color: '#95de64' },
        } : undefined,
      ].filter(Boolean),
    };

    return (
      <Card style={{ borderRadius: 10, marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
        <Title level={5}>🏢 同业对比</Title>
        <ReactECharts option={option} style={{ height: 300 }} />
      </Card>
    );
  };

  const renderCashflowChart = () => {
    if (!cashflow || !cashflow.tables || cashflow.tables.length === 0) return null;

    const table = cashflow.tables.find(
      t => t.headers.some(h => h.includes('经营') || h.includes('OCF'))
    );
    if (!table) return null;

    const yearIdx = table.headers.findIndex(h => h.includes('指标') || h.includes('项目'));
    if (yearIdx === -1) return null;

    const ocfIdx = table.headers.findIndex(h => h.includes('经营'));
    if (ocfIdx === -1) return null;

    const years: string[] = [];
    const ocfValues: number[] = [];

    for (const row of table.rows) {
      const yearVal = row[yearIdx];
      if (yearVal && (yearVal.includes('202') || yearVal.includes('201'))) {
        years.push(yearVal.replace('年', ''));
        ocfValues.push(parseNumericValue(row[ocfIdx]) || 0);
      }
    }

    if (years.length === 0) return null;

    const option = {
      tooltip: { trigger: 'axis' },
      grid: { left: 60, right: 30, bottom: 30, top: 30 },
      xAxis: { type: 'category', data: years, axisLabel: { color: '#8892a4' } },
      yAxis: {
        type: 'value',
        name: '亿元',
        axisLabel: { color: '#8892a4' },
        splitLine: { lineStyle: { color: '#2a3347' } },
      },
      series: [{
        type: 'bar',
        data: ocfValues.map(v => ({
          value: v,
          itemStyle: { color: v >= 0 ? '#52c41a' : '#ff4d4f', borderRadius: [4, 4, 0, 0] },
        })),
      }],
    };

    return (
      <Card style={{ borderRadius: 10, marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
        <Title level={5}>💰 经营现金流趋势</Title>
        <ReactECharts option={option} style={{ height: 250 }} />
      </Card>
    );
  };

  return (
    <div>
      {renderKeyMetricsChart()}
      {renderPeerComparisonChart()}
      {renderCashflowChart()}

      {keyMetrics && keyMetrics.tables.map((table, idx) => (
        <Card key={`km-${idx}`} style={{ borderRadius: 10, marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
          <MarkdownTable table={table} scrollX={900} />
        </Card>
      ))}

      {cashflow && cashflow.tables.map((table, idx) => (
        <Card key={`cf-${idx}`} style={{ borderRadius: 10, marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
          <MarkdownTable table={table} />
        </Card>
      ))}

      {peerComparison && peerComparison.tables.map((table, idx) => (
        <Card key={`pc-${idx}`} style={{ borderRadius: 10, marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
          <MarkdownTable table={table} />
        </Card>
      ))}
    </div>
  );
};

export default FinancialDataPanel;
