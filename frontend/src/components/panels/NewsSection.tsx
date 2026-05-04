import React, { useState } from 'react';
import { Card, List, Tag, Typography, Collapse, Badge, Row, Col, Tooltip, Space } from 'antd';
import dayjs from 'dayjs';

const { Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface NewsItem {
  title: string;
  content: string;
  publish_time: string;
  source: string;
  source_type?: 'api' | 'web_search' | 'web_fetch';
  url?: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

interface SourcesSummary {
  total: number;
  by_type: {
    api: number;
    web_search: number;
    web_fetch: number;
  };
  by_domain: Record<string, number>;
  sentiment_distribution: {
    positive: number;
    negative: number;
    neutral: number;
  };
}

interface NewsSectionProps {
  news: NewsItem[];
  sourcesSummary?: SourcesSummary;
}

const getSourceTypeTag = (sourceType?: string) => {
  switch (sourceType) {
    case 'web_search':
      return <Tag color="blue" style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>搜索</Tag>;
    case 'web_fetch':
      return <Tag color="purple" style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>抓取</Tag>;
    default:
      return <Tag color="default" style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>API</Tag>;
  }
};

const getSourceTypeLabel = (sourceType?: string) => {
  switch (sourceType) {
    case 'web_search': return '网页搜索';
    case 'web_fetch': return '网页抓取';
    default: return '数据API';
  }
};

const NewsSection: React.FC<NewsSectionProps> = ({ news, sourcesSummary }) => {
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [selectedSentiment, setSelectedSentiment] = useState<'all' | 'positive' | 'negative' | 'neutral'>('all');
  const [selectedSourceType, setSelectedSourceType] = useState<'all' | 'api' | 'web_search' | 'web_fetch'>('all');

  if (!news || news.length === 0) {
    return (
      <Card title="📰 新闻舆情" styles={{ body: { padding: 12 } }}>
        <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>
          暂无新闻数据
        </div>
      </Card>
    );
  }

  const positiveCount = news.filter(n => n.sentiment === 'positive').length;
  const negativeCount = news.filter(n => n.sentiment === 'negative').length;
  const neutralCount = news.filter(n => n.sentiment === 'neutral').length;

  const apiCount = news.filter(n => !n.source_type || n.source_type === 'api').length;
  const searchCount = news.filter(n => n.source_type === 'web_search').length;
  const fetchCount = news.filter(n => n.source_type === 'web_fetch').length;

  let filteredNews = news;
  if (selectedSentiment !== 'all') {
    filteredNews = filteredNews.filter(n => n.sentiment === selectedSentiment);
  }
  if (selectedSourceType !== 'all') {
    filteredNews = filteredNews.filter(n => {
      if (selectedSourceType === 'api') return !n.source_type || n.source_type === 'api';
      return n.source_type === selectedSourceType;
    });
  }

  const getSentimentTag = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <Tag color="success" style={{ fontSize: 11 }}>利好</Tag>;
      case 'negative':
        return <Tag color="error" style={{ fontSize: 11 }}>利空</Tag>;
      default:
        return <Tag color="default" style={{ fontSize: 11 }}>中性</Tag>;
    }
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    try {
      return dayjs(timeStr).format('YYYY-MM-DD HH:mm');
    } catch {
      return timeStr;
    }
  };

  return (
    <Card title="📰 新闻舆情监控" style={{ marginBottom: 0 }} styles={{ body: { padding: 12 } }}>
      <div style={{ marginBottom: 8, padding: 10, backgroundColor: 'var(--bg-elevated)', borderRadius: 4 }}>
        <div style={{ marginBottom: 8 }}>
          <Text style={{ fontSize: 11, color: 'var(--text-secondary)', marginRight: 8 }}>情感筛选:</Text>
          <Row gutter={8}>
            <Col span={6}>
              <div
                style={{
                  cursor: 'pointer', padding: '4px 8px', borderRadius: 4, textAlign: 'center',
                  backgroundColor: selectedSentiment === 'all' ? 'rgba(0,0,0,0.1)' : 'transparent',
                  transition: 'background-color 0.2s',
                }}
                onClick={() => setSelectedSentiment('all')}
              >
                <Text style={{ fontSize: 12, fontWeight: selectedSentiment === 'all' ? 600 : 400 }}>
                  📋 全部
                </Text>
              </div>
            </Col>
            <Col span={6}>
              <div
                style={{
                  cursor: 'pointer', padding: '4px 8px', borderRadius: 4, textAlign: 'center',
                  backgroundColor: selectedSentiment === 'positive' ? 'rgba(82,196,26,0.15)' : 'transparent',
                  transition: 'background-color 0.2s',
                }}
                onClick={() => setSelectedSentiment('positive')}
              >
                <Badge count={positiveCount} overflowCount={999} showZero>
                  <Text style={{ fontSize: 12, fontWeight: selectedSentiment === 'positive' ? 600 : 400 }}>
                    🟢 利好
                  </Text>
                </Badge>
              </div>
            </Col>
            <Col span={6}>
              <div
                style={{
                  cursor: 'pointer', padding: '4px 8px', borderRadius: 4, textAlign: 'center',
                  backgroundColor: selectedSentiment === 'negative' ? 'rgba(255,77,79,0.15)' : 'transparent',
                  transition: 'background-color 0.2s',
                }}
                onClick={() => setSelectedSentiment('negative')}
              >
                <Badge count={negativeCount} overflowCount={999} showZero>
                  <Text style={{ fontSize: 12, fontWeight: selectedSentiment === 'negative' ? 600 : 400 }}>
                    🔴 利空
                  </Text>
                </Badge>
              </div>
            </Col>
            <Col span={6}>
              <div
                style={{
                  cursor: 'pointer', padding: '4px 8px', borderRadius: 4, textAlign: 'center',
                  backgroundColor: selectedSentiment === 'neutral' ? 'rgba(107,119,140,0.15)' : 'transparent',
                  transition: 'background-color 0.2s',
                }}
                onClick={() => setSelectedSentiment('neutral')}
              >
                <Badge count={neutralCount} overflowCount={999} showZero>
                  <Text style={{ fontSize: 12, fontWeight: selectedSentiment === 'neutral' ? 600 : 400 }}>
                    ⚪ 中性
                  </Text>
                </Badge>
              </div>
            </Col>
          </Row>
        </div>

        <div>
          <Text style={{ fontSize: 11, color: 'var(--text-secondary)', marginRight: 8 }}>来源筛选:</Text>
          <Space size={4}>
            {[
              { key: 'all' as const, label: '全部', count: news.length },
              { key: 'api' as const, label: 'API', count: apiCount },
              { key: 'web_search' as const, label: '搜索', count: searchCount },
              { key: 'web_fetch' as const, label: '抓取', count: fetchCount },
            ].map(item => (
              <div
                key={item.key}
                style={{
                  cursor: 'pointer', padding: '2px 8px', borderRadius: 4,
                  backgroundColor: selectedSourceType === item.key ? 'rgba(0,0,0,0.1)' : 'transparent',
                  transition: 'background-color 0.2s',
                }}
                onClick={() => setSelectedSourceType(item.key)}
              >
                <Text style={{ fontSize: 11, fontWeight: selectedSourceType === item.key ? 600 : 400 }}>
                  {item.label}({item.count})
                </Text>
              </div>
            ))}
          </Space>
        </div>
      </div>

      {sourcesSummary && (
        <div style={{ marginBottom: 8, padding: '6px 10', backgroundColor: 'var(--bg-elevated)', borderRadius: 4 }}>
          <Tooltip title={`API: ${sourcesSummary.by_type.api} | 搜索: ${sourcesSummary.by_type.web_search} | 抓取: ${sourcesSummary.by_type.web_fetch}`}>
            <Text style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              📊 共 {sourcesSummary.total} 条 | 来源: {Object.entries(sourcesSummary.by_domain).map(([d, c]) => `${d}(${c})`).join(', ')}
            </Text>
          </Tooltip>
        </div>
      )}

      <div style={{ maxHeight: 320, overflow: 'auto' }}>
        {filteredNews.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>
            暂无该类型新闻
          </div>
        ) : (
          <List
            itemLayout="vertical"
            dataSource={filteredNews}
            size="small"
            renderItem={(item, index) => (
              <List.Item key={`news_${index}`} style={{ padding: '8px 0' }}>
                <List.Item.Meta
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {getSentimentTag(item.sentiment)}
                      {getSourceTypeTag(item.source_type)}
                      <Text strong style={{ fontSize: 12 }}>{item.title}</Text>
                    </div>
                  }
                  description={
                    <div style={{ marginTop: 4 }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {item.source} · {formatTime(item.publish_time)} · {getSourceTypeLabel(item.source_type)}
                      </Text>
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: 11, marginLeft: 8 }}
                        >
                          查看原文 ↗
                        </a>
                      )}
                    </div>
                  }
                />
                <Collapse
                  activeKey={expandedKeys.includes(`news_${index}`) ? [`news_${index}`] : []}
                  onChange={(keys) => {
                    setExpandedKeys(keys as string[]);
                  }}
                  style={{ marginTop: 8 }}
                  bordered={false}
                  size="small"
                >
                  <Panel header="查看详情" key={`news_${index}`}>
                    <Paragraph style={{ fontSize: 12, margin: 0 }}>{item.content}</Paragraph>
                  </Panel>
                </Collapse>
              </List.Item>
            )}
          />
        )}
      </div>

      <div style={{ marginTop: 12, padding: 10, backgroundColor: 'rgba(245,166,35,0.10)', borderRadius: 4, border: '1px solid rgba(245,166,35,0.25)' }}>
        <Text style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
          ⚠️ 注意：新闻情感分析基于关键词匹配，仅供参考。投资决策需结合多方面信息综合判断。
        </Text>
      </div>
    </Card>
  );
};

export default NewsSection;
