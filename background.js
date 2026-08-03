// 网站使用时长统计后台脚本 (博士科研专属增强版)

class WebsiteTimer {
  constructor() {
    this.activeTabInfo = null;
    this.lastActiveTime = null;
    this.lastHeartbeatTime = null;
    this.continuousActiveTime = 0;
    this.isUserActive = false;
    this.isSaving = false;
    this.currentDay = this.getTodayKey();
    this.storageQueue = Promise.resolve();
    
    this.defaultSettings = {
      blackList: ['newtab', 'extensions', 'devtools', 'localhost', '127.0.0.1'],
      minTimeThreshold: 5000,
      retentionDays: 90,
      isPaused: false,
      breakReminderMins: 45,
      subdomainGrouping: false,
      dailyLimits: {
        global: 0,
        domains: {}
      },
      customCategories: {},
      notifiedLimits: {},
      pomoBlockDistract: false,
      siteNotes: {}
    };

    this.settings = { ...this.defaultSettings };
    this.initSettings();
    this.initPomodoro();
    this.initializeEventListeners();
    this.updateBadge();
    this.syncCurrentActiveTab();
  }

  async syncCurrentActiveTab() {
    try {
      const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (tabs && tabs.length > 0 && tabs[0].id) {
        await this.handleTabChange(tabs[0].id);
      }
    } catch (e) {
      console.log('同步活动标签页失败:', e);
    }
  }

  getTodayKey() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  runInStorageQueue(task) {
    if (!this.storageQueue) {
      this.storageQueue = Promise.resolve();
    }
    this.storageQueue = this.storageQueue.then(() => task()).catch((err) => {
      console.error('存储队列任务异常:', err);
    });
    return this.storageQueue;
  }

  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      if (['chrome:', 'chrome-extension:', 'edge:', 'about:', 'file:'].includes(urlObj.protocol)) {
        return null;
      }
      let host = urlObj.hostname.replace(/^www\./, '');

      if (this.settings.subdomainGrouping) {
        const parts = host.split('.');
        const doubleTlds = ['com.cn', 'net.cn', 'org.cn', 'gov.cn', 'edu.cn', 'co.uk', 'org.uk', 'ac.uk', 'co.jp'];
        const lastTwo = parts.slice(-2).join('.');
        if (doubleTlds.includes(lastTwo) && parts.length > 3) {
          host = parts.slice(-3).join('.');
        } else if (!doubleTlds.includes(lastTwo) && parts.length > 2) {
          host = parts.slice(-2).join('.');
        }
      }
      return host;
    } catch {
      return null;
    }
  }

  // 自动推断网站分类 (基于常用学术、开发、娱乐网站数据库)
  getDomainCategory(domain) {
    if (!domain) return 'other';
    
    if (this.settings.customCategories && this.settings.customCategories[domain]) {
      return this.settings.customCategories[domain];
    }

    const categories = {
      // 🎓 学术科研专属分类 (优先级最高)
      academic: [
        'arxiv.org', 'biorxiv.org', 'medrxiv.org', 'ssrn.com', 'researchgate.net', 'zenodo.org', 'chemrxiv.org',
        'nature.com', 'science.org', 'sciencedirect.com', 'ieee.org', 'acm.org', 'springer.com', 'wiley.com',
        'acs.org', 'rsc.org', 'cell.com', 'pnas.org', 'plos.org', 'frontiersin.org', 'mdpi.com', 'iop.org', 'aps.org',
        'scholar.google.com', 'semanticscholar.org', 'pubmed.ncbi.nlm.nih.gov', 'cnki.net', 'wanfangdata.com.cn',
        'connectedpapers.com', 'researchrabbit.ai', 'webofscience.com', 'scopus.com', 'cqvip.com',
        'overleaf.com', 'zotero.org', 'mendeley.com', 'elicit.org', 'consensus.app', 'scite.ai', 'chatpdf.com', 'arxiv-vanity.com',
        'openreview.net', 'distill.pub', 'wandb.ai', 'huggingface.co', 'paperswithcode.com', 'crossref.org', 'jstor.org',
        'chatgpt.com', 'openai.com', 'claude.ai', 'deepseek.com', 'kimi.ai', 'moonshot.cn', 'perplexity.ai', 'notebooklm.google', 'poe.com'
      ],
      work: [
        'github.com', 'stackoverflow.com', 'gitee.com', 'v2ex.com', 'juejin.cn',
        'csdn.net', 'cnblogs.com', 'gitlab.com', 'notion.so', 'feishu.cn',
        'dingtalk.com', 'docs.qq.com', 'yuque.com', 'segmentfault.com', 'leetcode.cn',
        'leetcode.com', 'w3schools.com', 'w3school.com.cn', 'developer.mozilla.org', 'figma.com', 'npmjs.com',
        'github.io', 'gitee.io', 'replicate.com', 'modal.com', 'kaggle.com', 'replit.com', 'codepen.io'
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

  isBlacklisted(domain) {
    if (!domain) return true;
    if (this.settings.isPaused) return true;
    return this.settings.blackList.some(item => {
      const trimmed = item.trim().toLowerCase();
      return trimmed && (domain.toLowerCase() === trimmed || domain.toLowerCase().includes(trimmed));
    });
  }

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

    chrome.idle.setDetectionInterval(60);

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.timer_settings) {
        this.settings = { ...this.defaultSettings, ...changes.timer_settings.newValue };
        this.updateBadge();
      }
    });

    if (chrome.alarms) {
      chrome.alarms.onAlarm.addListener((alarm) => {
        if (alarm.name === 'pomodoro_timer') {
          this.handlePomodoroComplete();
        }
      });
    }

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (!message) return true;

      if (message.type === 'PAGE_ACTIVITY_STATUS') {
        if (message.data && sender.tab && this.activeTabInfo && sender.tab.id === this.activeTabInfo.tabId) {
          if (message.data.title) {
            this.activeTabInfo.title = message.data.title;
          }
          if (message.data.isActive) {
            this.lastHeartbeatTime = Date.now();
            if (!this.isUserActive) {
              this.isUserActive = true;
              this.lastActiveTime = Date.now();
            }
          } else {
            if (this.isUserActive) {
              this.saveTimeSpent();
              this.isUserActive = false;
              this.lastActiveTime = null;
              this.lastHeartbeatTime = null;
            }
          }
        }
        sendResponse({ success: true });
      } else if (message.type === 'GET_TRACKER_STATUS') {
        sendResponse({
          success: true,
          isUserActive: this.isUserActive,
          lastHeartbeatTime: this.lastHeartbeatTime,
          activeDomain: this.activeTabInfo?.domain || null
        });
        return true;
      } else if (message.type === 'POMODORO_SET_PRESET') {
        this.setPomodoroPreset(message.mins).then(() => sendResponse({ success: true }));
        return true;
      } else if (message.type === 'POMODORO_TOGGLE') {
        this.togglePomodoro().then(() => sendResponse({ success: true }));
        return true;
      } else if (message.type === 'POMODORO_RESET') {
        this.resetPomodoro().then(() => sendResponse({ success: true }));
        return true;
      }
      return true;
    });
  }

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
            title: tab.title,
            tabId: tab.id
          };
          this.lastActiveTime = Date.now();

          if (this.pomodoro && this.pomodoro.isRunning && !this.pomodoro.isPaused && this.settings.pomoBlockDistract) {
            const cat = this.getDomainCategory(domain);
            if (['video', 'social', 'shopping', 'news'].includes(cat)) {
              this.sendInPageBanner(domain, 0, 0, 100);
              this.sendNotification(
                '🛡️ 专注钟进行时防打扰提醒',
                `您当前正处于 ${this.pomodoro.durationMins} 分钟论文研读专注钟阶段，建议专注于科研与写作！`
              );
            }
          }
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

  handleWindowBlur() {
    this.isUserActive = false;
    this.continuousActiveTime = 0;
    this.saveTimeSpent();
  }

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

  handleIdleStateChange(state) {
    if (state === 'idle' || state === 'locked') {
      this.isUserActive = false;
      this.continuousActiveTime = 0;
      this.saveTimeSpent();
    } else if (state === 'active') {
      this.isUserActive = true;
      this.lastActiveTime = Date.now();
      chrome.tabs.query({ active: true, currentWindow: true }).then(tabs => {
        if (tabs && tabs.length > 0) {
          this.handleTabChange(tabs[0].id);
        }
      }).catch(() => {});
    }
  }

  splitDurationByHourAndDay(startTime, endTime) {
    const chunks = [];
    let curr = startTime;
    while (curr < endTime) {
      const d = new Date(curr);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;
      const hour = d.getHours();

      const nextHour = new Date(d);
      nextHour.setMinutes(0, 0, 0);
      nextHour.setHours(nextHour.getHours() + 1);

      const chunkEnd = Math.min(endTime, nextHour.getTime());
      const durationMs = chunkEnd - curr;

      if (durationMs > 0) {
        chunks.push({ dateKey, hour, durationMs });
      }
      curr = chunkEnd;
    }
    return chunks;
  }

  async saveTimeSpent() {
    if (!this.activeTabInfo || !this.lastActiveTime || this.settings.isPaused) {
      return;
    }

    // 🛡️ 心跳保护：如果距离上一次页面活跃心跳超过 45 秒，说明用户停止了交互或离开电脑，直接终止本次挂线计时
    if (this.lastHeartbeatTime && (Date.now() - this.lastHeartbeatTime > 45000)) {
      this.isUserActive = false;
      this.lastActiveTime = null;
      this.lastHeartbeatTime = null;
      return;
    }

    const activeTab = { ...this.activeTabInfo };
    const domain = activeTab.domain;
    if (!domain || this.isBlacklisted(domain)) {
      return;
    }

    const tabTitle = activeTab.title || domain;
    const now = Date.now();
    const startTime = this.lastActiveTime;
    const timeSpent = now - startTime;
    const minThreshold = this.settings.minTimeThreshold || 5000;

    // 🛡️ 强制防离线防休眠心跳保护：
    // 如果两次统计记录之间跨度超过 2 分钟 (120,000 ms)，说明中间电脑处于睡眠/关屏/后台挂起状态，
    // 必须直接丢弃该段空转虚假时长，并将时间基准点重置为当前，防止将过夜休眠误算为网站使用时长！
    if (timeSpent > 120000) {
      this.lastActiveTime = now;
      return;
    }

    if (timeSpent < minThreshold) {
      return;
    }

    this.lastActiveTime = now;

    return this.runInStorageQueue(async () => {
      try {
        this.continuousActiveTime += timeSpent;
        this.checkBreakReminder();

        const today = this.getTodayKey();
        if (today !== this.currentDay) {
          this.currentDay = today;
          this.continuousActiveTime = 0;
          if (this.settings) {
            this.settings.notifiedLimits = {};
            await chrome.storage.local.set({ timer_settings: this.settings });
          }
        }

        const chunks = this.splitDurationByHourAndDay(startTime, now);
        for (const chunk of chunks) {
          const { dateKey, hour, durationMs } = chunk;
          const result = await chrome.storage.local.get([dateKey]);
          const dayData = (result && typeof result[dateKey] === 'object' && result[dateKey] !== null)
            ? result[dateKey]
            : {};

          if (!dayData[domain] || typeof dayData[domain] !== 'object') {
            dayData[domain] = {
              timeSpent: 0,
              lastTitle: tabTitle,
              visits: 1,
              lastVisitTime: now,
              category: this.getDomainCategory(domain),
              hourlyUsage: new Array(24).fill(0)
            };
          }

          if (!Array.isArray(dayData[domain].hourlyUsage) || dayData[domain].hourlyUsage.length !== 24) {
            dayData[domain].hourlyUsage = new Array(24).fill(0);
          }
          dayData[domain].category = this.getDomainCategory(domain);

          dayData[domain].timeSpent = (dayData[domain].timeSpent || 0) + durationMs;
          dayData[domain].hourlyUsage[hour] = (dayData[domain].hourlyUsage[hour] || 0) + durationMs;
          dayData[domain].lastTitle = tabTitle;
          dayData[domain].lastVisit = now;

          if (!Array.isArray(dayData._timeline)) {
            dayData._timeline = [];
          }

          const category = this.getDomainCategory(domain);
          const timeString = new Date(now).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
          const lastEvent = dayData._timeline[dayData._timeline.length - 1];

          if (lastEvent && lastEvent.domain === domain && (now - (lastEvent.timestamp || 0) < 120000)) {
            lastEvent.durationMs = (lastEvent.durationMs || 0) + durationMs;
            lastEvent.timestamp = now;
            if (activeTab.url) lastEvent.url = activeTab.url;
            if (tabTitle) lastEvent.title = tabTitle;
          } else {
            dayData._timeline.push({
              date: dateKey,
              time: timeString,
              timestamp: now,
              domain: domain,
              url: activeTab.url,
              title: tabTitle,
              durationMs: durationMs,
              category: category
            });

            if (dayData._timeline.length > 100) {
              dayData._timeline.shift();
            }
          }

          await chrome.storage.local.set({ [dateKey]: dayData });
          this.updateBadge(dayData);
          this.checkLimits(domain, dayData);
        }
      } catch (error) {
        console.error('保存时间数据失败:', error);
      } finally {
        this.isSaving = false;
      }
    });
  }

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
      this.settings.notifiedLimits = notified;
      chrome.storage.local.set({ timer_settings: { ...this.settings, notifiedLimits: notified } });
    }
  }

  async recordVisit(domain, title) {
    if (this.isBlacklisted(domain) || this.settings.isPaused) return;

    return this.runInStorageQueue(async () => {
      const today = this.getTodayKey();
      try {
        const result = await chrome.storage.local.get([today]);
        const todayData = (result && typeof result[today] === 'object' && result[today] !== null)
          ? result[today]
          : {};

        if (!todayData[domain] || typeof todayData[domain] !== 'object') {
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
          if (timeSinceLastVisit > 300000) {
            todayData[domain].visits = (todayData[domain].visits || 0) + 1;
            todayData[domain].lastVisitTime = Date.now();
          }
          todayData[domain].lastTitle = title || domain;
        }

        await chrome.storage.local.set({ [today]: todayData });
      } catch (error) {
        console.error('记录访问失败:', error);
      }
    });
  }

  checkLimits(domain, todayData) {
    if (!todayData || typeof todayData !== 'object') return;
    const limits = this.settings.dailyLimits || {};
    const todayKey = this.getTodayKey();
    const notified = this.settings.notifiedLimits || {};

    if (limits.global && limits.global > 0) {
      let totalMs = 0;
      Object.entries(todayData).forEach(([k, d]) => {
        if (k !== '_timeline' && d && typeof d === 'object') totalMs += (d.timeSpent || 0);
      });
      
      const globalNotifiedKey = `${todayKey}_global`;
      if (totalMs >= limits.global && !notified[globalNotifiedKey]) {
        this.sendNotification(
          '⏰ 每日浏览时长达到上限',
          `您今日的网页浏览总时长已达到 ${(limits.global / 3600000).toFixed(1)} 小时限制！`
        );
        notified[globalNotifiedKey] = true;
        this.settings.notifiedLimits = notified;
        chrome.storage.local.set({ timer_settings: { ...this.settings, notifiedLimits: notified } });
      }
    }

    if (limits.domains && limits.domains[domain]) {
      const domainLimitMs = limits.domains[domain];
      const domainSpentMs = todayData[domain]?.timeSpent || 0;
      const pct = Math.floor((domainSpentMs / domainLimitMs) * 100);

      const warn80Key = `${todayKey}_${domain}_80`;
      if (pct >= 80 && pct < 100 && !notified[warn80Key]) {
        this.sendInPageBanner(domain, Math.round(domainSpentMs / 60000), Math.round(domainLimitMs / 60000), pct);
        notified[warn80Key] = true;
        this.settings.notifiedLimits = notified;
        chrome.storage.local.set({ timer_settings: { ...this.settings, notifiedLimits: notified } });
      }

      const domainNotifiedKey = `${todayKey}_${domain}`;
      if (domainSpentMs >= domainLimitMs && !notified[domainNotifiedKey]) {
        this.sendNotification(
          `🛑 网站限额提醒: ${domain}`,
          `您在 ${domain} 的浏览时长已达到 ${(domainLimitMs / 60000).toFixed(0)} 分钟限制！`
        );
        this.sendInPageBanner(domain, Math.round(domainSpentMs / 60000), Math.round(domainLimitMs / 60000), 100);
        notified[domainNotifiedKey] = true;
        this.settings.notifiedLimits = notified;
        chrome.storage.local.set({ timer_settings: { ...this.settings, notifiedLimits: notified } });
      }
    }
  }

  sendInPageBanner(domain, currentMins, limitMins, percent) {
    if (this.activeTabInfo && this.activeTabInfo.tabId) {
      chrome.tabs.sendMessage(this.activeTabInfo.tabId, {
        type: 'SHOW_LIMIT_BANNER',
        domain: domain,
        currentMins: currentMins,
        limitMins: limitMins,
        percent: percent
      }).catch(() => {});
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

      if (typeof todayData !== 'object' || todayData === null) {
        todayData = {};
      }

      let totalMs = 0;
      Object.entries(todayData).forEach(([k, d]) => {
        if (k !== '_timeline' && d && typeof d === 'object') totalMs += (d.timeSpent || 0);
      });

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
      if (!result) return;
      const keys = Object.keys(result);
      const dateKeys = keys.filter(key => /^\d{4}-\d{2}-\d{2}$/.test(key));
      
      const retentionDays = this.settings.retentionDays || 90;
      if (retentionDays > 0) {
        const cutoffDateObj = new Date();
        cutoffDateObj.setDate(cutoffDateObj.getDate() - retentionDays);
        const year = cutoffDateObj.getFullYear();
        const month = String(cutoffDateObj.getMonth() + 1).padStart(2, '0');
        const day = String(cutoffDateObj.getDate()).padStart(2, '0');
        const cutoffDate = `${year}-${month}-${day}`;
        
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

  async initPomodoro() {
    try {
      const res = await chrome.storage.local.get(['pomodoro_state']);
      if (res.pomodoro_state) {
        this.pomodoro = res.pomodoro_state;
        if (this.pomodoro.isRunning && !this.pomodoro.isPaused && this.pomodoro.endTime) {
          const remain = Math.max(0, Math.ceil((this.pomodoro.endTime - Date.now()) / 1000));
          if (remain <= 0) {
            await this.handlePomodoroComplete();
          }
        }
      } else {
        this.pomodoro = {
          isRunning: false,
          isPaused: false,
          durationMins: 25,
          remainingSecs: 1500,
          endTime: null
        };
        await chrome.storage.local.set({ pomodoro_state: this.pomodoro });
      }
    } catch (e) {
      console.error('初始化番茄钟状态失败:', e);
    }
  }

  async setPomodoroPreset(mins) {
    if (chrome.alarms) {
      chrome.alarms.clear('pomodoro_timer');
    }
    this.pomodoro = {
      isRunning: false,
      isPaused: false,
      durationMins: mins,
      remainingSecs: mins * 60,
      endTime: null
    };
    await chrome.storage.local.set({ pomodoro_state: this.pomodoro });
  }

  async togglePomodoro() {
    if (this.pomodoro.isRunning && !this.pomodoro.isPaused) {
      if (chrome.alarms) {
        chrome.alarms.clear('pomodoro_timer');
      }
      if (this.pomodoro.endTime) {
        const remain = Math.max(0, Math.ceil((this.pomodoro.endTime - Date.now()) / 1000));
        this.pomodoro.remainingSecs = remain;
      }
      this.pomodoro.isRunning = false;
      this.pomodoro.isPaused = true;
      this.pomodoro.endTime = null;
    } else {
      const remainMs = (this.pomodoro.remainingSecs || (this.pomodoro.durationMins * 60)) * 1000;
      const endTime = Date.now() + remainMs;
      this.pomodoro.isRunning = true;
      this.pomodoro.isPaused = false;
      this.pomodoro.endTime = endTime;

      if (chrome.alarms) {
        chrome.alarms.create('pomodoro_timer', { when: endTime });
      }
    }
    await chrome.storage.local.set({ pomodoro_state: this.pomodoro });
  }

  async resetPomodoro() {
    if (chrome.alarms) {
      chrome.alarms.clear('pomodoro_timer');
    }
    const mins = this.pomodoro?.durationMins || 25;
    this.pomodoro = {
      isRunning: false,
      isPaused: false,
      durationMins: mins,
      remainingSecs: mins * 60,
      endTime: null
    };
    await chrome.storage.local.set({ pomodoro_state: this.pomodoro });
  }

  checkDailyRollover() {
    const today = this.getTodayKey();
    if (today !== this.currentDay) {
      this.currentDay = today;
      this.continuousActiveTime = 0;
      if (this.settings) {
        this.settings.notifiedLimits = {};
        chrome.storage.local.set({ timer_settings: this.settings });
      }
      this.resetDailyData();
      this.updateBadge({});
    }
  }

  async handlePomodoroComplete() {
    if (chrome.alarms) {
      chrome.alarms.clear('pomodoro_timer');
    }
    const mins = this.pomodoro?.durationMins || 25;
    this.pomodoro = {
      isRunning: false,
      isPaused: false,
      durationMins: mins,
      remainingSecs: mins * 60,
      endTime: null
    };
    await chrome.storage.local.set({ pomodoro_state: this.pomodoro });

    this.sendNotification(
      '🎉 番茄钟专注完成！',
      `您已成功完成 ${mins} 分钟科研专注！研读辛苦了，建议休息放松一下眼睛。`
    );
  }
}

const websiteTimer = new WebsiteTimer();

setInterval(() => {
  websiteTimer.checkDailyRollover();
  websiteTimer.forceSave();
}, 15000);

chrome.runtime.onStartup.addListener(() => {
  console.log('网站使用时长统计器已启动');
  websiteTimer.checkDailyRollover();
  websiteTimer.resetDailyData();
  websiteTimer.syncCurrentActiveTab();
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('网站使用时长统计器已安装/重载');
  websiteTimer.checkDailyRollover();
  websiteTimer.resetDailyData();
  websiteTimer.syncCurrentActiveTab();
});