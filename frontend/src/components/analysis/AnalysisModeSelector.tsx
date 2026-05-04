import React from 'react';
import { Card, Radio, Tag, Typography, Space } from 'antd';
import { AnalysisMode } from '../../skills/types';
import { skillRegistry } from '../../skills';

const { Text } = Typography;

interface AnalysisModeSelectorProps {
  selectedMode?: string;
  onSelect: (modeId: string) => void;
}

const AnalysisModeSelector: React.FC<AnalysisModeSelectorProps> = ({ selectedMode, onSelect }) => {
  const modes = skillRegistry.getAllModes();

  return (
    <Card 
      title="选择分析模式" 
      style={{ marginBottom: 16 }}
      styles={{ body: { padding: '16px' } }}
    >
      <Radio.Group
        value={selectedMode}
        onChange={(e) => onSelect(e.target.value)}
        style={{ width: '100%' }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          {modes.map((mode: AnalysisMode) => (
            <Radio.Button
              key={mode.id}
              value={mode.id}
              style={{
                width: '100%',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Space>
                <span style={{ fontSize: '18px' }}>{mode.icon}</span>
                <Text strong>{mode.name}</Text>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {mode.description}
                </Text>
              </Space>
              <Space>
                <Tag color="blue">{mode.skills.length} 个技能</Tag>
                <Tag color="green">~{mode.estimatedDuration}分钟</Tag>
              </Space>
            </Radio.Button>
          ))}
        </Space>
      </Radio.Group>
    </Card>
  );
};

export default AnalysisModeSelector;
