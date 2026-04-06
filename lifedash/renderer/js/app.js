// ============ APP CORE ============
const App = {
  currentPage: 'dashboard',
  userStats: null,

  async init() {
    await this.loadTheme();
    await SoundManager.init();
    this.setupNavigation();
    await this.loadUserStats();
    await this.navigateTo('dashboard');

    // Check streak on app start
    const streakInfo = await api.gamification.checkStreak();
    if (streakInfo.streakBroken && streakInfo.previousStreak > 0) {
      Toast.show(`Serin kirildi! ${streakInfo.previousStreak} gunluk seri sona erdi.`, 'warning');
    }

    // Streak at-risk warning
    this.checkStreakRisk();

    // Listen for update notifications
    api.system.onUpdateAvailable((data) => {
      Toast.show(`Yeni guncelleme mevcut: v${data.newVersion}! Ayarlar'dan kontrol et.`, 'warning');
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const pages = ['dashboard','finance','tasks','habits','pomodoro','currency','reports','shop','achievements'];
        if (pages[e.key - 1]) App.navigateTo(pages[e.key - 1]);
      }
      if (e.ctrlKey && e.key === '0') { e.preventDefault(); App.navigateTo('settings'); }
    });

    // Tutorial: auto-start for first-time users
    const settings = await api.settings.getSettings();
    if (settings.tutorial_completed !== 'true') {
      setTimeout(() => Tutorial.start(), 600);
    }
  },

  async checkStreakRisk() {
    try {
      const stats = this.userStats;
      if (!stats || stats.current_streak <= 0) return;
      const tasks = await api.tasks.getDailyTasks();
      const completed = tasks.filter(t => t.status === 'completed').length;
      const badge = document.getElementById('streak-badge');
      if (badge) {
        if (completed === 0 && tasks.length > 0) {
          badge.classList.add('streak-at-risk');
        } else {
          badge.classList.remove('streak-at-risk');
        }
      }
    } catch {}
  },

  setupNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.navigateTo(btn.dataset.page);
      });
    });
  },

  async navigateTo(page) {
    const prevPage = this.currentPage;

    // Cleanup previous page (stop intervals, remove listeners)
    if (prevPage !== page) {
      const pageObjects = {
        dashboard: typeof DashboardPage !== 'undefined' ? DashboardPage : null,
        currency: typeof CurrencyPage !== 'undefined' ? CurrencyPage : null,

        pomodoro: typeof PomodoroPage !== 'undefined' ? PomodoroPage : null,
      };
      const prev = pageObjects[prevPage];
      if (prev && typeof prev.destroy === 'function') prev.destroy();
    }

    this.currentPage = page;

    // Update active nav
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.page === page);
    });

    // Render page with smooth transition
    const content = document.getElementById('content');
    content.style.transition = 'opacity 0.15s ease, transform 0.15s ease';
    content.style.opacity = '0';
    content.style.transform = 'translateY(8px)';
    await new Promise(r => setTimeout(r, 150));

    switch (page) {
      case 'dashboard': await DashboardPage.render(content); break;
      case 'finance': await FinancePage.render(content); break;
      case 'tasks': await TasksPage.render(content); break;
      case 'habits': await HabitsPage.render(content); break;
      case 'pomodoro': await PomodoroPage.render(content); break;
      case 'achievements': await AchievementsPage.render(content); break;
      case 'currency': await CurrencyPage.render(content); break;
      case 'reports': await ReportsPage.render(content); break;
      case 'shop': await ShopPage.render(content); break;
      case 'settings': await SettingsPage.render(content); break;
    }

    // Fade-in after content is rendered
    requestAnimationFrame(() => {
      content.style.opacity = '1';
      content.style.transform = 'translateY(0)';
    });
  },

  async loadUserStats() {
    this.userStats = await api.gamification.getUserStats();
    this.updateTitleBar();
    this.updateStreak();
    // Sync dashboard balance live if currently on dashboard
    if (this.currentPage === 'dashboard' && typeof DashboardPage !== 'undefined' && typeof DashboardPage.patchBalance === 'function') {
      const limit = await api.finance.getDailyLimit();
      DashboardPage.patchBalance(limit);
    }
  },

  updateTitleBar() {
    const el = document.getElementById('titlebar-xp');
    if (this.userStats) {
      const title = getLevelTitle(this.userStats.level);
      const badge = this.userStats.financeBadge;
      el.textContent = `Lv.${this.userStats.level} ${title} • ${this.userStats.xp} XP${badge ? ` • ${badge.icon} ${badge.label}` : ''}`;
    }
  },

  updateStreak() {
    const el = document.getElementById('streak-count');
    if (this.userStats) {
      el.textContent = this.userStats.current_streak;
    }
  },

  async loadTheme() {
    try {
      const settings = await api.settings.getSettings();
      const theme = settings.theme || 'dark';
      if (theme !== 'dark') {
        document.body.setAttribute('data-theme', theme);
      } else {
        document.body.removeAttribute('data-theme');
      }
    } catch {}
  },

  async setTheme(theme) {
    if (theme === 'dark') {
      document.body.removeAttribute('data-theme');
    } else {
      document.body.setAttribute('data-theme', theme);
    }
    await api.settings.setSetting('theme', theme);
  }
};

// ============ LEVEL TITLES ============
function getLevelTitle(level) {
  if (level >= 50) return '⚡ Tanrı';
  if (level >= 40) return '👑 Kral';
  if (level >= 30) return '🏆 Şampiyon';
  if (level >= 20) return '🌟 Efsane';
  if (level >= 15) return '🔥 Usta';
  if (level >= 10) return '⚔️ Savaşçı';
  if (level >= 5) return '🛡️ Çırak';
  return '🌱 Çaylak';
}

// ============ TOAST NOTIFICATIONS ============
const Toast = {
  container: null,

  init() {
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    document.body.appendChild(this.container);
  },

  show(message, type = 'success', icon = null) {
    if (!this.container) this.init();

    const icons = { success: '✅', error: '❌', warning: '⚠️', xp: '⚡', levelup: '🎉', loot: '🎁' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icon || icons[type] || '📌'}</span>
      <span class="toast-text">${message}</span>
    `;

    this.container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }
};

// ============ HELPERS ============
function formatMoney(amount) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 }).format(amount);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getGaugeColor(percent) {
  if (percent < 50) return 'var(--success)';
  if (percent < 75) return 'var(--warning)';
  return 'var(--danger)';
}

function showModal(title, content, onSave) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div class="modal-body">${content}</div>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">İptal</button>
        <button class="btn btn-primary" id="modal-save-btn">Kaydet</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  const saveBtn = overlay.querySelector('#modal-save-btn');
  saveBtn.addEventListener('click', () => {
    if (onSave) onSave(overlay);
  });

  return overlay;
}

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getCurrentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Init app
document.addEventListener('DOMContentLoaded', () => App.init());
