export interface TableData {
  headers: string[];
  rows: string[][];
}

export interface SectionData {
  title: string;
  level: number;
  content: string;
  tables: TableData[];
  subsections: SectionData[];
}

export interface ResearchReportMeta {
  stock_code: string;
  stock_name: string;
  stock_name_en: string;
  signal_rating: string;
  moat_score: string;
  current_pe: string;
  report_date: string;
  directory: string;
}

export interface FinancialSubData {
  content: string;
  tables: TableData[];
  sections: SectionData[];
}

export interface ResearchReport {
  meta: ResearchReportMeta;
  executive_summary: SectionData;
  business_foundation: SectionData;
  industry_analysis: SectionData;
  business_breakdown: SectionData;
  financial_quality: SectionData;
  governance_analysis: SectionData;
  market_sentiment: SectionData;
  valuation_moat: SectionData;
  financial_data: Record<string, FinancialSubData>;
  risk_monitoring: SectionData;
  valuation_history: SectionData;
  product_lines: SectionData;
  raw_files: Record<string, string>;
}

export interface ResearchReportsResponse {
  total: number;
  reports: ResearchReportMeta[];
}

export interface ResearchSearchResponse {
  query: string;
  total: number;
  reports: ResearchReportMeta[];
}

export interface RawMarkdownResponse {
  filepath: string;
  content: string;
}

export type ResearchSectionKey =
  | 'executive_summary'
  | 'business_foundation'
  | 'industry_analysis'
  | 'business_breakdown'
  | 'financial_quality'
  | 'governance_analysis'
  | 'market_sentiment'
  | 'valuation_moat'
  | 'risk_monitoring'
  | 'valuation_history'
  | 'product_lines'
  | 'financial_data';

export interface ResearchTabConfig {
  key: ResearchSectionKey;
  label: string;
  icon: string;
  description: string;
}

export const RESEARCH_TABS: ResearchTabConfig[] = [
  { key: 'executive_summary', label: '执行摘要', icon: '🎯', description: '信号评级与核心结论' },
  { key: 'business_foundation', label: '公司底座', icon: '🏢', description: '公司概况与商业模式' },
  { key: 'industry_analysis', label: '行业分析', icon: '🏭', description: '行业周期与竞争格局' },
  { key: 'business_breakdown', label: '业务拆解', icon: '📊', description: '收入结构与产品分析' },
  { key: 'financial_quality', label: '财务质量', icon: '💰', description: '财务健康与盈利能力' },
  { key: 'governance_analysis', label: '治理分析', icon: '🏛️', description: '股权结构与治理评估' },
  { key: 'market_sentiment', label: '市场情绪', icon: '📈', description: '市场分歧与多空辩论' },
  { key: 'valuation_moat', label: '估值护城河', icon: '🏰', description: '估值分析与护城河评估' },
  { key: 'financial_data', label: '财务数据', icon: '📋', description: '关键指标与同业对比' },
  { key: 'risk_monitoring', label: '风险监控', icon: '⚠️', description: '做空风险与监控清单' },
];
