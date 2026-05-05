/**
 * Widget组件系统统一导出
 */

export { widgetRegistry } from './WidgetRegistry';
export { registerAllWidgets } from './registerWidgets';
export { default as DynamicWidgetRenderer } from './DynamicWidgetRenderer';
export type {
  WidgetMeta,
  WidgetProps,
  WidgetComponent,
  WidgetRegistration,
  WidgetLayoutItem,
  TabLayout,
  AnalysisModeLayout,
  WidgetCategory,
} from './types';
