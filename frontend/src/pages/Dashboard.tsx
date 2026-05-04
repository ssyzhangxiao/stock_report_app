import React, { useState, useEffect } from 'react';
import { Input, Button, Spin, message, Card, Row, Col, Typography, Alert, Space, Tag, Tabs } from 'antd';
import { SearchOutlined, DownloadOutlined, RiseOutlined, FallOutlined } from '@ant-design/icons';
import { getSmartAnalysis } from '../api/stockApi';
import type { StockAnalysisResponse, SmartAnalysisResult } from '../types/stock';
import KLineChart from '../components/charts/KLineChart';
import DeepFinancialTable from '../components/tables/DeepFinancialTable';
import RiskIndicatorsPanel from '../components/panels/RiskIndicatorsPanel';
import FundFlowCard from '../components/cards/FundFlowCard';
import NewsSection from '../components/panels/NewsSection';
import AnalystConsensusCard from '../components/cards/AnalystConsensusCard';
import ManualRiskEditor from '../components/editors/ManualRiskEditor';
import EnhancedAnalysis from '../components/cards/EnhancedAnalysis';
import { exportToPDF } from '../utils/exportPDF';
import { exportToHTML } from '../utils/exportHTML';
import ThemeToggle from '../components/theme/ThemeToggle';
import { useTheme } from '../contexts/ThemeContext';

// 新功能导入
import { initSkills, skillExecutor, SkillExecutionResult } from '../skills';
import { AnalysisModeSelector, ProgressTracker, ReportTemplateSelector } from '../components/analysis';
import type { ReportTemplateType } from '../utils/reportTemplates';
import {
  SensitivityHeatmap,
  RiskDashboard,
  ValuationComparison,
  PeerComparison
} from '../components/charts';
import { getAnalysisModeById } from '../utils/analysisModeTemplates';
import MATechnicalAnalysis from '../components/panels/MATechnicalAnalysis';
import RiskScoreCard from '../components/cards/RiskScoreCard';

const { Title, Text } = Typography;

// 样式定义 - 使用CSS变量
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

const Dashboard: React.FC = () => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const [symbol, setSymbol] = useState<string>('600519');
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<StockAnalysisResponse | null>(null);
  const [smartAnalysisData, setSmartAnalysisData] = useState<SmartAnalysisResult | null>(null);
  const [selectedMode, setSelectedMode] = useState<string>('quick-view');
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplateType>('full');
  const [progressResults, setProgressResults] = useState<SkillExecutionResult[]>([]);
  const [showProgress, setShowProgress] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('');

  const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });

  // 初始化技能系统
  useEffect(() => {
    initSkills();
  }, []);

  // 当选中的模式改变时，设置默认标签页
  useEffect(() => {
    const modeTemplate = getAnalysisModeById(selectedMode);
    if (modeTemplate) {
      const tabKeys = Object.keys(modeTemplate.tabs);
      if (tabKeys.length > 0) {
        setActiveTab(tabKeys[0]);
      }
    }
  }, [selectedMode]);

  // Widget占位组件
  const PlaceholderWidget = ({ title, description }: { title: string; description: string }) => (
    <div style={{ padding: '40px 20px', textAlign: 'center', color: '#8c8c8c' }}>
      <div style={{ fontSize: 24, marginBottom: 8 }}>🔧</div>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 13 }}>{description}</div>
    </div>
  );

  // Widget渲染组件
  const renderWidget = (widgetId: string) => {
    if (!data) return null;

    switch (widgetId) {
      case 'kline-chart':
        return data.history && data.history.length > 0 ? (
          <KLineChart data={data.history} height={400} />
        ) : null;
      case 'valuation-comparison':
        return (
          <ValuationComparison
            models={[
              { name: 'PE估值', value: (data.valuation.industry_pe || 20) * (data.valuation.pe_ratio || 80) / 100 },
              { name: '行业平均', value: (data.valuation.industry_pe || 20) * (data.latest_price || 100) / 100 },
              { name: 'PB估值', value: (data.valuation.pb_ratio || 5) * (data.latest_price || 100) / 5 },
            ]}
            currentPrice={data.latest_price ?? undefined}
            title="估值对比"
          />
        );
      case 'peer-comparison':
        return <PeerComparison symbol={data.symbol} />;
      case 'risk-dashboard':
        return <RiskDashboard />;
      case 'deep-financial-table':
        return (
          <DeepFinancialTable
            financialIndicators={data.deep_financial.financial_indicators || []}
            balanceSheet={data.deep_financial.balance_sheet || []}
            cashflow={data.deep_financial.cashflow || []}
            incomeStatement={data.deep_financial.income_statement || []}
          />
        );
      case 'fund-flow':
        return <FundFlowCard fundFlow={data.fund_flow || []} />;
      case 'news-section':
        return <NewsSection news={data.news_analysis || []} sourcesSummary={data.sources_summary} />;
      case 'analyst-consensus':
        return (
          <AnalystConsensusCard
            consensus={data.analyst_consensus || {}}
            currentPrice={data.latest_price ?? undefined}
          />
        );
      case 'risk-indicators-panel':
        return (
          <RiskIndicatorsPanel
            pledgeRatio={data.risk_indicators?.pledge_ratio || []}
            cyq={data.risk_indicators?.cyq || []}
            insiderHoldings={data.risk_indicators?.insider_holdings || []}
            marginBalance={data.risk_indicators?.margin_balance || []}
            marginHistory={data.risk_indicators?.margin_history}
          />
        );
      case 'manual-risk-editor':
        return (
          <ManualRiskEditor
            symbol={data.symbol}
            aiAnalysis={data.smart_analysis?.manual_risk_analysis}
            onSave={() => { message.success('风险分析已保存'); }}
          />
        );
      case 'sensitivity-heatmap':
        return (
          <SensitivityHeatmap
            data={{
              waccValues: [8, 9, 10, 11, 12],
              growthValues: [1, 2, 3, 4, 5],
              matrix: [
                [100, 110, 120, 130, 140],
                [90, 100, 110, 120, 130],
                [80, 90, 100, 110, 120],
                [70, 80, 90, 100, 110],
                [60, 70, 80, 90, 100],
              ],
              currentValue: data.latest_price || 100,
            }}
          />
        );
      // 新增widget的占位组件
      case 'ma-technical-analysis':
        return <MATechnicalAnalysis />;
      case 'market-sentiment':
        return <PlaceholderWidget title="市场情绪" description="市场情绪指数和舆情分析" />;
      case 'industry-news':
        return <PlaceholderWidget title="行业新闻" description="相关行业资讯汇总" />;
      case 'fund-flow-chart':
        return <PlaceholderWidget title="资金流向图" description="历史资金流向趋势图" />;
      case 'main-force-flow':
        return <PlaceholderWidget title="主力资金" description="主力资金动向分析" />;
      case 'dragon-tiger-list':
        return <PlaceholderWidget title="龙虎榜" description="龙虎榜数据展示" />;
      case 'financial-indicators':
        return <PlaceholderWidget title="财务指标" description="核心财务指标概览" />;
      case 'financial-trend':
        return <PlaceholderWidget title="财务趋势" description="财务数据趋势分析" />;
      case 'technical-indicators':
        return <MATechnicalAnalysis />;
      case 'risk-score-card':
        return <RiskScoreCard />;
      case 'financial-risk-indicators':
        return <PlaceholderWidget title="财务风险指标" description="财务风险监控指标" />;
      case 'pledge-risk':
        return <PlaceholderWidget title="股权质押风险" description="股权质押风险分析" />;
      case 'margin-risk':
        return <PlaceholderWidget title="融资融券风险" description="融资融券风险监控" />;
      case 'risk-summary':
        return <PlaceholderWidget title="风险总结" description="风险评估总结报告" />;
      case 'news-hot-topics':
        return <PlaceholderWidget title="新闻热点" description="相关新闻热点话题汇总" />;
      case 'northbound-flow':
        return <PlaceholderWidget title="北向资金" description="北向资金流向数据" />;
      case 'dcf-valuation':
        return <PlaceholderWidget title="DCF估值" description="现金流折现估值分析" />;
      case 'profitability-analysis':
        return <PlaceholderWidget title="盈利能力分析" description="ROE、毛利率等指标" />;
      case 'macd-analysis':
        return <PlaceholderWidget title="MACD分析" description="MACD指标趋势分析" />;
      case 'kdj-analysis':
        return <PlaceholderWidget title="KDJ分析" description="KDJ指标超买超卖分析" />;
      case 'risk-heatmap':
        return <PlaceholderWidget title="风险热力图" description="多维度风险热力图" />;
      case 'cashflow-risk':
        return <PlaceholderWidget title="现金流风险" description="现金流风险分析" />;
      case 'insider-trading':
        return <PlaceholderWidget title="内幕交易" description="高管增减持情况" />;
      case 'legal-risk':
        return <PlaceholderWidget title="法律风险" description="法律诉讼风险分析" />;
      case 'risk-recommendations':
        return <PlaceholderWidget title="风险建议" description="风控建议和应对策略" />;
      default:
        return <PlaceholderWidget title={widgetId} description="该功能正在开发中" />;
    }
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
      // 并行执行API数据获取和技能链执行
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
      // 设置进度回调
      skillExecutor.setProgressCallback((results) => {
        setProgressResults([...results]);
      });

      // 执行选定的分析模式
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
          <Col xs={24} md={12}>
            <Space>
              <div style={styles.headerTitle}>📊 股票智能分析系统</div>
              <ThemeToggle />
            </Space>
            <div style={styles.headerSub}>多源数据驱动的智能分析平台 · 技能化架构 · 可视化报告</div>
            <div style={styles.headerDate}>📅 报告日期：{today}</div>
          </Col>
          <Col xs={24} md={12}>
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
                    导出 PDF
                  </Button>
                  <Button onClick={handleExportHTML}
                    style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff' }}>
                    导出 HTML
                  </Button>
                </>
              )}
            </Space.Compact>
          </Col>
        </Row>
      </Card>

      {/* Main Content */}
      <div style={styles.contentArea}>
        {/* Analysis Mode Selector - 始终显示，让用户先选模式 */}
        <AnalysisModeSelector
          selectedMode={selectedMode}
          onSelect={setSelectedMode}
        />

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
                  {/* 渲染当前标签页的widget */}
                  <div style={{ marginTop: 16 }}>
                    {modeTemplate.tabs[activeTab]?.layout.map((widget: any) => {
                      const widgetContent = renderWidget(widget.i);
                      if (!widgetContent) return null;
                      return (
                        <Card
                          key={widget.i}
                          style={{ ...styles.dataCard, marginBottom: 16 }}
                        >
                          {widgetContent}
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Footer */}
        <div style={styles.footer}>
          数据来源：新浪财经(行情) + 东方财富(风控) + 通义千问(AI分析) &nbsp;|&nbsp; 技能化架构 · 可视化报告 &nbsp;|&nbsp; 仅供参考，不构成投资建议
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
