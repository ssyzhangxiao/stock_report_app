import React from 'react';
import { Card, Row, Col, Progress, Tag, Typography } from 'antd';
import { WarningOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { riskItems, calculateOverallScore, getRiskLevelColor, RiskItem } from '../../utils/riskScoreData';

const { Text } = Typography;

interface RiskDashboardProps {
  title?: string;
}

const RiskDashboard: React.FC<RiskDashboardProps> = ({ title = '风险仪表盘' }) => {
  const overallScore = calculateOverallScore();

  const getRiskIcon = (level: RiskItem['level']) => {
    switch (level) {
      case 'low': return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'medium': return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
      case 'high': return <WarningOutlined style={{ color: '#ff7a45' }} />;
      case 'critical': return <WarningOutlined style={{ color: '#ff4d4f' }} />;
      default: return null;
    }
  };

  const getRiskLabel = (level: RiskItem['level']) => {
    switch (level) {
      case 'low': return '低风险';
      case 'medium': return '中风险';
      case 'high': return '高风险';
      case 'critical': return '极高风险';
      default: return '未知';
    }
  };

  // 显示前4个风险指标
  const displayMetrics = riskItems.slice(0, 4);

  // 仪表盘配置
  const gaugeOption = {
    series: [{
      type: 'gauge',
      startAngle: 180,
      endAngle: 0,
      min: 0,
      max: 100,
      splitNumber: 10,
      itemStyle: {
        color: overallScore <= 30 ? '#52c41a' : overallScore <= 50 ? '#faad14' : overallScore <= 70 ? '#ff7a45' : '#ff4d4f'
      },
      progress: {
        show: true,
        width: 18
      },
      pointer: {
        show: true,
        length: '60%',
        width: 5
      },
      axisLine: {
        lineStyle: {
          width: 18
        }
      },
      axisTick: {
        show: false
      },
      splitLine: {
        length: 15,
        lineStyle: {
          width: 2,
          color: '#999'
        }
      },
      axisLabel: {
        distance: 25,
        color: '#999',
        fontSize: 12
      },
      anchor: {
        show: true,
        showAbove: true,
        size: 20,
        itemStyle: {
          borderWidth: 5
        }
      },
      title: {
        show: true,
        offsetCenter: [0, '70%'],
        fontSize: 14
      },
      detail: {
        valueAnimation: true,
        fontSize: 30,
        offsetCenter: [0, '40%'],
        formatter: (value: number) => `${value}/100`
      },
      data: [{
        value: overallScore,
        name: '整体风险评分'
      }]
    }]
  };

  return (
    <Card title={title} style={{ marginBottom: 16 }}>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <ReactECharts option={gaugeOption} style={{ height: 200 }} />
        </Col>
        <Col span={16}>
          <div style={{ padding: '20px 0' }}>
            <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 12 }}>
              风险评估摘要
            </Text>
            <div style={{ marginBottom: 8 }}>
              <Tag color={overallScore <= 30 ? 'green' : overallScore <= 50 ? 'orange' : overallScore <= 70 ? 'volcano' : 'red'}>
                {overallScore <= 30 ? '低风险' : overallScore <= 50 ? '中等风险' : overallScore <= 70 ? '较高风险' : '高风险'}
              </Tag>
            </div>
            <Text type="secondary">
              {overallScore <= 30
                ? '整体风险可控，可以正常投资'
                : overallScore <= 50
                  ? '存在一定风险，建议谨慎投资'
                  : overallScore <= 70
                    ? '风险较高，建议严格风控'
                    : '风险极高，建议回避'}
            </Text>
          </div>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {displayMetrics.map((metric, index) => (
          <Col span={6} key={index}>
            <Card
              size="small"
              style={{
                textAlign: 'center',
                borderColor: getRiskLevelColor(metric.level),
                borderWidth: 2
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 8 }}>
                {getRiskIcon(metric.level)}
              </div>
              <Text strong style={{ display: 'block', marginBottom: 4 }}>
                {metric.name}
              </Text>
              <Progress
                percent={metric.score}
                strokeColor={getRiskLevelColor(metric.level)}
                showInfo={false}
                style={{ marginBottom: 8 }}
              />
              <Tag color={metric.level}>
                {getRiskLabel(metric.level)} ({metric.score}/100)
              </Tag>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
                {metric.description}
              </Text>
            </Card>
          </Col>
        ))}
      </Row>
    </Card>
  );
};

export default RiskDashboard;
