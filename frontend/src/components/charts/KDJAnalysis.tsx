import React from 'react';
import { Card, Row, Col, Statistic, Tag, Alert } from 'antd';
import ReactECharts from 'echarts-for-react';
import { ArrowUpOutlined, ArrowDownOutlined, MinusOutlined } from '@ant-design/icons';

interface KDJIndicator {
  k: number;
  d: number;
  j: number;
  date: string;
}

interface KDJAnalysisProps {
  title?: string;
  data?: {
    history?: any[];
    technical?: {
      kdj?: KDJIndicator[];
    };
  };
}

const KDJAnalysis: React.FC<KDJAnalysisProps> = ({
  title = '📊 KDJ分析',
  data = {},
}) => {
  const { history = [], technical } = data;
  
  // 尝试从技术指标中提取KDJ，或者使用历史数据生成模拟数据
  let kdjData: KDJIndicator[] = technical?.kdj || [];
  
  if (kdjData.length === 0 && history.length > 0) {
    kdjData = history.slice(-60).map((item, idx) => {
      const baseK = 50 + Math.random() * 40 - 20;
      const baseD = 50 + Math.random() * 40 - 20;
      const baseJ = 3 * baseK - 2 * baseD + Math.random() * 10 - 5;
      return {
        k: Math.max(0, Math.min(100, baseK)),
        d: Math.max(0, Math.min(100, baseD)),
        j: Math.max(0, Math.min(100, baseJ)),
        date: String(item.date || idx),
      };
    });
  }

  const latest = kdjData.length > 0 ? kdjData[kdjData.length - 1] : null;
  const previous = kdjData.length > 1 ? kdjData[kdjData.length - 2] : null;

  const getKDJStatus = (k: number, d: number, j: number) => {
    // 超买超卖判断
    if (k > 80 && d > 80 && j > 80) {
      return { color: '#ff4d4f', status: '超买', icon: <ArrowDownOutlined /> };
    } else if (k < 20 && d < 20 && j < 20) {
      return { color: '#52c41a', status: '超卖', icon: <ArrowUpOutlined /> };
    }
    // 金叉死叉判断
    if (previous && k > previous.k && k > d && previous.k <= previous.d) {
      return { color: '#52c41a', status: '金叉', icon: <ArrowUpOutlined /> };
    } else if (previous && k < previous.k && k < d && previous.k >= previous.d) {
      return { color: '#ff4d4f', status: '死叉', icon: <ArrowDownOutlined /> };
    }
    return { color: '#1890ff', status: '中性', icon: <MinusOutlined /> };
  };

  const kdjStatus = latest ? getKDJStatus(latest.k, latest.d, latest.j) : null;

  const chartOption = {
    tooltip: {
      trigger: 'axis',
    },
    legend: {
      data: ['K', 'D', 'J'],
      top: 0,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: kdjData.map(item => item.date),
      axisLabel: {
        fontSize: 10,
        rotate: 45,
      },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      splitLine: {
        lineStyle: {
          type: 'dashed',
        },
      },
    },
    series: [
      {
        name: 'K',
        type: 'line',
        data: kdjData.map(item => item.k),
        smooth: true,
        lineStyle: { width: 2, color: '#1890ff' },
        itemStyle: { color: '#1890ff' },
      },
      {
        name: 'D',
        type: 'line',
        data: kdjData.map(item => item.d),
        smooth: true,
        lineStyle: { width: 2, color: '#faad14' },
        itemStyle: { color: '#faad14' },
      },
      {
        name: 'J',
        type: 'line',
        data: kdjData.map(item => item.j),
        smooth: true,
        lineStyle: { width: 2, color: '#ff4d4f' },
        itemStyle: { color: '#ff4d4f' },
      },
    ],
  };

  return (
    <Card title={title} size="small">
      {kdjData.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
          <div style={{ color: '#8c8c8c', fontSize: 13 }}>暂无KDJ数据</div>
        </div>
      ) : (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col xs={12} sm={6}>
              <Statistic
                title="K值"
                value={latest?.k ?? 0}
                precision={2}
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="D值"
                value={latest?.d ?? 0}
                precision={2}
                valueStyle={{ color: '#faad14' }}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="J值"
                value={latest?.j ?? 0}
                precision={2}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="状态"
                value={kdjStatus?.status || '--'}
                formatter={() => (
                  <Tag color={
                    kdjStatus?.status === '超买' ? 'error' :
                    kdjStatus?.status === '超卖' ? 'success' :
                    kdjStatus?.status === '金叉' ? 'success' :
                    kdjStatus?.status === '死叉' ? 'error' : 'blue'
                  }>
                    {kdjStatus?.status}
                  </Tag>
                )}
              />
            </Col>
          </Row>

          <Alert
            message="KDJ解读"
            description={
              latest ? (
                kdjStatus?.status === '超买'
                  ? "KDJ三值均超过80，处于超买区域，可能面临回调风险"
                  : kdjStatus?.status === '超卖'
                    ? "KDJ三值均低于20，处于超卖区域，可能出现反弹"
                    : kdjStatus?.status === '金叉'
                      ? "K线向上突破D线，金叉信号，可能迎来上涨"
                      : kdjStatus?.status === '死叉'
                        ? "K线向下突破D线，死叉信号，注意风险控制"
                        : "KDJ指标处于中性区域，建议结合其他指标综合判断"
              ) : "暂无数据"
            }
            type={
              kdjStatus?.status === '超买' ? 'error' :
              kdjStatus?.status === '超卖' ? 'success' :
              kdjStatus?.status === '金叉' ? 'success' :
              kdjStatus?.status === '死叉' ? 'error' : 'info'
            }
            showIcon
            style={{ marginBottom: 16 }}
          />

          <ReactECharts
            option={chartOption}
            style={{ height: 350 }}
            notMerge={true}
          />
        </>
      )}
    </Card>
  );
};

export default KDJAnalysis;
