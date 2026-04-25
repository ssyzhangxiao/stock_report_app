# 上市公司自动分析报告 - 开发计划

> 本文档详细描述了项目的开发阶段、任务分解和验收标准。

## 📋 项目概览

**项目名称**: 上市公司自动分析报告系统  
**技术栈**: React + FastAPI + AkShare  
**开发周期**: 15-18 工作日  
**目标用户**: 投研团队、股票分析师  

### 核心功能
- ✅ 单只股票深度分析（22+ 数据接口）
- ✅ 专业级可视化（K线图、资金流向、筹码分布）
- ✅ 手工风险分析编辑器
- ✅ 一键导出 PDF 报告

---

## 🗓️ 开发阶段详解

### 阶段 1：环境搭建与基础架构（Day 1-3）

#### Day 1: 项目初始化

**后端任务**:
- [ ] 创建 FastAPI 项目骨架
  - [ ] 初始化目录结构 `backend/app/`
  - [ ] 创建 `requirements.txt` 并安装依赖
  - [ ] 配置 CORS 中间件（允许前端 5173 端口）
  - [ ] 创建 `main.py` 并启动测试
- [ ] 验证后端服务
  - [ ] 访问 http://localhost:8000 显示欢迎信息
  - [ ] 访问 http://localhost:8000/docs 显示 API 文档

**前端任务**:
- [ ] 创建 Vite + React + TypeScript 项目
  - [ ] 初始化目录结构 `frontend/src/`
  - [ ] 安装核心依赖（React, Ant Design, ECharts, Axios）
  - [ ] 配置 `vite.config.ts` 代理（转发 /api 到后端）
  - [ ] 创建基础 `App.tsx` 组件
- [ ] 验证前端页面
  - [ ] 访问 http://localhost:5173 显示 "Hello World"

**验收标准**:
- ✅ 后端 `/health` 接口返回 `{"status": "ok"}`
- ✅ 前端页面可正常访问
- ✅ 前后端连通性测试通过（前端可调用后端 API）

**产出文件**:
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py
│   └── api/__init__.py
├── requirements.txt
└── .env.example

frontend/
├── src/
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

#### Day 2: 数据获取层实现

**核心任务**:
- [ ] 实现 `DataFetcher` 类（参考 daily_stock_analysis 架构）
  - [ ] `get_daily(symbol, years, adjust)` - 历史行情数据
  - [ ] `get_company_info(symbol)` - 公司基本信息
  - [ ] `get_financial_indicators(symbol)` - 财务分析指标
- [ ] 数据清洗与格式化
  - [ ] 字段重命名（中文 → 英文）
  - [ ] 日期格式转换
  - [ ] 空值处理
- [ ] 编写单元测试
  - [ ] 测试股票代码：600519（贵州茅台）
  - [ ] 验证返回数据类型和字段完整性

**技术要点**:
```python
# 数据获取示例
class DataFetcher:
    def get_daily(self, symbol: str, years: int = 2) -> pd.DataFrame:
        df = ak.stock_zh_a_hist(symbol=symbol, ...)
        df.rename(columns={'日期': 'date', '收盘': 'close', ...})
        return df
```

**验收标准**:
- ✅ 可成功获取任意 A 股的历史行情（至少 2 年数据）
- ✅ 数据字段正确映射（date, open, close, high, low, volume...）
- ✅ 异常处理完善（无效股票代码返回友好提示）

**产出文件**:
```
backend/app/services/
├── __init__.py
└── data_fetcher.py
```

---

#### Day 3: API 接口开发与联调

**后端任务**:
- [ ] 创建 `/api/analysis/stock/{symbol}` 接口
  - [ ] 接收参数：symbol（股票代码）、years（历史年数）
  - [ ] 调用 DataFetcher 获取数据
  - [ ] 添加技术指标（MA5/MA20/MA60, MACD, RSI）
  - [ ] 返回 JSON 响应
- [ ] 实现技术指标计算
  - [ ] `add_technical_indicators(df)` - 批量计算
  - [ ] `extract_indicators(latest_row)` - 提取最新值

**前端任务**:
- [ ] 创建 Dashboard 页面
  - [ ] 输入框（股票代码）
  - [ ] 分析按钮
  - [ ] Loading 状态展示
  - [ ] 错误提示（message.error）
- [ ] API 调用封装
  - [ ] 创建 `api/stockApi.ts`
  - [ ] Axios 实例配置
  - [ ] 类型定义（TypeScript Interface）
- [ ] 展示基础数据
  - [ ] 最新价格
  - [ ] 涨跌幅
  - [ ] 成交量

**验收标准**:
- ✅ 输入 `600519`，3 秒内返回完整数据
- ✅ 前端展示最新价格和涨跌幅
- ✅ 网络错误时显示友好提示

**产出文件**:
```
backend/app/api/
└── analysis.py

backend/app/services/
└── indicators.py

frontend/src/
├── pages/Dashboard.tsx
└── api/stockApi.ts
```

---

### 阶段 2：财务与风险模块（Day 4-8）

#### Day 4-5: 财务深度分析

**后端任务**:
- [ ] 扩展 DataFetcher
  - [ ] `get_balance_sheet(symbol)` - 资产负债表
  - [ ] `get_cashflow(symbol)` - 现金流量表
  - [ ] `get_profit_forecast(symbol)` - 盈利预测
- [ ] 创建 `financial_analyzer.py`
  - [ ] 杜邦分析法（ROE = 净利率 × 周转率 × 杠杆率）
  - [ ] 负债率计算（资产负债率、流动比率、速动比率）
  - [ ] 现金流健康度评估（经营现金流 > 净利润为佳）
- [ ] 估值数据分析
  - [ ] PE（市盈率）、PB（市净率）、PS（市销率）
  - [ ] 总市值、流通市值

**前端任务**:
- [ ] 创建 `DeepFinancialTable` 组件
  - [ ] Tabs 切换（财务指标 / 资产负债表 / 现金流）
  - [ ] Table 展示最近 5 期数据
  - [ ] 关键指标高亮显示（ROE > 15% 绿色）
- [ ] 创建 `ValuationCard` 组件
  - [ ] 估值指标卡片布局
  - [ ] 行业对比（如有数据）

**验收标准**:
- ✅ 完整展示 5 期财务数据
- ✅ ROE、负债率等关键指标正确计算
- ✅ 表格支持排序和筛选

**产出文件**:
```
backend/app/services/
└── financial_analyzer.py

frontend/src/components/tables/
└── DeepFinancialTable.tsx

frontend/src/components/cards/
└── ValuationCard.tsx
```

---

#### Day 6-7: 风险指标采集

**后端任务**:
- [ ] 实现风险数据获取
  - [ ] `get_pledge_ratio(symbol, date)` - 股权质押比例（⚠️ 全市场筛选）
  - [ ] `get_pledge_detail(symbol)` - 质押明细
  - [ ] `get_goodwill(symbol)` - 商誉数据
  - [ ] `get_insider_holdings(symbol)` - 高管持股（分沪市/深市）
- [ ] 创建 `risk_detector.py`
  - [ ] 质押率告警规则
    - 🟢 < 30%: 安全
    - 🟡 30%-50%: 注意
    - 🔴 > 50%: 高风险
  - [ ] 商誉占比分析（商誉 / 总资产 > 20% 预警）
  - [ ] 高管增减持信号（近 6 个月变动）

**前端任务**:
- [ ] 创建 `RiskIndicatorsPanel` 组件
  - [ ] 质押比例进度条（颜色分级）
  - [ ] 商誉风险提示卡片
  - [ ]  collapsible 折叠面板（展开查看明细）
- [ ] 创建 `PledgeRatioTable` 和 `InsiderHoldingsTable`
  - [ ] 表格展示详细数据
  - [ ] 时间轴排序

**验收标准**:
- ✅ 质押率正确计算并分级显示
- ✅ 商誉数据完整展示
- ✅ 高管持股变动清晰可见

**产出文件**:
```
backend/app/services/
└── risk_detector.py

frontend/src/components/panels/
└── RiskIndicatorsPanel.tsx

frontend/src/components/tables/
├── PledgeRatioTable.tsx
└── InsiderHoldingsTable.tsx
```

---

#### Day 8: 筹码分布与融资融券

**后端任务**:
- [ ] 实现筹码数据获取
  - [ ] `get_cyq(symbol, adjust)` - 筹码分布
  - [ ] `get_margin_balance(symbol)` - 融资融券（⚠️ 全市场筛选）
- [ ] 数据处理
  - [ ] 提取获利比例、平均成本、集中度
  - [ ] 计算融资余额变化趋势

**前端任务**:
- [ ] 创建 `ChipDistributionPanel` 组件
  - [ ] ECharts 图表展示获利比例趋势
  - [ ] 平均成本线标注
  - [ ] 90%/70% 集中度指标
- [ ] 创建 `MarginBalanceChart` 组件
  - [ ] 融资余额 vs 融券余额双轴图
  - [ ] 近 10 日趋势

**验收标准**:
- ✅ 筹码分布可视化清晰
- ✅ 融资融券数据准确

**产出文件**:
```
frontend/src/components/panels/
└── ChipDistributionPanel.tsx

frontend/src/components/charts/
└── MarginBalanceChart.tsx
```

---

### 阶段 3：资金与舆情模块（Day 9-12）

#### Day 9-10: 资金流向分析

**后端任务**:
- [ ] 实现资金数据获取
  - [ ] `get_fund_flow(symbol)` - 个股资金流向
  - [ ] `get_block_trades(symbol)` - 大宗交易
  - [ ] `get_north_holdings(symbol)` - 沪深港通持股
- [ ] 数据聚合
  - [ ] 主力/超大单/大单/中单/小单净流入
  - [ ] 近 10 日累计净流入

**前端任务**:
- [ ] 创建 `FundFlowCard` 组件
  - [ ] 今日资金流向概览（5 类资金）
  - [ ] 颜色标识（流入绿色，流出红色）
- [ ] 创建 `FundFlowChart` 组件
  - [ ] ECharts 柱状图 + 折线图组合
  - [ ] 近 10 日趋势
- [ ] 创建 `BlockTradesTable` 组件
  - [ ] 大宗交易列表
  - [ ] 折溢价率标识

**验收标准**:
- ✅ 资金流向数据准确
- ✅ 图表交互流畅（缩放、提示框）

**产出文件**:
```
frontend/src/components/cards/
└── FundFlowCard.tsx

frontend/src/components/charts/
└── FundFlowChart.tsx

frontend/src/components/tables/
└── BlockTradesTable.tsx
```

---

#### Day 11-12: 新闻与分析师评级

**后端任务**:
- [ ] 实现舆情数据获取
  - [ ] `get_news(symbol)` - 个股新闻
  - [ ] `get_analyst_rating(symbol)` - 分析师评级（⚠️ 全市场筛选）
  - [ ] `get_institution_research(symbol)` - 机构调研
- [ ] 创建 `news_analyzer.py`
  - [ ] 关键词匹配情感分类
    - 正面：增长、新高、买入、增持、利好
    - 负面：下跌、风险、减持、利空、调查
  - [ ] 新闻时效性过滤（最近 7 天）
  - [ ] 去重处理

**前端任务**:
- [ ] 创建 `NewsSection` 组件
  - [ ] 新闻列表（带情感标签 Badge）
  - [ ] 发布时间、来源展示
  - [ ] 点击展开查看全文
- [ ] 创建 `AnalystConsensusCard` 组件
  - [ ] 最新评级展示（买入/增持/中性/减持）
  - [ ] 目标价 vs 当前价对比
  - [ ] 评级日期、行业信息

**验收标准**:
- ✅ 新闻情感分类准确率 > 70%
- ✅ 分析师评级数据完整

**产出文件**:
```
backend/app/services/
└── news_analyzer.py

frontend/src/components/panels/
└── NewsSection.tsx

frontend/src/components/cards/
└── AnalystConsensusCard.tsx
```

---

### 阶段 4：可视化与 PDF 导出（Day 13-15）

#### Day 13: K 线图与技术指标

**前端任务**:
- [ ] 创建 `KLineChart` 组件（核心图表）
  - [ ] ECharts candlestick 系列
  - [ ] MA5/MA20/MA60 均线叠加
  - [ ] 成交量副图（bar 系列）
  - [ ] MACD 指标图（可选）
- [ ] 优化交互体验
  - [ ] 数据缩放（dataZoom）
  - [ ] 十字光标（axisPointer）
  - [ ]  tooltip 自定义格式化
  - [ ] 响应式适配

**验收标准**:
- ✅ K 线图专业美观
- ✅ 支持缩放和平移
- ✅ 数据提示框信息完整

**产出文件**:
```
frontend/src/components/charts/
├── KLineChart.tsx
├── VolumeChart.tsx
└── MACDChart.tsx
```

---

#### Day 14: 手工风险编辑器

**前端任务**:
- [ ] 创建 `ManualRiskEditor` 组件
  - [ ] TextArea 富文本编辑（或集成简单 Markdown 编辑器）
  - [ ] 预置风险模板按钮
    - 政策风险
    - 行业风险
    - 公司经营风险
    - 财务风险
  - [ ] 实时保存到 localStorage
  - [ ] 字符计数提示
- [ ] 集成到 Dashboard
  - [ ] 右侧固定边栏（sticky positioning）
  - [ ] 导出时自动包含该内容

**验收标准**:
- ✅ 编辑器操作流畅
- ✅ 刷新页面内容不丢失
- ✅ 模板一键插入

**产出文件**:
```
frontend/src/components/panels/
└── ManualRiskEditor.tsx

frontend/src/hooks/
└── useManualRisk.ts
```

---

#### Day 15: PDF 导出功能

**前端任务**:
- [ ] 实现 `exportPDF.ts` 工具函数
  - [ ] html2canvas 截图整个报告区域
  - [ ] jsPDF 生成 PDF 文件
  - [ ] 分页处理（避免内容截断）
  - [ ] 添加页眉（股票代码 + 日期）
  - [ ] 添加页脚（页码）
- [ ] 优化导出体验
  - [ ] 导出前确认对话框（Modal）
  - [ ] 导出进度提示（Spin）
  - [ ] 文件名自动生成（`{symbol}_report_{date}.pdf`）
  - [ ] 导出完成后提示下载

**技术要点**:
```typescript
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const exportToPDF = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  const canvas = await html2canvas(element, { scale: 2 });
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  // ... 分页逻辑
  pdf.save(filename);
};
```

**验收标准**:
- ✅ PDF 包含所有数据和手工风险内容
- ✅ 排版清晰，无内容截断
- ✅ 文件大小合理（< 5MB）

**产出文件**:
```
frontend/src/utils/
└── exportPDF.ts

frontend/src/hooks/
└── usePDFExport.ts
```

---

### 阶段 5：优化与验收（Day 16-18）

#### Day 16-17: 性能优化与错误处理

**后端优化**:
- [ ] 添加请求缓存
  - [ ] 使用 `lru_cache` 缓存相同股票 5 分钟
  - [ ] 缓存键：`{symbol}_{data_type}`
- [ ] 异步并发获取数据
  - [ ] 使用 `asyncio.gather()` 并行请求
  - [ ] 超时控制（单个接口最多 10 秒）
- [ ] 失败降级策略
  - [ ] 某接口失败不影响其他数据
  - [ ] 返回空数组而非报错
- [ ] 日志记录
  - [ ] 创建 `utils/logger.py`
  - [ ] 记录请求开始/结束时间
  - [ ] 记录失败原因

**前端优化**:
- [ ] 骨架屏加载效果
  - [ ] Ant Design Skeleton 组件
  - [ ] 分模块加载（先展示行情，再展示财务...）
- [ ] 数据懒加载
  - [ ] 滚动到可视区域再加载图表
  - [ ] Intersection Observer API
- [ ] 错误边界处理
  - [ ] React Error Boundary
  - [ ] 友好错误提示（Alert 组件）
- [ ] 性能监控
  - [ ] 记录数据加载时间
  - [ ] 控制台输出性能日志

**验收标准**:
- ✅ 首次加载 < 5 秒
- ✅ 接口失败时优雅降级（部分数据显示 N/A）
- ✅ 无明显卡顿或白屏

**产出文件**:
```
backend/app/utils/
├── logger.py
└── cache.py

frontend/src/components/
└── ErrorBoundary.tsx
```

---

#### Day 18: 全流程测试与文档

**测试任务**:
- [ ] 端到端测试（5 只不同行业股票）
  - [ ] 600519（贵州茅台 - 白酒）
  - [ ] 000001（平安银行 - 金融）
  - [ ] 300750（宁德时代 - 新能源）
  - [ ] 601318（中国平安 - 保险）
  - [ ] 002594（比亚迪 - 汽车）
- [ ] 验证所有数据模块正常
  - [ ] 行情、财务、风险、资金、舆情全部展示
  - [ ] 图表渲染正常
  - [ ] PDF 导出完整性检查
- [ ] 边界情况测试
  - [ ] 无效股票代码（如 999999）
  - [ ] 停牌股票
  - [ ] 新股（上市不足 1 年）

**文档编写**:
- [ ] 完善 README.md
  - [ ] 快速开始指南
  - [ ] 配置说明
  - [ ] 常见问题 FAQ
- [ ] 创建 API.md
  - [ ] 接口列表
  - [ ] 请求/响应示例
  - [ ] 错误码说明
- [ ] 创建 DEPLOYMENT.md
  - [ ] Docker 部署方案（可选）
  - [ ] 生产环境配置
  - [ ] Nginx 反向代理配置

**验收标准**:
- ✅ 5 只股票全部测试通过
- ✅ 文档完整清晰
- ✅ 无已知严重 Bug

**产出文件**:
```
docs/
├── API.md
└── DEPLOYMENT.md

tests/
└── test_cases.md
```

---

## 📊 验收标准总览

| 指标 | 目标值 | 实际值 | 状态 |
|------|--------|--------|------|
| 数据加载时间 | < 5 秒 | - | ⏳ |
| 接口成功率 | > 95% | - | ⏳ |
| PDF 导出完整性 | 100% | - | ⏳ |
| 移动端适配 | 响应式 | - | ⏳ |
| 浏览器兼容 | Chrome/Firefox/Safari | - | ⏳ |
| 代码覆盖率 | > 70% | - | ⏳ |

---

## 🔑 关键技术决策

### 1. 数据获取策略（参考 daily_stock_analysis）

```python
# fail-open 降级策略
class DataFetcher:
    def get_with_fallback(self, func, default=None):
        try:
            return func()
        except Exception as e:
            logger.warning(f"数据获取失败: {e}")
            return default if default else pd.DataFrame()
```

### 2. 缓存机制

```python
from functools import lru_cache

@lru_cache(maxsize=100)
def get_cached_data(symbol: str, cache_key: str):
    """5分钟缓存"""
    pass
```

### 3. 异步并发

```python
import asyncio

async def fetch_all_data(symbol: str):
    tasks = [
        fetcher.get_daily(symbol),
        fetcher.get_company_info(symbol),
        fetcher.get_financial_indicators(symbol),
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return results
```

---

## 📝 每日站会模板

```markdown
## Date: YYYY-MM-DD

### 昨日完成
- [ ] 任务1
- [ ] 任务2

### 今日计划
- [ ] 任务3
- [ ] 任务4

### 遇到问题
- 问题描述
- 解决方案/需要帮助

### 进度百分比
- 总体进度: XX%
```

---

**最后更新**: 2026-04-25  
**维护者**: 股票分析项目组
