/**
 * 分析模式模板 - 单一全组件模式，包含所有分析组件
 */

export interface WidgetConfig {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  requiredData?: string[];
  state?: {
    chartView?: {
      enabled: boolean;
      chartType: string;
    };
    params?: Record<string, any>;
  };
}

export interface TabConfig {
  id: string;
  name: string;
  description?: string;
  layout: WidgetConfig[];
}

export interface AnalysisModeTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  allowCustomization: boolean;
  tabs: Record<string, TabConfig>;
}

export const FULL_ANALYSIS_MODE: AnalysisModeTemplate = {
  id: 'full-analysis',
  name: '📊 综合分析',
  description: '包含所有分析组件的完整报告',
  icon: '📊',
  allowCustomization: true,
  tabs: {
    'overview': {
      id: 'overview',
      name: '概览',
      description: '股票核心信息一览',
      layout: [
        { i: 'company-profile', x: 0, y: 0, w: 40, h: 26, requiredData: ['company_info'] },
        { i: 'kline-chart', x: 0, y: 26, w: 40, h: 22, requiredData: ['history'] },
        { i: 'valuation-comparison', x: 0, y: 48, w: 20, h: 14, requiredData: ['valuation', 'latest_price', 'deep_financial'] },
        { i: 'analyst-consensus', x: 20, y: 48, w: 20, h: 14, requiredData: ['analyst_consensus', 'latest_price'] },
      ]
    },
    'financial': {
      id: 'financial',
      name: '财务分析',
      description: '深度财务数据挖掘',
      layout: [
        { i: 'deep-financial-table', x: 0, y: 0, w: 40, h: 25, requiredData: ['deep_financial'] },
        { i: 'financial-indicators', x: 0, y: 25, w: 20, h: 12, requiredData: ['deep_financial'] },
        { i: 'profitability-analysis', x: 20, y: 25, w: 20, h: 12, requiredData: ['deep_financial'] },
        { i: 'financial-trend', x: 0, y: 37, w: 40, h: 15, requiredData: ['deep_financial'] },
        { i: 'roe-analysis', x: 0, y: 52, w: 40, h: 28, requiredData: ['deep_financial'] },
      ]
    },
    'valuation': {
      id: 'valuation',
      name: '估值分析',
      description: '多模型估值对比',
      layout: [
        { i: 'dcf-valuation', x: 0, y: 0, w: 40, h: 14, requiredData: ['symbol'] },
        { i: 'sensitivity-heatmap', x: 0, y: 14, w: 40, h: 15, requiredData: ['symbol'] },
        { i: 'peer-comparison', x: 0, y: 29, w: 40, h: 15, requiredData: ['symbol'] },
      ]
    },
    'risk': {
      id: 'risk',
      name: '风险分析',
      description: '风险指标监控',
      layout: [
        { i: 'risk-score-card', x: 0, y: 0, w: 40, h: 24, requiredData: ['risk_indicators'] },
        { i: 'risk-indicators-panel', x: 0, y: 24, w: 24, h: 12, requiredData: ['risk_indicators'] },
        { i: 'manual-risk-editor', x: 24, y: 24, w: 16, h: 12, requiredData: ['symbol', 'smart_analysis'] },
      ]
    },
    'technical': {
      id: 'technical',
      name: '技术分析',
      description: '技术指标分析',
      layout: [
        { i: 'kline-chart', x: 0, y: 0, w: 40, h: 22, requiredData: ['history'] },
        { i: 'macd-analysis', x: 0, y: 22, w: 20, h: 14, requiredData: ['history', 'technical'] },
        { i: 'kdj-analysis', x: 20, y: 22, w: 20, h: 14, requiredData: ['history', 'technical'] },
        { i: 'ma-technical-analysis', x: 0, y: 36, w: 40, h: 14, requiredData: ['technical'] },
      ]
    },
    'fund-flow': {
      id: 'fund-flow',
      name: '资金流向',
      description: '主力资金和北向资金',
      layout: [
        { i: 'fund-flow-chart', x: 0, y: 0, w: 40, h: 18, requiredData: ['fund_flow'] },
        { i: 'main-force-flow', x: 0, y: 18, w: 20, h: 14, requiredData: ['fund_flow'] },
        { i: 'northbound-flow', x: 20, y: 18, w: 20, h: 14, requiredData: ['northbound_flow'] },
        { i: 'fund-flow', x: 0, y: 32, w: 40, h: 12, requiredData: ['fund_flow'] },
      ]
    },
    'news': {
      id: 'news',
      name: '新闻舆情',
      description: '最新资讯和市场情绪',
      layout: [
        { i: 'news-section', x: 0, y: 0, w: 40, h: 24, requiredData: ['news_analysis', 'sources_summary'] },
        { i: 'market-sentiment', x: 0, y: 24, w: 20, h: 12, requiredData: ['news_analysis'] },
        { i: 'industry-news', x: 20, y: 24, w: 20, h: 12, requiredData: ['industry_news'] },
      ]
    },
    'capital': {
      id: 'capital',
      name: '资本运作',
      description: '募集资金、投资项目、收购兼并等',
      layout: [
        { i: 'capital-operation', x: 0, y: 0, w: 40, h: 40, requiredData: ['capital_operation'] }
      ]
    },
    'unified-data': {
      id: 'unified-data',
      name: '五层数据',
      description: '行情/研报/新闻/基础/公告统一展示',
      layout: [
        { i: 'unified-data-panel', x: 0, y: 0, w: 40, h: 40, requiredData: ['symbol'] }
      ]
    }
  }
};

export const ANALYSIS_MODES: AnalysisModeTemplate[] = [
  FULL_ANALYSIS_MODE
];

export const getAnalysisModeById = (id: string): AnalysisModeTemplate | undefined => {
  return ANALYSIS_MODES.find(mode => mode.id === id);
};
