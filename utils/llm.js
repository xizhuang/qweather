// 小程序端大模型调用入口（直连示例，OpenAI 兼容协议）
// 重要：把 API Key 写在小程序端存在泄露风险，仅建议学习测试。

const STORAGE_KEY = 'LLM_CONFIG_V1';

export function getLlmConfig() {
  const cfg = wx.getStorageSync(STORAGE_KEY) || {};
  return {
    baseUrl: cfg.baseUrl || '',
    model: cfg.model || '',
    apiKey: cfg.apiKey || ''
  };
}

export function setLlmConfig(cfg) {
  wx.setStorageSync(STORAGE_KEY, {
    baseUrl: cfg.baseUrl || '',
    model: cfg.model || '',
    apiKey: cfg.apiKey || ''
  });
}

export function clearLlmConfig() {
  wx.removeStorageSync(STORAGE_KEY);
}

function normalizeChatCompletionsUrl(baseUrl) {
  const raw = String(baseUrl || '').trim().replace(/\/+$/, '');
  if (!raw) return '';
  if (/\/chat\/completions$/i.test(raw)) return raw;
  if (/\/v1$/i.test(raw)) return `${raw}/chat/completions`;
  return `${raw}/v1/chat/completions`;
}

function isGeminiBaseUrl(baseUrl) {
  return /generativelanguage\.googleapis\.com/i.test(String(baseUrl || ''));
}

function sanitizeApiKey(input) {
  let s = String(input || '').trim();
  if (!s) return '';

  // If user pasted a full URL or log line that contains "key=...", extract it.
  const keyMatches = s.match(/(?:\?|&|\s)key=([A-Za-z0-9_\-\.]+)/g);
  if (keyMatches && keyMatches.length) {
    const last = keyMatches[keyMatches.length - 1];
    const m = last.match(/key=([A-Za-z0-9_\-\.]+)/);
    if (m && m[1]) return m[1];
  }

  // If there are spaces/newlines, keep the last token.
  if (/\s/.test(s)) {
    const parts = s.split(/\s+/).filter(Boolean);
    s = parts[parts.length - 1] || s;
  }

  // Strip surrounding quotes.
  s = s.replace(/^['"]+|['"]+$/g, '');
  return s;
}

function normalizeGeminiGenerateContentUrl(baseUrl, model) {
  let raw = String(baseUrl || '').trim().replace(/\/+$/, '');
  if (!raw) return '';

  // Allow users to paste baseUrl with extra path like:
  // - https://generativelanguage.googleapis.com
  // - https://generativelanguage.googleapis.com/v1beta
  // - https://generativelanguage.googleapis.com/v1beta/models
  // - https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent
  // Normalize it back to the API root, then append the standard path.
  raw = raw.replace(/\/v1beta(\/.*)?$/i, '');
  raw = raw.replace(/\/v1(\/.*)?$/i, '');

  const versioned = `${raw}/v1beta`;
  const m = encodeURIComponent(String(model || '').trim());
  return `${versioned}/models/${m}:generateContent`;
}

function normalizeGeminiListModelsUrl(baseUrl) {
  let raw = String(baseUrl || '').trim().replace(/\/+$/, '');
  if (!raw) return '';
  raw = raw.replace(/\/v1beta(\/.*)?$/i, '');
  raw = raw.replace(/\/v1(\/.*)?$/i, '');
  return `${raw}/v1beta/models`;
}

function requestJsonGet(url, header = {}) {
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method: 'GET',
      header,
      success(res) {
        if (res && res.statusCode === 200) return resolve(res.data);

        const msgFromServer =
          (res && res.data && res.data.error && res.data.error.message) ||
          (res && res.data && res.data.message) ||
          '';
        const err = new Error(
          `请求失败（HTTP ${res && res.statusCode ? res.statusCode : '未知'}）${msgFromServer ? `：${msgFromServer}` : ''}`
        );
        err.detail = res;
        reject(err);
      },
      fail(err) {
        const e = err instanceof Error ? err : new Error('网络请求失败');
        e.detail = err;
        reject(e);
      }
    });
  });
}

function requestJson(url, data, header = {}) {
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method: 'POST',
      data,
      header: { 'content-type': 'application/json', ...header },
      success(res) {
        if (res && res.statusCode === 200) return resolve(res.data);

        const msgFromServer =
          (res && res.data && res.data.error && res.data.error.message) ||
          (res && res.data && res.data.error && (res.data.error.message || res.data.error)) ||
          (res && res.data && res.data.message) ||
          '';

        const err = new Error(
          `请求失败（HTTP ${res && res.statusCode ? res.statusCode : '未知'}）${msgFromServer ? `：${msgFromServer}` : ''}`
        );
        err.detail = res;
        reject(err);
      },
      fail(err) {
        const e = err instanceof Error ? err : new Error('网络请求失败');
        e.detail = err;
        reject(e);
      }
    });
  });
}

// 返回纯文本回答
export async function askMood(text, overrideConfig) {
  const cfg = overrideConfig || getLlmConfig();
  const baseUrl = String(cfg.baseUrl || '').trim();
  const model = String(cfg.model || '').trim();
  const apiKey = sanitizeApiKey(cfg.apiKey);

  if (isGeminiBaseUrl(baseUrl)) {
    const url = normalizeGeminiGenerateContentUrl(baseUrl, model);
    if (!url) throw new Error('请填写 API Base URL');
    if (!model) throw new Error('请填写模型名称（Model），例如 gemini-1.5-flash');
    if (!apiKey) throw new Error('请填写 Gemini API Key');

    const payload = {
      systemInstruction: {
        parts: [
          {
            text: '你是一个温柔、简洁的情绪支持助手。用中文回答，先共情，再给出2-4条可执行建议。'
          }
        ]
      },
      contents: [{ role: 'user', parts: [{ text: String(text || '') }] }],
      generationConfig: { temperature: 0.8 }
    };

    const data = await requestJson(url, payload, {
      'x-goog-api-key': apiKey
    });

    const parts =
      data &&
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      Array.isArray(data.candidates[0].content.parts)
        ? data.candidates[0].content.parts
        : [];

    const answer = parts.map((p) => (p && typeof p.text === 'string' ? p.text : '')).join('');
    return answer;
  }

  const url = normalizeChatCompletionsUrl(baseUrl);
  if (!url) throw new Error('请填写 API Base URL');
  if (!model) throw new Error('请填写模型名称（Model）');
  if (!apiKey) throw new Error('请填写 API Key');

  const payload = {
    model,
    messages: [
      {
        role: 'system',
        content: '你是一个温柔、简洁的情绪支持助手。用中文回答，先共情，再给出2-4条可执行建议。'
      },
      { role: 'user', content: text }
    ],
    temperature: 0.8
  };

  const data = await requestJson(url, payload, {
    Authorization: `Bearer ${apiKey}`
  });

  const answer =
    data &&
    data.choices &&
    data.choices[0] &&
    data.choices[0].message &&
    typeof data.choices[0].message.content === 'string'
      ? data.choices[0].message.content
      : '';

  return answer;
}

// Gemini: 获取当前 Key 可用的模型列表（用于避免猜模型名）
export async function listGeminiModels(overrideConfig) {
  const cfg = overrideConfig || getLlmConfig();
  const baseUrl = String(cfg.baseUrl || '').trim();
  const apiKey = sanitizeApiKey(cfg.apiKey);

  if (!isGeminiBaseUrl(baseUrl)) throw new Error('当前 Base URL 不是 Gemini（generativelanguage.googleapis.com）');
  const url = normalizeGeminiListModelsUrl(baseUrl);
  if (!url) throw new Error('请填写 API Base URL');
  if (!apiKey) throw new Error('请填写 Gemini API Key');

  const data = await requestJsonGet(url, { 'x-goog-api-key': apiKey });
  const models = (data && data.models) || [];
  return models
    .map((m) => {
      const name = m && m.name ? String(m.name) : '';
      const displayName = m && m.displayName ? String(m.displayName) : '';
      const supported = m && Array.isArray(m.supportedGenerationMethods) ? m.supportedGenerationMethods : [];
      return { name, displayName, supportedGenerationMethods: supported };
    })
    .filter((m) => m.name);
}
