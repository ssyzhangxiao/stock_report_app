import React from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, Typography, Tag } from 'antd';
import { BarChartOutlined, LineChartOutlined, PieChartOutlined, RadarChartOutlined } from '@ant-design/icons';
import type { ChartConfig, ChartType } from './SmartChartDetector';

const { Text } = Typography;

interface Props {
  config: ChartConfig;
  height?: number;
}

const CHART_TYPE_LABELS: Record<ChartType, { label: string; icon: React.ReactNode }> = {
  line: { label: '折线图', icon: <LineChartOutlined /> },
  bar: { label: '柱状图', icon: <BarChartOutlined /> },
  barH: { label: '条形图', icon: <BarChartOutlined rotate={90} /> },
  pie: { label: '饼图', icon: <PieChartOutlined /> },
  radar: { label: '雷达图', icon: <RadarChartOutlined /> },
  area: { label: '面积图', icon: <LineChartOutlined /> },
  scatter: { label: '散点图', icon: <LineChartOutlined /> },
  none: { label: '', icon: null },
};

const darkTextColor = '#8892a4';
const darkGridColor = '#2a3347';

function buildLineOption(config: ChartConfig, isArea = false) {
  return {
    tooltip: { trigger: 'axis' as const },
    legend: {
      data: config.series.map(s => s.name),
      textStyle: { color: darkTextColor, fontSize: 12 },
      top: 0,
    },
    grid: { left: 60, right: 30, bottom: 40, top: 40 },
    xAxis: {
      type: 'category' as const,
      data: config.categories,
      axisLabel: { color: darkTextColor, fontSize: 11, rotate: config.categories.length > 6 ? 30 : 0 },
      axisLine: { lineStyle: { color: darkGridColor } },
    },
    yAxis: {
      type: 'value' as const,
      name: config.yAxisName || '',
      axisLabel: { color: darkTextColor, fontSize: 11 },
      splitLine: { lineStyle: { color: darkGridColor } },
    },
    series: config.series.map((s) => ({
      name: s.name,
      type: isArea ? 'line' : 'line',
      data: s.data,
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { color: s.color, width: 2 },
      itemStyle: { color: s.color },
      areaStyle: isArea ? { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: s.color + '40' }, { offset: 1, color: s.color + '05' }] } } : undefined,
    })),
  };
}

function buildBarOption(config: ChartConfig, horizontal = false) {
  const axisKey = horizontal ? 'yAxis' : 'xAxis';
  const dataKey = horizontal ? 'xAxis' : 'yAxis';

  return {
    tooltip: { trigger: 'axis' as const },
    legend: {
      data: config.series.map(s => s.name),
      textStyle: { color: darkTextColor, fontSize: 12 },
      top: 0,
    },
    grid: { left: horizontal ? 100 : 60, right: 30, bottom: 40, top: 40 },
    [axisKey]: {
      type: 'category' as const,
      data: config.categories,
      axisLabel: { color: darkTextColor, fontSize: 11, rotate: horizontal ? 0 : (config.categories.length > 5 ? 30 : 0) },
      axisLine: { lineStyle: { color: darkGridColor } },
    },
    [dataKey]: {
      type: 'value' as const,
      name: config.yAxisName || '',
      axisLabel: { color: darkTextColor, fontSize: 11 },
      splitLine: { lineStyle: { color: darkGridColor } },
    },
    series: config.series.map((s) => ({
      name: s.name,
      type: 'bar',
      data: s.data.map((v) => ({
        value: v,
        itemStyle: {
          color: s.color || undefined,
          borderRadius: horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0],
        },
      })),
      barMaxWidth: 40,
    })),
  };
}

function buildPieOption(config: ChartConfig) {
  const series = config.series[0];
  if (!series) return {};

  const pieData = config.categories.map((cat, i) => ({
    name: cat,
    value: series.data[i] || 0,
  }));

  return {
    tooltip: { trigger: 'item' as const, formatter: '{b}: {c} ({d}%)' },
    legend: {
      orient: 'vertical' as const,
      right: 10,
      top: 'center',
      textStyle: { color: darkTextColor, fontSize: 11 },
    },
    series: [{
      type: 'pie',
      radius: ['45%', '75%'],
      center: ['40%', '50%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 4, borderColor: '#1a1f2e', borderWidth: 2 },
      label: { show: false },
      emphasis: {
        label: { show: true, fontSize: 14, fontWeight: 'bold' },
      },
      data: pieData,
      color: ['#4da6ff', '#95de64', '#ffc53d', '#ff7a45', '#b37feb', '#5cdbd3', '#ff85c0', '#ffd666', '#87e8de', '#d3adf7'],
    }],
  };
}

function buildRadarOption(config: ChartConfig) {
  const indicator = config.categories.map(cat => ({
    name: cat.length > 6 ? cat.slice(0, 6) + '...' : cat,
    max: 10,
  }));

  return {
    tooltip: {},
    legend: {
      data: config.series.map(s => s.name),
      textStyle: { color: darkTextColor, fontSize: 12 },
      bottom: 0,
    },
    radar: {
      indicator,
      center: ['50%', '55%'],
      radius: '60%',
      axisName: { color: darkTextColor, fontSize: 10 },
      splitArea: { areaStyle: { color: ['#1a1f2e', '#1a1f2e'] } },
      splitLine: { lineStyle: { color: darkGridColor } },
      axisLine: { lineStyle: { color: darkGridColor } },
    },
    series: config.series.map(s => ({
      name: s.name,
      type: 'radar',
      data: [{ value: s.data, name: s.name }],
      symbol: 'circle',
      symbolSize: 4,
      lineStyle: { color: s.color, width: 2 },
      areaStyle: { color: s.color + '20' },
      itemStyle: { color: s.color },
    })),
  };
}

const SmartChart: React.FC<Props> = ({ config, height = 320 }) => {
  if (!config.canChart) return null;

  let option = {};
  switch (config.type) {
    case 'line':
      option = buildLineOption(config);
      break;
    case 'area':
      option = buildLineOption(config, true);
      break;
    case 'bar':
      option = buildBarOption(config);
      break;
    case 'barH':
      option = buildBarOption(config, true);
      break;
    case 'pie':
      option = buildPieOption(config);
      break;
    case 'radar':
      option = buildRadarOption(config);
      break;
    default:
      return null;
  }

  const typeInfo = CHART_TYPE_LABELS[config.type];

  return (
    <Card
      size="small"
      style={{ borderRadius: 10, marginBottom: 16, background: '#1a1f2e' }}
      styles={{ body: { padding: '12px 16px' } }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {typeInfo.icon}
          <Text style={{ color: '#e0e0e0', fontSize: 14, fontWeight: 600 }}>
            {config.title || '数据图表'}
          </Text>
          <Tag color="blue" style={{ marginLeft: 4, fontSize: 11 }}>
            {typeInfo.label}
          </Tag>
        </div>
      }
    >
      <ReactECharts
        option={option}
        style={{ height }}
        opts={{ renderer: 'canvas' }}
        theme="dark"
      />
    </Card>
  );
};

export default SmartChart;