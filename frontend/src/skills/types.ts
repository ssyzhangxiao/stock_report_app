/**
 * 技能系统类型定义
 */

export type SkillCategory = 'valuation' | 'technical' | 'risk' | 'fundamental' | 'report';

export interface Skill {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;
  icon?: string;
  estimatedDuration?: number; // 预计执行时间（秒）
  requiredData?: string[]; // 需要的数据字段
  workflow: string[]; // 工作流程步骤
  output: string[]; // 输出内容
  skillPath?: string; // SKILL.md 文件路径
}

export interface AnalysisMode {
  id: string;
  name: string;
  description: string;
  icon: string;
  skills: string[]; // 包含的技能ID列表
  estimatedDuration: number; // 总预计时间（秒）
  outputTemplate?: string; // 输出模板
}

export interface SkillExecutionResult {
  skillId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number; // 0-100
  data?: any; // 技能输出的数据
  error?: string; // 错误信息
  startTime?: number;
  endTime?: number;
}

export interface AnalysisReport {
  symbol: string;
  mode: string;
  generatedAt: string;
  results: SkillExecutionResult[];
  summary: string;
  charts: any[]; // 图表数据
  exportFormats: ('pdf' | 'html' | 'png')[];
}
