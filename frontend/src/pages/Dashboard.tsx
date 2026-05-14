import React, { useState, useEffect } from 'react';
import { Input, Button, Spin, message, Card, Row, Col, Typography, Alert, Space, Tag, Tabs } from 'antd';
import { SearchOutlined, DownloadOutlined, RiseOutlined, FallOutlined, FileTextOutlined } from '@ant-design/icons';
import { getSmartAnalysis } from '../api/stockApi';
import type { StockAnalysisResponse, SmartAnalysisResult } from '../types/stock';
import EnhancedAnalysis from '../components/cards/EnhancedAnalysis';
import { exportToPDF } from '../utils/exportPDF';
import { exportToHTML } from '../utils/exportHTML';
import ThemeToggle from '../components/theme/ThemeToggle';
import { useTheme } from '../contexts/ThemeContext';

import { initSkills, skillExecutor, SkillExecutionResult } from '../skills';
import { ProgressTracker, ReportTemplateSelector } from '../components/analysis';
import type { ReportTemplateType } from '../utils/reportTemplates';
import { getAnalysisModeById } from '../utils/analysisModeTemplates';

import { registerAllWidgets, DynamicWidgetRenderer, widgetRegistry } from '../widgets';
import ReportList from './ReportList';

const { Title, Text } = Typography;

const getStyles = (_theme: 'light' | 'dark') => ({
  page: {
    minHeight: '100vh',
    padding: 0,
  },
  headerCard: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: 0,
    marginBottom: 24,
    boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
  },
  headerTitle: {
    color: '#fff', fontSize: 24, fontWeight: 600, margin: 0, letterSpacing: 1,
  },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  headerDate: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 4 },
  contentArea: { padding: '0 24px 24px', maxWidth: 1600, margin: '0 auto' },
  dataCard: {
    borderRadius: 8,
    marginBottom: 16,
  },
  statValue: { fontSize: 20, fontWeight: 700 },
  statLabel: { fontSize: 12 },
  upColor: '#ff4d4f', downColor: '#52c41a',
  emptyState: {
    textAlign: 'center' as const,
    padding: '80px 20px',
    borderRadius: 16,
  },
  footer: {
    textAlign: 'center' as const,
    padding: '32px 24px',
    fontSize: 12
  },
});

type ViewMode = 'analysis' | 'reports';

const Dashboard: React.FC = () => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const [viewMode, setViewMode] = useState<ViewMode>('analysis');
  const [symbol, setSymbol] = useState<string>('600519');
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<StockAnalysisResponse | null>(null);
  const [smartAnalysisData, setSmartAnalysisData] = useState<SmartAnalysisResult | null>(null);
  const [selectedMode] = useState<string>('full-analysis');
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplateType>('full');
  const [progressResults, setProgressResults] = useState<SkillExecutionResult[]>([]);
  const [showProgress, setShowProgress] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('');

  const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });

  useEffect(() => {
    initSkills();
    registerAllWidgets();
  }, []);

  useEffect(() => {
    const modeTemplate = getAnalysisModeById(selectedMode);
    if (modeTemplate) {
      const tabKeys = Object.keys(modeTemplate.tabs);
      if (tabKeys.length > 0) {
        setActiveTab(tabKeys[0]);
      }
    }
  }, [selectedMode]);

  const renderWidget = (widgetId: string) => {
    if (!data) return null;
    console.log('renderWidget 被调用 widgetId:', widgetId, 'data.symbol:', data.symbol);
    return (
      <DynamicWidgetRenderer
        widgetId={widgetId}
        data={data}
        smartAnalysis={smartAnalysisData}
        theme={theme}
      />
    );
  };

  const handleAnalyze = async () => {
    if (!symbol || symbol.trim() === '') {
      message.warning('请输入股票代码');
      return;
    }

    setLoading(true);
    setShowProgress(true);
    setProgressResults([]);

    try {
      const [smartResult] = await Promise.all([
        getSmartAnalysis(symbol.trim(), 2),
        executeSkillChain()
      ]);

      setSmartAnalysisData(smartResult);
      setData(smartResult.stock_data || null);
      message.success({ content: `✅ 成功获取 ${smartResult.symbol} 的智能分析数据`, key: 'analysis' });
    } catch (error: any) {
      message.error({ content: error.message || '分析失败，请检查股票代码是否正确', key: 'analysis' });
    } finally {
      setLoading(false);
    }
  };

  const executeSkillChain = async () => {
    try {
      skillExecutor.setProgressCallback((results) => {
        setProgressResults([...results]);
      });

      await skillExecutor.executeMode(selectedMode, { symbol });
    } catch (error: any) {
      console.error('技能执行失败:', error);
    }
  };

  const handleExportPDF = async () => {
    if (!data) { message.warning('请先进行股票分析'); return; }
    try {
      await exportToPDF('report-content', { title: '上市公司自动分析报告', symbol: data.symbol });
      message.success('PDF 导出成功！');
    } catch { message.error('PDF 导出失败'); }
  };

  const handleExportHTML = async () => {
    if (!data) { message.warning('请先进行股票分析'); return; }
    try {
      await exportToHTML('report-content', { title: '上市公司自动分析报告', symbol: data.symbol });
      message.success('HTML 报告导出成功！');
    } catch { message.error('HTML 报告导出失败'); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleAnalyze(); };

  const pctChg = data?.technical?.pct_chg as number | undefined;
  const isUp = (pctChg ?? 0) >= 0;
  const priceColor = isUp ? styles.upColor : styles.downColor;
  const ArrowIcon = isUp ? RiseOutlined : FallOutlined;

  const StatCell = ({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) => (
    <Col xs={12} sm={8} md={6} lg={4}>
      <div style={{ padding: '12px 8px' }}>
        <Text type="secondary" style={styles.statLabel}>{label}</Text>
        <div style={{ ...styles.statValue, color: color }}>{value ?? 'N/A'}</div>
      </div>
    </Col>
  );

  return (
    <div style={styles.page}>
      {/* Header */}
      <Card style={styles.headerCard} styles={{ body: { padding: '24px 32px' } }}>
        <Row align="middle" justify="space-between" gutter={[16, 16]}>
          <Col xs={24} md={16}>
            <Space>
              <div style={styles.headerTitle}>📊 股票智能分析系统</div>
              <Tag color="blue" style={{ fontSize: 11, padding: '2px 10px', border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff' }}>⚡ 组件系统就绪 ({widgetRegistry.count})</Tag>
              <ThemeToggle />
            </Space>
            <div style={styles.headerSub}>多源数据驱动的智能分析平台 · 技能化架构 · 可视化报告</div>
            <div style={styles.headerDate}>📅 报告日期：{today}</div>
          </Col>
          <Col xs={24} md={8}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Row gutter={8} justify="end">
                <Col>
                  <Button
                    type={viewMode === 'analysis' ? 'primary' : 'default'}
                    onClick={() => setViewMode('analysis')}
                    style={{
                      background: viewMode === 'analysis' ? '#fff' : 'rgba(255,255,255,0.15)',
                      borderColor: viewMode === 'analysis' ? '#fff' : 'rgba(255,255,255,0.3)',
                      color: viewMode === 'analysis' ? '#667eea' : '#fff',
                    }}
                  >
                    <SearchOutlined style={{ marginRight: 4 }} />
                    股票分析
                  </Button>
                </Col>
                <Col>
                  <Button
                    type={viewMode === 'reports' ? 'primary' : 'default'}
                    onClick={() => setViewMode('reports')}
                    style={{
                      background: viewMode === 'reports' ? '#fff' : 'rgba(255,255,255,0.15)',
                      borderColor: viewMode === 'reports' ? '#fff' : 'rgba(255,255,255,0.3)',
                      color: viewMode === 'reports' ? '#667eea' : '#fff',
                    }}
                  >
                    <FileTextOutlined style={{ marginRight: 4 }} />
                    研究报告
                  </Button>
                </Col>
              </Row>
              {viewMode === 'analysis' && (
                <Space.Compact style={{ width: '100%' }}>
                  <Input
                    placeholder="输入股票代码（如 600519）"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    onKeyDown={handleKeyDown}
                    prefix={<SearchOutlined style={{ color: 'rgba(255,255,255,0.6)' }} />}
                    style={{ width: '55%', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff' }}
                    allowClear
                  />
                  <Button type="primary" onClick={handleAnalyze} loading={loading}
                    style={{ background: '#fff', borderColor: '#fff', color: '#667eea', fontWeight: 600 }}>
                    开始分析
                  </Button>
                  {data && (
                    <>
                      <Button icon={<DownloadOutlined />} onClick={handleExportPDF}
                        style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff' }}>
                        导出PDF
                      </Button>
                      <Button onClick={handleExportHTML}
                        style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff' }}>
                        导出HTML
                      </Button>
                    </>
                  )}
                </Space.Compact>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Main Content */}
      <div style={styles.contentArea}>
        {viewMode === 'analysis' ? (
          <>
            {/* Loading */}
            {loading && (
              <Card style={{ ...styles.dataCard, padding: 0 }}>
                <div style={{ textAlign: 'center', padding: '80px 0' }}>
                  <Spin size="large" tip="正在获取数据并生成分析报告..." />
                </div>
              </Card>
            )}

            {/* Empty State */}
            {!loading && !data && (
              <div style={styles.emptyState}>
                <div style={{ fontSize: 72, marginBottom: 16, opacity: 0.6 }}></div>
                <Title level={3} style={{ margin: 0 }}>股票智能分析系统</Title>
                <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                  输入股票代码，点击「开始分析」，获取深度分析报告
                </Text>
                <div style={{ marginTop: 32 }}>
                  <Text type="secondary" style={{ fontSize: 14 }}>快速选择：</Text>
                  <div style={{ marginTop: 16, display: 'flex', gap: 12, justifyContent: 'center' }}>
                    {[
                      { code: '600519', name: '贵州茅台' },
                      { code: '000001', name: '平安银行' },
                      { code: '300750', name: '宁德时代' },
                    ].map((s) => (
                      <Button key={s.code} size="middle"
                        onClick={() => { setSymbol(s.code); }}
                        style={{ borderRadius: 6 }}>
                        {s.code} {s.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Data Display */}
            {!loading && data && (
              <div id="report-content">
                {/* Report Template Selector */}
                <ReportTemplateSelector
                  selectedTemplate={selectedTemplate}
                  onSelect={setSelectedTemplate}
                />

                {/* Progress Tracker */}
                {showProgress && progressResults.length > 0 && (
                  <ProgressTracker results={progressResults} />
                )}

                {/* Source Alerts */}
                {data.data_source === 'unavailable' && (
                  <Alert message="数据获取失败" description="所有数据源均不可用" type="error" showIcon style={{ marginBottom: 16, borderRadius: 8 }} />
                )}
                {(data.data_source === 'sina' || data.data_source === 'eastmoney') && (
                  <Alert message={`数据源：${data.data_source === 'sina' ? '新浪财经' : '东方财富'}`}
                    description={data.data_source === 'sina' ? '行情/财务来自新浪；风险/资金/新闻来自东财' : '全量数据来自东方财富'}
                    type="info" showIcon style={{ marginBottom: 16, borderRadius: 8 }} />
                )}

                {/* Stats Row */}
                <Card style={styles.dataCard} styles={{ body: { padding: '16px 24px' } }}>
                  <Row gutter={[16, 16]}>
                    <StatCell label="代码" value={<Tag color="blue" style={{ fontSize: 13, fontWeight: 600 }}>{data.symbol}</Tag>} />
                    <StatCell label="最新价" value={<span style={{ color: priceColor, fontWeight: 700 }}>¥{data.latest_price?.toFixed(2) ?? '--'}</span>} color={priceColor} />
                    <StatCell label="涨跌幅" value={<span style={{ color: priceColor }}><ArrowIcon style={{ marginRight: 2 }} />{pctChg != null ? `${pctChg >= 0 ? '+' : ''}${pctChg.toFixed(2)}%` : '--'}</span>} color={priceColor} />
                    <StatCell label="PE" value={data.valuation.pe_ratio ?? '--'} />
                    <StatCell label="PB" value={data.valuation.pb_ratio ?? '--'} />
                    <StatCell label="市值" value={data.valuation.market_cap ?? '--'} />
                    <StatCell label="行业PE" value={data.valuation.industry_pe ?? '--'} />
                  </Row>
                </Card>

                {/* 增强智能分析 */}
                {smartAnalysisData && (
                  <EnhancedAnalysis smartAnalysis={smartAnalysisData.smart_analysis} />
                )}

                {/* 使用标签页布局的主内容 */}
                {(() => {
                  const modeTemplate = getAnalysisModeById(selectedMode);
                  if (!modeTemplate) return null;

                  const tabItems = Object.values(modeTemplate.tabs).map((tab: any) => ({
                    key: tab.id,
                    label: tab.name,
                  }));

                  return (
                    <div style={{ marginTop: 16 }}>
                      <Tabs
                        activeKey={activeTab}
                        onChange={setActiveTab}
                        items={tabItems}
                        type="card"
                      />
                      <div style={{ marginTop: 16 }}>
                        <Row gutter={[16, 16]}>
                          {modeTemplate.tabs[activeTab]?.layout.map((widget: any) => {
                            const widgetContent = renderWidget(widget.i);
                            if (!widgetContent) return null;
                            const span = Math.round((widget.w || 40) * 24 / 40);
                            return (
                              <Col key={widget.i} span={span}>
                                <Card style={{ ...styles.dataCard, marginBottom: 0, height: '100%' }}>
                                  {widgetContent}
                                </Card>
                              </Col>
                            );
                          })}
                        </Row>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </>
        ) : (
          <ReportList />
        )}

        {/* Footer */}
        <div style={styles.footer}>
          数据来源：mootdx(行情/F10) + 腾讯财经(估值) + 东财(研报/风控) + akshare(新闻/公告) + 巨潮(公告) + DeepSeek(AI分析) &nbsp;|&nbsp; 五层数据架构 · 可视化报告 &nbsp;|&nbsp; 仅供参考，不构成投资建议
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
