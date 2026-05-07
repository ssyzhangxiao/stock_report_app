/**
 * 动态Widget渲染器
 * 从WidgetRegistry中查找组件并渲染，替代固化的switch-case
 * 支持：自动数据注入、占位组件、错误边界、加载状态
 */

import React, { Suspense } from 'react';
import { Spin, Card, Typography } from 'antd';
import { widgetRegistry } from './WidgetRegistry';
import type { WidgetProps } from './types';

const { Text } = Typography;

interface DynamicWidgetRendererProps {
  widgetId: string;
  data: WidgetProps['data'];
  smartAnalysis?: WidgetProps['smartAnalysis'];
  config?: Record<string, unknown>;
  theme?: 'light' | 'dark';
}

const PlaceholderWidget: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <div style={{ padding: '40px 20px', textAlign: 'center', color: '#8c8c8c' }}>
    <div style={{ fontSize: 24, marginBottom: 8 }}>🔧</div>
    <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{title}</div>
    <div style={{ fontSize: 13 }}>{description}</div>
  </div>
);

const WidgetError: React.FC<{ widgetId: string; error: string }> = ({ widgetId, error }) => (
  <Card size="small" style={{ borderColor: '#ff4d4f' }}>
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <div style={{ fontSize: 24, marginBottom: 8 }}>⚠️</div>
      <Text type="danger" strong>组件渲染失败: {widgetId}</Text>
      <div style={{ marginTop: 4 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>{error}</Text>
      </div>
    </div>
  </Card>
);

class WidgetErrorBoundary extends React.Component<
  { widgetId: string; children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { widgetId: string; children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }

  render() {
    if (this.state.hasError) {
      return <WidgetError widgetId={this.props.widgetId} error={this.state.error} />;
    }
    return this.props.children;
  }
}

const DynamicWidgetRenderer: React.FC<DynamicWidgetRendererProps> = ({
  widgetId,
  data,
  smartAnalysis,
  config,
  theme,
}) => {
  const registration = widgetRegistry.get(widgetId);

  if (!registration) {
    return <PlaceholderWidget title={widgetId} description="该组件未注册" />;
  }

  const { meta, component: WidgetComponent } = registration;

  if (!meta.implemented) {
    return <PlaceholderWidget title={meta.name} description={meta.description} />;
  }

  const widgetProps: WidgetProps = {
    widgetId,
    data,
    smartAnalysis,
    config: { ...config },
    theme,
  };

  return (
    <WidgetErrorBoundary widgetId={widgetId}>
      <Suspense fallback={<div style={{ textAlign: 'center', padding: 40 }}><Spin tip="加载组件..." /></div>}>
        <WidgetComponent {...widgetProps} />
      </Suspense>
    </WidgetErrorBoundary>
  );
};

export default DynamicWidgetRenderer;
