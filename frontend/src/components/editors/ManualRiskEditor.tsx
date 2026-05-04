import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Radio, Rate, message, Divider, Space, Spin } from 'antd';
import { SaveOutlined, ClearOutlined, ThunderboltOutlined } from '@ant-design/icons';
import axios from 'axios';

const { TextArea } = Input;

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
  const [aiGenerating, setAiGenerating] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY + symbol);
    if (saved) {
      try {
        form.setFieldsValue(JSON.parse(saved));
        return;
      } catch (e) {
        console.warn('风险数据解析失败:', e);
      }
    }
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

  const handleSave = async () => {
    try {
      setSaving(true);
      const values = await form.validateFields();
      localStorage.setItem(STORAGE_KEY + symbol, JSON.stringify(values));
      onSave?.(values);
      message.success('风险分析已保存！');
    } catch (e) {
      console.warn('风险数据保存失败:', e);
      message.error('请完善必填项');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    form.resetFields();
    localStorage.removeItem(STORAGE_KEY + symbol);
    message.info('已清空');
  };

  const handleAiGenerate = async () => {
    setAiGenerating(true);
    try {
      const { data } = await axios.get(`/api/analysis/risk/${symbol}`, { timeout: 60000 });
      form.setFieldsValue({
        overallRating: data.risk_score ? Math.round(Math.min(data.risk_score, 10) / 2) : 3,
        riskLevel: data.overall_risk_level === '高' ? 'high' : data.overall_risk_level === '低' ? 'low' : 'medium',
        keyRisks: (data.key_risk_factors || []).join('；'),
        technicalAnalysis: data.technical_risk_view || '',
        fundamentalAnalysis: data.fundamental_risk_view || '',
        marketSentiment: data.market_sentiment_view || '',
        investmentSuggestion: data.investment_strategy || '',
        notes: data.additional_notes || '',
      });
      localStorage.removeItem(STORAGE_KEY + symbol);
      message.success('AI分析已生成，请审阅后保存');
    } catch (e: any) {
      const errMsg = e?.response?.data?.detail || e?.message || 'AI生成失败，已使用默认模板';
      message.info(errMsg);
    } finally {
      setAiGenerating(false);
    }
  };

  return (
    <Card
      title="🔍 风险分析（控制权转让）"
      extra={
        <Space>
          <Button icon={<ThunderboltOutlined />} onClick={handleAiGenerate} loading={aiGenerating}
            type="primary" ghost style={{ borderColor: '#722ed1', color: '#722ed1' }}>
            {aiGenerating ? 'AI生成中...' : 'AI生成'}
          </Button>
          <Button icon={<ClearOutlined />} onClick={handleClear}>清空</Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>保存分析</Button>
        </Space>
      }
      style={{ borderRadius: 8 }}
    >
      {aiGenerating && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Spin tip="AI正在分析控制权转让风险..." />
        </div>
      )}
      <Form form={form} layout="vertical"
        initialValues={{ overallRating: 3, riskLevel: 'medium' }}>
        <Divider orientation="left">📊 整体评估</Divider>
        <Form.Item label="综合评分" name="overallRating"
          rules={[{ required: true, message: '请给出综合评分' }]}>
          <Rate allowHalf tooltips={['极差', '较差', '一般', '良好', '优秀']} />
        </Form.Item>
        <Form.Item label="风险等级" name="riskLevel"
          rules={[{ required: true, message: '请选择风险等级' }]}>
          <Radio.Group buttonStyle="solid">
            <Radio.Button value="low">🟢 低风险</Radio.Button>
            <Radio.Button value="medium">🟡 中风险</Radio.Button>
            <Radio.Button value="high">🔴 高风险</Radio.Button>
          </Radio.Group>
        </Form.Item>
        <Divider orientation="left">⚠️ 关键风险点</Divider>
        <Form.Item label="主要风险因素" name="keyRisks"
          rules={[{ required: true, message: '请填写' }]}>
          <TextArea rows={4} maxLength={500} showCount
            placeholder="控制权转让维度：历史沿革、质押比例、减持约束、业务稳定性、资产注入、掏空风险等" />
        </Form.Item>
        <Divider orientation="left">📈 技术面</Divider>
        <Form.Item label="技术分析观点" name="technicalAnalysis">
          <TextArea rows={3} maxLength={500} showCount
            placeholder="股价异动、成交量变化等" />
        </Form.Item>
        <Divider orientation="left">💹 基本面</Divider>
        <Form.Item label="基本面分析观点" name="fundamentalAnalysis">
          <TextArea rows={3} maxLength={500} showCount
            placeholder="经营稳定性、资产质量、剥离必要性" />
        </Form.Item>
        <Divider orientation="left">📰 市场情绪</Divider>
        <Form.Item label="舆情与资金面" name="marketSentiment">
          <TextArea rows={3} maxLength={500} showCount
            placeholder="市场传闻、资金异动" />
        </Form.Item>
        <Divider orientation="left">💡 投资策略</Divider>
        <Form.Item label="投资策略建议" name="investmentSuggestion"
          rules={[{ required: true, message: '请填写' }]}>
          <TextArea rows={4} maxLength={500} showCount
            placeholder="控制权转让预期下的投资策略" />
        </Form.Item>
        <Divider orientation="left">📝 备注</Divider>
        <Form.Item label="补充说明" name="notes">
          <TextArea rows={2} maxLength={300} showCount />
        </Form.Item>
      </Form>
    </Card>
  );
};

export default ManualRiskEditor;
