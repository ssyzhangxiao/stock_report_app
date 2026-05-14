import React from 'react';
import { Card, Row, Col, Typography, Tag } from 'antd';
import ReactECharts from 'echarts-for-react';
import SectionRenderer from './SectionRenderer';
import type { SectionData } from '../../types/research';

const { Title, Text } = Typography;

interface Props {
  valuationMoat: SectionData;
  valuationHistory: SectionData;
}

const parseNumeric = (val: string): number | null => {
  if (!val) return null;
  const cleaned = val.replace(/[,%亿万元x~约]/g, '').replace(/-/g, '-');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
};

const ValuationDashboard: React.FC<Props> = ({ valuationMoat, valuationHistory }) => {
  const extractMoatScores = () => {
    const scores: { dimension: string; score: number; change: string }[] = [];
    if (!valuationMoat.tables) return scores;

    const moatTable = valuationMoat.tables.find(
      t => t.headers.some(h => h.includes('评分') || h.includes('维度'))
    );
    if (!moatTable) return scores;

    const dimIdx = moatTable.headers.findIndex(h => h.includes('维度'));
    const scoreIdx = moatTable.headers.findIndex(h => h.includes('评分'));
    const changeIdx = moatTable.headers.findIndex(h => h.includes('变化'));

    for (const row of moatTable.rows) {
      if (dimIdx !== -1 && scoreIdx !== -1) {
        const dim = row[dimIdx]?.replace(/\*+/g, '').trim();
        const scoreStr = row[scoreIdx] || '';
        const scoreMatch = scoreStr.match(/(\d+)\/10/);
        if (dim && dim !== '维度' && dim !== '综合' && scoreMatch) {
          scores.push({
            dimension: dim,
            score: parseInt(scoreMatch[1]),
            change: changeIdx !== -1 ? row[changeIdx] || '' : '',
          });
        }
      }
    }
    return scores;
  };

  const extractPEHistory = () => {
    if (!valuationHistory.tables || valuationHistory.tables.length === 0) return null;

    const peTable = valuationHistory.tables.find(
      t => t.headers.some(h => h.includes('PE') || h.includes('最低'))
    );
    if (!peTable) return null;

    const periodIdx = peTable.headers.findIndex(h => h.includes('时间段') || h.includes('时间'));
    const lowIdx = peTable.headers.findIndex(h => h.includes('最低'));
    const highIdx = peTable.headers.findIndex(h => h.includes('最高'));
    const avgIdx = peTable.headers.findIndex(h => h.includes('平均'));
    const pctIdx = peTable.headers.findIndex(h => h.includes('分位'));

    if (periodIdx === -1) return null;

    const data: { period: string; low: number; high: number; avg: number; pct: number }[] = [];
    for (const row of peTable.rows) {
      data.push({
        period: row[periodIdx] || '',
        low: parseNumeric(row[lowIdx]) || 0,
        high: parseNumeric(row[highIdx]) || 0,
        avg: parseNumeric(row[avgIdx]) || 0,
        pct: parseNumeric(row[pctIdx]) || 0,
      });
    }
    return data;
  };

  const extractDCFData = () => {
    if (!valuationMoat.tables) return null;

    const dcfTable = valuationMoat.tables.find(
      t => t.headers.some(h => h.includes('情景') || h.includes('FCF'))
    );
    if (!dcfTable) return null;

    const scenarioIdx = dcfTable.headers.findIndex(h => h.includes('情景'));
    const valueIdx = dcfTable.headers.findIndex(h => h.includes('内在价值'));
    const marginIdx = dcfTable.headers.findIndex(h => h.includes('安全边际'));

    if (scenarioIdx === -1) return null;

    const data: { scenario: string; value: string; margin: string }[] = [];
    for (const row of dcfTable.rows) {
      data.push({
        scenario: row[scenarioIdx] || '',
        value: valueIdx !== -1 ? row[valueIdx] || '' : '',
        margin: marginIdx !== -1 ? row[marginIdx] || '' : '',
      });
    }
    return data;
  };

  const moatScores = extractMoatScores();
  const peHistory = extractPEHistory();
  const dcfData = extractDCFData();

  const renderMoatRadar = () => {
    if (moatScores.length === 0) return null;

    const option = {
      tooltip: {},
      radar: {
        indicator: moatScores.map(s => ({ name: s.dimension, max: 10 })),
        axisName: { color: '#8892a4', fontSize: 11 },
        splitArea: { areaStyle: { color: ['rgba(77,166,255,0.05)', 'rgba(77,166,255,0.1)'] } },
        axisLine: { lineStyle: { color: '#2a3347' } },
        splitLine: { lineStyle: { color: '#2a3347' } },
      },
      series: [{
        type: 'radar',
        data: [{
          value: moatScores.map(s => s.score),
          name: '护城河评分',
          areaStyle: { color: 'rgba(77,166,255,0.3)' },
          lineStyle: { color: '#4da6ff' },
          itemStyle: { color: '#4da6ff' },
        }],
      }],
    };

    return (
      <Card style={{ borderRadius: 10, marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
        <Title level={5}>🏰 护城河雷达图</Title>
        <ReactECharts option={option} style={{ height: 300 }} />
      </Card>
    );
  };

  const renderPEHistoryChart = () => {
    if (!peHistory || peHistory.length === 0) return null;

    const option = {
      tooltip: { trigger: 'axis' },
      legend: { data: ['最低PE', '平均PE', '最高PE'], textStyle: { color: '#8892a4' } },
      grid: { left: 60, right: 30, bottom: 30, top: 40 },
      xAxis: {
        type: 'category',
        data: peHistory.map(p => p.period),
        axisLabel: { color: '#8892a4' },
      },
      yAxis: {
        type: 'value',
        name: 'PE(x)',
        axisLabel: { color: '#8892a4' },
        splitLine: { lineStyle: { color: '#2a3347' } },
      },
      series: [
        {
          name: '最低PE',
          type: 'line',
          data: peHistory.map(p => p.low),
          lineStyle: { color: '#52c41a' },
          itemStyle: { color: '#52c41a' },
        },
        {
          name: '平均PE',
          type: 'line',
          data: peHistory.map(p => p.avg),
          lineStyle: { color: '#4da6ff', width: 2 },
          itemStyle: { color: '#4da6ff' },
        },
        {
          name: '最高PE',
          type: 'line',
          data: peHistory.map(p => p.high),
          lineStyle: { color: '#ff4d4f' },
          itemStyle: { color: '#ff4d4f' },
        },
      ],
    };

    return (
      <Card style={{ borderRadius: 10, marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
        <Title level={5}>📊 历史PE区间</Title>
        <ReactECharts option={option} style={{ height: 300 }} />
      </Card>
    );
  };

  const renderDCFSummary = () => {
    if (!dcfData || dcfData.length === 0) return null;

    return (
      <Card style={{ borderRadius: 10, marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
        <Title level={5}>🎯 DCF估值情景</Title>
        <Row gutter={[16, 16]}>
          {dcfData.map((item, idx) => {
            const colors = ['#faad14', '#4da6ff', '#52c41a'];
            return (
              <Col xs={24} sm={8} key={idx}>
                <Card
                  size="small"
                  style={{
                    borderRadius: 8,
                    textAlign: 'center',
                    borderTop: `3px solid ${colors[idx % 3]}`,
                    background: 'rgba(255,255,255,0.03)',
                  }}
                  styles={{ body: { padding: 16 } }}
                >
                  <Tag color={colors[idx % 3]} style={{ marginBottom: 8 }}>{item.scenario}</Tag>
                  <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
                    {item.value}
                  </div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    安全边际: {item.margin}
                  </Text>
                </Card>
              </Col>
            );
          })}
        </Row>
      </Card>
    );
  };

  return (
    <div>
      {renderMoatRadar()}
      {renderDCFSummary()}
      {renderPEHistoryChart()}

      {valuationMoat && valuationMoat.subsections && valuationMoat.subsections.length > 0 ? (
        valuationMoat.subsections.map((sub, idx) => (
          <SectionRenderer key={`vm-sub-${idx}`} section={sub} />
        ))
      ) : (
        valuationMoat && <SectionRenderer section={valuationMoat} />
      )}
      {valuationHistory && valuationHistory.content && (
        <Card style={{ borderRadius: 10, marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
          <Title level={5}>📜 历史估值详情</Title>
          {valuationHistory.subsections && valuationHistory.subsections.length > 0 ? (
            valuationHistory.subsections.map((sub, idx) => (
              <SectionRenderer key={`vh-sub-${idx}`} section={sub} />
            ))
          ) : (
            <SectionRenderer section={valuationHistory} />
          )}
        </Card>
      )}
    </div>
  );
};

export default ValuationDashboard;
