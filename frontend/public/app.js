/**
 * 拔草大虾 - 小程序全局逻辑
 * app.js
 */

App({
  // 全局数据
  globalData: {
    // API基础路径
    apiBaseUrl: '/api',
    // 当前任务ID
    currentTaskId: '',
    // 当前报告数据
    currentReport: null,
    // 用户信息
    userInfo: null,
    // 错误日志收集
    errorLogs: {},
    // 版本信息
    version: '1.0.0',
    // 是否为开发环境
    isDev: false
  },

  /**
   * 小程序初始化时触发，全局只触发一次
   */
  onLaunch: function() {
    // 初始化全局异常捕获
    this.setupErrorHandler();
    
    // 检查更新
    this.checkUpdate();
    
    // 获取系统信息
    const systemInfo = wx.getSystemInfoSync();
    this.globalData.systemInfo = systemInfo;
    
    // 判断是否为开发环境
    this.globalData.isDev = __wxConfig.envVersion === 'develop' || __wxConfig.envVersion === 'trial';
    
    // 输出启动日志
    console.info('拔草大虾小程序启动成功', this.globalData.version, systemInfo.platform);
  },

  /**
   * 设置全局异常处理
   */
  setupErrorHandler: function() {
    // 监听JS错误
    wx.onError((error) => {
      this.handleError('js_error', error);
    });
    
    // 监听Promise未捕获异常
    wx.onUnhandledRejection((res) => {
      this.handleError('promise_error', res.reason);
    });
    
    // 监听页面不存在
    wx.onPageNotFound((res) => {
      this.handleError('page_not_found', res.path);
      // 导航到首页
      wx.switchTab({
        url: '/pages/index/index'
      });
    });
    
    // 监听内存警告
    wx.onMemoryWarning(() => {
      this.handleError('memory_warning', 'Memory limit warning triggered');
    });
  },

  /**
   * 处理错误并上报
   * @param {string} type - 错误类型
   * @param {string|object} error - 错误信息
   */
  handleError: function(type, error) {
    if (!type || typeof type !== 'string') {
      console.error('Invalid error type');
      return;
    }
    
    // 确保每种类型的错误只上报一次
    if (this.globalData.errorLogs[type]) {
      return;
    }
    
    // 格式化错误信息
    let errorMsg = '';
    if (typeof error === 'string') {
      errorMsg = error;
    } else if (error instanceof Error) {
      errorMsg = error.message;
    } else {
      try {
        errorMsg = JSON.stringify(error);
      } catch (e) {
        errorMsg = 'Error object cannot be stringified';
      }
    }
    
    // 记录错误
    this.globalData.errorLogs[type] = {
      message: errorMsg,
      time: new Date().toISOString(),
      page: this.getCurrentPageUrl()
    };
    
    // 上报错误日志
    this.reportError(type, this.globalData.errorLogs[type]);
    
    // 开发环境下输出错误
    if (this.globalData.isDev) {
      console.error(`[${type}]`, errorMsg);
    }
  },

  /**
   * 上报错误到服务器
   * @param {string} type - 错误类型
   * @param {object} errorData - 错误数据
   */
  reportError: function(type, errorData) {
    if (!type || !errorData) return;
    
    wx.request({
      url: `${this.globalData.apiBaseUrl}/logs`,
      method: 'POST',
      data: {
        type: type,
        error: errorData,
        device: this.globalData.systemInfo || {},
        version: this.globalData.version
      },
      fail: (err) => {
        console.error('Error reporting failed:', err);
      }
    });
  },

  /**
   * 获取当前页面URL
   * @returns {string} 当前页面路径
   */
  getCurrentPageUrl: function() {
    const pages = getCurrentPages();
    if (pages.length === 0) {
      return 'app';
    }
    const currentPage = pages[pages.length - 1];
    return currentPage.route || 'unknown';
  },

  /**
   * 检查小程序更新
   */
  checkUpdate: function() {
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager();
      
      updateManager.onCheckForUpdate((res) => {
        if (res.hasUpdate) {
          console.info('发现新版本');
        }
      });
      
      updateManager.onUpdateReady(() => {
        wx.showModal({
          title: '更新提示',
          content: '新版本已准备好，是否重启应用？',
          success: (res) => {
            if (res.confirm) {
              updateManager.applyUpdate();
            }
          }
        });
      });
      
      updateManager.onUpdateFailed(() => {
        wx.showToast({
          title: '更新失败，请稍后再试',
          icon: 'none'
        });
      });
    }
  },

  /**
   * 发起API请求
   * @param {object} options - 请求选项
   * @returns {Promise} 请求Promise
   */
  request: function(options) {
    if (!options || typeof options !== 'object') {
      return Promise.reject(new Error('Invalid request options'));
    }
    
    const { url, method = 'GET', data = {}, header = {} } = options;
    
    if (!url || typeof url !== 'string') {
      return Promise.reject(new Error('URL is required'));
    }
    
    // 构建完整URL
    const fullUrl = url.startsWith('http') ? url : `${this.globalData.apiBaseUrl}${url}`;
    
    // 默认请求头
    const defaultHeader = {
      'content-type': 'application/json'
    };
    
    return new Promise((resolve, reject) => {
      wx.request({
        url: fullUrl,
        method: method,
        data: data,
        header: { ...defaultHeader, ...header },
        success: (res) => {
          // 处理HTTP状态码
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data);
          } else {
            // 处理HTTP错误
            const error = new Error(`Request failed with status ${res.statusCode}`);
            error.response = res;
            this.handleError('http_error', error);
            reject(error);
          }
        },
        fail: (err) => {
          this.handleError('request_error', err);
          reject(err);
        }
      });
    });
  },

  /**
   * 显示加载提示
   * @param {string} title - 提示文本
   */
  showLoading: function(title = '加载中...') {
    if (typeof title !== 'string') {
      title = '加载中...';
    }
    
    wx.showLoading({
      title: title,
      mask: true
    });
  },

  /**
   * 隐藏加载提示
   */
  hideLoading: function() {
    wx.hideLoading();
  },

  /**
   * 显示提示信息
   * @param {string} title - 提示文本
   * @param {string} icon - 图标类型
   */
  showToast: function(title, icon = 'none') {
    if (!title || typeof title !== 'string') {
      return;
    }
    
    wx.showToast({
      title: title,
      icon: icon,
      duration: 2000
    });
  },

  /**
   * 保存任务ID
   * @param {string} taskId - 任务ID
   */
  saveTaskId: function(taskId) {
    if (!taskId || typeof taskId !== 'string') {
      console.error('Invalid task ID');
      return;
    }
    
    this.globalData.currentTaskId = taskId;
  },

  /**
   * 保存报告数据
   * @param {object} report - 报告数据
   */
  saveReport: function(report) {
    if (!report || typeof report !== 'object') {
      console.error('Invalid report data');
      return;
    }
    
    this.globalData.currentReport = report;
  },

  /**
   * 分享报告
   * @param {object} report - 报告数据
   * @returns {object} 分享配置
   */
  shareReport: function(report) {
    if (!report) {
      report = this.globalData.currentReport;
    }
    
    if (!report) {
      return {
        title: '拔草大虾 - 您的专属AI购物决策军师',
        path: '/pages/index/index',
        imageUrl: '/assets/images/share-default.png'
      };
    }
    
    // 构建分享标题
    let title = '【拔草警告】';
    if (report.weed_out_score >= 70) {
      title += `这款商品问题较多，拔草指数${report.weed_out_score}分！`;
    } else if (report.weed_out_score >= 40) {
      title += `这款商品优缺点并存，拔草指数${report.weed_out_score}分`;
    } else {
      title += `这款商品整体不错，拔草指数仅${report.weed_out_score}分`;
    }
    
    return {
      title: title,
      path: `/pages/report/report?task_id=${this.globalData.currentTaskId}`,
      imageUrl: '/assets/images/share-report.png'
    };
  }
});