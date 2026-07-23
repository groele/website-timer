// 页面活动状态检测脚本

class PageActivityDetector {
  constructor() {
    this.lastActivityTime = Date.now();
    this.isPageVisible = !document.hidden;
    this.activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    this.setupEventListeners();
    this.startActivityReporting();
  }

  // 设置事件监听器
  setupEventListeners() {
    // 监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
      this.isPageVisible = !document.hidden;
      this.reportActivity();
    }, { passive: true });

    // 监听用户活动事件
    this.activityEvents.forEach(eventType => {
      document.addEventListener(eventType, () => {
        this.handleUserActivity();
      }, { passive: true, capture: true });
    });

    // 监听页面焦点变化
    window.addEventListener('focus', () => {
      this.handleUserActivity();
    });

    window.addEventListener('blur', () => {
      this.reportActivity();
    });
  }

  // 处理用户活动
  handleUserActivity() {
    if (this.isPageVisible) {
      this.lastActivityTime = Date.now();
    }
  }

  // 向background script报告活动状态
  reportActivity() {
    const now = Date.now();
    const timeSinceLastActivity = now - this.lastActivityTime;
    const isActivelyUsing = this.isPageVisible && timeSinceLastActivity < 10000; // 10秒内有活动

    // 发送消息给background script（虽然当前版本的background script不需要这个信息，但为将来扩展预留）
    try {
      chrome.runtime.sendMessage({
        type: 'PAGE_ACTIVITY_STATUS',
        data: {
          isActive: isActivelyUsing,
          isVisible: this.isPageVisible,
          lastActivity: this.lastActivityTime,
          url: window.location.href,
          title: document.title
        }
      }).catch(() => {
        // 忽略发送失败的错误（扩展可能未加载完成）
      });
    } catch (error) {
      // 静默处理错误
    }
  }

  // 开始定期报告活动状态
  startActivityReporting() {
    // 每30秒报告一次状态
    setInterval(() => {
      this.reportActivity();
    }, 30000);

    // 页面加载完成时立即报告
    if (document.readyState === 'complete') {
      this.reportActivity();
    } else {
      window.addEventListener('load', () => {
        this.reportActivity();
      });
    }
  }
}

// 检查是否是有效的网页（避免在扩展页面等特殊页面运行）
if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
  // 延迟初始化，避免影响页面加载性能
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        new PageActivityDetector();
      }, 1000);
    });
  } else {
    setTimeout(() => {
      new PageActivityDetector();
    }, 1000);
  }
}