/**
 * 拔草大虾 - 报告页业务逻辑
 * pages/report/report.js
 */

// 获取应用实例
const app = getApp();

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 报告数据
    report: null,
    // 商品信息
    productInfo: {},
    // 拔草指数
    weedOutScore: 0,
    // 一句话总结
    summary: '',
    // 正面标签
    positiveTags: [],
    // 负面标签
    negativeTags: [],
    // 优点列表
    pros: [],
    // 缺点列表
    cons: [],
    // 评论列表
    comments: [],
    // 页面状态：loading, success, error
    pageState: 'loading',
    // 错误信息
    errorMsg: '',
    // 任务ID
    taskId: '',
    // 动画数据
    animation: null,
    // 指数动画是否已完成
    scoreAnimated: false,
    // 分享按钮是否显示
    showShareBtn: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function(options) {
    // 初始化动画
    this.initAnimation();
    
    // 获取任务ID
    let taskId = '';
    if (options && options.task_id) {
      // 从页面参数获取任务ID
      taskId = options.task_id;
    } else if (app.globalData.currentTaskId) {
      // 从全局数据获取任务ID
      taskId = app.globalData.currentTaskId;
    }
    
    if (!taskId) {
      this.setData({
        pageState: 'error',
        errorMsg: '未找到任务ID，无法加载报告'
      });
      return;
    }
    
    this.setData({ taskId });
    
    // 检查全局是否已有报告数据
    if (app.globalData.currentReport) {
      this.processReportData(app.globalData.currentReport);
    } else {
      // 请求报告数据
      this.fetchReportData(taskId);
    }
  },

  /**
   * 初始化动画
   */
  initAnimation: function() {
    this.animation = wx.createAnimation({
      duration: 1500,
      timingFunction: 'ease',
      delay: 0
    });
  },

  /**
   * 请求报告数据
   * @param {string} taskId - 任务ID
   */
  fetchReportData: function(taskId) {
    if (!taskId || typeof taskId !== 'string') {
      this.setData({
        pageState: 'error',
        errorMsg: '无效的任务ID'
      });
      return;
    }
    
    // 显示加载状态
    this.setData({ pageState: 'loading' });
    
    // 请求报告数据
    app.request({
      url: `/report/${taskId}`,
      method: 'GET'
    }).then(res => {
      // 处理报告数据
      this.processReportData(res);
    }).catch(err => {
      console.error('获取报告失败:', err);
      
      // 如果是404错误，可能报告还未生成完成，尝试轮询
      if (err.response && err.response.statusCode === 404) {
        this.pollReportStatus(taskId);
      } else {
        this.setData({
          pageState: 'error',
          errorMsg: '获取报告失败，请稍后再试'
        });
      }
    });
  },

  /**
   * 轮询报告状态
   * @param {string} taskId - 任务ID
   * @param {number} attempts - 尝试次数
   */
  pollReportStatus: function(taskId, attempts = 0) {
    if (!taskId || typeof taskId !== 'string') {
      return;
    }
    
    // 最多尝试30次，每次间隔2秒，总共约1分钟
    if (attempts >= 30) {
      this.setData({
        pageState: 'error',
        errorMsg: '报告生成超时，请返回首页重试'
      });
      return;
    }
    
    // 请求任务状态
    app.request({
      url: `/status/${taskId}`,
      method: 'GET'
    }).then(res => {
      // 检查任务状态
      if (res.status === 'completed' && res.data) {
        // 任务完成，处理报告数据
        this.processReportData(res.data);
      } else if (res.status === 'failed') {
        // 任务失败
        this.setData({
          pageState: 'error',
          errorMsg: res.message || '报告生成失败'
        });
      } else {
        // 任务仍在进行中，继续轮询
        setTimeout(() => {
          this.pollReportStatus(taskId, attempts + 1);
        }, 2000);
      }
    }).catch(err => {
      console.error('轮询报告状态失败:', err);
      
      // 继续轮询
      setTimeout(() => {
        this.pollReportStatus(taskId, attempts + 1);
      }, 2000);
    });
  },

  /**
   * 处理报告数据
   * @param {Object} reportData - 报告数据
   */
  processReportData: function(reportData) {
    if (!reportData || typeof reportData !== 'object') {
      this.setData({
        pageState: 'error',
        errorMsg: '报告数据格式错误'
      });
      return;
    }
    
    try {
      // 保存报告数据到全局
      app.saveReport(reportData);
      
      // 更新页面数据
      this.setData({
        report: reportData,
        productInfo: reportData.product_info || {},
        weedOutScore: 0, // 先设为0，后面动画展示
        targetScore: reportData.weed_out_score || 0,
        summary: reportData.summary || '暂无总结',
        positiveTags: reportData.positive_tags || [],
        negativeTags: reportData.negative_tags || [],
        pros: reportData.pros || [],
        cons: reportData.cons || [],
        comments: reportData.comments || [],
        pageState: 'success'
      });
      
      // 延迟执行分数动画，确保DOM已渲染
      setTimeout(() => {
        this.animateScore();
      }, 500);
      
      // 延迟显示分享按钮
      setTimeout(() => {
        this.setData({ showShareBtn: true });
      }, 2000);
      
    } catch (error) {
      console.error('处理报告数据失败:', error);
      this.setData({
        pageState: 'error',
        errorMsg: '处理报告数据失败'
      });
    }
  },

  /**
   * 执行分数动画
   */
  animateScore: function() {
    if (this.data.scoreAnimated) {
      return;
    }
    
    const targetScore = this.data.targetScore;
    if (typeof targetScore !== 'number') {
      return;
    }
    
    // 分数动画
    let currentScore = 0;
    const duration = 1500; // 动画持续时间(ms)
    const interval = 30; // 更新间隔(ms)
    const steps = duration / interval;
    const increment = targetScore / steps;
    
    const timer = setInterval(() => {
      currentScore += increment;
      if (currentScore >= targetScore) {
        currentScore = targetScore;
        clearInterval(timer);
        this.setData({ scoreAnimated: true });
      }
      
      this.setData({
        weedOutScore: Math.round(currentScore)
      });
    }, interval);
  },

  /**
   * 重试加载报告
   */
  retryLoading: function() {
    if (!this.data.taskId) {
      wx.navigateBack();
      return;
    }
    
    this.fetchReportData(this.data.taskId);
  },

  /**
   * 返回首页
   */
  goToHome: function() {
    wx.navigateBack({
      delta: 2 // 返回两层，跳过loading页面
    });
  },

  /**
   * 分享报告
   */
  onShareAppMessage: function() {
    return app.shareReport(this.data.report);
  },

  /**
   * 点击分享按钮
   */
  onShareTap: function() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
  },

  /**
   * 复制商品链接
   */
  copyProductLink: function() {
    const url = this.data.productInfo.url;
    if (!url) {
      app.showToast('商品链接不存在');
      return;
    }
    
    wx.setClipboardData({
      data: url,
      success: () => {
        app.showToast('链接已复制', 'success');
      }
    });
  },

  /**
   * 查看原始商品
   */
  viewOriginalProduct: function() {
    const url = this.data.productInfo.url;
    if (!url) {
      app.showToast('商品链接不存在');
      return;
    }
    
    // 复制链接
    wx.setClipboardData({
      data: url,
      success: () => {
        wx.showModal({
          title: '提示',
          content: '商品链接已复制，请在浏览器中打开',
          showCancel: false
        });
      }
    });
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function() {
    // 页面渲染完成
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function() {
    // 页面显示
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function() {
    // 页面隐藏
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function() {
    // 页面卸载
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function() {
    // 下拉刷新
    if (this.data.taskId) {
      this.fetchReportData(this.data.taskId);
    }
    wx.stopPullDownRefresh();
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function() {
    // 上拉触底
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function() {
    return app.shareReport(this.data.report);
  }
});