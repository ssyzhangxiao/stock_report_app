
/**
 * 分析模式模板 - 参考OpenBB应用架构
 * 3个核心模式：快速概览、深度分析、风控尽职
 */

export interface WidgetConfig {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
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

export const QUICK_OVERVIEW_MODE: AnalysisModeTemplate = {
  id: 'quick-view',
  name: '快速概览',
  description: '5分钟内获取核心指标，快速决策（K线、新闻、资金流向）',
  icon: '⚡',
  allowCustomization: true,
  tabs: {
    'overview': {
      id: 'overview',
      name: '概览',
      description: '股票核心信息一览',
      layout: [
        { i: 'kline-chart', x: 0, y: 0, w: 40, h: 22 },
        { i: 'valuation-comparison', x: 0, y: 22, w: 20, h: 14 },
        { i: 'analyst-consensus', x: 20, y: 22, w: 20, h: 14 },
        { i: 'fund-flow', x: 0, y: 36, w: 20, h: 12 },
        { i: 'news-section', x: 20, y: 36, w: 20, h: 12 },
        { i: 'market-sentiment', x: 0, y: 48, w: 20, h: 12 }
      ]
    },
    'news': {
      id: 'news',
      name: '新闻舆情',
      description: '最新资讯和市场情绪',
      layout: [
        { i: 'news-section', x: 0, y: 0, w: 40, h: 24 },
        { i: 'market-sentiment', x: 0, y: 24, w: 20, h: 12 },
        { i: 'industry-news', x: 20, y: 24, w: 20, h: 12 },
        { i: 'news-hot-topics', x: 0, y: 36, w: 40, h: 10 }
      ]
    },
    'fund-flow': {
      id: 'fund-flow',
      name: '资金流向',
      description: '主力资金和龙虎榜数据',
      layout: [
        { i: 'fund-flow-chart', x: 0, y: 0, w: 40, h: 18 },
        { i: 'main-force-flow', x: 0, y: 18, w: 20, h: 14 },
        { i: 'dragon-tiger-list', x: 20, y: 18, w: 20, h: 14 },
        { i: 'northbound-flow', x: 0, y: 32, w: 40, h: 12 }
      ]
    }
  }
};

export const DEEP_ANALYSIS_MODE: AnalysisModeTemplate = {
  id: 'deep-analysis',
  name: '深度分析',
  description: '全方位深度分析（估值、财务、风险、技术指标）',
  icon: '💎',
  allowCustomization: true,
  tabs: {
    'valuation': {
      id: 'valuation',
      name: '估值分析',
      description: '多模型估值对比',
      layout: [
        { i: 'kline-chart', x: 0, y: 0, w: 40, h: 18 },
        { i: 'valuation-comparison', x: 0, y: 18, w: 20, h: 15 },
        { i: 'peer-comparison', x: 20, y: 18, w: 20, h: 15 },
        { i: 'sensitivity-heatmap', x: 0, y: 33, w: 40, h: 15 },
        { i: 'dcf-valuation', x: 0, y: 48, w: 40, h: 12 }
      ]
    },
    'financial': {
      id: 'financial',
      name: '财务分析',
      description: '深度财务数据挖掘',
      layout: [
        { i: 'deep-financial-table', x: 0, y: 0, w: 40, h: 25 },
        { i: 'financial-indicators', x: 0, y: 25, w: 20, h: 12 },
        { i: 'financial-trend', x: 20, y: 25, w: 20, h: 12 },
        { i: 'profitability-analysis', x: 0, y: 37, w: 40, h: 15 }
      ]
    },
    'risk': {
      id: 'risk',
      name: '风险分析',
      description: '风险指标监控',
      layout: [
        { i: 'risk-dashboard', x: 0, y: 0, w: 40, h: 18 },
        { i: 'risk-indicators-panel', x: 0, y: 18, w: 24, h: 12 },
        { i: 'manual-risk-editor', x: 24, y: 18, w: 16, h: 12 },
        { i: 'risk-score-card', x: 0, y: 30, w: 40, h: 12 }
      ]
    },
    'technical': {
      id: 'technical',
      name: '技术指标',
      description: '技术分析工具',
      layout: [
        { i: 'kline-chart', x: 0, y: 0, w: 40, h: 20 },
        { i: 'technical-indicators', x: 0, y: 20, w: 20, h: 14 },
        { i: 'fund-flow', x: 20, y: 20, w: 20, h: 14 },
        { i: 'macd-analysis', x: 0, y: 34, w: 20, h: 12 },
        { i: 'kdj-analysis', x: 20, y: 34, w: 20, h: 12 }
      ]
    }
  }
};

export const RISK_DILIGENCE_MODE: AnalysisModeTemplate = {
  id: 'risk-diligence',
  name: '风控尽职',
  description: '全面风险评估和尽职调查',
  icon: '🛡️',
  allowCustomization: true,
  tabs: {
    'risk-dashboard': {
      id: 'risk-dashboard',
      name: '风险仪表盘',
      description: '核心风险指标概览',
      layout: [
        { i: 'kline-chart', x: 0, y: 0, w: 40, h: 18 },
        { i: 'risk-dashboard', x: 0, y: 18, w: 40, h: 18 },
        { i: 'risk-score-card', x: 0, y: 36, w: 20, h: 12 },
        { i: 'risk-heatmap', x: 20, y: 36, w: 20, h: 12 }
      ]
    },
    'deep-financial': {
      id: 'deep-financial',
      name: '深度财务',
      description: '财务风险深度挖掘',
      layout: [
        { i: 'deep-financial-table', x: 0, y: 0, w: 40, h: 28 },
        { i: 'financial-risk-indicators', x: 0, y: 28, w: 40, h: 12 },
        { i: 'sensitivity-heatmap', x: 0, y: 40, w: 40, h: 15 },
        { i: 'cashflow-risk', x: 0, y: 55, w: 40, h: 12 }
      ]
    },
    'risk-indicators': {
      id: 'risk-indicators',
      name: '风险指标',
      description: '各类风险监控指标',
      layout: [
        { i: 'risk-indicators-panel', x: 0, y: 0, w: 40, h: 15 },
        { i: 'pledge-risk', x: 0, y: 15, w: 20, h: 14 },
        { i: 'margin-risk', x: 20, y: 15, w: 20, h: 14 },
        { i: 'insider-trading', x: 0, y: 29, w: 20, h: 12 },
        { i: 'legal-risk', x: 20, y: 29, w: 20, h: 12 }
      ]
    },
    'risk-report': {
      id: 'risk-report',
      name: '风险报告',
      description: '风险评估报告生成',
      layout: [
        { i: 'manual-risk-editor', x: 0, y: 0, w: 40, h: 20 },
        { i: 'news-section', x: 0, y: 20, w: 40, h: 18 },
        { i: 'risk-summary', x: 0, y: 38, w: 20, h: 12 },
        { i: 'risk-recommendations', x: 20, y: 38, w: 20, h: 12 }
      ]
    }
  }
};

export const ANALYSIS_MODES: AnalysisModeTemplate[] = [
  QUICK_OVERVIEW_MODE,
  DEEP_ANALYSIS_MODE,
  RISK_DILIGENCE_MODE
];

export const getAnalysisModeById = (id: string): AnalysisModeTemplate | undefined => {
  return ANALYSIS_MODES.find(mode => mode.id === id);
};
