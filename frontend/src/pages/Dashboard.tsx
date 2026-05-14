import React, { useState, useEffect } from 'react';
import { Input, Button, message, Card, Row, Col, Typography, Alert, Space, Segmented } from 'antd';
import { SearchOutlined, FileTextOutlined, LineChartOutlined } from '@ant-design/icons';
import { getSmartAnalysis } from '../api/stockApi';
import type { SmartAnalysisResult } from '../types/stock';
import EnhancedAnalysis from '../components/cards/EnhancedAnalysis';
import ThemeToggle from '../components/theme/ThemeToggle';
import { useTheme } from '../contexts/ThemeContext';

import { initSkills } from '../skills';

import { registerAllWidgets } from '../widgets';

import ResearchBrowser from '../components/research/ResearchBrowser';
import ResearchViewer from '../components/research/ResearchViewer';

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
  const [appMode, setAppMode] = useState<'realtime' | 'research'>('research');
  const [selectedResearchDir, setSelectedResearchDir] = useState<string | null>(null);
  const [symbol, setSymbol] = useState<string>('600519');
  const [loading, setLoading] = useState<boolean>(false);
  const [smartResult, setSmartResult] = useState<SmartAnalysisResult | null>(null);

  const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });

  useEffect(() => {
    initSkills();
    registerAllWidgets();
  }, []);

  const handleSearch = async () => {
    if (!symbol.trim()) {
      message.warning('请输入股票代码或名称');
      return;
    }
    try {
      setLoading(true);
      const result = await getSmartAnalysis(symbol);
      setSmartResult(result);
      message.success('分析完成');
    } catch (error) {
      message.error('分析失败，请稍后重试');
      console.error('Analysis error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <Card style={styles.headerCard} styles={{ body: { padding: '24px 32px' } }}>
        <Row align="middle" justify="space-between" gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Title level={3} style={styles.headerTitle}>
                <SearchOutlined style={{ marginRight: 8 }} />
                智能股票分析系统
              </Title>
              <Text style={styles.headerSub}>基于AI的股票基本面与技术面分析工具</Text>
              <Text style={styles.headerDate}>{today}</Text>
            </Space>
          </Col>
          <Col xs={24} md={8}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Row gutter={8} justify="end">
                <Col>
                  <Segmented
                    options={[
                      { label: '实时分析', value: 'realtime', icon: <LineChartOutlined /> },
                      { label: '研究报告', value: 'research', icon: <FileTextOutlined /> },
                    ]}
                    value={appMode}
                    onChange={(value) => setAppMode(value as 'realtime' | 'research')}
                  />
                </Col>
                <Col>
                  <ThemeToggle />
                </Col>
              </Row>
            </Space>
          </Col>
          <Col xs={24} md={8}>
            <Space direction="vertical" style={{ width: '100%' }}>
              {appMode === 'realtime' && (
                <Row gutter={8} justify="end">
                  <Col flex={1}>
                    <Input
                      placeholder="输入股票代码或名称"
                      prefix={<SearchOutlined />}
                      value={symbol}
                      onChange={(e) => setSymbol(e.target.value)}
                      onPressEnter={handleSearch}
                      style={{ background: 'rgba(255,255,255,0.9)', borderRadius: 8 }}
                    />
                  </Col>
                  <Col>
                    <Button
                      type="primary"
                      onClick={handleSearch}
                      loading={loading}
                      style={{ borderRadius: 8 }}
                    >
                      <SearchOutlined />
                      分析
                    </Button>
                  </Col>
                </Row>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      <div style={styles.contentArea}>
        {appMode === 'realtime' ? (
          <>
            {smartResult?.smart_analysis ? (
              <EnhancedAnalysis smartAnalysis={smartResult.smart_analysis} />
            ) : (
              <div style={styles.emptyState}>
                <Alert
                  message="欢迎使用智能股票分析系统"
                  description="输入股票代码或名称，点击分析按钮开始分析"
                  type="info"
                  showIcon
                />
              </div>
            )}
          </>
        ) : (
          <>
            {!selectedResearchDir ? (
              <ResearchBrowser onSelect={setSelectedResearchDir} />
            ) : (
              <ResearchViewer directory={selectedResearchDir} onBack={() => setSelectedResearchDir(null)} />
            )}
          </>
        )}
      </div>

      <div style={styles.footer}>
        <Text type="secondary">
          © 2024 智能股票分析系统 | 免责声明：本系统仅供学习参考，不构成投资建议
        </Text>
      </div>
    </div>
  );
};

export default Dashboard;
