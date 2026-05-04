export interface RiskItem {
  name: string;
  score: number; // 0-100
  level: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

export const getRiskLevel = (score: number): RiskItem['level'] => {
  if (score < 30) return 'low';
  if (score < 50) return 'medium';
  if (score < 70) return 'high';
  return 'critical';
};

export const getRiskLevelLabel = (level: RiskItem['level']): string => {
  switch (level) {
    case 'low': return '低';
    case 'medium': return '中';
    case 'high': return '高';
    case 'critical': return '极高';
    default: return '未知';
  }
};

export const getRiskLevelColor = (level: RiskItem['level']): string => {
  switch (level) {
    case 'low': return '#52c41a';
    case 'medium': return '#faad14';
    case 'high': return '#ff7a45';
    case 'critical': return '#ff4d4f';
    default: return '#8c8c8c';
  }
};

// 共享的风险数据
export const riskItems: RiskItem[] = [
  {
    name: '市场风险',
    score: 45,
    level: 'medium',
    description: '当前市场波动适中，但需警惕系统性风险'
  },
  {
    name: '财务风险',
    score: 32,
    level: 'low',
    description: '财务状况稳健，负债率适中，现金流健康'
  },
  {
    name: '经营风险',
    score: 58,
    level: 'medium',
    description: '行业竞争加剧，需关注营收增长可持续性'
  },
  {
    name: '治理风险',
    score: 25,
    level: 'low',
    description: '治理结构完善，内部控制有效'
  },
  {
    name: '流动性风险',
    score: 38,
    level: 'low',
    description: '流动性充裕，短期偿债能力强'
  },
  {
    name: '政策风险',
    score: 62,
    level: 'high',
    description: '行业监管趋严，政策不确定性较高'
  },
  {
    name: '质押风险',
    score: 42,
    level: 'medium',
    description: '质押比例适中，平仓风险可控'
  },
  {
    name: '重组风险',
    score: 70,
    level: 'high',
    description: '存在重组预期，但进展存在不确定性'
  }
];

// 计算综合风险评分
export const calculateOverallScore = (items: RiskItem[] = riskItems): number => {
  const sum = items.reduce((acc, item) => acc + item.score, 0);
  return Math.round(sum / items.length);
};

// 计算各风险等级的统计
export const calculateRiskStats = (items: RiskItem[] = riskItems) => {
  const stats = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0
  };
  
  items.forEach(item => {
    stats[item.level]++;
  });
  
  return stats;
};
