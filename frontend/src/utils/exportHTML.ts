import dayjs from 'dayjs';

export interface HTMLExportOptions {
  filename?: string;
  title?: string;
  symbol?: string;
  includeStyles?: boolean;
}

/**
 * 导出股票分析报告为独立HTML文件
 * @param elementId - 要导出的 DOM 元素 ID
 * @param options - 导出选项
 */
export const exportToHTML = async (
  elementId: string,
  options: HTMLExportOptions = {}
): Promise<void> => {
  const {
    filename = `stock_analysis_${options.symbol || 'report'}_${dayjs().format('YYYYMMDD_HHmmss')}.html`,
    title = '上市公司自动分析报告',
    symbol = '',
    includeStyles = true
  } = options;

  try {
    // 显示加载提示
    const loadingMessage = document.createElement('div');
    loadingMessage.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.85);
      color: white;
      padding: 24px 48px;
      border-radius: 12px;
      z-index: 99999;
      font-size: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    `;
    loadingMessage.textContent = '🌐 正在生成 HTML 报告...';
    document.body.appendChild(loadingMessage);

    // 获取要导出的元素
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`未找到 ID 为 "${elementId}" 的元素`);
    }

    // 克隆元素以避免修改原始DOM
    const clonedElement = element.cloneNode(true) as HTMLElement;

    // 移除不需要的交互元素（按钮、输入框等）
    const interactiveElements = clonedElement.querySelectorAll('button, input, textarea, select');
    interactiveElements.forEach(el => el.remove());

    // 提取并内联样式
    let stylesContent = '';
    if (includeStyles) {
      const stylesheets = Array.from(document.styleSheets);
      stylesContent = stylesheets
        .map(sheet => {
          try {
            return Array.from(sheet.cssRules)
              .map(rule => rule.cssText)
              .join('\n');
          } catch (e) {
            // 跨域样式表可能无法访问
            return '';
          }
        })
        .filter(css => css.length > 0)
        .join('\n');
    }

    // 构建完整的HTML文档
    const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}${symbol ? ` - ${symbol}` : ''}</title>
  <style>
    /* 基础重置 */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
        'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      background: #f5f7fa;
      color: #262626;
      line-height: 1.6;
    }
    
    /* 内联应用样式 */
    ${stylesContent}
    
    /* 打印优化 */
    @media print {
      body {
        background: white;
      }
      
      .no-print {
        display: none !important;
      }
      
      page-break-inside: avoid;
    }
    
    /* 响应式布局 */
    @media (max-width: 768px) {
      .container {
        padding: 12px !important;
      }
    }
  </style>
</head>
<body>
  <!-- 报告头部信息 -->
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px; color: white;">
    <div style="max-width: 1200px; margin: 0 auto;">
      <h1 style="font-size: 28px; margin-bottom: 8px;">${title}</h1>
      ${symbol ? `<p style="font-size: 16px; opacity: 0.9;">股票代码：${symbol}</p>` : ''}
      <p style="font-size: 14px; opacity: 0.8; margin-top: 8px;">
        生成时间：${dayjs().format('YYYY-MM-DD HH:mm:ss')}
      </p>
      <p style="font-size: 12px; opacity: 0.7; margin-top: 4px;">
        数据来源：AkShare | 通义千问AI分析 | 技能化架构
      </p>
    </div>
  </div>

  <!-- 主要内容区域 -->
  <div class="container" style="max-width: 1200px; margin: 24px auto; padding: 0 24px;">
    ${clonedElement.innerHTML}
  </div>

  <!-- 页脚 -->
  <div style="text-align: center; padding: 32px 24px; color: #8c8c8c; font-size: 12px; background: white; margin-top: 32px;">
    <p>⚠️ 本报告仅供参考，不构成任何投资建议</p>
    <p style="margin-top: 8px;">
      股票智能分析系统 · 多源数据驱动 · 可视化报告
    </p>
    <p style="margin-top: 4px; opacity: 0.7;">
      © ${new Date().getFullYear()} All Rights Reserved
    </p>
  </div>

  <!-- 打印按钮（仅在屏幕显示） -->
  <div class="no-print" style="position: fixed; bottom: 24px; right: 24px; z-index: 1000;">
    <button onclick="window.print()" style="
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      transition: all 0.3s ease;
    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(102, 126, 234, 0.5)'" 
       onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(102, 126, 234, 0.4)'">
      🖨️ 打印报告
    </button>
  </div>
</body>
</html>`;

    // 创建Blob并下载
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // 移除加载提示并显示成功消息
    document.body.removeChild(loadingMessage);
    const successMessage = document.createElement('div');
    successMessage.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.85);
      color: white;
      padding: 24px 48px;
      border-radius: 12px;
      z-index: 99999;
      font-size: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    `;
    successMessage.textContent = '✅ HTML 报告导出成功！';
    document.body.appendChild(successMessage);
    setTimeout(() => {
      if (successMessage.parentNode) {
        document.body.removeChild(successMessage);
      }
    }, 2000);
  } catch (error) {
    // 移除加载提示并显示错误消息
    const loadingMessage = document.querySelector('div[style*="z-index: 99999"]');
    if (loadingMessage) {
      document.body.removeChild(loadingMessage);
    }

    const errorMessage = document.createElement('div');
    errorMessage.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.85);
      color: white;
      padding: 24px 48px;
      border-radius: 12px;
      z-index: 99999;
      font-size: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    `;
    errorMessage.textContent = '❌ HTML 报告导出失败，请重试';
    document.body.appendChild(errorMessage);
    setTimeout(() => {
      if (errorMessage.parentNode) {
        document.body.removeChild(errorMessage);
      }
    }, 3000);

    console.error('HTML 报告导出失败:', error);
    throw error;
  }
};
