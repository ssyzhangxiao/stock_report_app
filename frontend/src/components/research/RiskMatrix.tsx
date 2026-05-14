import React from 'react';
import { Card, Row, Col, Typography, Tag, Space } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import SectionRenderer from './SectionRenderer';
import type { SectionData } from '../../types/research';

const { Title, Text } = Typography;

interface Props {
  section: SectionData;
}

const riskLevelMap: Record<string, { color: string; count: number }> = {
  '🔴🔴🔴': { color: '#ff4d4f', count: 3 },
  '🔴🔴': { color: '#fa8c16', count: 2 },
  '🔴': { color: '#faad14', count: 1 },
  '🟡🟡🟡': { color: '#faad14', count: 2 },
  '🟢🟢🟢': { color: '#52c41a', count: 0 },
};

const RiskMatrix: React.FC<Props> = ({ section }) => {
  if (!section || !section.content) return null;

  const extractRiskItems = () => {
    const items: { name: string; level: string; probability: string; impact: string }[] = [];

    const riskTable = section.tables[0];
    if (riskTable && riskTable.headers.length > 0) {
      const nameIdx = riskTable.headers.findIndex(h => h.includes('风险') || h.includes('类别'));
      const levelIdx = riskTable.headers.findIndex(h => h.includes('等级'));
      const probIdx = riskTable.headers.findIndex(h => h.includes('概率'));
      const impactIdx = riskTable.headers.findIndex(h => h.includes('影响'));

      for (const row of riskTable.rows) {
        if (nameIdx !== -1) {
          items.push({
            name: row[nameIdx] || '',
            level: levelIdx !== -1 ? row[levelIdx] || '' : '',
            probability: probIdx !== -1 ? row[probIdx] || '' : '',
            impact: impactIdx !== -1 ? row[impactIdx] || '' : '',
          });
        }
      }
    }

    return items;
  };

  const riskItems = extractRiskItems();

  const getRiskColor = (level: string) => {
    for (const [key, val] of Object.entries(riskLevelMap)) {
      if (level.includes(key) || (key.includes('🔴') && level.includes('🔴'))) return val.color;
    }
    if (level.includes('高')) return '#ff4d4f';
    if (level.includes('中')) return '#faad14';
    if (level.includes('低')) return '#52c41a';
    return '#4da6ff';
  };

  return (
    <div>
      {riskItems.length > 0 && (
        <Card style={{ borderRadius: 10, marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
          <Title level={5}>
            <WarningOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
            风险矩阵
          </Title>
          <Row gutter={[12, 12]}>
            {riskItems.map((risk, idx) => (
              <Col xs={24} sm={12} md={8} key={idx}>
                <Card
                  size="small"
                  style={{
                    borderRadius: 8,
                    borderLeft: `3px solid ${getRiskColor(risk.level)}`,
                    background: 'rgba(255,255,255,0.03)',
                  }}
                  styles={{ body: { padding: 12 } }}
                >
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    <Text strong style={{ fontSize: 13 }}>{risk.name}</Text>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {risk.level && (
                        <Tag color={getRiskColor(risk.level)} style={{ margin: 0 }}>
                          {risk.level}
                        </Tag>
                      )}
                      {risk.probability && (
                        <Tag style={{ margin: 0 }}>概率: {risk.probability}</Tag>
                      )}
                      {risk.impact && (
                        <Tag style={{ margin: 0 }}>影响: {risk.impact}</Tag>
                      )}
                    </div>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {section.subsections && section.subsections.length > 0 ? (
        section.subsections.map((sub, idx) => (
          <SectionRenderer key={`sub-${idx}`} section={sub} />
        ))
      ) : (
        <SectionRenderer section={section} />
      )}
    </div>
  );
};

export default RiskMatrix;
