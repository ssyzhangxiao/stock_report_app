import React from 'react';
import { Card, Row, Col, Statistic, Tag, Typography, Divider } from 'antd';
import ReactECharts from 'echarts-for-react';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

interface TargetPricePoint {
  日期: string;
  目标价: number;
  评级: string;
  机构: string;
}

interface AnalystConsensus {
  stock_code?: string;
  stock_name?: string;
  latest_rating?: string;
  target_price?: number;
  rating_date?: string;
  industry?: string;
  error?: string;
  target_price_history?: TargetPricePoint[];
}

interface AnalystConsensusCardProps {
  consensus: AnalystConsensus;
  currentPrice?: number;
}

const AnalystConsensusCard: React.FC<AnalystConsensusCardProps> = ({ consensus, currentPrice }) => {
  if (consensus.error || !consensus.latest_rating) {
    return (
      <Card title="👥 分析师评级" style={{ borderRadius: 12, marginBottom: 20 }}>
        <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
          {consensus.error || '暂无分析师评级数据'}
        </div>
      </Card>
    );
  }

  const targetPrice = consensus.target_price || 0;
  const upside = currentPrice && targetPrice
    ? ((targetPrice - currentPrice) / currentPrice * 100).toFixed(2)
    : null;

  const getRatingColor = (rating: string) => {
    const r = rating.toLowerCase();
    if (r.includes('买入') || r.includes('强烈推荐')) return 'success';
    if (r.includes('增持') || r.includes('推荐')) return 'processing';
    if (r.includes('持有') || r.includes('中性')) return 'default';
    if (r.includes('减持') || r.includes('卖出')) return 'error';
    return 'default';
  };

  // 散点图
  const history = consensus.target_price_history || [];
  const hasScatter = history.length > 1;

  const scatterOption = hasScatter ? {
    tooltip: {
      trigger: 'item' as const,
      formatter: (params: any) => {
        const d = history[params.dataIndex];
        return `${d.日期}<br/>目标价: ¥${d.目标价}<br/>评级: ${d.评级}<br/>${d.机构}`;
      }
    },
    grid: { left: '8%', right: '8%', top: 30, bottom: 40 },
    xAxis: {
      type: 'category' as const,
      data: history.map(d => d.日期.slice(5)),
      axisLabel: { rotate: 45, fontSize: 10, interval: Math.floor(history.length / 6) },
    },
    yAxis: {
      type: 'value' as const,
      name: '目标价(元)',
      nameTextStyle: { fontSize: 10 },
      axisLabel: { fontSize: 10 },
      splitLine: { lineStyle: { type: 'dashed' as const } },
    },
    series: [{
      type: 'scatter' as const,
      symbolSize: 10,
      data: history.map(d => d.目标价),
      itemStyle: {
        color: (params: any) => {
          const r = history[params.dataIndex]?.评级 || '';
          return r.includes('买入') ? '#52c41a' : r.includes('增持') ? '#1890ff' : '#faad14';
        }
      },
    }],
    // 当前股价参考线
    ...(currentPrice ? {
      series: [{
        type: 'scatter' as const,
        symbolSize: 10,
        data: history.map(d => d.目标价),
        itemStyle: {
          color: (params: any) => {
            const r = history[params.dataIndex]?.评级 || '';
            return r.includes('买入') ? '#52c41a' : r.includes('增持') ? '#1890ff' : '#faad14';
          }
        },
        markLine: {
          silent: true,
          data: [{ yAxis: currentPrice, label: { formatter: `现价 ${currentPrice}`, color: '#cf1322' } }],
          lineStyle: { color: '#cf1322', type: 'dashed' as const },
        }
      }],
    } : {}),
  } : null;

  return (
    <Card title="👥 分析师一致性预期" style={{ borderRadius: 12, marginBottom: 20 }}>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Statistic title="最新评级" value={consensus.latest_rating}
            prefix={<Tag color={getRatingColor(consensus.latest_rating)}>{consensus.latest_rating}</Tag>}
            valueStyle={{ fontSize: 18 }} />
        </Col>
        <Col span={8}>
          <Statistic title="目标价" value={targetPrice} precision={2} suffix="元"
            valueStyle={{ color: '#1890ff' }} />
        </Col>
        <Col span={8}>
          <Statistic title="评级日期" value={consensus.rating_date || 'N/A'} valueStyle={{ fontSize: 16 }} />
        </Col>
      </Row>

      {upside !== null && (
        <>
          <Divider />
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={12}>
              <Statistic title="当前价格" value={currentPrice} precision={2} suffix="元" />
            </Col>
            <Col span={12}>
              <Statistic title="上涨空间" value={parseFloat(upside)} precision={2} suffix="%"
                prefix={parseFloat(upside) >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                valueStyle={{ color: parseFloat(upside) >= 0 ? '#cf1322' : '#3f8600', fontSize: 24, fontWeight: 'bold' }} />
            </Col>
          </Row>
        </>
      )}

      {hasScatter && (
        <>
          <Divider />
          <Title level={5} style={{ marginTop: 8 }}>📊 分析师目标价分布</Title>
          <ReactECharts option={scatterOption!} style={{ height: 280, width: '100%' }}
            opts={{ renderer: 'canvas' }} notMerge />
        </>
      )}

      <Divider />
      <Row gutter={16}>
        <Col span={12}><Text type="secondary">股票代码：</Text><Text strong>{consensus.stock_code || 'N/A'}</Text></Col>
        <Col span={12}><Text type="secondary">所属行业：</Text><Tag color="blue">{consensus.industry || 'N/A'}</Tag></Col>
      </Row>

      <div style={{ marginTop: 24, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          ⚠️ 分析师评级仅供参考。绿色=买入，蓝色=增持，黄色=中性。虚线为当前股价。
        </Text>
      </div>
    </Card>
  );
};

export default AnalystConsensusCard;
