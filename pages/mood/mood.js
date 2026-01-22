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

    // 如果用户填写了配置，使用用户配置；否则使用云函数中的默认配置
    const baseUrl = (this.data.baseUrl || '').trim();
    const model = (this.data.model || '').trim();
    const apiKey = (this.data.apiKey || '').trim();
    
    const overrideConfig = (baseUrl && model && apiKey) ? { baseUrl, model, apiKey } : null;

    this.setData({ asking: true, error: '', answer: '' });
    try {
      const answer = await askMood(text, overrideConfig);
      this.setData({ answer: answer || '（没有拿到模型返回）', asking: false });
    } catch (err) {
      console.error(err);
      this.setData({ error: (err && err.message) || '网络或服务错误', asking: false });
    }
  },

  onShowCode() {
    const tips = [
      '云函数配置说明：',
      '',
      '1. 配置位置：',
      '   cloudfunctions/callLLM/index.js',
      '   修改 LLM_CONFIG 对象',
      '',
      '2. 支持的模型：',
      '   - OpenAI / DeepSeek / 阿里通义等',
      '   - Google Gemini',
      '',
      '3. 更新 API Key：',
      '   - 方式一：直接修改代码后重新部署',
      '   - 方式二：使用云环境变量（推荐）',
      '',
      '4. 查看详细文档：',
      '   cloudfunctions/README.md',
      '',
      '安全提示：API Key 保存在云端，安全可靠！'
    ].join('\n');

    wx.showModal({
      title: '云函数配置',
      content: tips,
      showCancel: false,
      confirmText: '知道了'
    });
  }
});
