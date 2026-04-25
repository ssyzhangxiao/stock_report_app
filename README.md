# 上市公司自动分析报告系统

> 基于 React + FastAPI 的股票深度分析 Web 应用，整合 AkShare 八大类数据模块，提供专业级可视化分析和 PDF 报告导出功能。

## 🌟 项目特点

- ✅ **单股深度分析** - 专注一只股票，全方位数据挖掘
- ✅ **信息完整** - 整合 22+ AkShare 数据接口（行情、财务、风险、资金、舆情等）
- ✅ **可视化美观** - ECharts 专业 K 线图 + Ant Design 企业级 UI
- ✅ **手工风险分析** - 前端编辑器，团队可自定义风险内容
- ✅ **一键导出 PDF** - 完整报告包含所有数据和手工分析
- ✅ **无 AI 依赖** - 纯数据驱动，零成本运行

## 📊 数据模块

| 模块 | 数据项 | 说明 |
|------|--------|------|
| **基础行情** | 历史K线、技术指标 | MA/MACD/RSI/布林带 |
| **财务分析** | 财务指标、资产负债表、现金流 | 杜邦分析、负债率 |
| **风险指标** | 股权质押、商誉、高管持股 | 质押率告警、增减持信号 |
| **筹码分布** | 获利比例、平均成本、集中度 | 筹码峰可视化 |
| **资金流向** | 主力/超大单/大单净流入 | 10日趋势图 |
| **融资融券** | 融资余额、融券余额 | 杠杆资金监控 |
| **新闻舆情** | 个股新闻、情感分类 | 正负面自动识别 |
| **分析师评级** | 最新评级、目标价、行业对比 | 一致性预期 |

## 🛠️ 技术栈

### 后端
- **FastAPI** - 高性能异步 API 框架
- **AkShare** - 免费开源金融数据接口
- **Pandas + NumPy** - 数据处理与计算
- **Uvicorn** - ASGI 服务器

### 前端
- **React 18 + TypeScript** - 类型安全的组件化开发
- **Ant Design 5** - 企业级 UI 组件库
- **ECharts** - 专业金融图表库
- **Vite** - 极速开发构建工具
- **html2canvas + jsPDF** - PDF 导出

## 📁 项目结构

```
stock_report_app/
├── backend/                     # FastAPI 后端
│   ├── app/
│   │   ├── main.py             # 应用入口
│   │   ├── api/
│   │   │   └── analysis.py     # 分析接口
│   │   ├── services/
│   │   │   ├── data_fetcher.py     # 数据获取
│   │   │   ├── indicators.py       # 技术指标
│   │   │   ├── financial_analyzer.py # 财务分析
│   │   │   ├── risk_detector.py    # 风险检测
│   │   │   └── news_analyzer.py    # 新闻分析
│   │   ├── models/
│   │   │   └── stock_models.py # 数据模型
│   │   └── utils/
│   │       ├── logger.py       # 日志配置
│   │       └── formatters.py   # 数据格式化
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/                   # React 前端
│   ├── src/
│   │   ├── App.tsx
│   │   ├── api/
│   │   │   └── stockApi.ts
│   │   ├── components/
│   │   │   ├── charts/         # 图表组件
│   │   │   ├── cards/          # 卡片组件
│   │   │   ├── tables/         # 表格组件
│   │   │   └── panels/         # 面板组件
│   │   ├── pages/
│   │   │   └── Dashboard.tsx
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── types/
│   │   └── styles/
│   ├── package.json
│   └── vite.config.ts
│
└── docs/                       # 文档
    ├── DEVELOPMENT_PLAN.md     # 开发计划
    ├── API.md                  # API 文档
    └── DEPLOYMENT.md           # 部署指南
```

## 🚀 快速开始

### 环境要求
- Python 3.9+
- Node.js 18+
- npm 或 yarn

### 后端启动

```bash
cd backend

# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 复制环境变量配置
cp .env.example .env

# 启动服务
uvicorn app.main:app --reload --port 8000
```

访问 http://localhost:8000/docs 查看 API 文档

### 前端启动

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 http://localhost:5173 使用应用

### 使用示例

1. 打开浏览器访问 http://localhost:5173
2. 输入股票代码（如 `600519` 贵州茅台）
3. 点击"开始分析"按钮
4. 等待 3-5 秒，查看完整分析报告
5. 在右侧"手工风险编辑"区填写团队分析意见
6. 点击"导出 PDF"生成完整报告

## 📈 页面布局

```
┌─────────────────────────────────────────────┐
│  Header: 股票代码输入 + 分析按钮 + 导出PDF    │
├──────────────┬──────────────────────────────┤
│  左侧边栏     │      主内容区                 │
│  (300px)     │                              │
│              │  ┌────────────────────────┐  │
│  • 公司信息   │  │  K线图 + 技术指标       │  │
│  • 估值分析   │  └────────────────────────┘  │
│  • 技术指标   │                              │
│  • 分析师评级 │  ┌──────────┐ ┌──────────┐  │
│  • 风险编辑器  │  │ 财务数据  │ │ 风险指标  │  │
│              │  └──────────┘ └──────────┘  │
│              │                              │
│              │  ┌──────────┐ ┌──────────┐  │
│              │  │ 资金流向  │ │ 筹码分布  │  │
│              │  └──────────┘ └──────────┘  │
│              │                              │
│              │  ┌────────────────────────┐  │
│              │  │ 新闻舆情                 │  │
│              │  └────────────────────────┘  │
└──────────────┴──────────────────────────────┘
```

## 🔧 配置说明

### 后端配置 (.env)

```env
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=True
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

### 前端代理配置 (vite.config.ts)

已配置自动转发 `/api` 请求到后端 `http://localhost:8000`

## 📝 开发计划

详细开发计划请查看 [DEVELOPMENT_PLAN.md](./docs/DEVELOPMENT_PLAN.md)

**总工期**: 15-18 工作日

**阶段划分**:
1. 环境搭建与基础架构（3天）
2. 财务与风险模块（5天）
3. 资金与舆情模块（4天）
4. 可视化与 PDF 导出（3天）
5. 优化与验收（2-3天）

## ⚠️ 注意事项

1. **数据源稳定性**: AkShare 依赖东方财富等第三方数据源，若某接口失效需降级处理
2. **财务数据更新频率**: 季报/年报非每日更新，建议设置 24 小时缓存
3. **市场分类**: 高管持股接口需区分沪市（600/601/603）和深市（000/001/002/003/300）
4. **全市场接口**: 质押比例、融资融券需先获取全市场数据再筛选个股
5. **分析师评级**: 返回全市场 5千-1万条数据，需按股票代码和日期筛选

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 🙏 致谢

- [AkShare](https://github.com/akfamily/akshare) - 优秀的金融数据接口库
- [daily_stock_analysis](https://github.com/ZhuLinsen/daily_stock_analysis) - 架构参考

---

**开发团队**: 股票分析项目组  
**最后更新**: 2026-04-25
