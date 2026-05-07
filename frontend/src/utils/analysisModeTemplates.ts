
/**
 * 分析模式模板 - 与后端 skill_engine.py 保持一致
 * 6个核心模式：快速概览、深度估值、风险分析、技术扫描、基本面体检、完整报告
 */

export interface WidgetConfig {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** 组件所需数据字段，用于智能加载和降级展示 */
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

export const QUICK_OVERVIEW_MODE: AnalysisModeTemplate = {
  id: 'quick-view',
  name: '⚡ 快速概览',
  description: '5分钟内获取核心指标',
  icon: '⚡',
  allowCustomization: true,
  tabs: {
    'overview': {
      id: 'overview',
      name: '概览',
      description: '股票核心信息一览',
      layout: [
        { i: 'company-profile', x: 0, y: 0, w: 40, h: 26, requiredData: ['company_info'] },
        { i: 'kline-chart', x: 0, y: 26, w: 40, h: 22, requiredData: ['history'] },
        { i: 'valuation-comparison', x: 0, y: 48, w: 20, h: 14, requiredData: ['valuation', 'latest_price'] },
        { i: 'analyst-consensus', x: 20, y: 48, w: 20, h: 14, requiredData: ['analyst_consensus', 'latest_price'] },
      ]
    },
    'news': {
      id: 'news',
      name: '新闻舆情',
      description: '最新资讯和市场情绪',
      layout: [
        { i: 'news-section', x: 0, y: 0, w: 40, h: 24, requiredData: ['news_analysis'] },
        { i: 'market-sentiment', x: 0, y: 24, w: 20, h: 12, requiredData: ['news_analysis'] },
        { i: 'industry-news', x: 20, y: 24, w: 20, h: 12, requiredData: ['industry_news'] },
        { i: 'news-hot-topics', x: 0, y: 36, w: 40, h: 10, requiredData: ['news_analysis'] }
      ]
    },
    'fund-flow': {
      id: 'fund-flow',
      name: '资金流向',
      description: '主力资金和龙虎榜数据',
      layout: [
        { i: 'fund-flow-chart', x: 0, y: 0, w: 40, h: 18, requiredData: ['fund_flow'] },
        { i: 'main-force-flow', x: 0, y: 18, w: 20, h: 14, requiredData: ['fund_flow'] },
        { i: 'dragon-tiger-list', x: 20, y: 18, w: 20, h: 14, requiredData: ['lhb_data'] },
        { i: 'northbound-flow', x: 0, y: 32, w: 40, h: 12, requiredData: ['northbound_flow'] }
      ]
    },
    'unified-data': {
      id: 'unified-data',
      name: '五层数据',
      description: '统一数据获取：行情/研报/新闻/基础/公告',
      layout: [
        { i: 'unified-data-panel', x: 0, y: 0, w: 40, h: 40, requiredData: ['symbol'] }
      ]
    }
  }
};

export const DEEP_VALUATION_MODE: AnalysisModeTemplate = {
  id: 'deep-valuation',
  name: '💎 深度估值分析',
  description: 'DCF + PE/PB 多维度估值',
  icon: '💎',
  allowCustomization: true,
  tabs: {
    'valuation': {
      id: 'valuation',
      name: '估值分析',
      description: '多模型估值对比',
      layout: [
        { i: 'kline-chart', x: 0, y: 0, w: 40, h: 18, requiredData: ['history'] },
        { i: 'valuation-comparison', x: 0, y: 18, w: 20, h: 15, requiredData: ['valuation', 'latest_price'] },
        { i: 'peer-comparison', x: 20, y: 18, w: 20, h: 15, requiredData: ['symbol'] },
        { i: 'sensitivity-heatmap', x: 0, y: 33, w: 40, h: 15, requiredData: ['dcf_result'] },
        { i: 'dcf-valuation', x: 0, y: 48, w: 40, h: 12, requiredData: ['dcf_result'] }
      ]
    },
    'financial': {
      id: 'financial',
      name: '财务分析',
      description: '深度财务数据挖掘',
      layout: [
        { i: 'deep-financial-table', x: 0, y: 0, w: 40, h: 25, requiredData: ['deep_financial'] },
        { i: 'financial-indicators', x: 0, y: 25, w: 20, h: 12, requiredData: ['financial_indicators'] },
        { i: 'financial-trend', x: 20, y: 25, w: 20, h: 12, requiredData: ['financial_indicators'] },
        { i: 'profitability-analysis', x: 0, y: 37, w: 40, h: 15, requiredData: ['financial_indicators'] }
      ]
    },
    'risk': {
      id: 'risk',
      name: '风险分析',
      description: '风险指标监控',
      layout: [
        { i: 'risk-score-card', x: 0, y: 0, w: 40, h: 24, requiredData: ['risk_indicators'] },
        { i: 'risk-indicators-panel', x: 0, y: 24, w: 24, h: 12, requiredData: ['risk_indicators'] },
        { i: 'manual-risk-editor', x: 24, y: 24, w: 16, h: 12, requiredData: ['symbol', 'smart_analysis'] }
      ]
    },
    'technical': {
      id: 'technical',
      name: '技术指标',
      description: '技术分析工具',
      layout: [
        { i: 'kline-chart', x: 0, y: 0, w: 40, h: 20, requiredData: ['history'] },
        { i: 'technical-indicators', x: 0, y: 20, w: 20, h: 14, requiredData: ['technical'] },
        { i: 'fund-flow', x: 20, y: 20, w: 20, h: 14, requiredData: ['fund_flow'] },
        { i: 'macd-analysis', x: 0, y: 34, w: 20, h: 12, requiredData: ['technical'] },
        { i: 'kdj-analysis', x: 20, y: 34, w: 20, h: 12, requiredData: ['technical'] }
      ]
    },
    'capital': {
      id: 'capital',
      name: '资本运作',
      description: '募集资金、投资项目、收购兼并等资本运作信息',
      layout: [
        { i: 'capital-operation', x: 0, y: 0, w: 40, h: 40, requiredData: ['capital_operation'] }
      ]
    }
  }
};

export const RISK_ANALYSIS_MODE: AnalysisModeTemplate = {
  id: 'risk-analysis',
  name: '🛡️ 风险控制分析',
  description: '全面风险评估',
  icon: '🛡️',
  allowCustomization: true,
  tabs: {
    'risk-dashboard': {
      id: 'risk-dashboard',
      name: '风险仪表盘',
      description: '核心风险指标概览',
      layout: [
        { i: 'kline-chart', x: 0, y: 0, w: 40, h: 18, requiredData: ['history'] },
        { i: 'risk-score-card', x: 0, y: 18, w: 40, h: 24, requiredData: ['risk_indicators'] },
        { i: 'risk-heatmap', x: 0, y: 42, w: 40, h: 12, requiredData: ['risk_indicators'] }
      ]
    },
    'pledge-risk': {
      id: 'pledge-risk',
      name: '股权质押风险',
      description: '大股东股权质押分析',
      layout: [
        { i: 'risk-indicators-panel', x: 0, y: 0, w: 40, h: 15, requiredData: ['risk_indicators'] },
        { i: 'pledge-risk-detail', x: 0, y: 15, w: 40, h: 20, requiredData: ['pledge_ratio'] }
      ]
    },
    'news-sentiment': {
      id: 'news-sentiment',
      name: '新闻舆情',
      description: '新闻情感与风险预警',
      layout: [
        { i: 'news-section', x: 0, y: 0, w: 40, h: 24, requiredData: ['news_analysis'] },
        { i: 'market-sentiment', x: 0, y: 24, w: 20, h: 12, requiredData: ['news_analysis'] },
        { i: 'risk-alerts', x: 20, y: 24, w: 20, h: 12, requiredData: ['news_analysis'] }
      ]
    },
    'risk-report': {
      id: 'risk-report',
      name: '风险报告',
      description: '风险评估报告生成',
      layout: [
        { i: 'manual-risk-editor', x: 0, y: 0, w: 40, h: 20, requiredData: ['symbol', 'smart_analysis'] },
        { i: 'news-section', x: 0, y: 20, w: 40, h: 18, requiredData: ['news_analysis'] }
      ]
    }
  }
};

export const TECHNICAL_SCAN_MODE: AnalysisModeTemplate = {
  id: 'technical-scan',
  name: '🔍 技术面扫描',
  description: '技术指标 + 行业对比',
  icon: '🔍',
  allowCustomization: true,
  tabs: {
    'technical': {
      id: 'technical',
      name: '技术指标',
      description: '综合技术分析',
      layout: [
        { i: 'kline-chart', x: 0, y: 0, w: 40, h: 22, requiredData: ['history'] },
        { i: 'ma-technical-analysis', x: 0, y: 22, w: 20, h: 14, requiredData: ['technical'] },
        { i: 'technical-indicators', x: 20, y: 22, w: 20, h: 14, requiredData: ['technical'] },
        { i: 'macd-analysis', x: 0, y: 36, w: 20, h: 12, requiredData: ['technical'] },
        { i: 'kdj-analysis', x: 20, y: 36, w: 20, h: 12, requiredData: ['technical'] }
      ]
    },
    'industry': {
      id: 'industry',
      name: '行业对比',
      description: '同行业上市公司对比',
      layout: [
        { i: 'peer-comparison', x: 0, y: 0, w: 40, h: 25, requiredData: ['symbol'] },
        { i: 'industry-news', x: 0, y: 25, w: 40, h: 15, requiredData: ['industry_news'] }
      ]
    },
    'fund-flow': {
      id: 'fund-flow',
      name: '资金流向',
      description: '资金动向分析',
      layout: [
        { i: 'fund-flow-chart', x: 0, y: 0, w: 40, h: 18, requiredData: ['fund_flow'] },
        { i: 'main-force-flow', x: 0, y: 18, w: 20, h: 14, requiredData: ['fund_flow'] },
        { i: 'northbound-flow', x: 20, y: 18, w: 20, h: 14, requiredData: ['northbound_flow'] }
      ]
    }
  }
};

export const FUNDAMENTAL_CHECK_MODE: AnalysisModeTemplate = {
  id: 'fundamental-check',
  name: '🏥 基本面体检',
  description: '财务健康 + 资本运作',
  icon: '🏥',
  allowCustomization: true,
  tabs: {
    'financial-health': {
      id: 'financial-health',
      name: '财务健康',
      description: '盈利能力、成长性、偿债能力分析',
      layout: [
        { i: 'deep-financial-table', x: 0, y: 0, w: 40, h: 28, requiredData: ['deep_financial'] },
        { i: 'financial-indicators', x: 0, y: 28, w: 40, h: 15, requiredData: ['financial_indicators'] },
        { i: 'cashflow-analysis', x: 0, y: 43, w: 40, h: 12, requiredData: ['cashflow'] }
      ]
    },
    'capital-operation': {
      id: 'capital-operation',
      name: '资本运作',
      description: '分红、回购、增持、质押等',
      layout: [
        { i: 'capital-operation', x: 0, y: 0, w: 40, h: 40, requiredData: ['capital_operation'] }
      ]
    },
    'profit-forecast': {
      id: 'profit-forecast',
      name: '盈利预测',
      description: '一致预期与盈利预测',
      layout: [
        { i: 'analyst-consensus', x: 0, y: 0, w: 40, h: 20, requiredData: ['analyst_consensus'] },
        { i: 'profit-forecast-chart', x: 0, y: 20, w: 40, h: 15, requiredData: ['profit_forecast'] }
      ]
    }
  }
};

export const FULL_REPORT_MODE: AnalysisModeTemplate = {
  id: 'full-report-mode',
  name: '📑 完整分析报告',
  description: '全方位深度分析',
  icon: '📑',
  allowCustomization: true,
  tabs: {
    'overview': {
      id: 'overview',
      name: '概览',
      description: '核心指标总览',
      layout: [
        { i: 'company-profile', x: 0, y: 0, w: 40, h: 26, requiredData: ['company_info'] },
        { i: 'kline-chart', x: 0, y: 26, w: 40, h: 22, requiredData: ['history'] },
        { i: 'valuation-comparison', x: 0, y: 48, w: 20, h: 14, requiredData: ['valuation'] },
        { i: 'risk-score-card', x: 20, y: 48, w: 20, h: 14, requiredData: ['risk_indicators'] }
      ]
    },
    'valuation': {
      id: 'valuation',
      name: '估值分析',
      description: '多维度估值分析',
      layout: [
        { i: 'sensitivity-heatmap', x: 0, y: 0, w: 40, h: 18, requiredData: ['dcf_result'] },
        { i: 'valuation-comparison', x: 0, y: 18, w: 40, h: 15, requiredData: ['valuation'] },
        { i: 'peer-comparison', x: 0, y: 33, w: 40, h: 15, requiredData: ['symbol'] }
      ]
    },
    'financial': {
      id: 'financial',
      name: '财务分析',
      description: '深度财务报表',
      layout: [
        { i: 'deep-financial-table', x: 0, y: 0, w: 40, h: 28, requiredData: ['deep_financial'] },
        { i: 'financial-indicators', x: 0, y: 28, w: 40, h: 15, requiredData: ['financial_indicators'] }
      ]
    },
    'risk': {
      id: 'risk',
      name: '风险分析',
      description: '风险指标监控',
      layout: [
        { i: 'risk-indicators-panel', x: 0, y: 0, w: 40, h: 20, requiredData: ['risk_indicators'] },
        { i: 'news-section', x: 0, y: 20, w: 40, h: 20, requiredData: ['news_analysis'] }
      ]
    },
    'technical': {
      id: 'technical',
      name: '技术分析',
      description: '技术指标分析',
      layout: [
        { i: 'kline-chart', x: 0, y: 0, w: 40, h: 22, requiredData: ['history'] },
        { i: 'ma-technical-analysis', x: 0, y: 22, w: 40, h: 14, requiredData: ['technical'] },
        { i: 'fund-flow', x: 0, y: 36, w: 40, h: 12, requiredData: ['fund_flow'] }
      ]
    },
    'news': {
      id: 'news',
      name: '新闻舆情',
      description: '市场情绪分析',
      layout: [
        { i: 'news-section', x: 0, y: 0, w: 40, h: 24, requiredData: ['news_analysis'] },
        { i: 'market-sentiment', x: 0, y: 24, w: 40, h: 12, requiredData: ['news_analysis'] }
      ]
    }
  }
};

export const ANALYSIS_MODES: AnalysisModeTemplate[] = [
  QUICK_OVERVIEW_MODE,
  DEEP_VALUATION_MODE,
  RISK_ANALYSIS_MODE,
  TECHNICAL_SCAN_MODE,
  FUNDAMENTAL_CHECK_MODE,
  FULL_REPORT_MODE
];

export const getAnalysisModeById = (id: string): AnalysisModeTemplate | undefined => {
  return ANALYSIS_MODES.find(mode => mode.id === id);
};
