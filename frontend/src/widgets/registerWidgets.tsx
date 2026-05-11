/**
 * Widget组件注册中心
 * 将所有分析组件适配为WidgetProps接口并注册到WidgetRegistry
 * 新增组件只需在此文件添加注册即可，无需修改Dashboard
 */

import React, { useMemo } from 'react';
import { message } from 'antd';
import ReactECharts from 'echarts-for-react';
import { widgetRegistry } from './WidgetRegistry';
import type { WidgetProps, WidgetMeta } from './types';

import KLineChart from '../components/charts/KLineChart';
import ValuationComparison from '../components/charts/ValuationComparison';
import PeerComparison from '../components/charts/PeerComparison';
import RiskDashboard from '../components/charts/RiskDashboard';
import SensitivityHeatmap from '../components/charts/SensitivityHeatmap';
import DeepFinancialTable from '../components/tables/DeepFinancialTable';
import FundFlowCard from '../components/cards/FundFlowCard';
import NewsSection from '../components/panels/NewsSection';
import AnalystConsensusCard from '../components/cards/AnalystConsensusCard';
import RiskIndicatorsPanel from '../components/panels/RiskIndicatorsPanel';
import ManualRiskEditor from '../components/editors/ManualRiskEditor';
import MATechnicalAnalysis from '../components/panels/MATechnicalAnalysis';
import RiskScoreCard from '../components/cards/RiskScoreCard';
import UnifiedDataPanel from '../components/panels/UnifiedDataPanel';
import CompanyProfileCard from '../components/cards/CompanyProfileCard';
import CapitalOperationPanel from '../components/panels/CapitalOperationPanel';
import ROEAnalysis from '../components/charts/ROEAnalysis';
import MACDAnalysis from '../components/charts/MACDAnalysis';
import KDJAnalysis from '../components/charts/KDJAnalysis';

function registerAllWidgets(): void {
  const registrations: Array<{ meta: WidgetMeta; component: React.ComponentType<WidgetProps> }> = [
    // 图表类 Widgets
    {
      meta: {
        id: 'kline-chart',
        name: 'K线图',
        description: '日K线图含MA均线、成交量',
        category: 'chart',
        icon: '📈',
        requiredData: ['history'],
        implemented: true,
        defaultSize: { w: 40, h: 22 },
        tags: ['行情', '技术', '概览'],
      },
      component: ({ data }) => {
        if (!data.history || data.history.length === 0) return null;
        return <KLineChart data={data.history} height={400} />;
      },
    },

    {
      meta: {
        id: 'valuation-comparison',
        name: '估值对比',
        description: 'PE/PB/历史估值变化趋势',
        category: 'chart',
        icon: '📊',
        requiredData: ['valuation', 'latest_price', 'deep_financial'],
        implemented: true,
        defaultSize: { w: 20, h: 14 },
        tags: ['估值', '概览', '深度'],
      },
      component: ({ data }: WidgetProps) => (
        <ValuationComparison
          valuation={data.valuation}
          currentPrice={data.latest_price ?? undefined}
          financialIndicators={data.deep_financial?.financial_indicators || []}
          priceHistory={data.history || []}
          title="估值对比"
        />
      ),
    },

    {
      meta: {
        id: 'roe-analysis',
        name: 'ROE分析',
        description: '净资产收益率(ROE)分析与杜邦分析',
        category: 'chart',
        icon: '📈',
        requiredData: ['deep_financial'],
        implemented: true,
        defaultSize: { w: 40, h: 28 },
        tags: ['财务', '深度', '估值'],
      },
      component: ({ data }: WidgetProps) => (
        <ROEAnalysis
          financialIndicators={data.deep_financial?.financial_indicators || []}
        />
      ),
    },

    {
      meta: {
        id: 'peer-comparison',
        name: '同行对比',
        description: '可比公司PE/PB/市值对比',
        category: 'chart',
        icon: '🏢',
        requiredData: ['symbol'],
        implemented: true,
        defaultSize: { w: 20, h: 15 },
        tags: ['估值', '深度'],
      },
      component: ({ data }: WidgetProps) => (
        <PeerComparison
          symbol={data.symbol}
        />
      ),
    },

    {
      meta: {
        id: 'risk-dashboard',
        name: '风险仪表盘',
        description: '多维度风险指标雷达图',
        category: 'chart',
        icon: '🛡️',
        implemented: true,
        defaultSize: { w: 40, h: 18 },
        tags: ['风险', '风控'],
      },
      component: () => <RiskDashboard />,
    },

    {
      meta: {
        id: 'sensitivity-heatmap',
        name: '敏感性热力图',
        description: 'DCF估值WACC/增长率敏感性分析',
        category: 'chart',
        icon: '🔥',
        requiredData: ['symbol'],
        implemented: true,
        defaultSize: { w: 40, h: 15 },
        tags: ['估值', '深度'],
      },
      component: ({ data }: WidgetProps) => {
        console.log('SensitivityHeatmap widget 收到 data:', data);
        return <SensitivityHeatmap symbol={data.symbol} />;
      },
    },

    // ==================== 表格类 Widgets ====================
    {
      meta: {
        id: 'deep-financial-table',
        name: '深度财务表',
        description: '财务指标/资产负债表/现金流/利润表',
        category: 'table',
        icon: '📋',
        requiredData: ['deep_financial'],
        implemented: true,
        defaultSize: { w: 20, h: 25 },
        tags: ['财务', '深度', '风控'],
      },
      component: ({ data }: WidgetProps) => (
        <DeepFinancialTable
          financialIndicators={data.deep_financial.financial_indicators || []}
          balanceSheet={data.deep_financial.balance_sheet || []}
          cashflow={data.deep_financial.cashflow || []}
          incomeStatement={data.deep_financial.income_statement || []}
        />
      ),
    },

    // ==================== 卡片类 Widgets ====================
    {
      meta: {
        id: 'fund-flow',
        name: '资金流向',
        description: '控制权相关资金分析',
        category: 'card',
        icon: '💰',
        requiredData: ['fund_flow'],
        implemented: true,
        defaultSize: { w: 20, h: 12 },
        tags: ['资金', '概览', '技术'],
      },
      component: ({ data }: WidgetProps) => (
        <FundFlowCard fundFlow={data.fund_flow || []} />
      ),
    },

    {
      meta: {
        id: 'analyst-consensus',
        name: '分析师共识',
        description: '机构评级与目标价',
        category: 'card',
        icon: '🎯',
        requiredData: ['analyst_consensus', 'latest_price'],
        implemented: true,
        defaultSize: { w: 20, h: 14 },
        tags: ['估值', '概览'],
      },
      component: ({ data }: WidgetProps) => (
        <AnalystConsensusCard
          consensus={data.analyst_consensus || {}}
          currentPrice={data.latest_price ?? undefined}
        />
      ),
    },

    {
      meta: {
        id: 'risk-score-card',
        name: '风险评分卡',
        description: '综合风险评分与等级',
        category: 'card',
        icon: '⚠️',
        implemented: true,
        defaultSize: { w: 20, h: 12 },
        tags: ['风险', '风控', '深度'],
      },
      component: ({ data }: WidgetProps) => (
        <RiskScoreCard fundFlow={data.fund_flow || []} />
      ),
    },

    // ==================== 面板类 Widgets ====================
    {
      meta: {
        id: 'news-section',
        name: '新闻舆情',
        description: '多源新闻聚合与情感分析',
        category: 'panel',
        icon: '📰',
        requiredData: ['news_analysis', 'sources_summary'],
        implemented: true,
        defaultSize: { w: 40, h: 24 },
        tags: ['新闻', '概览', '风控'],
      },
      component: ({ data }: WidgetProps) => (
        <NewsSection
          news={data.news_analysis || []}
          sourcesSummary={data.sources_summary}
        />
      ),
    },

    {
      meta: {
        id: 'risk-indicators-panel',
        name: '风险指标面板',
        description: '质押/筹码/增减持/融资融券',
        category: 'panel',
        icon: '🔍',
        requiredData: ['risk_indicators'],
        implemented: true,
        defaultSize: { w: 24, h: 12 },
        tags: ['风险', '风控', '深度'],
      },
      component: ({ data }: WidgetProps) => (
        <RiskIndicatorsPanel
          pledgeRatio={data.risk_indicators?.pledge_ratio || []}
          cyq={data.risk_indicators?.cyq || []}
          insiderHoldings={data.risk_indicators?.insider_holdings || []}
          marginBalance={data.risk_indicators?.margin_balance || []}
          marginHistory={data.risk_indicators?.margin_history}
        />
      ),
    },

    {
      meta: {
        id: 'ma-technical-analysis',
        name: '控制权转让分析',
        description: '重大资产重组/控制权转让专业分析',
        category: 'panel',
        icon: '📐',
        requiredData: ['fund_flow', 'technical', 'valuation'],
        implemented: true,
        defaultSize: { w: 40, h: 35 },
        tags: ['技术', '深度', '并购'],
      },
      component: ({ data }: WidgetProps) => (
        <MATechnicalAnalysis
          fundFlow={data.fund_flow || []}
          technical={data.technical}
          valuation={data.valuation}
        />
      ),
    },

    {
      meta: {
        id: 'unified-data-panel',
        name: '五层数据面板',
        description: '行情/研报/新闻/基础/公告统一展示',
        category: 'panel',
        icon: '🗂️',
        requiredData: ['symbol'],
        implemented: true,
        defaultSize: { w: 40, h: 40 },
        tags: ['数据', '概览'],
      },
      component: ({ data }: WidgetProps) => (
        <UnifiedDataPanel symbol={data.symbol} />
      ),
    },

    // ==================== 编辑器类 Widgets ====================
    {
      meta: {
        id: 'manual-risk-editor',
        name: '风险编辑器',
        description: '手动编辑风险分析与建议',
        category: 'editor',
        icon: '✏️',
        requiredData: ['symbol', 'smart_analysis'],
        implemented: true,
        defaultSize: { w: 40, h: 20 },
        tags: ['风险', '风控'],
      },
      component: ({ data }: WidgetProps) => (
        <ManualRiskEditor
          symbol={data.symbol}
          aiAnalysis={data.smart_analysis?.manual_risk_analysis}
          onSave={() => { message.success('风险分析已保存'); }}
        />
      ),
    },

    // ==================== 占位类 Widgets（待实现）- 提升方案新增 ====================
    {
      meta: {
        id: 'market-sentiment',
        name: '市场情绪',
        description: '市场情绪指数和舆情分析',
        category: 'chart',
        icon: '😊',
        implemented: true,
        tags: ['新闻', '概览'],
      },
      component: ({ data }: WidgetProps) => {
        const sourcesSummary = data.sources_summary;

        let sentimentScore = 50;
        let sentimentLabel = '中性';
        let sentimentColor = '#faad14';

        if (sourcesSummary?.sentiment_distribution) {
          const { positive, negative, neutral } = sourcesSummary.sentiment_distribution;
          const total = positive + negative + neutral;
          if (total > 0) {
            sentimentScore = Math.round(((positive * 100 + neutral * 50) / total));
            if (sentimentScore >= 65) {
              sentimentLabel = '乐观';
              sentimentColor = '#52c41a';
            } else if (sentimentScore <= 35) {
              sentimentLabel = '悲观';
              sentimentColor = '#ff4d4f';
            }
          }
        }

        return (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>😊</div>
            <div style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>市场情绪：{sentimentLabel}</div>
            <div style={{ color: sentimentColor, fontSize: 18 }}>情绪指数：{sentimentScore}/100</div>
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 16 }}>
              <div>
                <div style={{ color: '#52c41a', fontSize: 14 }}>正面 {sourcesSummary?.sentiment_distribution?.positive || 0}</div>
              </div>
              <div>
                <div style={{ color: '#faad14', fontSize: 14 }}>中性 {sourcesSummary?.sentiment_distribution?.neutral || 0}</div>
              </div>
              <div>
                <div style={{ color: '#ff4d4f', fontSize: 14 }}>负面 {sourcesSummary?.sentiment_distribution?.negative || 0}</div>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      meta: {
        id: 'industry-news',
        name: '行业新闻',
        description: '相关行业资讯汇总',
        category: 'panel',
        icon: '🏭',
        implemented: true,
        tags: ['新闻'],
      },
      component: ({ data }: WidgetProps) => {
        const newsData = data.news_analysis || [];
        const industryNews = newsData.filter((news: any) =>
          news.source_type === 'industry' || news.type === 'industry_news'
        ).slice(0, 5);

        return (
          <div style={{ padding: '20px' }}>
            <h3 style={{ marginBottom: 12, color: '#1f2937' }}>🏭 行业新闻</h3>
            {industryNews.length > 0 ? (
              <div>
                {industryNews.map((news: any, index: number) => (
                  <div key={index} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #f0f0f0' }}>
                    <div style={{ fontSize: 13, color: '#333', marginBottom: 4 }}>{news.title}</div>
                    <div style={{ fontSize: 11, color: '#999' }}>{news.publish_time || news.time} · {news.source}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#8c8c8c', fontSize: 12 }}>暂无行业新闻</div>
            )}
          </div>
        );
      },
    },
    {
      meta: {
        id: 'fund-flow-chart',
        name: '资金流向图',
        description: '历史资金流向趋势图',
        category: 'chart',
        icon: '📉',
        implemented: true,
        tags: ['资金'],
      },
      component: ({ data }: WidgetProps) => {
        const fundFlowData = data.fund_flow || [];

        if (!fundFlowData || fundFlowData.length === 0) {
          return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📉</div>
              <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>历史资金流向</div>
              <div style={{ color: '#8c8c8c', fontSize: 12 }}>暂无资金流向数据</div>
            </div>
          );
        }

        const latestFlow = fundFlowData[0] || {};
        // 兼容多种字段名：主力净流入-净额 / 主力净流入 / net_inflow
        const netInflowVal = latestFlow['主力净流入-净额'] || latestFlow['主力净流入'] || latestFlow['net_inflow'];
        const netInflow = typeof netInflowVal === 'number' ? netInflowVal : 0;
        const isPositive = netInflow >= 0;

        return (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>{isPositive ? '📈' : '📉'}</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>历史资金流向</div>
            <div style={{ color: isPositive ? '#52c41a' : '#ff4d4f', fontSize: 16 }}>
              主力净流入: {isPositive ? '+' : ''}{(netInflow / 10000).toFixed(2)} 万
            </div>
            <div style={{ marginTop: 12, color: '#8c8c8c', fontSize: 11 }}>
              近 {fundFlowData.length} 日资金流向
            </div>
          </div>
        );
      },
    },
    {
      meta: {
        id: 'main-force-flow',
        name: '主力资金',
        description: '主力资金动向分析',
        category: 'card',
        icon: '💪',
        implemented: true,
        tags: ['资金'],
      },
      component: ({ data }: WidgetProps) => {
        const fundFlowData = data.fund_flow || [];

        if (!fundFlowData || fundFlowData.length === 0) {
          return (
            <div style={{ padding: '20px' }}>
              <h3 style={{ marginBottom: 12, color: '#1f2937' }}>💪 主力资金</h3>
              <div style={{ color: '#8c8c8c', fontSize: 12 }}>暂无数据</div>
            </div>
          );
        }

        const latestFlow = fundFlowData[0] || {};
        // 兼容多种字段名：超大单净流入-净额 / 超大单净流入 / super_inflow
        const superInflow = latestFlow['超大单净流入-净额'] || latestFlow['超大单净流入'] || latestFlow['super_inflow'] || 0;
        // 兼容多种字段名：大单净流入-净额 / 大单净流入 / big_inflow
        const bigInflow = latestFlow['大单净流入-净额'] || latestFlow['大单净流入'] || latestFlow['big_inflow'] || 0;
        const mainNet = Number(superInflow) + Number(bigInflow);

        return (
          <div style={{ padding: '20px' }}>
            <h3 style={{ marginBottom: 12, color: '#1f2937' }}>💪 主力资金</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div style={{ textAlign: 'center', padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
                <div style={{ fontSize: 11, color: '#999' }}>超大单净流入</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: Number(superInflow) >= 0 ? '#52c41a' : '#ff4d4f' }}>
                  {(Number(superInflow) / 10000).toFixed(0)} 万
                </div>
              </div>
              <div style={{ textAlign: 'center', padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
                <div style={{ fontSize: 11, color: '#999' }}>大单净流入</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: Number(bigInflow) >= 0 ? '#52c41a' : '#ff4d4f' }}>
                  {(Number(bigInflow) / 10000).toFixed(0)} 万
                </div>
              </div>
            </div>
            <div style={{ marginTop: 8, textAlign: 'center', padding: 8, background: mainNet >= 0 ? '#f6ffed' : '#fff2f0', borderRadius: 4 }}>
              <div style={{ fontSize: 11, color: '#999' }}>主力合计</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: mainNet >= 0 ? '#52c41a' : '#ff4d4f' }}>
                {mainNet >= 0 ? '+' : ''}{(mainNet / 10000).toFixed(0)} 万
              </div>
            </div>
          </div>
        );
      },
    },
    {
      meta: {
        id: 'dragon-tiger-list',
        name: '龙虎榜',
        description: '龙虎榜数据展示',
        category: 'table',
        icon: '🐉',
        implemented: true,
        tags: ['资金'],
      },
      component: () => {
        return (
          <div style={{ padding: '20px' }}>
            <h3 style={{ marginBottom: 12, color: '#1f2937' }}>🐉 龙虎榜</h3>
            <div style={{ color: '#8c8c8c', fontSize: 12 }}>（占位组件：等待真实数据接口）</div>
          </div>
        );
      },
    },
    {
      meta: {
        id: 'financial-indicators',
        name: '财务指标',
        description: '核心财务指标概览',
        category: 'card',
        icon: '📊',
        implemented: true,
        requiredData: ['deep_financial'],
        tags: ['财务'],
      },
      component: ({ data }) => {
        const finIndicators = data?.deep_financial?.financial_indicators;
        if (!finIndicators || finIndicators.length === 0) {
          return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
              <div style={{ color: '#8c8c8c', fontSize: 13 }}>暂无财务指标数据</div>
            </div>
          );
        }
        // 只保留年报数据（12-31）
        const annualIndicators = finIndicators.filter((item: any) => {
          const dateStr = String(item['日期'] || '');
          return dateStr.includes('12-31');
        });
        // 如果年报数据不足，回退到原始数据
        const useIndicators = annualIndicators.length >= 1 ? annualIndicators : finIndicators;
        const latest = useIndicators[0];

        const formatNum = (num: any, unit = '') => {
          if (num === null || num === undefined) return 'N/A';
          const n = Number(num);
          if (isNaN(n)) return String(num);
          if (Math.abs(n) >= 1e8) return (n / 1e8).toFixed(2) + '亿';
          if (Math.abs(n) >= 1e4) return (n / 1e4).toFixed(2) + '万';
          return n.toFixed(2) + unit;
        };

        const getDisplayDate = (item: any) => {
          const dateStr = String(item['日期'] || '');
          if (dateStr.includes('12-31')) {
            return dateStr.slice(0, 4) + '年报';
          }
          return dateStr;
        };

        const items = [
          { label: '营业总收入', value: formatNum(latest['营业总收入(元)']) },
          { label: '净利润', value: formatNum(latest['净利润(元)']) },
          { label: '净资产收益率', value: formatNum(latest['净资产收益率(%)'], '%') },
          { label: '销售毛利率', value: formatNum(latest['销售毛利率(%)'], '%') },
          { label: '资产负债率', value: formatNum(latest['资产负债率'], '%') },
        ];
        return (
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>📊 财务指标</h3>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'var(--bg-elevated)', padding: '4px 10px', borderRadius: 4 }}>
                {getDisplayDate(latest)}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
              {items.map((item, i) => (
                <div key={i} style={{ padding: 12, background: 'var(--component-bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        );
      },
    },
    {
      meta: {
        id: 'financial-trend',
        name: '财务趋势',
        description: '财务数据趋势分析',
        category: 'chart',
        icon: '📈',
        implemented: true,
        requiredData: ['deep_financial'],
        tags: ['财务'],
      },
      component: ({ data }) => {
        const finIndicators = data?.deep_financial?.financial_indicators;
        if (!finIndicators || finIndicators.length === 0) {
          return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📈</div>
              <div style={{ color: '#8c8c8c', fontSize: 13 }}>暂无财务趋势数据</div>
            </div>
          );
        }

        const getValue = (item: any, key: string) => {
          const v = item[key];
          return v !== null && v !== undefined ? Number(v) : 0;
        };
        const formatNum = (num: number) => {
          if (Math.abs(num) >= 1e8) return (num / 1e8).toFixed(1) + '亿';
          if (Math.abs(num) >= 1e4) return (num / 1e4).toFixed(1) + '万';
          return num.toFixed(1);
        };

        const annualIndicators = finIndicators.filter((item: any) => {
          const dateStr = String(item['日期'] || '');
          return dateStr.includes('12-31');
        });

        const pastThreeYears = annualIndicators.slice(0, 3);
        const latest = finIndicators[finIndicators.length - 1];
        const latestDate = String(latest['日期'] || '');
        const isLatestInAnnual = pastThreeYears.some(item => String(item['日期']) === latestDate);
        const useIndicators = isLatestInAnnual
          ? pastThreeYears
          : [latest, ...pastThreeYears];

        const displayData = useIndicators.slice(0, 4).reverse();
        const dates = displayData.map((item: any) => {
          const dateStr = String(item['日期'] || '');
          if (dateStr.includes('12-31')) return dateStr.slice(0, 4);
          return dateStr.slice(0, 7);
        });
        const revValues = displayData.map((item: any) => getValue(item, '营业总收入(元)'));
        const profValues = displayData.map((item: any) => getValue(item, '净利润(元)'));
        const roeValues = displayData.map((item: any) => getValue(item, '净资产收益率(%)'));

        const latestForDuPont = useIndicators[0];
        const netProfit = getValue(latestForDuPont, '净利润(元)');
        const totalRevenue = getValue(latestForDuPont, '营业总收入(元)');
        const totalAssets = getValue(latestForDuPont, '资产总额(元)');
        const totalEquity = getValue(latestForDuPont, '所有者权益合计(元)');

        const netProfitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
        const assetTurnover = totalAssets > 0 ? totalRevenue / totalAssets : 0;
        const equityMultiplier = totalEquity > 0 ? totalAssets / totalEquity : 0;
        const roe = netProfitMargin * assetTurnover * equityMultiplier;

        const assetLiabilityRatio = getValue(latestForDuPont, '资产负债率');
        const grossMargin = getValue(latestForDuPont, '销售毛利率(%)');

        const riskScore = useMemo(() => {
          let score = 50;
          if (assetLiabilityRatio > 70) score -= 20;
          else if (assetLiabilityRatio > 50) score -= 10;
          else if (assetLiabilityRatio < 30) score += 10;
          if (roeValues.length >= 2 && roeValues[roeValues.length - 1] < roeValues[roeValues.length - 2]) score -= 10;
          if (netProfitMargin < 5) score -= 15;
          else if (netProfitMargin > 20) score += 10;
          return Math.max(0, Math.min(100, score));
        }, [assetLiabilityRatio, roeValues, netProfitMargin]);

        const getRiskLevel = (score: number) => {
          if (score >= 70) return { label: '低风险', color: '#52c41a' };
          if (score >= 40) return { label: '中等风险', color: '#faad14' };
          return { label: '高风险', color: '#ff4d4f' };
        };
        const riskLevel = getRiskLevel(riskScore);

        const chartOption = useMemo(() => ({
          tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'cross', crossStyle: { color: '#999' } },
            formatter: (params: any) => {
              let result = `${params[0].axisValue}<br/>`;
              params.forEach((p: any) => {
                if (p.seriesName === '营业总收入' || p.seriesName === '净利润') {
                  result += `${p.marker}${p.seriesName}: ${formatNum(p.value)}<br/>`;
                } else if (p.seriesName === 'ROE') {
                  result += `${p.marker}ROE: ${p.value.toFixed(2)}%<br/>`;
                }
              });
              return result;
            },
          },
          legend: {
            data: ['营业总收入', '净利润', 'ROE'],
            bottom: 0,
            icon: 'roundRect',
            itemWidth: 10,
            itemHeight: 8,
            fontSize: 11,
          },
          grid: { left: '10%', right: '10%', top: '8%', bottom: '12%' },
          xAxis: {
            type: 'category',
            data: dates,
            axisLabel: { fontSize: 10 },
          },
          yAxis: [
            {
              type: 'value',
              name: '金额',
              position: 'left',
              nameTextStyle: { fontSize: 10 },
              axisLabel: {
                fontSize: 10,
                formatter: (v: number) => {
                  if (Math.abs(v) >= 1e8) return (v / 1e8).toFixed(0) + '亿';
                  if (Math.abs(v) >= 1e4) return (v / 1e4).toFixed(0) + '万';
                  return v.toString();
                },
              },
              splitLine: { lineStyle: { type: 'dashed' } },
            },
            {
              type: 'value',
              name: 'ROE(%)',
              position: 'right',
              nameTextStyle: { fontSize: 10 },
              axisLabel: { fontSize: 10, formatter: '{value}%' },
              splitLine: { show: false },
            },
          ],
          series: [
            {
              name: '营业总收入',
              type: 'bar',
              data: revValues,
              yAxisIndex: 0,
              barWidth: '30%',
              itemStyle: {
                color: '#1890ff',
                borderRadius: [4, 4, 0, 0],
              },
              label: {
                show: true,
                position: 'top',
                fontSize: 9,
                formatter: (p: any) => formatNum(p.value),
                color: '#1890ff',
              },
            },
            {
              name: '净利润',
              type: 'bar',
              data: profValues,
              yAxisIndex: 0,
              barWidth: '30%',
              itemStyle: {
                color: '#52c41a',
                borderRadius: [4, 4, 0, 0],
              },
              label: {
                show: true,
                position: 'top',
                fontSize: 9,
                formatter: (p: any) => formatNum(p.value),
                color: '#52c41a',
              },
            },
            {
              name: 'ROE',
              type: 'line',
              data: roeValues,
              yAxisIndex: 1,
              smooth: true,
              lineStyle: { width: 3, color: '#2f54eb' },
              symbol: 'circle',
              symbolSize: 10,
              itemStyle: { color: '#2f54eb', borderColor: '#fff', borderWidth: 2 },
              label: {
                show: true,
                position: 'top',
                fontSize: 10,
                formatter: '{c}%',
                color: '#2f54eb',
                fontWeight: 600,
              },
            },
          ],
        }), [dates, revValues, profValues, roeValues]);

        return (
          <div style={{ padding: '20px' }}>
            <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 600 }}>📈 财务趋势分析</h3>

            <div style={{ padding: 16, background: 'var(--component-bg)', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>财务趋势（过去三年+最新一期）</div>
              <ReactECharts option={chartOption} style={{ height: 320 }} notMerge={true} />
            </div>

            <div style={{ padding: 16, background: 'var(--component-bg)', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>📊 财务风险数轴</div>
              <div style={{ position: 'relative', height: 40, marginBottom: 12 }}>
                <div style={{
                  position: 'absolute', left: 0, right: 0, top: '50%',
                  height: 8, borderRadius: 4,
                  background: 'linear-gradient(to right, #52c41a 0%, #faad14 50%, #ff4d4f 100%)',
                  transform: 'translateY(-50%)',
                }} />
                <div style={{
                  position: 'absolute', left: `${riskScore}%`, top: '50%',
                  width: 16, height: 16, borderRadius: '50%',
                  background: riskLevel.color, border: '3px solid #fff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 2,
                }} />
                <div style={{
                  position: 'absolute', left: `${riskScore}%`, top: -8,
                  transform: 'translateX(-50%)',
                  fontSize: 11, fontWeight: 700, color: riskLevel.color,
                  whiteSpace: 'nowrap',
                }}>
                  {riskScore}分 · {riskLevel.label}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-secondary)' }}>
                <span style={{ color: '#52c41a' }}>低风险(0-30)</span>
                <span style={{ color: '#faad14' }}>中等风险(30-70)</span>
                <span style={{ color: '#ff4d4f' }}>高风险(70-100)</span>
              </div>
              <div style={{ marginTop: 12, display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                <div>资产负债率: <span style={{ fontWeight: 600, color: assetLiabilityRatio > 60 ? '#ff4d4f' : '#52c41a' }}>{assetLiabilityRatio.toFixed(1)}%</span></div>
                <div>销售毛利率: <span style={{ fontWeight: 600, color: grossMargin > 30 ? '#52c41a' : '#faad14' }}>{grossMargin.toFixed(1)}%</span></div>
                <div>净利率: <span style={{ fontWeight: 600, color: netProfitMargin > 15 ? '#52c41a' : '#faad14' }}>{netProfitMargin.toFixed(1)}%</span></div>
              </div>
            </div>

            <div style={{ padding: 16, background: 'var(--component-bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>ROE拆解（杜邦分析）</div>

              <div style={{ textAlign: 'center', marginBottom: 16, padding: 12, background: 'rgba(47, 84, 235, 0.05)', borderRadius: 8 }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#2f54eb' }}>{roe.toFixed(1)}%</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>净资产收益率(ROE)</div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1, padding: 12, background: 'rgba(24, 144, 255, 0.05)', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#1890ff', marginBottom: 4 }}>{netProfitMargin.toFixed(1)}%</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>销售净利率</div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4 }}>净利润/营收</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)', fontSize: 20 }}>×</div>
                <div style={{ flex: 1, padding: 12, background: 'rgba(82, 196, 106, 0.05)', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#52c41a', marginBottom: 4 }}>{assetTurnover.toFixed(2)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>总资产周转率</div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4 }}>营收/总资产</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)', fontSize: 20 }}>×</div>
                <div style={{ flex: 1, padding: 12, background: 'rgba(250, 173, 20, 0.05)', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#faad14', marginBottom: 4 }}>{equityMultiplier.toFixed(2)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>权益乘数</div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4 }}>总资产/净资产</div>
                </div>
              </div>

              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                  <div>营收: {formatNum(totalRevenue)}</div>
                  <div>净利润: {formatNum(netProfit)}</div>
                  <div>总资产: {formatNum(totalAssets)}</div>
                  <div>净资产: {formatNum(totalEquity)}</div>
                </div>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      meta: {
        id: 'technical-indicators',
        name: '技术指标',
        description: '综合技术指标分析',
        category: 'panel',
        icon: '📐',
        implemented: true,
        tags: ['技术'],
      },
      component: () => {
        return (
          <div style={{ padding: '20px' }}>
            <h3 style={{ marginBottom: 12, color: '#1f2937' }}>📐 技术指标</h3>
            <div style={{ color: '#8c8c8c', fontSize: 12 }}>（占位组件：等待真实数据接口）</div>
          </div>
        );
      },
    },
    {
      meta: {
        id: 'financial-risk-indicators',
        name: '财务风险指标',
        description: '财务风险监控指标',
        category: 'panel',
        icon: '⚠️',
        implemented: true,
        tags: ['风险', '财务'],
      },
      component: () => {
        return (
          <div style={{ padding: '20px' }}>
            <h3 style={{ marginBottom: 12, color: '#1f2937' }}>⚠️ 财务风险指标</h3>
            <div style={{ color: '#8c8c8c', fontSize: 12 }}>（占位组件：等待真实数据接口）</div>
          </div>
        );
      },
    },
    {
      meta: {
        id: 'pledge-risk',
        name: '股权质押风险',
        description: '股权质押风险分析',
        category: 'card',
        icon: '🔒',
        implemented: true,
        tags: ['风险'],
      },
      component: () => {
        return (
          <div style={{ padding: '20px' }}>
            <h3 style={{ marginBottom: 12, color: '#1f2937' }}>🔒 股权质押风险</h3>
            <div style={{ color: '#8c8c8c', fontSize: 12 }}>（占位组件：等待真实数据接口）</div>
          </div>
        );
      },
    },
    {
      meta: {
        id: 'margin-risk',
        name: '融资融券风险',
        description: '融资融券风险监控',
        category: 'card',
        icon: '📊',
        implemented: true,
        tags: ['风险'],
      },
      component: () => {
        return (
          <div style={{ padding: '20px' }}>
            <h3 style={{ marginBottom: 12, color: '#1f2937' }}>📊 融资融券风险</h3>
            <div style={{ color: '#8c8c8c', fontSize: 12 }}>（占位组件：等待真实数据接口）</div>
          </div>
        );
      },
    },
    {
      meta: {
        id: 'risk-summary',
        name: '风险总结',
        description: '风险评估总结报告',
        category: 'panel',
        icon: '📝',
        implemented: true,
        tags: ['风险'],
      },
      component: () => {
        return (
          <div style={{ padding: '20px' }}>
            <h3 style={{ marginBottom: 12, color: '#1f2937' }}>📝 风险总结</h3>
            <div style={{ color: '#8c8c8c', fontSize: 12 }}>（占位组件：等待真实数据接口）</div>
          </div>
        );
      },
    },
    {
      meta: {
        id: 'news-hot-topics',
        name: '新闻热点',
        description: '相关新闻热点话题汇总',
        category: 'panel',
        icon: '🔥',
        implemented: true,
        tags: ['新闻'],
      },
      component: () => {
        return (
          <div style={{ padding: '20px' }}>
            <h3 style={{ marginBottom: 12, color: '#1f2937' }}>🔥 新闻热点</h3>
            <div style={{ color: '#8c8c8c', fontSize: 12 }}>（占位组件：等待真实数据接口）</div>
          </div>
        );
      },
    },
    {
      meta: {
        id: 'northbound-flow',
        name: '北向资金',
        description: '北向资金流向数据',
        category: 'chart',
        icon: '🧭',
        implemented: true,
        tags: ['资金'],
      },
      component: ({ data }: WidgetProps) => {
        // 使用类型断言避免错误，因为这些字段可能不在类型定义中
        const dataAsAny = data as any;
        
        // 优先使用新的季度持股数据
        const quarterlyData = dataAsAny.northbound_quarterly || [];
        
        if (quarterlyData.length > 0) {
          // 显示过去5个季度的持股变化图
          const chartData = quarterlyData.map((item: any) => ({
            date: item['日期'] || item.date,
            shares: item['持股数量'] || item.shares || 0,
            marketValue: item['持股市值'] || item.marketValue || 0,
            ratio: item['持股比例'] || item.ratio || 0,
          })).reverse(); // 反转以便从左到右显示时间顺序

          return (
            <div style={{ padding: '20px' }}>
              <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, textAlign: 'center' }}>
                🧭 北向资金季度持股变化（近5个季度）
              </div>
              <div style={{ color: '#8c8c8c', fontSize: 11, textAlign: 'center', marginBottom: 12 }}>
                ⚠️ 自2024年8月19日起，北向资金每日详细数据已不再披露，当前显示季度末持股情况
              </div>
              
              {/* 持股数量趋势 */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>持股数量（万股）</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', height: 120, gap: 8, padding: '0 10px' }}>
                  {chartData.map((item: any, index: number) => {
                    const maxShares = Math.max(...chartData.map((d: any) => d.shares));
                    const height = maxShares > 0 ? (item.shares / maxShares) * 100 : 0;
                    return (
                      <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ fontSize: 10, color: '#595959', marginBottom: 4 }}>
                          {(item.shares / 10000).toFixed(0)}
                        </div>
                        <div
                          style={{
                            width: '100%',
                            height: `${height}%`,
                            background: 'linear-gradient(to top, #1890ff, #40a9ff)',
                            borderRadius: '4px 4px 0 0',
                            minHeight: 4,
                          }}
                        />
                        <div style={{ fontSize: 10, color: '#8c8c8c', marginTop: 4 }}>
                          {item.date?.substring(5, 10) || ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 持股比例趋势 */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>持股比例（%）</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', height: 100, gap: 8, padding: '0 10px' }}>
                  {chartData.map((item: any, index: number) => {
                    const maxRatio = Math.max(...chartData.map((d: any) => d.ratio));
                    const height = maxRatio > 0 ? (item.ratio / maxRatio) * 100 : 0;
                    return (
                      <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ fontSize: 10, color: '#595959', marginBottom: 4 }}>
                          {item.ratio.toFixed(2)}%
                        </div>
                        <div
                          style={{
                            width: '100%',
                            height: `${height}%`,
                            background: 'linear-gradient(to top, #52c41a, #73d13d)',
                            borderRadius: '4px 4px 0 0',
                            minHeight: 4,
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 最新季度详情 */}
              {chartData.length > 0 && (
                <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 6, marginTop: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8 }}>最新季度（{chartData[chartData.length - 1]?.date?.substring(0, 7) || ''}）</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11 }}>
                    <div>
                      <span style={{ color: '#8c8c8c' }}>持股数量：</span>
                      <span style={{ fontWeight: 500 }}>{(chartData[chartData.length - 1]?.shares / 10000).toFixed(0)} 万股</span>
                    </div>
                    <div>
                      <span style={{ color: '#8c8c8c' }}>持股市值：</span>
                      <span style={{ fontWeight: 500 }}>{((chartData[chartData.length - 1]?.marketValue || 0) / 1e8).toFixed(2)} 亿</span>
                    </div>
                    <div>
                      <span style={{ color: '#8c8c8c' }}>持股比例：</span>
                      <span style={{ fontWeight: 500 }}>{chartData[chartData.length - 1]?.ratio.toFixed(2)}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        }

        // 如果没有季度数据，显示提示信息
        return (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🧭</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>北向资金</div>
            <div style={{ color: '#8c8c8c', fontSize: 12 }}>
              自2024年8月19日起，北向资金每日详细数据已不再披露<br />
              当前仅可获取季度持股数据及每日交易总额
            </div>
          </div>
        );
      },
    },
    {
      meta: {
        id: 'company-profile',
        name: '公司简介',
        description: '公司基本信息与概况',
        category: 'card',
        icon: '🏢',
        implemented: true,
        requiredData: ['company_info'],
        tags: ['公司', '基本信息'],
        defaultSize: { w: 40, h: 30 },
      },
      component: ({ data }) => {
        return <CompanyProfileCard data={data} />;
      },
    },
    {
      meta: {
        id: 'capital-operation',
        name: '资本运作',
        description: '募集资金、投资项目、收购兼并等资本运作信息',
        category: 'panel',
        icon: '💰',
        implemented: true,
        tags: ['资本运作', '投资', '融资'],
        defaultSize: { w: 40, h: 35 },
      },
      component: ({ data }) => {
        return <CapitalOperationPanel data={data} />;
      },
    },
    {
      meta: {
        id: 'dcf-valuation',
        name: 'DCF估值',
        description: '现金流折现估值分析',
        category: 'chart',
        icon: '💎',
        implemented: true,
        requiredData: ['symbol'],
        tags: ['估值'],
      },
      component: ({ data }) => {
        // 复用 SensitivityHeatmap 组件的逻辑，这里我们简化为展示 DCF 估值结果
        const [dcfData, setDcfData] = React.useState<any>(null);
        const [loading, setLoading] = React.useState(false);
        const [error, setError] = React.useState<string | null>(null);

        const symbol = data?.symbol;

        React.useEffect(() => {
          if (!symbol) {
            return;
          }

          const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
              const { getDCFAnalysis } = await import('../api/stockApi');
              const data = await getDCFAnalysis(symbol);
              setDcfData(data);
            } catch (err) {
              setError('获取 DCF 数据失败');
            } finally {
              setLoading(false);
            }
          };

          fetchData();
        }, [symbol]);

        if (loading) {
          return (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 24 }}>⏳</div>
              <div style={{ marginTop: 8, fontSize: 13, color: '#8c8c8c' }}>正在获取 DCF 估值数据...</div>
            </div>
          );
        }

        if (error || !dcfData) {
          return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>💎</div>
              <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>DCF估值</div>
              <div style={{ color: '#8c8c8c', fontSize: 12 }}>
                {error || '暂无 DCF 估值数据'}
              </div>
            </div>
          );
        }

        const fairValue = dcfData.fair_value;
        const currentPrice = dcfData.current_price;
        const upside = dcfData.upside_potential;
        const wacc = dcfData.wacc;
        const terminalGrowth = dcfData.terminal_growth;

        return (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>DCF 估值结果</h3>
                <p style={{ margin: '6px 0 0 0', fontSize: 12, color: '#8c8c8c' }}>
                  基于自由现金流折现模型计算的内在价值
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div style={{ background: '#f0f9ff', padding: 16, borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: '#667eea', marginBottom: 4, fontWeight: 500 }}>内在价值</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#667eea' }}>
                  ¥{fairValue?.toFixed(2) || '--'}
                </div>
              </div>

              <div style={{ background: '#f6ffed', padding: 16, borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: '#52c41a', marginBottom: 4, fontWeight: 500 }}>当前价格</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#52c41a' }}>
                  ¥{currentPrice?.toFixed(2) || '--'}
                </div>
              </div>

              <div style={{ background: upside >= 0 ? '#fff7e6' : '#fff2f0', padding: 16, borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: upside >= 0 ? '#faad14' : '#ff4d4f', marginBottom: 4, fontWeight: 500 }}>
                  相对空间
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: upside >= 0 ? '#faad14' : '#ff4d4f' }}>
                  {upside >= 0 ? '+' : ''}{upside?.toFixed(2) || '--'}%
                </div>
              </div>
            </div>

            <div style={{ marginTop: 20, padding: 16, background: '#fafafa', borderRadius: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12, color: '#595959' }}>核心参数</div>
              <div style={{ display: 'flex', justifyContent: 'space-around', gap: 16 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 2 }}>WACC</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{wacc?.toFixed(1) || '--'}%</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 2 }}>永续增长率</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{terminalGrowth?.toFixed(1) || '--'}%</div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 12, fontSize: 11, color: '#8c8c8c', textAlign: 'center' }}>
              💡 DCF 估值基于自由现金流折现模型，仅供参考，不构成投资建议
            </div>
          </div>
        );
      },
    },
    {
      meta: {
        id: 'profitability-analysis',
        name: '盈利能力分析',
        description: 'ROE、毛利率等指标',
        category: 'chart',
        icon: '📈',
        implemented: true,
        requiredData: ['deep_financial'],
        tags: ['财务'],
      },
      component: ({ data }) => {
        const finIndicators = data?.deep_financial?.financial_indicators;
        if (!finIndicators || finIndicators.length === 0) {
          return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📈</div>
              <div style={{ color: '#8c8c8c', fontSize: 13 }}>暂无盈利能力数据</div>
            </div>
          );
        }
        // 只保留年报数据（12-31）
        const annualIndicators = finIndicators.filter((item: any) => {
          const dateStr = String(item['日期'] || '');
          return dateStr.includes('12-31');
        });
        // 如果年报数据不足，回退到原始数据
        const useIndicators = annualIndicators.length >= 2 ? annualIndicators : finIndicators;
        const latest = useIndicators[0];
        const getValue = (item: any, key: string) => {
          const v = item[key];
          return v !== null && v !== undefined ? Number(v) : 0;
        };
        const roe = getValue(latest, '净资产收益率(%)');
        const grossMargin = getValue(latest, '销售毛利率(%)');
        const getLevel = (val: number, goodThreshold: number, warnThreshold: number) => {
          if (val >= goodThreshold) return { color: '#52c41a', level: '优秀' };
          if (val >= warnThreshold) return { color: '#faad14', level: '一般' };
          return { color: '#ff4d4f', level: '需关注' };
        };
        const roeLevel = getLevel(roe, 15, 8);
        const marginLevel = getLevel(grossMargin, 40, 20);
        const renderGauge = (value: number, max: number, color: string, label: string) => {
          const percent = Math.min(100, Math.max(0, (value / max) * 100));
          return (
            <div style={{ flex: 1, textAlign: 'center', padding: 16, background: 'var(--component-bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ marginBottom: 12 }}>
                <svg width="120" height="70" viewBox="0 0 120 70">
                  <path d="M10 65 A50 50 0 0 1 110 65" fill="none" stroke="var(--border)" strokeWidth="8" strokeLinecap="round" />
                  <path d="M10 65 A50 50 0 0 1 110 65" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${percent * 1.57} 314`} />
                </svg>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{value.toFixed(1)}%</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: color }}>{label}</div>
            </div>
          );
        };
        const getDisplayDate = (item: any) => {
          const dateStr = String(item['日期'] || '');
          if (dateStr.includes('12-31')) {
            return dateStr.slice(0, 4); // 只显示年份
          }
          return dateStr.slice(0, 7); // 显示年月
        };
        return (
          <div style={{ padding: '20px' }}>
            <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 600 }}>📈 盈利能力分析</h3>
            <div style={{ display: 'flex', gap: 16 }}>
              {renderGauge(roe, 30, roeLevel.color, `ROE ${roeLevel.level}`)}
              {renderGauge(grossMargin, 80, marginLevel.color, `毛利率 ${marginLevel.level}`)}
            </div>
            {useIndicators.length > 1 && (
              <div style={{ marginTop: 16, padding: 12, background: 'var(--component-bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>历史趋势（最近5年）</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {useIndicators.slice(0, 5).reverse().map((item, i) => {
                    const r = getValue(item, '净资产收益率(%)');
                    const m = getValue(item, '销售毛利率(%)');
                    return (
                      <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{getDisplayDate(item)}</div>
                        <div style={{ fontSize: 12, color: r >= 0 ? '#52c41a' : '#ff4d4f' }}>ROE: {r.toFixed(1)}%</div>
                        <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>毛利: {m.toFixed(1)}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      },
    },
    {
      meta: {
        id: 'macd-analysis',
        name: 'MACD分析',
        description: 'MACD指标趋势分析',
        category: 'chart',
        icon: '📉',
        implemented: true,
        requiredData: ['history', 'technical'],
        tags: ['技术'],
        defaultSize: { w: 40, h: 28 },
      },
      component: ({ data }) => {
        return <MACDAnalysis data={data} />;
      },
    },
    {
      meta: {
        id: 'kdj-analysis',
        name: 'KDJ分析',
        description: 'KDJ指标超买超卖分析',
        category: 'chart',
        icon: '📊',
        implemented: true,
        requiredData: ['history', 'technical'],
        tags: ['技术'],
        defaultSize: { w: 40, h: 28 },
      },
      component: ({ data }) => {
        return <KDJAnalysis data={data} />;
      },
    },
    {
      meta: {
        id: 'risk-heatmap',
        name: '风险热力图',
        description: '多维度风险热力图',
        category: 'chart',
        icon: '🔥',
        implemented: true,
        tags: ['风险'],
      },
      component: () => {
        return (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔥</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>风险热力图</div>
            <div style={{ color: '#8c8c8c', fontSize: 12 }}>（占位组件：等待真实数据接口）</div>
          </div>
        );
      },
    },
    {
      meta: {
        id: 'cashflow-risk',
        name: '现金流风险',
        description: '现金流风险分析',
        category: 'panel',
        icon: '💵',
        implemented: true,
        tags: ['风险', '财务'],
      },
      component: () => {
        return (
          <div style={{ padding: '20px' }}>
            <h3 style={{ marginBottom: 12, color: '#1f2937' }}>💵 现金流风险</h3>
            <div style={{ color: '#8c8c8c', fontSize: 12 }}>（占位组件：等待真实数据接口）</div>
          </div>
        );
      },
    },
    {
      meta: {
        id: 'insider-trading',
        name: '内幕交易',
        description: '高管增减持情况',
        category: 'panel',
        icon: '👤',
        implemented: true,
        tags: ['风险'],
      },
      component: () => {
        return (
          <div style={{ padding: '20px' }}>
            <h3 style={{ marginBottom: 12, color: '#1f2937' }}>👤 内幕交易</h3>
            <div style={{ color: '#8c8c8c', fontSize: 12 }}>（占位组件：等待真实数据接口）</div>
          </div>
        );
      },
    },
    {
      meta: {
        id: 'legal-risk',
        name: '法律风险',
        description: '法律诉讼风险分析',
        category: 'panel',
        icon: '⚖️',
        implemented: true,
        tags: ['风险'],
      },
      component: () => {
        return (
          <div style={{ padding: '20px' }}>
            <h3 style={{ marginBottom: 12, color: '#1f2937' }}>⚖️ 法律风险</h3>
            <div style={{ color: '#8c8c8c', fontSize: 12 }}>（占位组件：等待真实数据接口）</div>
          </div>
        );
      },
    },
    {
      meta: {
        id: 'risk-recommendations',
        name: '风险建议',
        description: '风控建议和应对策略',
        category: 'panel',
        icon: '💡',
        implemented: true,
        tags: ['风险'],
      },
      component: () => {
        return (
          <div style={{ padding: '20px' }}>
            <h3 style={{ marginBottom: 12, color: '#1f2937' }}>💡 风险建议</h3>
            <div style={{ color: '#8c8c8c', fontSize: 12 }}>（占位组件：等待真实数据接口）</div>
          </div>
        );
      },
    },
  ];

  widgetRegistry.registerAll(registrations);
  console.log(`[WidgetRegistry] 已注册 ${widgetRegistry.count} 个Widget组件 (已实现: ${widgetRegistry.getImplemented().length})`);
}

export { registerAllWidgets };
