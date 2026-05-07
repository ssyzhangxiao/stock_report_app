import axios from 'axios';
import type {
  StockAnalysisResponse,
  SmartAnalysisResult,
  LLMProvidersResponse,
  ControlStatus,
  PeerCompany,
} from '../types/stock';

const api = axios.create({
  baseURL: '/api',
  timeout: 180000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    if (import.meta.env.DEV) {
      console.log('API Request:', config.method?.toUpperCase(), config.url);
    }
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
    const errorData = error.response?.data;
    let message = '请求失败，请稍后重试';

    if (errorData) {
      if (typeof errorData === 'string') {
        message = errorData;
      } else if (errorData.message) {
        message = errorData.message;
      } else if (errorData.detail) {
        if (typeof errorData.detail === 'string') {
          message = errorData.detail;
        } else if (errorData.detail.message) {
          message = errorData.detail.message;
        }
      }
    }

    if (import.meta.env.DEV) {
      console.error('API Error:', message);
    }

    return Promise.reject(new Error(message));
  }
);

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

export const getSmartAnalysis = async (
  symbol: string,
  years: number = 2
): Promise<SmartAnalysisResult> => {
  const response = await api.get(`/analysis/smart-analyze/${symbol}`, {
    params: { years },
  });
  return response as unknown as SmartAnalysisResult;
};

export const getLLMProviders = async (): Promise<LLMProvidersResponse> => {
  const response = await api.get('/analysis/llm-providers');
  return response as unknown as LLMProvidersResponse;
};

export const getControlStatus = async (symbol: string): Promise<ControlStatus> => {
  const response = await api.get(`/analysis/control-status/${symbol}`, { timeout: 90000 });
  return response as unknown as ControlStatus;
};

// 获取可比公司列表
export interface PeerCompaniesResponse {
  symbol: string;
  industry: string;
  companies: PeerCompany[];
}

export const getPeerCompanies = async (symbol: string): Promise<PeerCompaniesResponse> => {
  const response = await api.get(`/analysis/peer-companies/${symbol}`);
  return response as unknown as PeerCompaniesResponse;
};

// 获取新闻聚合数据
export interface NewsAggregateResponse {
  symbol: string;
  news: any[];
  web_search_results: any[];
  web_fetch_results: any[];
  sources_summary?: any;
}

export const getNewsAggregate = async (symbol: string): Promise<NewsAggregateResponse> => {
  const response = await api.get(`/analysis/news-aggregate/${symbol}`);
  return response as unknown as NewsAggregateResponse;
};

// 统一数据获取模块 API
export interface UnifiedDataResult {
  symbol: string;
  success: boolean;
  source: string;
  status: string;
  data: any;
  metadata: any;
  error?: string;
}

export interface UnifiedAllResult {
  market: UnifiedDataResult;
  research: UnifiedDataResult;
  news: UnifiedDataResult;
  financials: UnifiedDataResult;
  announcements: UnifiedDataResult;
}

export const getUnifiedMarket = async (symbol: string, includeKline = true, klineDays = 60): Promise<UnifiedDataResult> => {
  const response = await api.get(`/analysis/unified/market/${symbol}`, {
    params: { include_kline: includeKline, kline_days: klineDays },
  });
  return response as unknown as UnifiedDataResult;
};

export const getUnifiedResearch = async (symbol: string, includeIwencai = false): Promise<UnifiedDataResult> => {
  const response = await api.get(`/analysis/unified/research/${symbol}`, {
    params: { include_iwencai: includeIwencai },
  });
  return response as unknown as UnifiedDataResult;
};

export const getUnifiedNews = async (symbol: string, includeGlobal = false): Promise<UnifiedDataResult> => {
  const response = await api.get(`/analysis/unified/news/${symbol}`, {
    params: { include_global: includeGlobal },
  });
  return response as unknown as UnifiedDataResult;
};

export const getUnifiedFinancials = async (symbol: string): Promise<UnifiedDataResult> => {
  const response = await api.get(`/analysis/unified/financials/${symbol}`);
  return response as unknown as UnifiedDataResult;
};

export const getUnifiedAnnouncements = async (symbol: string): Promise<UnifiedDataResult> => {
  const response = await api.get(`/analysis/unified/announcements/${symbol}`);
  return response as unknown as UnifiedDataResult;
};

export const getUnifiedAll = async (symbol: string): Promise<UnifiedAllResult> => {
  const response = await api.get(`/analysis/unified/all/${symbol}`);
  return response as unknown as UnifiedAllResult;
};

// DCF 估值计算 API
export interface DCFResult {
  symbol: string;
  current_price: number;
  fair_value: number;
  upside_potential: number;
  downside_potential: number;
  wacc: number;
  terminal_growth: number;
  sensitivity_matrix: number[][];
  wacc_values: number[];
  growth_values: number[];
  using_default: boolean;
  fcf_history?: any[];
  fcf_forecast?: any[];
}

export const getDCFAnalysis = async (symbol: string): Promise<DCFResult> => {
  const response = await api.get(`/analysis/dcf/${symbol}`);
  return response as unknown as DCFResult;
};

// 资本运作数据 API
export interface FundRaisingItem {
  announcement_date: string;
  issue_type: string;
  start_date: string;
  net_raised: string;
  remaining_end_date: string;
  remaining: string;
  utilization_rate: string;
}

export interface ProjectInvestmentItem {
  announcement_date: string;
  project_name: string;
  promised_funds: string;
  invested_funds: string;
  construction_period: string;
  after_tax_return: string;
  predicted_net_profit: string;
  project_desc: string;
}

export interface AcquisitionItem {
  year?: string;
  announcement_date: string;
  transaction_amount: string;
  progress: string;
  target: string;
  buyer: string;
  seller: string;
  overview: string;
}

export interface EquityInvestmentItem {
  fund_name: string;
  fund_code: string;
  hold_number: string;
  hold_ratio: string;
  hold_value: string;
  net_ratio: string;
}

export interface EquityTransferItem {
  year?: string;
  announcement_date: string;
  transaction_amount: string;
  transfer_ratio: string;
  transferor: string;
  target: string;
  transferee: string;
  overview: string;
  impact?: string;
}

export interface RelatedTransactionItem {
  year?: string;
  announcement_date: string;
  transaction_amount: string;
  payment_method: string;
  counterparty: string;
  transaction_type: string;
  related_relation: string;
  description: string;
}

export interface ProfitForecastItem {
  year: string;
  avg_eps: number | null;
  org_count: number | null;
  min_eps: number | null;
  max_eps: number | null;
  industry_avg: number | null;
}

export interface CapitalOperationResult {
  fund_raising: FundRaisingItem[];
  project_investment: ProjectInvestmentItem[];
  acquisition: AcquisitionItem[];
  equity_investment: EquityInvestmentItem[];
  equity_transfer: EquityTransferItem[];
  related_transactions: RelatedTransactionItem[];
  company_info: Record<string, string> | null;
  profit_forecast: ProfitForecastItem[];
}

export const getCapitalOperation = async (symbol: string): Promise<CapitalOperationResult> => {
  const response = await api.get(`/analysis/capital-operation/${symbol}`);
  return response as unknown as CapitalOperationResult;
};

export default api;
