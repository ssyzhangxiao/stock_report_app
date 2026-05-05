import React, { useState, useEffect } from 'react';
import { Card, Tabs, Table, Tag, Descriptions, Empty, Spin, Typography, Space, Statistic, Row, Col } from 'antd';
import {
  RiseOutlined, FileTextOutlined, ThunderboltOutlined,
  BankOutlined, NotificationOutlined, DatabaseOutlined, CheckCircleOutlined,
  WarningOutlined, CloseCircleOutlined,
} from '@ant-design/icons';
import { getUnifiedAll, type UnifiedAllResult, type UnifiedDataResult } from '../../api/stockApi';

const { Text } = Typography;

interface Props {
  symbol: string;
}

const statusIcon = (status: string) => {
  switch (status) {
    case 'ok': return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    case 'degraded': return <WarningOutlined style={{ color: '#faad14' }} />;
    default: return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
  }
};

const statusTag = (status: string) => {
  const map: Record<string, { color: string; text: string }> = {
    ok: { color: 'green', text: '正常' },
    degraded: { color: 'orange', text: '降级' },
    unavailable: { color: 'red', text: '不可用' },
  };
  const info = map[status] || { color: 'default', text: status };
  return <Tag color={info.color}>{info.text}</Tag>;
};

const UnifiedDataPanel: React.FC<Props> = ({ symbol }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<UnifiedAllResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol) return;
    setLoading(true);
    setError(null);
    getUnifiedAll(symbol)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [symbol]);

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin tip="正在获取五层数据..." />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <Empty description={`数据获取失败: ${error}`} />
      </Card>
    );
  }

  if (!data) return null;

  const renderMarketTab = (d: UnifiedDataResult) => {
    const quote = d.data?.quote;
    const valuation = d.data?.valuation;
    const kline = d.data?.kline;

    return (
      <div>
        <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="数据源">{d.source}</Descriptions.Item>
          <Descriptions.Item label="状态">{statusTag(d.status)}</Descriptions.Item>
        </Descriptions>

        {quote && (
          <Card title="📈 实时行情 (mootdx TCP)" size="small" style={{ marginBottom: 12 }}>
            <Row gutter={16}>
              <Col span={6}><Statistic title="最新价" value={quote.price} prefix="¥" precision={2} /></Col>
              <Col span={6}><Statistic title="开盘" value={quote.open} prefix="¥" precision={2} /></Col>
              <Col span={6}><Statistic title="最高" value={quote.high} prefix="¥" precision={2} /></Col>
              <Col span={6}><Statistic title="最低" value={quote.low} prefix="¥" precision={2} /></Col>
              <Col span={6}><Statistic title="成交量" value={quote.volume} suffix="手" /></Col>
              <Col span={6}><Statistic title="成交额" value={(quote.amount / 1e8).toFixed(2)} suffix="亿" /></Col>
              <Col span={6}><Statistic title="买一" value={quote.bid1} prefix="¥" precision={2} /></Col>
              <Col span={6}><Statistic title="卖一" value={quote.ask1} prefix="¥" precision={2} /></Col>
            </Row>
          </Card>
        )}

        {valuation && (
          <Card title="📊 估值指标 (腾讯财经)" size="small" style={{ marginBottom: 12 }}>
            <Row gutter={16}>
              <Col span={6}><Statistic title="市盈率(PE)" value={valuation.pe_ratio} precision={2} /></Col>
              <Col span={6}><Statistic title="市净率(PB)" value={valuation.pb_ratio} precision={2} /></Col>
              <Col span={6}><Statistic title="总市值" value={(valuation.market_cap / 1e8).toFixed(0)} suffix="亿" /></Col>
              <Col span={6}><Statistic title="流通市值" value={(valuation.circulating_market_cap / 1e8).toFixed(0)} suffix="亿" /></Col>
              <Col span={6}><Statistic title="量比" value={valuation.volume_ratio} precision={2} /></Col>
              <Col span={6}><Statistic title="换手率" value={valuation.turnover_rate} suffix="%" precision={2} /></Col>
            </Row>
          </Card>
        )}

        {kline && kline.length > 0 && (
          <Card title="📉 K线数据" size="small">
            <Table
              dataSource={kline.slice(-10)}
              rowKey="date"
              size="small"
              pagination={false}
              columns={[
                { title: '日期', dataIndex: 'date', key: 'date', width: 100 },
                { title: '开盘', dataIndex: 'open', key: 'open', render: (v: number) => v?.toFixed(2) },
                { title: '收盘', dataIndex: 'close', key: 'close', render: (v: number) => v?.toFixed(2) },
                { title: '最高', dataIndex: 'high', key: 'high', render: (v: number) => v?.toFixed(2) },
                { title: '最低', dataIndex: 'low', key: 'low', render: (v: number) => v?.toFixed(2) },
                { title: '成交量', dataIndex: 'volume', key: 'volume' },
              ]}
            />
          </Card>
        )}
      </div>
    );
  };

  const renderResearchTab = (d: UnifiedDataResult) => {
    const reports = d.data?.reports || [];
    const consensus = d.data?.consensus;

    return (
      <div>
        <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="数据源">{d.source}</Descriptions.Item>
          <Descriptions.Item label="状态">{statusTag(d.status)}</Descriptions.Item>
        </Descriptions>

        {consensus && (
          <Card title="🎯 机构一致预期" size="small" style={{ marginBottom: 12 }}>
            <Row gutter={16}>
              <Col span={8}><Statistic title="预测年度" value={consensus.year} /></Col>
              <Col span={8}><Statistic title="预测EPS" value={consensus.avg_eps} precision={4} /></Col>
              <Col span={8}><Statistic title="预测机构数" value={consensus.org_count} suffix="家" /></Col>
            </Row>
          </Card>
        )}

        <Card title={`📝 研报列表 (${reports.length}篇)`} size="small">
          <Table
            dataSource={reports}
            rowKey="title"
            size="small"
            pagination={{ pageSize: 10 }}
            columns={[
              { title: '标题', dataIndex: 'title', key: 'title', ellipsis: true },
              { title: '机构', dataIndex: 'org', key: 'org', width: 120 },
              { title: '日期', dataIndex: 'date', key: 'date', width: 100 },
              {
                title: '评级', dataIndex: 'rating', key: 'rating', width: 80,
                render: (v: string) => <Tag color="blue">{v}</Tag>,
              },
            ]}
          />
        </Card>
      </div>
    );
  };

  const renderNewsTab = (d: UnifiedDataResult) => {
    const stockNews = d.data?.stock_news || [];
    const clsNews = d.data?.cls_telegraph || [];

    return (
      <div>
        <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="数据源">{d.source}</Descriptions.Item>
          <Descriptions.Item label="状态">{statusTag(d.status)}</Descriptions.Item>
          <Descriptions.Item label="个股新闻">{stockNews.length}条</Descriptions.Item>
          <Descriptions.Item label="财联社快讯">{clsNews.length}条</Descriptions.Item>
        </Descriptions>

        {stockNews.length > 0 && (
          <Card title="📰 个股新闻" size="small" style={{ marginBottom: 12 }}>
            {stockNews.slice(0, 10).map((n: any, i: number) => (
              <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <Text strong>{n.title}</Text>
                <div><Text type="secondary">{n.time} · {n.source}</Text></div>
              </div>
            ))}
          </Card>
        )}

        {clsNews.length > 0 && (
          <Card title="⚡ 财联社快讯 (分钟级)" size="small">
            {clsNews.slice(0, 10).map((n: any, i: number) => (
              <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <Text strong>{n.title}</Text>
                <div><Text type="secondary">{n.time}</Text></div>
              </div>
            ))}
          </Card>
        )}
      </div>
    );
  };

  const renderFinancialsTab = (d: UnifiedDataResult) => {
    const finance = d.data?.finance;
    const companyInfo = d.data?.company_info;
    const shareholders = d.data?.shareholders || [];
    const akFin = d.data?.akshare_financials;

    return (
      <div>
        <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="数据源">{d.source}</Descriptions.Item>
          <Descriptions.Item label="状态">{statusTag(d.status)}</Descriptions.Item>
        </Descriptions>

        {companyInfo && (
          <Card title="🏢 公司概况 (mootdx F10)" size="small" style={{ marginBottom: 12 }}>
            <Descriptions size="small" column={2}>
              <Descriptions.Item label="名称">{companyInfo.name}</Descriptions.Item>
              <Descriptions.Item label="行业">{companyInfo.industry}</Descriptions.Item>
              <Descriptions.Item label="上市日期">{companyInfo.listing_date}</Descriptions.Item>
              <Descriptions.Item label="主营业务" span={2}>{companyInfo.main_business}</Descriptions.Item>
            </Descriptions>
          </Card>
        )}

        {finance && (
          <Card title="📋 季报数据 (mootdx F10 37字段)" size="small" style={{ marginBottom: 12 }}>
            <Row gutter={16}>
              <Col span={6}><Statistic title="报告期" value={finance.date} /></Col>
              <Col span={6}><Statistic title="每股收益" value={finance.eps} precision={4} /></Col>
              <Col span={6}><Statistic title="每股净资产" value={finance.bps} precision={2} /></Col>
              <Col span={6}><Statistic title="ROE" value={finance.roe} suffix="%" precision={2} /></Col>
              <Col span={6}><Statistic title="总股本" value={(finance.total_shares / 1e8).toFixed(2)} suffix="亿" /></Col>
              <Col span={6}><Statistic title="流通股" value={(finance.circulating_shares / 1e8).toFixed(2)} suffix="亿" /></Col>
            </Row>
          </Card>
        )}

        {akFin && (
          <Card title="📊 财务摘要 (akshare辅助)" size="small" style={{ marginBottom: 12 }}>
            <Row gutter={16}>
              <Col span={6}><Statistic title="报告期" value={akFin.date} /></Col>
              <Col span={6}><Statistic title="营业总收入" value={(akFin.revenue / 1e8).toFixed(2)} suffix="亿" /></Col>
              <Col span={6}><Statistic title="净利润" value={(akFin.net_profit / 1e8).toFixed(2)} suffix="亿" /></Col>
              <Col span={6}><Statistic title="总资产" value={(akFin.total_assets / 1e8).toFixed(2)} suffix="亿" /></Col>
            </Row>
          </Card>
        )}

        {shareholders.length > 0 && (
          <Card title="👥 股东研究 (mootdx F10)" size="small">
            <Table
              dataSource={shareholders}
              rowKey="name"
              size="small"
              pagination={false}
              columns={[
                { title: '股东名称', dataIndex: 'name', key: 'name' },
                { title: '持股数', dataIndex: 'shares', key: 'shares', render: (v: number) => v?.toLocaleString() },
                { title: '占比', dataIndex: 'ratio', key: 'ratio', render: (v: number) => `${v?.toFixed(2)}%` },
              ]}
            />
          </Card>
        )}
      </div>
    );
  };

  const renderAnnouncementsTab = (d: UnifiedDataResult) => {
    const announcements = d.data?.announcements || [];
    const notices = d.data?.notices || [];

    return (
      <div>
        <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="数据源">{d.source}</Descriptions.Item>
          <Descriptions.Item label="状态">{statusTag(d.status)}</Descriptions.Item>
          <Descriptions.Item label="巨潮公告">{announcements.length}条</Descriptions.Item>
          <Descriptions.Item label="akshare公告">{notices.length}条</Descriptions.Item>
        </Descriptions>

        {announcements.length > 0 && (
          <Card title="📢 巨潮资讯公告" size="small" style={{ marginBottom: 12 }}>
            <Table
              dataSource={announcements}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 10 }}
              columns={[
                { title: '标题', dataIndex: 'title', key: 'title', ellipsis: true },
                { title: '日期', dataIndex: 'date', key: 'date', width: 100 },
                {
                  title: '链接', dataIndex: 'url', key: 'url', width: 60,
                  render: (v: string) => v ? <a href={v} target="_blank" rel="noreferrer">查看</a> : '-',
                },
              ]}
            />
          </Card>
        )}

        {notices.length > 0 && (
          <Card title="📋 akshare公告" size="small">
            <Table
              dataSource={notices}
              rowKey="title"
              size="small"
              pagination={{ pageSize: 10 }}
              columns={[
                { title: '标题', dataIndex: 'title', key: 'title', ellipsis: true },
                { title: '日期', dataIndex: 'date', key: 'date', width: 100 },
              ]}
            />
          </Card>
        )}
      </div>
    );
  };

  const tabItems = [
    {
      key: 'market',
      label: <span><RiseOutlined /> 行情层</span>,
      children: renderMarketTab(data.market),
    },
    {
      key: 'research',
      label: <span><FileTextOutlined /> 研报层</span>,
      children: renderResearchTab(data.research),
    },
    {
      key: 'news',
      label: <span><ThunderboltOutlined /> 新闻层</span>,
      children: renderNewsTab(data.news),
    },
    {
      key: 'financials',
      label: <span><BankOutlined /> 基础数据</span>,
      children: renderFinancialsTab(data.financials),
    },
    {
      key: 'announcements',
      label: <span><NotificationOutlined /> 公告层</span>,
      children: renderAnnouncementsTab(data.announcements),
    },
  ];

  return (
    <Card
      title={
        <Space>
          <DatabaseOutlined />
          <span>统一数据获取 · 五层架构</span>
        </Space>
      }
      extra={
        <Space>
          {statusIcon(data.market.status)} 行情
          {statusIcon(data.research.status)} 研报
          {statusIcon(data.news.status)} 新闻
          {statusIcon(data.financials.status)} 基础
          {statusIcon(data.announcements.status)} 公告
        </Space>
      }
    >
      <Tabs items={tabItems} />
    </Card>
  );
};

export default UnifiedDataPanel;
