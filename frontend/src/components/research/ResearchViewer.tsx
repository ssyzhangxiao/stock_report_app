import React, { useState, useEffect } from 'react';
import { Tabs, Spin, Typography, Button, message, Breadcrumb } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { getResearchReport } from '../../api/researchApi';
import type { ResearchReport, ResearchSectionKey, SectionData } from '../../types/research';
import { RESEARCH_TABS } from '../../types/research';
import ExecutiveSummaryCard from './ExecutiveSummaryCard';
import SectionRenderer from './SectionRenderer';
import FinancialDataPanel from './FinancialDataPanel';
import RiskMatrix from './RiskMatrix';
import ValuationDashboard from './ValuationDashboard';

const { Text } = Typography;

interface Props {
  directory: string;
  onBack: () => void;
}

const ResearchViewer: React.FC<Props> = ({ directory, onBack }) => {
  const [report, setReport] = useState<ResearchReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('executive_summary');

  useEffect(() => {
    loadReport();
  }, [directory]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const data = await getResearchReport(directory);
      setReport(data);
    } catch (e: any) {
      message.error(e.message || '加载研究报告失败');
    } finally {
      setLoading(false);
    }
  };

  const renderTabContent = (key: string) => {
    if (!report) return null;

    switch (key as ResearchSectionKey) {
      case 'executive_summary':
        return (
          <ExecutiveSummaryCard
            section={report.executive_summary}
            stockCode={report.meta.stock_code}
            stockName={report.meta.stock_name}
          />
        );

      case 'financial_data':
        return <FinancialDataPanel financialData={report.financial_data} />;

      case 'risk_monitoring':
        return <RiskMatrix section={report.risk_monitoring} />;

      case 'valuation_moat':
        return (
          <ValuationDashboard
            valuationMoat={report.valuation_moat}
            valuationHistory={report.valuation_history}
          />
        );

      default: {
        const section = report[key as keyof ResearchReport];
        if (section && typeof section === 'object' && 'content' in section) {
          return <SectionRenderer section={section as SectionData} />;
        }
        return <Text type="secondary">该章节暂无数据</Text>;
      }
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" tip="加载研究报告中...">
          <div style={{ minHeight: 200 }} />
        </Spin>
      </div>
    );
  }

  if (!report) {
    return <Text type="secondary">加载失败</Text>;
  }

  const tabItems = RESEARCH_TABS.map((tab) => ({
    key: tab.key,
    label: (
      <span>
        {tab.icon} {tab.label}
      </span>
    ),
    children: renderTabContent(tab.key),
  }));

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Breadcrumb
          items={[
            { title: <a onClick={onBack}>研究报告</a> },
            {
              title: (
                <span>
                  {report.meta.stock_name || report.meta.stock_code}
                  <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                    {report.meta.stock_code}
                  </Text>
                </span>
              ),
            },
          ]}
        />
        <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
          返回列表
        </Button>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        type="card"
        style={{ marginBottom: 16 }}
      />
    </div>
  );
};

export default ResearchViewer;
