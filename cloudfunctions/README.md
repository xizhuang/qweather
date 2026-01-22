# 云函数部署说明

## 1. 配置云开发环境

### 在微信开发者工具中：
1. 点击工具栏的"云开发"按钮
2. 开通云开发功境（如果未开通）
3. 创建或选择一个云环境
4. 记录环境 ID（可选，不填则使用默认环境）

### 配置环境 ID（可选）
在 `app.js` 中配置你的环境 ID：
```javascript
wx.cloud.init({
  env: 'your-env-id', // 替换为你的云环境 ID
  traceUser: true
});
```

## 2. 配置 API Key

### 方式一：在云函数代码中配置（适合测试）
编辑 `cloudfunctions/callLLM/index.js`，修改 `LLM_CONFIG` 对象：
```javascript
const LLM_CONFIG = {
  baseUrl: 'https://api.openai.com',  // 或其他兼容的 API 地址
  model: 'gpt-3.5-turbo',              // 模型名称
  apiKey: 'sk-your-api-key-here'       // 你的 API Key
};
```

### 方式二：使用云环境变量（推荐，更安全）
1. 在微信开发者工具的云开发控制台中
2. 进入"设置" -> "环境变量"
3. 添加以下变量：
   - `LLM_BASE_URL`: API Base URL
   - `LLM_MODEL`: 模型名称
   - `LLM_API_KEY`: API Key

使用环境变量后，代码会自动读取 `process.env.*` 中的值。

## 3. 部署云函数

### 在微信开发者工具中：
1. 右键点击 `cloudfunctions/callLLM` 文件夹
2. 选择"上传并部署：云端安装依赖"
3. 等待上传和安装完成

### 使用命令行（可选）
```bash
# 安装云开发 CLI
npm install -g @cloudbase/cli

# 登录
tcb login

# 部署云函数
tcb fn deploy callLLM --dir ./cloudfunctions/callLLM
```

## 4. 测试云函数

部署完成后，小程序会自动通过云函数调用大模型 API，无需修改页面代码。

## 5. 支持的模型

### OpenAI 兼容协议
- OpenAI GPT 系列
- Azure OpenAI
- 其他支持 OpenAI Chat Completions API 的服务

配置示例：
```javascript
{
  baseUrl: 'https://api.openai.com',
  model: 'gpt-3.5-turbo',
  apiKey: 'sk-...'
}
```

### Google Gemini
配置示例：
```javascript
{
  baseUrl: 'https://generativelanguage.googleapis.com',
  model: 'gemini-1.5-flash',
  apiKey: 'your-gemini-api-key'
}
```

## 6. 安全说明

✅ **推荐做法：**
- API Key 保存在云端（云函数或环境变量）
- 小程序端不暴露 API Key
- 通过云函数中转所有 API 请求

❌ **不推荐：**
- 在小程序代码中直接存储 API Key
- 小程序直接调用第三方 API（容易被抓包获取 Key）

## 7. 常见问题

### Q: 云函数调用失败？
A: 检查以下几点：
1. 云开发是否已开通
2. 云函数是否已上传部署
3. app.js 中是否已初始化云开发
4. API Key 配置是否正确

### Q: 如何查看云函数日志？
A: 在微信开发者工具的"云开发" -> "云函数" -> 点击函数名 -> "日志"

### Q: 如何更新 API Key？
A: 
- 如果使用环境变量：在云开发控制台修改环境变量即可，无需重新部署
- 如果写在代码中：修改代码后需要重新部署云函数

## 8. 费用说明

- 云函数调用：按调用次数和资源使用量计费
- 大模型 API：按各平台的定价计费
- 详情见微信云开发定价：https://cloud.weixin.qq.com/cloudbase/pricing
