import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import dayjs from 'dayjs';

export interface ExportOptions {
  filename?: string;
  title?: string;
  symbol?: string;
}

/**
 * 显示加载提示
 */
const showLoadingMessage = (text: string): HTMLDivElement => {
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
    backdrop-filter: blur(8px);
  `;
  loadingMessage.textContent = text;
  document.body.appendChild(loadingMessage);
  return loadingMessage;
};

/**
 * 移除加载提示
 */
const removeLoadingMessage = (element: HTMLDivElement | null) => {
  if (element && element.parentNode) {
    document.body.removeChild(element);
  }
};

/**
 * 等待所有图片加载完成（用于确保ECharts等图表完全渲染）
 */
const waitForImages = (element: HTMLElement): Promise<void> => {
  return new Promise((resolve) => {
    const images = Array.from(element.getElementsByTagName('img'));
    if (images.length === 0) {
      resolve();
      return;
    }

    let loadedCount = 0;
    images.forEach((img) => {
      if (img.complete) {
        loadedCount++;
      } else {
        img.addEventListener('load', () => {
          loadedCount++;
          if (loadedCount === images.length) {
            resolve();
          }
        });
        img.addEventListener('error', () => {
          loadedCount++;
          if (loadedCount === images.length) {
            resolve();
          }
        });
      }
    });

    if (loadedCount === images.length) {
      resolve();
    }
  });
};

/**
 * 导出股票分析报告为 PDF（增强版 - 支持可视化图表）
 * @param elementId - 要导出的 DOM 元素 ID
 * @param options - 导出选项
 */
export const exportToPDF = async (
  elementId: string,
  options: ExportOptions = {}
): Promise<void> => {
  const {
    filename = `stock_analysis_${options.symbol || 'report'}_${dayjs().format('YYYYMMDD_HHmmss')}.pdf`,
    title = '上市公司自动分析报告',
    symbol = ''
  } = options;

  let loadingElement: HTMLDivElement | null = null;

  try {
    // 显示加载提示
    loadingElement = showLoadingMessage('📊 正在生成高质量 PDF，请稍候...');

    // 获取要导出的元素
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`未找到 ID 为 "${elementId}" 的元素`);
    }

    // 等待所有图片加载完成（确保图表完全渲染）
    await waitForImages(element);

    // 短暂延迟以确保所有异步渲染完成
    await new Promise(resolve => setTimeout(resolve, 500));

    // 使用 html2canvas 将 HTML 转换为 canvas
    const canvas = await html2canvas(element, {
      scale: 3, // 提高分辨率以获得更清晰的图表
      useCORS: true, // 允许跨域图片
      logging: false, // 关闭日志
      backgroundColor: '#ffffff',
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
      allowTaint: true, // 允许跨域内容
      imageTimeout: 15000, // 图片加载超时时间（毫秒）
      removeContainer: true, // 清理临时容器
      onclone: (clonedDoc) => {
        // 在克隆的文档中进行额外处理（如调整样式）
        const clonedElement = clonedDoc.getElementById(elementId);
        if (clonedElement) {
          // 确保背景色正确
          clonedElement.style.backgroundColor = '#ffffff';
        }
      }
    });

    // 计算 PDF 尺寸和分页
    const imgWidth = 210; // A4 宽度 (mm)
    const pageHeight = 297; // A4 高度 (mm)
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const marginTop = 25; // 顶部边距
    
    // 创建 PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true // 启用压缩以减小文件大小
    });

    // 添加精美封面页
    // 背景渐变效果（通过矩形模拟）
    pdf.setFillColor(102, 126, 234);
    pdf.rect(0, 0, imgWidth, pageHeight, 'F');
    
    // 标题区域背景（白色圆角矩形）
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(15, 60, imgWidth - 30, 120, 8, 8, 'F');
    
    // 主标题
    pdf.setFontSize(28);
    pdf.setTextColor(51, 51, 51);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, imgWidth / 2, 100, { align: 'center' });
    
    // 股票代码（如果有）
    if (symbol) {
      pdf.setFontSize(18);
      pdf.setTextColor(102, 126, 234);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`股票代码：${symbol}`, imgWidth / 2, 125, { align: 'center' });
    }
    
    // 分隔线
    pdf.setDrawColor(102, 126, 234);
    pdf.setLineWidth(0.5);
    pdf.line(imgWidth / 2 - 40, 135, imgWidth / 2 + 40, 135);
    
    // 生成时间
    pdf.setFontSize(13);
    pdf.setTextColor(100, 100, 100);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`生成时间：${dayjs().format('YYYY-MM-DD HH:mm:ss')}`, imgWidth / 2, 150, { align: 'center' });
    
    // 数据来源说明
    pdf.setFontSize(11);
    pdf.setTextColor(150, 150, 150);
    pdf.text('数据来源：AkShare | 通义千问AI分析 | 技能化架构', imgWidth / 2, 165, { align: 'center' });
    
    // 免责声明（底部）
    pdf.setFontSize(9);
    pdf.setTextColor(180, 180, 180);
    pdf.text('⚠️ 本报告仅供参考，不构成任何投资建议', imgWidth / 2, 260, { align: 'center' });

    // 添加内容页面（从第二页开始）
    let heightLeft = imgHeight;
    let position = 0;
    let pageNumber = 1;

    // 第一页内容（从封面后开始）
    pdf.addPage();
    pdf.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', 0, marginTop, imgWidth, imgHeight);
    heightLeft -= (pageHeight - marginTop);
    pageNumber++;

    // 如果内容超过一页，继续添加新页面
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      pageNumber++;
    }

    // 为所有内容页添加页脚（跳过封面）
    const totalPages = pdf.getNumberOfPages();
    for (let i = 2; i <= totalPages; i++) {
      pdf.setPage(i);
      
      // 页脚背景条
      pdf.setFillColor(245, 247, 250);
      pdf.rect(0, pageHeight - 15, imgWidth, 15, 'F');
      
      // 页码信息
      pdf.setFontSize(9);
      pdf.setTextColor(120, 120, 120);
      pdf.text(
        `第 ${i - 1} 页 / 共 ${totalPages - 1} 页`,
        imgWidth / 2,
        pageHeight - 6,
        { align: 'center' }
      );
      
      // 左侧标识
      pdf.setFontSize(8);
      pdf.text('股票智能分析系统', 10, pageHeight - 6);
      
      // 右侧日期
      pdf.text(dayjs().format('YYYY-MM-DD'), imgWidth - 10, pageHeight - 6, { align: 'right' });
    }

    // 保存 PDF
    pdf.save(filename);

    // 移除加载提示并显示成功消息
    removeLoadingMessage(loadingElement);
    loadingElement = showLoadingMessage('✅ PDF 导出成功！');
    setTimeout(() => removeLoadingMessage(loadingElement), 2000);

    console.log('PDF 导出成功:', filename, `(共 ${totalPages} 页)`);
  } catch (error) {
    // 移除加载提示并显示错误消息
    removeLoadingMessage(loadingElement);
    loadingElement = showLoadingMessage('❌ PDF 导出失败，请重试');
    setTimeout(() => removeLoadingMessage(loadingElement), 3000);

    console.error('PDF 导出失败:', error);
    throw error;
  }
};

/**
 * 导出当前页面为高清图片（支持可视化图表）
 * @param elementId - 要导出的 DOM 元素 ID
 * @param filename - 文件名
 */
export const exportToImage = async (
  elementId: string,
  filename: string = `stock_analysis_${dayjs().format('YYYYMMDD_HHmmss')}.png`
): Promise<void> => {
  let loadingElement: HTMLDivElement | null = null;

  try {
    loadingElement = showLoadingMessage('🖼️ 正在生成高清图片...');
    
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`未找到 ID 为 "${elementId}" 的元素`);
    }

    // 等待所有图片加载完成
    await waitForImages(element);
    await new Promise(resolve => setTimeout(resolve, 300));

    const canvas = await html2canvas(element, {
      scale: 3, // 超高分辨率以获得清晰图片
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      allowTaint: true,
      imageTimeout: 15000,
    });

    // 转换为图片并下载
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png', 1.0); // 最高质量
    link.click();

    // 显示成功消息
    removeLoadingMessage(loadingElement);
    loadingElement = showLoadingMessage('✅ 图片导出成功！');
    setTimeout(() => removeLoadingMessage(loadingElement), 2000);

    console.log('图片导出成功:', filename);
  } catch (error) {
    removeLoadingMessage(loadingElement);
    loadingElement = showLoadingMessage('❌ 图片导出失败，请重试');
    setTimeout(() => removeLoadingMessage(loadingElement), 3000);
    
    console.error('图片导出失败:', error);
    throw error;
  }
};
