import React from 'react';
import { Card, Descriptions, Typography } from 'antd';

const { Text, Paragraph } = Typography;

interface CompanyProfileProps {
  data?: any;
}

const CompanyProfileCard: React.FC<CompanyProfileProps> = ({ data }) => {
  const companyInfo = data?.company_info;

  if (!companyInfo) {
    return (
      <Card>
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🏢</div>
          <div style={{ color: '#8c8c8c', fontSize: 13 }}>暂无公司简介数据</div>
        </div>
      </Card>
    );
  }

  // 构建完整的公司简介数据（从 mock 数据开始，后续可以从实际数据源获取）
  const profile = {
    name: companyInfo.name || '贵州茅台酒股份有限公司',
    region: '贵州省',
    englishName: 'Kweichow Moutai Co.,Ltd.',
    industry: companyInfo.industry || '食品饮料 — 白酒Ⅱ',
    formerName: '贵州茅台->G茅台',
    mainBusiness: companyInfo.main_business || '茅台酒及系列酒的生产与销售。',
    products: '茅台酒、其他系列酒',
    controllingShareholder: '中国贵州茅台酒厂(集团)有限责任公司 (持有贵州茅台酒股份有限公司股份比例：54.40% )',
    actualController: '贵州省人民政府国有资产监督管理委员会 (持有贵州茅台酒股份有限公司股份比例：48.96%)',
    finalController: '贵州省人民政府国有资产监督管理委员会 (持有贵州茅台酒股份有限公司股份比例：48.96% )',
    chairman: '陈华',
    secretary: '余思明(代)',
    legalRepresentative: '陈华',
    generalManager: '王莉(代)',
    registeredCapital: '12.52亿元',
    employeeCount: '34992',
    description: `贵州茅台酒股份有限公司的主营业务是茅台酒及系列酒的生产与销售。公司的主要产品是茅台酒。`,
  };

  return (
    <Card title="🏢 公司简介" size="small">
      <Descriptions bordered column={1} size="small" style={{ marginBottom: 16 }}>
        <Descriptions.Item label="公司名称">{profile.name}</Descriptions.Item>
        <Descriptions.Item label="所属地域">{profile.region}</Descriptions.Item>
        <Descriptions.Item label="英文名称">{profile.englishName}</Descriptions.Item>
        <Descriptions.Item label="所属申万行业">{profile.industry}</Descriptions.Item>
        <Descriptions.Item label="曾 用 名">{profile.formerName}</Descriptions.Item>
        <Descriptions.Item label="主营业务">{profile.mainBusiness}</Descriptions.Item>
        <Descriptions.Item label="产品名称">{profile.products}</Descriptions.Item>
        <Descriptions.Item label="控股股东" labelStyle={{ whiteSpace: 'nowrap' }}>
          <Text>{profile.controllingShareholder}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="实际控制人" labelStyle={{ whiteSpace: 'nowrap' }}>
          <Text>{profile.actualController}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="最终控制人" labelStyle={{ whiteSpace: 'nowrap' }}>
          <Text>{profile.finalController}</Text>
        </Descriptions.Item>
      </Descriptions>

      <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
        <Descriptions.Item label="董事长">{profile.chairman}</Descriptions.Item>
        <Descriptions.Item label="董秘">{profile.secretary}</Descriptions.Item>
        <Descriptions.Item label="法人代表">{profile.legalRepresentative}</Descriptions.Item>
        <Descriptions.Item label="总经理">{profile.generalManager}</Descriptions.Item>
        <Descriptions.Item label="注册资金">{profile.registeredCapital}</Descriptions.Item>
        <Descriptions.Item label="员工人数">{profile.employeeCount}</Descriptions.Item>
      </Descriptions>

      <Card size="small" title="公司简介" style={{ background: '#fafafa' }}>
        <Paragraph style={{ margin: 0, textIndent: '2em' }}>
          {profile.description}
        </Paragraph>
      </Card>
    </Card>
  );
};

export default CompanyProfileCard;
