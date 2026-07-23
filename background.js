// 网站使用时长统计后台脚本 (专业增强版)

class WebsiteTimer {
  constructor() {
    this.activeTabInfo = null;
    this.lastActiveTime = null;
    this.continuousActiveTime = 0; // 连续浏览时长 (毫秒)
    this.isUserActive = true;
    this.currentDay = this.getTodayKey();
    
    // 默认配置
    this.defaultSettings = {
      blackList: ['newtab', 'extensions', 'devtools', 'localhost', '127.0.0.1'],
      minTimeThreshold: 5000,      // 5秒
      retentionDays: 90,          // 90天
      isPaused: false,
      breakReminderMins: 45,      // 45分钟久坐/护眼提醒 (0为关闭)
      subdomainGrouping: false,   // 是否合并子域名到主域名
      dailyLimits: {
        global: 0,                // 0 表示无全局限制 (毫秒)
        domains: {}               // { 'bilibili.com': 1800000 } (毫秒)
      },
      customCategories: {},        // { 'bilibili.com': 'work' }
      notifiedLimits: {}           // 记录已通知的项目 { '2026-07-23_global': true }
    };

    this.settings = { ...this.defaultSettings };
    this.initSettings();
    this.initializeEventListeners();
    this.updateBadge();
  }

  // 获取今天的日期键 YYYY-MM-DD
  getTodayKey() {
    return new Date().toISOString().split('T')[0];
  }

  // 从URL提取域名 (可根据设置决定是否合并子域名)
  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      if (['chrome:', 'chrome-extension:', 'edge:', 'about:', 'file:'].includes(urlObj.protocol)) {
        return null;
      }
      let host = urlObj.hostname.replace(/^www\./, '');

      if (this.settings.subdomainGrouping) {
        const parts = host.split('.');
        if (parts.length > 2) {
          host = parts.slice(-2).join('.');
        }
      }
      return host;
    } catch {
      return null;
    }
  }

  // 自动推断网站分类 (优先使用用户自定义设置)
  getDomainCategory(domain) {
    if (!domain) return 'other';
    
    if (this.settings.customCategories && this.settings.customCategories[domain]) {
      return this.settings.customCategories[domain];
    }

    const categories = {
      work: [
        'github.com', 'stackoverflow.com', 'gitee.com', 'v2ex.com', 'juejin.cn',
        'csdn.net', 'cnblogs.com', 'gitlab.com', 'notion.so', 'feishu.cn',
        'dingtalk.com', 'docs.qq.com', 'yuque.com', 'segmentfault.com', 'leetcodes.cn',
        'leetcode.com', 'w3schools.com', 'developer.mozilla.org', 'figma.com', 'npm.js'
      ],
      social: [
        'weibo.com', 'twitter.com', 'x.com', 'facebook.com', 'instagram.com',
        'linkedin.com', 'reddit.com', 'tieba.baidu.com', 'douban.com', 'xiaohongshu.com',
        'qq.com', 'weixin.qq.com', 'threads.net', 'discord.com'
      ],
      video: [
        'youtube.com', 'bilibili.com', 'netflix.com', 'iqiyi.com', 'v.qq.com',
        'youku.com', 'tiktok.com', 'douyin.com', 'twitch.tv', 'kuaishou.com',
        'mgtv.com', 'acfun.cn'
      ],
      shopping: [
        'taobao.com', 'jd.com', 'tmall.com', 'pinduoduo.com', 'amazon.com',
        'vip.com', 'suning.com', 'xianyu.com', 'ebay.com'
      ],
      news: [
        'zhihu.com', 'news.qq.com', 'toutiao.com', '163.com', 'sina.com.cn',
        'hupu.com', 'sspai.com', '36kr.com', 'ithome.com', 'solidot.org',
        'bbc.com', 'cnn.com', 'wsj.com'
      ]
    };

    for (const [cat, domains] of Object.entries(categories)) {
      if (domains.some(d => domain === d || domain.endsWith('.' + d))) {
        return cat;
      }
    }

    return 'other';
  }

  // 初始化设置
  async initSettings() {
    try {
      const result = await chrome.storage.local.get(['timer_settings']);
      if (result.timer_settings) {
        this.settings = { ...this.defaultSettings, ...result.timer_settings };
      } else {
        await chrome.storage.local.set({ timer_settings: this.defaultSettings });
      }
    } catch (e) {
      console.error('初始化设置失败:', e);
    }
  }

  // 检查域名是否在黑名单/忽略列表中
  isBlacklisted(domain) {
    if (!domain) return true;
    if (this.settings.isPaused) return true;
    return this.settings.blackList.some(item => {
      const trimmed = item.trim().toLowerCase();
      return trimmed && (domain.toLowerCase() === trimmed || domain.toLowerCase().includes(trimmed));
    });
  }

  // 初始化事件监听器
  initializeEventListeners() {
    chrome.tabs.onActivated.addListener((activeInfo) => {
      this.handleTabChange(activeInfo.tabId);
    });

    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.active) {
        this.handleTabChange(tabId);
      }
    });

    chrome.windows.onFocusChanged.addListener((windowId) => {
      if (windowId === chrome.windows.WINDOW_ID_NONE) {
        this.handleWindowBlur();
      } else {
        this.handleWindowFocus(windowId);
      }
    });

    chrome.idle.onStateChanged.addListener((state) => {
      this.handleIdleStateChange(state);
    });

    chrome.idle.setDetectionInterval(15);

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.timer_settings) {
        this.settings = { ...this.defaultSettings, ...changes.timer_settings.newValue };
        this.updateBadge();
      }
    });
  }

  // 处理标签页切换
  async handleTabChange(tabId) {
    if (this.activeTabInfo && this.isUserActive) {
      await this.saveTimeSpent();
    }

    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab.url) {
        const domain = this.extractDomain(tab.url);
        
        if (domain && !this.isBlacklisted(domain)) {
          await this.recordVisit(domain, tab.title);
          this.activeTabInfo = {
            domain: domain,
            url: tab.url,
            title: tab.title
          };
          this.lastActiveTime = Date.now();
        } else {
          this.activeTabInfo = null;
          this.lastActiveTime = null;
        }
      } else {
        this.activeTabInfo = null;
        this.lastActiveTime = null;
      }
    } catch (error) {
      this.activeTabInfo = null;
      this.lastActiveTime = null;
    }
  }

  // 处理窗口失去焦点
  handleWindowBlur() {
    this.isUserActive = false;
    this.continuousActiveTime = 0; // 重置连续活动时间
    this.saveTimeSpent();
  }

  // 处理窗口获得焦点
  async handleWindowFocus(windowId) {
    this.isUserActive = true;
    try {
      const tabs = await chrome.tabs.query({ active: true, windowId: windowId });
      if (tabs.length > 0) {
        await this.handleTabChange(tabs[0].id);
      }
    } catch (error) {
      console.log('获取活动标签页失败:', error);
    }
  }

  // 处理用户空闲状态变化
  handleIdleStateChange(state) {
    if (state === 'idle' || state === 'locked') {
      this.isUserActive = false;
      this.continuousActiveTime = 0;
      this.saveTimeSpent();
    } else if (state === 'active') {
      this.isUserActive = true;
      this.lastActiveTime = Date.now();
    }
  }

  // 保存时间记录
  async saveTimeSpent() {
    if (!this.activeTabInfo || !this.lastActiveTime || this.settings.isPaused) {
      return;
    }

    const domain = this.activeTabInfo.domain;
    if (this.isBlacklisted(domain)) {
      return;
    }

    const timeSpent = Date.now() - this.lastActiveTime;
    const minThreshold = this.settings.minTimeThreshold || 5000;

    if (timeSpent < minThreshold) {
      return;
    }

    // 累加连续浏览时长
    this.continuousActiveTime += timeSpent;
    this.checkBreakReminder();

    const today = this.getTodayKey();
    if (today !== this.currentDay) {
      await this.resetDailyData();
      this.currentDay = today;
    }

    const currentHour = new Date().getHours();

    try {
      const result = await chrome.storage.local.get([this.currentDay]);
      const todayData = result[this.currentDay] || {};

      if (!todayData[domain]) {
        todayData[domain] = {
          timeSpent: 0,
          lastTitle: this.activeTabInfo.title || domain,
          visits: 1,
          lastVisitTime: Date.now(),
          category: this.getDomainCategory(domain),
          hourlyUsage: new Array(24).fill(0)
        };
      }

      if (!todayData[domain].hourlyUsage) {
        todayData[domain].hourlyUsage = new Array(24).fill(0);
      }
      todayData[domain].category = this.getDomainCategory(domain);

      todayData[domain].timeSpent += timeSpent;
      todayData[domain].hourlyUsage[currentHour] = (todayData[domain].hourlyUsage[currentHour] || 0) + timeSpent;
      todayData[domain].lastTitle = this.activeTabInfo.title || domain;
      todayData[domain].lastVisit = Date.now();

      await chrome.storage.local.set({ [this.currentDay]: todayData });
      
      this.updateBadge(todayData);
      this.checkLimits(domain, todayData);
    } catch (error) {
      console.error('保存时间数据失败:', error);
    }

    this.lastActiveTime = Date.now();
  }

  // 检查久坐/连续上网护眼提醒
  checkBreakReminder() {
    const reminderMins = this.settings.breakReminderMins || 0;
    if (reminderMins <= 0) return;

    const thresholdMs = reminderMins * 60000;
    const todayKey = this.getTodayKey();
    const notified = this.settings.notifiedLimits || {};
    const breakKey = `${todayKey}_break_${Math.floor(this.continuousActiveTime / thresholdMs)}`;

    if (this.continuousActiveTime >= thresholdMs && !notified[breakKey]) {
      this.sendNotification(
        '🍵 连续上网护眼提醒',
        `您已连续专注浏览网页 ${reminderMins} 分钟！建议站起来活动身体，远眺放松眼睛。`
      );
      notified[breakKey] = true;
      chrome.storage.local.set({ timer_settings: { ...this.settings, notifiedLimits: notified } });
    }
  }

  // 记录新的访问
  async recordVisit(domain, title) {
    if (this.isBlacklisted(domain) || this.settings.isPaused) return;

    const today = this.getTodayKey();
    try {
      const result = await chrome.storage.local.get([today]);
      const todayData = result[today] || {};
      
      if (!todayData[domain]) {
        todayData[domain] = {
          timeSpent: 0,
          lastTitle: title || domain,
          visits: 1,
          lastVisitTime: Date.now(),
          category: this.getDomainCategory(domain),
          hourlyUsage: new Array(24).fill(0)
        };
      } else {
        const timeSinceLastVisit = Date.now() - (todayData[domain].lastVisitTime || 0);
        if (timeSinceLastVisit > 30000) {
          todayData[domain].visits = (todayData[domain].visits || 0) + 1;
          todayData[domain].lastVisitTime = Date.now();
        }
        todayData[domain].lastTitle = title || domain;
      }

      await chrome.storage.local.set({ [today]: todayData });
    } catch (error) {
      console.error('记录访问失败:', error);
    }
  }

  // 检查并发送时长超限提醒
  checkLimits(domain, todayData) {
    const limits = this.settings.dailyLimits || {};
    const todayKey = this.getTodayKey();
    const notified = this.settings.notifiedLimits || {};

    if (limits.global && limits.global > 0) {
      let totalMs = 0;
      Object.values(todayData).forEach(d => { totalMs += d.timeSpent || 0; });
      
      const globalNotifiedKey = `${todayKey}_global`;
      if (totalMs >= limits.global && !notified[globalNotifiedKey]) {
        this.sendNotification(
          '⏰ 每日浏览时长达到上限',
          `您今日的网页浏览总时长已达到 ${(limits.global / 3600000).toFixed(1)} 小时限制！`
        );
        notified[globalNotifiedKey] = true;
        chrome.storage.local.set({ timer_settings: { ...this.settings, notifiedLimits: notified } });
      }
    }

    if (limits.domains && limits.domains[domain]) {
      const domainLimitMs = limits.domains[domain];
      const domainSpentMs = todayData[domain]?.timeSpent || 0;
      const domainNotifiedKey = `${todayKey}_${domain}`;

      if (domainSpentMs >= domainLimitMs && !notified[domainNotifiedKey]) {
        this.sendNotification(
          `🛑 网站限额提醒: ${domain}`,
          `您在 ${domain} 的浏览时长已达到 ${(domainLimitMs / 60000).toFixed(0)} 分钟限制！`
        );
        notified[domainNotifiedKey] = true;
        chrome.storage.local.set({ timer_settings: { ...this.settings, notifiedLimits: notified } });
      }
    }
  }

  sendNotification(title, message) {
    if (chrome.notifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: title,
        message: message,
        priority: 2
      });
    }
  }

  async updateBadge(todayData = null) {
    try {
      if (this.settings.isPaused) {
        chrome.action.setBadgeText({ text: 'PAUSE' });
        chrome.action.setBadgeBackgroundColor({ color: '#757575' });
        return;
      }

      if (!todayData) {
        const today = this.getTodayKey();
        const result = await chrome.storage.local.get([today]);
        todayData = result[today] || {};
      }

      let totalMs = 0;
      Object.values(todayData).forEach(d => { totalMs += d.timeSpent || 0; });

      if (totalMs === 0) {
        chrome.action.setBadgeText({ text: '' });
        return;
      }

      const totalMinutes = Math.floor(totalMs / 60000);
      let text = '';
      if (totalMinutes < 60) {
        text = `${totalMinutes}m`;
      } else {
        const hours = (totalMinutes / 60).toFixed(1);
        text = `${hours}h`;
      }

      chrome.action.setBadgeText({ text: text });
      chrome.action.setBadgeBackgroundColor({ color: '#ff5722' });
    } catch (e) {
      // 忽略 Badge 更新异常
    }
  }

  async resetDailyData() {
    try {
      const result = await chrome.storage.local.get(null);
      const keys = Object.keys(result);
      const dateKeys = keys.filter(key => /^\d{4}-\d{2}-\d{2}$/.test(key));
      
      const retentionDays = this.settings.retentionDays || 90;
      if (retentionDays > 0) {
        const cutoffDateObj = new Date();
        cutoffDateObj.setDate(cutoffDateObj.getDate() - retentionDays);
        const cutoffDate = cutoffDateObj.toISOString().split('T')[0];
        
        const keysToRemove = dateKeys.filter(key => key < cutoffDate);
        if (keysToRemove.length > 0) {
          await chrome.storage.local.remove(keysToRemove);
          console.log(`按 ${retentionDays} 天保留策略清理老旧数据:`, keysToRemove);
        }
      }
    } catch (error) {
      console.error('重置与清理数据失败:', error);
    }
  }

  async forceSave() {
    if (this.isUserActive && this.activeTabInfo && this.lastActiveTime && !this.settings.isPaused) {
      await this.saveTimeSpent();
    }
  }
}

const websiteTimer = new WebsiteTimer();

setInterval(() => {
  websiteTimer.forceSave();
}, 15000);

setInterval(() => {
  websiteTimer.resetDailyData();
}, 43200000);

chrome.runtime.onStartup.addListener(() => {
  console.log('网站使用时长统计器已启动');
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('网站使用时长统计器已安装/重载');
});