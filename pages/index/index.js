
import { cityLookupByName, weatherNow, weather24h, weather7d, airNow, indices1d } from '../../utils/qweather';

function safe(promise, fallbackValue) {
  return promise.catch((err) => {
    console.warn(err);
    return fallbackValue;
  });
}

Page({
  data: {
    city: '上海',
    displayCity: '',
    now: null,
    hourly: [],
    daily: [],
    air: null,
    indices: [],
    updateTime: '',
    loading: false,
    error: ''
  },

  onCityInput(e) {
    this.setData({ city: e.detail.value });
  },

  onMood() {
    wx.navigateTo({ url: '/pages/mood/mood' });
  },

  async onSearch() {
    const city = this.data.city.trim();
    if (!city) return;
    this.setData({ loading: true, error: '', now: null, hourly: [], daily: [], air: null, indices: [], updateTime: '' });
    try {
      // 1) 城市名称 → 城市ID
      const geo = await cityLookupByName(city);
      if (!geo || !geo.location || !geo.location.length) throw new Error('未找到城市');
      const loc = geo.location[0];
      const locationId = loc.id; // 城市ID

      // 2) 并发请求各类数据
      const [nowData, hourData, dayData, airData, idxData] = await Promise.all([
        weatherNow(locationId),
        weather24h(locationId),
        weather7d(locationId),
        safe(airNow(locationId), null),
        safe(indices1d(locationId), { daily: [] })
      ]);

      // 3) 整理数据结构
      const now = nowData && nowData.now ? nowData.now : null;
      const hourly = hourData && hourData.hourly ? hourData.hourly : [];
      const daily = dayData && dayData.daily ? dayData.daily : [];
      const air = airData && airData.now ? airData.now : null;
      const indices = idxData && idxData.daily ? idxData.daily.map(d => ({ name: d.name, category: d.category, text: d.text, type: d.type })) : [];

      this.setData({
        displayCity: loc.name,
        now,
        hourly,
        daily,
        air,
        indices,
        updateTime: (nowData && nowData.updateTime) || '',
        loading: false
      });
    } catch (err) {
      console.error(err);
      this.setData({ error: (err && err.message) || '网络或API错误', loading: false });
    }
  },
});
