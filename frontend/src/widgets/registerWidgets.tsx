/**
 * Widget组件注册中心
 * 将所有分析组件适配为WidgetProps接口并注册到WidgetRegistry
 * 新增组件只需在此文件添加注册即可，无需修改Dashboard
 */

import React from 'react';
import { message } from 'antd';
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
        return (
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', top: 8, right: 12, zIndex: 10, background: 'rgba(102, 126, 234, 0.9)', color: '#fff', fontSize: 10, padding: '2px 8px', borderRadius: 4 }}>⚡ 动态组件</div>
            <KLineChart data={data.history} height={400} />
          </div>
        );
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
          title="估值对比"
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
      component: () => (
        <PeerComparison
          companies={[
            { name: '贵州茅台', marketCap: 18500, peRatio: 28.5, pbRatio: 6.4, isTarget: true },
            { name: '五粮液', marketCap: 5200, peRatio: 20.5, pbRatio: 2.9, isTarget: false },
            { name: '山西汾酒', marketCap: 2800, peRatio: 22.3, pbRatio: 3.9, isTarget: false },
            { name: '泸州老窖', marketCap: 3500, peRatio: 23.2, pbRatio: 2.9, isTarget: false },
            { name: '酒鬼酒', marketCap: 480, peRatio: 32.1, pbRatio: 3.7, isTarget: false },
            { name: '水井坊', marketCap: 320, peRatio: 25.8, pbRatio: 3.0, isTarget: false },
            { name: '舍得酒业', marketCap: 520, peRatio: 26.5, pbRatio: 2.6, isTarget: false },
            { name: '迎驾贡酒', marketCap: 620, peRatio: 21.8, pbRatio: 2.7, isTarget: false },
            { name: '今世缘', marketCap: 720, peRatio: 19.2, pbRatio: 2.4, isTarget: false }
          ]}
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
        defaultSize: { w: 40, h: 25 },
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
        name: '均线技术分析',
        description: 'MA均线系统技术分析',
        category: 'panel',
        icon: '📐',
        implemented: true,
        defaultSize: { w: 20, h: 14 },
        tags: ['技术', '深度'],
      },
      component: () => <MATechnicalAnalysis />,
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
      component: () => {
        return (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>😊</div>
            <div style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>市场情绪：乐观</div>
            <div style={{ color: '#52c41a', fontSize: 18 }}>情绪指数：72/100</div>
            <div style={{ marginTop: 16, color: '#8c8c8c', fontSize: 12 }}>（占位组件：等待真实数据接口）</div>
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
      component: () => {
        return (
          <div style={{ padding: '20px' }}>
            <h3 style={{ marginBottom: 12, color: '#1f2937' }}>🏭 行业新闻</h3>
            <div style={{ color: '#8c8c8c', fontSize: 12 }}>（占位组件：等待真实数据接口）</div>
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
      component: () => {
        return (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📉</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>历史资金流向</div>
            <div style={{ color: '#8c8c8c', fontSize: 12 }}>（占位组件：等待真实数据接口）</div>
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
      component: () => {
        return (
          <div style={{ padding: '20px' }}>
            <h3 style={{ marginBottom: 12, color: '#1f2937' }}>💪 主力资金</h3>
            <div style={{ color: '#8c8c8c', fontSize: 12 }}>（占位组件：等待真实数据接口）</div>
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
        // 只保留年报数据（12-31）
        const annualIndicators = finIndicators.filter((item: any) => {
          const dateStr = String(item['日期'] || '');
          return dateStr.includes('12-31');
        });
        // 过去三年的年报
        const pastThreeYears = annualIndicators.slice(0, 3);
        // 最新一期（可能是季报或年报）
        const latest = finIndicators[0];
        // 检查最新一期是否已经在年报列表中
        const latestDate = String(latest['日期'] || '');
        const isLatestInAnnual = pastThreeYears.some(item => String(item['日期']) === latestDate);
        // 组合数据：过去三年年报 + 最新一期（如果不在年报中）
        const useIndicators = isLatestInAnnual
          ? pastThreeYears
          : [latest, ...pastThreeYears];

        const getValue = (item: any, key: string) => {
          const v = item[key];
          return v !== null && v !== undefined ? Number(v) : 0;
        };
        const formatNum = (num: number) => {
          if (Math.abs(num) >= 1e8) return (num / 1e8).toFixed(1) + '亿';
          if (Math.abs(num) >= 1e4) return (num / 1e4).toFixed(1) + '万';
          return num.toFixed(1);
        };
        const getDisplayDate = (item: any) => {
          const dateStr = String(item['日期'] || '');
          if (dateStr.includes('12-31')) {
            return dateStr.slice(0, 4); // 只显示年份
          }
          return dateStr; // 显示完整日期
        };

        const displayData = useIndicators.slice(0, 5).reverse();
        const dates = displayData.map(getDisplayDate);
        const revValues = displayData.map(item => getValue(item, '营业总收入(元)'));
        const profValues = displayData.map(item => getValue(item, '净利润(元)'));
        const roeValues = displayData.map(item => getValue(item, '净资产收益率(%)'));

        const revMax = Math.max(...revValues.map(Math.abs), 1);
        const profMax = Math.max(...profValues.map(Math.abs), 1);

        // 最新数据用于ROE拆解
        const latestForDuPont = useIndicators[0];
        const netProfit = getValue(latestForDuPont, '净利润(元)');
        const totalRevenue = getValue(latestForDuPont, '营业总收入(元)');
        const totalAssets = getValue(latestForDuPont, '资产总额(元)');
        const totalEquity = getValue(latestForDuPont, '所有者权益合计(元)');

        // 杜邦分析三要素
        const netProfitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0; // 销售净利率
        const assetTurnover = totalAssets > 0 ? totalRevenue / totalAssets : 0; // 总资产周转率
        const equityMultiplier = totalEquity > 0 ? totalAssets / totalEquity : 0; // 权益乘数
        const roe = netProfitMargin * assetTurnover * equityMultiplier;

        return (
          <div style={{ padding: '20px' }}>
            <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 600 }}>📈 财务趋势分析</h3>

            {/* 合并的财务趋势柱状图 */}
            <div style={{ padding: 16, background: 'var(--component-bg)', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>财务趋势（过去三年+最新一期）</div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8, justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                  <div style={{ width: 12, height: 12, background: '#1890ff', borderRadius: 2 }} />
                  <span style={{ color: 'var(--text-secondary)' }}>营业总收入</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                  <div style={{ width: 12, height: 12, background: '#52c41a', borderRadius: 2 }} />
                  <span style={{ color: 'var(--text-secondary)' }}>净利润</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                  <div style={{ width: 12, height: 12, background: '#2f54eb', borderRadius: 2 }} />
                  <span style={{ color: 'var(--text-secondary)' }}>ROE(%)</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                {dates.map((date, i) => {
                  const revHeight = Math.max(20, (Math.abs(revValues[i]) / revMax) * 60);
                  const profHeight = Math.max(20, (Math.abs(profValues[i]) / profMax) * 60);
                  const roeHeight = Math.max(20, Math.min(100, roeValues[i]));
                  // 检查是否是最新一期（最后一个显示）
                  const isLatest = i === dates.length - 1;
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, opacity: isLatest ? 1 : 0.85 }}>
                      <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
                        {/* 营业总收入 */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div style={{ fontSize: 9, color: 'var(--text-secondary)' }}>{formatNum(revValues[i])}</div>
                          <div style={{ width: isLatest ? 20 : 16, height: revHeight, background: '#1890ff', borderRadius: 2, opacity: 0.9 }} />
                        </div>
                        {/* 净利润 */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div style={{ fontSize: 9, color: 'var(--text-secondary)' }}>{formatNum(profValues[i])}</div>
                          <div style={{ width: isLatest ? 20 : 16, height: profHeight, background: '#52c41a', borderRadius: 2, opacity: 0.9 }} />
                        </div>
                        {/* ROE */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div style={{ fontSize: 9, color: 'var(--text-secondary)' }}>{roeValues[i].toFixed(1)}</div>
                          <div style={{ width: isLatest ? 20 : 16, height: roeHeight, background: '#2f54eb', borderRadius: 2, opacity: 0.9 }} />
                        </div>
                      </div>
                      <div style={{ fontSize: 10, color: isLatest ? '#1890ff' : 'var(--text-secondary)', marginTop: 4, fontWeight: isLatest ? 600 : 400 }}>{date}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ROE拆解（杜邦分析） */}
            <div style={{ padding: 16, background: 'var(--component-bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>ROE拆解（杜邦分析）</div>

              {/* ROE总览 */}
              <div style={{ textAlign: 'center', marginBottom: 16, padding: 12, background: 'rgba(47, 84, 235, 0.05)', borderRadius: 8 }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#2f54eb' }}>{roe.toFixed(1)}%</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>净资产收益率(ROE)</div>
              </div>

              {/* 杜邦三要素 */}
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

              {/* 基础数据 */}
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
      component: () => {
        return (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🧭</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>北向资金</div>
            <div style={{ color: '#8c8c8c', fontSize: 12 }}>（占位组件：等待真实数据接口）</div>
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
        tags: ['技术'],
      },
      component: () => {
        return (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📉</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>MACD分析</div>
            <div style={{ color: '#8c8c8c', fontSize: 12 }}>（占位组件：等待真实数据接口）</div>
          </div>
        );
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
        tags: ['技术'],
      },
      component: () => {
        return (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>KDJ分析</div>
            <div style={{ color: '#8c8c8c', fontSize: 12 }}>（占位组件：等待真实数据接口）</div>
          </div>
        );
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
