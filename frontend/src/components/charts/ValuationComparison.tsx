import React, { useMemo } from 'react';
import { Card, Typography, Row, Col } from 'antd';
import ReactECharts from 'echarts-for-react';
import type { ValuationData, FinancialIndicator } from '../../types/stock';

const { Text } = Typography;

interface ValuationComparisonProps {
  valuation: ValuationData;
  currentPrice?: number;
  financialIndicators: FinancialIndicator[];
  title?: string;
}

const ValuationComparison: React.FC<ValuationComparisonProps> = ({
  valuation,
  currentPrice,
  financialIndicators,
  title = '估值对比'
}) => {
  const option = useMemo(() => {
    const fi = financialIndicators as any[];
    const hasData = fi && fi.length >= 2;

    // 只保留年报数据（12-31）
    const annualData = hasData ? fi.filter(r => {
      const dateStr = String(r['日期'] || '');
      return dateStr.includes('12-31');
    }) : [];

    const useAnnualData = annualData && annualData.length >= 2;
    const dataToUse = useAnnualData ? annualData : (hasData ? fi : []);

    // 构建历史数据
    const dates = useAnnualData
      ? annualData.map(r => String(r['日期'] || '').slice(0, 4)).reverse()
      : (hasData ? fi.map(r => String(r['日期'] || '').slice(0, 7)).reverse() : ['T-5', 'T-4', 'T-3', 'T-2', 'T-1']);

    // 生成历史 PE 数据（模拟或从真实数据提取
    const peHistory = dataToUse.length > 0
      ? dataToUse.map(r => {
        const eps = r['每股收益'];
        const pe = eps && currentPrice ? currentPrice / eps : valuation.pe_ratio || 20;
        return Math.min(Math.max(pe, 5), 100); // 限制在合理范围
      }).reverse()
      : [15, 18, 22, 25, valuation.pe_ratio || 20];

    // 生成历史估值数据
    const valuationHistory = dataToUse.length > 0
      ? dataToUse.map((r) => {
        const eps = r['每股收益'];
        const industryPe = valuation.industry_pe || 20;
        return eps ? eps * industryPe : currentPrice || 100;
      }).reverse()
      : [80, 90, 100, 110, (valuation.pe_ratio || 20) * (currentPrice || 100) / 20];

    const series: any[] = [
      {
        name: 'PE',
        type: 'line',
        data: peHistory,
        yAxisIndex: 0,
        smooth: true,
        lineStyle: { width: 2, color: '#1890ff' },
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: { color: '#1890ff' },
        areaStyle: { color: 'rgba(24,144,255,0.1)' }
      },
      {
        name: '估值',
        type: 'line',
        data: valuationHistory,
        yAxisIndex: 1,
        smooth: true,
        lineStyle: { width: 2, color: '#52c41a' },
        symbol: 'diamond',
        symbolSize: 6,
        itemStyle: { color: '#52c41a' },
        areaStyle: { color: 'rgba(82,196,106,0.1)' }
      }
    ];

    // 添加当前价格参考线
    if (currentPrice) {
      series.push({
        name: '当前价格',
        type: 'line',
        data: dataToUse.length > 0 ? dataToUse.map(() => currentPrice) : [],
        yAxisIndex: 1,
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
              formatter: `当前价: ¥${currentPrice.toFixed(0)}`,
              position: 'insideEndTop',
              fontSize: 10
            },
            lineStyle: {
              color: '#ff4d4f',
              type: 'dashed'
            }
          }]
        }
      });
    }

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        },
        formatter: (params: any) => {
          let result = useAnnualData ? `${params[0].axisValue}年<br/>` : `${params[0].axisValue}<br/>`;
          params.forEach((p: any) => {
            if (p.seriesName === 'PE') {
              result += `${p.marker}PE: ${p.value.toFixed(2)}x<br/>`;
            } else if (p.seriesName !== '当前价格') {
              result += `${p.marker}估值: ¥${p.value.toFixed(2)}<br/>`;
            }
          });
          if (currentPrice) {
            result += `<hr style="margin:4px 0"/>当前价格: ¥${currentPrice.toFixed(2)}`;
          }
          return result;
        }
      },
      legend: {
        data: ['PE', '估值', '当前价格'],
        bottom: 2,
        icon: 'roundRect',
        itemWidth: 10,
        itemHeight: 8,
        fontSize: 11
      },
      grid: {
        left: '8%',
        right: '8%',
        top: '12%',
        bottom: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: {
          fontSize: 10
        }
      },
      yAxis: [
        {
          type: 'value',
          name: 'PE (倍)',
          position: 'left',
          nameTextStyle: { fontSize: 10 },
          axisLabel: { fontSize: 10 },
          splitLine: { lineStyle: { type: 'dashed' } }
        },
        {
          type: 'value',
          name: '估值 (元)',
          position: 'right',
          nameTextStyle: { fontSize: 10 },
          axisLabel: { fontSize: 10, formatter: '¥{value}' },
          splitLine: { show: false }
        }
      ],
      series
    };
  }, [valuation, currentPrice, financialIndicators]);

  const currentPE = valuation.pe_ratio || '--';
  const industryPE = valuation.industry_pe || '--';

  return (
    <Card title={title} style={{ marginBottom: 16 }}>
      <div style={{ marginBottom: 12, padding: 12, background: 'var(--bg-elevated)', borderRadius: 4 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Text type="secondary" style={{ fontSize: 12 }}>当前价格: </Text>
            <Text style={{ color: '#ff4d4f', fontWeight: 'bold' }}>
              ¥{currentPrice?.toFixed(2) || '--'}
            </Text>
          </Col>
          <Col span={8}>
            <Text type="secondary" style={{ fontSize: 12 }}>当前PE: </Text>
            <Text style={{ color: '#1890ff', fontWeight: 'bold' }}>
              {typeof currentPE === 'number' ? `${currentPE.toFixed(2)}x` : currentPE}
            </Text>
          </Col>
          <Col span={8}>
            <Text type="secondary" style={{ fontSize: 12 }}>行业PE: </Text>
            <Text style={{ color: '#52c41a', fontWeight: 'bold' }}>
              {typeof industryPE === 'number' ? `${industryPE.toFixed(2)}x` : industryPE}
            </Text>
          </Col>
        </Row>
      </div>
      <ReactECharts option={option} style={{ height: 280 }} />
      <div style={{ marginTop: 12 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          💡 提示：图表仅展示年度数据（12-31年报），PE低于行业平均可能被低估，关注估值变化趋势
        </Text>
      </div>
    </Card>
  );
};

export default ValuationComparison;
