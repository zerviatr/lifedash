const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, Notification, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');
const AutoLaunch = require('auto-launch');
const AppDatabase = require('./database');
const https = require('https');
const http = require('http');

// Suppress GPU shader disk cache errors on Windows
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

let mainWindow;
let tray;
let db;
let notificationInterval;

// Auto-start on Windows boot
const autoLauncher = new AutoLaunch({
  name: 'LifeDash',
  path: app.getPath('exe'),
});

function createWindow() {
  const appPath = app.isPackaged ? path.dirname(app.getAppPath()) : __dirname;

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    frame: false,
    transparent: false,
    backgroundColor: '#0f0f23',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(app.getAppPath(), 'preload.js')
    },
    icon: path.join(app.getAppPath(), 'assets', 'icon.png'),
    show: false
  });

  mainWindow.loadFile(path.join(app.getAppPath(), 'renderer', 'index.html'));

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    try { console.log(`[Renderer] ${message} (Line: ${line})`); } catch {}
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Fallback: if ready-to-show doesn't fire within 5s, force show
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      mainWindow.show();
    }
  }, 5000);

  // Minimize to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const iconPath = path.join(app.getAppPath(), 'assets', 'icon.png');
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    { label: 'LifeDash Aç', click: () => mainWindow.show() },
    { label: 'Çıkış', click: () => { app.isQuitting = true; app.quit(); } }
  ]);

  tray.setToolTip('LifeDash');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => mainWindow.show());
}

// =================== HTTP HELPER ===================
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('JSON parse error')); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}


// =================== SMART NOTIFICATIONS ===================
function startNotificationSystem() {
  if (notificationInterval) clearInterval(notificationInterval);

  notificationInterval = setInterval(async () => {
    try {
      const settings = db.getSettings();
      if (settings.notifications !== 'true') return;

      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();

      // Daily reminder at 20:00 — check incomplete tasks
      if (hour === 20 && minute === 0 && settings.daily_reminder === 'true') {
        const tasks = db.getDailyTasks();
        const pending = tasks.filter(t => t.status === 'pending');
        if (pending.length > 0) {
          showNotification('Görevlerin Bekliyor!', `${pending.length} tamamlanmamış görevin var. Serini kaybetme!`);
        }
      }

      // Budget limit check — every hour
      if (minute === 0) {
        const limit = db.getDailyLimit();
        if (limit.hasBudget && limit.todaySpent > limit.dailyLimit) {
          showNotification('Bütçe Uyarısı!', `Bugünkü limitini ${(limit.todaySpent - limit.dailyLimit).toFixed(0)} ₺ aştın!`);
        }
      }

      // Debt due date check — at 9:00
      if (hour === 9 && minute === 0) {
        const debts = db.getDebts();
        const today = new Date();
        debts.forEach(d => {
          if (!d.due_date) return;
          const due = new Date(d.due_date);
          const daysUntil = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
          if (daysUntil === 7 || daysUntil === 3 || daysUntil === 1) {
            showNotification('Borç Hatırlatma', `"${d.name}" borcunun vadesine ${daysUntil} gün kaldı!`);
          }
        });
      }
    } catch (e) {
      console.error('Notification error:', e);
    }
  }, 60000); // Check every minute
}

function showNotification(title, body) {
  if (Notification.isSupported()) {
    const notif = new Notification({ title, body, icon: path.join(app.getAppPath(), 'assets', 'icon.png') });
    notif.show();
    notif.on('click', () => {
      if (mainWindow) mainWindow.show();
    });
  }
}

// =================== IPC HANDLERS ===================
function setupIPC() {
  // Window controls
  ipcMain.on('window-minimize', () => mainWindow.minimize());
  ipcMain.on('window-maximize', () => {
    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
  });
  ipcMain.on('window-close', () => mainWindow.hide());

  // System Backup
  ipcMain.handle('system-backup-db', async () => {
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Veritabanını Yedekle',
      defaultPath: path.join(app.getPath('downloads'), `LifeDash_Backup_${new Date().toISOString().slice(0,10)}.zip`),
      filters: [{ name: 'ZIP Archives', extensions: ['zip'] }]
    });
    
    if (canceled || !filePath) return { success: false, canceled: true };
    
    try {
      if (db) db.forceSave(); // Not strictly needed for better-sqlite3 but keeps signature
      const zip = new AdmZip();
      const dbPath = path.join(app.getPath('userData'), 'lifedash.db');
      if (fs.existsSync(dbPath)) {
        zip.addLocalFile(dbPath);
      }
      zip.writeZip(filePath);
      return { success: true, path: filePath };
    } catch (err) {
      console.error('Backup error:', err);
      return { success: false, error: err.message };
    }
  });


  // ============ DATABASE OPERATIONS ============

  // Finance - Transactions
  ipcMain.handle('db-add-transaction', (_, data) => {
    const result = db.addTransaction(data);
    // Check budget limit after adding expense
    if (data.type === 'expense') {
      const limit = db.getDailyLimit();
      if (limit.hasBudget && limit.todaySpent > limit.dailyLimit) {
        showNotification('Limit Aşıldı!', `Bugünkü harcama limitini aştın! Harcanan: ${limit.todaySpent.toFixed(0)} ₺`);
      }
    }
    return result;
  });
  ipcMain.handle('db-get-transactions', (_, filters) => db.getTransactions(filters));
  ipcMain.handle('db-delete-transaction', (_, id) => db.deleteTransaction(id));

  // Finance - Debts
  ipcMain.handle('db-add-debt', (_, data) => db.addDebt(data));
  ipcMain.handle('db-get-debts', () => db.getDebts());
  ipcMain.handle('db-update-debt', (_, id, data) => db.updateDebt(id, data));
  ipcMain.handle('db-delete-debt', (_, id) => db.deleteDebt(id));

  // Finance - Monthly Budget
  ipcMain.handle('db-set-budget', (_, data) => db.setBudget(data));
  ipcMain.handle('db-get-budget', (_, month) => db.getBudget(month));
  ipcMain.handle('db-get-daily-limit', () => db.getDailyLimit());

  // XP & Gamification
  ipcMain.handle('db-get-user-stats', () => db.getUserStats());
  ipcMain.handle('db-add-xp', (_, amount, reason) => db.addXP(amount, reason));
  ipcMain.handle('db-remove-xp', (_, amount, reason) => db.removeXP(amount, reason));

  // Tasks
  ipcMain.handle('db-add-daily-task', (_, data) => db.addDailyTask(data));
  ipcMain.handle('db-get-daily-tasks', () => db.getDailyTasks());
  ipcMain.handle('db-complete-task', (_, taskId) => db.completeTask(taskId));
  ipcMain.handle('db-fail-task', (_, taskId) => db.failTask(taskId));
  
  // Projects & Subtasks
  ipcMain.handle('db-add-project', (_, data) => db.addProject(data));
  ipcMain.handle('db-get-projects', () => db.getProjects());
  ipcMain.handle('db-update-project', (_, id, data) => db.updateProject(id, data));
  ipcMain.handle('db-delete-project', (_, id) => db.deleteProject(id));
  ipcMain.handle('db-add-subtask', (_, data) => db.addSubtask(data));
  ipcMain.handle('db-toggle-subtask', (_, id) => db.toggleSubtask(id));
  
  ipcMain.handle('db-get-achievements', () => db.getAchievements());
  ipcMain.handle('db-check-streak', () => db.checkStreak());
  ipcMain.handle('db-get-xp-history', (_, days) => db.getXPHistory(days));

  // Loot Box
  ipcMain.handle('db-check-lootbox', () => db.checkLootBox());
  ipcMain.handle('db-open-lootbox', () => db.openLootBox());

  // Shop & Economy
  ipcMain.handle('db-buy-item', (_, type, price, id) => db.buyItem(type, price, id));
  ipcMain.handle('db-get-equipment', () => db.getEquipment());
  ipcMain.handle('db-equip-item', (_, id) => db.equipItem(id));

  // Boss Battle
  ipcMain.handle('db-get-boss-battle', () => db.getBossBattle());

  // Habits
  ipcMain.handle('db-add-habit', (_, data) => db.addHabit(data));
  ipcMain.handle('db-get-habits', () => db.getHabits());
  ipcMain.handle('db-toggle-habit', (_, habitId, date) => db.toggleHabit(habitId, date));
  ipcMain.handle('db-delete-habit', (_, id) => db.deleteHabit(id));

  // Pomodoro
  ipcMain.handle('db-save-pomodoro', (_, data) => db.savePomodoro(data));
  ipcMain.handle('db-get-pomodoro-stats', () => db.getPomodoroStats());

  // Settings
  ipcMain.handle('db-get-settings', () => db.getSettings());
  ipcMain.handle('db-set-setting', (_, key, value) => db.setSetting(key, value));
  ipcMain.handle('db-reset-all-data', () => db.resetAllData());

  // Habit Stats
  ipcMain.handle('db-get-habit-stats', (_, id) => db.getHabitStats(id));

  // Impulse Purchases
  ipcMain.handle('db-add-impulse', (_, data) => db.addImpulse(data));
  ipcMain.handle('db-get-impulses', () => db.getImpulses());
  ipcMain.handle('db-resolve-impulse', (_, id, confirm) => db.resolveImpulse(id, confirm));

  // Recurring Transactions
  ipcMain.handle('db-add-recurring', (_, data) => db.addRecurring(data));
  ipcMain.handle('db-get-recurrings', () => db.getRecurrings());
  ipcMain.handle('db-delete-recurring', (_, id) => db.deleteRecurring(id));

  // Savings Goals (Kumbara)
  ipcMain.handle('db-add-savings-goal', (_, data) => db.addSavingsGoal(data));
  ipcMain.handle('db-get-savings-goals', () => db.getSavingsGoals());
  ipcMain.handle('db-deposit-savings', (_, goalId, amount) => db.depositSavings(goalId, amount));
  ipcMain.handle('db-delete-savings-goal', (_, id) => db.deleteSavingsGoal(id));

  // Today Summary
  ipcMain.handle('db-get-today-summary', () => db.getTodaySummary());

  // Reports & Trends
  ipcMain.handle('db-get-monthly-trend', (_, months) => db.getMonthlyTrend(months));
  ipcMain.handle('db-get-month-comparison', () => db.getMonthComparison());
  ipcMain.handle('db-generate-report-card', (_, type, key) => db.generateReportCard(type, key));
  ipcMain.handle('db-get-report-card', (_, type, key) => db.getReportCard(type, key));

  // Update check
  ipcMain.handle('check-for-updates', () => checkForUpdates());
  ipcMain.handle('get-app-version', () => app.getVersion());

  // Auto-start
  ipcMain.handle('get-auto-launch', async () => {
    try { return await autoLauncher.isEnabled(); }
    catch { return false; }
  });
  ipcMain.handle('set-auto-launch', async (_, enabled) => {
    try {
      if (enabled) await autoLauncher.enable();
      else await autoLauncher.disable();
      return true;
    } catch { return false; }
  });

  // ============ CURRENCY & CRYPTO API (with caching) ============
  let currencyCache = { data: null, timestamp: 0 };
  let cryptoCache = { data: null, timestamp: 0 };
  const CURRENCY_TTL = 5 * 60 * 1000;  // 5 min
  const CRYPTO_TTL = 1 * 60 * 1000;    // 1 min

  ipcMain.handle('fetch-currency-rates', async (_, forceRefresh = false) => {
    const now = Date.now();
    if (!forceRefresh && currencyCache.data && now - currencyCache.timestamp < CURRENCY_TTL) {
      return { ...currencyCache.data, _cachedAt: currencyCache.timestamp };
    }
    try {
      const data = await fetchJSON('https://open.er-api.com/v6/latest/TRY');
      if (data && data.rates) {
        const result = {};
        for (const [code, rate] of Object.entries(data.rates)) {
          if (rate > 0) result[code] = 1 / rate;
        }
        currencyCache = { data: result, timestamp: now };
        return { ...result, _cachedAt: now };
      }
      return currencyCache.data ? { ...currencyCache.data, _cachedAt: currencyCache.timestamp } : null;
    } catch (e) {
      console.error('Currency API error:', e);
      return currencyCache.data ? { ...currencyCache.data, _cachedAt: currencyCache.timestamp } : null;
    }
  });

  ipcMain.handle('fetch-crypto-rates', async (_, forceRefresh = false) => {
    const now = Date.now();
    if (!forceRefresh && cryptoCache.data && now - cryptoCache.timestamp < CRYPTO_TTL) {
      return cryptoCache.data;
    }
    try {
      const data = await fetchJSON('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=15&page=1&sparkline=false');
      if (data && data.length) {
        cryptoCache = { data, timestamp: now };
      }
      return data || cryptoCache.data || [];
    } catch (e) {
      console.error('Crypto API error:', e);
      return cryptoCache.data || [];
    }
  });


}

// =================== AUTO-UPDATE CHECK ===================
function checkForUpdates() {
  try {
    const currentVersion = app.getVersion();
    // Local version.json check — proje klasorundan oku
    const projectRoot = app.isPackaged
      ? path.join(path.dirname(app.getPath('exe')), '..', '..')
      : __dirname;
    const versionFile = path.join(projectRoot, 'version.json');
    const fs = require('fs');
    if (!fs.existsSync(versionFile)) {
      return { available: false, currentVersion };
    }
    const data = JSON.parse(fs.readFileSync(versionFile, 'utf-8'));
    if (data && data.version && data.version !== currentVersion) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-available', {
          currentVersion,
          newVersion: data.version,
          changelog: data.changelog || ''
        });
      }
      showNotification(
        'LifeDash Guncelleme',
        `Yeni versiyon mevcut: v${data.version}. Uygulamayi yeniden baslat.`
      );
      return { available: true, currentVersion, newVersion: data.version, changelog: data.changelog || '' };
    }
    return { available: false, currentVersion };
  } catch (e) {
    console.log('Update check skipped:', e.message);
    return { available: false, currentVersion: app.getVersion(), error: e.message };
  }
}

// =================== APP LIFECYCLE ===================
app.whenReady().then(async () => {
  db = await new AppDatabase().initialize(app.getPath('userData'));
  db.checkRecurringTransactions(); // Auto-process recurring transactions on startup
  createWindow();
  createTray();
  setupIPC();
  startNotificationSystem();

  // Check for updates after 5 seconds
  setTimeout(() => checkForUpdates(), 5000);

  // Enable auto-launch by default
  try {
    const isEnabled = await autoLauncher.isEnabled();
    if (!isEnabled) await autoLauncher.enable();
  } catch (e) {
    console.log('Auto-launch setup skipped:', e.message);
  }
});

app.on('before-quit', () => {
  // Force-save DB before quitting (debounced save might not have fired yet)
  if (db) db.forceSave();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
