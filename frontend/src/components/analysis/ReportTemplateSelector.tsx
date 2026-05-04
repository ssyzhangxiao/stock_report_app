import React from 'react';
import { Card, Radio, Typography, Tooltip, Badge } from 'antd';
import { FileTextOutlined, ThunderboltOutlined, BarChartOutlined } from '@ant-design/icons';
import type { ReportTemplateType } from '../../utils/reportTemplates';
import { getAllTemplates } from '../../utils/reportTemplates';

const { Text } = Typography;

interface ReportTemplateSelectorProps {
  selectedTemplate: ReportTemplateType;
  onSelect: (templateId: ReportTemplateType) => void;
}

const ReportTemplateSelector: React.FC<ReportTemplateSelectorProps> = ({
  selectedTemplate,
  onSelect
}) => {
  const templates = getAllTemplates();

  const getIcon = (templateId: ReportTemplateType) => {
    switch (templateId) {
      case 'full':
        return <FileTextOutlined style={{ fontSize: 24 }} />;
      case 'quick':
        return <ThunderboltOutlined style={{ fontSize: 24 }} />;
      case 'comparison':
        return <BarChartOutlined style={{ fontSize: 24 }} />;
      default:
        return <FileTextOutlined style={{ fontSize: 24 }} />;
    }
  };

  const getColor = (templateId: ReportTemplateType) => {
    switch (templateId) {
      case 'full':
        return '#667eea';
      case 'quick':
        return '#52c41a';
      case 'comparison':
        return '#faad14';
      default:
        return '#667eea';
    }
  };

  return (
    <Card 
      title={
        <span style={{ fontSize: 14 }}>
          📋 选择报告模板
        </span>
      }
      style={{ 
        marginBottom: 16,
        background: '#ffffff',
        borderRadius: 8,
        border: '1px solid #e8ecf1',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}
      bodyStyle={{ padding: '16px' }}
    >
      <Radio.Group 
        value={selectedTemplate} 
        onChange={(e) => onSelect(e.target.value)}
        buttonStyle="solid"
        style={{ width: '100%', display: 'flex', gap: 12 }}
      >
        {templates.map((template) => (
          <Tooltip 
            key={template.id}
            title={
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{template.name}</div>
                <div style={{ fontSize: 12 }}>{template.description}</div>
                <div style={{ fontSize: 12, marginTop: 4, opacity: 0.8 }}>
                  预计页数：{template.estimatedPages}页
                </div>
                <div style={{ fontSize: 12, marginTop: 4, opacity: 0.8 }}>
                  包含模块：{template.sections.length}个
                </div>
              </div>
            }
            placement="top"
          >
            <Radio.Button 
              value={template.id}
              style={{
                flex: 1,
                textAlign: 'center',
                height: 'auto',
                padding: '12px 16px',
                borderColor: selectedTemplate === template.id ? getColor(template.id) : undefined,
                backgroundColor: selectedTemplate === template.id ? `${getColor(template.id)}15` : undefined
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{ color: getColor(template.id) }}>
                  {getIcon(template.id)}
                </div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {template.name}
                </div>
                <Badge 
                  count={`${template.estimatedPages}页`} 
                  style={{ 
                    backgroundColor: getColor(template.id),
                    fontSize: 11
                  }}
                />
              </div>
            </Radio.Button>
          </Tooltip>
        ))}
      </Radio.Group>

      <div style={{ marginTop: 12, textAlign: 'center' }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          💡 提示：将鼠标悬停在模板上可查看详细信息
        </Text>
      </div>
    </Card>
  );
};

export default ReportTemplateSelector;
