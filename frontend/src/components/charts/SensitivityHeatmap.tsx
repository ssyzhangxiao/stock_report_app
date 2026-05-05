import React, { useEffect, useState } from 'react';
import { Card, Typography, Spin, Alert } from 'antd';
import ReactECharts from 'echarts-for-react';
import { getDCFAnalysis, type DCFResult } from '../../api/stockApi';

const { Text } = Typography;

interface SensitivityHeatmapProps {
  symbol?: string;
  title?: string;
}

const SensitivityHeatmap: React.FC<SensitivityHeatmapProps> = ({ symbol, title = "DCF 敏感性分析" }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dcfData, setDcfData] = useState<DCFResult | null>(null);

  useEffect(() => {
    console.log('SensitivityHeatmap 组件收到 symbol:', symbol);
    if (!symbol) {
      console.log('SensitivityHeatmap: symbol 为空，使用默认数据');
      // 使用默认数据
      setDcfData({
        symbol: 'N/A',
        current_price: 100,
        fair_value: 100,
        upside_potential: 0,
        downside_potential: 0,
        wacc: 10,
        terminal_growth: 3,
        sensitivity_matrix: [
          [100, 110, 120, 130, 140],
          [90, 100, 110, 120, 130],
          [80, 90, 100, 110, 120],
          [70, 80, 90, 100, 110],
          [60, 70, 80, 90, 100],
        ],
        wacc_values: [8, 9, 10, 11, 12],
        growth_values: [1, 2, 3, 4, 5],
        using_default: true,
      });
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getDCFAnalysis(symbol);
        setDcfData(data);
      } catch (err) {
        console.error('获取 DCF 数据失败:', err);
        setError('获取 DCF 数据失败，使用默认数据');
        // 使用默认数据
        setDcfData({
          symbol,
          current_price: 100,
          fair_value: 100,
          upside_potential: 0,
          downside_potential: 0,
          wacc: 10,
          terminal_growth: 3,
          sensitivity_matrix: [
            [100, 110, 120, 130, 140],
            [90, 100, 110, 120, 130],
            [80, 90, 100, 110, 120],
            [70, 80, 90, 100, 110],
            [60, 70, 80, 90, 100],
          ],
          wacc_values: [8, 9, 10, 11, 12],
          growth_values: [1, 2, 3, 4, 5],
          using_default: true,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [symbol]);

  if (!dcfData) {
    return null;
  }

  const { wacc_values, growth_values, sensitivity_matrix, current_price, fair_value, upside_potential, using_default } = dcfData;

  const option: any = {
    tooltip: {
      position: 'top',
      formatter: (params: any) => {
        const wacc = wacc_values[params.data[0]];
        const growth = growth_values[params.data[1]];
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
      data: wacc_values.map(v => `${v}%`),
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
      data: growth_values.map(v => `${v}%`),
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
      min: Math.min(...sensitivity_matrix.flat()),
      max: Math.max(...sensitivity_matrix.flat()),
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
      data: sensitivity_matrix.flatMap((row, yIdx) =>
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

  return (
    <Card
      title={
        <div>
          {title}
          {using_default && <span style={{ color: '#faad14', marginLeft: 8, fontSize: '0.85em' }}>(示例数据)</span>}
        </div>
      }
      style={{ marginBottom: 16 }}
    >
      {error && (
        <Alert
          message={error}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div>
          <Text type="secondary">
            热力图展示了不同WACC和永续增长率组合下的估值结果。颜色越深表示估值越高。
          </Text>
        </div>
        <div style={{ textAlign: 'right' }}>
          <Text style={{ marginRight: 16 }}>
            当前价格: <strong style={{ color: '#1890ff' }}>¥{current_price.toFixed(2)}</strong>
          </Text>
          <Text>
            内在价值: <strong style={{ color: upside_potential >= 0 ? '#52c41a' : '#ff4d4f' }}>¥{fair_value.toFixed(2)}</strong>
          </Text>
          <Text style={{ marginLeft: 16, color: upside_potential >= 0 ? '#52c41a' : '#ff4d4f' }}>
            {upside_potential >= 0 ? '↑' : '↓'}{Math.abs(upside_potential).toFixed(2)}%
          </Text>
        </div>
      </div>

      <Spin spinning={loading}>
        <ReactECharts option={option} style={{ height: 400 }} />
      </Spin>
    </Card>
  );
};

export default SensitivityHeatmap;
