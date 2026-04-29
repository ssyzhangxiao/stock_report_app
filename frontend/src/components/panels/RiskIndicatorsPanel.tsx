import React from 'react';
import { Card, Row, Col, Table, Tag, Typography } from 'antd';
import ReactECharts from 'echarts-for-react';

const { Text, Title } = Typography;

interface RiskIndicatorsPanelProps {
  pledgeRatio: Array<Record<string, any>>;
  cyq: Array<Record<string, any>>;
  insiderHoldings: Array<Record<string, any>>;
  marginBalance: Array<Record<string, any>>;
}

// 风险仪表 — 水平渐变色条 + 当前值标记
const RiskMeter: React.FC<{ value: number; low: number; high: number; unit?: string }> = ({ value, low, high, unit = '' }) => {
  const pct = Math.min(100, Math.max(0, ((value - 0) / (high - 0)) * 100));
  return (
    <div style={{ margin: '8px 0' }}>
      <div style={{ height: 8, background: 'linear-gradient(to right, #3f8600, #faad14, #cf1322)', borderRadius: 4, position: 'relative' }}>
        <div style={{ position: 'absolute', left: `${Math.min(95, pct)}%`, top: -4, width: 12, height: 16, background: '#262626', borderRadius: 2, transform: 'translateX(-50%)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>
        <span>{value.toFixed(1)}{unit}</span>
        <span>低风险 ← 低 {low} → 高 {high} → 高风险</span>
      </div>
    </div>
  );
};

const ConclusionBox: React.FC<{ level: 'low' | 'mid' | 'high'; text: string }> = ({ level, text }) => {
  const colors = { low: '#3f8600', mid: '#faad14', high: '#cf1322' };
  return (
    <div style={{ marginTop: 12, padding: '8px 12px', background: '#fafafa', borderRadius: 6, borderLeft: `3px solid ${colors[level]}` }}>
      <Text style={{ fontSize: 13, color: colors[level] }}>💡 {text}</Text>
    </div>
  );
};

const RiskIndicatorsPanel: React.FC<RiskIndicatorsPanelProps> = ({
  pledgeRatio, cyq, insiderHoldings, marginBalance
}) => {
  const latestPledge = pledgeRatio.length > 0 ? pledgeRatio[0] : null;
  const pledgePercent = latestPledge?.['质押比例(%)'] || 0;
  const pledgeLevel = pledgePercent > 50 ? 'high' : pledgePercent > 30 ? 'mid' : 'low';

  const hasInsiderReduce = insiderHoldings.some((r: any) => (r['变动数量'] || 0) < 0);
  const hasInsiderInc = insiderHoldings.some((r: any) => (r['变动数量'] || 0) > 0);

  const latestCyq = cyq.length > 0 ? cyq[cyq.length - 1] : null;
  const cyq90 = latestCyq?.['90%成本集中度'] ?? 100;
  const cyqLevel = cyq90 < 15 ? 'low' : cyq90 < 25 ? 'mid' : 'high';

  const margin = marginBalance.length > 0 ? marginBalance[0] : null;
  const marginAmount = margin?.['融资余额(元)'] || 0;

  // 高管增减持累积曲线图
  const insiderTrend = insiderHoldings.length > 1 ? (() => {
    const sorted = [...insiderHoldings].reverse().slice(0, 15);
    const dates = sorted.map((r: any) => String(r['变动日期'] || '').slice(5));
    const vals = sorted.map((r: any) => r['变动数量'] || 0);
    let cum = 0; const cumulative = vals.map(v => { cum += v; return cum; });
    return {
      tooltip: { trigger: 'axis' as const },
      grid: { left: 35, right: 10, top: 10, bottom: 20 },
      xAxis: { type: 'category' as const, data: dates, axisLabel: { fontSize: 9 } },
      yAxis: { type: 'value' as const, axisLabel: { fontSize: 9 } },
      series: [{ type: 'line' as const, data: cumulative, smooth: true, lineStyle: { width: 2, color: '#1890ff' }, areaStyle: { color: 'rgba(24,144,255,0.1)' }, symbol: 'circle', symbolSize: 6 }]
    };
  })() : null;

  return (
    <Card title="⚠️ 控制权相关风险监控" style={{ marginBottom: 24, borderRadius: 12 }}>
      {/* 质押 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={5}>📌 大股东质押比例变化</Title>
        {latestPledge ? (
          <>
            <Row gutter={16}>
              <Col span={8}><Text type="secondary">质押比例</Text><br /><Text strong style={{ fontSize: 24, color: pledgeLevel === 'high' ? '#cf1322' : pledgeLevel === 'mid' ? '#faad14' : '#3f8600' }}>{pledgePercent.toFixed(1)}%</Text></Col>
              <Col span={8}><Text type="secondary">质押股数</Text><br /><Text strong>{latestPledge['质押股数(万股)']?.toLocaleString() ?? 'N/A'}万股</Text></Col>
              <Col span={8}><Text type="secondary">质押市值</Text><br /><Text strong>{latestPledge['质押市值(万元)']?.toLocaleString() ?? 'N/A'}万元</Text></Col>
            </Row>
            <RiskMeter value={pledgePercent} low={0} high={70} unit="%" />
            <ConclusionBox level={pledgeLevel} text={
              pledgePercent > 50 ? '质押比例过高→股价下跌可能触发平仓导致被动转让，风险极高'
              : pledgePercent > 30 ? '质押比例中等→需关注股价波动对质押安全性的影响'
              : '质押比例较低→因质押导致的控制权转让风险较小'} />
          </>
        ) : <Text type="secondary">暂无质押数据</Text>}
      </div>

      {/* 筹码集中度 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={5}>🎯 持股户数变化</Title>
        {latestCyq ? (
          <>
            <Row gutter={16}>
              <Col span={6}><Text type="secondary">获利盘</Text><br /><Text strong style={{ fontSize: 20, color: '#1890ff' }}>{latestCyq['获利盘比例']?.toFixed(1) ?? 'N/A'}%</Text></Col>
              <Col span={6}><Text type="secondary">平均成本</Text><br /><Text strong style={{ fontSize: 20 }}>¥{latestCyq['平均成本']?.toFixed(2) ?? 'N/A'}</Text></Col>
              <Col span={6}><Text type="secondary">90%集中度</Text><br /><Text strong>{latestCyq['90%成本集中度']?.toFixed(1) ?? 'N/A'}%</Text></Col>
              <Col span={6}><Text type="secondary">70%集中度</Text><br /><Text strong>{latestCyq['70%成本集中度']?.toFixed(1) ?? 'N/A'}%</Text></Col>
            </Row>
            <RiskMeter value={cyq90} low={0} high={40} unit="%" />
            <ConclusionBox level={cyqLevel} text={
              cyq90 < 10 ? '筹码高度集中→外部收购方难以从二级市场收集足够股份'
              : cyq90 < 20 ? '筹码相对集中→控制权稳定，但增持收集成本较高'
              : '筹码较为分散→利于收购方在二级市场收集筹码'} />
          </>
        ) : <Text type="secondary">暂无集中度数据</Text>}
      </div>

      {/* 高管持股变动 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={5}>👔 高管持股异常变化</Title>
        {insiderHoldings.length > 0 ? (
          <>
            {insiderTrend && <ReactECharts option={insiderTrend} style={{ height: 120 }} opts={{ renderer: 'canvas' }} notMerge />}
            <Table columns={[
              { title: '姓名', dataIndex: '姓名', width: 80 },
              { title: '职务', dataIndex: '职务', width: 100 },
              { title: '变动', dataIndex: '变动数量', width: 100,
                render: (v: number) => <Text style={{ color: v > 0 ? '#cf1322' : '#3f8600' }}>{v > 0 ? '+' : ''}{v?.toLocaleString()}</Text> },
              { title: '日期', dataIndex: '变动日期', width: 90 }
            ]} dataSource={insiderHoldings.slice(0, 5)} rowKey={(_, i) => `i_${i}`} pagination={false} size="small" />
            <ConclusionBox level={hasInsiderReduce ? 'high' : 'low'} text={
              hasInsiderReduce && hasInsiderInc ? '增减持并存→需关注减持方是否为核心管理层成员'
              : hasInsiderReduce ? '存在高管减持→需关注是否为核心人员、比例是否异常，可能是变更前兆'
              : '无异常增减持→控制权结构相对稳定'} />
          </>
        ) : <Text type="secondary">暂无高管持股变动数据</Text>}
      </div>

      {/* 融资融券 */}
      <div>
        <Title level={5}>💳 融资融券余额变化</Title>
        {margin ? (
          <>
            <Row gutter={16}>
              <Col span={8}><Text type="secondary">融资余额</Text><br /><Text strong style={{ fontSize: 20 }}>¥{(margin['融资余额(元)'] / 1e8)?.toFixed(2) ?? 'N/A'}亿</Text></Col>
              <Col span={8}><Text type="secondary">融券余额</Text><br /><Text strong style={{ fontSize: 20 }}>¥{(margin['融券余额(元)'] / 1e8)?.toFixed(2) ?? 'N/A'}亿</Text></Col>
              <Col span={8}><Text type="secondary">净融资</Text><br /><Tag color={(margin['融资余额(元)'] - (margin['融券余额(元)'] || 0)) > 0 ? 'blue' : 'red'}>{(margin['融资余额(元)'] - (margin['融券余额(元)'] || 0)) / 1e8 > 0 ? '融资主导' : '融券偏多'}</Tag></Col>
            </Row>
            <RiskMeter value={Math.min(100, marginAmount / 1e8 / 2)} low={0} high={50} unit="亿" />
            <ConclusionBox level={marginAmount > 5e10 ? 'high' : marginAmount > 1e10 ? 'mid' : 'low'} text={
              marginAmount > 5e10 ? '融资余额极高→杠杆资金博弈剧烈，控制权争夺可能加剧'
              : marginAmount > 1e10 ? '融资余额适中→市场有分歧但未极端'
              : '融资余额较低→杠杆参与度小，控制权博弈不明显'} />
          </>
        ) : <Text type="secondary">暂无融资融券数据</Text>}
      </div>

    </Card>
  );
};

export default RiskIndicatorsPanel;
