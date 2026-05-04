export interface KLineData {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  ma5?: number;
  ma10?: number;
  ma20?: number;
  ma60?: number;
}

// 可比公司类型
export interface PeerCompany {
  name: string;
  marketCap: number; // 亿
  peRatio: number;
  pbRatio: number;
  isTarget: boolean; // 是否是目标公司
}

export interface NewsItem {
  title: string;
  content: string;
  publish_time: string;
  source: string;
  source_type?: 'api' | 'web_search' | 'web_fetch';
  url?: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

export interface WebFetchArticle {
  title: string;
  content: string;
  url: string;
  source: string;
  publish_time: string;
}

export interface SourcesSummary {
  total: number;
  by_type: {
    api: number;
    web_search: number;
    web_fetch: number;
  };
  by_domain: Record<string, number>;
  sentiment_distribution: {
    positive: number;
    negative: number;
    neutral: number;
  };
}

export interface AnalystConsensus {
  stock_code?: string;
  stock_name?: string;
  latest_rating?: string;
  target_price?: number;
  rating_date?: string;
  industry?: string;
  error?: string;
  target_price_history?: TargetPricePoint[];
}

export interface TargetPricePoint {
  日期: string;
  目标价: number;
  评级: string;
  机构: string;
}

export interface RiskIndicators {
  pledge_ratio: Record<string, unknown>[];
  cyq: Record<string, unknown>[];
  insider_holdings: Record<string, unknown>[];
  margin_balance: Record<string, unknown>[];
  margin_history?: MarginHistoryItem[];
}

export interface MarginHistoryItem {
  日期: string;
  融资余额: number;
  融券余量: number;
}

export interface SmartAnalysis {
  available: boolean;
  error?: string;
  data_source?: string;
  fundamental_analysis?: string;
  technical_analysis?: string;
  valuation_analysis?: string;
  risk_warning?: string;
  capital_analysis?: string;
  investment_advice?: InvestmentAdvice;
  summary?: string;
  raw_analysis?: string;
  generated_at?: string;
  risk_indicators_monitor?: RiskIndicatorsMonitor;
  fund_flow_analysis?: FundFlowAnalysis;
  news_sentiment?: NewsSentiment;
  analyst_rating_details?: AnalystRatingDetails;
  manual_risk_analysis?: ManualRiskAnalysis;
  score?: number;
  suggestion?: string;
  key_points?: string[];
  target_price?: number | null;
  stop_loss?: number | null;
  position_advice?: string;
  market_outlook?: string;
  risk_factors?: string[];
  investment_strategy?: string;
  symbol?: string;
}

export interface InvestmentAdvice {
  score: number;
  suggestion: string;
  target_price: string;
  stop_loss: string;
  position_advice: string;
}

export interface RiskIndicatorsMonitor {
  pledge_ratio_analysis?: string;
  chip_distribution?: string;
  insider_holdings?: string;
  margin_trading?: string;
}

export interface FundFlowAnalysis {
  main_force_flow?: string;
  retail_flow?: string;
  north_south_flow?: string;
}

export interface NewsSentiment {
  overall_sentiment?: string;
  key_news_impact?: string;
  policy_impact?: string;
}

export interface AnalystRatingDetails {
  consensus_rating?: string;
  rating_trend?: string;
  target_price_range?: string;
}

export interface ManualRiskAnalysis {
  overall_risk_level?: string;
  risk_score?: number;
  key_risk_factors?: string[];
  technical_risk_view?: string;
  fundamental_risk_view?: string;
  market_sentiment_view?: string;
  investment_strategy?: string;
  additional_notes?: string;
}

export interface ValuationData {
  pe_ratio?: number;
  pb_ratio?: number;
  market_cap?: string;
  industry_pe?: number;
  [key: string]: unknown;
}

export interface FinancialIndicator {
  '营业总收入(元)'?: number;
  '净利润(元)'?: number;
  '净资产收益率(%)'?: number;
  '资产负债率'?: number;
  '销售毛利率(%)'?: number;
  [key: string]: any;
}

export interface BalanceSheet {
  [key: string]: any;
}

export interface Cashflow {
  [key: string]: any;
}

export interface IncomeStatement {
  [key: string]: any;
}

export interface DeepFinancial {
  financial_indicators: FinancialIndicator[];
  balance_sheet: BalanceSheet[];
  cashflow: Cashflow[];
  income_statement: IncomeStatement[];
}

export interface StockAnalysisResponse {
  symbol: string;
  company_info: Record<string, unknown>;
  latest_price: number | null;
  technical: Record<string, unknown>;
  valuation: ValuationData;
  deep_financial: DeepFinancial;
  news_analysis: NewsItem[];
  web_search_results?: WebSearchResult[];
  web_fetch_results?: WebFetchArticle[];
  sources_summary?: SourcesSummary;
  analyst_consensus: AnalystConsensus;
  risk_indicators: RiskIndicators;
  fund_flow: Record<string, unknown>[];
  history: KLineData[];
  smart_analysis: SmartAnalysis;
  data_source?: string;
  timestamp: string;
}

export interface SmartAnalysisResult {
  symbol: string;
  smart_analysis: SmartAnalysis;
  stock_data?: StockAnalysisResponse;
}

export interface LLMProviderInfo {
  id: string;
  name: string;
  configured: boolean;
  default_model: string;
}

export interface LLMProvidersResponse {
  providers: LLMProviderInfo[];
  current_provider: string | null;
  available: boolean;
}

export interface ControlStatus {
  actual_controller?: string;
  controller_ratio?: string;
  has_transfer_intent?: string;
  transfer_progress?: string;
  recent_events?: ControlStatusEvent[];
  exchange_inquiry?: string;
  price_if_known?: string;
  current_price?: number;
  potential_buyers?: string;
  buyer_description?: string;
  premium_rate?: string;
  comparable_cases?: ComparableCase[];
  summary?: string;
}

export interface ControlStatusEvent {
  日期: string;
  事件: string;
}

export interface ComparableCase {
  company: string;
  deal_price: string;
  result: string;
}

export interface DexterResult {
  symbol: string;
  type: string;
  success: boolean;
  answer?: string;
  toolCalls?: unknown[];
  iterations?: number;
  totalTime?: number;
  error?: string;
}

export interface DexterHealthResponse {
  available: boolean;
  url: string;
}
