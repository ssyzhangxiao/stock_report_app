import React from 'react';
import { Card, Row, Col, Typography, Progress, Tag, Space, Divider, Alert, Statistic, Descriptions } from 'antd';
import { WarningOutlined, CheckCircleOutlined, InfoCircleOutlined, ExclamationCircleOutlined, BankOutlined, SwapOutlined, AlertOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { riskItems, calculateOverallScore, calculateRiskStats, getRiskLevelColor, getRiskLevelLabel, RiskItem } from '../../utils/riskScoreData';

const { Title, Text } = Typography;

interface RiskScoreCardProps {
  fundFlow?: any[];
}

const RiskScoreCard: React.FC<RiskScoreCardProps> = ({ fundFlow }) => {
  const overallScore = calculateOverallScore();
  const riskStats = calculateRiskStats();

  const getOverallStatus = (score: number) => {
    if (score < 30) return { text: '安全', color: '#52c41a', icon: <CheckCircleOutlined /> };
    if (score < 50) return { text: '关注', color: '#faad14', icon: <InfoCircleOutlined /> };
    if (score < 70) return { text: '警惕', color: '#ff7a45', icon: <WarningOutlined /> };
    return { text: '高风险', color: '#ff4d4f', icon: <WarningOutlined /> };
  };

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

  const overallStatus = getOverallStatus(overallScore);

  // 控制权相关资金数据
  const hasControlData = fundFlow && fundFlow.length > 0;
  const controlData = hasControlData ? fundFlow[0] : null;
  const isAiControlData = controlData?.['数据来源'] === 'AI';

  // ECharts 仪表盘配置
  const gaugeOption = {
    series: [{
      type: 'gauge',
      startAngle: 180,
      endAngle: 0,
      min: 0,
      max: 100,
      splitNumber: 5,
      radius: '90%',
      itemStyle: {
        color: overallScore <= 30 ? '#52c41a' : overallScore <= 50 ? '#faad14' : overallScore <= 70 ? '#ff7a45' : '#ff4d4f'
      },
      progress: {
        show: true,
        width: 15
      },
      pointer: {
        show: true,
        length: '50%',
        width: 4
      },
      axisLine: {
        lineStyle: {
          width: 15
        }
      },
      axisTick: {
        show: false
      },
      splitLine: {
        length: 12,
        lineStyle: {
          width: 2,
          color: '#999'
        }
      },
      axisLabel: {
        distance: 20,
        color: '#999',
        fontSize: 11
      },
      anchor: {
        show: false
      },
      title: {
        show: false
      },
      detail: {
        valueAnimation: true,
        fontSize: 28,
        offsetCenter: [0, '45%'],
        formatter: (value: number) => `${Math.round(value)}/100`
      },
      data: [{
        value: overallScore
      }]
    }]
  };

  // 显示前4个风险指标卡片
  const displayMetrics = riskItems.slice(0, 4);

  return (
    <Card title="📊 综合风险评分卡" style={{ marginBottom: 16 }}>
      <Alert
        message="风险评估说明"
        description="综合评分基于市场、财务、经营、治理等8个维度，0-100分，分数越高风险越高。"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      {/* 第一部分：ECharts仪表盘 + 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={8}>
          <ReactECharts option={gaugeOption} style={{ height: 220 }} />
        </Col>
        <Col xs={24} md={16}>
          <Row gutter={8}>
            <Col xs={12}>
              <Card size="small">
                <Statistic
                  title="低风险维度"
                  value={riskStats.low}
                  prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col xs={12}>
              <Card size="small">
                <Statistic
                  title="中风险维度"
                  value={riskStats.medium}
                  prefix={<InfoCircleOutlined style={{ color: '#faad14' }} />}
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
            <Col xs={12}>
              <Card size="small">
                <Statistic
                  title="高风险维度"
                  value={riskStats.high + riskStats.critical}
                  prefix={<WarningOutlined style={{ color: '#ff7a45' }} />}
                  valueStyle={{ color: '#ff7a45' }}
                />
              </Card>
            </Col>
            <Col xs={12}>
              <Card size="small">
                <Statistic
                  title="评分趋势"
                  value="→"
                  prefix={<InfoCircleOutlined />}
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
          </Row>
          <div style={{ marginTop: 16 }}>
            <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 12 }}>
              风险评估摘要
            </Text>
            <Space>
              {overallStatus.icon}
              <Tag color={overallStatus.color} style={{ fontSize: 14, padding: '4px 12px' }}>
                {overallStatus.text}
              </Tag>
            </Space>
            <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
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

      {/* 新增：前4个风险指标快速卡片（来自 RiskDashboard） */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {displayMetrics.map((metric, index) => (
          <Col xs={12} md={6} key={index}>
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
              <Tag color={getRiskLevelColor(metric.level)}>
                {getRiskLabel(metric.level)} ({metric.score}/100)
              </Tag>
            </Card>
          </Col>
        ))}
      </Row>

      <Divider />

      {/* 第二部分：控制权相关资金分析 */}
      {hasControlData && (
        <>
          <Title level={5}>💰 控制权相关资金分析</Title>
          <Card size="small" style={{ marginBottom: 16, background: 'var(--bg-elevated)' }}>
            {isAiControlData ? (
              <Descriptions column={1} size="small" bordered
                contentStyle={{ background: 'var(--bg-elevated)', fontSize: 12 }}
                labelStyle={{ fontWeight: 600, width: 100, fontSize: 12 }}
              >
                {controlData['大宗交易'] && (
                  <Descriptions.Item label={<><SwapOutlined /> 大宗交易</>}>
                    {controlData['大宗交易']}
                  </Descriptions.Item>
                )}
                {controlData['股东增减持'] && (
                  <Descriptions.Item label={<><BankOutlined /> 股东增减持</>}>
                    {controlData['股东增减持']}
                  </Descriptions.Item>
                )}
                {controlData['交易异动'] && (
                  <Descriptions.Item label={<><AlertOutlined /> 交易异动</>}>
                    {controlData['交易异动']}
                  </Descriptions.Item>
                )}
              </Descriptions>
            ) : (
              <Row gutter={12}>
                <Col span={12}><Text type="secondary" style={{ fontSize: 12 }}>主力净流入</Text><br /><Text strong style={{ color: (controlData['主力净流入'] || 0) >= 0 ? '#cf1322' : '#3f8600', fontSize: 13 }}>{((controlData['主力净流入'] || 0) / 1e8).toFixed(2)}亿</Text></Col>
                <Col span={12}><Text type="secondary" style={{ fontSize: 12 }}>超大单</Text><br /><Text style={{ fontSize: 13 }}>{((controlData['超大单净流入'] || 0) / 1e8).toFixed(2)}亿</Text></Col>
              </Row>
            )}
          </Card>
          <Divider />
        </>
      )}

      {/* 第三部分：各维度风险评分（完整8个） */}
      <Title level={5}>📋 各维度风险评分（完整）</Title>
      <Row gutter={16}>
        {riskItems.map((item, index) => (
          <Col xs={24} md={12} key={index} style={{ marginBottom: 12 }}>
            <Card size="small" style={{ background: 'var(--bg-elevated)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text strong>{item.name}</Text>
                <Tag color={getRiskLevelColor(item.level)}>
                  {getRiskLevelLabel(item.level)}
                </Tag>
              </div>
              <Progress
                percent={item.score}
                strokeColor={getRiskLevelColor(item.level)}
                size="small"
                showInfo={true}
                format={(percent) => `${percent}分`}
              />
              <Text type="secondary" style={{ fontSize: 11, marginTop: 8, display: 'block' }}>
                {item.description}
              </Text>
            </Card>
          </Col>
        ))}
      </Row>

      <Divider />

      <Alert
        message="💡 风控建议"
        description={
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>1. 重点关注政策风险和重组风险的变化</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>2. 建议控制仓位，避免单一股票过度集中</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>3. 设置止损位，单笔亏损不超过本金的5%</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>4. 定期跟踪财务数据，关注经营状况变化</Text>
          </Space>
        }
        type="warning"
        showIcon
      />
    </Card>
  );
};

export default RiskScoreCard;
