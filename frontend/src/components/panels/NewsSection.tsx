import React, { useState } from 'react';
import { Card, List, Tag, Typography, Collapse, Badge, Row, Col } from 'antd';
import dayjs from 'dayjs';

const { Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface NewsItem {
  title: string;
  content: string;
  publish_time: string;
  source: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

interface NewsSectionProps {
  news: NewsItem[];
}

const NewsSection: React.FC<NewsSectionProps> = ({ news }) => {
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

  if (!news || news.length === 0) {
    return (
      <Card title="📰 新闻舆情">
        <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
          暂无新闻数据
        </div>
      </Card>
    );
  }

  // 统计情感分布
  const positiveCount = news.filter(n => n.sentiment === 'positive').length;
  const negativeCount = news.filter(n => n.sentiment === 'negative').length;
  const neutralCount = news.filter(n => n.sentiment === 'neutral').length;

  // 获取情感标签
  const getSentimentTag = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <Tag color="success">利好</Tag>;
      case 'negative':
        return <Tag color="error">利空</Tag>;
      default:
        return <Tag color="default">中性</Tag>;
    }
  };

  // 格式化时间
  const formatTime = (timeStr: string) => {
    try {
      return dayjs(timeStr).format('YYYY-MM-DD HH:mm');
    } catch {
      return timeStr;
    }
  };

  return (
    <Card title="📰 新闻舆情监控" style={{ marginBottom: 24 }}>
      {/* 情感分布统计 */}
      <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Badge count={positiveCount} overflowCount={999} showZero>
              <Text>🟢 利好消息</Text>
            </Badge>
          </Col>
          <Col span={8}>
            <Badge count={negativeCount} overflowCount={999} showZero>
              <Text>🔴 利空消息</Text>
            </Badge>
          </Col>
          <Col span={8}>
            <Badge count={neutralCount} overflowCount={999} showZero>
              <Text>⚪ 中性消息</Text>
            </Badge>
          </Col>
        </Row>
      </div>

      {/* 新闻列表 */}
      <List
        itemLayout="vertical"
        dataSource={news}
        renderItem={(item, index) => (
          <List.Item key={`news_${index}`}>
            <List.Item.Meta
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {getSentimentTag(item.sentiment)}
                  <Text strong>{item.title}</Text>
                </div>
              }
              description={
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {item.source} · {formatTime(item.publish_time)}
                  </Text>
                </div>
              }
            />
            <Collapse
              activeKey={expandedKeys.includes(`news_${index}`) ? [`news_${index}`] : []}
              onChange={(keys) => {
                setExpandedKeys(keys as string[]);
              }}
              style={{ marginTop: 12 }}
              bordered={false}
            >
              <Panel header="查看详情" key={`news_${index}`}>
                <Paragraph>{item.content}</Paragraph>
              </Panel>
            </Collapse>
          </List.Item>
        )}
      />

      {/* 风险提示 */}
      <div style={{ marginTop: 16, padding: 12, backgroundColor: '#fff7e6', borderRadius: 4, border: '1px solid #ffd591' }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          ⚠️ 注意：新闻情感分析基于关键词匹配，仅供参考。投资决策需结合多方面信息综合判断。
        </Text>
      </div>
    </Card>
  );
};

export default NewsSection;
