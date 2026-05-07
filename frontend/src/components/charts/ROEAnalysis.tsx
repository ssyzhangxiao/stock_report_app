import React from 'react';
import { Card, Row, Col, Statistic, Alert, Table, Tag } from 'antd';
import ReactECharts from 'echarts-for-react';
import { ArrowUpOutlined, ArrowDownOutlined, MinusOutlined } from '@ant-design/icons';

interface FinancialIndicator {
  '营业总收入(元)'?: number;
  '净利润(元)'?: number;
  '净资产收益率(%)'?: number;
  '资产负债率'?: number;
  '销售毛利率(%)'?: number;
  '报告期'?: string;
  [key: string]: any;
}

interface ROEAnalysisProps {
  title?: string;
  financialIndicators?: FinancialIndicator[];
}

const ROEAnalysis: React.FC<ROEAnalysisProps> = ({
  title = '📈 净资产收益率(ROE)分析',
  financialIndicators = [],
}) => {
  if (!financialIndicators || financialIndicators.length === 0) {
    return (
      <Card title={title} size="small">
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
          <div style={{ color: '#8c8c8c', fontSize: 13 }}>暂无ROE数据</div>
        </div>
      </Card>
    );
  }

  // 提取ROE数据，按时间排序
  const roeData = financialIndicators
    .map(item => ({
      period: item['报告期'] || '-',
      roe: item['净资产收益率(%)'] != null ? Number(item['净资产收益率(%)']) : null,
      revenue: item['营业总收入(元)'],
      netProfit: item['净利润(元)'],
    }))
    .filter(item => item.roe != null)
    .reverse(); // 从旧到新

  const latestROE = roeData.length > 0 ? roeData[roeData.length - 1].roe : null;
  const previousROE = roeData.length > 1 ? roeData[roeData.length - 2].roe : null;

  const getROEStatus = (roe: number | null) => {
    if (roe == null) return { color: '#8c8c8c', status: '未知', icon: <MinusOutlined /> };
    if (roe >= 15) return { color: '#52c41a', status: '优秀', icon: <ArrowUpOutlined /> };
    if (roe >= 10) return { color: '#1890ff', status: '良好', icon: <ArrowUpOutlined /> };
    if (roe >= 5) return { color: '#faad14', status: '一般', icon: <MinusOutlined /> };
    return { color: '#ff4d4f', status: '较差', icon: <ArrowDownOutlined /> };
  };

  const roeStatus = getROEStatus(latestROE);
  const prevRoeStatus = getROEStatus(previousROE);

  const trendChartOption = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const data = params[0];
        return `${data.name}<br/>ROE: ${data.value.toFixed(2)}%`;
      },
    },
    xAxis: {
      type: 'category',
      data: roeData.map(item => item.period),
      axisLabel: {
        rotate: 45,
        fontSize: 10,
      },
    },
    yAxis: {
      type: 'value',
      name: 'ROE(%)',
      splitLine: {
        lineStyle: {
          type: 'dashed',
        },
      },
    },
    series: [
      {
        name: 'ROE',
        type: 'line',
        data: roeData.map(item => item.roe),
        smooth: true,
        lineStyle: {
          width: 3,
          color: '#1890ff',
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(24, 144, 255, 0.3)' },
              { offset: 1, color: 'rgba(24, 144, 255, 0.05)' },
            ],
          },
        },
        markLine: {
          data: [
            { yAxis: 15, name: '优秀线' },
            { yAxis: 10, name: '良好线' },
            { yAxis: 5, name: '警戒线' },
          ],
          lineStyle: {
            type: 'dashed',
          },
          label: {
            fontSize: 10,
          },
        },
      },
    ],
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '10%',
      containLabel: true,
    },
  };

  const tableColumns = [
    {
      title: '报告期',
      dataIndex: 'period',
      key: 'period',
    },
    {
      title: 'ROE(%)',
      dataIndex: 'roe',
      key: 'roe',
      render: (value: number) => {
        const status = getROEStatus(value);
        return (
          <span style={{ color: status.color, fontWeight: 'bold' }}>
            {value.toFixed(2)}%
          </span>
        );
      },
    },
    {
      title: '评级',
      dataIndex: 'roe',
      key: 'rating',
      render: (value: number) => {
        const status = getROEStatus(value);
        const tagColor = status.status === '优秀' ? 'success' :
          status.status === '良好' ? 'blue' :
            status.status === '一般' ? 'warning' : 'error';
        return <Tag color={tagColor}>{status.status}</Tag>;
      },
    },
  ];

  return (
    <Card title={title} size="small">
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Statistic
            title="最新ROE"
            value={latestROE ?? 0}
            precision={2}
            suffix="%"
            valueStyle={{ color: roeStatus.color }}
            prefix={roeStatus.icon}
          />
        </Col>
        <Col xs={12} sm={6}>
          <Statistic
            title="评级"
            value={roeStatus.status}
            formatter={() => (
              <Tag color={
                roeStatus.status === '优秀' ? 'success' :
                  roeStatus.status === '良好' ? 'blue' :
                    roeStatus.status === '一般' ? 'warning' : 'error'
              }>
                {roeStatus.status}
              </Tag>
            )}
          />
        </Col>
        <Col xs={12} sm={6}>
          <Statistic
            title="上期ROE"
            value={previousROE ?? 0}
            precision={2}
            suffix="%"
            valueStyle={{ color: prevRoeStatus.color }}
            prefix={prevRoeStatus.icon}
          />
        </Col>
        <Col xs={12} sm={6}>
          <Statistic
            title="数据期数"
            value={roeData.length}
            suffix="期"
          />
        </Col>
      </Row>

      <Alert
        message="ROE解读"
        description={
          latestROE != null ? (
            latestROE >= 15
              ? "ROE连续保持在15%以上，说明公司盈利能力优秀，股东回报率高"
              : latestROE >= 10
                ? "ROE在10%-15%之间，公司盈利能力良好"
                : latestROE >= 5
                  ? "ROE在5%-10%之间，需要关注公司盈利能力变化"
                  : "ROE低于5%，建议深入分析公司盈利能力下降原因"
          ) : "暂无数据"
        }
        type={
          latestROE != null ? (
            latestROE >= 15 ? "success" :
              latestROE >= 10 ? "info" :
                latestROE >= 5 ? "warning" : "error"
          ) : "info"
        }
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Card size="small" title="ROE趋势图" style={{ marginBottom: 16 }}>
        <ReactECharts
          option={trendChartOption}
          style={{ height: 300 }}
          notMerge={true}
        />
      </Card>

      <Card size="small" title="历史数据">
        <Table
          columns={tableColumns}
          dataSource={roeData.map((item, index) => ({ ...item, key: index }))}
          pagination={{ pageSize: 5 }}
          size="small"
        />
      </Card>
    </Card>
  );
};

export default ROEAnalysis;
