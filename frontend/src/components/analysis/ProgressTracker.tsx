import React from 'react';
import { Card, Steps, Progress, Typography } from 'antd';
import { SkillExecutionResult } from '../../skills/types';

const { Text } = Typography;

interface ProgressTrackerProps {
  results: SkillExecutionResult[];
  title?: string;
}

const ProgressTracker: React.FC<ProgressTrackerProps> = ({ results, title = '分析进度' }) => {
  const getStatus = (status: string) => {
    switch (status) {
      case 'completed': return 'finish';
      case 'running': return 'process';
      case 'failed': return 'error';
      default: return 'wait';
    }
  };

  const getCurrentStep = () => {
    return results.findIndex(r => r.status === 'running' || r.status === 'pending');
  };

  const totalProgress = results.length > 0
    ? results.reduce((sum, r) => sum + r.progress, 0) / results.length
    : 0;

  const completedCount = results.filter(r => r.status === 'completed').length;
  const failedCount = results.filter(r => r.status === 'failed').length;

  return (
    <Card title={title} style={{ marginBottom: 16 }}>
      <div style={{ marginBottom: 16 }}>
        <Text strong>总体进度: </Text>
        <Progress 
          percent={Math.round(totalProgress)} 
          status={failedCount > 0 ? 'exception' : undefined}
          style={{ width: 300, display: 'inline-block', marginLeft: 8 }}
        />
        <Text style={{ marginLeft: 16 }}>
          {completedCount}/{results.length} 完成
          {failedCount > 0 && ` | ${failedCount} 失败`}
        </Text>
      </div>

      <Steps
        current={getCurrentStep()}
        direction="vertical"
        size="small"
      >
        {results.map((result) => (
          <Steps.Step
            key={result.skillId}
            title={result.skillId}
            status={getStatus(result.status)}
            description={
              <div>
                {result.status === 'running' && (
                  <Progress percent={Math.round(result.progress)} size="small" />
                )}
                {result.status === 'failed' && result.error && (
                  <Text type="danger">{result.error}</Text>
                )}
                {result.status === 'completed' && (
                  <Text type="success">完成</Text>
                )}
              </div>
            }
          />
        ))}
      </Steps>
    </Card>
  );
};

export default ProgressTracker;
