import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import dayjs from 'dayjs';

export interface ExportOptions {
  filename?: string;
  title?: string;
  symbol?: string;
}

/**
 * 导出股票分析报告为 PDF
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

  try {
    // 显示加载提示
    const loadingMessage = document.createElement('div');
    loadingMessage.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 20px 40px;
      border-radius: 8px;
      z-index: 9999;
      font-size: 16px;
    `;
    loadingMessage.textContent = '正在生成 PDF，请稍候...';
    document.body.appendChild(loadingMessage);

    // 获取要导出的元素
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`未找到 ID 为 "${elementId}" 的元素`);
    }

    // 使用 html2canvas 将 HTML 转换为 canvas
    const canvas = await html2canvas(element, {
      scale: 2, // 提高分辨率
      useCORS: true, // 允许跨域图片
      logging: false, // 关闭日志
      backgroundColor: '#ffffff',
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight
    });

    // 计算 PDF 尺寸
    const imgWidth = 210; // A4 宽度 (mm)
    const pageHeight = 297; // A4 高度 (mm)
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // 创建 PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // 添加封面
    pdf.setFontSize(24);
    pdf.setTextColor(33, 33, 33);
    pdf.text(title, imgWidth / 2, 40, { align: 'center' });
    
    if (symbol) {
      pdf.setFontSize(16);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`股票代码：${symbol}`, imgWidth / 2, 60, { align: 'center' });
    }
    
    pdf.setFontSize(12);
    pdf.text(`生成时间：${dayjs().format('YYYY-MM-DD HH:mm:ss')}`, imgWidth / 2, 75, { align: 'center' });
    
    pdf.setFontSize(10);
    pdf.setTextColor(150, 150, 150);
    pdf.text('数据来源：AkShare | 仅供参考，不构成投资建议', imgWidth / 2, 90, { align: 'center' });

    // 添加分隔线
    pdf.setDrawColor(200, 200, 200);
    pdf.line(20, 100, imgWidth - 20, 100);

    // 添加内容图片（从第二页开始）
    let heightLeft = imgHeight;
    let position = 0;
    const marginTop = 20;

    // 第一页内容
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, marginTop, imgWidth, imgHeight);
    heightLeft -= (pageHeight - marginTop);

    // 如果内容超过一页，添加新页面
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // 添加页脚
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text(
        `第 ${i} 页 / 共 ${totalPages} 页`,
        imgWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }

    // 保存 PDF
    pdf.save(filename);

    // 移除加载提示
    document.body.removeChild(loadingMessage);

    console.log('PDF 导出成功:', filename);
  } catch (error) {
    // 移除加载提示
    const loadingMessage = document.querySelector('div[style*="z-index: 9999"]');
    if (loadingMessage) {
      document.body.removeChild(loadingMessage);
    }

    console.error('PDF 导出失败:', error);
    throw error;
  }
};

/**
 * 导出当前页面为图片
 * @param elementId - 要导出的 DOM 元素 ID
 * @param filename - 文件名
 */
export const exportToImage = async (
  elementId: string,
  filename: string = `stock_analysis_${dayjs().format('YYYYMMDD_HHmmss')}.png`
): Promise<void> => {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`未找到 ID 为 "${elementId}" 的元素`);
    }

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    // 转换为图片并下载
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();

    console.log('图片导出成功:', filename);
  } catch (error) {
    console.error('图片导出失败:', error);
    throw error;
  }
};
