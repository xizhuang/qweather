App({
  onLaunch() {
    // 初始化云开发环境
    if (wx.cloud) {
      wx.cloud.init({
        // env 参数说明：
        //   env 参数决定接下来小程序发起的云开发调用（wx.cloud.xxx）会默认请求到哪个云环境的资源
        //   此处请填入环境 ID, 环境 ID 可在微信开发者工具的云开发控制台中查看
        //   如不填则使用默认环境（第一个创建的环境）
        // env: 'your-env-id',
        traceUser: true
      });
    }
  }
});
