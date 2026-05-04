
/**
 * 技能系统初始化
 * 注册所有可用的技能和分析模式
 */

import { skillRegistry } from './SkillRegistry';
import { Skill, AnalysisMode } from './types';

const skills: Skill[] = [
  {
    id: 'dcf-valuation',
    name: 'DCF估值分析',
    description: '使用现金流折现模型计算内在价值',
    category: 'valuation',
    icon: '💰',
    estimatedDuration: 15,
    workflow: [
      '收集财务数据（5年自由现金流）',
      '计算历史增长率',
      '估算WACC',
      '预测未来现金流',
      '计算终值',
      '折现现金流',
      '生成敏感性分析',
    ],
    output: ['公允价值', '上涨空间', '敏感性热力图'],
    skillPath: '/skills/valuation/dcf/SKILL.md',
  },
  {
    id: 'pe-pb-valuation',
    name: 'PE/PB估值分析',
    description: '基于市盈率和市净率的相对估值',
    category: 'valuation',
    icon: '📊',
    estimatedDuration: 10,
    workflow: [
      '获取PE/PB数据',
      '行业对比分析',
      '历史分位分析',
      '生成估值图表',
    ],
    output: ['PE估值', 'PB估值', '行业对比图'],
    skillPath: '/skills/valuation/pe-pb/SKILL.md',
  },
  {
    id: 'pledge-risk',
    name: '股权质押风险分析',
    description: '分析大股东股权质押情况',
    category: 'risk',
    icon: '⚠️',
    estimatedDuration: 8,
    workflow: [
      '获取质押比例数据',
      '分析质押市值',
      '计算预警线',
      '评估风险等级',
    ],
    output: ['质押比例', '风险等级', '风险趋势图'],
    skillPath: '/skills/risk/pledge/SKILL.md',
  },
  {
    id: 'macd-analysis',
    name: 'MACD技术分析',
    description: 'MACD指标趋势分析',
    category: 'technical',
    icon: '📈',
    estimatedDuration: 5,
    workflow: [
      '计算MACD指标',
      '分析金叉/死叉',
      '判断趋势方向',
    ],
    output: ['MACD图表', '买卖信号', '趋势判断'],
  },
  {
    id: 'news-sentiment',
    name: '新闻舆情分析',
    description: '分析市场新闻情绪',
    category: 'fundamental',
    icon: '📰',
    estimatedDuration: 5,
    workflow: [
      '获取最新新闻',
      '分析情感倾向',
      '识别关键事件',
    ],
    output: ['新闻列表', '情绪指数', '关键事件'],
  },
  {
    id: 'fund-flow-analysis',
    name: '资金流向分析',
    description: '分析主力资金和龙虎榜数据',
    category: 'technical',
    icon: '💸',
    estimatedDuration: 6,
    workflow: [
      '获取资金流向数据',
      '分析主力资金动向',
      '查看龙虎榜数据',
    ],
    output: ['资金流向图', '主力资金', '龙虎榜'],
  },
  {
    id: 'financial-analysis',
    name: '财务报表分析',
    description: '深度分析财务数据',
    category: 'fundamental',
    icon: '📋',
    estimatedDuration: 12,
    workflow: [
      '获取财务报表',
      '分析财务指标',
      '识别趋势变化',
    ],
    output: ['财务报表', '财务指标', '趋势分析'],
  },
  {
    id: 'full-report',
    name: '完整尽职调查报告',
    description: '生成完整的分析报告',
    category: 'report',
    icon: '📄',
    estimatedDuration: 30,
    workflow: [
      '整合所有分析结果',
      '生成可视化图表',
      '编写分析摘要',
      '导出PDF/HTML',
    ],
    output: ['完整报告', 'PDF文件', 'HTML文件'],
    skillPath: '/skills/report/full-report/SKILL.md',
  },
  {
    id: 'risk-dashboard',
    name: '风险仪表盘',
    description: '核心风险指标监控',
    category: 'risk',
    icon: '🛡️',
    estimatedDuration: 10,
    workflow: [
      '收集风险指标',
      '评估风险等级',
      '生成风险报告',
    ],
    output: ['风险指标', '风险评分', '风险热力图'],
  },
  {
    id: 'tech-indicators',
    name: '技术指标分析',
    description: '综合技术指标分析',
    category: 'technical',
    icon: '🔬',
    estimatedDuration: 8,
    workflow: [
      '计算多个技术指标',
      '分析超买超卖',
      '判断买卖时机',
    ],
    output: ['技术指标', '买卖信号', '技术图表'],
  },
  {
    id: 'deep-financial',
    name: '深度财务分析',
    description: '财务风险深度挖掘',
    category: 'fundamental',
    icon: '📊',
    estimatedDuration: 20,
    workflow: [
      '详细财务报表分析',
      '现金流风险评估',
      '偿债能力分析',
      '盈利能力分析',
    ],
    output: ['深度财务报告', '风险指标', '财务预测'],
  },
];

const modes: AnalysisMode[] = [
  {
    id: 'quick-view',
    name: '⚡ 快速概览模式',
    description: '面向快速决策投资者 · 5分钟获取核心指标',
    icon: '⚡',
    skills: ['pe-pb-valuation', 'news-sentiment', 'fund-flow-analysis'],
    estimatedDuration: 5,
  },
  {
    id: 'deep-analysis',
    name: '💎 深度分析模式',
    description: '面向专业投资者 · 30分钟全面深度分析',
    icon: '💎',
    skills: ['dcf-valuation', 'pe-pb-valuation', 'financial-analysis', 'macd-analysis', 'tech-indicators'],
    estimatedDuration: 30,
  },
  {
    id: 'risk-diligence',
    name: '🛡️ 风控尽职模式',
    description: '面向风险控制 · 45分钟全面尽职调查',
    icon: '🛡️',
    skills: ['pledge-risk', 'deep-financial', 'risk-dashboard', 'news-sentiment', 'full-report'],
    estimatedDuration: 45,
  },
];

export function initSkills(): void {
  console.log('🔧 初始化技能系统...');

  skillRegistry.registerSkills(skills);
  console.log(`✅ 已注册 ${skills.length} 个技能`);

  modes.forEach(mode => skillRegistry.registerMode(mode));
  console.log(`✅ 已注册 ${modes.length} 个分析模式`);

  console.log('🎉 技能系统初始化完成');
}
