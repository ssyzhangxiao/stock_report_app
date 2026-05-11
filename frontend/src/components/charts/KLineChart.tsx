import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, Tag, Space } from 'antd';
import { KLineData } from '../../types/stock';

interface Props { data: KLineData[]; height?: number; }

const MA_LINES = [
  { key: 'ma5', label: 'MA5', color: '#ff7f0e' },
  { key: 'ma10', label: 'MA10', color: '#2ca02c' },
  { key: 'ma20', label: 'MA20', color: '#1f77b4' },
  { key: 'ma60', label: 'MA60', color: '#9467bd' },
];

const KLineChart: React.FC<Props> = ({ data, height = 340 }) => {
  const [activeMas, setActiveMas] = useState<string[]>(['ma5', 'ma10', 'ma20', 'ma60']);

  const { option, maValues } = useMemo(() => {
    if (!data || data.length === 0) return { option: {}, maValues: {} as Record<string, number> };
    const dates = data.map(d => d.date);
    const values = data.map(d => [d.open, d.close, d.low, d.high]);
    const volumes = data.map((d, i) => [i, d.volume, d.open > d.close ? 1 : -1]);

    const maData: Record<string, (number | null)[]> = {};
    MA_LINES.forEach(m => { maData[m.key] = data.map(d => (d as any)[m.key] || null); });

    const last = data[data.length - 1];
    const mv: Record<string, number> = {};
    MA_LINES.forEach(m => { const v = (last as any)[m.key]; if (v != null) mv[m.key] = v; });

    const series: any[] = [
      {
        name: '日K', type: 'candlestick', data: values,
        itemStyle: { color: 'var(--color-up)', color0: '#3f8600', borderColor: '#cf1322', borderColor0: '#3f8600' },
        markPoint: { data: [{ type: 'max', name: '最高' }, { type: 'min', name: '最低' }] }
      },
      {
        name: '成交量', type: 'bar', xAxisIndex: 1, yAxisIndex: 1,
        data: volumes.map(v => ({ value: v[1], itemStyle: { color: v[2] > 0 ? '#cf1322' : '#3f8600' } }))
      },
    ];
    MA_LINES.forEach(m => {
      if (activeMas.includes(m.key)) {
        series.push({
          name: m.label, type: 'line', data: maData[m.key], smooth: true,
          lineStyle: { width: 1.5, color: m.color, opacity: 0.7 }, symbol: 'none'
        });
      }
    });

    return {
      option: {
        animation: false, backgroundColor: '#fff',
        legend: { bottom: 0, left: 'center', data: ['日K', ...MA_LINES.filter(m => activeMas.includes(m.key)).map(m => m.label), '成交量'], itemWidth: 8, itemHeight: 8, fontSize: 11 },
        tooltip: {
          trigger: 'axis', axisPointer: { type: 'cross' },
          formatter: (params: any[]) => {
            const idx = params[0].dataIndex; const d = data[idx];
            if (!d) return '';
            const vol = (d.volume / 10000).toFixed(2);
            const chg = (((d.close - d.open) / d.open) * 100).toFixed(2);
            let html = `<div><b>${d.date.slice(2)}</b></div><div>开 ${d.open.toFixed(2)} 收 ${d.close.toFixed(2)}</div><div>高 ${d.high.toFixed(2)} 低 ${d.low.toFixed(2)}</div><div>量 ${vol}万 幅 ${chg}%</div>`;
            MA_LINES.forEach(m => { const v = (d as any)[m.key]; if (v != null) html += `<div>${m.label} ${v.toFixed(2)}</div>`; });
            return html;
          }
        },
        grid: [{ left: '6%', right: '4%', top: '5%', height: '58%' }, { left: '6%', right: '4%', top: '68%', height: '16%' }],
        xAxis: [{ type: 'category', data: dates, scale: true, boundaryGap: false, axisLabel: { rotate: 0, fontSize: 11, interval: Math.floor(dates.length / 8), formatter: (v: string) => v.slice(5) } },
        { type: 'category', gridIndex: 1, data: dates, axisLabel: { show: false } }],
        yAxis: [{ scale: true, splitArea: { show: true }, axisLabel: { fontSize: 11 } }, { scale: true, gridIndex: 1, show: false }],
        dataZoom: [{ type: 'inside', xAxisIndex: [0, 1], start: 30, end: 100 },
        { show: true, xAxisIndex: [0, 1], type: 'slider', top: '88%', start: 30, end: 100, height: 10 }],
        series,
      },
      maValues: mv,
    };
  }, [data, activeMas]);

  if (!data || data.length === 0) return <Card>暂无数据</Card>;

  return (
    <div>
      <Space size={[4, 4]} style={{ marginBottom: 6, flexWrap: 'wrap' }}>
        {MA_LINES.map(m => (
          <Tag key={m.key} color={activeMas.includes(m.key) ? undefined : 'default'}
            style={{ cursor: 'pointer', fontSize: 11 }}
            onClick={() => setActiveMas(prev => prev.includes(m.key) ? prev.filter(k => k !== m.key) : [...prev, m.key])}>
            {m.label} {maValues[m.key] != null ? maValues[m.key].toFixed(1) : '--'}
          </Tag>
        ))}
        <Tag color="default" style={{ fontSize: 11 }}>最新 {data[data.length - 1]?.close.toFixed(2) ?? '--'}</Tag>
      </Space>
      <ReactECharts option={option} style={{ height }} opts={{ renderer: 'canvas' }} notMerge lazyUpdate />
    </div>
  );
};

export default KLineChart;
