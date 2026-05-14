import React, { useState, useEffect } from 'react';
import { Input, Card, Row, Col, Tag, Spin, Empty, Typography, Space } from 'antd';
import { SearchOutlined, FileTextOutlined } from '@ant-design/icons';
import { getResearchReports, searchResearchReports } from '../../api/researchApi';
import type { ResearchReportMeta } from '../../types/research';

const { Text, Title } = Typography;

interface Props {
  onSelect: (directory: string) => void;
}

const signalColorMap: Record<string, string> = {
  '买入': 'green',
  '增持': 'lime',
  '持有': 'gold',
  '减持': 'orange',
  '卖出': 'red',
  'HOLD': 'gold',
  'BUY': 'green',
  'SELL': 'red',
};

const ResearchBrowser: React.FC<Props> = ({ onSelect }) => {
  const [reports, setReports] = useState<ResearchReportMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
  setLoading(true);
  try {
    const res = await getResearchReports();
    setReports(res.reports);
  } catch (err) {
    console.error('获取研究报告失败:', err);
    setReports([]);
  } finally {
    setLoading(false);
  }
};

const handleSearch = async (value: string) => {
  if (!value.trim()) {
    fetchReports();
    return;
  }
  setLoading(true);
  try {
    const res = await searchResearchReports(value.trim());
    setReports(res.reports);
  } catch (err) {
    console.error('搜索研究报告失败:', err);
    setReports([]);
  } finally {
    setLoading(false);
  }
};

  const getSignalColor = (rating: string) => {
    for (const [key, color] of Object.entries(signalColorMap)) {
      if (rating.includes(key)) return color;
    }
    return 'default';
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Input.Search
          placeholder="搜索股票代码、名称..."
          allowClear
          enterButton={<><SearchOutlined /> 搜索</>}
          size="large"
          onSearch={handleSearch}
          style={{ maxWidth: 500 }}
        />
        <Text type="secondary" style={{ marginLeft: 12 }}>
          共 {reports.length} 份研究报告
        </Text>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Spin size="large" tip="加载研究报告列表...">
            <div style={{ minHeight: 200 }} />
          </Spin>
        </div>
      ) : reports.length === 0 ? (
        <Empty description="未找到研究报告" />
      ) : (
        <Row gutter={[16, 16]}>
          {reports.map((report) => (
            <Col xs={24} sm={12} md={8} lg={6} key={report.directory}>
              <Card
                hoverable
                onClick={() => onSelect(report.directory)}
                style={{ borderRadius: 10, height: '100%' }}
                styles={{ body: { padding: 16 } }}
              >
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong style={{ fontSize: 15 }}>{report.stock_code}</Text>
                    {report.signal_rating && (
                      <Tag color={getSignalColor(report.signal_rating)} style={{ margin: 0 }}>
                        {report.signal_rating}
                      </Tag>
                    )}
                  </div>
                  <Title level={5} style={{ margin: 0, fontSize: 14 }}>
                    {report.stock_name || report.stock_name_en || report.directory}
                  </Title>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {report.current_pe && (
                      <Tag icon={<FileTextOutlined />} color="blue">PE {report.current_pe}x</Tag>
                    )}
                    {report.moat_score && (
                      <Tag color="purple">护城河 {report.moat_score}</Tag>
                    )}
                  </div>
                  {report.report_date && (
                    <Text type="secondary" style={{ fontSize: 12 }}>{report.report_date}</Text>
                  )}
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
};

export default ResearchBrowser;
