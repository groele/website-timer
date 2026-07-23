// 网站使用时长统计器 - 弹窗逻辑脚本 (时间轴日志全能版)

class PopupManager {
  constructor() {
    this.currentPeriod = 'today';
    this.currentCategory = 'all';
    this.currentSort = 'time';
    this.currentChart = 'trend';
    this.currentView = 'list'; // 'list' | 'timeline'
    this.searchQuery = '';
    
    this.rawData = {};
    this.settings = {};

    this.pomodoro = {
      timerId: null,
      secondsLeft: 1500,
      isRunning: false
    };

    this.init();
  }

  async init() {
    this.bindDOM();
    this.setupEventListeners();
    await this.loadSettings();
    await this.loadAllData();
    this.updateCurrentDateDisplay();
    this.startAutoRefresh();
  }

  getTodayKey() {
    return new Date().toISOString().split('T')[0];
  }

  getDateKeyOffset(offsetDays) {
    const d = new Date();
    d.setDate(d.getDate() - offsetDays);
    return d.toISOString().split('T')[0];
  }

  bindDOM() {
    this.elements = {
      navBtns: document.querySelectorAll('.nav-btn'),
      tabContents: document.querySelectorAll('.tab-content'),
      
      smartInsightsText: document.getElementById('smartInsightsText'),
      heatmapGrid: document.getElementById('heatmapGrid'),

      periodBtns: document.querySelectorAll('.period-btn'),
      metricTotalTime: document.getElementById('metricTotalTime'),
      metricWeekTrend: document.getElementById('metricWeekTrend'),
      metricDailyAvg: document.getElementById('metricDailyAvg'),
      metricDaysCount: document.getElementById('metricDaysCount'),
      metricTopSite: document.getElementById('metricTopSite'),
      metricTopTime: document.getElementById('metricTopTime'),
      metricFocusScore: document.getElementById('metricFocusScore'),
      metricScoreRating: document.getElementById('metricScoreRating'),
      
      chartTitle: document.getElementById('chartTitle'),
      chartBtns: document.querySelectorAll('.chart-btn'),
      chartSvg: document.getElementById('chartSvg'),
      
      // 视图切换
      viewBtns: document.querySelectorAll('.view-btn'),
      listViewSection: document.getElementById('listViewSection'),
      timelineViewSection: document.getElementById('timelineViewSection'),
      timelineList: document.getElementById('timelineList'),

      searchSiteInput: document.getElementById('searchSiteInput'),
      catPills: document.querySelectorAll('.cat-pill'),
      sortSelect: document.getElementById('sortSelect'),
      websitesList: document.getElementById('websitesList'),
      emptyState: document.getElementById('emptyState'),
      
      pomoTimerDisplay: document.getElementById('pomoTimerDisplay'),
      pomoStatusText: document.getElementById('pomoStatusText'),
      pomoStartBtn: document.getElementById('pomoStartBtn'),
      pomoResetBtn: document.getElementById('pomoResetBtn'),
      streakDaysVal: document.getElementById('streakDaysVal'),

      globalLimitInput: document.getElementById('globalLimitInput'),
      saveGlobalLimitBtn: document.getElementById('saveGlobalLimitBtn'),
      domainLimitName: document.getElementById('domainLimitName'),
      domainLimitTime: document.getElementById('domainLimitTime'),
      addDomainLimitBtn: document.getElementById('addDomainLimitBtn'),
      domainLimitsList: document.getElementById('domainLimitsList'),
      
      pauseTimerToggle: document.getElementById('pauseTimerToggle'),
      breakReminderSelect: document.getElementById('breakReminderSelect'),
      subdomainGroupToggle: document.getElementById('subdomainGroupToggle'),
      customCatName: document.getElementById('customCatName'),
      customCatSelect: document.getElementById('customCatSelect'),
      addCustomCatBtn: document.getElementById('addCustomCatBtn'),
      customCatTags: document.getElementById('customCatTags'),
      blacklistInput: document.getElementById('blacklistInput'),
      addBlacklistBtn: document.getElementById('addBlacklistBtn'),
      blacklistTags: document.getElementById('blacklistTags'),
      themeCards: document.querySelectorAll('.theme-card'),
      retentionSelect: document.getElementById('retentionSelect'),
      
      exportDataBtn: document.getElementById('exportDataBtn'),
      exportCsvBtn: document.getElementById('exportCsvBtn'),
      importDataBtn: document.getElementById('importDataBtn'),
      purgeShortBtn: document.getElementById('purgeShortBtn'),
      importFileInput: document.getElementById('importFileInput'),
      resetTodayBtn: document.getElementById('resetTodayBtn'),
      clearAllBtn: document.getElementById('clearAllBtn'),
      
      currentDateDisplay: document.getElementById('currentDateDisplay'),
      lastUpdateTime: document.getElementById('lastUpdateTime'),
      refreshDataBtn: document.getElementById('refreshDataBtn'),
      toastContainer: document.getElementById('toastContainer'),
      
      domainDetailModal: document.getElementById('domainDetailModal'),
      closeDetailModal: document.getElementById('closeDetailModal'),
      detailDomainName: document.getElementById('detailDomainName'),
      detailTotalTime: document.getElementById('detailTotalTime'),
      detailVisits: document.getElementById('detailVisits'),
      detailAvgSession: document.getElementById('detailAvgSession'),
      detailChartSvg: document.getElementById('detailChartSvg'),

      modalOverlay: document.getElementById('modalOverlay'),
      modalTitle: document.getElementById('modalTitle'),
      modalMessage: document.getElementById('modalMessage'),
      modalConfirmBtn: document.getElementById('modalConfirmBtn'),
      modalCancelBtn: document.getElementById('modalCancelBtn')
    };
  }

  setupEventListeners() {
    this.elements.navBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;
        this.elements.navBtns.forEach(b => b.classList.remove('active'));
        this.elements.tabContents.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(targetTab).classList.add('active');
      });
    });

    this.elements.periodBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.elements.periodBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentPeriod = btn.dataset.period;
        this.renderStatsTab();
      });
    });

    // 视图切换按钮 (排行榜 vs 时间轴)
    this.elements.viewBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.elements.viewBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentView = btn.dataset.view;

        if (this.currentView === 'list') {
          this.elements.listViewSection.style.display = 'block';
          this.elements.timelineViewSection.style.display = 'none';
        } else {
          this.elements.listViewSection.style.display = 'none';
          this.elements.timelineViewSection.style.display = 'block';
          this.renderTimeline();
        }
      });
    });

    this.elements.chartBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.elements.chartBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentChart = btn.dataset.chart;
        this.renderChartSection();
      });
    });

    this.elements.searchSiteInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.trim().toLowerCase();
      if (this.currentView === 'list') {
        this.renderWebsitesList();
      } else {
        this.renderTimeline();
      }
    });

    this.elements.catPills.forEach(pill => {
      pill.addEventListener('click', () => {
        this.elements.catPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.currentCategory = pill.dataset.cat;
        if (this.currentView === 'list') {
          this.renderWebsitesList();
        } else {
          this.renderTimeline();
        }
      });
    });

    this.elements.sortSelect.addEventListener('change', (e) => {
      this.currentSort = e.target.value;
      this.renderWebsitesList();
    });

    this.elements.pomoStartBtn.addEventListener('click', () => this.togglePomodoro());
    this.elements.pomoResetBtn.addEventListener('click', () => this.resetPomodoro());

    this.elements.saveGlobalLimitBtn.addEventListener('click', () => this.saveGlobalLimit());
    this.elements.addDomainLimitBtn.addEventListener('click', () => this.addDomainLimit());

    this.elements.pauseTimerToggle.addEventListener('change', (e) => {
      this.updateSetting('isPaused', e.target.checked);
      this.showToast(e.target.checked ? '已暂停网页计时' : '已恢复网页计时', 'success');
    });

    this.elements.breakReminderSelect.addEventListener('change', (e) => {
      const val = parseInt(e.target.value, 10);
      this.updateSetting('breakReminderMins', val);
      this.showToast(val > 0 ? `久坐提醒已设为连续 ${val} 分钟` : '连续提醒已关闭', 'success');
    });

    this.elements.subdomainGroupToggle.addEventListener('change', (e) => {
      this.updateSetting('subdomainGrouping', e.target.checked);
      this.showToast(e.target.checked ? '已开启子域名合并' : '已关闭子域名合并', 'success');
    });

    this.elements.addCustomCatBtn.addEventListener('click', () => this.addCustomCategory());
    this.elements.addBlacklistBtn.addEventListener('click', () => this.addBlacklistDomain());
    
    this.elements.themeCards.forEach(card => {
      card.addEventListener('click', () => {
        const themeVal = card.dataset.themeVal;
        this.applyTheme(themeVal);
        this.updateSetting('theme', themeVal);
      });
    });

    this.elements.retentionSelect.addEventListener('change', (e) => {
      const val = parseInt(e.target.value, 10);
      this.updateSetting('retentionDays', val);
      this.showToast(`数据保留规则已更新为: ${val === 0 ? '永久' : val + '天'}`, 'success');
    });

    this.elements.exportDataBtn.addEventListener('click', () => this.exportJSONData());
    this.elements.exportCsvBtn.addEventListener('click', () => this.exportCSVData());
    this.elements.importDataBtn.addEventListener('click', () => this.elements.importFileInput.click());
    this.elements.purgeShortBtn.addEventListener('click', () => this.purgeShortVisits());
    this.elements.importFileInput.addEventListener('change', (e) => this.importJSONData(e));
    
    this.elements.resetTodayBtn.addEventListener('click', () => {
      this.showConfirmModal('重置今日数据', '确定要清空今日的所有浏览记录吗？此操作不可撤销。', () => this.resetTodayData());
    });

    this.elements.clearAllBtn.addEventListener('click', () => {
      this.showConfirmModal('清空所有历史', '警告：此操作将清空包含历史记录与限制设置在内的所有数据！确定继续？', () => this.clearAllHistoryData());
    });

    this.elements.closeDetailModal.addEventListener('click', () => {
      this.elements.domainDetailModal.style.display = 'none';
    });
    this.elements.domainDetailModal.addEventListener('click', (e) => {
      if (e.target === this.elements.domainDetailModal) {
        this.elements.domainDetailModal.style.display = 'none';
      }
    });

    this.elements.refreshDataBtn.addEventListener('click', () => {
      this.loadAllData();
      this.showToast('数据已更新', 'success');
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local') {
        this.loadAllData();
      }
    });
  }

  async loadSettings() {
    try {
      const res = await chrome.storage.local.get(['timer_settings']);
      const defaultSettings = {
        blackList: ['newtab', 'extensions', 'devtools', 'localhost', '127.0.0.1'],
        minTimeThreshold: 5000,
        retentionDays: 90,
        isPaused: false,
        breakReminderMins: 45,
        subdomainGrouping: false,
        dailyLimits: { global: 0, domains: {} },
        customCategories: {},
        theme: 'sunset'
      };

      this.settings = { ...defaultSettings, ...(res.timer_settings || {}) };
      this.applySettingsToUI();
    } catch (e) {
      console.error('加载设置失败:', e);
    }
  }

  applySettingsToUI() {
    this.elements.pauseTimerToggle.checked = !!this.settings.isPaused;
    this.elements.subdomainGroupToggle.checked = !!this.settings.subdomainGrouping;
    
    if (this.settings.breakReminderMins !== undefined) {
      this.elements.breakReminderSelect.value = this.settings.breakReminderMins.toString();
    }

    const globalMins = this.settings.dailyLimits?.global ? Math.round(this.settings.dailyLimits.global / 60000) : 0;
    this.elements.globalLimitInput.value = globalMins || '';
    
    const theme = this.settings.theme || 'sunset';
    this.applyTheme(theme);

    if (this.settings.retentionDays !== undefined) {
      this.elements.retentionSelect.value = this.settings.retentionDays.toString();
    }

    this.renderCustomCategoryTags();
    this.renderBlacklistTags();
    this.renderDomainLimitsList();
  }

  applyTheme(themeName) {
    document.body.setAttribute('data-theme', themeName);
    this.elements.themeCards.forEach(c => {
      c.classList.toggle('active', c.dataset.themeVal === themeName);
    });
  }

  async updateSetting(key, val) {
    this.settings[key] = val;
    await chrome.storage.local.set({ timer_settings: this.settings });
  }

  async loadAllData() {
    try {
      const res = await chrome.storage.local.get(null);
      const raw = {};
      Object.keys(res).forEach(k => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(k)) {
          raw[k] = res[k];
        }
      });
      this.rawData = raw;
      this.renderStatsTab();
      this.renderHeatmap();
      this.updateLastUpdateTime();
    } catch (e) {
      console.error('加载数据失败:', e);
    }
  }

  renderStatsTab() {
    const { dates, aggregatedDomains, periodData } = this.getProcessedPeriodData();
    this.renderMetrics(dates, aggregatedDomains);
    this.renderSmartInsights(aggregatedDomains);
    this.renderChartSection(periodData, aggregatedDomains);
    
    if (this.currentView === 'list') {
      this.renderWebsitesList(aggregatedDomains);
    } else {
      this.renderTimeline();
    }
  }

  getProcessedPeriodData() {
    const allDates = Object.keys(this.rawData).sort();
    const todayKey = this.getTodayKey();
    let dates = [];

    if (this.currentPeriod === 'today') {
      dates = [todayKey];
    } else if (this.currentPeriod === 'yesterday') {
      dates = [this.getDateKeyOffset(1)];
    } else if (this.currentPeriod === 'week') {
      for (let i = 6; i >= 0; i--) dates.push(this.getDateKeyOffset(i));
    } else if (this.currentPeriod === 'month') {
      for (let i = 29; i >= 0; i--) dates.push(this.getDateKeyOffset(i));
    } else if (this.currentPeriod === 'all') {
      dates = allDates.length > 0 ? allDates : [todayKey];
    }

    const aggregatedDomains = {};
    const periodData = {};

    dates.forEach(dKey => {
      const dayObj = this.rawData[dKey] || {};
      let dayTotal = 0;

      Object.entries(dayObj).forEach(([domain, data]) => {
        if (domain === '_timeline') return; // 跳过时间轴特殊字段

        const timeSpent = data.timeSpent || 0;
        const visits = data.visits || 0;
        const category = this.settings.customCategories?.[domain] || data.category || 'other';

        dayTotal += timeSpent;

        if (!aggregatedDomains[domain]) {
          aggregatedDomains[domain] = {
            domain: domain,
            timeSpent: 0,
            visits: 0,
            lastTitle: data.lastTitle || domain,
            category: category,
            hourlyUsage: new Array(24).fill(0)
          };
        }

        aggregatedDomains[domain].timeSpent += timeSpent;
        aggregatedDomains[domain].visits += visits;
        if (data.lastTitle) aggregatedDomains[domain].lastTitle = data.lastTitle;
        
        if (data.hourlyUsage) {
          for (let h = 0; h < 24; h++) {
            aggregatedDomains[domain].hourlyUsage[h] += (data.hourlyUsage[h] || 0);
          }
        }
      });

      periodData[dKey] = {
        totalTime: dayTotal,
        dayData: dayObj
      };
    });

    return { dates, aggregatedDomains, periodData };
  }

  // 📜 渲染 24小时 Chronological 浏览时间轴日志
  renderTimeline() {
    const { dates } = this.getProcessedPeriodData();
    let events = [];

    dates.forEach(dKey => {
      const dayObj = this.rawData[dKey] || {};
      const timelineArr = dayObj._timeline || [];
      events = events.concat(timelineArr);
    });

    // 过滤分类
    if (this.currentCategory !== 'all') {
      events = events.filter(e => e.category === this.currentCategory);
    }

    // 过滤搜索关键字
    if (this.searchQuery) {
      events = events.filter(e => 
        e.domain.toLowerCase().includes(this.searchQuery) ||
        (e.title && e.title.toLowerCase().includes(this.searchQuery))
      );
    }

    // 按时间倒序
    events.sort((a, b) => b.timestamp - a.timestamp);

    const container = this.elements.timelineList;
    const emptyState = this.elements.emptyState;

    if (events.length === 0) {
      container.innerHTML = '';
      emptyState.style.display = 'flex';
      return;
    }

    emptyState.style.display = 'none';

    container.innerHTML = events.map(ev => {
      const durStr = this.formatDuration(ev.durationMs);
      return `
        <div class="timeline-item">
          <div class="timeline-dot"></div>
          <div class="timeline-time">${ev.time || '12:00'}</div>
          <div class="timeline-content">
            <div class="timeline-header-row">
              <span class="timeline-domain">${ev.domain}</span>
              <span class="timeline-dur">+${durStr}</span>
            </div>
            <div class="timeline-page-title truncate">${ev.title || ev.domain}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  renderSmartInsights(aggregatedDomains) {
    const list = Object.values(aggregatedDomains);
    let totalMs = 0;
    const catMs = { work: 0, video: 0, social: 0, shopping: 0, news: 0, other: 0 };

    list.forEach(d => {
      totalMs += d.timeSpent;
      const c = d.category || 'other';
      if (catMs[c] !== undefined) catMs[c] += d.timeSpent;
    });

    if (totalMs === 0) {
      this.elements.smartInsightsText.textContent = '💡 提示：开始浏览网页后，此处将呈现个性化习惯分析。';
      return;
    }

    const workMins = Math.round(catMs.work / 60000);
    const entMins = Math.round((catMs.video + catMs.social + catMs.shopping) / 60000);

    if (workMins > entMins) {
      this.elements.smartInsightsText.textContent = `🌟 太棒了！您在此期间累计专注工作学习 ${workMins} 分钟，生产力状态极佳！`;
    } else if (entMins > 120) {
      this.elements.smartInsightsText.textContent = `💡 提醒：您在娱乐社交类网站已浏览 ${entMins} 分钟，建议开启番茄钟适当休息。`;
    } else {
      this.elements.smartInsightsText.textContent = `📊 提示：当前上网节奏较为平衡，工作与休息比例保持良好。`;
    }
  }

  renderHeatmap() {
    const grid = this.elements.heatmapGrid;
    grid.innerHTML = '';

    const daysCount = 140;
    const heatData = [];
    let maxMs = 1;

    for (let i = daysCount - 1; i >= 0; i--) {
      const dKey = this.getDateKeyOffset(i);
      const dayObj = this.rawData[dKey] || {};
      let totalMs = 0;
      Object.entries(dayObj).forEach(([k, v]) => {
        if (k !== '_timeline') totalMs += (v.timeSpent || 0);
      });
      if (totalMs > maxMs) maxMs = totalMs;
      heatData.push({ dKey, totalMs });
    }

    heatData.forEach(({ dKey, totalMs }) => {
      const cell = document.createElement('div');
      cell.className = 'heatmap-cell';

      let level = 0;
      if (totalMs > 0) {
        const ratio = totalMs / maxMs;
        if (ratio > 0.75) level = 4;
        else if (ratio > 0.5) level = 3;
        else if (ratio > 0.25) level = 2;
        else level = 1;
      }

      cell.classList.add(`sq-${level}`);
      cell.title = `${dKey}: ${this.formatDuration(totalMs)}`;
      grid.appendChild(cell);
    });
  }

  renderMetrics(dates, aggregatedDomains) {
    const domainList = Object.values(aggregatedDomains);
    let totalMs = 0;
    domainList.forEach(d => { totalMs += d.timeSpent; });

    this.elements.metricTotalTime.textContent = this.formatDuration(totalMs);

    const activeDaysCount = dates.length || 1;
    const dailyAvgMs = Math.round(totalMs / activeDaysCount);
    this.elements.metricDailyAvg.textContent = this.formatDuration(dailyAvgMs);
    this.elements.metricDaysCount.textContent = `跨度 ${activeDaysCount} 天`;

    if (domainList.length > 0) {
      domainList.sort((a, b) => b.timeSpent - a.timeSpent);
      const top = domainList[0];
      this.elements.metricTopSite.textContent = top.domain;
      this.elements.metricTopTime.textContent = this.formatDuration(top.timeSpent);
    } else {
      this.elements.metricTopSite.textContent = '暂无';
      this.elements.metricTopTime.textContent = '--';
    }

    this.renderWeekTrend();
    this.renderFocusScore(domainList, totalMs);
  }

  renderWeekTrend() {
    let currWeekMs = 0;
    let prevWeekMs = 0;

    for (let i = 0; i < 7; i++) {
      const dKeyCurr = this.getDateKeyOffset(i);
      const dayCurr = this.rawData[dKeyCurr] || {};
      Object.entries(dayCurr).forEach(([k, v]) => { if (k !== '_timeline') currWeekMs += (v.timeSpent || 0); });

      const dKeyPrev = this.getDateKeyOffset(i + 7);
      const dayPrev = this.rawData[dKeyPrev] || {};
      Object.entries(dayPrev).forEach(([k, v]) => { if (k !== '_timeline') prevWeekMs += (v.timeSpent || 0); });
    }

    if (prevWeekMs === 0) {
      this.elements.metricWeekTrend.textContent = '本周新开始';
    } else {
      const diffRatio = ((currWeekMs - prevWeekMs) / prevWeekMs) * 100;
      const isUp = diffRatio >= 0;
      this.elements.metricWeekTrend.textContent = `较上周 ${isUp ? '📈 +' : '📉 '}${diffRatio.toFixed(0)}%`;
    }
  }

  renderFocusScore(domainList, totalMs) {
    if (totalMs === 0) {
      this.elements.metricFocusScore.textContent = '100分';
      this.elements.metricScoreRating.textContent = '保持专注';
      return;
    }

    let productiveMs = 0;
    let neutralMs = 0;

    domainList.forEach(d => {
      if (d.category === 'work') productiveMs += d.timeSpent;
      else if (d.category === 'news' || d.category === 'other') neutralMs += d.timeSpent;
    });

    const score = Math.min(100, Math.max(0, Math.round(((productiveMs + neutralMs * 0.5) / totalMs) * 100)));
    this.elements.metricFocusScore.textContent = `${score}分`;

    if (score >= 80) this.elements.metricScoreRating.textContent = '高效专注 🌟';
    else if (score >= 60) this.elements.metricScoreRating.textContent = '工作平衡 👍';
    else if (score >= 40) this.elements.metricScoreRating.textContent = '稍有分心 ☕';
    else this.elements.metricScoreRating.textContent = '建议休息 🧘';
  }

  renderChartSection(periodData = null, aggregatedDomains = null) {
    if (!periodData || !aggregatedDomains) {
      const processed = this.getProcessedPeriodData();
      periodData = processed.periodData;
      aggregatedDomains = processed.aggregatedDomains;
    }

    const svg = this.elements.chartSvg;
    svg.innerHTML = '';

    if (this.currentChart === 'trend') {
      this.elements.chartTitle.textContent = '每日浏览趋势 (分钟)';
      this.drawTrendChart(svg, periodData);
    } else if (this.currentChart === 'hourly') {
      this.elements.chartTitle.textContent = '24小时活跃时段分布';
      this.drawHourlyChart(svg, aggregatedDomains);
    } else if (this.currentChart === 'category') {
      this.elements.chartTitle.textContent = '网站类型使用占比';
      this.drawCategoryChart(svg, aggregatedDomains);
    } else if (this.currentChart === 'donut') {
      this.elements.chartTitle.textContent = '网站分类矢量环形图';
      this.drawDonutChart(svg, aggregatedDomains);
    }
  }

  drawTrendChart(svg, periodData) {
    const entries = Object.entries(periodData);
    if (entries.length === 0) return;

    const width = 360;
    const height = 120;
    const padding = 20;

    let maxMinutes = 1;
    entries.forEach(([, val]) => {
      const mins = Math.ceil(val.totalTime / 60000);
      if (mins > maxMinutes) maxMinutes = mins;
    });

    const barWidth = Math.max(4, Math.floor((width - padding * 2) / entries.length) - 4);
    
    entries.forEach(([dKey, val], index) => {
      const mins = val.totalTime / 60000;
      const barHeight = Math.max(3, (mins / maxMinutes) * (height - padding * 2));
      const x = padding + index * ((width - padding * 2) / entries.length) + 2;
      const y = height - padding - barHeight;

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', x);
      rect.setAttribute('y', y);
      rect.setAttribute('width', barWidth);
      rect.setAttribute('height', barHeight);
      rect.setAttribute('rx', '3');
      rect.setAttribute('fill', 'var(--primary)');
      rect.setAttribute('opacity', dKey === this.getTodayKey() ? '1' : '0.7');

      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = `${dKey}: ${Math.round(mins)}分钟`;
      rect.appendChild(title);

      svg.appendChild(rect);
    });
  }

  drawHourlyChart(svg, aggregatedDomains) {
    const hourlyArr = new Array(24).fill(0);
    Object.values(aggregatedDomains).forEach(d => {
      if (d.hourlyUsage) {
        for (let h = 0; h < 24; h++) hourlyArr[h] += (d.hourlyUsage[h] || 0);
      }
    });

    const width = 360;
    const height = 120;
    const padding = 20;
    let maxMs = 1;
    hourlyArr.forEach(v => { if (v > maxMs) maxMs = v; });

    hourlyArr.forEach((valMs, hour) => {
      const mins = valMs / 60000;
      const barHeight = Math.max(2, (valMs / maxMs) * (height - padding * 2));
      const x = padding + hour * ((width - padding * 2) / 24) + 1;
      const y = height - padding - barHeight;

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', x);
      rect.setAttribute('y', y);
      rect.setAttribute('width', Math.floor((width - padding * 2) / 24) - 2);
      rect.setAttribute('height', barHeight);
      rect.setAttribute('rx', '2');
      rect.setAttribute('fill', 'var(--primary)');
      rect.setAttribute('opacity', '0.85');

      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = `${hour}:00 - ${hour+1}:00 : ${Math.round(mins)}分钟`;
      rect.appendChild(title);

      svg.appendChild(rect);
    });
  }

  drawCategoryChart(svg, aggregatedDomains) {
    const cats = {
      work: { label: '💻 工作学习', ms: 0, color: '#10b981' },
      social: { label: '💬 社交通讯', ms: 0, color: '#38bdf8' },
      video: { label: '📹 视频娱乐', ms: 0, color: '#ff6b4a' },
      shopping: { label: '🛍️ 购物消费', ms: 0, color: '#f59e0b' },
      news: { label: '📰 新闻资讯', ms: 0, color: '#8b5cf6' },
      other: { label: '❓ 其他网站', ms: 0, color: '#94a3b8' }
    };

    let totalMs = 0;
    Object.values(aggregatedDomains).forEach(d => {
      const c = d.category || 'other';
      if (cats[c]) {
        cats[c].ms += d.timeSpent;
        totalMs += d.timeSpent;
      }
    });

    if (totalMs === 0) return;

    let currentY = 10;
    Object.values(cats).forEach(cat => {
      if (cat.ms === 0) return;
      const pct = (cat.ms / totalMs) * 100;

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', '10');
      text.setAttribute('y', currentY + 10);
      text.setAttribute('font-size', '10');
      text.setAttribute('fill', 'var(--text-main)');
      text.textContent = `${cat.label} (${pct.toFixed(1)}%)`;
      svg.appendChild(text);

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', '130');
      rect.setAttribute('y', currentY + 2);
      rect.setAttribute('width', (pct * 2.1).toFixed(1));
      rect.setAttribute('height', '10');
      rect.setAttribute('rx', '4');
      rect.setAttribute('fill', cat.color);
      svg.appendChild(rect);

      currentY += 18;
    });
  }

  drawDonutChart(svg, aggregatedDomains) {
    const cats = [
      { key: 'work', label: '工作', ms: 0, color: '#10b981' },
      { key: 'social', label: '社交', ms: 0, color: '#38bdf8' },
      { key: 'video', label: '视频', ms: 0, color: '#ff6b4a' },
      { key: 'shopping', label: '购物', ms: 0, color: '#f59e0b' },
      { key: 'news', label: '资讯', ms: 0, color: '#8b5cf6' },
      { key: 'other', label: '其他', ms: 0, color: '#94a3b8' }
    ];

    let totalMs = 0;
    Object.values(aggregatedDomains).forEach(d => {
      const c = d.category || 'other';
      const found = cats.find(item => item.key === c);
      if (found) {
        found.ms += d.timeSpent;
        totalMs += d.timeSpent;
      }
    });

    if (totalMs === 0) return;

    const cx = 80;
    const cy = 60;
    const radius = 40;
    const circumference = 2 * Math.PI * radius;

    let cumulativeAngle = 0;

    cats.forEach(cat => {
      if (cat.ms === 0) return;
      const ratio = cat.ms / totalMs;
      const strokeDasharray = `${ratio * circumference} ${circumference}`;
      const strokeDashoffset = -cumulativeAngle * circumference;

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', cx);
      circle.setAttribute('cy', cy);
      circle.setAttribute('r', radius);
      circle.setAttribute('fill', 'transparent');
      circle.setAttribute('stroke', cat.color);
      circle.setAttribute('stroke-width', '16');
      circle.setAttribute('stroke-dasharray', strokeDasharray);
      circle.setAttribute('stroke-dashoffset', strokeDashoffset);

      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = `${cat.label}: ${(ratio * 100).toFixed(1)}%`;
      circle.appendChild(title);

      svg.appendChild(circle);
      cumulativeAngle += ratio;
    });

    let legY = 16;
    cats.filter(c => c.ms > 0).forEach(cat => {
      const pct = ((cat.ms / totalMs) * 100).toFixed(1);
      
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', '160');
      rect.setAttribute('y', legY);
      rect.setAttribute('width', '10');
      rect.setAttribute('height', '10');
      rect.setAttribute('rx', '2');
      rect.setAttribute('fill', cat.color);
      svg.appendChild(rect);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', '176');
      text.setAttribute('y', legY + 9);
      text.setAttribute('font-size', '10');
      text.setAttribute('fill', 'var(--text-main)');
      text.textContent = `${cat.label} ${pct}%`;
      svg.appendChild(text);

      legY += 16;
    });
  }

  renderWebsitesList(aggregatedDomains = null) {
    if (!aggregatedDomains) {
      aggregatedDomains = this.getProcessedPeriodData().aggregatedDomains;
    }

    let domainList = Object.values(aggregatedDomains);
    let totalMs = 0;
    domainList.forEach(d => totalMs += d.timeSpent);

    if (this.currentCategory !== 'all') {
      domainList = domainList.filter(d => d.category === this.currentCategory);
    }

    if (this.searchQuery) {
      domainList = domainList.filter(d => 
        d.domain.toLowerCase().includes(this.searchQuery) || 
        (d.lastTitle && d.lastTitle.toLowerCase().includes(this.searchQuery))
      );
    }

    if (this.currentSort === 'time') {
      domainList.sort((a, b) => b.timeSpent - a.timeSpent);
    } else {
      domainList.sort((a, b) => b.visits - a.visits);
    }

    const container = this.elements.websitesList;
    const emptyState = this.elements.emptyState;

    if (domainList.length === 0) {
      container.innerHTML = '';
      emptyState.style.display = 'flex';
      return;
    }

    emptyState.style.display = 'none';

    const catLabels = {
      work: '💻工作', social: '💬社交', video: '📹视频',
      shopping: '🛍️购物', news: '📰资讯', other: '网页'
    };

    container.innerHTML = domainList.map(item => {
      const pct = totalMs > 0 ? ((item.timeSpent / totalMs) * 100).toFixed(1) : '0';
      const durationStr = this.formatDuration(item.timeSpent);
      const faviconUrl = `https://www.google.com/s2/favicons?domain=${item.domain}&sz=32`;
      const initialLetter = item.domain.charAt(0).toUpperCase();

      return `
        <div class="website-item" data-domain-detail="${item.domain}">
          <div class="site-icon-wrapper">
            <img src="${faviconUrl}" alt="${item.domain}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
            <span style="display:none">${initialLetter}</span>
          </div>

          <div class="site-body">
            <div class="site-title-row">
              <span class="site-name-text truncate" title="${item.domain}">${item.domain}</span>
              <span class="site-time-text">${durationStr}</span>
            </div>
            
            <div class="progress-track">
              <div class="progress-fill" style="width: ${pct}%;"></div>
            </div>

            <div class="site-meta-row">
              <span class="cat-badge">${catLabels[item.category] || '网页'}</span>
              <span>占比 ${pct}% • 访问 ${item.visits || 1}次</span>
            </div>
          </div>

          <div class="hover-actions" onclick="event.stopPropagation();">
            <button class="hover-btn" title="一键设为30分钟限制" data-quick-limit="${item.domain}">🛑 30m</button>
            <button class="hover-btn" title="一键加入黑名单" data-quick-black="${item.domain}">🛡️ 屏蔽</button>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('[data-domain-detail]').forEach(el => {
      el.addEventListener('click', () => {
        const domain = el.dataset.domainDetail;
        this.openDomainDetailModal(domain, aggregatedDomains[domain]);
      });
    });

    container.querySelectorAll('[data-quick-limit]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const domain = e.target.dataset.quickLimit;
        if (!this.settings.dailyLimits) this.settings.dailyLimits = { domains: {} };
        if (!this.settings.dailyLimits.domains) this.settings.dailyLimits.domains = {};
        this.settings.dailyLimits.domains[domain] = 1800000;
        this.updateSetting('dailyLimits', this.settings.dailyLimits);
        this.renderDomainLimitsList();
        this.showToast(`已快捷限制 ${domain} 每日 30 分钟`, 'success');
      });
    });

    container.querySelectorAll('[data-quick-black]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const domain = e.target.dataset.quickBlack;
        if (!this.settings.blackList) this.settings.blackList = [];
        if (!this.settings.blackList.includes(domain)) {
          this.settings.blackList.push(domain);
          this.updateSetting('blackList', this.settings.blackList);
          this.renderBlacklistTags();
          this.renderStatsTab();
          this.showToast(`已一键将 ${domain} 加入黑名单`, 'success');
        }
      });
    });
  }

  openDomainDetailModal(domain, data) {
    if (!domain || !data) return;

    this.elements.detailDomainName.textContent = domain;
    this.elements.detailTotalTime.textContent = this.formatDuration(data.timeSpent);
    this.elements.detailVisits.textContent = `${data.visits || 1} 次`;

    const avgSessionMs = Math.round(data.timeSpent / (data.visits || 1));
    this.elements.detailAvgSession.textContent = this.formatDuration(avgSessionMs);

    const svg = this.elements.detailChartSvg;
    svg.innerHTML = '';
    
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      last7Days.push(this.getDateKeyOffset(i));
    }

    let maxMs = 1;
    const historyMs = last7Days.map(dKey => {
      const dayData = this.rawData[dKey] || {};
      const spent = dayData[domain]?.timeSpent || 0;
      if (spent > maxMs) maxMs = spent;
      return { dKey, spent };
    });

    const height = 80;
    const barW = 24;

    historyMs.forEach((item, index) => {
      const barH = Math.max(2, (item.spent / maxMs) * (height - 20));
      const x = index * 38 + 10;
      const y = height - 15 - barH;

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', x);
      rect.setAttribute('y', y);
      rect.setAttribute('width', barW);
      rect.setAttribute('height', barH);
      rect.setAttribute('rx', '3');
      rect.setAttribute('fill', 'var(--primary)');

      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = `${item.dKey}: ${this.formatDuration(item.spent)}`;
      rect.appendChild(title);

      svg.appendChild(rect);
    });

    this.elements.domainDetailModal.style.display = 'flex';
  }

  formatDuration(milliseconds) {
    if (!milliseconds || milliseconds <= 0) return '0秒';
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      const remMins = minutes % 60;
      return `${hours}小时${remMins}分钟`;
    } else if (minutes > 0) {
      return `${minutes}分钟`;
    } else {
      return `${seconds}秒`;
    }
  }

  togglePomodoro() {
    if (this.pomodoro.isRunning) {
      clearInterval(this.pomodoro.timerId);
      this.pomodoro.isRunning = false;
      this.elements.pomoStartBtn.textContent = '继续专注';
      this.elements.pomoStatusText.textContent = '已暂停';
    } else {
      this.pomodoro.isRunning = true;
      this.elements.pomoStartBtn.textContent = '暂停';
      this.elements.pomoStatusText.textContent = '🔥 沉浸专注中...';

      this.pomodoro.timerId = setInterval(() => {
        this.pomodoro.secondsLeft--;
        this.updatePomoDisplay();

        if (this.pomodoro.secondsLeft <= 0) {
          clearInterval(this.pomodoro.timerId);
          this.pomodoro.isRunning = false;
          this.showToast('🎉 25分钟番茄钟完成！休息一下吧。', 'success');
          this.resetPomodoro();
        }
      }, 1000);
    }
  }

  resetPomodoro() {
    clearInterval(this.pomodoro.timerId);
    this.pomodoro.isRunning = false;
    this.pomodoro.secondsLeft = 1500;
    this.elements.pomoStartBtn.textContent = '开始专注';
    this.elements.pomoStatusText.textContent = '准备就绪';
    this.updatePomoDisplay();
  }

  updatePomoDisplay() {
    const mins = Math.floor(this.pomodoro.secondsLeft / 60);
    const secs = this.pomodoro.secondsLeft % 60;
    const str = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    this.elements.pomoTimerDisplay.textContent = str;
  }

  saveGlobalLimit() {
    const val = parseInt(this.elements.globalLimitInput.value, 10) || 0;
    const ms = val * 60000;
    
    if (!this.settings.dailyLimits) this.settings.dailyLimits = {};
    this.settings.dailyLimits.global = ms;

    this.updateSetting('dailyLimits', this.settings.dailyLimits);
    this.showToast(val > 0 ? `全局限额设置为 ${val} 分钟` : '已清除全局限制', 'success');
  }

  addDomainLimit() {
    const domain = this.elements.domainLimitName.value.trim().toLowerCase();
    const mins = parseInt(this.elements.domainLimitTime.value, 10);

    if (!domain || !mins) {
      this.showToast('请输入有效的域名与限额分钟', 'error');
      return;
    }

    if (!this.settings.dailyLimits) this.settings.dailyLimits = { domains: {} };
    if (!this.settings.dailyLimits.domains) this.settings.dailyLimits.domains = {};

    this.settings.dailyLimits.domains[domain] = mins * 60000;
    this.updateSetting('dailyLimits', this.settings.dailyLimits);
    
    this.elements.domainLimitName.value = '';
    this.elements.domainLimitTime.value = '';
    this.renderDomainLimitsList();
    this.showToast(`已成功限制 ${domain} ${mins} 分钟`, 'success');
  }

  renderDomainLimitsList() {
    const limits = this.settings.dailyLimits?.domains || {};
    const container = this.elements.domainLimitsList;
    const entries = Object.entries(limits);

    if (entries.length === 0) {
      container.innerHTML = '<div class="section-desc">暂未设定特定网站限制</div>';
      return;
    }

    container.innerHTML = entries.map(([domain, ms]) => `
      <div class="limit-item">
        <span><b>${domain}</b> : ${Math.round(ms/60000)} 分钟/天</span>
        <button class="icon-btn" data-del-domain="${domain}">❌</button>
      </div>
    `).join('');

    container.querySelectorAll('[data-del-domain]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const d = e.target.dataset.delDomain;
        delete this.settings.dailyLimits.domains[d];
        this.updateSetting('dailyLimits', this.settings.dailyLimits);
        this.renderDomainLimitsList();
      });
    });
  }

  addCustomCategory() {
    const domain = this.elements.customCatName.value.trim().toLowerCase();
    const cat = this.elements.customCatSelect.value;

    if (!domain) {
      this.showToast('请输入有效的域名', 'error');
      return;
    }

    if (!this.settings.customCategories) this.settings.customCategories = {};
    this.settings.customCategories[domain] = cat;

    this.updateSetting('customCategories', this.settings.customCategories);
    this.renderCustomCategoryTags();
    this.elements.customCatName.value = '';
    this.renderStatsTab();
    this.showToast(`已设置 ${domain} 为 ${cat} 分类`, 'success');
  }

  renderCustomCategoryTags() {
    const cats = this.settings.customCategories || {};
    const container = this.elements.customCatTags;
    const entries = Object.entries(cats);

    const catLabels = {
      work: '💻工作', social: '💬社交', video: '📹视频',
      shopping: '🛍️购物', news: '📰资讯'
    };

    if (entries.length === 0) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = entries.map(([d, c]) => `
      <div class="tag-item">
        <span>${d} (${catLabels[c] || c})</span>
        <span class="tag-remove" data-del-cat="${d}">×</span>
      </div>
    `).join('');

    container.querySelectorAll('[data-del-cat]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const domain = e.target.dataset.delCat;
        delete this.settings.customCategories[domain];
        this.updateSetting('customCategories', this.settings.customCategories);
        this.renderCustomCategoryTags();
        this.renderStatsTab();
      });
    });
  }

  addBlacklistDomain() {
    const val = this.elements.blacklistInput.value.trim().toLowerCase();
    if (!val) return;

    if (!this.settings.blackList) this.settings.blackList = [];
    if (!this.settings.blackList.includes(val)) {
      this.settings.blackList.push(val);
      this.updateSetting('blackList', this.settings.blackList);
      this.renderBlacklistTags();
      this.elements.blacklistInput.value = '';
      this.showToast(`已添加 ${val} 至黑名单`, 'success');
    }
  }

  renderBlacklistTags() {
    const list = this.settings.blackList || [];
    const container = this.elements.blacklistTags;

    container.innerHTML = list.map(item => `
      <div class="tag-item">
        <span>${item}</span>
        <span class="tag-remove" data-del-tag="${item}">×</span>
      </div>
    `).join('');

    container.querySelectorAll('[data-del-tag]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tag = e.target.dataset.delTag;
        this.settings.blackList = this.settings.blackList.filter(t => t !== tag);
        this.updateSetting('blackList', this.settings.blackList);
        this.renderBlacklistTags();
      });
    });
  }

  async purgeShortVisits() {
    try {
      let purgedCount = 0;
      const res = await chrome.storage.local.get(null);
      const dateKeys = Object.keys(res).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k));

      for (const dKey of dateKeys) {
        const dayData = res[dKey] || {};
        const cleaned = {};
        let modified = false;

        Object.entries(dayData).forEach(([domain, data]) => {
          if (domain === '_timeline') {
            cleaned._timeline = data;
            return;
          }
          if (data.timeSpent >= 10000) {
            cleaned[domain] = data;
          } else {
            purgedCount++;
            modified = true;
          }
        });

        if (modified) {
          await chrome.storage.local.set({ [dKey]: cleaned });
        }
      }

      await this.loadAllData();
      this.showToast(`已清理 ${purgedCount} 条微小测试记录！`, 'success');
    } catch (e) {
      this.showToast('清理失败', 'error');
    }
  }

  async exportJSONData() {
    try {
      const res = await chrome.storage.local.get(null);
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `website-timer-backup-${this.getTodayKey()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      this.showToast('JSON 数据导出成功！', 'success');
    } catch (e) {
      this.showToast('数据导出失败', 'error');
    }
  }

  exportCSVData() {
    try {
      const { aggregatedDomains } = this.getProcessedPeriodData();
      const domainList = Object.values(aggregatedDomains);

      if (domainList.length === 0) {
        this.showToast('暂无数据可导出为 CSV', 'error');
        return;
      }

      const catLabels = {
        work: '工作学习', social: '社交通讯', video: '视频娱乐',
        shopping: '购物消费', news: '新闻资讯', other: '其他网页'
      };

      let csvContent = "\uFEFF域名,最后页面标题,分类,使用时长(分钟),总秒数,访问次数,单次平均停留(秒)\n";

      domainList.forEach(item => {
        const title = (item.lastTitle || item.domain).replace(/,/g, '，');
        const mins = (item.timeSpent / 60000).toFixed(1);
        const secs = Math.round(item.timeSpent / 1000);
        const visits = item.visits || 1;
        const avgSecs = Math.round(secs / visits);
        const catName = catLabels[item.category] || '其他';

        csvContent += `"${item.domain}","${title}","${catName}",${mins},${secs},${visits},${avgSecs}\n`;
      });

      const encodedUri = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `website-timer-report-${this.getTodayKey()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      this.showToast('CSV 报表导出成功！', 'success');
    } catch (e) {
      this.showToast('CSV 导出失败', 'error');
    }
  }

  importJSONData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (typeof imported === 'object') {
          await chrome.storage.local.set(imported);
          await this.loadSettings();
          await this.loadAllData();
          this.showToast('备份数据恢复成功！', 'success');
        } else {
          throw new Error('无效数据格式');
        }
      } catch (err) {
        this.showToast('导入失败：文件 JSON 格式不合法', 'error');
      }
    };
    reader.readAsText(file);
  }

  async resetTodayData() {
    const today = this.getTodayKey();
    await chrome.storage.local.remove([today]);
    await this.loadAllData();
    this.showToast('今日浏览数据已重置', 'success');
  }

  async clearAllHistoryData() {
    await chrome.storage.local.clear();
    await this.loadSettings();
    await this.loadAllData();
    this.showToast('所有数据已重置', 'success');
  }

  showConfirmModal(title, msg, onConfirm) {
    this.elements.modalTitle.textContent = title;
    this.elements.modalMessage.textContent = msg;
    this.elements.modalOverlay.style.display = 'flex';

    const handleConfirm = () => {
      onConfirm();
      cleanup();
    };

    const cleanup = () => {
      this.elements.modalOverlay.style.display = 'none';
      this.elements.modalConfirmBtn.removeEventListener('click', handleConfirm);
    };

    this.elements.modalConfirmBtn.addEventListener('click', handleConfirm);
    this.elements.modalCancelBtn.onclick = cleanup;
  }

  showToast(msg, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    this.elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 2500);
  }

  updateCurrentDateDisplay() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
    this.elements.currentDateDisplay.textContent = dateStr;
  }

  updateLastUpdateTime() {
    const now = new Date();
    this.elements.lastUpdateTime.textContent = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }

  startAutoRefresh() {
    setInterval(() => {
      this.loadAllData();
    }, 10000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.popupManager = new PopupManager();
});