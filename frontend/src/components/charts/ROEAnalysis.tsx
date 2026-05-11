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
  '资产总额(元)'?: number;
  '所有者权益合计(元)'?: number;
  '日期'?: string;
  [key: string]: any;
}

interface ROEAnalysisProps {
  title?: string;
  financialIndicators?: FinancialIndicator[];
}

const formatNum = (num: number) => {
  if (Math.abs(num) >= 1e8) return (num / 1e8).toFixed(1) + '亿';
  if (Math.abs(num) >= 1e4) return (num / 1e4).toFixed(1) + '万';
  return num.toFixed(1);
};

// 判断是否为年报数据（12-31）
const isAnnualReport = (dateStr: string): boolean => {
  return dateStr.includes('12-31') || dateStr.endsWith('-12-31');
};

// 提取年份
const extractYear = (dateStr: string): string => {
  return dateStr.slice(0, 4);
};

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

  // 处理数据：提取所有有ROE的数据，按日期排序（最新的在前）
  const allRoeData = financialIndicators
    .map(item => ({
      period: item['报告期'] || item['日期'] || '-',
      roe: item['净资产收益率(%)'] != null ? Number(item['净资产收益率(%)']) : null,
      revenue: item['营业总收入(元)'],
      netProfit: item['净利润(元)'],
      totalAssets: item['资产总额(元)'],
      totalEquity: item['所有者权益合计(元)'],
    }))
    .filter(item => item.roe != null)
    .sort((a, b) => new Date(b.period).getTime() - new Date(a.period).getTime());

  // 筛选年报数据（用于趋势图和杜邦分析）
  const annualRoeData = allRoeData.filter(item => isAnnualReport(item.period));
  
  // 用于趋势图的数据（年报数据，按时间正序排列）
  const trendData = [...annualRoeData].reverse();

  // 最新一期数据
  const latestData = allRoeData[0];
  const latestROE = latestData?.roe ?? null;
  
  // 上一年年报数据（用于对比）
  const lastAnnualData = annualRoeData.find(item => 
    extractYear(item.period) === String(Number(extractYear(latestData?.period || '')) - 1)
  );
  const previousROE = lastAnnualData?.roe ?? null;

  // 用于杜邦分析的数据（优先使用最新年报，否则使用最新数据）
  const dupontData = annualRoeData[0] || latestData;

  const getROEStatus = (roe: number | null) => {
    if (roe == null) return { color: '#8c8c8c', status: '未知', icon: <MinusOutlined /> };
    if (roe >= 15) return { color: '#52c41a', status: '优秀', icon: <ArrowUpOutlined /> };
    if (roe >= 10) return { color: '#1890ff', status: '良好', icon: <ArrowUpOutlined /> };
    if (roe >= 5) return { color: '#faad14', status: '一般', icon: <MinusOutlined /> };
    return { color: '#ff4d4f', status: '较差', icon: <ArrowDownOutlined /> };
  };

  const roeStatus = getROEStatus(latestROE);
  const prevRoeStatus = getROEStatus(previousROE);

  // 杜邦分析计算（使用年报数据）
  const netProfit = dupontData ? Number(dupontData.netProfit || 0) : 0;
  const totalRevenue = dupontData ? Number(dupontData.revenue || 0) : 0;
  const totalAssets = dupontData ? Number(dupontData.totalAssets || 0) : 0;
  const totalEquity = dupontData ? Number(dupontData.totalEquity || 0) : 0;

  const netProfitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
  const assetTurnover = totalAssets > 0 ? totalRevenue / totalAssets : 0;
  const equityMultiplier = totalEquity > 0 ? totalAssets / totalEquity : 0;
  const dupontROE = netProfitMargin * assetTurnover * equityMultiplier;

  const hasDuPontData = totalRevenue > 0 && totalAssets > 0 && totalEquity > 0;

  // 趋势图配置（使用年报数据）
  const trendChartOption = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const data = params[0];
        return `${data.name}年报<br/>ROE: ${data.value.toFixed(2)}%`;
      },
    },
    xAxis: {
      type: 'category',
      data: trendData.map(item => extractYear(item.period)),
      axisLabel: {
        rotate: 0,
        fontSize: 11,
      },
      name: '年度',
      nameLocation: 'end',
      nameTextStyle: {
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
        data: trendData.map(item => item.roe),
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
      bottom: '10%',
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
          <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 4 }}>
            {latestData?.period || '-'}
          </div>
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
            title="上年年报ROE"
            value={previousROE ?? 0}
            precision={2}
            suffix="%"
            valueStyle={{ color: prevRoeStatus.color }}
            prefix={prevRoeStatus.icon}
          />
          <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 4 }}>
            {lastAnnualData?.period || '-'}
          </div>
        </Col>
        <Col xs={12} sm={6}>
          <Statistic
            title="年报期数"
            value={annualRoeData.length}
            suffix="期"
          />
        </Col>
      </Row>

      <Alert
        message="ROE解读"
        description={
          latestROE != null ? (
            latestROE >= 15
              ? "ROE保持在15%以上，说明公司盈利能力优秀，股东回报率高，具备长期投资价值"
              : latestROE >= 10
                ? "ROE在10%-15%之间，公司盈利能力良好，高于市场平均水平"
                : latestROE >= 5
                  ? "ROE在5%-10%之间，盈利能力一般，需关注公司经营改善情况"
                  : "ROE低于5%，盈利能力较弱，建议深入分析公司基本面"
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

      {trendData.length > 0 && (
        <Card size="small" title="ROE年化趋势" style={{ marginBottom: 16 }}>
          <ReactECharts
            option={trendChartOption}
            style={{ height: 300 }}
            notMerge={true}
          />
          <div style={{ marginTop: 8, textAlign: 'center', fontSize: 11, color: '#8c8c8c' }}>
            注：趋势图仅展示年报数据（12-31），用于年度间比较
          </div>
        </Card>
      )}

      {hasDuPontData && (
        <Card size="small" title={`ROE拆解（杜邦分析）- ${extractYear(dupontData.period)}年报`} style={{ marginBottom: 16 }}>
          <div style={{ textAlign: 'center', marginBottom: 16, padding: 12, background: 'rgba(47, 84, 235, 0.05)', borderRadius: 8 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#2f54eb' }}>{dupontROE.toFixed(1)}%</div>
            <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 4 }}>净资产收益率(ROE) = 销售净利率 × 总资产周转率 × 权益乘数</div>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 120px', minWidth: 100, padding: 12, background: 'rgba(24, 144, 255, 0.05)', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#1890ff', marginBottom: 4 }}>{netProfitMargin.toFixed(1)}%</div>
              <div style={{ fontSize: 11, color: '#8c8c8c' }}>销售净利率</div>
              <div style={{ fontSize: 10, color: '#8c8c8c', marginTop: 4 }}>净利润/营收</div>
            </div>
            <div style={{ color: '#8c8c8c', fontSize: 20, fontWeight: 700 }}>×</div>
            <div style={{ flex: '1 1 120px', minWidth: 100, padding: 12, background: 'rgba(82, 196, 106, 0.05)', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#52c41a', marginBottom: 4 }}>{assetTurnover.toFixed(2)}</div>
              <div style={{ fontSize: 11, color: '#8c8c8c' }}>总资产周转率</div>
              <div style={{ fontSize: 10, color: '#8c8c8c', marginTop: 4 }}>营收/总资产</div>
            </div>
            <div style={{ color: '#8c8c8c', fontSize: 20, fontWeight: 700 }}>×</div>
            <div style={{ flex: '1 1 120px', minWidth: 100, padding: 12, background: 'rgba(250, 173, 20, 0.05)', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#faad14', marginBottom: 4 }}>{equityMultiplier.toFixed(2)}</div>
              <div style={{ fontSize: 11, color: '#8c8c8c' }}>权益乘数</div>
              <div style={{ fontSize: 10, color: '#8c8c8c', marginTop: 4 }}>总资产/净资产</div>
            </div>
          </div>

          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
            <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#8c8c8c', flexWrap: 'wrap', justifyContent: 'center' }}>
              <div>营收: {formatNum(totalRevenue)}</div>
              <div>净利润: {formatNum(netProfit)}</div>
              <div>总资产: {formatNum(totalAssets)}</div>
              <div>净资产: {formatNum(totalEquity)}</div>
            </div>
          </div>
        </Card>
      )}

      <Card size="small" title="历史数据">
        <Table
          columns={tableColumns}
          dataSource={allRoeData.map((item, index) => ({ ...item, key: index }))}
          pagination={{ pageSize: 5 }}
          size="small"
        />
      </Card>
    </Card>
  );
};

export default ROEAnalysis;
