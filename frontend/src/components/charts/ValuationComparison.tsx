import React, { useMemo } from 'react';
import { Card, Typography, Row, Col } from 'antd';
import ReactECharts from 'echarts-for-react';
import type { ValuationData, FinancialIndicator } from '../../types/stock';

const { Text } = Typography;

function parseMarketCap(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  const s = String(val).trim();
  if (!s) return 0;
  const numMatch = s.match(/^([\d.]+)/);
  if (!numMatch) return 0;
  let num = parseFloat(numMatch[1]);
  if (s.includes('万亿')) num *= 1e12;
  else if (s.includes('亿')) num *= 1e8;
  else if (s.includes('万')) num *= 1e4;
  return num;
}

interface ValuationComparisonProps {
  valuation: ValuationData;
  currentPrice?: number;
  financialIndicators: FinancialIndicator[];
  priceHistory?: any[];
  title?: string;
}

const ValuationComparison: React.FC<ValuationComparisonProps> = ({
  valuation,
  currentPrice,
  financialIndicators,
  priceHistory,
  title = '估值对比'
}) => {
  const option = useMemo(() => {
    const fi = financialIndicators as any[];
    const hasData = fi && fi.length >= 2;

    const annualData = hasData ? fi.filter(r => {
      const dateStr = String(r['日期'] || '');
      return dateStr.includes('12-31');
    }) : [];

    const useAnnualData = annualData && annualData.length >= 2;
    const dataToUse = useAnnualData ? annualData : (hasData ? fi : []);

    const currentMarketCapYuan = (valuation as any).market_cap_value
      || parseMarketCap(valuation.market_cap);
    const totalShares = currentPrice && currentMarketCapYuan > 0
      ? currentMarketCapYuan / currentPrice
      : 0;

    const priceByYear: Record<string, number> = {};
    if (priceHistory && priceHistory.length > 0 && totalShares > 0) {
      const yearCandidates: Record<string, Array<{ date: string; close: number; diff: number }>> = {};
      for (const row of priceHistory) {
        const d = String(row['日期'] || row['date'] || '');
        const year = d.slice(0, 4);
        const close = parseFloat(String(row['收盘'] || row['close'] || 0));
        if (!close || close <= 0) continue;
        const target = `${year}-12-31`;
        const diff = Math.abs(new Date(d).getTime() - new Date(target).getTime());
        if (!yearCandidates[year]) yearCandidates[year] = [];
        yearCandidates[year].push({ date: d, close, diff });
      }
      for (const [year, candidates] of Object.entries(yearCandidates)) {
        candidates.sort((a, b) => a.diff - b.diff);
        priceByYear[year] = candidates[0].close;
      }
    }

    const marketCapHistory: (number | null)[] = [];
    const peHistory: number[] = [];
    const displayDates: string[] = [];

    for (const r of dataToUse) {
      const dateStr = String(r['日期'] || '');
      const year = dateStr.slice(0, 4);
      displayDates.push(year);

      const yearClose = priceByYear[year];
      if (yearClose && totalShares > 0) {
        marketCapHistory.push(yearClose * totalShares);
      } else {
        const totalSharesFromRow = r['总股本'] || r['total_shares'];
        const closeFromRow = r['收盘价'] || r['close'];
        if (totalSharesFromRow && closeFromRow) {
          marketCapHistory.push(parseFloat(String(totalSharesFromRow)) * parseFloat(String(closeFromRow)));
        } else {
          marketCapHistory.push(null);
        }
      }

      const eps = r['每股收益'];
      if (eps && yearClose) {
        peHistory.push(Math.min(Math.max(yearClose / eps, 5), 100));
      } else if (eps && currentPrice) {
        peHistory.push(Math.min(Math.max(currentPrice / eps, 5), 100));
      } else {
        peHistory.push(valuation.pe_ratio || 20);
      }
    }

    const validMarketCapHistory = marketCapHistory.filter((v: any) => v !== null && v > 0);

    const marketCapInYi = validMarketCapHistory.length > 0
      ? validMarketCapHistory.map((v) => parseFloat(((v as number) / 1e8).toFixed(0)))
      : [];

    const series: any[] = [
      {
        name: '总市值(亿)',
        type: 'bar',
        data: marketCapInYi,
        yAxisIndex: 0,
        barWidth: '50%',
        itemStyle: {
          color: '#667eea',
          borderRadius: [4, 4, 0, 0],
        },
        label: {
          show: true,
          position: 'top',
          fontSize: 10,
          formatter: (p: any) => {
            const val = p.value;
            if (val >= 10000) return (val / 10000).toFixed(1) + '万亿';
            return val + '亿';
          },
          color: '#333',
        },
      },
    ];

    if (peHistory.length > 0) {
      series.push({
        name: 'PE',
        type: 'line',
        data: peHistory,
        yAxisIndex: 1,
        smooth: true,
        lineStyle: { width: 2, color: '#ff6b6b' },
        symbol: 'circle',
        symbolSize: 8,
        itemStyle: { color: '#ff6b6b' },
        label: {
          show: true,
          position: 'top',
          fontSize: 10,
          formatter: '{c}x',
          color: '#ff6b6b',
        },
        min: 0,
        max: (value: any) => Math.ceil(value.max * 1.1),
      });
    }

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        formatter: (params: any) => {
          let result = `${params[0].axisValue}年<br/>`;
          params.forEach((p: any) => {
            if (p.seriesName === '总市值(亿)') {
              const val = p.value;
              if (val >= 10000) {
                result += `${p.marker}总市值: ${(val / 10000).toFixed(2)}万亿<br/>`;
              } else {
                result += `${p.marker}总市值: ${val}亿<br/>`;
              }
            } else if (p.seriesName === 'PE') {
              result += `${p.marker}PE: ${Math.round(p.value)}x<br/>`;
            }
          });
          return result;
        },
      },
      legend: {
        data: ['总市值(亿)', 'PE'],
        bottom: 2,
        icon: 'roundRect',
        itemWidth: 10,
        itemHeight: 8,
        fontSize: 11,
      },
      grid: {
        left: '8%',
        right: '8%',
        top: '12%',
        bottom: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: displayDates,
        axisLabel: { fontSize: 10 },
      },
      yAxis: [
        {
          type: 'value',
          name: '总市值',
          position: 'left',
          nameTextStyle: { fontSize: 10 },
          axisLabel: {
            fontSize: 10,
            formatter: (v: number) => {
              if (v >= 10000) return (v / 10000).toFixed(1) + '万亿';
              return v + '亿';
            },
          },
          splitLine: { lineStyle: { type: 'dashed' } },
        },
        {
          type: 'value',
          name: 'PE (倍)',
          position: 'right',
          nameTextStyle: { fontSize: 10 },
          axisLabel: { fontSize: 10 },
          splitLine: { show: false },
        },
      ],
      series,
    };
  }, [valuation, currentPrice, financialIndicators, priceHistory]);

  const currentPE = valuation.pe_ratio;
  const industryPE = valuation.industry_pe;
  const currentMarketCapYuan = (valuation as any).market_cap_value
    || parseMarketCap(valuation.market_cap);
  const marketCapYi = currentMarketCapYuan > 0 ? currentMarketCapYuan / 1e8 : 0;
  const marketCapDisplay = marketCapYi >= 10000
    ? (marketCapYi / 10000).toFixed(2) + ' 万亿'
    : marketCapYi.toFixed(0) + ' 亿';

  return (
    <Card title={title} style={{ marginBottom: 16 }}>
      <div style={{ marginBottom: 12, padding: 12, background: 'var(--bg-elevated)', borderRadius: 4 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Text type="secondary" style={{ fontSize: 12 }}>当前价格: </Text>
            <Text style={{ color: '#ff4d4f', fontWeight: 'bold' }}>
              ¥{currentPrice?.toFixed(2) || '--'}
            </Text>
          </Col>
          <Col span={6}>
            <Text type="secondary" style={{ fontSize: 12 }}>当前PE: </Text>
            <Text style={{ color: '#1890ff', fontWeight: 'bold' }}>
              {typeof currentPE === 'number' ? `${currentPE.toFixed(2)}x` : '--'}
            </Text>
          </Col>
          <Col span={6}>
            <Text type="secondary" style={{ fontSize: 12 }}>行业PE: </Text>
            <Text style={{ color: '#52c41a', fontWeight: 'bold' }}>
              {typeof industryPE === 'number' ? `${industryPE.toFixed(2)}x` : '--'}
            </Text>
          </Col>
          <Col span={6}>
            <Text type="secondary" style={{ fontSize: 12 }}>总市值: </Text>
            <Text style={{ color: '#667eea', fontWeight: 'bold' }}>
              {marketCapDisplay}
            </Text>
          </Col>
        </Row>
      </div>
      <ReactECharts option={option} style={{ height: 320 }} />
      <div style={{ marginTop: 12 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          💡 提示：柱状图为年度总市值（12-31年报），折线为PE估值倍数，关注市值与PE的匹配关系
        </Text>
      </div>
    </Card>
  );
};

export default ValuationComparison;
