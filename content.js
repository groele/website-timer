// 页面活动状态检测与网页内提醒 Banner 脚本 (升级版)

class PageActivityDetector {
  constructor() {
    this.lastActivityTime = Date.now();
    this.isPageVisible = !document.hidden;
    this.activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    this.setupEventListeners();
    this.startActivityReporting();
    this.listenForBannerMessages();
  }

  setupEventListeners() {
    document.addEventListener('visibilitychange', () => {
      this.isPageVisible = !document.hidden;
      this.reportActivity();
    }, { passive: true });

    this.activityEvents.forEach(eventType => {
      document.addEventListener(eventType, () => {
        this.handleUserActivity();
      }, { passive: true, capture: true });
    });

    window.addEventListener('focus', () => {
      this.handleUserActivity();
    });

    window.addEventListener('blur', () => {
      this.reportActivity();
    });
  }

  handleUserActivity() {
    if (this.isPageVisible) {
      this.lastActivityTime = Date.now();
    }
  }

  reportActivity() {
    const now = Date.now();
    const timeSinceLastActivity = now - this.lastActivityTime;
    // 45 秒内有鼠标/键盘/滚轮/点击操作且页面在前台可视，才判定为真实活跃操作
    const isActivelyUsing = this.isPageVisible && (timeSinceLastActivity < 45000);

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
      }).catch(() => {});
    } catch (error) {}
  }

  startActivityReporting() {
    setInterval(() => {
      this.reportActivity();
    }, 5000);

    if (document.readyState === 'complete') {
      this.reportActivity();
    } else {
      window.addEventListener('load', () => {
        this.reportActivity();
      });
    }
  }

  // 监听来自 Background Script 的限额提醒 Banner 消息
  listenForBannerMessages() {
    chrome.runtime.onMessage.addListener((message) => {
      if (message && message.type === 'SHOW_LIMIT_BANNER') {
        this.showInPageBanner(message);
      }
    });
  }

  // 在网页顶部优雅注入温柔提醒 Banner
  showInPageBanner({ domain, currentMins, limitMins, percent }) {
    if (document.getElementById('website-timer-warning-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'website-timer-warning-banner';
    
    const isFull = percent >= 100;
    const bgGradient = isFull ? 
      'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 
      'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';

    banner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 40px;
      background: ${bgGradient};
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      z-index: 2147483647;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: wtSlideDown 0.4s ease-out;
    `;

    const icon = isFull ? '🛑' : '⚠️';
    const text = isFull ?
      `【时长限制】您在 ${domain} 的每日额度 (${limitMins}分钟) 已用尽！请注意休息。` :
      `【时长提醒】您在 ${domain} 已使用 ${currentMins} / ${limitMins} 分钟 (${percent}%)。`;

    banner.innerHTML = `
      <style>
        @keyframes wtSlideDown {
          from { transform: translateY(-100%); }
          to { transform: translateY(0); }
        }
      </style>
      <div style="display:flex; align-items:center; gap:8px;">
        <span>${icon}</span>
        <span>${text}</span>
      </div>
      <button id="wtCloseBannerBtn" style="background:transparent; border:none; color:white; font-size:16px; cursor:pointer; padding:0 4px;">✕</button>
    `;

    const mountTarget = document.body || document.documentElement;
    if (mountTarget) {
      mountTarget.appendChild(banner);
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        (document.body || document.documentElement).appendChild(banner);
      });
    }

    const closeBtn = banner.querySelector('#wtCloseBannerBtn');
    if (closeBtn) {
      closeBtn.onclick = () => banner.remove();
    }

    // 8 秒后自动收起
    setTimeout(() => {
      if (banner.parentNode) {
        banner.remove();
      }
    }, 8000);
  }
}

if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
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