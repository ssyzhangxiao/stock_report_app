import React from 'react';
import { Card, Row, Col, Typography, Alert, Progress, Tag, Space, Divider, List, Descriptions } from 'antd';
import { WarningOutlined, CheckCircleOutlined, InfoCircleOutlined, BarChartOutlined, RiseOutlined, ArrowUpOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface MAIndicator {
  name: string;
  value: number;
  status: 'good' | 'warning' | 'danger' | 'neutral';
  description: string;
  detail: string;
}

const indicators: MAIndicator[] = [
  {
    name: '股价相对位置',
    value: 65,
    status: 'warning',
    description: '处于合理区间，有重组后的估值修复空间',
    detail: '当前股价处于近一年65分位，属于相对合理区间。重大资产重组后，估值通常有20-50%的修复空间。'
  },
  {
    name: '成交量异动指数',
    value: 78,
    status: 'warning',
    description: '近期成交量异常放大，可能有资金提前介入',
    detail: '近两周日均成交量较前两个月提升80%，呈现明显的放量特征，符合重大事项前的资金异动模式。'
  },
  {
    name: '股东户数变化',
    value: 35,
    status: 'good',
    description: '股东户数下降，筹码集中度提升',
    detail: '最近一期季报显示股东户数环比下降12%，户均持股数增加，筹码集中趋势明显，有利于后续股价表现。'
  },
  {
    name: '技术形态评分',
    value: 72,
    status: 'warning',
    description: '技术形态显示出明显的底部特征',
    detail: 'K线形态呈现双底结构，MACD金叉，RSI处于50-60区间，技术面配合重组预期，有较好的向上突破可能。'
  },
  {
    name: '波动率指标',
    value: 45,
    status: 'neutral',
    description: '波动率适中，处于可接受的风险水平',
    detail: '30日历史波动率为25%，处于行业平均水平，重大事项前波动率通常会有所上升，当前属于平稳状态。'
  },
  {
    name: '资金净流入强度',
    value: 80,
    status: 'danger',
    description: '主力资金连续净流入，异动明显',
    detail: '近5个交易日主力资金累计净流入3.2亿元，占流通市值1.8%，连续大额净流入是重大事项前的典型信号。'
  },
  {
    name: '行业对比优势',
    value: 75,
    status: 'warning',
    description: '相对行业指数有超额收益，走势独立',
    detail: '近30日相对行业指数超额收益12%，走势相对独立，说明有特定资金关注，可能与潜在的资产重组有关。'
  },
  {
    name: '股权结构稳定性',
    value: 60,
    status: 'neutral',
    description: '第一大股东持股比例适中，有转让空间',
    detail: '第一大股东持股35%，处于相对控股地位，有协议转让的可能性；前十大股东合计持股62%，股权集中度较高。'
  }
];

const MATechnicalAnalysis: React.FC = () => {
  const getStatusColor = (status: MAIndicator['status']) => {
    switch (status) {
      case 'good': return '#52c41a';
      case 'warning': return '#faad14';
      case 'danger': return '#ff4d4f';
      default: return '#1890ff';
    }
  };

  const getStatusIcon = (status: MAIndicator['status']) => {
    switch (status) {
      case 'good': return <CheckCircleOutlined />;
      case 'warning': return <WarningOutlined />;
      case 'danger': return <WarningOutlined />;
      default: return <InfoCircleOutlined />;
    }
  };

  const getTagColor = (status: MAIndicator['status']) => {
    switch (status) {
      case 'good': return 'success';
      case 'warning': return 'warning';
      case 'danger': return 'error';
      default: return 'blue';
    }
  };

  return (
    <Card title="🔍 重大资产重组/控制权转让 - 技术面分析" style={{ marginBottom: 16 }}>
      <Alert
        message="分析说明"
        description="本分析从重大资产重组和控制权转让的专业角度，综合评估技术面、资金面和股权结构的异动特征，仅供参考。"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />
      
      <Row gutter={16}>
        <Col xs={24} lg={12}>
          <Card size="small" title="📊 关键指标监控" style={{ marginBottom: 16 }}>
            <List
              itemLayout="vertical"
              dataSource={indicators}
              renderItem={(item) => (
                <List.Item>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Space>
                        {getStatusIcon(item.status)}
                        <Text strong>{item.name}</Text>
                      </Space>
                      <Tag color={getTagColor(item.status)}>{item.status.toUpperCase()}</Tag>
                    </div>
                    <Progress
                      percent={item.value}
                      strokeColor={getStatusColor(item.status)}
                      size="small"
                    />
                    <Text type="secondary" style={{ fontSize: 12 }}>{item.description}</Text>
                    <Divider style={{ margin: '8px 0' }} />
                    <Text style={{ fontSize: 12, lineHeight: 1.5 }}>{item.detail}</Text>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        
        <Col xs={24} lg={12}>
          <Card size="small" title="📋 重大事项信号识别" style={{ marginBottom: 16 }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="信号强度">
                <Progress percent={75} strokeColor="#faad14" status="active" />
              </Descriptions.Item>
              <Descriptions.Item label="资金异动">
                <Space>
                  <ArrowUpOutlined />
                  <Tag color="error">80% 放量</Tag>
                  <Text type="secondary" style={{ fontSize: 12 }}>连续5日净流入</Text>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="技术形态">
                <Space>
                  <BarChartOutlined />
                  <Tag color="success">双底结构</Tag>
                  <Text type="secondary" style={{ fontSize: 12 }}>MACD金叉</Text>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="筹码分布">
                <Space>
                  <RiseOutlined />
                  <Tag color="warning">集中度提升</Tag>
                  <Text type="secondary" style={{ fontSize: 12 }}>股东户数下降12%</Text>
                </Space>
              </Descriptions.Item>
            </Descriptions>
            
            <Divider />
            
            <Title level={5}>⚠️ 风险提示</Title>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.6 }}>
                1. 本分析基于技术面和资金面特征，不构成投资建议
              </Text>
              <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.6 }}>
                2. 重大事项存在不确定性，需结合基本面和消息面综合判断
              </Text>
              <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.6 }}>
                3. 股价已部分反映预期，需警惕利好出尽风险
              </Text>
              <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.6 }}>
                4. 建议设置合理止损，控制仓位
              </Text>
            </Space>
          </Card>
          
          <Card size="small" title="💡 重组后估值展望">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Row gutter={8}>
                <Col span={8}>
                  <div style={{ textAlign: 'center', padding: 8, background: 'var(--bg-elevated)', borderRadius: 4 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>保守预期</Text>
                    <br />
                    <Text strong style={{ color: '#52c41a', fontSize: 18 }}>+20%</Text>
                  </div>
                </Col>
                <Col span={8}>
                  <div style={{ textAlign: 'center', padding: 8, background: 'var(--bg-elevated)', borderRadius: 4 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>中性预期</Text>
                    <br />
                    <Text strong style={{ color: '#1890ff', fontSize: 18 }}>+35%</Text>
                  </div>
                </Col>
                <Col span={8}>
                  <div style={{ textAlign: 'center', padding: 8, background: 'var(--bg-elevated)', borderRadius: 4 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>乐观预期</Text>
                    <br />
                    <Text strong style={{ color: '#faad14', fontSize: 18 }}>+50%</Text>
                  </div>
                </Col>
              </Row>
              <Text type="secondary" style={{ fontSize: 11, marginTop: 8 }}>
                估值提升空间基于可比公司重组后表现估算，实际情况可能有所不同
              </Text>
            </Space>
          </Card>
        </Col>
      </Row>
    </Card>
  );
};

export default MATechnicalAnalysis;
