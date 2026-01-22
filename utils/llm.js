// 小程序端大模型调用入口（通过云函数安全调用）
// API Key 现在保存在云端，避免泄露风险

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

// 以下工具函数保留用于客户端验证和显示
function isGeminiBaseUrl(baseUrl) {
  return /generativelanguage\.googleapis\.com/i.test(String(baseUrl || ''));
}

// 返回纯文本回答（通过云函数调用）
export async function askMood(text, overrideConfig) {
  try {
    const result = await wx.cloud.callFunction({
      name: 'callLLM',
      data: {
        action: 'askMood',
        text: text,
        overrideConfig: overrideConfig || null
      },
      timeout: 60000 // 增加到60秒超时
    });

    if (result && result.result && result.result.success) {
      return result.result.answer || '';
    } else {
      const errMsg = (result && result.result && result.result.error) || '调用失败';
      throw new Error(errMsg);
    }
  } catch (error) {
    console.error('askMood error:', error);
    throw new Error(error.errMsg || error.message || '云函数调用失败');
  }
}

// Gemini: 获取当前 Key 可用的模型列表（通过云函数调用）
export async function listGeminiModels(overrideConfig) {
  try {
    const result = await wx.cloud.callFunction({
      name: 'callLLM',
      data: {
        action: 'listGeminiModels',
        overrideConfig: overrideConfig || null
      },
      timeout: 60000 // 增加到60秒超时
    });

    if (result && result.result && result.result.success) {
      return result.result.models || [];
    } else {
      const errMsg = (result && result.result && result.result.error) || '调用失败';
      throw new Error(errMsg);
    }
  } catch (error) {
    console.error('listGeminiModels error:', error);
    throw new Error(error.errMsg || error.message || '云函数调用失败');
  }
}
