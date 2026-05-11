import React from 'react';
import { Card, Typography, Alert, Tag, Space, Divider } from 'antd';
import { WarningOutlined, CheckCircleOutlined, InfoCircleOutlined, FileTextOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

interface MATechnicalAnalysisProps {
  fundFlow?: any[];
  technical?: any;
  valuation?: any;
}

const MATechnicalAnalysis: React.FC<MATechnicalAnalysisProps> = ({
  fundFlow,
  technical,
  valuation,
}) => {
  // 从真实数据中提取信息
  const hasFundFlowData = fundFlow && fundFlow.length > 0;
  const fundFlowData = hasFundFlowData ? fundFlow![0] : null;
  
  // 计算技术指标状态
  const rsi = technical?.rsi;
  const macd = technical?.macd;
  const close = technical?.close;
  const ma5 = technical?.ma5;
  const ma20 = technical?.ma20;
  
  // 判断趋势
  const isUptrend = close && ma5 && ma20 && close > ma5 && ma5 > ma20;
  const isDowntrend = close && ma5 && ma20 && close < ma5 && ma5 < ma20;
  const trendStatus = isUptrend ? '上升' : isDowntrend ? '下降' : '震荡';
  
  // RSI状态
  const rsiStatus = rsi > 70 ? '超买' : rsi < 30 ? '超卖' : '中性';
  
  // MACD状态
  const macdStatus = macd > 0 ? '多头' : '空头';
  
  // 资金流向
  const mainInflow = fundFlowData?.['主力净流入'] || 0;
  const hasInflow = mainInflow > 0;
  
  return (
    <Card title="🔍 重大资产重组/控制权转让 - 专业分析" style={{ marginBottom: 16 }}>
      <Alert
        message="分析框架说明"
        description="本分析从控制权转让的专业角度，综合评估技术面、资金面、估值水平和股权结构特征，为并购决策提供参考。"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />
      
      {/* 综合分析报告 */}
      <Card size="small" title={<><FileTextOutlined /> 综合分析报告</>} style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          
          {/* 技术面分析 */}
          <div>
            <Title level={5} style={{ marginBottom: 8, color: '#1890ff' }}>
              一、技术面分析
            </Title>
            <Paragraph style={{ fontSize: 13, lineHeight: 1.8, textAlign: 'justify' }}>
              从技术指标来看，当前股价呈现<strong>{trendStatus}</strong>趋势。
              {rsi ? `RSI指标为${rsi.toFixed(1)}，处于${rsiStatus}区域，` : ''}
              {macd ? `MACD指标显示${macdStatus}信号，` : ''}
              {close && ma5 && ma20 ? 
                `股价${close.toFixed(2)}元位于MA5(${ma5.toFixed(2)})和MA20(${ma20.toFixed(2)})${close > ma20 ? '上方' : '下方'}，` : ''}
              整体技术形态{isUptrend ? '向好，有利于控制权转让的推进' : isDowntrend ? '偏弱，需关注后续走势变化' : '处于整理阶段，建议持续观察'}。
            </Paragraph>
          </div>
          
          <Divider style={{ margin: '12px 0' }} />
          
          {/* 资金面分析 */}
          <div>
            <Title level={5} style={{ marginBottom: 8, color: '#52c41a' }}>
              二、资金面分析
            </Title>
            <Paragraph style={{ fontSize: 13, lineHeight: 1.8, textAlign: 'justify' }}>
              {hasFundFlowData ? (
                <>
                  近期资金流向显示<strong>{hasInflow ? '主力资金净流入' : '主力资金净流出'}</strong>，
                  {mainInflow !== 0 ? `主力净流入金额为${(Math.abs(mainInflow) / 1e8).toFixed(2)}亿元，` : ''}
                  {hasInflow ? 
                    '资金面的积极变化可能反映市场对控制权变更的预期，有利于转让价格的谈判。' : 
                    '资金面的谨慎态度可能影响转让进程，需关注后续资金动向。'}
                </>
              ) : (
                '暂无资金流向数据，建议结合大宗交易和龙虎榜数据综合判断资金态度。'
              )}
            </Paragraph>
          </div>
          
          <Divider style={{ margin: '12px 0' }} />
          
          {/* 估值分析 */}
          <div>
            <Title level={5} style={{ marginBottom: 8, color: '#fa8c16' }}>
              三、估值分析
            </Title>
            <Paragraph style={{ fontSize: 13, lineHeight: 1.8, textAlign: 'justify' }}>
              {valuation?.pe_ratio ? (
                <>
                  当前市盈率(PE)为<strong>{valuation.pe_ratio.toFixed(2)}倍</strong>，
                  {valuation.industry_pe ? `行业平均PE为${valuation.industry_pe.toFixed(2)}倍，` : ''}
                  {valuation.market_cap ? `总市值约${valuation.market_cap}，` : ''}
                  {valuation.pe_ratio < 15 ? 
                    '估值处于较低水平，控制权转让具备较好的安全边际。' : 
                    valuation.pe_ratio > 30 ? 
                    '估值相对较高，转让定价需充分考虑溢价合理性。' : 
                    '估值处于合理区间，转让价格可参考市场价适当溢价。'}
                </>
              ) : (
                '暂无估值数据，建议参考同行业可比公司估值水平。'
              )}
            </Paragraph>
          </div>
          
          <Divider style={{ margin: '12px 0' }} />
          
          {/* 控制权转让风险评估 */}
          <div>
            <Title level={5} style={{ marginBottom: 8, color: '#ff4d4f' }}>
              四、控制权转让风险评估
            </Title>
            <Paragraph style={{ fontSize: 13, lineHeight: 1.8, textAlign: 'justify' }}>
              综合技术、资金、估值三个维度，当前控制权转让风险评级为
              <Tag color={isUptrend && hasInflow ? 'success' : isDowntrend && !hasInflow ? 'error' : 'warning'} 
                   style={{ margin: '0 4px' }}>
                {isUptrend && hasInflow ? '低风险' : isDowntrend && !hasInflow ? '较高风险' : '中等风险'}
              </Tag>。
              {isUptrend && hasInflow ? 
                '技术面和资金面均呈现积极信号，建议积极推进控制权转让事宜，但需关注溢价水平的合理性。' :
                isDowntrend && !hasInflow ?
                '技术面偏弱且资金流出，建议暂缓转让计划或调整转让价格预期，等待更合适的时机。' :
                '市场信号存在分歧，建议进一步分析基本面和行业前景，审慎决策。'}
            </Paragraph>
          </div>
          
          <Divider style={{ margin: '12px 0' }} />
          
          {/* 专业建议 */}
          <div>
            <Title level={5} style={{ marginBottom: 8, color: '#722ed1' }}>
              五、专业建议
            </Title>
            <Paragraph style={{ fontSize: 13, lineHeight: 1.8, textAlign: 'justify' }}>
              <strong>对转让方：</strong>
              {isUptrend ? 
                '当前市场氛围较好，可考虑在股价相对高位推进转让，有利于实现较好的转让价格。' : 
                '市场氛围一般，如非急需，建议等待更好的市场窗口；如必须转让，需做好价格折让准备。'}
              <br /><br />
              <strong>对受让方：</strong>
              {valuation?.pe_ratio && valuation.pe_ratio < 20 ? 
                '当前估值水平具备一定吸引力，可在尽职调查基础上积极参与，但需充分评估控制权溢价。' : 
                '当前估值不低，建议深入分析公司内在价值和协同效应，审慎评估投资回报率。'}
            </Paragraph>
          </div>
          
        </Space>
      </Card>
      
      {/* 风险提示 */}
      <Alert
        message="⚠️ 重要提示"
        description={
          <Space direction="vertical" size="small">
            <Text type="secondary" style={{ fontSize: 12 }}>
              1. 本分析基于公开的技术面和资金面数据，不构成投资建议
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              2. 控制权转让涉及复杂的法律、财务和监管问题，需专业团队全面尽调
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              3. 股价波动受多种因素影响，本分析仅供参考，不作为交易依据
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              4. 建议结合公司基本面、行业前景和宏观环境综合判断
            </Text>
          </Space>
        }
        type="warning"
        showIcon
      />
    </Card>
  );
};

export default MATechnicalAnalysis;
