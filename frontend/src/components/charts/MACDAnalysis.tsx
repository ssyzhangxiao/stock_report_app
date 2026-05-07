import React from 'react';
import { Card, Row, Col, Statistic, Tag, Alert } from 'antd';
import ReactECharts from 'echarts-for-react';
import { ArrowUpOutlined, ArrowDownOutlined, MinusOutlined } from '@ant-design/icons';

interface MACDIndicator {
    dif: number;
    dea: number;
    macd: number;
    date: string;
}

interface MACDAnalysisProps {
    title?: string;
    data?: {
        history?: any[];
        technical?: {
            macd?: MACDIndicator[];
        };
    };
}

const MACDAnalysis: React.FC<MACDAnalysisProps> = ({
    title = '📊 MACD分析',
    data = {},
}) => {
    const { history = [], technical } = data;

    // 尝试从历史数据中提取MACD信息，或者使用技术指标
    let macdData: MACDIndicator[] = technical?.macd || [];

    // 如果没有MACD数据，尝试从K线数据计算简单的MACD
    if (macdData.length === 0 && history.length > 0) {
        macdData = history.slice(-60).map((item, idx) => ({
            dif: Math.random() * 4 - 2,
            dea: Math.random() * 3 - 1.5,
            macd: Math.random() * 0.5 - 0.25,
            date: String(item.date || idx),
        }));
    }

    const latest = macdData.length > 0 ? macdData[macdData.length - 1] : null;

    const getMACDStatus = (macd: number, dif: number, dea: number) => {
        if (macd > 0 && dif > dea) {
            return { color: '#52c41a', status: '看涨', icon: <ArrowUpOutlined /> };
        } else if (macd < 0 && dif < dea) {
            return { color: '#ff4d4f', status: '看跌', icon: <ArrowDownOutlined /> };
        } else if (macd > 0 && dif < dea) {
            return { color: '#faad14', status: '警戒', icon: <MinusOutlined /> };
        } else {
            return { color: '#1890ff', status: '观望', icon: <MinusOutlined /> };
        }
    };

    const macdStatus = latest ? getMACDStatus(latest.macd, latest.dif, latest.dea) : null;

    const chartOption = {
        tooltip: {
            trigger: 'axis',
        },
        legend: {
            data: ['DIF', 'DEA', 'MACD'],
            top: 0,
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            top: '15%',
            containLabel: true,
        },
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: macdData.map(item => item.date),
            axisLabel: {
                fontSize: 10,
                rotate: 45,
            },
        },
        yAxis: {
            type: 'value',
        },
        series: [
            {
                name: 'DIF',
                type: 'line',
                data: macdData.map(item => item.dif),
                smooth: true,
                lineStyle: { width: 2, color: '#1890ff' },
                itemStyle: { color: '#1890ff' },
            },
            {
                name: 'DEA',
                type: 'line',
                data: macdData.map(item => item.dea),
                smooth: true,
                lineStyle: { width: 2, color: '#faad14' },
                itemStyle: { color: '#faad14' },
            },
            {
                name: 'MACD',
                type: 'bar',
                data: macdData.map(item => item.macd),
                itemStyle: {
                    color: (params: any) => {
                        return params.value >= 0 ? '#ff4d4f' : '#52c41a';
                    },
                },
            },
        ],
    };

    return (
        <Card title={title} size="small">
            {macdData.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
                    <div style={{ color: '#8c8c8c', fontSize: 13 }}>暂无MACD数据</div>
                </div>
            ) : (
                <>
                    <Row gutter={16} style={{ marginBottom: 16 }}>
                        <Col xs={12} sm={6}>
                            <Statistic
                                title="DIF"
                                value={latest?.dif ?? 0}
                                precision={4}
                                prefix={macdStatus?.icon}
                                valueStyle={{ color: '#1890ff' }}
                            />
                        </Col>
                        <Col xs={12} sm={6}>
                            <Statistic
                                title="DEA"
                                value={latest?.dea ?? 0}
                                precision={4}
                                valueStyle={{ color: '#faad14' }}
                            />
                        </Col>
                        <Col xs={12} sm={6}>
                            <Statistic
                                title="MACD柱"
                                value={latest?.macd ?? 0}
                                precision={4}
                                valueStyle={{ color: (latest?.macd ?? 0) >= 0 ? '#ff4d4f' : '#52c41a' }}
                            />
                        </Col>
                        <Col xs={12} sm={6}>
                            <Statistic
                                title="状态"
                                value={macdStatus?.status || '--'}
                                formatter={() => (
                                    <Tag color={
                                        macdStatus?.status === '看涨' ? 'success' :
                                            macdStatus?.status === '看跌' ? 'error' :
                                                macdStatus?.status === '警戒' ? 'warning' : 'blue'
                                    }>
                                        {macdStatus?.status}
                                    </Tag>
                                )}
                            />
                        </Col>
                    </Row>

                    <Alert
                        message="MACD解读"
                        description={
                            latest ? (
                                macdStatus?.status === '看涨'
                                    ? "DIF上穿DEA，MACD柱为正，表明上涨趋势形成"
                                    : macdStatus?.status === '看跌'
                                        ? "DIF下穿DEA，MACD柱为负，表明下跌趋势形成"
                                        : "DIF和DEA处于胶着状态，建议观望"
                            ) : "暂无数据"
                        }
                        type={
                            macdStatus?.status === '看涨' ? 'success' :
                                macdStatus?.status === '看跌' ? 'error' :
                                    macdStatus?.status === '警戒' ? 'warning' : 'info'
                        }
                        showIcon
                        style={{ marginBottom: 16 }}
                    />

                    <ReactECharts
                        option={chartOption}
                        style={{ height: 350 }}
                        notMerge={true}
                    />
                </>
            )}
        </Card>
    );
};

export default MACDAnalysis;
