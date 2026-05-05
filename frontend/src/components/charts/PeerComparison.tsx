import React, { useState, useEffect } from 'react';
import { Card, Tabs, Typography, Tag, Row, Col, Statistic, Spin, Alert } from 'antd';
import ReactECharts from 'echarts-for-react';
import type { PeerCompany } from '../../types/stock';
import { getPeerCompanies } from '../../api/stockApi';

const { Text } = Typography;

interface PeerComparisonProps {
  title?: string;
  symbol?: string;
  companies?: PeerCompany[];
}

// 默认数据 - 以白酒行业可比公司
const defaultPeerCompanies: PeerCompany[] = [
  { name: '贵州茅台', marketCap: 18500, peRatio: 28.5, pbRatio: 6.4, isTarget: true },
  { name: '五粮液', marketCap: 5200, peRatio: 20.5, pbRatio: 2.9, isTarget: false },
  { name: '山西汾酒', marketCap: 2800, peRatio: 22.3, pbRatio: 3.9, isTarget: false },
  { name: '泸州老窖', marketCap: 3500, peRatio: 23.2, pbRatio: 2.9, isTarget: false },
  { name: '酒鬼酒', marketCap: 480, peRatio: 32.1, pbRatio: 3.7, isTarget: false },
  { name: '水井坊', marketCap: 320, peRatio: 25.8, pbRatio: 3.0, isTarget: false },
  { name: '舍得酒业', marketCap: 520, peRatio: 26.5, pbRatio: 2.6, isTarget: false },
  { name: '迎驾贡酒', marketCap: 620, peRatio: 21.8, pbRatio: 2.7, isTarget: false },
  { name: '今世缘', marketCap: 720, peRatio: 19.2, pbRatio: 2.4, isTarget: false }
];

const PeerComparison: React.FC<PeerComparisonProps> = ({
  title = '可比公司对比',
  symbol,
  companies
}) => {
  const [peerCompanies, setPeerCompanies] = useState<PeerCompany[]>(companies && companies.length > 0 ? companies : defaultPeerCompanies);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('marketCap');

  // 如果有companies数据，直接使用，不调用API
  const hasCompaniesData = companies && companies.length > 0;

  // 从API获取可比公司数据（仅当没有提供companies时）
  useEffect(() => {
    if (symbol && !hasCompaniesData) {
      const fetchPeerCompanies = async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await getPeerCompanies(symbol);
          setPeerCompanies(response.companies);
        } catch (err) {
          console.error('获取可比公司失败:', err);
          setError('获取可比公司失败，使用默认数据');
          setPeerCompanies(defaultPeerCompanies);
        } finally {
          setLoading(false);
        }
      };
      fetchPeerCompanies();
    }
  }, [symbol, hasCompaniesData]);

  // 计算中位数
  const calculateMedian = (data: number[]): number => {
    const sorted = [...data].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  const getChartOption = (type: 'marketCap' | 'peRatio' | 'pbRatio') => {
    // 按数值大小降序排序，最长的在最上面
    const sortedCompanies = [...peerCompanies].sort((a, b) => {
      return b[type] - a[type];
    });

    const data = sortedCompanies.map(c => ({
      name: c.name,
      value: c[type],
      isTarget: c.isTarget
    }));

    const getYAxisLabel = () => {
      switch (type) {
        case 'marketCap': return '总市值 (亿)';
        case 'peRatio': return '市盈率 (倍)';
        case 'pbRatio': return '市净率 (倍)';
        default: return '';
      }
    };

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        formatter: (params: any) => {
          const data = params[0];
          let result = `${data.name}<br/>`;
          switch (type) {
            case 'marketCap':
              result += `总市值: ${data.value}亿`;
              break;
            case 'peRatio':
              result += `市盈率: ${data.value}倍`;
              break;
            case 'pbRatio':
              result += `市净率: ${data.value}倍`;
              break;
          }
          return result;
        }
      },
      grid: {
        left: '15%',
        right: '10%',
        top: '3%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        name: getYAxisLabel(),
        axisLabel: {
          fontSize: 11
        }
      },
      yAxis: {
        type: 'category',
        data: data.map(d => d.name),
        axisLabel: {
          fontSize: 11,
          width: 80,
          overflow: 'truncate'
        }
      },
      series: [{
        name: type === 'marketCap' ? '总市值' : type === 'peRatio' ? '市盈率' : '市净率',
        type: 'bar',
        data: data.map(d => ({
          value: d.value,
          itemStyle: {
            color: d.isTarget ? '#faad14' : '#73c0de',
            borderRadius: [0, 4, 4, 0]
          }
        })),
        barWidth: '40%',
        label: {
          show: true,
          position: 'right',
          formatter: (params: any) => {
            switch (type) {
              case 'marketCap':
                return `${params.value}`;
              case 'peRatio':
              case 'pbRatio':
                return `${params.value.toFixed(2)}`;
              default:
                return '';
            }
          }
        }
      }]
    };
  };

  const getMedian = () => {
    switch (activeTab) {
      case 'marketCap':
        return calculateMedian(peerCompanies.map(c => c.marketCap));
      case 'peRatio':
        return calculateMedian(peerCompanies.map(c => c.peRatio));
      case 'pbRatio':
        return calculateMedian(peerCompanies.map(c => c.pbRatio));
      default:
        return 0;
    }
  };

  const tabItems = [
    {
      key: 'marketCap',
      label: '总市值',
      children: (
        <ReactECharts
          option={getChartOption('marketCap')}
          style={{ height: 500 }}
        />
      )
    },
    {
      key: 'peRatio',
      label: '市盈率',
      children: (
        <ReactECharts
          option={getChartOption('peRatio')}
          style={{ height: 500 }}
        />
      )
    },
    {
      key: 'pbRatio',
      label: '市净率',
      children: (
        <ReactECharts
          option={getChartOption('pbRatio')}
          style={{ height: 500 }}
        />
      )
    }
  ];

  return (
    <Card title={title} style={{ marginBottom: 16 }}>
      {error && !hasCompaniesData && (
        <Alert
          message={error}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Spin spinning={loading && !hasCompaniesData}>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Statistic
              title="中位数"
              value={getMedian()}
              precision={activeTab === 'marketCap' ? 0 : 2}
              suffix={activeTab === 'marketCap' ? '亿' : '倍'}
              valueStyle={{ color: '#667eea' }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="样本数"
              value={peerCompanies.length}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col span={8}>
            <div style={{ paddingTop: 5 }}>
              <Text strong style={{ fontSize: 13 }}>图例：</Text>
              <Tag color="gold" style={{ marginLeft: 8 }}>目标公司</Tag>
              <Tag color="blue" style={{ marginLeft: 8 }}>可比公司</Tag>
            </div>
          </Col>
        </Row>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          type="card"
        />

        <div style={{ marginTop: 16, padding: 12, background: 'var(--bg-elevated)', borderRadius: 4 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            注：市值数据为截止上一交易日并已进行货币转换(单位：人民币)
          </Text>
        </div>
      </Spin>
    </Card>
  );
};

export default PeerComparison;
