import React from 'react';
import { Card, Row, Col, Typography, Progress, Tag, Space, Divider, Alert, Statistic } from 'antd';
import { WarningOutlined, CheckCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { riskItems, calculateOverallScore, calculateRiskStats, getRiskLevelColor, getRiskLevelLabel } from '../../utils/riskScoreData';

const { Title, Text } = Typography;

const RiskScoreCard: React.FC = () => {
  const overallScore = calculateOverallScore();
  const riskStats = calculateRiskStats();

  const getOverallStatus = (score: number) => {
    if (score < 30) return { text: '安全', color: '#52c41a', icon: <CheckCircleOutlined /> };
    if (score < 50) return { text: '关注', color: '#faad14', icon: <InfoCircleOutlined /> };
    if (score < 70) return { text: '警惕', color: '#ff7a45', icon: <WarningOutlined /> };
    return { text: '高风险', color: '#ff4d4f', icon: <WarningOutlined /> };
  };

  const overallStatus = getOverallStatus(overallScore);

  return (
    <Card title="📊 综合风险评分卡" style={{ marginBottom: 16 }}>
      <Alert
        message="风险评估说明"
        description="综合评分基于市场、财务、经营、治理等8个维度，0-100分，分数越高风险越高。"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} md={12}>
          <Card size="small">
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <Text type="secondary" style={{ fontSize: 14 }}>综合风险评分</Text>
              <div style={{ margin: '16px 0' }}>
                <Progress
                  type="dashboard"
                  percent={overallScore}
                  strokeColor={overallStatus.color}
                  format={(percent) => (
                    <span style={{ fontSize: 24, fontWeight: 700, color: overallStatus.color }}>
                      {percent}
                    </span>
                  )}
                />
              </div>
              <Space>
                {overallStatus.icon}
                <Tag color={overallStatus.color} style={{ fontSize: 16, padding: '4px 12px' }}>
                  {overallStatus.text}
                </Tag>
              </Space>
            </div>
          </Card>
        </Col>

        <Col xs={24} md={12}>
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
        </Col>
      </Row>

      <Divider />

      <Title level={5}>📋 各维度风险评分</Title>
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
