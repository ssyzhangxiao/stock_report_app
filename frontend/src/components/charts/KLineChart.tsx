import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card } from 'antd';
import { KLineData } from '../../api/stockApi';

interface KLineChartProps {
  data: KLineData[];
  height?: number;
}

const KLineChart: React.FC<KLineChartProps> = ({ data, height = 600 }) => {
  const option = useMemo(() => {
    if (!data || data.length === 0) {
      return {};
    }

    // 准备数据
    const dates = data.map(item => item.date);
    const values = data.map(item => [
      item.open,
      item.close,
      item.low,
      item.high
    ]);
    const volumes = data.map((item, index) => [
      index,
      item.volume,
      item.open > item.close ? 1 : -1
    ]);

    const ma5Data = data.map(item => item.ma5 || null);
    const ma20Data = data.map(item => item.ma20 || null);
    const ma60Data = data.map(item => item.ma60 || null);

    return {
      animation: false,
      legend: {
        bottom: 10,
        left: 'center',
        data: ['日K', 'MA5', 'MA20', 'MA60']
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        },
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderColor: '#ccc',
        borderWidth: 1,
        textStyle: {
          color: '#333'
        },
        formatter: (params: any) => {
          const item = params[0];
          const dataIndex = item.dataIndex;
          const stockData = data[dataIndex];
          
          if (!stockData) return '';
          
          const date = stockData.date;
          const open = stockData.open.toFixed(2);
          const close = stockData.close.toFixed(2);
          const high = stockData.high.toFixed(2);
          const low = stockData.low.toFixed(2);
          const volume = (stockData.volume / 10000).toFixed(2) + '万';
          const change = ((stockData.close - stockData.open) / stockData.open * 100).toFixed(2);
          
          return `
            <div style="padding: 8px;">
              <div style="font-weight: bold; margin-bottom: 8px;">${date.slice(2)}</div>
              <div>开盘: ${open}</div>
              <div>收盘: ${close}</div>
              <div>最高: ${high}</div>
              <div>最低: ${low}</div>
              <div>成交量: ${volume}</div>
              <div style="color: ${parseFloat(change) >= 0 ? '#cf1322' : '#3f8600'};">
                涨跌幅: ${parseFloat(change) >= 0 ? '+' : ''}${change}%
              </div>
            </div>
          `;
        }
      },
      axisPointer: {
        link: [{ xAxisIndex: 'all' }],
        label: {
          backgroundColor: '#777'
        }
      },
      grid: [
        {
          left: '10%',
          right: '8%',
          height: '50%'
        },
        {
          left: '10%',
          right: '8%',
          top: '63%',
          height: '16%'
        }
      ],
      xAxis: [
        {
          type: 'category',
          data: dates,
          scale: true,
          boundaryGap: false,
          axisLine: { onZero: false },
          splitLine: { show: false },
          splitNumber: 20,
          min: 'dataMin',
          max: 'dataMax',
          axisLabel: {
            rotate: 45,
            fontSize: 10,
            interval: Math.floor(dates.length / 10),
            formatter: (val: string) => val.slice(2)
          }
        },
        {
          type: 'category',
          gridIndex: 1,
          data: dates,
          scale: true,
          boundaryGap: false,
          axisLine: { onZero: false },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          min: 'dataMin',
          max: 'dataMax'
        }
      ],
      yAxis: [
        {
          scale: true,
          splitArea: {
            show: true
          }
        },
        {
          scale: true,
          gridIndex: 1,
          splitNumber: 2,
          axisLabel: { show: false },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false }
        }
      ],
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: [0, 1],
          start: 50,
          end: 100
        },
        {
          show: true,
          xAxisIndex: [0, 1],
          type: 'slider',
          top: '85%',
          start: 50,
          end: 100
        }
      ],
      series: [
        {
          name: '日K',
          type: 'candlestick',
          data: values,
          itemStyle: {
            color: '#cf1322',
            color0: '#3f8600',
            borderColor: '#cf1322',
            borderColor0: '#3f8600'
          },
          markPoint: {
            data: [
              { type: 'max', name: '最大值' },
              { type: 'min', name: '最小值' }
            ]
          }
        },
        {
          name: 'MA5',
          type: 'line',
          data: ma5Data,
          smooth: true,
          lineStyle: {
            opacity: 0.5
          },
          symbol: 'none'
        },
        {
          name: 'MA20',
          type: 'line',
          data: ma20Data,
          smooth: true,
          lineStyle: {
            opacity: 0.5
          },
          symbol: 'none'
        },
        {
          name: 'MA60',
          type: 'line',
          data: ma60Data,
          smooth: true,
          lineStyle: {
            opacity: 0.5
          },
          symbol: 'none'
        },
        {
          name: '成交量',
          type: 'bar',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: volumes.map(item => ({
            value: item[1],
            itemStyle: {
              color: item[2] > 0 ? '#cf1322' : '#3f8600'
            }
          }))
        }
      ]
    };
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <Card title="📈 K线图与技术分析">
        <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
          暂无数据
        </div>
      </Card>
    );
  }

  return (
    <Card title="📈 K线图与技术分析" style={{ marginBottom: 24 }}>
      <ReactECharts
        option={option}
        style={{ height: `${height}px`, width: '100%' }}
        opts={{ renderer: 'canvas' }}
        notMerge={true}
        lazyUpdate={true}
      />
    </Card>
  );
};

export default KLineChart;
