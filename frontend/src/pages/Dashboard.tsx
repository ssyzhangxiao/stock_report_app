import React, { useState } from 'react';
import { Input, Button, Spin, message, Card, Row, Col, Typography, Alert, Space, Tag } from 'antd';
import { SearchOutlined, DownloadOutlined, RiseOutlined, FallOutlined, LineChartOutlined } from '@ant-design/icons';
import { getStockAnalysis, StockAnalysisResponse } from '../api/stockApi';
import KLineChart from '../components/charts/KLineChart';
import DeepFinancialTable from '../components/tables/DeepFinancialTable';
import RiskIndicatorsPanel from '../components/panels/RiskIndicatorsPanel';
import FundFlowCard from '../components/cards/FundFlowCard';
import NewsSection from '../components/panels/NewsSection';
import AnalystConsensusCard from '../components/cards/AnalystConsensusCard';
import ManualRiskEditor from '../components/editors/ManualRiskEditor';
import SmartAnalysisCard from '../components/cards/SmartAnalysisCard';
import { exportToPDF } from '../utils/exportPDF';

const { Title, Text } = Typography;

// ── styles ──────────────────────────────────────────
const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a1628 0%, #1a2744 50%, #0f1f3d 100%)',
    padding: 0,
  },
  headerCard: {
    background: 'linear-gradient(135deg, #141e30 0%, #243b55 100%)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 0,
    marginBottom: 24,
    boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
  },
  headerTitle: {
    color: '#e8d5a3',
    fontSize: 22,
    fontWeight: 600,
    margin: 0,
    letterSpacing: 1,
  },
  headerSub: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  headerDate: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12,
    marginTop: 4,
  },
  contentArea: {
    padding: '0 24px 24px',
    maxWidth: 1400,
    margin: '0 auto',
  },
  dataCard: {
    background: '#ffffff',
    borderRadius: 12,
    marginBottom: 20,
    border: '1px solid #e8ecf1',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
    transition: 'box-shadow 0.3s, transform 0.2s',
  },
  statValue: { fontSize: 20, fontWeight: 700 },
  statLabel: { color: '#8c8c8c', fontSize: 12 },
  upColor: '#cf1322',
  downColor: '#3f8600',
  emptyState: {
    textAlign: 'center' as const,
    padding: '80px 20px',
    background: 'linear-gradient(135deg, #1a2744 0%, #0f1f3d 100%)',
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.06)',
  },
  footer: {
    textAlign: 'center' as const,
    padding: '32px 24px',
    color: 'rgba(255,255,255,0.25)',
    fontSize: 12,
  },
};

const Dashboard: React.FC = () => {
  const [symbol, setSymbol] = useState<string>('600519');
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<StockAnalysisResponse | null>(null);
  const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });

  const handleAnalyze = async () => {
    if (!symbol || symbol.trim() === '') {
      message.warning('请输入股票代码');
      return;
    }
    setLoading(true);
    try {
      const result = await getStockAnalysis(symbol.trim(), 2);
      setData(result);
      message.success({ content: `✅ 成功获取 ${result.symbol} 的分析数据`, key: 'analysis' });
    } catch (error: any) {
      message.error({ content: error.message || '分析失败，请检查股票代码是否正确', key: 'analysis' });
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!data) { message.warning('请先进行股票分析'); return; }
    try {
      await exportToPDF('report-content', { title: '上市公司自动分析报告', symbol: data.symbol });
      message.success('PDF 导出成功！');
    } catch { message.error('PDF 导出失败'); }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleAnalyze(); };

  const pctChg = data?.technical?.pct_chg as number | undefined;
  const isUp = (pctChg ?? 0) >= 0;
  const priceColor = isUp ? styles.upColor : styles.downColor;
  const ArrowIcon = isUp ? RiseOutlined : FallOutlined;

  // ── Stat cell helper ──
  const StatCell = ({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) => (
    <Col xs={12} sm={8} md={6}>
      <div style={{ padding: '8px 4px' }}>
        <div style={styles.statLabel}>{label}</div>
        <div style={{ ...styles.statValue, color: color || '#262626' }}>{value ?? 'N/A'}</div>
      </div>
    </Col>
  );

  return (
    <div style={styles.page}>
      {/* ── Header ── */}
      <Card style={styles.headerCard} bodyStyle={{ padding: '20px 24px' }}>
        <Row align="middle" justify="space-between" gutter={[16, 12]}>
          <Col xs={24} md={14}>
            <div style={styles.headerTitle}>📊 控制权转让 · 基本面看板</div>
            <div style={styles.headerSub}>多源数据驱动的控制权转让前尽职调查平台 · 新浪 + 东方财富 + 通义千问</div>
            <div style={styles.headerDate}>📅 报告日期：{today}</div>
          </Col>
          <Col xs={24} md={10}>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                placeholder="输入股票代码（如 600519）"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                onKeyPress={handleKeyPress}
                prefix={<SearchOutlined style={{ color: 'rgba(255,255,255,0.4)' }} />}
                style={{ width: '60%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                allowClear
              />
              <Button type="primary" onClick={handleAnalyze} loading={loading}
                style={{ background: '#e8d5a3', borderColor: '#e8d5a3', color: '#1a2744', fontWeight: 600 }}>
                开始分析
              </Button>
              {data && (
                <Button icon={<DownloadOutlined />} onClick={handleExportPDF}
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}>
                  导出 PDF
                </Button>
              )}
            </Space.Compact>
          </Col>
        </Row>
      </Card>

      {/* ── Main Content ── */}
      <div style={styles.contentArea}>
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
            <div style={{ fontSize: 72, marginBottom: 16, opacity: 0.6 }}>📈</div>
            <Title level={3} style={{ color: '#e8d5a3', margin: 0 }}>控制权转让基本面看板</Title>
            <Text style={{ color: 'rgba(255,255,255,0.5)', display: 'block', marginTop: 8 }}>
              输入标的公司股票代码，获取控制权转让前深度尽职调查分析报告
            </Text>
            <div style={{ marginTop: 24 }}>
              <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>快速选择：</Text>
              <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center' }}>
                {[
                  { code: '600519', name: '贵州茅台' },
                  { code: '000001', name: '平安银行' },
                  { code: '300750', name: '宁德时代' },
                ].map((s) => (
                  <Button key={s.code} size="small" ghost
                    onClick={() => { setSymbol(s.code); }}>
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
            {/* Source Alerts */}
            {data.data_source === 'unavailable' && (
              <Alert message="数据获取失败" description="所有数据源均不可用" type="error" showIcon
                style={{ marginBottom: 20, borderRadius: 8 }} />)}
            {(data.data_source === 'sina' || data.data_source === 'eastmoney') && (
              <Alert message={`数据源：${data.data_source === 'sina' ? '新浪财经' : '东方财富'}`}
                description={data.data_source === 'sina' ? '行情/财务来自新浪；风险/资金/新闻来自东财' : '全量数据来自东方财富'}
                type="info" showIcon style={{ marginBottom: 20, borderRadius: 8 }} />
            )}

            {/* ── Dashboard Grid ── */}
            <Row gutter={[16, 16]}>
              {/* LEFT COLUMN (2/3) */}
              <Col xs={24} xl={16}>
                {/* Quick Stats */}
                <Card style={styles.dataCard} bodyStyle={{ padding: '12px 16px' }}>
                  <Row gutter={[8, 4]}>
                    <StatCell label="股票代码" value={<Tag color="blue" style={{ fontSize: 13, fontWeight: 600 }}>{data.symbol}</Tag>} />
                    <StatCell label="最新价" value={<span style={{ color: priceColor, fontSize: 22 }}>¥{data.latest_price?.toFixed(2) ?? '--'}</span>} color={priceColor} />
                    <StatCell label="涨跌幅" value={<span style={{ color: priceColor }}><ArrowIcon style={{ marginRight: 4 }} />{pctChg != null ? `${pctChg >= 0 ? '+' : ''}${pctChg.toFixed(2)}%` : '--'}</span>} color={priceColor} />
                    <StatCell label="换手率" value={data.technical?.turnover != null ? `${data.technical.turnover.toFixed(2)}%` : '--'} />
                    <StatCell label="市盈率" value={data.valuation.pe_ratio ?? '--'} />
                    <StatCell label="市净率" value={data.valuation.pb_ratio ?? '--'} />
                    <StatCell label="总市值" value={data.valuation.market_cap ?? '--'} />
                    <StatCell label="行业PE" value={data.valuation.industry_pe ?? '--'} />
                    <StatCell label="参考市值" value={data.valuation.reference_market_cap ?? '--'} />
                  </Row>
                </Card>

                {/* K-line */}
                {data.history && data.history.length > 0 && (
                  <Card style={{ ...styles.dataCard, overflow: 'hidden' }}
                    title={<span style={{ fontSize: 14 }}><LineChartOutlined /> K线走势</span>}
                    bodyStyle={{ padding: 0 }}>
                    <KLineChart data={data.history} height={420} />
                  </Card>
                )}

                {/* Financial + Risk side by side */}
                <Row gutter={16}>
                  <Col xs={24} lg={14}>
                    <DeepFinancialTable
                      financialIndicators={data.deep_financial.financial_indicators || []}
                      balanceSheet={data.deep_financial.balance_sheet || []}
                      cashflow={data.deep_financial.cashflow || []}
                    />
                  </Col>
                  <Col xs={24} lg={10}>
                    <RiskIndicatorsPanel
                      pledgeRatio={data.risk_indicators.pledge_ratio || []}
                      cyq={data.risk_indicators.cyq || []}
                      insiderHoldings={data.risk_indicators.insider_holdings || []}
                      marginBalance={data.risk_indicators.margin_balance || []}
                    />
                  </Col>
                </Row>
              </Col>

              {/* RIGHT COLUMN (1/3) */}
              <Col xs={24} xl={8}>
                {/* AI Analysis */}
                {data.smart_analysis && data.smart_analysis.available && (
                  <SmartAnalysisCard analysis={data.smart_analysis} />
                )}

                {/* Fund Flow */}
                <FundFlowCard fundFlow={data.fund_flow || []} />

                {/* Analyst */}
                <AnalystConsensusCard
                  consensus={data.analyst_consensus || {}}
                  currentPrice={data.latest_price ?? undefined}
                />
              </Col>
            </Row>

            {/* ── FULL WIDTH SECTIONS ── */}
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
              <Col xs={24} lg={14}>
                <NewsSection news={data.news_analysis || []} />
              </Col>
              <Col xs={24} lg={10}>
                <ManualRiskEditor
                  symbol={data.symbol}
                  aiAnalysis={data.smart_analysis?.manual_risk_analysis}
                  onSave={(analysis) => {
                    console.log('保存的风险分析:', analysis);
                    message.success('风险分析已保存');
                  }}
                />
              </Col>
            </Row>
          </div>
        )}

        {/* Footer */}
        <div style={styles.footer}>
          数据来源：新浪财经(行情) + 东方财富(风控) + 通义千问/DeepSeek(估值/新闻/评级) &nbsp;|&nbsp; 仅供参考，不构成投资建议
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
