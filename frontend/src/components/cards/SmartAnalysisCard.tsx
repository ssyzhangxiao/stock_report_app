import React from 'react';
import { Card, Row, Col, Typography, Alert } from 'antd';
import {
  RobotOutlined, ThunderboltOutlined, WarningOutlined,
  DollarOutlined, LineChartOutlined, FundOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import { SmartAnalysis } from '../../api/stockApi';

const { Text, Paragraph } = Typography;

interface SmartAnalysisCardProps {
  analysis: SmartAnalysis;
}

const secColors: Record<string, string> = {
  fundamental_analysis: '#e6f7ff',
  technical_analysis: '#f6ffed',
  valuation_analysis: '#fff7e6',
  capital_analysis: '#f9f0ff',
};

const SmartAnalysisCard: React.FC<SmartAnalysisCardProps> = ({ analysis }) => {
  if (!analysis.available) return null;

  const sections = [
    { key: 'fundamental_analysis', icon: <DollarOutlined />, label: '基本面分析' },
    { key: 'technical_analysis', icon: <LineChartOutlined />, label: '二级走势' },
    { key: 'valuation_analysis', icon: <FundOutlined />, label: '估值分析' },
    { key: 'capital_analysis', icon: <ThunderboltOutlined />, label: '资金面分析' },
  ];

  return (
    <Card
      title={
        <span style={{ fontSize: 16, fontWeight: 600 }}>
          <RobotOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          上市公司概况
          {analysis.generated_at && (
            <span style={{ marginLeft: 12, fontSize: 12, fontWeight: 400, color: '#8c8c8c' }}>
              <CheckCircleOutlined style={{ marginRight: 4 }} />
              {new Date(analysis.generated_at).toLocaleString('zh-CN')}
            </span>
          )}
        </span>
      }
      style={{
        borderRadius: 12, marginBottom: 20,
        border: '1px solid #e8ecf1', boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}
    >
      {/* Summary */}
      {analysis.summary && analysis.summary !== '等待AI深度分析...' && (
        <Alert message={analysis.summary} type="info" showIcon
          style={{ marginBottom: 20, borderRadius: 8 }} />
      )}

      {/* Analysis Sections */}
      <Row gutter={[16, 16]}>
        {sections.map((sec) => {
          const content = (analysis as any)[sec.key];
          if (!content || content.length < 10) return null;
          return (
            <Col xs={24} md={sec.key.includes('valuation') || sec.key.includes('capital') ? 12 : 24} key={sec.key}>
              <div style={{
                borderRadius: 8, border: '1px solid #f0f0f0',
                background: secColors[sec.key] || '#fafafa', height: '100%',
              }}>
                <div style={{
                  padding: '10px 16px', borderBottom: '1px solid #f0f0f0',
                  fontWeight: 600, color: '#262626', fontSize: 14,
                }}>
                  {sec.icon} <span style={{ marginLeft: 6 }}>{sec.label}</span>
                </div>
                <div style={{ padding: '12px 16px', lineHeight: 1.8, color: '#434343', fontSize: 14 }}>
                  {content}
                </div>
              </div>
            </Col>
          );
        })}

        {/* Risk Warning */}
        {analysis.risk_warning && analysis.risk_warning.length > 10 && (
          <Col span={24}>
            <div style={{
              borderRadius: 8, border: '1px solid #ffd9d9',
              background: '#fff2f0', padding: 16,
            }}>
              <Text strong style={{ color: '#cf1322', display: 'block', marginBottom: 8 }}>
                <WarningOutlined style={{ marginRight: 8 }} />风险提示
              </Text>
              <Text style={{ color: '#a8071a', lineHeight: 1.8 }}>{analysis.risk_warning}</Text>
            </div>
          </Col>
        )}
      </Row>

      {/* Raw fallback */}
      {analysis.raw_analysis && (!analysis.fundamental_analysis || analysis.fundamental_analysis.length < 10) && (
        <Paragraph style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, marginTop: 16 }}>
          {analysis.raw_analysis}
        </Paragraph>
      )}

      {/* Footer */}
      <div style={{
        marginTop: 20, padding: '12px 16px', background: '#fafafa',
        borderRadius: 8, fontSize: 12, color: '#8c8c8c', textAlign: 'center',
      }}>
        ⚠️ 以上分析基于公开数据由AI生成，仅供控制权转让研究参考，不构成投资建议
      </div>
    </Card>
  );
};

export default SmartAnalysisCard;
