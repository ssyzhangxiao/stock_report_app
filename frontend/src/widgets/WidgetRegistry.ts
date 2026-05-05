/**
 * Widget组件注册表
 * 管理所有可用的Widget组件，支持动态注册、查找和渲染
 * 替代Dashboard中固化的switch-case语句
 */

import type { WidgetMeta, WidgetComponent, WidgetRegistration } from './types';

class WidgetRegistry {
  private widgets: Map<string, WidgetRegistration> = new Map();

  /**
   * 注册一个Widget组件
   */
  register(meta: WidgetMeta, component: WidgetComponent): void {
    if (this.widgets.has(meta.id)) {
      console.warn(`Widget "${meta.id}" 已存在，将被覆盖`);
    }
    this.widgets.set(meta.id, { meta, component });
  }

  /**
   * 批量注册Widget组件
   */
  registerAll(registrations: Array<{ meta: WidgetMeta; component: WidgetComponent }>): void {
    registrations.forEach(({ meta, component }) => this.register(meta, component));
  }

  /**
   * 获取指定Widget的注册信息
   */
  get(id: string): WidgetRegistration | undefined {
    return this.widgets.get(id);
  }

  /**
   * 获取Widget组件
   */
  getComponent(id: string): WidgetComponent | undefined {
    return this.widgets.get(id)?.component;
  }

  /**
   * 获取Widget元数据
   */
  getMeta(id: string): WidgetMeta | undefined {
    return this.widgets.get(id)?.meta;
  }

  /**
   * 检查Widget是否已注册
   */
  has(id: string): boolean {
    return this.widgets.has(id);
  }

  /**
   * 获取所有已注册的Widget
   */
  getAll(): WidgetRegistration[] {
    return Array.from(this.widgets.values());
  }

  /**
   * 获取所有已实现的Widget（非占位）
   */
  getImplemented(): WidgetRegistration[] {
    return this.getAll().filter(w => w.meta.implemented);
  }

  /**
   * 按分类获取Widget
   */
  getByCategory(category: string): WidgetRegistration[] {
    return this.getAll().filter(w => w.meta.category === category);
  }

  /**
   * 按标签获取Widget
   */
  getByTag(tag: string): WidgetRegistration[] {
    return this.getAll().filter(w => w.meta.tags?.includes(tag));
  }

  /**
   * 获取Widget数量
   */
  get count(): number {
    return this.widgets.size;
  }

  /**
   * 注销Widget
   */
  unregister(id: string): boolean {
    return this.widgets.delete(id);
  }

  /**
   * 清空所有注册
   */
  clear(): void {
    this.widgets.clear();
  }
}

/** 全局单例 */
export const widgetRegistry = new WidgetRegistry();
