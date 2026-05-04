import React from 'react';
import { Card, Typography } from 'antd';
import ReactECharts from 'echarts-for-react';

const { Text } = Typography;

interface SensitivityData {
  waccValues: number[]; // WACC值数组
  growthValues: number[]; // 增长率值数组
  matrix: number[][]; // 估值矩阵 [growthIndex][waccIndex]
  currentValue?: number; // 当前价格
}

interface SensitivityHeatmapProps {
  data: SensitivityData;
  title?: string;
}

const SensitivityHeatmap: React.FC<SensitivityHeatmapProps> = ({ data, title = 'DCF 敏感性分析' }) => {
  const { waccValues, growthValues, matrix, currentValue } = data;

  const option: any = {
    tooltip: {
      position: 'top',
      formatter: (params: any) => {
        const wacc = waccValues[params.data[0]];
        const growth = growthValues[params.data[1]];
        const value = params.data[2];
        return `WACC: ${wacc}%<br/>增长率: ${growth}%<br/>估值: ¥${value.toFixed(2)}`;
      }
    },
    grid: {
      left: 80,
      right: 80,
      top: 40,
      bottom: 60
    },
    xAxis: {
      type: 'category',
      data: waccValues.map(v => `${v}%`),
      splitArea: {
        show: true
      },
      axisLabel: {
        fontSize: 11
      },
      name: 'WACC',
      nameLocation: 'middle',
      nameGap: 30
    },
    yAxis: {
      type: 'category',
      data: growthValues.map(v => `${v}%`),
      splitArea: {
        show: true
      },
      axisLabel: {
        fontSize: 11
      },
      name: '永续增长率',
      nameLocation: 'middle',
      nameGap: 50
    },
    visualMap: {
      min: Math.min(...matrix.flat()),
      max: Math.max(...matrix.flat()),
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      inRange: {
        color: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#fee090', '#fdae61', '#f46d43', '#d73027']
      },
      text: ['高', '低']
    },
    series: [{
      name: '估值',
      type: 'heatmap',
      data: matrix.flatMap((row, yIdx) =>
        row.map((value, xIdx) => [xIdx, yIdx, value])
      ),
      label: {
        show: true,
        formatter: (params: any) => `¥${params.data[2].toFixed(0)}`,
        fontSize: 10
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }]
  };

  // 如果有当前价格，添加标记线
  if (currentValue) {
    option.series[0].markLine = {
      data: [{
        yAxis: currentValue,
        label: {
          formatter: `当前价格: ¥${currentValue.toFixed(2)}`
        }
      }]
    };
  }

  return (
    <Card title={title} style={{ marginBottom: 16 }}>
      <div style={{ marginBottom: 12 }}>
        <Text type="secondary">
          热力图展示了不同WACC和永续增长率组合下的估值结果。颜色越深表示估值越高。
        </Text>
      </div>
      <ReactECharts option={option} style={{ height: 400 }} />
    </Card>
  );
};

export default SensitivityHeatmap;
