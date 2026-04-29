import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 180000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    console.log('API Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    console.error('API Error:', error.message);

    const errorData = error.response?.data;
    let message = '请求失败，请稍后重试';

    if (errorData) {
      if (typeof errorData === 'string') {
        message = errorData;
      } else if (errorData.message) {
        message = errorData.message;
      } else if (errorData.detail) {
        message = errorData.detail;
      }
    }

    return Promise.reject(new Error(message));
  }
);

export interface KLineData {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  ma5?: number;
  ma20?: number;
  ma60?: number;
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
  investment_advice?: {
    score: number;
    suggestion: string;
    target_price: string;
    stop_loss: string;
    position_advice: string;
  };
  summary?: string;
  raw_analysis?: string;
  generated_at?: string;
  // 新增字段：风险指标监控
  risk_indicators_monitor?: {
    pledge_ratio_analysis?: string;
    chip_distribution?: string;
    insider_holdings?: string;
    margin_trading?: string;
  };
  // 新增字段：资金流向分析
  fund_flow_analysis?: {
    main_force_flow?: string;
    retail_flow?: string;
    north_south_flow?: string;
  };
  // 新增字段：新闻舆情
  news_sentiment?: {
    overall_sentiment?: string;
    key_news_impact?: string;
    policy_impact?: string;
  };
  // 新增字段：分析师评级详情
  analyst_rating_details?: {
    consensus_rating?: string;
    rating_trend?: string;
    target_price_range?: string;
  };
  // 新增字段：手工风险分析
  manual_risk_analysis?: {
    overall_risk_level?: string;
    risk_score?: number;
    key_risk_factors?: string[];
    technical_risk_view?: string;
    fundamental_risk_view?: string;
    market_sentiment_view?: string;
    investment_strategy?: string;
    additional_notes?: string;
  };
}

export interface StockAnalysisResponse {
  symbol: string;
  company_info: Record<string, any>;
  latest_price: number | null;
  technical: Record<string, any>;
  valuation: Record<string, any>;
  deep_financial: Record<string, any>;
  news_analysis: Array<{
    title: string;
    content: string;
    publish_time: string;
    source: string;
    sentiment: 'positive' | 'negative' | 'neutral';
  }>;
  analyst_consensus: {
    stock_code?: string;
    stock_name?: string;
    latest_rating?: string;
    target_price?: number;
    rating_date?: string;
    industry?: string;
    error?: string;
  };
  risk_indicators: {
    pledge_ratio: Array<Record<string, any>>;
    cyq: Array<Record<string, any>>;
    insider_holdings: Array<Record<string, any>>;
    margin_balance: Array<Record<string, any>>;
  };
  fund_flow: Array<Record<string, any>>;
  history: KLineData[];
  smart_analysis: SmartAnalysis;
  data_source?: string;
  timestamp: string;
}

export const getStockAnalysis = async (
  symbol: string,
  years: number = 2
): Promise<StockAnalysisResponse> => {
  const response = await api.get(`/analysis/stock/${symbol}`, {
    params: { years },
  });
  return response as unknown as StockAnalysisResponse;
};

export const healthCheck = async (): Promise<{ status: string }> => {
  const response = await api.get('/analysis/health');
  return response as unknown as { status: string };
};

export default api;
