// ============ POMODORO PAGE ============
const PomodoroPage = {
  timer: null,
  timeLeft: 25 * 60,
  isRunning: false,
  currentType: 'work', // work, break, long_break
  sessionCount: 0,

  async render(container) {
    const [settings, stats] = await Promise.all([
      api.settings.getSettings(),
      api.pomodoro.getPomodoroStats()
    ]);

    const workMin = parseInt(settings.pomodoro_work) || 25;
    const breakMin = parseInt(settings.pomodoro_break) || 5;
    const longBreakMin = parseInt(settings.pomodoro_long_break) || 15;

    if (!this.isRunning) {
      this.timeLeft = this.currentType === 'work' ? workMin * 60
        : this.currentType === 'break' ? breakMin * 60
        : longBreakMin * 60;
    }

    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Pomodoro Timer</h1>
        <p class="page-subtitle">Odaklan, çalış, XP kazan!</p>
      </div>

      <div class="card pomodoro-timer">
        <!-- Type Selector -->
        <div class="tab-bar" style="max-width:400px; margin:0 auto 30px;">
          <button class="tab-btn ${this.currentType === 'work' ? 'active' : ''}" onclick="PomodoroPage.setType('work', ${workMin})">Çalışma</button>
          <button class="tab-btn ${this.currentType === 'break' ? 'active' : ''}" onclick="PomodoroPage.setType('break', ${breakMin})">Mola</button>
          <button class="tab-btn ${this.currentType === 'long_break' ? 'active' : ''}" onclick="PomodoroPage.setType('long_break', ${longBreakMin})">Uzun Mola</button>
        </div>

        <!-- Timer Display -->
        <div class="timer-display" id="timer-display">${this.formatTime(this.timeLeft)}</div>
        <div class="timer-label" id="timer-label">${this.getTypeLabel()}</div>

        <!-- Session Dots -->
        <div style="display:flex; justify-content:center; gap:8px; margin-top:16px;">
          ${[1,2,3,4].map(i => `
            <div style="width:12px; height:12px; border-radius:50%; background:${i <= this.sessionCount % 4 ? 'var(--danger)' : 'var(--border)'}; transition:all 0.3s;"></div>
          `).join('')}
        </div>

        <!-- Controls -->
        <div class="timer-controls">
          ${this.isRunning ? `
            <button class="btn btn-danger" onclick="PomodoroPage.pause()">⏸ Duraklat</button>
          ` : `
            <button class="btn btn-primary" onclick="PomodoroPage.start()">▶ Başlat</button>
          `}
          <button class="btn btn-ghost" onclick="PomodoroPage.reset()">↺ Sıfırla</button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid-3 mt-20">
        <div class="card" style="text-align:center;">
          <div class="card-title">Bugün</div>
          <div class="card-value text-danger">${stats.today.count}</div>
          <div class="text-sm text-muted">${stats.today.totalMinutes} dakika</div>
        </div>
        <div class="card" style="text-align:center;">
          <div class="card-title">Toplam Pomodoro</div>
          <div class="card-value text-accent">${stats.total.count}</div>
          <div class="text-sm text-muted">${Math.round(stats.total.totalMinutes / 60)} saat</div>
        </div>
        <div class="card" style="text-align:center;">
          <div class="card-title">Bu Oturum</div>
          <div class="card-value text-warning">${this.sessionCount}</div>
          <div class="text-sm text-muted">pomodoro</div>
        </div>
      </div>

      <!-- Tips -->
      <div class="card mt-20">
        <div class="card-title">Pomodoro Tekniği</div>
        <div class="text-sm" style="line-height:1.8; color: var(--text-secondary);">
          1. <span class="text-danger font-bold">25 dakika</span> odaklanarak çalış<br>
          2. <span class="text-success font-bold">5 dakika</span> kısa mola ver<br>
          3. Her 4 pomodoro'dan sonra <span class="text-accent font-bold">15 dakika</span> uzun mola<br>
          4. Her tamamlanan pomodoro = <span class="text-warning font-bold">+10 XP</span>
        </div>
      </div>
    `;
  },

  formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  },

  getTypeLabel() {
    if (this.currentType === 'work') return 'ÇALIŞMA ZAMANI';
    if (this.currentType === 'break') return 'MOLA';
    return 'UZUN MOLA';
  },

  setType(type, minutes) {
    if (this.isRunning) return;
    this.currentType = type;
    this.timeLeft = minutes * 60;
    this.updateDisplay();
  },

  start() {
    this.isRunning = true;
    this.timer = setInterval(() => {
      this.timeLeft--;
      this.updateDisplay();

      if (this.timeLeft <= 0) {
        this.onComplete();
      }
    }, 1000);
    this.render(document.getElementById('content'));
  },

  pause() {
    this.isRunning = false;
    if (this.timer) clearInterval(this.timer);
    this.render(document.getElementById('content'));
  },

  async reset() {
    this.isRunning = false;
    if (this.timer) clearInterval(this.timer);

    const settings = await api.settings.getSettings();
    const minutes = this.currentType === 'work' ? parseInt(settings.pomodoro_work) || 25
      : this.currentType === 'break' ? parseInt(settings.pomodoro_break) || 5
      : parseInt(settings.pomodoro_long_break) || 15;

    this.timeLeft = minutes * 60;
    this.render(document.getElementById('content'));
  },

  async onComplete() {
    this.isRunning = false;
    if (this.timer) clearInterval(this.timer);

    if (this.currentType === 'work') {
      this.sessionCount++;
      const pomSettings = await api.settings.getSettings();
      const workDuration = parseInt(pomSettings.pomodoro_work) || 25;
      await api.pomodoro.savePomodoro({
        duration: workDuration,
        type: 'work',
        completed: true
      });
      Toast.show('Pomodoro tamamlandı! +10 XP 🍅', 'xp');
      await App.loadUserStats();

      // Auto switch to break
      if (this.sessionCount % 4 === 0) {
        this.currentType = 'long_break';
        const settings = await api.settings.getSettings();
        this.timeLeft = (parseInt(settings.pomodoro_long_break) || 15) * 60;
      } else {
        this.currentType = 'break';
        const settings = await api.settings.getSettings();
        this.timeLeft = (parseInt(settings.pomodoro_break) || 5) * 60;
      }
    } else {
      Toast.show('Mola bitti! Çalışmaya dön 💪', 'warning');
      this.currentType = 'work';
      const settings = await api.settings.getSettings();
      this.timeLeft = (parseInt(settings.pomodoro_work) || 25) * 60;
    }

    // Only re-render if user is still on pomodoro page
    if (App.currentPage === 'pomodoro') {
      this.render(document.getElementById('content'));
    }
  },

  updateDisplay() {
    const display = document.getElementById('timer-display');
    const label = document.getElementById('timer-label');
    if (display) display.textContent = this.formatTime(this.timeLeft);
    if (label) label.textContent = this.getTypeLabel();
  },

  destroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
};
