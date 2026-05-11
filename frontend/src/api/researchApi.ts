import axios from 'axios';
import type {
  ResearchReportsResponse,
  ResearchReport,
  ResearchSearchResponse,
  SectionData,
  RawMarkdownResponse,
} from '../types/research';

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const msg = error.response?.data?.detail || error.message || '请求失败';
    return Promise.reject(new Error(msg));
  }
);

export const getResearchReports = async (): Promise<ResearchReportsResponse> => {
  return api.get('/research/reports') as unknown as Promise<ResearchReportsResponse>;
};

export const getResearchReport = async (directory: string): Promise<ResearchReport> => {
  return api.get(`/research/reports/${directory}`) as unknown as Promise<ResearchReport>;
};

export const getResearchSection = async (
  directory: string,
  sectionName: string
): Promise<SectionData> => {
  return api.get(`/research/reports/${directory}/section/${sectionName}`) as unknown as Promise<SectionData>;
};

export const searchResearchReports = async (query: string): Promise<ResearchSearchResponse> => {
  return api.get('/research/search', { params: { q: query } }) as unknown as Promise<ResearchSearchResponse>;
};

export const getRawMarkdown = async (directory: string, filepath: string): Promise<RawMarkdownResponse> => {
  return api.get(`/research/reports/${directory}/raw/${filepath}`) as unknown as Promise<RawMarkdownResponse>;
};
