// 云函数：安全调用大模型 API
const cloud = require('wx-server-sdk');
const axios = require('axios');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

// ⚠️ 将你的 API Key 配置在这里（环境变量更安全）
const LLM_CONFIG = {
  // OpenAI 兼容协议配置
  baseUrl: process.env.LLM_BASE_URL || '',
  model: process.env.LLM_MODEL || '',
  apiKey: process.env.LLM_API_KEY || '',
  
  // Gemini 配置（可选）
  //baseUrl: 'https://generativelanguage.googleapis.com',
  //model: 'gemini-2.5-flash',
  //apiKey: process.env.GEMINI_API_KEY || ''
};

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

function normalizeGeminiGenerateContentUrl(baseUrl, model) {
  let raw = String(baseUrl || '').trim().replace(/\/+$/, '');
  if (!raw) return '';
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

// 主函数入口
exports.main = async (event, context) => {
  const { action, text, overrideConfig } = event;
  
  // 使用传入的配置或默认配置
  const cfg = overrideConfig || LLM_CONFIG;
  const baseUrl = String(cfg.baseUrl || '').trim();
  const model = String(cfg.model || '').trim();
  const apiKey = String(cfg.apiKey || '').trim();
  
  console.log('Cloud function called:', { action, baseUrl, model });
  
  try {
    if (action === 'askMood') {
      // 处理情绪支持请求
      if (isGeminiBaseUrl(baseUrl)) {
        // Gemini API
        const url = normalizeGeminiGenerateContentUrl(baseUrl, model);
        if (!url) throw new Error('请配置 API Base URL');
        if (!model) throw new Error('请配置模型名称');
        if (!apiKey) throw new Error('请配置 API Key');
        
        const payload = {
          systemInstruction: {
            parts: [{
              text: '你是一个温柔、简洁的情绪支持助手。用中文回答，先共情，再给出2-4条可执行建议。'
            }]
          },
          contents: [{ role: 'user', parts: [{ text: String(text || '') }] }],
          generationConfig: { temperature: 0.8 }
        };
        
        console.log('Calling Gemini API:', url);
        
        const response = await axios.post(url, payload, {
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
          },
          timeout: 30000 // 30秒超时
        });
        
        const data = response.data;
        const parts = (data && data.candidates && data.candidates[0] && 
                      data.candidates[0].content && data.candidates[0].content.parts) || [];
        const answer = parts.map(function(p) { return (p && p.text) || ''; }).join('');
        
        return { success: true, answer: answer };
        
      } else {
        // OpenAI 兼容协议
        const url = normalizeChatCompletionsUrl(baseUrl);
        if (!url) throw new Error('请配置 API Base URL');
        if (!model) throw new Error('请配置模型名称');
        if (!apiKey) throw new Error('请配置 API Key');
        
        const payload = {
          model: model,
          messages: [
            {
              role: 'system',
              content: '你是一个温柔、简洁的情绪支持助手。用中文回答，先共情，再给出2-4条可执行建议。'
            },
            { role: 'user', content: text }
          ],
          temperature: 0.8
        };
        
        console.log('Calling OpenAI compatible API:', url);
        
        const response = await axios.post(url, payload, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          timeout: 30000 // 30秒超时
        });
        
        const data = response.data;
        const answer = (data && data.choices && data.choices[0] && 
                       data.choices[0].message && data.choices[0].message.content) || '';
        return { success: true, answer: answer };
      }
      
    } else if (action === 'listGeminiModels') {
      // 列出 Gemini 可用模型
      if (!isGeminiBaseUrl(baseUrl)) {
        throw new Error('当前 Base URL 不是 Gemini');
      }
      
      const url = normalizeGeminiListModelsUrl(baseUrl);
      if (!url) throw new Error('请配置 API Base URL');
      if (!apiKey) throw new Error('请配置 API Key');
      
      const response = await axios.get(url, {
        headers: {
          'x-goog-api-key': apiKey
        },
        timeout: 30000
      });
      
      const data = response.data;
      const models = ((data && data.models) || []).map(function(m) {
        return {
          name: (m && m.name) || '',
          displayName: (m && m.displayName) || '',
          supportedGenerationMethods: (m && m.supportedGenerationMethods) || []
        };
      }).filter(function(m) { return m.name; });
      
      return { success: true, models: models };
      
    } else {
      throw new Error(`未知的 action: ${action}`);
    }
    
  } catch (error) {
    console.error('Cloud function error:', error);
    return {
      success: false,
      error: error.message || String(error)
    };
  }
};
