import { PeerCompany } from '../types/stock';

/**
 * 根据股票数据生成可比公司列表
 * @param symbol 股票代码
 * @param stockData 股票分析数据
 * @returns 可比公司列表
 */
export function generatePeerCompanies(symbol: string, stockData?: any): PeerCompany[] {
  // 以贵州茅台(600519)为例
  if (symbol === '600519' || !stockData) {
    return [
      { name: '贵州茅台', marketCap: 18500, peRatio: 28.5, pbRatio: 6.4, isTarget: true },
      { name: '*ST岩石', marketCap: 215, peRatio: -15.2, pbRatio: 4.4, isTarget: false },
      { name: '山西汾酒', marketCap: 2800, peRatio: 22.3, pbRatio: 3.9, isTarget: false },
      { name: '酒鬼酒', marketCap: 480, peRatio: 32.1, pbRatio: 3.7, isTarget: false },
      { name: '水井坊', marketCap: 320, peRatio: 25.8, pbRatio: 3.0, isTarget: false },
      { name: '五粮液', marketCap: 5200, peRatio: 20.5, pbRatio: 2.9, isTarget: false },
      { name: '泸州老窖', marketCap: 3500, peRatio: 23.2, pbRatio: 2.9, isTarget: false },
      { name: '迎驾贡酒', marketCap: 620, peRatio: 21.8, pbRatio: 2.7, isTarget: false },
      { name: '舍得酒业', marketCap: 520, peRatio: 26.5, pbRatio: 2.6, isTarget: false },
      { name: '今世缘', marketCap: 720, peRatio: 19.2, pbRatio: 2.4, isTarget: false }
    ];
  }

  // 如果有股票数据，从中提取信息生成可比公司
  const companyName = stockData?.company_info?.name || symbol;
  const currentPe = stockData?.valuation?.pe_ratio || 20;
  const currentPb = stockData?.valuation?.pb_ratio || 3;
  const currentMarketCap = parseFloat(stockData?.valuation?.market_cap || '1000');

  // 生成基础的可比公司列表（这里可以根据行业智能匹配）
  return [
    { name: companyName, marketCap: currentMarketCap, peRatio: currentPe, pbRatio: currentPb, isTarget: true },
    { name: '可比公司A', marketCap: currentMarketCap * 1.2, peRatio: currentPe * 0.9, pbRatio: currentPb * 0.8, isTarget: false },
    { name: '可比公司B', marketCap: currentMarketCap * 0.8, peRatio: currentPe * 1.1, pbRatio: currentPb * 1.2, isTarget: false },
    { name: '可比公司C', marketCap: currentMarketCap * 1.5, peRatio: currentPe * 1.2, pbRatio: currentPb * 1.5, isTarget: false },
    { name: '可比公司D', marketCap: currentMarketCap * 0.6, peRatio: currentPe * 0.7, pbRatio: currentPb * 0.6, isTarget: false },
    { name: '可比公司E', marketCap: currentMarketCap * 2.0, peRatio: currentPe * 1.5, pbRatio: currentPb * 1.8, isTarget: false },
    { name: '可比公司F', marketCap: currentMarketCap * 0.5, peRatio: currentPe * 0.8, pbRatio: currentPb * 0.5, isTarget: false },
    { name: '可比公司G', marketCap: currentMarketCap * 1.3, peRatio: currentPe * 1.0, pbRatio: currentPb * 1.1, isTarget: false },
    { name: '可比公司H', marketCap: currentMarketCap * 0.9, peRatio: currentPe * 1.3, pbRatio: currentPb * 1.3, isTarget: false },
    { name: '可比公司I', marketCap: currentMarketCap * 1.8, peRatio: currentPe * 1.4, pbRatio: currentPb * 1.6, isTarget: false }
  ];
}

/**
 * 根据行业代码获取预定义的可比公司列表
 * @param industryCode 行业代码
 * @returns 可比公司列表
 */
export function getPeerCompaniesByIndustry(industryCode: string): PeerCompany[] {
  const industryMaps: Record<string, PeerCompany[]> = {
    '白酒': [
      { name: '贵州茅台', marketCap: 18500, peRatio: 28.5, pbRatio: 6.4, isTarget: true },
      { name: '五粮液', marketCap: 5200, peRatio: 20.5, pbRatio: 2.9, isTarget: false },
      { name: '山西汾酒', marketCap: 2800, peRatio: 22.3, pbRatio: 3.9, isTarget: false },
      { name: '泸州老窖', marketCap: 3500, peRatio: 23.2, pbRatio: 2.9, isTarget: false },
      { name: '酒鬼酒', marketCap: 480, peRatio: 32.1, pbRatio: 3.7, isTarget: false },
      { name: '水井坊', marketCap: 320, peRatio: 25.8, pbRatio: 3.0, isTarget: false },
      { name: '舍得酒业', marketCap: 520, peRatio: 26.5, pbRatio: 2.6, isTarget: false },
      { name: '迎驾贡酒', marketCap: 620, peRatio: 21.8, pbRatio: 2.7, isTarget: false },
      { name: '今世缘', marketCap: 720, peRatio: 19.2, pbRatio: 2.4, isTarget: false },
      { name: '*ST岩石', marketCap: 215, peRatio: -15.2, pbRatio: 4.4, isTarget: false }
    ]
  };

  return industryMaps[industryCode] || industryMaps['白酒'];
}
