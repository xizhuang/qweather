
// 和风天气 API 封装
// 在下方 config 中填入你的 API Host 与 API Key。
// API Host 获取位置：控制台 → 设置（每个账号不同的独立域名）
// 认证方式：API KEY（无需 JWT）
let config = {
  apiHost: "", // 例如 https://mnxxxxxmv2.re.qweatherapi.com
  apiKey: "",
  lang: "zh-hans",
  unit: "m" // m=公制，i=英制
};

// 通过本地私有文件覆盖配置：`utils/qweather.config.js`（不要提交到 Git）
// 参考：`utils/qweather.config.example.js`
try {
  // eslint-disable-next-line global-require
  const local = require('./qweather.config');
  if (local && typeof local === 'object') {
    config = { ...config, ...local };
  }
} catch (e) {
  // ignore
}

function ensureConfig() {
  if (!config.apiHost || !config.apiKey) {
    throw new Error('未配置和风天气 Key：请复制 utils/qweather.config.example.js 为 utils/qweather.config.js 并填写 apiHost/apiKey');
  }
}

function buildUrl(path, params = {}) {
  ensureConfig();
  const query = Object.entries({ key: config.apiKey, lang: config.lang, unit: config.unit, ...params })
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  return `${config.apiHost}${path}?${query}`;
}

function qweatherCodeMessage(code) {
  const map = {
    '200': '成功',
    '204': '无数据',
    '400': '请求错误（参数缺失或格式错误）',
    '401': '认证失败（API Key 错误或无效）',
    '402': '超过访问次数或余额不足',
    '403': '无权限访问该接口/资源（可能未订阅空气质量等服务）',
    '404': '查询的地区/数据不存在',
    '429': '访问过于频繁，请稍后再试',
    '500': '服务内部错误',
  };
  return map[String(code)] || '';
}

function makeRequestError({ url, path, res }) {
  const status = res && typeof res.statusCode === 'number' ? res.statusCode : undefined;
  const code = res && res.data && res.data.code ? String(res.data.code) : undefined;
  const hint = code ? qweatherCodeMessage(code) : '';

  let message = '请求失败';
  if (status) message += `（HTTP ${status}）`;
  if (code) message += ` code=${code}`;
  if (hint) message += `：${hint}`;
  if (path) message += ` [${path}]`;

  const err = new Error(message);
  err.statusCode = status;
  err.code = code;
  err.url = url;
  err.path = path;
  err.detail = res;
  return err;
}

function wxRequest(path, params = {}) {
  const url = buildUrl(path, params);
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method: 'GET',
      success(res) {
        const okHttp = res && res.statusCode === 200;
        const okBiz = !res || !res.data || typeof res.data.code === 'undefined' || String(res.data.code) === '200';

        if (okHttp && res.data && okBiz) return resolve(res.data);
        reject(makeRequestError({ url, path, res }));
      },
      fail(err) {
        const e = err instanceof Error ? err : new Error('网络请求失败');
        e.url = url;
        e.path = path;
        e.detail = err;
        reject(e);
      }
    });
  });
}

// 地理编码：城市查询（名称 → 城市ID）
export function cityLookupByName(name) {
  return wxRequest('/geo/v2/city/lookup', { location: name });
}

// 当前天气
export function weatherNow(location) {
  return wxRequest('/v7/weather/now', { location });
}

// 24小时预报
export function weather24h(location) {
  return wxRequest('/v7/weather/24h', { location });
}

// 7天预报
export function weather7d(location) {
  return wxRequest('/v7/weather/7d', { location });
}

// 空气质量（当前）
export function airNow(location) {
  return wxRequest('/v7/air/now', { location });
}

// 生活指数（当天）type 1~N（穿衣、紫外线等，多个用逗号分隔）
export function indices1d(location, type = '1,2,3,5,8') {
  return wxRequest('/v7/indices/1d', { location, type });
}
