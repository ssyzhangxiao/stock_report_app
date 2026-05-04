import React from 'react';
import { Card, Row, Col, Tag, Typography } from 'antd';

const { Text } = Typography;

interface Props {
  pledgeRatio: Record<string, any>[];
  cyq: Record<string, any>[];
  insiderHoldings: Record<string, any>[];
  marginBalance: Record<string, any>[];
  marginHistory?: { 日期: string; 融资余额: number; 融券余量: number }[];
}

const StatCard: React.FC<{ title: string; value: string; unit?: string; level: 'good' | 'mid' | 'bad'; note: string }> = ({ title, value, unit, level, note }) => {
  const colors = { good: '#52c41a', mid: '#faad14', bad: '#ff4d4f' };
  return (
    <div style={{ background: 'var(--bg-elevated)', borderRadius: 6, padding: '8px 10px', border: '1px solid var(--border-split)', height: '100%' }}>
      <Text type="secondary" style={{ fontSize: 11 }}>{title}</Text>
      <div style={{ fontSize: 20, fontWeight: 700, color: colors[level], lineHeight: '28px' }}>{value}<span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 4 }}>{unit}</span></div>
      <Tag color={level === 'bad' ? 'red' : level === 'mid' ? 'orange' : 'green'} style={{ fontSize: 12, marginTop: 2 }}>{note}</Tag>
    </div>
  );
};

const RiskIndicatorsPanel: React.FC<Props> = ({ pledgeRatio, cyq, insiderHoldings, marginBalance, marginHistory }) => {
  const p = pledgeRatio[0];
  const pp = p?.['质押比例(%)'] || 0;
  const cyq90 = cyq.length > 0 ? cyq[cyq.length - 1]?.['90%成本集中度'] ?? 100 : 100;
  const hasReduce = insiderHoldings.some((r: any) => (r['变动数量'] || 0) < 0);
  const margin = marginBalance[0] || null;
  const ma = margin?.['融资余额(元)'] || 0;
  const mh = marginHistory || [];
  const trend = mh.length > 2 ? (mh[0].融资余额 > mh[mh.length - 1].融资余额 ? '↑ 上升' : '↓ 下降') : '--';

  return (
    <Card title="📊 股权结构稳定监控" size="small" style={{ borderRadius: 8, border: '1px solid var(--border)' }} bodyStyle={{ padding: 12 }}>
      <Row gutter={[8, 8]}>
        <Col span={12}><StatCard title="实控人质押" value={pp.toFixed(2)} unit="%" level={pp > 50 ? 'bad' : pp > 30 ? 'mid' : 'good'} note={pp > 50 ? '高' : pp > 30 ? '中等' : '低'} /></Col>
        <Col span={12}><StatCard title="筹码集中度" value={cyq90.toFixed(1)} unit="%" level={cyq90 > 20 ? 'bad' : cyq90 > 10 ? 'mid' : 'good'} note={cyq90 > 20 ? '分散' : cyq90 > 10 ? '适中' : '集中'} /></Col>
        <Col span={12}><StatCard title="高管持股" value={hasReduce ? '有减持' : '平稳'} level={hasReduce ? 'mid' : 'good'} note={hasReduce ? '关注异常' : '无异常'} /></Col>
        <Col span={12}><StatCard title="融资融券" value={ma > 0 ? (ma / 1e8).toFixed(1) : '--'} unit="亿" level={ma > 5e10 ? 'bad' : ma > 1e10 ? 'mid' : 'good'} note={trend} /></Col>
      </Row>
    </Card>
  );
};

export default RiskIndicatorsPanel;
