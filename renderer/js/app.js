// ============ APP CORE v5.0 ============
const App = {
  currentPage: 'dashboard',
  userStats: null,
  previousLevel: null,

  async init() {
    await this.loadTheme();
    await this.loadSidebarState();
    await SoundManager.init();
    VFX.init();
    this.setupNavigation();
    this.setupRipple();
    this.setupSidebarToggle();
    await this.loadUserStats();
    this.previousLevel = this.userStats ? this.userStats.level : 1;
    await this.navigateTo('dashboard');

    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Check streak on app start
    const streakInfo = await api.xp.checkStreak();
    if (streakInfo.freezeUsed) {
      Toast.show('Seri Dondurucu kullanildi! Serin korundu. (' + streakInfo.freezesRemaining + ' freeze kaldi)', 'warning');
      SoundManager.play('streakFreeze');
    } else if (streakInfo.streakBroken && streakInfo.previousStreak > 0) {
      Toast.show('Serin kirildi! ' + streakInfo.previousStreak + ' gunluk seri sona erdi.', 'warning');
    }

    // Daily login reward
    try {
      const loginReward = await api.xp.checkDailyLogin();
      if (loginReward) {
        SoundManager.play('coinEarn');
        Toast.show('Gunluk giris odulu! +' + loginReward.xp + ' XP, +' + loginReward.coins + ' Coin (Gun ' + loginReward.dayInCycle + '/7, Seri: ' + loginReward.streak + ')', 'xp');
        await this.loadUserStats();
      }
    } catch {}

    // Streak at-risk warning
    this.checkStreakRisk();

    // Listen for update notifications
    api.events.onUpdateAvailable((data) => {
      Toast.show('Yeni guncelleme mevcut: v' + data.newVersion + '! Ayarlar\'dan kontrol et.', 'warning');
    });

    // Level-up detection
    PubSub.subscribe('stats:refreshed', (stats) => {
      if (this.previousLevel && stats.level > this.previousLevel) {
        VFX.levelUpCelebration(stats.level);
        Toast.show('LEVEL UP! Seviye ' + stats.level + ' oldu!', 'levelup');
        SoundManager.play('levelUp');
      }
      this.previousLevel = stats.level;
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const pages = ['dashboard','tasks','habits','pomodoro','finance','currency','achievements','shop'];
        if (pages[e.key - 1]) App.navigateTo(pages[e.key - 1]);
      }
      if (e.ctrlKey && e.key === '9') { e.preventDefault(); App.navigateTo('reports'); }
      if (e.ctrlKey && e.key === '0') { e.preventDefault(); App.navigateTo('settings'); }
    });
  },

  // ============ RIPPLE EFFECT (FAZ 6) ============
  setupRipple() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn, .nav-btn, .tab-btn');
      if (!btn) return;
      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2;
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
      ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
      btn.appendChild(ripple);
      
      const cleanup = () => { if (ripple.parentNode) ripple.remove(); };
      ripple.addEventListener('animationend', cleanup, { once: true });
      setTimeout(cleanup, 1000); // Fallback if animationend doesn't fire
    });
  },

  // ============ SIDEBAR TOGGLE (FAZ 4) ============
  setupSidebarToggle() {
    const toggleBtn = document.getElementById('sidebar-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggleSidebar());
    }
  },

  async loadSidebarState() {
    try {
      const settings = await api.settings.getAll();
      const expanded = settings.sidebar_expanded === 'true';
      const sidebar = document.getElementById('sidebar');
      if (expanded && sidebar) sidebar.classList.add('expanded');
    } catch {}
  },

  async toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    sidebar.classList.toggle('expanded');
    const isExpanded = sidebar.classList.contains('expanded');
    await api.settings.set('sidebar_expanded', String(isExpanded));
    // Update icon
    const iconEl = document.getElementById('sidebar-toggle-icon');
    if (iconEl) {
      iconEl.setAttribute('data-lucide', isExpanded ? 'panel-left-open' : 'panel-left-close');
      if (typeof lucide !== 'undefined') lucide.createIcons();
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
        if (btn.dataset.page) this.navigateTo(btn.dataset.page);
      });
    });
  },

  // ============ PAGE TRANSITIONS (FAZ 7) ============
  async navigateTo(page) {
    const prevPage = this.currentPage;

    // Cleanup previous page
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

    // Exit animation
    const content = document.getElementById('content');
    content.style.opacity = '0';
    content.style.transform = 'translateY(8px)';
    await new Promise(r => setTimeout(r, 150));

    // Render page
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
      case 'journal': await JournalPage.render(content); break;
      case 'calendar': await CalendarPage.render(content); break;
      case 'settings': await SettingsPage.render(content); break;
      case 'ai': await AiPage.render(content); break;
    }

    // Enter animation
    content.style.transition = 'opacity var(--duration-page) var(--ease-out), transform var(--duration-page) var(--ease-out)';
    content.style.opacity = '1';
    content.style.transform = 'translateY(0)';

    // Stagger child elements
    this.staggerElements(content);

    // Re-init Lucide icons for new content
    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  // ============ STAGGER ANIMATION (FAZ 7) ============
  staggerElements(container) {
    const items = container.querySelectorAll('.card, .task-card, .habit-item, .achievement-card-showcase, .setting-item, .debt-card, .currency-card');
    items.forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(12px)';
      setTimeout(() => {
        el.style.transition = 'opacity 0.3s var(--ease-out), transform 0.3s var(--ease-out)';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, 40 * i);
    });
  },

  async loadUserStats() {
    this.userStats = await api.xp.getUserStats();
    this.updateTitleBar();
    this.updateStreak();
    PubSub.publish('stats:refreshed', this.userStats);
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
      el.textContent = 'Lv.' + this.userStats.level + ' ' + title + ' \u2022 ' + this.userStats.xp + ' XP' + (badge ? ' \u2022 ' + badge.icon + ' ' + badge.label : '');
      const coinsEl = document.getElementById('titlebar-coins');
      if (coinsEl) coinsEl.innerHTML = icon('coins', 12) + ' ' + (this.userStats.lifecoins || 0);
      // Re-init icons in titlebar
      if (typeof lucide !== 'undefined') lucide.createIcons({ nameAttr: 'data-lucide' });
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
      const settings = await api.settings.getAll();
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
    await api.settings.set('theme', theme);
    PubSub.publish('theme:changed', theme);
  }
};

// ============ ICON HELPER (FAZ 2) ============
function icon(name, size, cls) {
  size = size || 18;
  cls = cls || '';
  return '<i data-lucide="' + name + '" class="icon ' + cls + '" style="width:' + size + 'px;height:' + size + 'px;"></i>';
}

// ============ LEVEL TITLES ============
function getLevelTitle(level) {
  if (level >= 50) return 'Tanri';
  if (level >= 40) return 'Kral';
  if (level >= 30) return 'Sampiyon';
  if (level >= 20) return 'Efsane';
  if (level >= 15) return 'Usta';
  if (level >= 10) return 'Savasci';
  if (level >= 5) return 'Cirak';
  return 'Caylak';
}

// ============ ANIMATED NUMBER COUNTER (FAZ 5) ============
function animateNumber(el, from, to, duration) {
  duration = duration || 600;
  const start = performance.now();
  const step = function(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(from + (to - from) * eased);
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ============ FLOATING XP TEXT (FAZ 5) ============
function showFloatingXP(amount, x, y) {
  const el = document.createElement('div');
  el.className = 'floating-xp';
  el.textContent = '+' + amount + ' XP';
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  document.body.appendChild(el);
  el.addEventListener('animationend', function() { el.remove(); });
}

// ============ TOAST NOTIFICATIONS (FAZ 9 — Rich) ============
const Toast = {
  container: null,

  init() {
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    document.body.appendChild(this.container);
  },

  show(message, type, iconName) {
    type = type || 'success';
    if (!this.container) this.init();

    const lucideIcons = {
      success: 'check-circle',
      error: 'x-circle',
      warning: 'alert-triangle',
      xp: 'zap',
      levelup: 'star',
      loot: 'gift'
    };

    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.innerHTML =
      '<div class="toast-icon-badge">' + icon(iconName || lucideIcons[type] || 'info', 16) + '</div>' +
      '<div class="toast-content"><span class="toast-text">' + message + '</span></div>' +
      '<button class="toast-close" onclick="this.parentElement.remove()">' + icon('x', 14) + '</button>' +
      '<div class="toast-timer"></div>';

    this.container.appendChild(toast);

    // Re-init icons
    if (typeof lucide !== 'undefined') lucide.createIcons();

    setTimeout(function() {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(40px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(function() { toast.remove(); }, 300);
    }, 3000);
  }
};

// ============ SKELETON LOADING (FAZ 8) ============
const Skeleton = {
  card(count) {
    count = count || 3;
    var html = '<div class="grid-3">';
    for (var i = 0; i < count; i++) {
      html += '<div class="skeleton-card">' +
        '<div class="skeleton-line" style="width:40%; height:12px;"></div>' +
        '<div class="skeleton-line" style="width:100%; height:24px; margin-top:12px;"></div>' +
        '<div class="skeleton-line" style="width:70%; height:12px; margin-top:8px;"></div>' +
        '</div>';
    }
    html += '</div>';
    return html;
  },

  list(count) {
    count = count || 5;
    var html = '';
    for (var i = 0; i < count; i++) {
      html += '<div class="skeleton-card" style="display:flex;align-items:center;gap:12px;padding:14px;margin-bottom:8px;">' +
        '<div class="skeleton-line" style="width:40px;height:40px;border-radius:50%;flex-shrink:0;"></div>' +
        '<div style="flex:1;">' +
        '<div class="skeleton-line" style="width:60%;height:14px;"></div>' +
        '<div class="skeleton-line" style="width:40%;height:10px;margin-top:6px;"></div>' +
        '</div></div>';
    }
    return html;
  },

  dashboard() {
    return '<div class="skeleton-card" style="padding:16px 20px;margin-bottom:20px;display:flex;align-items:center;gap:16px;">' +
      '<div class="skeleton-line" style="width:60px;height:36px;"></div>' +
      '<div style="flex:1;"><div class="skeleton-line" style="width:100%;height:12px;"></div></div></div>' +
      this.card(4);
  }
};

// ============ HELPERS ============
function formatMoney(amount) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 }).format(amount);
}

function showModal(title, content, onSave) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML =
    '<div class="modal">' +
      '<div class="modal-header">' +
        '<h3 class="modal-title">' + title + '</h3>' +
        '<button class="modal-close" onclick="this.closest(\'.modal-overlay\').remove()">' + icon('x', 18) + '</button>' +
      '</div>' +
      '<div class="modal-body">' + content + '</div>' +
      '<div class="modal-actions">' +
        '<button class="btn btn-ghost" onclick="this.closest(\'.modal-overlay\').remove()">' + icon('x-circle', 14) + ' Iptal</button>' +
        '<button class="btn btn-primary" id="modal-save-btn">' + icon('check', 14) + ' Kaydet</button>' +
      '</div>' +
    '</div>';

  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) overlay.remove();
  });

  const saveBtn = overlay.querySelector('#modal-save-btn');
  saveBtn.addEventListener('click', function() {
    if (onSave) onSave(overlay);
  });

  // Init Lucide icons in modal
  if (typeof lucide !== 'undefined') lucide.createIcons();

  return overlay;
}

function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7);
}

// Init app
document.addEventListener('DOMContentLoaded', function() { App.init(); });
