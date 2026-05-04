import React from 'react';
import { Card, Typography, Tag, Alert, Space } from 'antd';
import { RiseOutlined, WarningOutlined, SafetyOutlined, InfoCircleOutlined } from '@ant-design/icons';
import type { SmartAnalysis } from '../../types/stock';

const { Title, Text, Paragraph } = Typography;

interface EnhancedAnalysisProps {
  smartAnalysis: SmartAnalysis;
}

const EnhancedAnalysis: React.FC<EnhancedAnalysisProps> = ({ smartAnalysis }) => {
  if (!smartAnalysis?.available) {
    return (
      <Card title="📊 智能分析" style={{ marginBottom: 16 }}>
        <Alert
          message="智能分析暂不可用"
          description={smartAnalysis?.error || "请稍候重试"}
          type="info"
          showIcon
        />
      </Card>
    );
  }

  const score = smartAnalysis.score ?? 5;
  const suggestion = smartAnalysis.suggestion ?? '持有';

  // 评分颜色映射
  const getScoreColor = (s: number) => {
    if (s >= 8) return '#52c41a'; // 绿色
    if (s >= 6) return '#faad14'; // 黄色
    if (s >= 4) return '#fa8c16'; // 橙色
    return '#ff4d4f'; // 红色
  };

  const getSuggestionIcon = (s?: string) => {
    switch (s) {
      case '买入': return <RiseOutlined />;
      case '增持': return <RiseOutlined />;
      case '持有': return <InfoCircleOutlined />;
      case '减持': return <WarningOutlined />;
      case '卖出': return <WarningOutlined />;
      default: return <InfoCircleOutlined />;
    }
  };

  return (
    <Card title="🧠 增强智能分析" style={{ marginBottom: 16 }}>
      {/* 评分和建议 */}
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>综合评分</Text>
            <Text style={{ fontSize: 48, fontWeight: 700, color: getScoreColor(score) }}>
              {score}/10
            </Text>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>投资建议</Text>
            <Tag
              color={score >= 7 ? 'green' : score >= 5 ? 'orange' : 'red'}
              style={{ fontSize: 18, padding: '8px 16px' }}
              icon={getSuggestionIcon(suggestion)}
            >
              {suggestion}
            </Tag>
          </div>
        </div>

        {/* 一句话总结 */}
        {smartAnalysis.summary && (
          <Alert
            message={smartAnalysis.summary}
            type="info"
            showIcon
          />
        )}

        {/* 核心要点 */}
        {smartAnalysis.key_points && smartAnalysis.key_points.length > 0 && (
          <div>
            <Title level={5} style={{ marginBottom: 12 }}>🎯 核心要点</Title>
            <Space direction="vertical" style={{ width: '100%' }}>
              {smartAnalysis.key_points.map((point, index) => (
                <div key={index} style={{
                  padding: '12px',
                  background: 'var(--bg-elevated)',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'flex-start'
                }}>
                  <Tag color="blue" style={{ marginRight: 12, flexShrink: 0 }}>
                    {index + 1}
                  </Tag>
                  <Text>{point}</Text>
                </div>
              ))}
            </Space>
          </div>
        )}

        {/* 分析维度 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* 基本面分析 */}
          {smartAnalysis.fundamental_analysis && (
            <Card size="small" title="📈 基本面分析" style={{ marginBottom: 0 }}>
              <Paragraph style={{ marginBottom: 0 }}>
                {smartAnalysis.fundamental_analysis}
              </Paragraph>
            </Card>
          )}

          {/* 技术面分析 */}
          {smartAnalysis.technical_analysis && (
            <Card size="small" title="📊 技术面分析" style={{ marginBottom: 0 }}>
              <Paragraph style={{ marginBottom: 0 }}>
                {smartAnalysis.technical_analysis}
              </Paragraph>
            </Card>
          )}

          {/* 估值分析 */}
          {smartAnalysis.valuation_analysis && (
            <Card size="small" title="💰 估值分析" style={{ marginBottom: 0 }}>
              <Paragraph style={{ marginBottom: 0 }}>
                {smartAnalysis.valuation_analysis}
              </Paragraph>
            </Card>
          )}

          {/* 资金面分析 */}
          {smartAnalysis.capital_analysis && (
            <Card size="small" title="💵 资金面分析" style={{ marginBottom: 0 }}>
              <Paragraph style={{ marginBottom: 0 }}>
                {smartAnalysis.capital_analysis}
              </Paragraph>
            </Card>
          )}

          {/* 市场前景 */}
          {smartAnalysis.market_outlook && (
            <Card size="small" title="🔮 市场前景" style={{ marginBottom: 0 }}>
              <Paragraph style={{ marginBottom: 0 }}>
                {smartAnalysis.market_outlook}
              </Paragraph>
            </Card>
          )}

          {/* 风险提示 */}
          {smartAnalysis.risk_warning && (
            <Card size="small" title="⚠️ 风险提示" style={{ marginBottom: 0 }}>
              <Paragraph style={{ marginBottom: 0 }}>
                {smartAnalysis.risk_warning}
              </Paragraph>
            </Card>
          )}
        </div>

        {/* 风险因素 */}
        {smartAnalysis.risk_factors && smartAnalysis.risk_factors.length > 0 && (
          <div>
            <Title level={5} style={{ marginBottom: 12 }}>
              <WarningOutlined style={{ marginRight: 8 }} />
              风险因素
            </Title>
            <Space wrap>
              {smartAnalysis.risk_factors.map((risk, index) => (
                <Tag key={index} color="error" style={{ padding: '6px 12px' }}>
                  {risk}
                </Tag>
              ))}
            </Space>
          </div>
        )}

        {/* 投资策略 */}
        {smartAnalysis.investment_strategy && (
          <div>
            <Title level={5} style={{ marginBottom: 12 }}>
              <SafetyOutlined style={{ marginRight: 8 }} />
              投资策略建议
            </Title>
            <Alert
              message="投资建议"
              description={smartAnalysis.investment_strategy}
              type="success"
              showIcon
            />
          </div>
        )}

        {/* 目标价和止损 */}
        {(smartAnalysis.target_price || smartAnalysis.stop_loss || smartAnalysis.position_advice) && (
          <div>
            <Title level={5} style={{ marginBottom: 12 }}>📍 交易指引</Title>
            <div style={{ display: 'flex', gap: 24 }}>
              {smartAnalysis.target_price && (
                <div>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                    目标价
                  </Text>
                  <Text style={{ fontSize: 20, fontWeight: 700, color: '#52c41a' }}>
                    ¥{smartAnalysis.target_price.toFixed(2)}
                  </Text>
                </div>
              )}
              {smartAnalysis.stop_loss && (
                <div>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                    止损价
                  </Text>
                  <Text style={{ fontSize: 20, fontWeight: 700, color: '#ff4d4f' }}>
                    ¥{smartAnalysis.stop_loss.toFixed(2)}
                  </Text>
                </div>
              )}
              {smartAnalysis.position_advice && (
                <div>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                    仓位建议
                  </Text>
                  <Tag color="blue" style={{ fontSize: 14, padding: '4px 12px' }}>
                    {smartAnalysis.position_advice}
                  </Tag>
                </div>
              )}
            </div>
          </div>
        )}
      </Space>
    </Card>
  );
};

export default EnhancedAnalysis;
