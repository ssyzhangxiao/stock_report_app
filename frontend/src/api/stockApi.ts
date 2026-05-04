import axios from 'axios';
import type {
  StockAnalysisResponse,
  SmartAnalysisResult,
  LLMProvidersResponse,
  ControlStatus,
  DexterResult,
  DexterHealthResponse,
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

export const checkDexterHealth = async (): Promise<DexterHealthResponse> => {
  const response = await api.get('/analysis/dexter/health');
  return response as unknown as DexterHealthResponse;
};

export const runDexterDCF = async (symbol: string, name?: string): Promise<DexterResult> => {
  const response = await api.post(`/analysis/dexter/dcf/${symbol}`, null, {
    params: name ? { name } : {},
  });
  return response as unknown as DexterResult;
};

export const runDexterXSentiment = async (symbol: string, name?: string): Promise<DexterResult> => {
  const response = await api.post(`/analysis/dexter/x-sentiment/${symbol}`, null, {
    params: name ? { name } : {},
  });
  return response as unknown as DexterResult;
};

export const runDexterInsider = async (symbol: string, name?: string): Promise<DexterResult> => {
  const response = await api.post(`/analysis/dexter/insider/${symbol}`, null, {
    params: name ? { name } : {},
  });
  return response as unknown as DexterResult;
};

export const runDexterReport = async (symbol: string, name?: string): Promise<DexterResult> => {
  const response = await api.post(`/analysis/dexter/report/${symbol}`, null, {
    params: name ? { name } : {},
  });
  return response as unknown as DexterResult;
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

export default api;
