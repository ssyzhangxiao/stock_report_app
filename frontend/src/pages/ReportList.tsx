import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Button,
  List,
  Tag,
  Space,
  Spin,
  Modal,
  message,
  Row,
  Col,
  Typography,
  Empty,
  Divider,
} from 'antd';
import {
  FileTextOutlined,
  EyeOutlined,
  DownloadOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { useTheme } from '../contexts/ThemeContext';
import {
  getReportList,
  renderReport,
  getReportPreview,
  getReportDownloadUrl,
  type ReportInfo,
} from '../api/stockApi';

const { Title, Text } = Typography;

interface ReportListProps {
  onBack?: () => void;
}

const ReportList: React.FC<ReportListProps> = ({ onBack }) => {
  const { theme } = useTheme();
  const [reports, setReports] = useState<ReportInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [rendering, setRendering] = useState<string | null>(null);
  const [previewModalVisible, setPreviewModalVisible] = useState<boolean>(false);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [selectedReport, setSelectedReport] = useState<ReportInfo | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [echartsLoaded, setEchartsLoaded] = useState(false);

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await getReportList();
      setReports(data);
    } catch (error) {
      console.error('加载报告列表失败:', error);
      message.error('加载报告列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    if (previewModalVisible && !(window as any).echarts && !echartsLoaded) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js';
      script.onload = () => {
        setEchartsLoaded(true);
        setTimeout(renderCharts, 200);
      };
      document.head.appendChild(script);
    } else if (previewModalVisible && (window as any).echarts) {
      setEchartsLoaded(true);
      setTimeout(renderCharts, 200);
    }
  }, [previewModalVisible]);

  const renderCharts = () => {
    if (!previewRef.current || !(window as any).echarts) return;

    const chartContainers = previewRef.current.querySelectorAll('.chart-container[data-chart-spec]');
    chartContainers.forEach((container: any) => {
      const existingChart = (window as any).echarts.getInstanceByDom(container);
      if (existingChart) {
        existingChart.dispose();
      }

      const chartSpec = container.getAttribute('data-chart-spec');
      if (chartSpec) {
        try {
          const option = JSON.parse(chartSpec);
          const myChart = (window as any).echarts.init(container, null, { renderer: 'svg' });
          myChart.setOption(option);

          const resizeObserver = new ResizeObserver(() => {
            myChart.resize();
          });
          resizeObserver.observe(container);
        } catch (e) {
          console.error('图表渲染失败:', e);
        }
      }
    });
  };

  useEffect(() => {
    if (previewModalVisible && echartsLoaded && previewRef.current && previewHtml) {
      setTimeout(renderCharts, 300);
    }
  }, [previewHtml, previewModalVisible, echartsLoaded]);

  const handlePreview = async (report: ReportInfo) => {
    try {
      setSelectedReport(report);
      const result = await getReportPreview(report.code);
      setPreviewHtml(result.html);
      setPreviewModalVisible(true);
    } catch (error) {
      console.error('预览报告失败:', error);
      message.error('预览报告失败');
    }
  };

  const handleRender = async (report: ReportInfo, force: boolean = false) => {
    try {
      setRendering(report.code);
      await renderReport(report.code, { force, output_format: 'both' });
      message.success(force ? '报告重新生成成功' : '报告生成成功');
    } catch (error) {
      console.error('生成报告失败:', error);
      message.error('生成报告失败');
    } finally {
      setRendering(null);
    }
  };

  const handleDownload = (report: ReportInfo, format: 'pdf' | 'html' = 'pdf') => {
    const url = getReportDownloadUrl(report.code, format);
    window.open(url, '_blank');
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const formatDate = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const isDark = theme === 'dark';

  return (
    <div style={{ padding: '24px', minHeight: '100vh' }}>
      <Card
        style={{
          marginBottom: '24px',
          background: isDark ? '#161b27' : '#fff',
          border: isDark ? '1px solid #2a3347' : '1px solid #f0f0f0',
        }}
        styles={{ body: { padding: '20px' } }}
      >
        <Row align="middle" justify="space-between">
          <Col>
            <Space>
              {onBack && (
                <Button icon={<ArrowLeftOutlined />} onClick={onBack} ghost>
                  返回
                </Button>
              )}
              <Title level={3} style={{ margin: 0 }}>
                <FileTextOutlined style={{ marginRight: 8 }} />
                研究报告
              </Title>
            </Space>
            <Text type="secondary">已保存的分析报告列表</Text>
          </Col>
          <Col>
            <Button icon={<ReloadOutlined />} onClick={loadReports} loading={loading}>
              刷新列表
            </Button>
          </Col>
        </Row>
      </Card>

      <Card>
        <Spin spinning={loading}>
          {reports.length === 0 ? (
            <Empty description="暂无报告" image={Empty.PRESENTED_IMAGE_SIMPLE}>
              <Button type="primary" onClick={loadReports} icon={<ReloadOutlined />}>
                刷新
              </Button>
            </Empty>
          ) : (
            <List
              dataSource={reports}
              renderItem={(report) => (
                <List.Item
                  style={{
                    borderBottom: isDark ? '1px solid #2a3347' : '1px solid #f0f0f0',
                    padding: '16px 0',
                  }}
                >
                  <List.Item.Meta
                    avatar={<FileTextOutlined style={{ fontSize: 32, color: '#1890ff' }} />}
                    title={
                      <Space>
                        <Text strong>{report.stock_name}</Text>
                        <Tag color="blue">{report.stock_code}</Tag>
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size="small" style={{ marginTop: 4 }}>
                        <Text type="secondary">代码: {report.code}</Text>
                        <Space>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            修改时间: {formatDate(report.modified_time)}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            文件大小: {formatFileSize(report.size)}
                          </Text>
                        </Space>
                      </Space>
                    }
                  />
                  <Space>
                    <Button icon={<EyeOutlined />} onClick={() => handlePreview(report)}>
                      预览
                    </Button>
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={() => handleRender(report, true)}
                      loading={rendering === report.code}
                    >
                      重新生成
                    </Button>
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={() => handleDownload(report, 'html')}
                    >
                      下载HTML
                    </Button>
                    <Button
                      type="primary"
                      icon={<DownloadOutlined />}
                      onClick={() => handleDownload(report, 'pdf')}
                    >
                      下载PDF
                    </Button>
                  </Space>
                </List.Item>
              )}
            />
          )}
        </Spin>
      </Card>

      <Modal
        title={selectedReport ? `${selectedReport.stock_name} - 报告预览` : '报告预览'}
        open={previewModalVisible}
        onCancel={() => setPreviewModalVisible(false)}
        width="90%"
        style={{ top: 20 }}
        footer={
          <Space>
            {selectedReport && (
              <>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={() => handleDownload(selectedReport, 'html')}
                >
                  下载HTML
                </Button>
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={() => handleDownload(selectedReport, 'pdf')}
                >
                  下载PDF
                </Button>
              </>
            )}
            <Button onClick={() => setPreviewModalVisible(false)}>关闭</Button>
          </Space>
        }
      >
        <Divider />
        <div
          ref={previewRef}
          dangerouslySetInnerHTML={{ __html: previewHtml }}
          style={{
            maxHeight: '70vh',
            overflow: 'auto',
            padding: '0',
          }}
        />
      </Modal>
    </div>
  );
};

export default ReportList;
