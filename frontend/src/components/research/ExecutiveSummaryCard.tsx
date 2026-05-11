import React from 'react';
import { Card, Row, Col, Tag, Typography, Space, Progress } from 'antd';
import {
  RiseOutlined,
  FallOutlined,
  WarningOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import MarkdownTable from './MarkdownTable';
import type { SectionData } from '../../types/research';

const { Title, Text, Paragraph } = Typography;

interface Props {
  section: SectionData;
  stockCode: string;
  stockName: string;
}

const signalConfig: Record<string, { color: string; bg: string }> = {
  '买入': { color: '#52c41a', bg: '#f6ffed' },
  '增持': { color: '#95de64', bg: '#fcffe6' },
  '持有': { color: '#faad14', bg: '#fffbe6' },
  '减持': { color: '#fa8c16', bg: '#fff7e6' },
  '卖出': { color: '#ff4d4f', bg: '#fff2f0' },
  'HOLD': { color: '#faad14', bg: '#fffbe6' },
  'BUY': { color: '#52c41a', bg: '#f6ffed' },
  'SELL': { color: '#ff4d4f', bg: '#fff2f0' },
};

const ExecutiveSummaryCard: React.FC<Props> = ({ section, stockCode, stockName }) => {
  if (!section || !section.content) return null;

  const content = section.content;

  const extractSignalRating = () => {
    const patterns = [
      /🟡🟡🟡\s*(.+?)(?:\n|$)/,
      /🟢🟢🟢\s*(.+?)(?:\n|$)/,
      /🔴🔴🔴\s*(.+?)(?:\n|$)/,
    ];
    for (const p of patterns) {
      const m = content.match(p);
      if (m) return m[1].trim();
    }
    return '';
  };

  const extractKeySentence = () => {
    const m = content.match(/\*\*一句话摘要\*\*[：:]\s*(.+?)(?:\n\n|\n---)/s);
    if (m) return m[1].trim();
    return '';
  };

  const extractHealthScores = () => {
    const scores: { name: string; score: number; desc: string }[] = [];
    const scoreRegex = /\|\s*(.+?)\s*\|\s*★+\s*\|\s*(.+?)\s*\|/g;
    let match;
    while ((match = scoreRegex.exec(content)) !== null) {
      const name = match[1].trim();
      const desc = match[2].trim();
      if (name !== '维度' && name !== '综合') {
        const starCount = (name.match(/★/g) || []).length;
        scores.push({ name: name.replace(/★/g, '').trim(), score: starCount * 20, desc });
      }
    }
    return scores;
  };

  const signal = extractSignalRating();
  const keySentence = extractKeySentence();
  const healthScores = extractHealthScores();

  const signalStyle = (() => {
    for (const [key, style] of Object.entries(signalConfig)) {
      if (signal.includes(key)) return style;
    }
    return { color: '#4da6ff', bg: '#e6f7ff' };
  })();

  return (
    <div>
      <Card
        style={{
          borderRadius: 12,
          marginBottom: 16,
          background: 'linear-gradient(135deg, #1a1f35 0%, #0d1117 100%)',
          border: '1px solid #2a3347',
        }}
        styles={{ body: { padding: 24 } }}
      >
        <Row gutter={[24, 16]} align="middle">
          <Col xs={24} md={16}>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Title level={3} style={{ margin: 0 }}>
                  {stockName} ({stockCode})
                </Title>
                {signal && (
                  <Tag
                    style={{
                      fontSize: 14,
                      padding: '4px 16px',
                      borderRadius: 20,
                      fontWeight: 600,
                      color: signalStyle.color,
                      background: signalStyle.bg,
                      border: `1px solid ${signalStyle.color}40`,
                    }}
                  >
                    {signal}
                  </Tag>
                )}
              </div>
              {keySentence && (
                <Paragraph
                  style={{
                    fontSize: 14,
                    lineHeight: 1.8,
                    color: 'rgba(255,255,255,0.85)',
                    margin: 0,
                    padding: '12px 16px',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: 8,
                    borderLeft: '3px solid #4da6ff',
                  }}
                >
                  {keySentence}
                </Paragraph>
              )}
            </Space>
          </Col>
          <Col xs={24} md={8}>
            {healthScores.length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 16 }}>
                <Text strong style={{ fontSize: 13, marginBottom: 8, display: 'block' }}>
                  📊 财务健康评分
                </Text>
                {healthScores.map((s, i) => (
                  <div key={i} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <Text style={{ fontSize: 12 }}>{s.name}</Text>
                      <Text style={{ fontSize: 12, color: s.score >= 80 ? '#52c41a' : s.score >= 60 ? '#faad14' : '#ff4d4f' }}>
                        {s.score}%
                      </Text>
                    </div>
                    <Progress
                      percent={s.score}
                      showInfo={false}
                      strokeColor={s.score >= 80 ? '#52c41a' : s.score >= 60 ? '#faad14' : '#ff4d4f'}
                      size="small"
                    />
                  </div>
                ))}
              </div>
            )}
          </Col>
        </Row>
      </Card>

      {section.tables.map((table, idx) => (
        <Card key={`table-${idx}`} style={{ borderRadius: 10, marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
          <MarkdownTable table={table} scrollX={800} />
        </Card>
      ))}

      <SectionContent section={section} />
    </div>
  );
};

const SectionContent: React.FC<{ section: SectionData }> = ({ section }) => {
  const content = section.content;
  if (!content) return null;

  const advantages: string[] = [];
  const risks: string[] = [];

  const advMatch = content.match(/核心优势[\s\S]*?(?=核心风险|四、|五、|$)/);
  if (advMatch) {
    const lines = advMatch[0].split('\n').filter(l => l.trim().startsWith('-'));
    advantages.push(...lines.map(l => l.replace(/^-\s*/, '').trim()));
  }

  const riskMatch = content.match(/核心风险[\s\S]*?(?=五、|六、|$)/);
  if (riskMatch) {
    const lines = riskMatch[0].split('\n').filter(l => l.trim().startsWith('-'));
    risks.push(...lines.map(l => l.replace(/^-\s*/, '').trim()));
  }

  if (advantages.length === 0 && risks.length === 0) return null;

  return (
    <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
      {advantages.length > 0 && (
        <Col xs={24} md={12}>
          <Card
            title={<><TrophyOutlined style={{ color: '#52c41a' }} /> 核心优势</>}
            style={{ borderRadius: 10, height: '100%' }}
            styles={{ body: { padding: 16 } }}
          >
            {advantages.slice(0, 5).map((adv, i) => (
              <div key={i} style={{ marginBottom: 8, display: 'flex', gap: 8 }}>
                <RiseOutlined style={{ color: '#52c41a', marginTop: 4 }} />
                <Text style={{ fontSize: 13, lineHeight: 1.6 }}>{adv}</Text>
              </div>
            ))}
          </Card>
        </Col>
      )}
      {risks.length > 0 && (
        <Col xs={24} md={12}>
          <Card
            title={<><WarningOutlined style={{ color: '#ff4d4f' }} /> 核心风险</>}
            style={{ borderRadius: 10, height: '100%' }}
            styles={{ body: { padding: 16 } }}
          >
            {risks.slice(0, 5).map((risk, i) => (
              <div key={i} style={{ marginBottom: 8, display: 'flex', gap: 8 }}>
                <FallOutlined style={{ color: '#ff4d4f', marginTop: 4 }} />
                <Text style={{ fontSize: 13, lineHeight: 1.6 }}>{risk}</Text>
              </div>
            ))}
          </Card>
        </Col>
      )}
    </Row>
  );
};

export default ExecutiveSummaryCard;
