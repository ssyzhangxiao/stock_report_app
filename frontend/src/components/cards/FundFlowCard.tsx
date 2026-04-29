import React from 'react';
import { Card, Row, Col, Typography, Descriptions } from 'antd';
import { BankOutlined, SwapOutlined, AlertOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface FundFlowData {
  [key: string]: any;
}

interface FundFlowCardProps {
  fundFlow: FundFlowData[];
}

const FundFlowCard: React.FC<FundFlowCardProps> = ({ fundFlow }) => {
  const data = fundFlow.length > 0 ? fundFlow[0] : null;
  const isAi = data?.['数据来源'] === 'AI';

  if (!data) {
    return (
      <Card title="💰 控制权相关资金分析" style={{ borderRadius: 12, marginBottom: 20 }}>
        <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>暂无数据</div>
      </Card>
    );
  }

  // AI 模式（并购角度）
  if (isAi) {
    return (
      <Card title="💰 控制权相关资金分析" style={{ borderRadius: 12, marginBottom: 20 }}>
        <Descriptions column={1} size="small" bordered
          contentStyle={{ background: '#fafafa' }}
          labelStyle={{ fontWeight: 600, width: 120 }}
        >
          {data['大宗交易'] && (
            <Descriptions.Item label={<><SwapOutlined /> 大宗交易</>}>
              {data['大宗交易']}
            </Descriptions.Item>
          )}
          {data['股东增减持'] && (
            <Descriptions.Item label={<><BankOutlined /> 股东增减持</>}>
              {data['股东增减持']}
            </Descriptions.Item>
          )}
          {data['交易异动'] && (
            <Descriptions.Item label={<><AlertOutlined /> 交易异动</>}>
              {data['交易异动']}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>
    );
  }

  // 东财数据模式
  const main = data['主力净流入'] || 0;
  return (
    <Card title="💰 资金流向" style={{ borderRadius: 12, marginBottom: 20 }}>
      <Row gutter={16}>
        <Col span={12}><Text type="secondary">主力净流入</Text><br /><Text strong style={{ color: main >= 0 ? '#cf1322' : '#3f8600' }}>{(main / 1e8).toFixed(2)}亿</Text></Col>
        <Col span={12}><Text type="secondary">超大单</Text><br /><Text>{(data['超大单净流入'] / 1e8 || 0).toFixed(2)}亿</Text></Col>
      </Row>
    </Card>
  );
};

export default FundFlowCard;
