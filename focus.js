// 🎓 沉浸科研专注全屏脚本

class FocusPageManager {
  constructor() {
    this.pomodoroState = null;
    this.uiInterval = null;
    this._hasChimed = false;

    this.quotes = [
      '“科研是一场马拉松，唯有沉心专注，方能登峰造极。”',
      '“Paper writing is a marathon, not a sprint.”',
      '“日拱一卒，功不唐捐；每日推进一点论文。”',
      '“Deep work is the superpower of the 21st century.”',
      '“沉心研读文献，构建扎实的理论基石。”',
      '“Success is the sum of small efforts, repeated day in and day out.”',
      '“灵感来自于不懈的思考与大量的文献阅读。”',
      '“保持专注，享受破解科研难题的时刻。”'
    ];

    this.init();
  }

  async init() {
    this.bindDOM();
    this.setupEventListeners();
    await this.loadPomodoroState();
    this.startUiTimer();
    this.randomizeQuote();

    // 自动请求进入全屏模式
    this.requestBrowserFullscreen();
  }

  bindDOM() {
    this.elements = {
      timerDisplay: document.getElementById('focusTimerDisplay'),
      statusText: document.getElementById('focusStatusText'),
      quoteText: document.getElementById('quoteText'),
      nextQuoteBtn: document.getElementById('nextQuoteBtn'),
      startBtn: document.getElementById('focusStartBtn'),
      resetBtn: document.getElementById('focusResetBtn'),
      exitBtn: document.getElementById('exitBtn'),
      toggleFullscreenBtn: document.getElementById('toggleFullscreenBtn'),
      presetBtns: document.querySelectorAll('.preset-btn')
    };
  }

  setupEventListeners() {
    this.elements.startBtn.addEventListener('click', () => this.togglePomodoro());
    this.elements.resetBtn.addEventListener('click', () => this.resetPomodoro());
    this.elements.exitBtn.addEventListener('click', () => this.exitFocus());
    this.elements.toggleFullscreenBtn.addEventListener('click', () => this.toggleBrowserFullscreen());
    this.elements.nextQuoteBtn.addEventListener('click', () => this.randomizeQuote());

    this.elements.presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const mins = parseInt(btn.dataset.mins, 10);
        this.setPomodoroPreset(mins);
      });
    });

    // 监听键盘按键
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.exitFocus();
      } else if (e.code === 'Space') {
        e.preventDefault();
        this.togglePomodoro();
      }
    });

    // 监听后台推送的状态变化
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.pomodoro_state) {
        this.syncPomodoroUI(changes.pomodoro_state.newValue);
      }
    });
  }

  randomizeQuote() {
    const q = this.quotes[Math.floor(Math.random() * this.quotes.length)];
    this.elements.quoteText.textContent = q;
  }

  requestBrowserFullscreen() {
    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch (e) {}
  }

  toggleBrowserFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }

  exitFocus() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    window.close();
  }

  async loadPomodoroState() {
    try {
      const res = await chrome.storage.local.get(['pomodoro_state']);
      if (res.pomodoro_state) {
        this.syncPomodoroUI(res.pomodoro_state);
      }
    } catch (e) {}
  }

  syncPomodoroUI(pState) {
    if (!pState) return;
    this.pomodoroState = pState;

    this.elements.presetBtns.forEach(btn => {
      const mins = parseInt(btn.dataset.mins, 10);
      btn.classList.toggle('active', mins === pState.durationMins);
    });

    if (pState.isRunning && !pState.isPaused && pState.endTime) {
      this.elements.startBtn.textContent = '⏸ 暂停';
      this.elements.statusText.textContent = '🔥 科研论文沉浸专注中...';
    } else if (pState.isPaused) {
      this.elements.startBtn.textContent = '▶ 继续专注';
      this.elements.statusText.textContent = '已暂停';
    } else {
      this.elements.startBtn.textContent = '▶ 开始专注';
      this.elements.statusText.textContent = '准备就绪';
    }

    this.updateDisplay();
  }

  startUiTimer() {
    if (this.uiInterval) clearInterval(this.uiInterval);
    this.uiInterval = setInterval(() => {
      this.updateDisplay();
    }, 1000);
  }

  updateDisplay() {
    if (!this.pomodoroState) return;
    const pState = this.pomodoroState;
    let secondsLeft = pState.remainingSecs || (pState.durationMins ? pState.durationMins * 60 : 1500);

    if (pState.isRunning && !pState.isPaused && pState.endTime) {
      secondsLeft = Math.max(0, Math.ceil((pState.endTime - Date.now()) / 1000));
      if (secondsLeft === 0 && !this._hasChimed) {
        this._hasChimed = true;
        this.playChime();
      } else if (secondsLeft > 0) {
        this._hasChimed = false;
      }
    }

    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    const str = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    this.elements.timerDisplay.textContent = str;
  }

  playChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const playNote = (freq, startTime, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.15, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      const now = ctx.currentTime;
      playNote(523.25, now, 0.4);       // C5
      playNote(659.25, now + 0.15, 0.4); // E5
      playNote(783.99, now + 0.3, 0.8);  // G5
    } catch (e) {}
  }

  togglePomodoro() {
    chrome.runtime.sendMessage({ type: 'POMODORO_TOGGLE' }).catch(() => {});
  }

  resetPomodoro() {
    chrome.runtime.sendMessage({ type: 'POMODORO_RESET' }).catch(() => {});
  }

  setPomodoroPreset(mins) {
    chrome.runtime.sendMessage({ type: 'POMODORO_SET_PRESET', mins }).catch(() => {});
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.focusManager = new FocusPageManager();
});
