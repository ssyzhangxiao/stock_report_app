# 🔧 端口配置说明

## 📋 当前端口配置

| 服务 | 端口 | 访问地址 |
|------|------|----------|
| **前端** | 6000 | http://localhost:6000 |
| **后端** | 9000 | http://localhost:9000 |
| **API文档** | 9000 | http://localhost:9000/docs |

---

## 🚀 如何修改端口

### 方法一：使用环境变量（推荐）

#### 修改后端端口

编辑 `backend/.env` 文件：

```env
# API 配置
API_HOST=0.0.0.0
API_PORT=9000  # ← 修改这里

# CORS 配置（允许前端端口访问）
CORS_ORIGINS=http://localhost:6000  # ← 确保与前端端口一致
```

#### 修改前端端口

编辑 `frontend/vite.config.ts` 文件：

```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 6000,  // ← 修改这里
    proxy: {
      '/api': {
        target: 'http://localhost:9000',  // ← 确保与后端端口一致
        changeOrigin: true,
      }
    }
  }
})
```

---

### 方法二：命令行指定端口

#### 后端启动时指定端口

```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 9000
```

#### 前端启动时指定端口

```bash
cd frontend
npm run dev -- --port 6000
```

---

## ⚠️ 重要注意事项

### 1. CORS 配置必须匹配

如果修改了前端端口，**必须同时更新后端的 CORS 配置**：

```env
# backend/.env
CORS_ORIGINS=http://localhost:6000  # 必须与前端端口一致
```

否则会出现跨域错误！

### 2. 前端代理配置必须匹配

如果修改了后端端口，**必须同时更新前端的代理配置**：

```typescript
// frontend/vite.config.ts
proxy: {
  '/api': {
    target: 'http://localhost:9000',  // 必须与后端端口一致
    changeOrigin: true,
  }
}
```

否则前端无法连接后端！

### 3. 常见端口冲突

如果遇到端口被占用，可以尝试以下端口：

**后端常用端口**：
- 8000, 8001, 8002, 9000, 9001, 3000, 5000

**前端常用端口**：
- 3000, 5173, 5174, 6000, 6001, 8080, 8081

---

## 🔍 检查端口是否被占用

### macOS / Linux

```bash
# 检查特定端口
lsof -i :9000
lsof -i :6000

# 查看所有监听端口
netstat -an | grep LISTEN
```

### Windows

```cmd
# 检查特定端口
netstat -ano | findstr :9000
netstat -ano | findstr :6000
```

---

## 🛑 关闭占用端口的进程

### macOS / Linux

```bash
# 找到进程 ID
lsof -i :9000

# 杀死进程
kill -9 <PID>
```

### Windows

```cmd
# 找到进程 ID
netstat -ano | findstr :9000

# 杀死进程
taskkill /PID <PID> /F
```

---

## 📝 完整配置示例

假设您想使用：
- 后端：8888
- 前端：7777

### 步骤 1：修改后端配置

```env
# backend/.env
API_HOST=0.0.0.0
API_PORT=8888
CORS_ORIGINS=http://localhost:7777
```

### 步骤 2：修改前端配置

```typescript
// frontend/vite.config.ts
export default defineConfig({
  plugins: [react()],
  server: {
    port: 7777,
    proxy: {
      '/api': {
        target: 'http://localhost:8888',
        changeOrigin: true,
      }
    }
  }
})
```

### 步骤 3：重启服务

```bash
# 停止旧服务（Ctrl+C）

# 重新启动
./start.sh
```

---

## ✅ 验证配置是否正确

1. **启动后端**
   ```bash
   cd backend
   source venv/bin/activate
   uvicorn app.main:app --reload --port 9000
   ```
   
   访问 http://localhost:9000/docs 应该能看到 API 文档

2. **启动前端**
   ```bash
   cd frontend
   npm run dev
   ```
   
   访问 http://localhost:6000 应该能看到应用界面

3. **测试连通性**
   - 在前端输入股票代码并点击"开始分析"
   - 如果能看到数据，说明配置正确
   - 如果报错，检查浏览器控制台的错误信息

---

## 🐛 常见问题

### Q1: 前端显示 "Network Error"

**原因**：前端无法连接后端

**解决**：
1. 检查后端是否启动
2. 检查 `vite.config.ts` 中的 `target` 是否正确
3. 检查浏览器控制台是否有 CORS 错误

### Q2: 后端显示 CORS 错误

**原因**：CORS 配置不匹配

**解决**：
1. 检查 `backend/.env` 中的 `CORS_ORIGINS` 是否包含前端地址
2. 重启后端服务

### Q3: 端口被占用

**原因**：其他程序正在使用该端口

**解决**：
1. 使用上述命令查找并关闭占用进程
2. 或更换为其他可用端口

---

## 📞 需要帮助？

如果遇到问题，请检查：
1. ✅ 后端是否正常启动
2. ✅ 前端是否正常启动
3. ✅ CORS 配置是否匹配
4. ✅ 代理配置是否正确
5. ✅ 浏览器控制台是否有错误信息

---

**最后更新**: 2026-04-25  
**当前配置**: 前端 6000 / 后端 9000
