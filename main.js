const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, Notification, dialog } = require('electron');
const path = require('path');
const AutoLaunch = require('auto-launch');
const AppDatabase = require('./database');
const https = require('https');
const http = require('http');
// electron-updater is loaded lazily after app:ready to avoid getVersion() crash in dev
let autoUpdater = null;

// Suppress GPU shader disk cache errors on Windows
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.setAppUserModelId('LifeDash');

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

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Set icon explicitly to bypass Windows taskbar icon cache
    const iconPath = path.join(app.getAppPath(), 'assets', 'icon.ico');
    mainWindow.setIcon(iconPath);
  });

  // Fallback: if ready-to-show doesn't fire within 5s, force show
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      mainWindow.show();
    }
  }, 5000);

  // X butonu uygulamayı tamamen kapatır
  mainWindow.on('close', () => {
    app.isQuitting = true;
    app.quit();
  });
}

function createTray() {
  const iconPath = path.join(app.getAppPath(), 'assets', 'icon.png');
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    { label: 'LifeDash', enabled: false },
    { type: 'separator' },
    { label: 'Uygulamayı Aç', click: () => mainWindow.show() },
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
      if (res.statusCode < 200 || res.statusCode >= 300) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
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

function fetchJSONWithBody(url, token, body) {
  return new Promise((resolve, reject) => {
    const bodyBuf = Buffer.from(body, 'utf-8');
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': bodyBuf.length
      },
      timeout: 30000
    };
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          try {
            const errBody = JSON.parse(data);
            return reject(new Error(errBody?.error?.message || `HTTP ${res.statusCode}`));
          } catch { return reject(new Error(`HTTP ${res.statusCode}`)); }
        }
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('JSON parse error')); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(bodyBuf);
    req.end();
  });
}

function buildSystemPrompt(ctx) {
  const trend = (ctx.monthlyTrend || []).map(m =>
    `${m.label}: gelir ${m.income}₺, gider ${m.expense}₺, net ${m.net}₺`
  ).join('\n');

  const goals = (ctx.savingsGoals || []).map(g =>
    `- ${g.name}: hedef ${g.target_amount}₺, biriken ${g.current_amount}₺`
  ).join('\n');

  const recentTx = (ctx.recentTransactions || []).slice(0, 20).map(t =>
    `${t.date} | ${t.type === 'income' ? 'Gelir' : 'Gider'} | ${t.amount}₺ | ${t.category || ''} | ${t.description || ''}`
  ).join('\n');

  const budget = ctx.budget
    ? `Aylık gelir hedefi: ${ctx.budget.total_income}₺, sabit giderler: ${ctx.budget.fixed_expenses}₺, tasarruf hedefi: ${ctx.budget.savings_goal}₺`
    : 'Bütçe tanımlanmamış';

  const today = ctx.todaySummary
    ? `Bugün: ${ctx.todaySummary.todayExpense}₺ harcama, ${ctx.todaySummary.todayIncome}₺ gelir`
    : '';

  return `Sen LifeDash uygulamasının kişisel finans danışmanısın. Her zaman Türkçe yanıt ver. Kısa, net ve pratik öneriler sun.

Kullanıcının finansal verileri:

[AYLIK TREND - Son 6 Ay]
${trend || 'Veri yok'}

[BÜTÇE]
${budget}

[TASARRUF HEDEFLERİ]
${goals || 'Hedef tanımlanmamış'}

[SON İŞLEMLER]
${recentTx || 'İşlem yok'}

[BUGÜN]
${today}

Bu verilere dayanarak kullanıcının sorularını yanıtla. Gereksiz tekrar yapma, direkt faydalı bilgi ver.`;
}

// =================== SMART NOTIFICATIONS ===================
function startNotificationSystem() {
  if (notificationInterval) clearInterval(notificationInterval);

  let lastBudgetNotifHour = -1;
  let lastTaskNotifHour = -1;
  let lastDebtNotifDay = -1;

  notificationInterval = setInterval(async () => {
    try {
      const settings = db.getSettings();
      if (settings.notifications !== 'true') return;

      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();
      const day = now.getDate();

      // Daily reminder at 20:00 — check incomplete tasks (sadece bir kez)
      if (hour === 20 && minute === 0 && settings.daily_reminder === 'true' && lastTaskNotifHour !== hour) {
        lastTaskNotifHour = hour;
        const tasks = db.getDailyTasks();
        const pending = tasks.filter(t => t.status === 'pending');
        if (pending.length > 0) {
          showNotification('Görevlerin Bekliyor!', `${pending.length} tamamlanmamış görevin var. Serini kaybetme!`);
        }
      }

      // Budget limit check — saatte bir, tekrar etmeden
      if (minute === 0 && hour !== lastBudgetNotifHour) {
        lastBudgetNotifHour = hour;
        const limit = db.getDailyLimit();
        if (limit && limit.hasBudget && limit.todaySpent > limit.dailyLimit) {
          showNotification('Bütçe Uyarısı!', `Bugünkü limitini ${(limit.todaySpent - limit.dailyLimit).toFixed(0)} ₺ aştın!`);
        }
      }

      // Debt due date check — at 9:00, günde bir kez
      if (hour === 9 && minute === 0 && day !== lastDebtNotifDay) {
        lastDebtNotifDay = day;
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
  ipcMain.on('window-close', () => { app.isQuitting = true; app.quit(); });

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
  ipcMain.handle('db-get-debt-forecast', (_, id) => db.getDebtForecast(id));

  // Finance - Monthly Budget
  ipcMain.handle('db-set-budget', (_, data) => db.setBudget(data));
  ipcMain.handle('db-get-budget', (_, month) => db.getBudget(month));
  ipcMain.handle('db-get-daily-limit', () => db.getDailyLimit());

  // Finance - Category Budgets
  ipcMain.handle('db-set-category-budget', (_, month, category, limit) => db.setCategoryBudget(month, category, limit));
  ipcMain.handle('db-delete-category-budget', (_, month, category) => db.deleteCategoryBudget(month, category));
  ipcMain.handle('db-get-category-budgets', (_, month) => db.getCategoryBudgets(month));
  ipcMain.handle('db-get-category-spending', (_, month) => db.getCategorySpending(month));

  // XP & Gamification
  ipcMain.handle('db-get-user-stats', () => db.getUserStats());
  ipcMain.handle('db-add-xp', (_, amount, reason) => db.addXP(amount, reason));
  ipcMain.handle('db-remove-xp', (_, amount, reason) => db.removeXP(amount, reason));
  ipcMain.handle('db-get-daily-tasks', () => db.getDailyTasks());
  ipcMain.handle('db-complete-task', (_, taskId) => db.completeTask(taskId));
  ipcMain.handle('db-fail-task', (_, taskId) => db.failTask(taskId));
  ipcMain.handle('db-get-achievements', () => db.getAchievements());
  ipcMain.handle('db-get-achievement-progress', () => db.getAchievementProgress());
  ipcMain.handle('db-check-streak', () => db.checkStreak());
  ipcMain.handle('db-get-xp-history', (_, days) => db.getXPHistory(days));

  // Daily Login
  ipcMain.handle('db-check-daily-login', () => db.checkDailyLogin());

  // Loot Box
  ipcMain.handle('db-check-lootbox', () => db.checkLootBox());
  ipcMain.handle('db-open-lootbox', () => db.openLootBox());

  // Boss Battle
  ipcMain.handle('db-get-boss-battle', () => db.getBossBattle());

  // Shop & LifeCoins
  ipcMain.handle('db-get-lifecoins', () => db.getLifeCoins());
  ipcMain.handle('db-add-lifecoins', (_, amount, reason) => db.addLifeCoins(amount, reason));
  ipcMain.handle('db-get-shop-items', () => db.getShopItems());
  ipcMain.handle('db-purchase-item', (_, itemKey) => db.purchaseItem(itemKey));
  ipcMain.handle('db-get-inventory', () => db.getInventory());
  ipcMain.handle('db-equip-item', (_, itemKey) => db.equipItem(itemKey));
  ipcMain.handle('db-unequip-item', (_, itemKey) => db.unequipItem(itemKey));
  ipcMain.handle('db-get-equipped-items', () => db.getEquippedItems());
  ipcMain.handle('db-get-active-buffs', () => db.getActiveBuffs());
  ipcMain.handle('db-add-buff', (_, type, mult, hours, source, reason) => db.addBuff(type, mult, hours, source, reason));
  ipcMain.handle('db-get-streak-freezes', () => db.getStreakFreezes());
  ipcMain.handle('db-use-consumable', (_, itemKey) => db.useConsumable(itemKey));

  // Projects & Subtasks
  ipcMain.handle('db-add-project', (_, data) => db.addProject(data));
  ipcMain.handle('db-get-projects', () => db.getProjects());
  ipcMain.handle('db-update-project', (_, id, data) => db.updateProject(id, data));
  ipcMain.handle('db-complete-project', (_, id) => db.completeProject(id));
  ipcMain.handle('db-delete-project', (_, id) => db.deleteProject(id));
  ipcMain.handle('db-add-subtask', (_, data) => db.addSubtask(data));
  ipcMain.handle('db-toggle-subtask', (_, id) => db.toggleSubtask(id));
  ipcMain.handle('db-delete-subtask', (_, id) => db.deleteSubtask(id));

  // Recurring Tasks
  ipcMain.handle('db-add-recurring-task', (_, data) => db.addRecurringTask(data));
  ipcMain.handle('db-get-recurring-tasks', () => db.getRecurringTasks());
  ipcMain.handle('db-update-recurring-task', (_, id, data) => db.updateRecurringTask(id, data));
  ipcMain.handle('db-delete-recurring-task', (_, id) => db.deleteRecurringTask(id));

  // Habits
  ipcMain.handle('db-add-habit', (_, data) => db.addHabit(data));
  ipcMain.handle('db-get-habits', () => db.getHabits());
  ipcMain.handle('db-update-habit', (_, id, data) => db.updateHabit(id, data));
  ipcMain.handle('db-toggle-habit', (_, habitId, date) => db.toggleHabit(habitId, date));
  ipcMain.handle('db-delete-habit', (_, id) => db.deleteHabit(id));

  // Pomodoro
  ipcMain.handle('db-save-pomodoro', (_, data) => db.savePomodoro(data));
  ipcMain.handle('db-get-pomodoro-stats', () => db.getPomodoroStats());
  ipcMain.handle('db-get-pomodoro-trend', (_, days) => db.getPomodoroTrend(days));
  ipcMain.handle('db-get-pomodoro-by-hour', () => db.getPomodoroByHour());

  // Settings
  ipcMain.handle('db-get-settings', () => db.getSettings());
  ipcMain.handle('db-set-setting', (_, key, value) => db.setSetting(key, value));
  ipcMain.handle('db-reset-all-data', () => db.resetAllData());

  // Habit Stats
  ipcMain.handle('db-get-habit-stats', (_, id) => db.getHabitStats(id));
  ipcMain.handle('db-get-habit-heatmap', (_, id, months) => db.getHabitHeatmap(id, months));

  // Impulse Purchases
  // Challenges
  ipcMain.handle('db-get-daily-challenges', () => db.getDailyChallenges());
  ipcMain.handle('db-update-challenge-progress', (_, type, value) => db.updateChallengeProgress(type, value));

  // Subscriptions
  ipcMain.handle('db-add-subscription', (_, data) => db.addSubscription(data));
  ipcMain.handle('db-get-subscriptions', () => db.getSubscriptions());
  ipcMain.handle('db-get-subscription-total', () => db.getSubscriptionTotal());

  // Assets (Net Worth)
  ipcMain.handle('db-get-assets', () => db.getAssets());
  ipcMain.handle('db-add-asset', (_, data) => db.addAsset(data));
  ipcMain.handle('db-update-asset', (_, id, data) => db.updateAsset(id, data));
  ipcMain.handle('db-delete-asset', (_, id) => db.deleteAsset(id));
  ipcMain.handle('db-get-net-worth', (_, rates) => db.getNetWorth(rates || {}));
  ipcMain.handle('db-get-expenses-by-category', (_, month) => db.getExpensesByCategory(month));

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
  ipcMain.handle('db-get-estimated-completion', (_, goalId) => db.getEstimatedCompletion(goalId));
  ipcMain.handle('db-get-savings-deposit-history', (_, goalId) => db.getSavingsDepositHistory(goalId));

  // Journal
  ipcMain.handle('db-add-journal-entry', (_, data) => db.addJournalEntry(data));
  ipcMain.handle('db-get-journal-entries', (_, month) => db.getJournalEntries(month));
  ipcMain.handle('db-get-journal-entry', (_, date) => db.getJournalEntry(date));
  ipcMain.handle('db-delete-journal-entry', (_, date) => db.deleteJournalEntry(date));
  ipcMain.handle('db-get-mood-trend', (_, days) => db.getMoodTrend(days));

  // Reviews
  ipcMain.handle('db-add-review', (_, data) => db.addReview(data));
  ipcMain.handle('db-get-review', (_, weekStart) => db.getReview(weekStart));
  ipcMain.handle('db-get-reviews', (_, limit) => db.getReviews(limit));

  // Calendar
  ipcMain.handle('db-get-month-summary', (_, yearMonth) => db.getMonthSummary(yearMonth));

  // Daily Dice
  ipcMain.handle('db-roll-daily-dice', () => db.rollDailyDice());
  ipcMain.handle('db-can-roll-dice', () => db.canRollDice());

  // Prestige
  ipcMain.handle('db-do-prestige', () => db.doPrestige());
  ipcMain.handle('db-get-prestige-info', () => db.getPrestigeInfo());

  // Crafting
  ipcMain.handle('db-get-crafting-recipes', () => db.getCraftingRecipes());
  ipcMain.handle('db-craft-item', (_, recipeId) => db.craftItem(recipeId));

  // Today Summary
  ipcMain.handle('db-get-today-summary', () => db.getTodaySummary());

  // Reports & Trends
  ipcMain.handle('db-get-monthly-trend', (_, months) => db.getMonthlyTrend(months));
  ipcMain.handle('db-get-month-comparison', () => db.getMonthComparison());
  ipcMain.handle('db-generate-report-card', (_, type, key) => db.generateReportCard(type, key));
  ipcMain.handle('db-get-report-card', (_, type, key) => db.getReportCard(type, key));

  // Data Export
  ipcMain.handle('db-export-data', async (_, type) => {
    const data = db.exportData(type);
    if (!data) return { success: false };
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Veri Dışa Aktar',
      defaultPath: data.filename,
      filters: [{ name: data.format === 'csv' ? 'CSV' : 'JSON', extensions: [data.format === 'csv' ? 'csv' : 'json'] }]
    });
    if (result.canceled || !result.filePath) return { success: false };
    try {
      const fs = require('fs');
      const bom = data.format === 'csv' ? '\uFEFF' : '';
      fs.writeFileSync(result.filePath, bom + data.content, 'utf-8');
      return { success: true, path: result.filePath };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // AI Chat (Groq API)
  ipcMain.handle('ai-chat', async (_, { message, history, context }) => {
    const settings = db.getSettings();
    const apiKey = (settings.groq_api_key || '').trim().replace(/[\r\n\t]/g, '');
    if (!apiKey) return { error: 'API key eksik. Ayarlar sayfasından Groq API key ekle.' };

    const systemPrompt = buildSystemPrompt(context || {});
    const body = JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        ...(history || []),
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 1024
    });

    try {
      const data = await fetchJSONWithBody(
        'https://api.groq.com/openai/v1/chat/completions',
        apiKey,
        body
      );
      if (data.error) return { error: data.error.message || 'Groq API hatası' };
      
      const reply = data?.choices?.[0]?.message?.content;
      if (!reply) return { error: 'Geçersiz API yanıtı alındı.' };
      
      return { reply };
    } catch (e) {
      return { error: e.message };
    }
  });

  ipcMain.handle('ai-get-context', async () => {
    try {
      const stats = db.getUserStats();
      return {
        monthlyTrend: db.getMonthlyTrend(6),
        budget: db.getBudget(),
        recentTransactions: db.getTransactions({ limit: 50 }),
        savingsGoals: db.getSavingsGoals(),
        todaySummary: db.getTodaySummary(),
        userLevel: stats ? stats.level : 1
      };
    } catch (e) {
      return {};
    }
  });

  // Dynamic Quests (Dungeon Master)
  ipcMain.handle('ai-generate-quest', async (_, context) => {
    const settings = db.getSettings();
    const apiKey = (settings.groq_api_key || '').trim().replace(/[\r\n\t]/g, '');
    if (!apiKey) return { error: 'API key eksik. Ayarlar sayfasından Groq API key ekle.' };

    const systemPrompt = `Sen RPG stilinde acımasız ama adil bir yapay zeka oyun yöneticisisin (AI Dungeon Master). Kullanıcının finansal veya görev durumunu inceleyip, ona gerçek dünyada uygulayabileceği epik, aksiyon dolu ve oyunsallaştırılmış DİNAMİK BİR GÖREV üreteceksin.
Mevcut Kullanıcı Durumu: ${JSON.stringify(context, null, 2)}
LÜTFEN SADECE VE SADECE aşağıdaki yapıda bir JSON objesi döndür, başka hiçbir ek yazı yazma:
{"title": "Kısa ve Epik Görev Adı", "description": "Görevin sürükleyici hikayesi ve yapılması gereken net görev", "reward_xp": (20 ile 300 arası sayı), "reward_coins": (5 ile 50 arası sayı)}`;

    const body = JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: systemPrompt }],
      temperature: 0.7,
      max_tokens: 500
    });

    try {
      const data = await fetchJSONWithBody('https://api.groq.com/openai/v1/chat/completions', apiKey, body);
      if (data.error) return { error: data.error.message || 'Groq API hatası' };
      
      const reply = data?.choices?.[0]?.message?.content;
      if (!reply) return { error: 'Geçersiz API yanıtı alındı.' };
      
      try {
        const match = reply.match(/\{[\s\S]*\}/);
        const questJson = JSON.parse(match[0]);
        if (!questJson.title || !questJson.description) throw new Error('Geçersiz format');
        return { quest: questJson };
      } catch(parseError) {
        return { error: 'Yapay zeka geçersiz formatta yanıt verdi.' };
      }
    } catch (e) {
      return { error: e.message };
    }
  });

  ipcMain.handle('db-get-active-dynamic-quests', () => db.getActiveDynamicQuests());
  ipcMain.handle('db-add-dynamic-quest', (_, data) => db.addDynamicQuest(data));
  ipcMain.handle('db-complete-dynamic-quest', (_, id) => db.completeDynamicQuest(id));

  // Update check
  ipcMain.handle('check-for-updates', async () => {
    if (!app.isPackaged) return { status: 'dev-mode' };
    try { return await autoUpdater.checkForUpdates(); }
    catch (e) { return { status: 'error', message: e.message }; }
  });
  ipcMain.handle('install-update', () => {
    autoUpdater.quitAndInstall(true, true); // silent=true, forceRunAfter=true
  });
  ipcMain.handle('get-app-version', () => app.getVersion());

  // Backup
  ipcMain.handle('backup-export', async () => {
    const today = new Date().toISOString().split('T')[0];
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Verileri Dışa Aktar',
      defaultPath: `lifedash-backup-${today}.db`,
      filters: [{ name: 'SQLite Database', extensions: ['db'] }]
    });
    if (result.canceled || !result.filePath) return { success: false };
    try {
      const fs = require('fs');
      // Close and reopen to ensure WAL is checkpointed
      db.db.pragma('wal_checkpoint(TRUNCATE)');
      fs.copyFileSync(db.dbPath, result.filePath);
      db.setSetting('last_backup_date', new Date().toISOString());
      return { success: true, path: result.filePath };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('backup-import', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Yedekten Geri Yükle',
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
      properties: ['openFile']
    });
    if (result.canceled || !result.filePaths.length) return { success: false };
    try {
      const fs = require('fs');
      const Database = require('better-sqlite3');
      // Validate the backup file is a valid SQLite DB
      const testDb = new Database(result.filePaths[0], { readonly: true });
      testDb.pragma('integrity_check');
      testDb.close();
      // Close current DB and replace
      db.db.close();
      fs.copyFileSync(result.filePaths[0], db.dbPath);
      // Relaunch app
      app.isQuitting = true;
      app.relaunch();
      app.quit();
      return { success: true };
    } catch (e) {
      // Reopen original DB if import failed
      db.db = new Database(db.dbPath);
      db.db.pragma('journal_mode = WAL');
      return { success: false, error: e.message };
    }
  });

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

// =================== AUTO-UPDATER ===================
function setupAutoUpdater() {
  if (!app.isPackaged) return;

  // Load lazily after app is ready (avoid getVersion() crash in dev)
  try {
    autoUpdater = require('electron-updater').autoUpdater;
  } catch (e) {
    console.log('electron-updater load failed:', e.message);
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;

  autoUpdater.on('checking-for-update', () => {
    mainWindow?.webContents.send('update-status', { status: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('update-status', {
      status: 'available',
      version: info.version
    });
    showNotification('LifeDash Guncellemesi', `v${info.version} indiriliyor...`);
  });

  autoUpdater.on('update-not-available', () => {
    mainWindow?.webContents.send('update-status', { status: 'up-to-date' });
  });

  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('update-status', {
      status: 'downloading',
      percent: Math.round(progress.percent)
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    mainWindow?.webContents.send('update-status', {
      status: 'ready',
      version: info.version
    });
    showNotification(
      'LifeDash Guncellendi',
      `v${info.version} indirildi. Uygulamayi kapattiginizda otomatik kurulacak.`
    );
  });

  autoUpdater.on('error', (err) => {
    mainWindow?.webContents.send('update-status', {
      status: 'error',
      message: err.message
    });
  });

  setTimeout(() => autoUpdater.checkForUpdates(), 10000);
}

// =================== APP LIFECYCLE ===================
app.whenReady().then(async () => {
  db = new AppDatabase().initialize(app.getPath('userData'));
  db.checkRecurringTransactions(); // Auto-process recurring transactions on startup
  db.generateDailyChallenges(); // Generate daily challenges on startup
  createWindow();
  createTray();
  setupIPC();
  startNotificationSystem();
  setupAutoUpdater();

  // Enable auto-launch by default
  try {
    const isEnabled = await autoLauncher.isEnabled();
    if (!isEnabled) await autoLauncher.enable();
  } catch (e) {
    console.log('Auto-launch setup skipped:', e.message);
  }
});

app.on('before-quit', () => {
  // Close DB connection gracefully
  if (db && db.db) db.db.close();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
