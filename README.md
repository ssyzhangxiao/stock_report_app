# 📊 股票智能分析系统

> 基于多源数据驱动的股票智能分析平台，采用技能化架构和可视化报告系统。整合 AkShare 金融数据 + 通义千问 AI 分析，提供专业级可视化分析和多格式报告导出。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.9+-green.svg)
![Node.js](https://img.shields.io/badge/node-18+-orange.svg)
![React](https://img.shields.io/badge/react-18-blue.svg)

---

## ✨ 核心特性

### 🎯 智能分析
- ✅ **多源数据整合** - AkShare 22+ 数据接口 + 通义千问 AI 分析
- ✅ **技能化架构** - 模块化技能系统，支持灵活组合分析流程
- ✅ **多种分析模式** - 快速查看 / 深度分析 / 估值对比
- ✅ **实时进度追踪** - 可视化展示分析执行进度

### 📊 专业可视化
- ✅ **敏感性分析热力图** - WACC 和增长率对估值的二维影响
- ✅ **风险仪表盘** - 多维度风险监控（质押/融券/估值）
- ✅ **多模型估值对比** - DCF / PE / PB 等多种方法对比
- ✅ **现金流瀑布图** - 自由现金流分解展示
- ✅ **同业对比雷达图** - 多维度同业公司对比
- ✅ **K线技术分析** - 专业级 K 线图 + 技术指标

### 📄 报告生成
- ✅ **PDF 报告导出** - 高质量打印级 PDF，支持精美封面和分页
- ✅ **HTML 报告导出** - 独立 HTML 文件，适合在线分享
- ✅ **图表单独导出** - 支持 PNG / SVG 格式
- ✅ **报告模板系统** - 3 种预定义模板（完整/快速/对比）

### 🎨 用户体验
- ✅ **响应式设计** - 自适应桌面和移动设备
- ✅ **浅色主题** - 现代化 UI 设计，视觉舒适
- ✅ **一键启动** - 自动化脚本，零配置启动
- ✅ **实时反馈** - 加载提示、成功/失败消息

---

## 🚀 快速开始

### 环境要求
- Python 3.9+
- Node.js 18+
- macOS / Linux / Windows

### 一键启动（推荐）

```bash
# 进入项目目录
cd /Users/luojiutian/Documents/股票分析自动报告

# 赋予执行权限（仅需一次）
chmod +x start_all.sh stop_all.sh

# 一键启动所有服务
./start_all.sh
```

**脚本会自动**:
- ✅ 清理旧进程（端口 9002/6003/3456）
- ✅ 启动后端 FastAPI 服务
- ✅ 启动 Dexter AI Agent（可选）
- ✅ 启动前端 React 应用
- ✅ 验证所有服务状态

**访问地址**:
- 🌐 前端页面: http://localhost:6003
- 📚 API 文档: http://localhost:9002/docs
- 🤖 Dexter 健康检查: http://localhost:3456/api/health

**停止服务**: 按 `Ctrl+C` 或执行 `./stop_all.sh`

详细说明请参考：[docs/STARTUP_GUIDE.md](./docs/STARTUP_GUIDE.md)

---

## 📖 使用指南

### 基本操作流程

1. **输入股票代码**
   - 在顶部搜索框输入股票代码（如 `600519` 贵州茅台）
   - 或直接点击快速选择按钮

2. **选择分析模式**
   - **快速分析报告** - 核心指标概览（3页）
   - **完整分析报告** - 全方位深度分析（8页）
   - **对比分析报告** - 侧重估值和同业对比（5页）

3. **开始分析**
   - 点击"开始分析"按钮
   - 等待数据加载和 AI 分析（约 5-10 秒）
   - 查看实时进度追踪器

4. **查看分析结果**
   - 浏览可视化图表和分析报告
   - 查看 AI 智能分析建议
   - 监控风险指标

5. **导出报告**
   - 点击"导出 PDF"生成打印级报告
   - 点击"导出 HTML"生成可分享网页
   - 单独导出图表为 PNG/SVG

### 功能模块说明

#### 📈 核心指标区
- 最新价格、涨跌幅、PE/PB、市值
- 行业 PE 对比和偏离度分析
- 迷你 K 线走势图

#### 🤖 AI 智能分析
- 基本面分析
- 技术面分析
- 估值分析
- 资金流向分析
- 风险提示
- 投资建议（评分/目标价/止损价）

#### 📊 可视化图表
- **K线与技术分析** - 交互式 K 线图
- **敏感性分析热力图** - 估值参数敏感性测试
- **多模型估值对比** - 不同估值方法对比
- **风险仪表盘** - 多维度风险监控
- **现金流瀑布图** - 现金流分解
- **同业对比雷达图** - 同业公司对比

#### 💰 财务数据
- 利润表、资产负债表、现金流量表
- 财务指标趋势分析
- 杜邦分析

#### ⚠️ 风险监控
- 股权质押比例
- 筹码分布
- 内部人持股
- 融资融券余额
- 负面新闻舆情

#### 📰 新闻舆情
- 最新相关新闻
- 情感分类（正面/负面/中性）
- 风险事件监控

#### 👥 分析师评级
- 券商分析师一致预期
- 目标价预测
- 评级分布统计

---

## 🛠️ 技术栈

### 后端
- **FastAPI** - 高性能异步 API 框架
- **AkShare** - 免费开源金融数据接口库
- **通义千问 (DashScope)** - AI 智能分析引擎
- **Pandas + NumPy** - 数据处理与计算
- **Uvicorn** - ASGI 服务器

### 前端
- **React 18 + TypeScript** - 类型安全的组件化开发
- **Ant Design 5** - 企业级 UI 组件库
- **ECharts** - 专业金融图表库
- **Vite** - 极速开发构建工具
- **html2canvas + jsPDF** - PDF/图片导出

### 架构特色
- **技能化架构** - 模块化技能系统，灵活组合
- **多数据源融合** - AkShare + 通义千问 + Dexter AI
- **响应式设计** - 自适应各种屏幕尺寸
- **类型安全** - 完整的 TypeScript 类型定义

---

## 📁 项目结构

```
股票分析自动报告/
├── backend/                     # FastAPI 后端
│   ├── app/
│   │   ├── main.py             # 应用入口
│   │   ├── api/                # API 路由
│   │   ├── services/           # 业务逻辑
│   │   │   ├── data_fetcher.py     # 数据获取
│   │   │   ├── smart_data_source.py # 智能数据源
│   │   │   ├── qwen_data_fetcher.py # 通义千问集成
│   │   │   ├── indicators.py       # 技术指标
│   │   │   ├── financial_analyzer.py # 财务分析
│   │   │   ├── risk_detector.py    # 风险检测
│   │   │   └── news_analyzer.py    # 新闻分析
│   │   ├── models/             # 数据模型
│   │   └── utils/              # 工具函数
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/                   # React 前端
│   ├── src/
│   │   ├── pages/
│   │   │   └── Dashboard.tsx   # 主页面
│   │   ├── components/
│   │   │   ├── charts/         # 可视化图表组件
│   │   │   ├── cards/          # 卡片组件
│   │   │   ├── tables/         # 表格组件
│   │   │   ├── panels/         # 面板组件
│   │   │   └── analysis/       # 分析组件
│   │   ├── skills/             # 技能系统
│   │   ├── hooks/              # 自定义 Hooks
│   │   ├── utils/              # 工具函数
│   │   │   ├── exportPDF.ts    # PDF 导出
│   │   │   ├── exportHTML.ts   # HTML 导出
│   │   │   ├── exportChart.ts  # 图表导出
│   │   │   └── reportTemplates.ts # 报告模板
│   │   ├── api/                # API 调用
│   │   └── types/              # TypeScript 类型
│   ├── package.json
│   └── vite.config.ts
│
├── docs/                       # 文档
│   ├── STARTUP_GUIDE.md        # 启动指南
│   ├── PORT_CONFIGURATION.md   # 端口配置
│   ├── QWEN_DATASOURCE_GUIDE.md # 通义千问配置
│   └── CLEANUP_REPORT.md       # 清理报告
│
├── start_all.sh                # 一键启动脚本
├── stop_all.sh                 # 停止脚本
├── README.md                   # 项目说明
└── FEATURES_SUMMARY.md         # 功能总结
```

---

## 🔧 配置说明

### 后端配置 (backend/.env)

```env
# API 配置
API_HOST=0.0.0.0
API_PORT=9002
DEBUG=True

# CORS 配置
CORS_ORIGINS=http://localhost:6003,http://127.0.0.1:6003

# 通义千问 API Key（必需）
DASHSCOPE_API_KEY=sk-your-api-key-here

# 其他 LLM 供应商（可选）
# DEEPSEEK_API_KEY=
# OPENAI_API_KEY=
# OPENROUTER_API_KEY=
```

**获取通义千问 API Key**:
1. 访问 https://dashscope.console.aliyun.com/
2. 注册阿里云账号并开通 DashScope 服务
3. 创建 API Key
4. 复制到 `.env` 文件

详细说明参考：[docs/QWEN_DATASOURCE_GUIDE.md](./docs/QWEN_DATASOURCE_GUIDE.md)

### 前端配置 (frontend/vite.config.ts)

```typescript
export default defineConfig({
  server: {
    port: 6003,  // 前端端口
    proxy: {
      '/api': {
        target: 'http://localhost:9002',  // 后端代理
        changeOrigin: true,
      }
    }
  }
})
```

### 修改端口

如需修改端口，需要同步更新以下文件：

1. **启动脚本**: `start_all.sh` 和 `stop_all.sh`
2. **后端配置**: `backend/.env`
3. **前端配置**: `frontend/vite.config.ts`

详细说明参考：[docs/PORT_CONFIGURATION.md](./docs/PORT_CONFIGURATION.md)

---

## 📊 端口配置

| 服务 | 端口 | 说明 |
|------|------|------|
| **后端 API** | 9002 | FastAPI + AkShare |
| **前端页面** | 6003 | React + Vite |
| **Dexter AI** | 3456 | AI Agent（可选） |

---

## 🎯 核心功能详解

### 1. 技能化架构

系统采用技能化设计，每个分析功能都是独立的技能：

```typescript
// 技能示例
{
  id: 'valuation-dcf',
  name: 'DCF 估值分析',
  description: '基于现金流折现模型的估值分析',
  execute: async (context) => { ... }
}
```

**优势**:
- 模块化设计，易于维护和扩展
- 支持灵活组合不同的分析技能
- 实时进度追踪和状态反馈

### 2. 报告模板系统

提供 3 种预定义模板：

| 模板 | 页数 | 适用场景 |
|------|------|----------|
| **完整分析报告** | ~8页 | 深度研究、投资决策 |
| **快速分析报告** | ~3页 | 快速浏览、日常跟踪 |
| **对比分析报告** | ~5页 | 同业对比、估值分析 |

### 3. 多格式导出

- **PDF**: 高质量打印级报告，包含精美封面和分页
- **HTML**: 独立网页文件，适合在线分享和邮件发送
- **PNG/SVG**: 单独导出图表，支持矢量图

---

## ⚠️ 注意事项

1. **数据源稳定性**: AkShare 依赖第三方数据源，某些接口可能偶尔失效
2. **API Key 配置**: 必须配置通义千问 API Key 才能使用 AI 分析功能
3. **网络环境**: 需要稳定的网络连接访问金融数据 API
4. **浏览器兼容**: 推荐使用 Chrome/Edge 获得最佳体验
5. **内存占用**: 生成高质量 PDF 时可能需要较多内存

---

## 🐛 常见问题

### Q1: 启动失败，端口被占用？
**A**: `start_all.sh` 会自动清理旧进程，无需手动操作。

### Q2: AI 分析不可用？
**A**: 检查 `backend/.env` 中是否正确配置了 `DASHSCOPE_API_KEY`。

### Q3: 前端无法连接后端？
**A**: 
```bash
# 检查后端是否运行
curl http://localhost:9002/api/analysis/health

# 检查代理配置
cat frontend/vite.config.ts
```

### Q4: 如何查看日志？
```bash
# 后端日志
tail -f backend/backend.log

# Dexter 日志
tail -f ~/Documents/dexter/dexter_api.log
```

更多问题参考：[docs/STARTUP_GUIDE.md](./docs/STARTUP_GUIDE.md)

---

## 📚 相关文档

- [🚀 启动指南](./docs/STARTUP_GUIDE.md) - 详细的启动说明和 FAQ
- [🔧 端口配置](./docs/PORT_CONFIGURATION.md) - 端口修改指南
- [🔑 通义千问配置](./docs/QWEN_DATASOURCE_GUIDE.md) - API Key 配置教程
- [✨ 功能总结](./FEATURES_SUMMARY.md) - 完整功能介绍
- [📝 清理报告](./docs/CLEANUP_REPORT.md) - 文档清理记录

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📄 许可证

MIT License

---

## 🙏 致谢

- [AkShare](https://github.com/akfamily/akshare) - 优秀的金融数据接口库
- [通义千问](https://dashscope.aliyun.com/) - 强大的 AI 分析能力
- [Ant Design](https://ant.design/) - 企业级 UI 组件库
- [ECharts](https://echarts.apache.org/) - 专业的图表库

---

**开发团队**: 股票分析项目组  
**最后更新**: 2026-05-02  
**版本**: v2.0.0
