import React from 'react';
import { Card, Table, Tabs, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';

const { Text } = Typography;

interface FinancialIndicator {
  [key: string]: any;
}

interface BalanceSheet {
  [key: string]: any;
}

interface Cashflow {
  [key: string]: any;
}

interface DeepFinancialTableProps {
  financialIndicators: FinancialIndicator[];
  balanceSheet: BalanceSheet[];
  cashflow: Cashflow[];
}

const DeepFinancialTable: React.FC<DeepFinancialTableProps> = ({
  financialIndicators,
  balanceSheet,
  cashflow
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
        <Text style={{ color: value > 15 ? '#3f8600' : value < 5 ? '#cf1322' : undefined }}>
          {value?.toFixed(2) ?? 'N/A'}
        </Text>
      )
    },
    {
      title: '营收(亿)',
      dataIndex: '营业总收入(元)',
      key: 'revenue',
      width: 120,
      render: (value: number) => value ? (value / 1e8).toFixed(2) : 'N/A'
    },
    {
      title: '净利润(亿)',
      dataIndex: '净利润(元)',
      key: 'profit',
      width: 120,
      render: (value: number) => value ? (value / 1e8).toFixed(2) : 'N/A'
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
        <Text style={{ color: value > 70 ? '#cf1322' : undefined }}>
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
        <Text style={{ color: value > 0 ? '#3f8600' : '#cf1322' }}>
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
        <Text style={{ color: value > 0 ? '#3f8600' : '#cf1322' }}>
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
        <Text style={{ color: value > 0 ? '#3f8600' : '#cf1322' }}>
          {value ? (value / 1e8).toFixed(2) : 'N/A'}
        </Text>
      )
    },
    {
      title: '现金净增加额(亿)',
      dataIndex: 'net_increase_in_cash',
      key: 'netCashIncrease',
      width: 160,
      render: (value: number) => (
        <Text style={{ color: value > 0 ? '#3f8600' : '#cf1322' }}>
          {value ? (value / 1e8).toFixed(2) : 'N/A'}
        </Text>
      )
    }
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
    }
  ];

  return (
    <Card title="💹 财务数据分析" style={{ marginBottom: 24 }}>
      <Tabs defaultActiveKey="1" items={items} />
      <div style={{ marginTop: 16, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          💡 提示：ROE {'>'} 15% 为优秀，资产负债率 {'>'} 70% 需警惕，经营现金流为正表示健康
        </Text>
      </div>
    </Card>
  );
};

export default DeepFinancialTable;
