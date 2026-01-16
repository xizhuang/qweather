import { askMood, getLlmConfig, setLlmConfig, clearLlmConfig, listGeminiModels } from '../../utils/llm';

Page({
  data: {
    baseUrl: '',
    model: '',
    apiKey: '',
    text: '',
    asking: false,
    listing: false,
    models: [],
    answer: '',
    error: ''
  },

  onLoad() {
    const cfg = getLlmConfig();
    this.setData({
      baseUrl: cfg.baseUrl || '',
      model: cfg.model || '',
      apiKey: cfg.apiKey || ''
    });
  },

  persistConfig(patch) {
    const next = {
      baseUrl: this.data.baseUrl,
      model: this.data.model,
      apiKey: this.data.apiKey,
      ...patch
    };
    this.setData(next);
    setLlmConfig(next);
  },

  onBaseUrlInput(e) {
    this.persistConfig({ baseUrl: e.detail.value });
  },

  onModelInput(e) {
    this.persistConfig({ model: e.detail.value });
  },

  onApiKeyInput(e) {
    this.persistConfig({ apiKey: e.detail.value });
  },

  onTextInput(e) {
    this.setData({ text: e.detail.value });
  },

  onClearKey() {
    clearLlmConfig();
    this.setData({ apiKey: '', models: [] });
    wx.showToast({ title: '已清除 Key', icon: 'none' });
  },

  async onListModels() {
    const baseUrl = (this.data.baseUrl || '').trim();
    const apiKey = (this.data.apiKey || '').trim();
    if (!baseUrl || !apiKey) {
      wx.showToast({ title: '先填写 Base URL 和 Key', icon: 'none' });
      return;
    }

    this.setData({ listing: true, error: '', models: [] });
    try {
      const models = await listGeminiModels({ baseUrl, apiKey });
      // Gemini listModels returns names like "models/gemini-1.5-flash".
      const simplified = models
        .filter((m) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
        .map((m) => ({
          name: m.name,
          shortName: String(m.name).replace(/^models\//, ''),
          displayName: m.displayName || ''
        }));

      this.setData({ models: simplified, listing: false });
      if (!simplified.length) {
        wx.showToast({ title: '没查到可用模型', icon: 'none' });
      }
    } catch (err) {
      console.error(err);
      this.setData({ error: (err && err.message) || '获取模型失败', listing: false });
    }
  },

  onPickModel(e) {
    const model = e && e.currentTarget && e.currentTarget.dataset ? e.currentTarget.dataset.model : '';
    if (!model) return;
    this.persistConfig({ model });
    wx.showToast({ title: `已选择：${model}`, icon: 'none' });
  },

  async onAsk() {
    const text = (this.data.text || '').trim();
    if (!text) {
      wx.showToast({ title: '先输入一句心情', icon: 'none' });
      return;
    }

    const baseUrl = (this.data.baseUrl || '').trim();
    const model = (this.data.model || '').trim();
    const apiKey = (this.data.apiKey || '').trim();
    if (!baseUrl || !model || !apiKey) {
      wx.showToast({ title: '先填写 Base URL / Model / Key', icon: 'none' });
      return;
    }

    this.setData({ asking: true, error: '', answer: '' });
    try {
      const answer = await askMood(text, { baseUrl, model, apiKey });
      this.setData({ answer: answer || '（没有拿到模型返回）', asking: false });
    } catch (err) {
      console.error(err);
      this.setData({ error: (err && err.message) || '网络或服务错误', asking: false });
    }
  },

  onShowCode() {
    const tips = [
      '直连方案（不走后端）如何配置：',
      '1) 申请 API Key（在服务商控制台创建）',
      '2) 在小程序后台把大模型域名加入 request 合法域名',
      '3) Base URL 通常是 https://xxx.com 或 https://xxx.com/v1',
      '4) 本项目支持两类：',
      '   - Gemini：POST /v1beta/models/{model}:generateContent?key=KEY',
      '   - OpenAI 兼容：POST /v1/chat/completions（Bearer KEY）',
      '',
      'Gemini 示例：',
      '- Base URL: https://generativelanguage.googleapis.com（不要带 /v1 或 /v1beta）',
      '- Model: gemini-1.5-flash（或 gemini-1.5-pro 等）',
      '',
      '代码位置：utils/llm.js',
      '- 会从本机缓存读取 baseUrl/model/apiKey',
      '- 返回 choices[0].message.content 作为最终文本',
      '',
      '安全提醒：直连会暴露 Key，仅建议本地学习。'
    ].join('\n');

    wx.showModal({
      title: '接入说明（关键点）',
      content: tips,
      showCancel: false,
      confirmText: '知道了'
    });
  }
});
