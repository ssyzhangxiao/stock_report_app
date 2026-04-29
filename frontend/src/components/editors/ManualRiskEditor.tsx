import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Radio, Rate, Typography, message, Divider, Space } from 'antd';
import { SaveOutlined, ClearOutlined } from '@ant-design/icons';
const { TextArea } = Input;
const { Text } = Typography;

interface RiskAnalysis {
  overallRating: number;
  riskLevel: 'low' | 'medium' | 'high';
  keyRisks: string;
  investmentSuggestion: string;
  technicalAnalysis: string;
  fundamentalAnalysis: string;
  marketSentiment: string;
  notes: string;
}

interface ManualRiskEditorProps {
  symbol: string;
  aiAnalysis?: {
    overall_risk_level?: string;
    risk_score?: number;
    key_risk_factors?: string[];
    technical_risk_view?: string;
    fundamental_risk_view?: string;
    market_sentiment_view?: string;
    investment_strategy?: string;
    additional_notes?: string;
  };
  onSave?: (analysis: RiskAnalysis) => void;
}

const STORAGE_KEY = 'stock_risk_analysis_';

const ManualRiskEditor: React.FC<ManualRiskEditorProps> = ({ symbol, aiAnalysis, onSave }) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  // 加载已保存的分析，没有则用AI预填
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY + symbol);
    if (saved) {
      try {
        const analysis: RiskAnalysis = JSON.parse(saved);
        form.setFieldsValue(analysis);
        return;
      } catch (e) {
        console.error('加载保存的分析失败:', e);
      }
    }
    // 无本地保存数据时，用AI分析预填
    if (aiAnalysis) {
      form.setFieldsValue({
        overallRating: aiAnalysis.risk_score ? Math.round(aiAnalysis.risk_score / 2) : 3,
        riskLevel: aiAnalysis.overall_risk_level === '高' ? 'high' : aiAnalysis.overall_risk_level === '低' ? 'low' : 'medium',
        keyRisks: aiAnalysis.key_risk_factors?.join('；') || '',
        technicalAnalysis: aiAnalysis.technical_risk_view || '',
        fundamentalAnalysis: aiAnalysis.fundamental_risk_view || '',
        marketSentiment: aiAnalysis.market_sentiment_view || '',
        investmentSuggestion: aiAnalysis.investment_strategy || '',
        notes: aiAnalysis.additional_notes || '',
      });
    }
  }, [symbol, aiAnalysis, form]);

  // 保存分析
  const handleSave = async () => {
    try {
      setSaving(true);
      const values = await form.validateFields();
      
      // 保存到 localStorage
      localStorage.setItem(STORAGE_KEY + symbol, JSON.stringify(values));
      
      // 调用父组件回调
      if (onSave) {
        onSave(values);
      }
      
      message.success('风险分析已保存！');
    } catch (error) {
      message.error('请完善必填项');
    } finally {
      setSaving(false);
    }
  };

  // 清空表单
  const handleClear = () => {
    form.resetFields();
    localStorage.removeItem(STORAGE_KEY + symbol);
    message.info('已清空当前分析');
  };

  return (
    <Card 
      title="🔍 风险分析（控制权转让）" 
      style={{ marginBottom: 24 }}
      extra={
        <Space>
          <Button 
            icon={<ClearOutlined />} 
            onClick={handleClear}
          >
            清空
          </Button>
          <Button 
            type="primary" 
            icon={<SaveOutlined />} 
            onClick={handleSave}
            loading={saving}
          >
            保存分析
          </Button>
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          overallRating: 3,
          riskLevel: 'medium'
        }}
      >
        {/* 整体评级 */}
        <Divider orientation="left">📊 整体评估</Divider>
        
        <Form.Item
          label="综合评分"
          name="overallRating"
          rules={[{ required: true, message: '请给出综合评分' }]}
        >
          <Rate allowHalf tooltips={['极差', '较差', '一般', '良好', '优秀']} />
        </Form.Item>

        <Form.Item
          label="风险等级"
          name="riskLevel"
          rules={[{ required: true, message: '请选择风险等级' }]}
        >
          <Radio.Group buttonStyle="solid">
            <Radio.Button value="low">🟢 低风险</Radio.Button>
            <Radio.Button value="medium">🟡 中风险</Radio.Button>
            <Radio.Button value="high">🔴 高风险</Radio.Button>
          </Radio.Group>
        </Form.Item>

        {/* 关键风险点 */}
        <Divider orientation="left">⚠️ 关键风险点</Divider>
        
        <Form.Item
          label="主要风险因素"
          name="keyRisks"
          rules={[{ required: true, message: '请填写主要风险因素' }]}
        >
          <TextArea
            rows={4}
            placeholder="例如：股权质押比例过高、业绩下滑、行业政策风险、市场竞争加剧等..."
            maxLength={500}
            showCount
          />
        </Form.Item>

        {/* 技术面分析 */}
        <Divider orientation="left">📈 技术面分析</Divider>
        
        <Form.Item
          label="技术分析观点"
          name="technicalAnalysis"
        >
          <TextArea
            rows={3}
            placeholder="例如：均线系统呈多头排列，MACD金叉，RSI处于超买区域，支撑位/压力位分析..."
            maxLength={500}
            showCount
          />
        </Form.Item>

        {/* 基本面分析 */}
        <Divider orientation="left">💹 基本面分析</Divider>
        
        <Form.Item
          label="基本面分析观点"
          name="fundamentalAnalysis"
        >
          <TextArea
            rows={3}
            placeholder="例如：ROE持续高于15%，营收增长稳健，现金流健康，估值合理..."
            maxLength={500}
            showCount
          />
        </Form.Item>

        {/* 市场情绪 */}
        <Divider orientation="left">📰 市场情绪</Divider>
        
        <Form.Item
          label="舆情与资金面"
          name="marketSentiment"
        >
          <TextArea
            rows={3}
            placeholder="例如：近期利好消息较多，主力资金持续净流入，机构调研频繁..."
            maxLength={500}
            showCount
          />
        </Form.Item>

        {/* 投资建议 */}
        <Divider orientation="left">💡 投资建议</Divider>
        
        <Form.Item
          label="投资策略建议"
          name="investmentSuggestion"
          rules={[{ required: true, message: '请填写投资建议' }]}
        >
          <TextArea
            rows={4}
            placeholder="例如：建议逢低布局，设置止损位XX元，目标价XX元，持有周期X个月..."
            maxLength={500}
            showCount
          />
        </Form.Item>

        {/* 备注 */}
        <Divider orientation="left">📝 其他备注</Divider>
        
        <Form.Item
          label="补充说明"
          name="notes"
        >
          <TextArea
            rows={2}
            placeholder="其他需要补充的信息..."
            maxLength={300}
            showCount
          />
        </Form.Item>

        {/* 保存提示 */}
        <div style={{ marginTop: 24, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            💡 提示：分析内容会自动保存到浏览器本地存储，下次访问同一股票时会自动加载。
            建议定期备份重要分析内容。
          </Text>
        </div>
      </Form>
    </Card>
  );
};

export default ManualRiskEditor;
