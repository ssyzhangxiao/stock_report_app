/**
 * Widget组件系统类型定义
 * 通过组件注册+动态渲染实现灵活的前端展示，替代固化的switch-case
 */

import React from 'react';
import type { StockAnalysisResponse, SmartAnalysisResult } from '../types/stock';

export type WidgetCategory = 'chart' | 'table' | 'card' | 'panel' | 'editor' | 'placeholder';

export interface WidgetMeta {
  id: string;
  name: string;
  description: string;
  category: WidgetCategory;
  icon?: string;
  /** 组件所需的数据字段路径，如 ['history', 'valuation.pe_ratio'] */
  requiredData?: string[];
  /** 是否已完整实现（false则为占位组件） */
  implemented: boolean;
  /** 默认布局尺寸 */
  defaultSize?: { w: number; h: number };
  /** 支持的标签页类型 */
  tags?: string[];
}

export interface WidgetProps {
  widgetId: string;
  /** 股票分析完整数据 */
  data: StockAnalysisResponse;
  /** 智能分析数据 */
  smartAnalysis?: SmartAnalysisResult | null;
  /** Widget自定义配置 */
  config?: Record<string, unknown>;
  /** 主题 */
  theme?: 'light' | 'dark';
}

export type WidgetComponent = React.ComponentType<WidgetProps>;

export interface WidgetRegistration {
  meta: WidgetMeta;
  component: WidgetComponent;
}

export interface WidgetLayoutItem {
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
    params?: Record<string, unknown>;
  };
}

export interface TabLayout {
  id: string;
  name: string;
  description?: string;
  layout: WidgetLayoutItem[];
}

export interface AnalysisModeLayout {
  id: string;
  name: string;
  description: string;
  icon: string;
  allowCustomization: boolean;
  tabs: Record<string, TabLayout>;
}
