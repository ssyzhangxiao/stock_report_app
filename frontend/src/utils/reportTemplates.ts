/**
 * 报告模板系统类型定义
 */

export type ReportTemplateType = 'full' | 'quick' | 'comparison' | string;

export interface ReportTemplate {
  id: ReportTemplateType;
  name: string;
  description: string;
  sections: ReportSection[];
  estimatedPages: number;
}

export interface ReportSection {
  id: string;
  title: string;
  component: string;
  visible: boolean;
  order: number;
  description?: string;
}

/**
 * 完整报告模板 - 包含所有分析内容
 */
export const FULL_REPORT_TEMPLATE: ReportTemplate = {
  id: 'full',
  name: '完整分析报告',
  description: '包含基本面、技术面、估值、风险等全方位深度分析',
  estimatedPages: 8,
  sections: [
    {
      id: 'header',
      title: '报告头部信息',
      component: 'ReportHeader',
      visible: true,
      order: 1,
      description: '股票代码、名称、当前价格等基本信息'
    },
    {
      id: 'key-metrics',
      title: '核心指标概览',
      component: 'KeyMetricsCard',
      visible: true,
      order: 2,
      description: 'PE、PB、市值、涨跌幅等关键指标'
    },
    {
      id: 'kline-chart',
      title: 'K线与技术分析',
      component: 'KLineChart',
      visible: true,
      order: 3,
      description: 'K线图、技术指标、趋势分析'
    },
    {
      id: 'financial-data',
      title: '财务数据分析',
      component: 'DeepFinancialTable',
      visible: true,
      order: 5,
      description: '利润表、资产负债表、现金流量表'
    },
    {
      id: 'valuation-comparison',
      title: '多模型估值对比',
      component: 'ValuationComparison',
      visible: true,
      order: 6,
      description: 'DCF、PE、PB等多种估值方法对比'
    },
    {
      id: 'sensitivity-heatmap',
      title: '敏感性分析热力图',
      component: 'SensitivityHeatmap',
      visible: true,
      order: 7,
      description: 'WACC和增长率对估值的影响分析'
    },
    {
      id: 'cashflow-waterfall',
      title: '现金流瀑布图',
      component: 'CashFlowWaterfall',
      visible: true,
      order: 8,
      description: '自由现金流分解分析'
    },
    {
      id: 'peer-comparison',
      title: '同业对比雷达图',
      component: 'PeerComparisonRadar',
      visible: true,
      order: 9,
      description: '与同行业公司的多维度对比'
    },
    {
      id: 'risk-dashboard',
      title: '风险仪表盘',
      component: 'RiskDashboard',
      visible: true,
      order: 10,
      description: '质押、融券、估值等风险指标'
    },
    {
      id: 'analyst-consensus',
      title: '分析师评级',
      component: 'AnalystConsensusCard',
      visible: true,
      order: 11,
      description: '券商分析师一致预期和评级'
    },
    {
      id: 'fund-flow',
      title: '资金流向分析',
      component: 'FundFlowCard',
      visible: true,
      order: 12,
      description: '主力资金、北向资金流向'
    },
    {
      id: 'news-section',
      title: '新闻舆情（多源聚合）',
      component: 'NewsSection',
      visible: true,
      order: 13,
      description: '最新相关新闻和舆情分析（含网页搜索和抓取）'
    },
    {
      id: 'risk-indicators',
      title: '股权结构与风险',
      component: 'RiskIndicatorsPanel',
      visible: true,
      order: 14,
      description: '质押比例、筹码分布、内部人持股'
    },
    {
      id: 'manual-risk-editor',
      title: '风险分析编辑器',
      component: 'ManualRiskEditor',
      visible: true,
      order: 15,
      description: '手动补充风险分析内容'
    }
  ]
};

/**
 * 快速报告模板 - 仅包含核心内容
 */
export const QUICK_REPORT_TEMPLATE: ReportTemplate = {
  id: 'quick',
  name: '快速分析报告',
  description: '精简版报告，聚焦核心指标和关键分析',
  estimatedPages: 3,
  sections: [
    {
      id: 'header',
      title: '报告头部信息',
      component: 'ReportHeader',
      visible: true,
      order: 1
    },
    {
      id: 'key-metrics',
      title: '核心指标概览',
      component: 'KeyMetricsCard',
      visible: true,
      order: 2
    },
    {
      id: 'kline-chart',
      title: 'K线与技术分析',
      component: 'KLineChart',
      visible: true,
      order: 3
    },
    {
      id: 'risk-dashboard',
      title: '风险仪表盘',
      component: 'RiskDashboard',
      visible: true,
      order: 5
    },
    {
      id: 'analyst-consensus',
      title: '分析师评级',
      component: 'AnalystConsensusCard',
      visible: true,
      order: 6
    }
  ]
};

/**
 * 对比报告模板 - 侧重同业对比和估值分析
 */
export const COMPARISON_REPORT_TEMPLATE: ReportTemplate = {
  id: 'comparison',
  name: '对比分析报告',
  description: '重点展示同业对比、估值分析和敏感性测试',
  estimatedPages: 5,
  sections: [
    {
      id: 'header',
      title: '报告头部信息',
      component: 'ReportHeader',
      visible: true,
      order: 1
    },
    {
      id: 'key-metrics',
      title: '核心指标概览',
      component: 'KeyMetricsCard',
      visible: true,
      order: 2
    },
    {
      id: 'valuation-comparison',
      title: '多模型估值对比',
      component: 'ValuationComparison',
      visible: true,
      order: 3
    },
    {
      id: 'sensitivity-heatmap',
      title: '敏感性分析热力图',
      component: 'SensitivityHeatmap',
      visible: true,
      order: 4
    },
    {
      id: 'peer-comparison',
      title: '同业对比雷达图',
      component: 'PeerComparisonRadar',
      visible: true,
      order: 5
    },
    {
      id: 'cashflow-waterfall',
      title: '现金流瀑布图',
      component: 'CashFlowWaterfall',
      visible: true,
      order: 6
    },
    {
      id: 'financial-data',
      title: '财务数据分析',
      component: 'DeepFinancialTable',
      visible: true,
      order: 7
    },
    {
      id: 'risk-dashboard',
      title: '风险仪表盘',
      component: 'RiskDashboard',
      visible: true,
      order: 8
    }
  ]
};

/**
 * 获取所有可用模板
 */
export const getAllTemplates = (): ReportTemplate[] => {
  return [
    FULL_REPORT_TEMPLATE,
    QUICK_REPORT_TEMPLATE,
    COMPARISON_REPORT_TEMPLATE
  ];
};

/**
 * 根据ID获取模板
 */
export const getTemplateById = (id: ReportTemplateType): ReportTemplate | undefined => {
  return getAllTemplates().find(template => template.id === id);
};

/**
 * 自定义模板 - 允许用户自定义显示哪些部分
 */
export interface CustomTemplate extends ReportTemplate {
  isCustom: boolean;
  createdAt: string;
}

/**
 * 创建自定义模板
 */
export const createCustomTemplate = (
  name: string,
  description: string,
  sections: ReportSection[]
): CustomTemplate => {
  return {
    id: `custom-${Date.now()}`,
    name,
    description,
    sections: sections.sort((a, b) => a.order - b.order),
    estimatedPages: Math.ceil(sections.length / 3), // 粗略估算
    isCustom: true,
    createdAt: new Date().toISOString()
  };
};
