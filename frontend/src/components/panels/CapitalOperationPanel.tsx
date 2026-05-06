import React from 'react';
import { Card, Table, Tabs, Collapse, Descriptions, Tag } from 'antd';

const { Panel } = Collapse;

interface CapitalOperationProps {
  data?: any;
}

const CapitalOperationPanel: React.FC<CapitalOperationProps> = ({ data: _data }) => {
  // 募集资金来源数据
  const fundRaisingData = [
    {
      key: '1',
      announcementDate: '2001-07-26',
      issueType: '首发A股',
      startDate: '2001-07-31',
      netRaised: '22.02亿',
      remainingEndDate: '2013-06-30',
      remaining: '0.00',
      utilizationRate: '100%',
    },
  ];

  // 项目投资数据
  const projectInvestmentData = [
    {
      key: '1',
      announcementDate: '2013-08-31',
      projectName: '供热系统技改项目',
      promisedFunds: '6718.00万',
      investedFunds: '7076.46万',
      constructionPeriod: '1.00',
      afterTaxReturn: '-',
      predictedNetProfit: '-',
      projectDesc: '-',
    },
    {
      key: '2',
      announcementDate: '2013-08-31',
      projectName: '供水系统技改项目',
      promisedFunds: '1.10亿',
      investedFunds: '1.12亿',
      constructionPeriod: '2.00',
      afterTaxReturn: '-',
      predictedNetProfit: '-',
      projectDesc: '-',
    },
    {
      key: '3',
      announcementDate: '2013-08-31',
      projectName: '综合维修中心技改项目',
      promisedFunds: '1742.00万',
      investedFunds: '1918.24万',
      constructionPeriod: '1.00',
      afterTaxReturn: '-',
      predictedNetProfit: '-',
      projectDesc: '-',
    },
    {
      key: '4',
      announcementDate: '2013-08-31',
      projectName: '补充募集资金项目铺底流动资金',
      promisedFunds: '4817.21万',
      investedFunds: '4817.21万',
      constructionPeriod: '-',
      afterTaxReturn: '-',
      predictedNetProfit: '-',
      projectDesc: '-',
    },
    {
      key: '5',
      announcementDate: '2011-12-09',
      projectName: '2012年新增2800吨茅台王子酒制酒技改工程及配套设施',
      promisedFunds: '4.37亿',
      investedFunds: '-',
      constructionPeriod: '2.00',
      afterTaxReturn: '-',
      predictedNetProfit: '2.88亿',
      projectDesc: '-',
    },
  ];

  // 收购兼并数据
  const acquisitionData = [
    {
      key: '1',
      year: '2021',
      announcementDate: '2021-09-10',
      transactionAmount: '--',
      progress: '完成',
      target: '中国贵州茅台酒厂(集团)有限责任公司10%股权',
      buyer: '贵州金融控股集团有限责任公司(贵州贵民投资集团有限责任公司)',
      seller: '贵州省人民政府国有资产监督管理委员会',
      overview: '贵州茅台酒股份有限公司(以下简称公司)于2021年9月9日收到公司控股股东中国贵州茅台酒厂(集团)有限责任公司(以下简称茅台集团公司)通知:根据贵州省财政厅、贵州省人力资源和社会保障厅、贵州省人民政府国有资产监督管理委员会(以下简称贵州省国资委)《关于划转部分国有资本充实社保基金有关事项的通知》(黔财工〔2020〕286号)和贵州省国资委《关于做好我委所持有关企业部分股权划转金控集团公司持有有关事项的通知》(黔国资通产权〔2021〕3号),贵州省国资委将其持有的茅台集团公司10%股权无偿划转给贵州金融控股集团有限责任公司(贵州贵民投资集团有限责任公司)。',
    },
    {
      key: '2',
      year: '2020',
      announcementDate: '2020-12-31',
      transactionAmount: '--',
      progress: '完成',
      target: '贵州茅台酒股份有限公司4%股权',
      buyer: '贵州省国有资本运营有限责任公司',
      seller: '中国贵州茅台酒厂(集团)有限责任公司',
      overview: '贵州茅台酒股份有限公司(以下简称本公司)于2020年12月23日接到本公司控股股东中国贵州茅台酒厂(集团)有限责任公司(以下简称茅台集团)《关于无偿划转贵州茅台酒股份有限公司国有股份的通知》,根据贵州省人民政府国有资产监督管理委员会的相关通知要求,茅台集团拟通过无偿划转方式将持有的本公司50,240,000股股份(占本公司总股本的4.00%)划转至贵州省国有资本运营有限责任公司。',
    },
  ];

  // 关联交易数据
  const relatedTransactionData = [
    {
      key: '1',
      year: '2026',
      announcementDate: '2026-04-17',
      transactionAmount: '920600.00万元',
      paymentMethod: '现金',
      counterparty: '中国贵州茅台酒厂(集团)有限责任公司,贵州茅台集团营销有限公司',
      transactionType: '采购原料,采购服务,采购茅台文化体验服务等',
      relatedRelation: '公司股东,同一控股公司',
      description: '2026年度，公司将与茅台集团围绕日常生产经营业务等方面开展关联交易，交易金额合计不超过公司2025年末经审计净资产的5%。',
    },
    {
      key: '2',
      year: '2025',
      announcementDate: '2025-07-23',
      transactionAmount: '49000.00万元',
      paymentMethod: '现金',
      counterparty: '中国贵州茅台酒厂(集团)有限责任公司',
      transactionType: '共同投资',
      relatedRelation: '公司股东',
      description: '为强化企业科技创新主体地位,坚定不移推动科技创新发展,始终保持行业科研领域领先地位,公司拟与控股股东茅台集团共同出资成立研究院公司。研究院公司注册资本金为10亿元(人民币,币种下同),其中公司以货币+实物(实验仪器)形式出资4.9亿元(占股49%),茅台集团以货币+实物(科技大楼)形式出资5.1亿元(占股51%)。',
    },
  ];

  // 表格列配置
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

  const relatedTransactionColumns = [
    { title: '公告日期', dataIndex: 'announcementDate', key: 'announcementDate', width: 120 },
    { title: '交易金额', dataIndex: 'transactionAmount', key: 'transactionAmount', width: 150 },
    { title: '支付方式', dataIndex: 'paymentMethod', key: 'paymentMethod', width: 100 },
    { title: '交易方', dataIndex: 'counterparty', key: 'counterparty', width: 200 },
    { title: '交易方式', dataIndex: 'transactionType', key: 'transactionType', width: 150 },
    { title: '关联关系', dataIndex: 'relatedRelation', key: 'relatedRelation', width: 150 },
  ];

  const tabItems = [
    {
      key: '1',
      label: '募集资金来源',
      children: (
        <div>
          <Table
            dataSource={fundRaisingData}
            columns={fundRaisingColumns}
            pagination={false}
            size="small"
            bordered
          />
        </div>
      ),
    },
    {
      key: '2',
      label: '项目投资',
      children: (
        <div>
          <Table
            dataSource={projectInvestmentData}
            columns={projectColumns}
            pagination={{ pageSize: 5 }}
            size="small"
            bordered
            scroll={{ x: 1000 }}
          />
        </div>
      ),
    },
    {
      key: '3',
      label: '收购兼并',
      children: (
        <div>
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
        </div>
      ),
    },
    {
      key: '4',
      label: '股权投资',
      children: (
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
          <div style={{ color: '#8c8c8c', fontSize: 13 }}>该股暂无股权投资数据</div>
        </div>
      ),
    },
    {
      key: '5',
      label: '股权转让',
      children: (
        <div>
          <Collapse defaultActiveKey={['1']}>
            {acquisitionData.map((item) => (
              <Panel header={`${item.announcementDate} - ${item.target}`} key={item.key}>
                <Descriptions bordered column={1} size="small" style={{ marginBottom: 12 }}>
                  <Descriptions.Item label="交易金额">{item.transactionAmount}</Descriptions.Item>
                  <Descriptions.Item label="出让方">{item.seller}</Descriptions.Item>
                  <Descriptions.Item label="交易标的">{item.target}</Descriptions.Item>
                  <Descriptions.Item label="受让方">{item.buyer}</Descriptions.Item>
                </Descriptions>
              </Panel>
            ))}
          </Collapse>
        </div>
      ),
    },
    {
      key: '6',
      label: '关联交易',
      children: (
        <div>
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
