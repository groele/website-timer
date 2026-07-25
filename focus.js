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
    this.initParticles();
  }

  initParticles() {
    const canvas = document.getElementById('particleCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const particles = [];
    const count = 35;
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 2 + 1,
        alpha: Math.random() * 0.4 + 0.15,
        dx: (Math.random() - 0.5) * 0.3,
        dy: -Math.random() * 0.4 - 0.1
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(168, 85, 247, ${p.alpha})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#a855f7';
        ctx.fill();

        p.x += p.dx;
        p.y += p.dy;

        if (p.y < 0) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < 0 || p.x > width) p.dx = -p.dx;
      });
      requestAnimationFrame(draw);
    };

    draw();
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
      presetBtns: document.querySelectorAll('.preset-btn'),
      soundBtns: document.querySelectorAll('.sound-btn')
    };
    this.ambientSound = new AmbientSoundGenerator();
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

    this.elements.soundBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const soundType = btn.dataset.sound;
        this.elements.soundBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (soundType === 'rain') {
          this.ambientSound.playRain();
        } else if (soundType === 'alpha') {
          this.ambientSound.playAlphaWave();
        } else {
          this.ambientSound.stop();
        }
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

class AmbientSoundGenerator {
  constructor() {
    this.audioCtx = null;
    this.noiseNode = null;
    this.gainNode = null;
    this.isPlaying = false;
    this.currentType = 'none';
  }

  initContext() {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioCtx();
    }
  }

  playRain() {
    this.stop();
    this.initContext();
    const bufferSize = this.audioCtx.sampleRate * 2;
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);

    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5;
    }

    const bufferSource = this.audioCtx.createBufferSource();
    bufferSource.buffer = buffer;
    bufferSource.loop = true;

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, this.audioCtx.currentTime);

    this.gainNode = this.audioCtx.createGain();
    this.gainNode.gain.setValueAtTime(0.08, this.audioCtx.currentTime);

    bufferSource.connect(filter);
    filter.connect(this.gainNode);
    this.gainNode.connect(this.audioCtx.destination);

    bufferSource.start();
    this.noiseNode = bufferSource;
    this.isPlaying = true;
    this.currentType = 'rain';
  }

  playAlphaWave() {
    this.stop();
    this.initContext();

    const osc1 = this.audioCtx.createOscillator();
    const osc2 = this.audioCtx.createOscillator();
    this.gainNode = this.audioCtx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(200, this.audioCtx.currentTime);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(210, this.audioCtx.currentTime);

    this.gainNode.gain.setValueAtTime(0.06, this.audioCtx.currentTime);

    osc1.connect(this.gainNode);
    osc2.connect(this.gainNode);
    this.gainNode.connect(this.audioCtx.destination);

    osc1.start();
    osc2.start();

    this.noiseNode = { stop: () => { osc1.stop(); osc2.stop(); } };
    this.isPlaying = true;
    this.currentType = 'alpha';
  }

  stop() {
    if (this.noiseNode && this.isPlaying) {
      try { this.noiseNode.stop(); } catch (e) {}
      this.isPlaying = false;
      this.currentType = 'none';
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.focusManager = new FocusPageManager();
});
