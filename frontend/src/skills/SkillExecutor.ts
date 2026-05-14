/**
 * 技能执行引擎
 * 负责执行技能链并跟踪进度
 */

import { SkillExecutionResult, AnalysisReport } from './types';
import { skillRegistry } from './SkillRegistry';

export class SkillExecutor {
  private results: Map<string, SkillExecutionResult> = new Map();
  private onProgressCallback?: (results: SkillExecutionResult[]) => void;

  /**
   * 设置进度回调
   */
  setProgressCallback(callback: (results: SkillExecutionResult[]) => void): void {
    this.onProgressCallback = callback;
  }

  /**
   * 执行单个技能
   */
  async executeSkill(skillId: string): Promise<SkillExecutionResult> {
    const skill = skillRegistry.getSkill(skillId);
    if (!skill) {
      throw new Error(`技能 ${skillId} 不存在`);
    }

    const result: SkillExecutionResult = {
      skillId,
      status: 'running',
      progress: 0,
      startTime: Date.now(),
    };

    this.results.set(skillId, result);
    this.notifyProgress();

    try {
      // TODO: 这里将来会调用实际的技能执行逻辑
      // 目前模拟执行过程
      await this.simulateSkillExecution(skillId, result);

      result.status = 'completed';
      result.progress = 100;
      result.endTime = Date.now();
      result.data = { message: `${skill.name} 执行完成` };
    } catch (error: any) {
      result.status = 'failed';
      result.error = error.message;
      result.endTime = Date.now();
    }

    this.results.set(skillId, result);
    this.notifyProgress();

    return result;
  }

  /**
   * 执行技能链（多个技能顺序执行）
   */
  async executeSkillChain(skillIds: string[]): Promise<SkillExecutionResult[]> {
    const results: SkillExecutionResult[] = [];

    for (const skillId of skillIds) {
      const result = await this.executeSkill(skillId);
      results.push(result);

      // 如果某个技能失败，可以选择继续或停止
      if (result.status === 'failed') {
        console.error(`技能 ${skillId} 执行失败: ${result.error}`);
        // 这里可以选择 break 停止执行，或者继续执行后续技能
      }
    }

    return results;
  }

  /**
   * 执行分析模式（包含多个技能）
   */
  async executeMode(modeId: string, data: any): Promise<AnalysisReport> {
    const mode = skillRegistry.getMode(modeId);
    if (!mode) {
      throw new Error(`分析模式 ${modeId} 不存在`);
    }

    const results = await this.executeSkillChain(mode.skills);

    const report: AnalysisReport = {
      symbol: data.symbol || 'unknown',
      mode: modeId,
      generatedAt: new Date().toISOString(),
      results,
      summary: this.generateSummary(results),
      charts: [], // TODO: 从结果中提取图表数据
      exportFormats: ['pdf', 'html'],
    };

    return report;
  }

  /**
   * 获取所有执行结果
   */
  getAllResults(): SkillExecutionResult[] {
    return Array.from(this.results.values());
  }

  /**
   * 获取指定技能的结果
   */
  getResult(skillId: string): SkillExecutionResult | undefined {
    return this.results.get(skillId);
  }

  /**
   * 重置所有结果
   */
  reset(): void {
    this.results.clear();
  }

  /**
   * 通知进度更新
   */
  private notifyProgress(): void {
    if (this.onProgressCallback) {
      this.onProgressCallback(this.getAllResults());
    }
  }

  /**
   * 模拟技能执行（用于演示）
   */
  private async simulateSkillExecution(skillId: string, result: SkillExecutionResult): Promise<void> {
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      await new Promise(resolve => setTimeout(resolve, 200));
      result.progress = (i / steps) * 100;
      this.results.set(skillId, result);
      this.notifyProgress();
    }
  }

  /**
   * 生成执行摘要
   */
  private generateSummary(results: SkillExecutionResult[]): string {
    const completed = results.filter(r => r.status === 'completed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const total = results.length;

    return `分析完成: ${completed}/${total} 个技能成功执行${failed > 0 ? `, ${failed} 个失败` : ''}`;
  }
}

// 导出单例
export const skillExecutor = new SkillExecutor();
