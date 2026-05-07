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

  // 构建完整的公司简介数据，完全从后端真实数据获取
  const profile = {
    name: companyInfo.name || '-',
    region: companyInfo.region || '-',
    englishName: companyInfo.english_name || '-',
    industry: companyInfo.industry || '-',
    formerName: companyInfo.former_name || '-',
    mainBusiness: companyInfo.main_business || '-',
    products: companyInfo.products || '-',
    controllingShareholder: companyInfo.controlling_shareholder || '-',
    actualController: companyInfo.actual_controller || '-',
    finalController: companyInfo.final_controller || '-',
    chairman: companyInfo.chairman || '-',
    secretary: companyInfo.secretary || '-',
    legalRepresentative: companyInfo.legal_representative || '-',
    generalManager: companyInfo.general_manager || '-',
    registeredCapital: companyInfo.registered_capital || '-',
    employeeCount: companyInfo.employee_count ? String(companyInfo.employee_count) : '-',
    description: companyInfo.description || '-',
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
