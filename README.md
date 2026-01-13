
# 和风天气微信小程序（QWeather版）

一个可直接导入微信开发者工具的天气查询与预报小程序：支持城市名称查询、定位查询、实时天气、24小时预报、7天预报、空气质量与生活指数。

## 快速开始
1. **获取 API Key & API Host**：注册和登录和风天气 → 控制台创建项目 → 创建凭据（选择 API KEY），并在“设置”页面查看你的 **API Host**（每个账号不同）。   参考：和风天气官方“开始使用”文档（包含帐号、项目、凭据与认证方式）以及社区教程（项目管理与创建凭据、API Host 位置）。【文档链接见下方参考】
2. **配置密钥**：打开 `utils/qweather.js`，将：
   ```js
   apiHost: "https://YOUR_QWEATHER_API_HOST",
   apiKey: "YOUR_QWEATHER_API_KEY"
   ```
   替换为你的真实值。
3. **导入项目**：用微信开发者工具导入 `qweather-miniapp` 文件夹，运行即可。

## 目录结构
```
qweather-miniapp/
├─ app.json
├─ app.wxss
├─ project.config.json
├─ utils/
│  └─ qweather.js
└─ pages/
   └─ index/
      ├─ index.wxml
      ├─ index.wxss
      └─ index.js
```

## 已实现的数据接口
- 城市查询：`/geo/v2/city/lookup`（名称 → 城市ID）
- 实时天气：`/v7/weather/now`
- 24小时预报：`/v7/weather/24h`
- 7天预报：`/v7/weather/7d`
- 空气质量（当前）：`/v7/air/now`
- 生活指数（当天）：`/v7/indices/1d`（示例 type：`1,2,3,5,8`）
> 接口调用采用 **API Key** 认证，参数包含 `key`、`lang=zh-hans`、`unit=m`。如果使用定位查询，`location` 支持经纬度（如 `116.41,39.92`）。

## 常见问题
- **401/权限错误**：请确认 `apiHost` 与 `apiKey` 填写正确；API Host 必须使用控制台“设置”页面提供的专属域名。
- **城市查询不到**：尝试英文或更具体的名称（例如“上海市浦东新区”），或使用经纬度定位。
- **请求配额与计费**：按量计费、阶梯价，详见官方定价与计费文档。

## 参考资料（建议阅读官方）
- 和风天气开发服务 · 开始使用（帐号/项目/凭据、API Host、身份认证：API Key & JWT） citeturn4search3
- 教程示例：API Host 在控制台“设置”查看；项目管理里创建凭据（选择 API Key），可直接调用 `/geo/v2/city/lookup` 与 `/v7/weather/now` 等接口 citeturn4search8turn4search6
