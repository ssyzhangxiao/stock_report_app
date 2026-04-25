# 快速启动指南

## 📋 前置要求

- Python 3.9+
- Node.js 18+
- npm 或 yarn

## 🚀 启动步骤

### 1. 后端启动

```bash
# 进入后端目录
cd backend

# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
# macOS/Linux:
source venv/bin/activate
# Windows:
# venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 复制环境变量配置
cp .env.example .env

# 启动服务
uvicorn app.main:app --reload --port 8000
```

后端服务将在 http://localhost:8000 启动  
API 文档：http://localhost:8000/docs

### 2. 前端启动

打开新终端：

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端应用将在 http://localhost:5173 启动

### 3. 访问应用

浏览器打开：http://localhost:5173

输入股票代码（如 `600519`）点击"开始分析"

---

## 📁 当前项目状态

### ✅ 已完成
- [x] 项目目录结构创建
- [x] 后端基础架构（FastAPI + AkShare）
- [x] 数据获取层（DataFetcher）
- [x] 技术指标计算（MA, MACD, RSI, 布林带）
- [x] API 接口（/api/analysis/stock/{symbol}）
- [x] 前端基础配置（Vite + React + TypeScript）
- [x] README 和开发计划文档

### ⏳ 待完善（按开发计划逐步实现）
- [ ] 前端组件实现（K线图、财务表、风险面板等）
- [ ] PDF 导出功能
- [ ] 手工风险编辑器
- [ ] 性能优化与缓存
- [ ] 错误处理与降级策略
- [ ] 单元测试

---

## 🔧 常见问题

### Q1: 后端启动失败？
**A**: 检查是否安装了所有依赖：
```bash
pip install -r requirements.txt
```

### Q2: 前端启动失败？
**A**: 检查 Node.js 版本（需要 18+）：
```bash
node --version
```

### Q3: 数据获取失败？
**A**: AkShare 依赖网络，检查网络连接。某些接口可能暂时不可用。

### Q4: CORS 错误？
**A**: 确保后端 `.env` 文件中配置了正确的前端地址：
```env
CORS_ORIGINS=http://localhost:5173
```

---

## 📞 需要帮助？

查看详细开发计划：[DEVELOPMENT_PLAN.md](./docs/DEVELOPMENT_PLAN.md)

---

**最后更新**: 2026-04-25
