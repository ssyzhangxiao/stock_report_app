/**
 * 技能注册表
 * 负责管理所有可用的分析技能
 */

import { Skill, SkillCategory, AnalysisMode } from './types';

class SkillRegistry {
  private skills: Map<string, Skill> = new Map();
  private modes: Map<string, AnalysisMode> = new Map();

  /**
   * 注册一个技能
   */
  registerSkill(skill: Skill): void {
    if (this.skills.has(skill.id)) {
      console.warn(`技能 ${skill.id} 已存在，将被覆盖`);
    }
    this.skills.set(skill.id, skill);
  }

  /**
   * 获取技能
   */
  getSkill(id: string): Skill | undefined {
    return this.skills.get(id);
  }

  /**
   * 获取所有技能
   */
  getAllSkills(): Skill[] {
    return Array.from(this.skills.values());
  }

  /**
   * 按分类获取技能
   */
  getSkillsByCategory(category: SkillCategory): Skill[] {
    return this.getAllSkills().filter(skill => skill.category === category);
  }

  /**
   * 注册分析模式
   */
  registerMode(mode: AnalysisMode): void {
    this.modes.set(mode.id, mode);
  }

  /**
   * 获取分析模式
   */
  getMode(id: string): AnalysisMode | undefined {
    return this.modes.get(id);
  }

  /**
   * 获取所有分析模式
   */
  getAllModes(): AnalysisMode[] {
    return Array.from(this.modes.values());
  }

  /**
   * 批量注册技能
   */
  registerSkills(skills: Skill[]): void {
    skills.forEach(skill => this.registerSkill(skill));
  }

  /**
   * 检查技能是否存在
   */
  hasSkill(id: string): boolean {
    return this.skills.has(id);
  }

  /**
   * 获取技能数量
   */
  getSkillCount(): number {
    return this.skills.size;
  }
}

// 导出单例
export const skillRegistry = new SkillRegistry();
