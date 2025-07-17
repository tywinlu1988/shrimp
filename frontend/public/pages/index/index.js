// index.js - 拔草大虾首页业务逻辑
const app = getApp();

// 全局异常处理
const reportError = (error) => {
  console.error('页面发生错误:', error);
  // 上报前端错误日志到服务器
  wx.request({
    url: '/logs',
    method: 'POST',
    data: {
      page: 'index',
      error: error.message || '未知错误',
      stack: error.stack || '',
      time: new Date().toISOString()
    },
    fail: (err) => {
      console.error('错误上报失败:', err);
    }
  });
  
  // 显示友好的错误提示
  wx.showToast({
    title: '系统繁忙，请稍后再试',
    icon: 'none',
    duration: 2000
  });
};

Page({
  data: {
    productUrl: '', // 商品链接
    isLoading: false, // 加载状态
    isUrlValid: false, // URL是否有效
    placeholder: '粘贴淘宝/京东/拼多多等商品链接', // 输入框占位文本
    submitBtnText: '开始拔草', // 提交按钮文本
    tipText: '冲动前，先问拔草大虾', // 提示文本
    errorMsg: '', // 错误信息
    // 示例链接
    exampleLinks: [
      { name: '示例1: 网红吹风机', url: 'https://item.taobao.com/item.htm?id=123456789' },
      { name: '示例2: 智能手环', url: 'https://item.jd.com/12345678.html' }
    ]
  },

  onLoad: function() {
    // 页面加载时执行的逻辑
    this.checkClipboard();
    
    // 设置导航栏标题
    wx.setNavigationBarTitle({
      title: '拔草大虾'
    });
  },
  
  onShow: function() {
    // 每次页面显示时检查剪贴板
    this.checkClipboard();
  },
  
  // 检查剪贴板是否有商品链接
  checkClipboard: function() {
    wx.getClipboardData({
      success: (res) => {
        try {
          const clipboardContent = res.data || '';
          
          // 检查剪贴板内容是否为电商链接
          if (this.isShoppingUrl(clipboardContent) && !this.data.productUrl) {
            wx.showModal({
              title: '检测到商品链接',
              content: '是否使用剪贴板中的商品链接？',
              confirmText: '使用',
              cancelText: '取消',
              success: (res) => {
                if (res.confirm) {
                  this.setData({
                    productUrl: clipboardContent,
                    isUrlValid: true
                  });
                }
              }
            });
          }
        } catch (error) {
          console.error('检查剪贴板出错:', error);
        }
      }
    });
  },
  
  // 判断URL是否为电商链接
  isShoppingUrl: function(url) {
    if (!url || typeof url !== 'string') return false;
    
    // 电商平台域名列表
    const ecommerceDomains = [
      'taobao.com', 'tmall.com', 'jd.com', 'pinduoduo.com', 
      'yangkeduo.com', 'suning.com', 'kaola.com', 'vip.com',
      'amazon.cn', 'xiaohongshu.com', 'douyin.com', 'pchome.com.tw',
      'shopee.tw', 'momoshop.com.tw'
    ];
    
    // 检查URL是否包含电商域名
    return ecommerceDomains.some(domain => url.includes(domain)) && 
           (url.startsWith('http://') || url.startsWith('https://'));
  },
  
  // 输入框内容变化处理
  onInputChange: function(e) {
    const url = e.detail.value || '';
    const isValid = this.isShoppingUrl(url);
    
    this.setData({
      productUrl: url,
      isUrlValid: isValid,
      errorMsg: isValid ? '' : (url ? '请输入有效的商品链接' : '')
    });
  },
  
  // 清空输入框
  clearInput: function() {
    this.setData({
      productUrl: '',
      isUrlValid: false,
      errorMsg: ''
    });
  },
  
  // 使用示例链接
  useExampleLink: function(e) {
    const index = e.currentTarget.dataset.index;
    const link = this.data.exampleLinks[index].url;
    
    this.setData({
      productUrl: link,
      isUrlValid: true,
      errorMsg: ''
    });
  },
  
  // 粘贴剪贴板内容
  pasteFromClipboard: function() {
    wx.getClipboardData({
      success: (res) => {
        const clipboardContent = res.data || '';
        const isValid = this.isShoppingUrl(clipboardContent);
        
        this.setData({
          productUrl: clipboardContent,
          isUrlValid: isValid,
          errorMsg: isValid ? '' : '剪贴板内容不是有效的商品链接'
        });
        
        if (!isValid && clipboardContent) {
          wx.showToast({
            title: '不是有效的商品链接',
            icon: 'none'
          });
        }
      }
    });
  },
  
  // 提交商品链接进行分析
  submitUrl: function() {
    try {
      // 验证URL
      if (!this.data.isUrlValid) {
        this.setData({
          errorMsg: '请输入有效的商品链接'
        });
        return;
      }
      
      // 设置加载状态
      this.setData({
        isLoading: true,
        errorMsg: ''
      });
      
      // 调用后端API开始分析
      wx.request({
        url: '/analyze',
        method: 'POST',
        data: {
          url: this.data.productUrl
        },
        success: (res) => {
          if (res.statusCode === 200 && res.data && res.data.task_id) {
            // 跳转到加载页面，传递任务ID
            wx.navigateTo({
              url: `/pages/loading/loading?taskId=${res.data.task_id}`,
              fail: (err) => {
                console.error('导航到加载页面失败:', err);
                this.setData({
                  isLoading: false,
                  errorMsg: '页面跳转失败，请重试'
                });
              }
            });
          } else {
            // 处理API错误
            this.setData({
              isLoading: false,
              errorMsg: res.data?.error || '服务器响应异常，请重试'
            });
          }
        },
        fail: (err) => {
          console.error('API请求失败:', err);
          this.setData({
            isLoading: false,
            errorMsg: '网络请求失败，请检查网络连接'
          });
        }
      });
    } catch (error) {
      reportError(error);
      this.setData({
        isLoading: false
      });
    }
  },
  
  // 页面分享功能
  onShareAppMessage: function() {
    return {
      title: '拔草大虾 - 您的专属AI购物决策军师',
      path: '/pages/index/index',
      imageUrl: '/assets/images/share-cover.png' // 分享封面图
    };
  }
});