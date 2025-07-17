/**
 * 拔草大虾 - 加载页业务逻辑
 * pages/loading/loading.js
 */

// 获取应用实例
const app = getApp();

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 任务ID
    taskId: '',
    // 商品链接
    productUrl: '',
    // 加载状态：polling, completed, failed
    loadingStatus: 'polling',
    // 状态消息
    statusMessage: '正在解析商品链接...',
    // 进度百分比
    progress: 0,
    // 轮询次数
    pollCount: 0,
    // 最大轮询次数
    maxPollCount: 30,
    // 轮询间隔(毫秒)
    pollInterval: 2000,
    // 轮询定时器ID
    pollTimer: null,
    // 进度定时器ID
    progressTimer: null,
    // 错误信息
    errorMessage: '',
    // 状态消息列表
    statusMessages: [
      '正在解析商品链接...',
      '正在抓取商品评论...',
      'AI正在分析评论数据...',
      '正在生成拔草报告...',
      '即将完成...'
    ],
    // 当前状态消息索引
    currentMessageIndex: 0
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function(options) {
    // 检查参数
    if (!options || !options.task_id || !options.url) {
      this.handleError('缺少必要参数');
      return;
    }

    const taskId = options.task_id;
    const productUrl = decodeURIComponent(options.url);

    // 保存任务ID到全局
    app.saveTaskId(taskId);

    // 更新页面数据
    this.setData({
      taskId: taskId,
      productUrl: productUrl
    });

    // 开始轮询任务状态
    this.startPolling();

    // 启动进度条动画
    this.startProgressAnimation();

    // 启动状态消息动画
    this.startStatusMessageAnimation();
  },

  /**
   * 开始轮询任务状态
   */
  startPolling: function() {
    // 清除可能存在的定时器
    if (this.data.pollTimer) {
      clearTimeout(this.data.pollTimer);
    }

    // 检查任务状态
    this.checkTaskStatus();

    // 设置定时器继续轮询
    const timer = setTimeout(() => {
      // 检查是否超过最大轮询次数
      if (this.data.pollCount >= this.data.maxPollCount) {
        this.handleError('分析超时，请返回重试');
        return;
      }

      // 更新轮询次数并继续
      this.setData({
        pollCount: this.data.pollCount + 1
      });
      
      this.startPolling();
    }, this.data.pollInterval);

    // 保存定时器ID
    this.setData({
      pollTimer: timer
    });
  },

  /**
   * 检查任务状态
   */
  checkTaskStatus: function() {
    const taskId = this.data.taskId;
    
    if (!taskId || typeof taskId !== 'string') {
      this.handleError('无效的任务ID');
      return;
    }

    // 请求任务状态
    app.request({
      url: `/status/${taskId}`,
      method: 'GET'
    }).then(res => {
      // 根据任务状态处理
      if (res.status === 'completed' && res.data) {
        // 任务完成，保存报告数据并跳转
        app.saveReport(res.data);
        this.navigateToReport();
      } else if (res.status === 'failed') {
        // 任务失败
        this.handleError(res.message || '分析失败，请重试');
      } else {
        // 更新状态消息
        if (res.message) {
          this.setData({
            statusMessage: res.message
          });
        }
      }
    }).catch(err => {
      console.error('获取任务状态失败:', err);
      // 轮询过程中的错误不立即显示，继续尝试
      if (this.data.pollCount >= this.data.maxPollCount / 2) {
        this.handleError('网络异常，请检查网络连接');
      }
    });
  },

  /**
   * 启动进度条动画
   */
  startProgressAnimation: function() {
    // 清除可能存在的定时器
    if (this.data.progressTimer) {
      clearInterval(this.data.progressTimer);
    }

    // 设置初始进度
    this.setData({
      progress: 5
    });

    // 创建定时器，缓慢增加进度
    const timer = setInterval(() => {
      let currentProgress = this.data.progress;
      
      // 根据当前进度调整增长速度
      let increment = 0;
      if (currentProgress < 30) {
        increment = 1;
      } else if (currentProgress < 60) {
        increment = 0.7;
      } else if (currentProgress < 80) {
        increment = 0.5;
      } else if (currentProgress < 95) {
        increment = 0.2;
      } else {
        increment = 0;
      }

      // 更新进度
      currentProgress += increment;
      if (currentProgress > 95) {
        currentProgress = 95;
      }

      this.setData({
        progress: currentProgress
      });
    }, 300);

    // 保存定时器ID
    this.setData({
      progressTimer: timer
    });
  },

  /**
   * 启动状态消息动画
   */
  startStatusMessageAnimation: function() {
    // 每5秒切换一次状态消息
    setInterval(() => {
      const nextIndex = (this.data.currentMessageIndex + 1) % this.data.statusMessages.length;
      
      this.setData({
        currentMessageIndex: nextIndex,
        statusMessage: this.data.statusMessages[nextIndex]
      });
    }, 5000);
  },

  /**
   * 处理错误
   * @param {string} message - 错误消息
   */
  handleError: function(message) {
    // 清除所有定时器
    this.clearAllTimers();

    // 更新错误状态
    this.setData({
      loadingStatus: 'failed',
      errorMessage: message || '未知错误'
    });
  },

  /**
   * 清除所有定时器
   */
  clearAllTimers: function() {
    // 清除轮询定时器
    if (this.data.pollTimer) {
      clearTimeout(this.data.pollTimer);
    }
    
    // 清除进度条定时器
    if (this.data.progressTimer) {
      clearInterval(this.data.progressTimer);
    }
  },

  /**
   * 导航到报告页面
   */
  navigateToReport: function() {
    // 更新状态为完成
    this.setData({
      loadingStatus: 'completed',
      progress: 100
    });

    // 清除所有定时器
    this.clearAllTimers();

    // 延迟跳转，让用户看到100%的进度
    setTimeout(() => {
      wx.navigateTo({
        url: `/pages/report/report?task_id=${this.data.taskId}`,
        fail: (err) => {
          console.error('导航到报告页面失败:', err);
          this.handleError('无法打开报告页面');
        }
      });
    }, 800);
  },

  /**
   * 重试分析
   */
  retryAnalysis: function() {
    // 重置状态
    this.setData({
      loadingStatus: 'polling',
      pollCount: 0,
      progress: 0,
      errorMessage: '',
      currentMessageIndex: 0,
      statusMessage: this.data.statusMessages[0]
    });

    // 重新开始轮询和动画
    this.startPolling();
    this.startProgressAnimation();
  },

  /**
   * 取消分析并返回
   */
  cancelAnalysis: function() {
    // 清除所有定时器
    this.clearAllTimers();
    
    // 返回上一页
    wx.navigateBack({
      delta: 1
    });
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function() {
    // 清除所有定时器
    this.clearAllTimers();
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
  }
});