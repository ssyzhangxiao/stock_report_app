# 通义千问数据源配置指南

## 📋 概述

本系统集成了**通义千问**作为备用数据源，当 AkShare 获取数据失败时，会自动切换到通义千问 API，确保数据获取的高可用性。

### 架构设计

```
┌─────────────────────────────────────┐
│     SmartDataSource (智能数据源)      │
├─────────────────────────────────────┤
│                                     │
│  优先使用: AkShare (免费、快速)       │
│       ↓ 失败时自动降级               │
│  备用使用: 通义千问 (稳定、智能)      │
│                                     │
└─────────────────────────────────────┘
```

## 🔑 第一步：获取通义千问 API Key

### 1. 注册阿里云账号

访问：https://dashscope.console.aliyun.com/

### 2. 开通 DashScope 服务

- 登录阿里云控制台
- 进入 DashScope 灵积模型服务平台
- 点击"开通服务"

### 3. 创建 API Key

- 进入 **API-KEY 管理** 页面
- 点击"创建新的 API-KEY"
- 复制生成的 API Key（格式类似：`sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`）

### 4. 查看额度

新用户通常有免费额度，可以测试使用。

## ⚙️ 第二步：配置 API Key

### 方法一：编辑 .env 文件（推荐）

打开 `backend/.env` 文件：

```bash
nano backend/.env
```

添加或修改以下行：

```env
# 通义千问 API 配置（备用数据源）
DASHSCOPE_API_KEY=sk-your-actual-api-key-here
```

将 `sk-your-actual-api-key-here` 替换为您的实际 API Key。

### 方法二：设置环境变量

```bash
export DASHSCOPE_API_KEY="sk-your-actual-api-key-here"
```

## 🧪 第三步：测试配置

### 运行测试脚本

```bash
cd backend
source venv/bin/activate  # 激活虚拟环境
python tests/test_qwen_datasource.py
```

### 预期输出

```
🚀 🚀 🚀 🚀 🚀 🚀 🚀 🚀 🚀 🚀 
开始测试通义千问数据源
🚀 🚀 🚀 🚀 🚀 🚀 🚀 🚀 🚀 🚀 

============================================================
测试1: 通义千问 - 股票基本信息
============================================================
✅ 成功获取 600519 的基本信息
⏱️  响应时间: 2.35秒
📊 数据内容:
   stock_name: 贵州茅台
   industry: 白酒
   market_cap: 21000
   ...

============================================================
测试3: AkShare vs 通义千问 - 数据对比
============================================================
📈 AkShare 数据:
⏱️  响应时间: 0.85秒
✅ 成功获取 15 个字段

🤖 通义千问数据:
⏱️  响应时间: 2.35秒
✅ 成功获取 8 个字段

📊 对比总结:
   AkShare 速度: 0.85秒
   通义千问速度: 2.35秒
   速度比: 2.76x
   ⚡ AkShare 更快（快 2.76 倍）
```

## 📊 功能对比

| 功能 | AkShare | 通义千问 | 说明 |
|------|---------|----------|------|
| **历史行情** | ✅ | ❌ | 通义千问不适合大量时序数据 |
| **财务报表** | ✅ | ⚠️ | 通义千问提供摘要，AkShare 提供完整报表 |
| **公司信息** | ✅ | ✅ | 两者都支持，自动切换 |
| **分析师评级** | ✅ | ✅ | 两者都支持，自动切换 |
| **市场情绪** | ❌ | ✅ | 仅通义千问支持 |
| **风险评估** | ❌ | ✅ | 仅通义千问支持 |
| **技术分析** | ❌ | ✅ | 仅通义千问支持 |
| **响应速度** | ⚡ 快 | 🐢 较慢 | AkShare 平均 0.5-1s，通义千问 2-3s |
| **稳定性** | 🟡 一般 | 🟢 高 | 通义千问更稳定 |
| **成本** | 💰 免费 | 💰 按量付费 | 新用户有免费额度 |

## 🔄 自动切换机制

### 工作流程

1. **优先尝试 AkShare**
   - 调用 AkShare API 获取数据
   - 检查返回数据是否有效

2. **自动降级到通义千问**
   - 如果 AkShare 失败或返回空数据
   - 自动调用通义千问 API
   - 记录降级日志

3. **返回结果**
   - 无论哪个数据源成功，都返回统一格式的数据
   - 前端无需关心数据来源

### 示例代码

```python
from app.services.smart_data_source import get_smart_source

smart = get_smart_source()

# 自动选择最佳数据源
stock_info = smart.get_stock_info("600519")
financial_data = smart.get_financial_data("600519")
analyst_rating = smart.get_analyst_rating("600519")

# 查看数据源状态
status = smart.get_status()
print(f"AkShare 可用: {status['akshare_available']}")
print(f"通义千问可用: {status['qwen_available']}")
print(f"降级次数: {status['fallback_count']}")
```

## 🎯 使用场景

### 场景 1：正常情况
- AkShare 工作正常
- 所有请求都通过 AkShare
- 响应速度快（0.5-1秒）

### 场景 2：AkShare 故障
- AkShare API 超时或返回错误
- 自动切换到通义千问
- 响应速度稍慢（2-3秒），但保证可用性

### 场景 3：增强分析
- 需要市场情绪分析 → 使用通义千问
- 需要风险评估 → 使用通义千问
- 需要技术分析摘要 → 使用通义千问

## 💰 成本控制

### 通义千问计费

- **qwen-max**: 约 0.04 元/千 tokens
- **qwen-plus**: 约 0.008 元/千 tokens
- **qwen-turbo**: 约 0.002 元/千 tokens

### 优化建议

1. **默认使用 qwen-plus**（性价比高）
2. **缓存常用数据**，减少重复调用
3. **监控用量**，设置预算告警
4. **优先使用 AkShare**，仅在必要时降级

### 修改模型

在 `qwen_data_fetcher.py` 中修改：

```python
def _call_qwen_api(self, prompt: str, model: str = "qwen-plus"):  # 改为 qwen-plus
    ...
```

## 📝 日志监控

### 查看降级日志

```bash
# 查看后端日志
tail -f backend/logs/app.log | grep "通义千问"
```

### 日志示例

```
INFO: 使用 AkShare 获取数据: get_company_info
WARNING: AkShare 获取失败: Connection timeout，切换到通义千问
INFO: 使用通义千问获取数据: get_stock_basic_info
INFO: 通义千问数据获取成功（第1次降级）
```

## ❓ 常见问题

### Q1: 如何确认通义千问是否在工作？

**A:** 运行测试脚本或查看日志中的降级记录。

### Q2: 不配置通义千问会影响系统吗？

**A:** 不会。系统会仅使用 AkShare，只是失去了备用数据源和高级分析功能。

### Q3: 通义千问的数据准确吗？

**A:** 通义千问基于大语言模型，数据可能不如 AkShare 精确。建议：
- 关键数据（如价格、成交量）优先使用 AkShare
- 分析性数据（如情绪、风险）可以使用通义千问

### Q4: 如何禁用通义千问？

**A:** 删除 `.env` 文件中的 `DASHSCOPE_API_KEY` 或设为空字符串。

### Q5: 可以同时使用多个模型吗？

**A:** 可以。在代码中根据需要选择不同的 model 参数：
- `qwen-max`: 最高质量，适合复杂分析
- `qwen-plus`: 平衡质量和速度
- `qwen-turbo`: 最快，适合简单查询

## 🔗 相关链接

- [DashScope 官方文档](https://help.aliyun.com/zh/dashscope/)
- [API Key 管理](https://dashscope.console.aliyun.com/apiKey)
- [模型列表和定价](https://help.aliyun.com/zh/dashscope/developer-reference/tongyi-qianwen-llm/)
- [AkShare 文档](https://akshare.akfamily.xyz/)

## 📞 技术支持

如有问题，请：
1. 检查 API Key 是否正确配置
2. 查看日志文件了解详细错误
3. 确认阿里云账户余额充足
4. 参考官方文档排查问题

---

**最后更新**: 2026-04-25  
**版本**: 1.0.0
