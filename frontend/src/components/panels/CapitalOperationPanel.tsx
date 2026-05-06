import React, { useEffect, useState } from 'react';
import { Card, Table, Tabs, Collapse, Descriptions, Tag, Spin, Alert, Statistic, Row, Col } from 'antd';
import { getCapitalOperation, type CapitalOperationResult, type EquityInvestmentItem } from '../../api/stockApi';

const { Panel } = Collapse;

interface CapitalOperationProps {
  data?: any;
}

const CapitalOperationPanel: React.FC<CapitalOperationProps> = ({ data }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capitalData, setCapitalData] = useState<CapitalOperationResult | null>(null);

  const symbol = data?.symbol;

  useEffect(() => {
    if (!symbol) {
      setError('缺少股票代码');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getCapitalOperation(symbol);
        setCapitalData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取资本运作数据失败');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [symbol]);

  if (loading) {
    return (
      <Card title="💰 资本运作" size="small">
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16, color: '#8c8c8c' }}>正在获取资本运作数据...</div>
        </div>
      </Card>
    );
  }

  if (error || !capitalData) {
    return (
      <Card title="💰 资本运作" size="small">
        <Alert
          message={error || '暂无资本运作数据'}
          type="warning"
          showIcon
        />
      </Card>
    );
  }

  const fundRaisingData = capitalData.fund_raising.map((item, index) => ({
    key: String(index + 1),
    announcementDate: item.announcement_date,
    issueType: item.issue_type,
    startDate: item.start_date,
    netRaised: item.net_raised,
    remainingEndDate: item.remaining_end_date,
    remaining: item.remaining,
    utilizationRate: item.utilization_rate,
  }));

  const projectInvestmentData = capitalData.project_investment.map((item, index) => ({
    key: String(index + 1),
    announcementDate: item.announcement_date,
    projectName: item.project_name,
    promisedFunds: item.promised_funds,
    investedFunds: item.invested_funds,
    constructionPeriod: item.construction_period,
    afterTaxReturn: item.after_tax_return,
    predictedNetProfit: item.predicted_net_profit,
    projectDesc: item.project_desc,
  }));

  const acquisitionData = capitalData.acquisition.map((item, index) => ({
    key: String(index + 1),
    year: item.year,
    announcementDate: item.announcement_date,
    transactionAmount: item.transaction_amount,
    progress: item.progress,
    target: item.target,
    buyer: item.buyer,
    seller: item.seller,
    overview: item.overview,
  }));

  const equityInvestmentData = capitalData.equity_investment.map((item: EquityInvestmentItem, index: number) => ({
    key: String(index + 1),
    fundName: item.fund_name,
    fundCode: item.fund_code,
    holdNumber: item.hold_number,
    holdRatio: item.hold_ratio,
    holdValue: item.hold_value,
    netRatio: item.net_ratio,
  }));

  const equityTransferData = capitalData.equity_transfer.map((item, index) => ({
    key: String(index + 1),
    year: item.year,
    announcementDate: item.announcement_date,
    transactionAmount: item.transaction_amount,
    transferRatio: item.transfer_ratio,
    transferor: item.transferor,
    target: item.target,
    transferee: item.transferee,
    overview: item.overview,
    impact: item.impact,
  }));

  const relatedTransactionData = capitalData.related_transactions.map((item, index) => ({
    key: String(index + 1),
    year: item.year,
    announcementDate: item.announcement_date,
    transactionAmount: item.transaction_amount,
    paymentMethod: item.payment_method,
    counterparty: item.counterparty,
    transactionType: item.transaction_type,
    relatedRelation: item.related_relation,
    description: item.description,
  }));

  const fundRaisingColumns = [
    { title: '公告日期', dataIndex: 'announcementDate', key: 'announcementDate', width: 120 },
    { title: '发行类别', dataIndex: 'issueType', key: 'issueType', width: 120 },
    { title: '发行起始日期', dataIndex: 'startDate', key: 'startDate', width: 120 },
    { title: '实际募集资金净额', dataIndex: 'netRaised', key: 'netRaised', width: 150 },
    { title: '剩余募集资金截止时间', dataIndex: 'remainingEndDate', key: 'remainingEndDate', width: 180 },
    { title: '剩余募集资金', dataIndex: 'remaining', key: 'remaining', width: 120 },
    { title: '募集资金使用率', dataIndex: 'utilizationRate', key: 'utilizationRate', width: 130 },
  ];

  const projectColumns = [
    { title: '公告日期', dataIndex: 'announcementDate', key: 'announcementDate', width: 120 },
    { title: '项目名称', dataIndex: 'projectName', key: 'projectName', width: 280 },
    { title: '承诺使用募集资金', dataIndex: 'promisedFunds', key: 'promisedFunds', width: 150 },
    { title: '已投入募集资金', dataIndex: 'investedFunds', key: 'investedFunds', width: 150 },
    { title: '建设期(年)', dataIndex: 'constructionPeriod', key: 'constructionPeriod', width: 100 },
    { title: '税后收益率', dataIndex: 'afterTaxReturn', key: 'afterTaxReturn', width: 120 },
    { title: '预测年新增净利润', dataIndex: 'predictedNetProfit', key: 'predictedNetProfit', width: 150 },
  ];

  const equityInvestmentColumns = [
    { title: '基金名称', dataIndex: 'fundName', key: 'fundName', width: 200 },
    { title: '基金代码', dataIndex: 'fundCode', key: 'fundCode', width: 100 },
    { title: '持仓数量', dataIndex: 'holdNumber', key: 'holdNumber', width: 130 },
    { title: '占流通股比例', dataIndex: 'holdRatio', key: 'holdRatio', width: 120 },
    { title: '持股市值', dataIndex: 'holdValue', key: 'holdValue', width: 130 },
    { title: '占净值比例', dataIndex: 'netRatio', key: 'netRatio', width: 100 },
  ];

  const relatedTransactionColumns = [
    { title: '公告日期', dataIndex: 'announcementDate', key: 'announcementDate', width: 120 },
    { title: '交易金额', dataIndex: 'transactionAmount', key: 'transactionAmount', width: 150 },
    { title: '支付方式', dataIndex: 'paymentMethod', key: 'paymentMethod', width: 100 },
    { title: '交易方', dataIndex: 'counterparty', key: 'counterparty', width: 200 },
    { title: '交易方式', dataIndex: 'transactionType', key: 'transactionType', width: 150 },
    { title: '关联关系', dataIndex: 'relatedRelation', key: 'relatedRelation', width: 150 },
  ];

  const profitForecastSection = capitalData.profit_forecast && capitalData.profit_forecast.length > 0 ? (
    <Card size="small" title="盈利预测" style={{ marginBottom: 12 }}>
      <Row gutter={16}>
        {capitalData.profit_forecast.map((item) => (
          <Col span={8} key={item.year}>
            <Card size="small">
              <Statistic title={`${item.year}年 EPS 预测`} value={item.avg_eps ?? '-'} precision={2} suffix="元" />
              <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                预测机构: {item.org_count ?? '-'} 家 | 最低: {item.min_eps ?? '-'} | 最高: {item.max_eps ?? '-'}
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </Card>
  ) : null;

  const tabItems = [
    {
      key: '1',
      label: `募集资金来源${fundRaisingData.length > 0 ? ` (${fundRaisingData.length})` : ''}`,
      children: (
        <div>
          {fundRaisingData.length > 0 ? (
            <Table
              dataSource={fundRaisingData}
              columns={fundRaisingColumns}
              pagination={false}
              size="small"
              bordered
            />
          ) : (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#8c8c8c' }}>
              暂无募集资金来源数据
            </div>
          )}
        </div>
      ),
    },
    {
      key: '2',
      label: `项目投资${projectInvestmentData.length > 0 ? ` (${projectInvestmentData.length})` : ''}`,
      children: (
        <div>
          {profitForecastSection}
          {projectInvestmentData.length > 0 ? (
            <Table
              dataSource={projectInvestmentData}
              columns={projectColumns}
              pagination={{ pageSize: 5 }}
              size="small"
              bordered
              scroll={{ x: 1000 }}
              expandable={{
                expandedRowRender: (record) => (
                  <Card size="small" title="项目简介" style={{ margin: 0 }}>
                    <p style={{ margin: 0 }}>{record.projectDesc}</p>
                  </Card>
                ),
              }}
            />
          ) : (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#8c8c8c' }}>
              暂无项目投资数据
            </div>
          )}
        </div>
      ),
    },
    {
      key: '3',
      label: `收购兼并${acquisitionData.length > 0 ? ` (${acquisitionData.length})` : ''}`,
      children: (
        <div>
          {acquisitionData.length > 0 ? (
            <Collapse defaultActiveKey={['1']}>
              {acquisitionData.map((item) => (
                <Panel header={`${item.announcementDate} - ${item.target}`} key={item.key}>
                  <Descriptions bordered column={1} size="small" style={{ marginBottom: 12 }}>
                    <Descriptions.Item label="交易金额">{item.transactionAmount}</Descriptions.Item>
                    <Descriptions.Item label="交易进度">
                      <Tag color="green">{item.progress}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="交易标的">{item.target}</Descriptions.Item>
                    <Descriptions.Item label="买方">{item.buyer}</Descriptions.Item>
                    <Descriptions.Item label="卖方">{item.seller}</Descriptions.Item>
                  </Descriptions>
                  <Card size="small" title="交易概述" style={{ background: '#fafafa' }}>
                    <p style={{ margin: 0, textIndent: '2em' }}>{item.overview}</p>
                  </Card>
                </Panel>
              ))}
            </Collapse>
          ) : (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#8c8c8c' }}>
              暂无收购兼并数据
            </div>
          )}
        </div>
      ),
    },
    {
      key: '4',
      label: `股权投资${equityInvestmentData.length > 0 ? ` (${equityInvestmentData.length})` : ''}`,
      children: (
        <div>
          {equityInvestmentData.length > 0 ? (
            <Table
              dataSource={equityInvestmentData}
              columns={equityInvestmentColumns}
              pagination={{ pageSize: 10 }}
              size="small"
              bordered
              scroll={{ x: 800 }}
            />
          ) : (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#8c8c8c' }}>
              暂无股权投资数据
            </div>
          )}
        </div>
      ),
    },
    {
      key: '5',
      label: `股权转让${equityTransferData.length > 0 ? ` (${equityTransferData.length})` : ''}`,
      children: (
        <div>
          {equityTransferData.length > 0 ? (
            <Collapse defaultActiveKey={['1']}>
              {equityTransferData.map((item) => (
                <Panel header={`${item.announcementDate} - ${item.target}`} key={item.key}>
                  <Descriptions bordered column={1} size="small" style={{ marginBottom: 12 }}>
                    <Descriptions.Item label="交易金额">{item.transactionAmount}</Descriptions.Item>
                    <Descriptions.Item label="转让比例">{item.transferRatio}</Descriptions.Item>
                    <Descriptions.Item label="出让方">{item.transferor}</Descriptions.Item>
                    <Descriptions.Item label="交易标的">{item.target}</Descriptions.Item>
                    <Descriptions.Item label="受让方">{item.transferee}</Descriptions.Item>
                    {item.overview && (
                      <Descriptions.Item label="交易简介">{item.overview}</Descriptions.Item>
                    )}
                    {item.impact && (
                      <Descriptions.Item label="交易影响">{item.impact}</Descriptions.Item>
                    )}
                  </Descriptions>
                </Panel>
              ))}
            </Collapse>
          ) : (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#8c8c8c' }}>
              暂无股权转让数据
            </div>
          )}
        </div>
      ),
    },
    {
      key: '6',
      label: `关联交易${relatedTransactionData.length > 0 ? ` (${relatedTransactionData.length})` : ''}`,
      children: (
        <div>
          {relatedTransactionData.length > 0 ? (
            <Table
              dataSource={relatedTransactionData}
              columns={relatedTransactionColumns}
              pagination={{ pageSize: 5 }}
              size="small"
              bordered
              scroll={{ x: 1000 }}
              expandable={{
                expandedRowRender: (record) => (
                  <Card size="small" title="交易简介" style={{ margin: 0 }}>
                    <p style={{ margin: 0, textIndent: '2em' }}>{record.description}</p>
                  </Card>
                ),
              }}
            />
          ) : (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#8c8c8c' }}>
              暂无关联交易数据
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <Card title="💰 资本运作" size="small">
      <Tabs defaultActiveKey="1" items={tabItems} />
    </Card>
  );
};

export default CapitalOperationPanel;
