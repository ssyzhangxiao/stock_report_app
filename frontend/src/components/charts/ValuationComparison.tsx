import React from 'react';
import { Card, Typography } from 'antd';
import ReactECharts from 'echarts-for-react';

const { Text } = Typography;

interface ValuationModel {
  name: string;
  value: number;
  color?: string;
}

interface ValuationComparisonProps {
  models: ValuationModel[];
  currentPrice?: number;
  title?: string;
}

const ValuationComparison: React.FC<ValuationComparisonProps> = ({ 
  models, 
  currentPrice, 
  title = '多模型估值对比' 
}) => {
  const option: any = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: (params: any) => {
        const data = params[0];
        let result = `${data.name}<br/>`;
        result += `估值: ¥${data.value.toFixed(2)}`;
        if (currentPrice) {
          const diff = data.value - currentPrice;
          const pct = ((diff / currentPrice) * 100).toFixed(2);
          result += `<br/>较当前价格: ${diff >= 0 ? '+' : ''}¥${diff.toFixed(2)} (${pct}%)`;
        }
        return result;
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: models.map(m => m.name),
      axisLabel: {
        fontSize: 11,
        rotate: 15
      }
    },
    yAxis: {
      type: 'value',
      name: '估值 (元)',
      axisLabel: {
        formatter: '¥{value}'
      }
    },
    series: [{
      name: '估值',
      type: 'bar',
      data: models.map((m, idx) => ({
        value: m.value,
        itemStyle: {
          color: m.color || ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4'][idx % 8]
        }
      })),
      barWidth: '35%',
      label: {
        show: true,
        position: 'top',
        formatter: (params: any) => `¥${params.value.toFixed(0)}`
      }
    }]
  };

  // 如果有当前价格，添加参考线
  if (currentPrice) {
    option.series.push({
      type: 'line',
      data: models.map(() => currentPrice),
      lineStyle: {
        color: '#ff4d4f',
        type: 'dashed',
        width: 2
      },
      symbol: 'none',
      markLine: {
        silent: true,
        data: [{
          yAxis: currentPrice,
          label: {
            formatter: `当前价格: ¥${currentPrice.toFixed(2)}`,
            position: 'insideEndTop'
          },
          lineStyle: {
            color: '#ff4d4f',
            type: 'dashed'
          }
        }]
      }
    });
  }

  // 计算平均估值
  const avgValuation = models.reduce((sum, m) => sum + m.value, 0) / models.length;
  const upside = currentPrice ? (((avgValuation - currentPrice) / currentPrice) * 100).toFixed(2) : null;

  return (
    <Card title={title} style={{ marginBottom: 16 }}>
      {currentPrice && (
        <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
          <Text strong>当前价格: </Text>
          <Text style={{ color: '#ff4d4f', fontWeight: 'bold' }}>¥{currentPrice.toFixed(2)}</Text>
          <Text style={{ marginLeft: 24 }} strong>平均估值: </Text>
          <Text style={{ color: '#52c41a', fontWeight: 'bold' }}>¥{avgValuation.toFixed(2)}</Text>
          {upside && (
            <Text style={{ marginLeft: 24 }} strong>上涨空间: </Text>
          )}
          {upside && (
            <Text style={{ color: parseFloat(upside) >= 0 ? '#52c41a' : '#ff4d4f', fontWeight: 'bold' }}>
              {parseFloat(upside) >= 0 ? '+' : ''}{upside}%
            </Text>
          )}
        </div>
      )}
      <ReactECharts option={option} style={{ height: 400 }} />
      <div style={{ marginTop: 12 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
           不同估值模型结果可能存在差异，建议综合参考并结合公司基本面判断
        </Text>
      </div>
    </Card>
  );
};

export default ValuationComparison;
