const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class AppDatabase {
  constructor() {
    this.db = null;
    this.dbPath = null;
  }

  async initialize(userDataPath) {
    this.dbPath = path.join(userDataPath, 'lifedash.db');
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');

    this.init();
    return this;
  }

  save() {} // No longer needed
  scheduleSave() {} // No longer needed
  forceSave() {} // No longer needed

  run(sql, params = []) {
    return this.db.prepare(sql).run(...params);
  }

  get(sql, params = []) {
    return this.db.prepare(sql).get(...params) || null;
  }

  all(sql, params = []) {
    return this.db.prepare(sql).all(...params);
  }

  init() {
    const sqls = [
      `CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        date TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      )`,
      `CREATE TABLE IF NOT EXISTS debts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        total_amount REAL NOT NULL,
        paid_amount REAL NOT NULL DEFAULT 0,
        due_date TEXT,
        monthly_payment REAL DEFAULT 0,
        notes TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      )`,
      `CREATE TABLE IF NOT EXISTS budgets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        month TEXT NOT NULL UNIQUE,
        total_income REAL NOT NULL DEFAULT 0,
        fixed_expenses REAL NOT NULL DEFAULT 0,
        savings_goal REAL NOT NULL DEFAULT 0
      )`,
      `CREATE TABLE IF NOT EXISTS user_stats (
        id INTEGER PRIMARY KEY,
        xp INTEGER NOT NULL DEFAULT 0,
        level INTEGER NOT NULL DEFAULT 1,
        current_streak INTEGER NOT NULL DEFAULT 0,
        best_streak INTEGER NOT NULL DEFAULT 0,
        total_tasks_completed INTEGER NOT NULL DEFAULT 0,
        last_active_date TEXT,
        difficulty_multiplier REAL NOT NULL DEFAULT 1.0,
        last_lootbox_level INTEGER NOT NULL DEFAULT 0
      )`,
      `CREATE TABLE IF NOT EXISTS xp_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount INTEGER NOT NULL,
        reason TEXT,
        date TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      )`,
      `CREATE TABLE IF NOT EXISTS daily_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        xp_reward INTEGER NOT NULL DEFAULT 10,
        xp_penalty INTEGER NOT NULL DEFAULT 5,
        is_system INTEGER NOT NULL DEFAULT 0,
        date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        completed_at TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS achievements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        xp_reward INTEGER NOT NULL DEFAULT 50,
        unlocked INTEGER NOT NULL DEFAULT 0,
        unlocked_at TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS habits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        icon TEXT DEFAULT '✓',
        color TEXT DEFAULT '#6366f1',
        xp_reward INTEGER NOT NULL DEFAULT 5,
        created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
        is_active INTEGER NOT NULL DEFAULT 1
      )`,
      `CREATE TABLE IF NOT EXISTS habit_completions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        habit_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        UNIQUE(habit_id, date)
      )`,
      `CREATE TABLE IF NOT EXISTS pomodoro_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        duration INTEGER NOT NULL,
        type TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 1,
        date TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      )`,
      `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS recurring_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        period TEXT NOT NULL,
        day_of_month INTEGER,
        day_of_week INTEGER,
        last_processed TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      )`,
      `CREATE TABLE IF NOT EXISTS savings_goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        target_amount REAL NOT NULL,
        current_amount REAL NOT NULL DEFAULT 0,
        icon TEXT DEFAULT '🎯',
        color TEXT DEFAULT '#6366f1',
        is_completed INTEGER NOT NULL DEFAULT 0,
        completed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      )`,
      `CREATE TABLE IF NOT EXISTS savings_deposits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        goal_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        date TEXT NOT NULL DEFAULT (datetime('now','localtime')),
        FOREIGN KEY (goal_id) REFERENCES savings_goals(id)
      )`,
      `CREATE TABLE IF NOT EXISTS report_cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        period_type TEXT NOT NULL,
        period_key TEXT NOT NULL UNIQUE,
        total_spent REAL DEFAULT 0,
        total_income REAL DEFAULT 0,
        top_category TEXT,
        grade TEXT DEFAULT 'C',
        budget_adherence REAL,
        generated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      )`,
      `CREATE TABLE IF NOT EXISTS impulse_purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        impulse_date TEXT NOT NULL,
        resolved INTEGER NOT NULL DEFAULT 0,
        resolved_date TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      )`,
      `CREATE TABLE IF NOT EXISTS category_budgets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        month TEXT NOT NULL,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        UNIQUE(month, category)
      )`,
      `CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        color TEXT DEFAULT '#6366f1',
        is_completed INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      )`,
      `CREATE TABLE IF NOT EXISTS subtasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        is_completed INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY(task_id) REFERENCES daily_tasks(id)
      )`,
      `CREATE TABLE IF NOT EXISTS user_equipment (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        equipment_key TEXT NOT NULL UNIQUE,
        acquired_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      )`
    ];

    sqls.forEach(sql => this.run(sql));

    // Init user stats
    const stats = this.get('SELECT * FROM user_stats WHERE id = 1');
    if (!stats) {
      this.run('INSERT INTO user_stats (id, xp, level, current_streak, best_streak, total_tasks_completed, difficulty_multiplier, last_lootbox_level) VALUES (1, 0, 1, 0, 0, 0, 1.0, 0)');
    }

    // Migration: add new columns to existing DBs
    try { this.run('ALTER TABLE user_stats ADD COLUMN difficulty_multiplier REAL NOT NULL DEFAULT 1.0'); } catch {}
    try { this.run('ALTER TABLE user_stats ADD COLUMN last_lootbox_level INTEGER NOT NULL DEFAULT 0'); } catch {}
    try { this.run('ALTER TABLE user_stats ADD COLUMN finance_badge TEXT'); } catch {}
    
    // Phase 2 Migrations
    try { this.run('ALTER TABLE savings_goals ADD COLUMN target_date TEXT'); } catch {}
    try { this.run('ALTER TABLE savings_goals ADD COLUMN xp_reward INTEGER NOT NULL DEFAULT 50'); } catch {}
    try { this.run('ALTER TABLE savings_goals ADD COLUMN coin_reward INTEGER NOT NULL DEFAULT 10'); } catch {}
    
    try { this.run('ALTER TABLE user_stats ADD COLUMN life_coins INTEGER NOT NULL DEFAULT 0'); } catch {}
    try { this.run('ALTER TABLE user_stats ADD COLUMN streak_freezes_owned INTEGER NOT NULL DEFAULT 0'); } catch {}
    try { this.run('ALTER TABLE user_stats ADD COLUMN active_equipment_ids TEXT'); } catch {}
    
    try { this.run('ALTER TABLE daily_tasks ADD COLUMN project_id INTEGER'); } catch {}

    // Create indexes for frequently queried columns
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_habit_comp ON habit_completions(habit_id, date)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_date ON daily_tasks(date, status)',
      'CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(date)',
      'CREATE INDEX IF NOT EXISTS idx_xp_date ON xp_history(date)',
      'CREATE INDEX IF NOT EXISTS idx_savings_deposits ON savings_deposits(goal_id, date)',
    ];
    indexes.forEach(sql => this.run(sql));

    this.initAchievements();
    this.initSettings();
    this.generateDailyTasks();
    this.checkRecurringTransactions();
  }

  checkRecurringTransactions() {
    const recurrings = this.all("SELECT * FROM recurring_transactions WHERE is_active = 1");
    if (!recurrings || recurrings.length === 0) return;

    const today = new Date();
    const todayStr = this.getToday();

    for (const rec of recurrings) {
      if (rec.period === 'monthly' && rec.day_of_month) {
        if (today.getDate() >= rec.day_of_month) {
          const expectedDateStr = todayStr.slice(0, 7) + '-' + String(rec.day_of_month).padStart(2, '0');
          if (!rec.last_processed || rec.last_processed < expectedDateStr) {
            this.addTransaction({
              type: rec.type,
              amount: rec.amount,
              category: rec.category,
              description: `Otomatik Abonelik: ${rec.description}`,
              date: todayStr
            });
            this.run("UPDATE recurring_transactions SET last_processed = ? WHERE id = ?", [expectedDateStr, rec.id]);
          }
        }
      } else if (rec.period === 'weekly') {
        if (!rec.last_processed) {
          this.addTransaction({
            type: rec.type, amount: rec.amount, category: rec.category,
            description: `Otomatik (Haftalık): ${rec.description}`, date: todayStr
          });
          this.run("UPDATE recurring_transactions SET last_processed = ? WHERE id = ?", [todayStr, rec.id]);
        } else {
          const last = new Date(rec.last_processed);
          const diff = Math.floor((today - last) / (1000 * 60 * 60 * 24));
          if (diff >= 7) {
            this.addTransaction({
              type: rec.type, amount: rec.amount, category: rec.category,
              description: `Otomatik (Haftalık): ${rec.description}`, date: todayStr
            });
            this.run("UPDATE recurring_transactions SET last_processed = ? WHERE id = ?", [todayStr, rec.id]);
          }
        }
      }
    }
  }

  initAchievements() {
    const achievements = [
      ['first_transaction', 'İlk Adım', 'İlk gelir/gider kaydını gir', '💰', 25],
      ['streak_3', 'Üç Günlük Seri', '3 gün üst üste görev tamamla', '🔥', 50],
      ['streak_7', 'Haftalık Savaşçı', '7 gün üst üste görev tamamla', '⚔️', 100],
      ['streak_30', 'Aylık Efsane', '30 gün üst üste görev tamamla', '👑', 500],
      ['level_5', 'Çırak', 'Seviye 5\'e ulaş', '⭐', 100],
      ['level_10', 'Usta', 'Seviye 10\'a ulaş', '🌟', 250],
      ['save_1000', 'İlk Birikim', '1000 TL tasarruf et', '🏦', 200],
      ['save_5000', 'Kumbara Kralı', '5000 TL tasarruf et', '💎', 500],
      ['pomodoro_10', 'Odak Ustası', '10 pomodoro tamamla', '🍅', 75],
      ['pomodoro_50', 'Süper Odak', '50 pomodoro tamamla', '🎯', 200],
      ['budget_master', 'Bütçe Ustası', 'Bir ay boyunca bütçeyi aşma', '📊', 300],
      ['debt_clear', 'Özgürlük', 'Bir borcu tamamen kapat', '🎉', 250],
      ['all_habits_7', 'Alışkanlık Robotu', '7 gün tüm alışkanlıkları tamamla', '🤖', 150],
      ['iron_will', 'Demir İrade', '24 saat beklettikten sonra bir dürtü harcamasını reddet', '🧊', 75],
      ['savings_goal_reached', 'Hedef Tamam!', 'Bir tasarruf hedefini tamamla', '🏦', 150],
      ['savings_3_goals', 'Kumbara Koleksiyoncusu', '3 tasarruf hedefini tamamla', '🐷', 300],
    ];

    for (const [key, title, desc, icon, xp] of achievements) {
      const existing = this.get('SELECT 1 FROM achievements WHERE key = ?', [key]);
      if (!existing) {
        this.run('INSERT INTO achievements (key, title, description, icon, xp_reward) VALUES (?, ?, ?, ?, ?)',
          [key, title, desc, icon, xp]);
      }
    }
  }

  initSettings() {
    const defaults = {
      theme: 'dark', currency: 'TRY', language: 'tr', notifications: 'true',
      pomodoro_work: '25', pomodoro_break: '5', pomodoro_long_break: '15', daily_reminder: 'true',
      sound_effects: 'true', tutorial_completed: 'false'
    };

    for (const [key, value] of Object.entries(defaults)) {
      const existing = this.get('SELECT 1 FROM settings WHERE key = ?', [key]);
      if (!existing) {
        this.run('INSERT INTO settings (key, value) VALUES (?, ?)', [key, value]);
      }
    }
  }

  getToday() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  getNow() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  }

  generateDailyTasks() {
    const today = this.getToday();
    const existing = this.get('SELECT COUNT(*) as count FROM daily_tasks WHERE date = ? AND is_system = 1', [today]);

    if (!existing || existing.count === 0) {
      const tasks = [
        ['Bugünkü harcamalarını gir', 'Tüm harcamalarını kaydet', 15, 10],
        ['Bütçe limitine uy', 'Günlük harcama limitini aşma', 20, 15],
        ['Alışkanlıklarını tamamla', 'En az 1 alışkanlığı işaretle', 10, 5],
      ];

      for (const [title, desc, reward, penalty] of tasks) {
        this.run('INSERT INTO daily_tasks (title, description, xp_reward, xp_penalty, is_system, date) VALUES (?, ?, ?, ?, 1, ?)',
          [title, desc, reward, penalty, today]);
      }
    }
  }

  // ============ TRANSACTIONS ============
  addTransaction(data) {
    this.run('INSERT INTO transactions (type, amount, category, description, date) VALUES (?, ?, ?, ?, ?)',
      [data.type, data.amount, data.category, data.description || '', data.date || this.getToday()]);
    this.scheduleSave();
    this.unlockAchievement('first_transaction');

    // Net savings achievements
    const totals = this.get("SELECT SUM(CASE WHEN type='income' THEN amount ELSE 0 END) - SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as net FROM transactions");
    const net = totals ? (totals.net || 0) : 0;
    if (net >= 1000) this.unlockAchievement('save_1000');
    if (net >= 5000) this.unlockAchievement('save_5000');

    // Budget master check on each expense
    if (data.type === 'expense') this.checkBudgetMasterAchievement();

    const id = this.get('SELECT last_insert_rowid() as id');
    return { id: id ? id.id : 0 };
  }

  getTransactions(filters = {}) {
    let query = 'SELECT * FROM transactions WHERE 1=1';
    const params = [];

    if (filters.type) { query += ' AND type = ?'; params.push(filters.type); }
    if (filters.category) { query += ' AND category = ?'; params.push(filters.category); }
    if (filters.startDate) { query += ' AND date >= ?'; params.push(filters.startDate); }
    if (filters.endDate) { query += ' AND date <= ?'; params.push(filters.endDate); }
    if (filters.month) { query += " AND substr(date, 1, 7) = ?"; params.push(filters.month); }

    query += ' ORDER BY date DESC, id DESC';
    if (filters.limit) { query += ' LIMIT ?'; params.push(filters.limit); }

    return this.all(query, params);
  }

  deleteTransaction(id) {
    this.run('DELETE FROM transactions WHERE id = ?', [id]);
  }

  // ============ DEBTS ============
  addDebt(data) {
    this.run('INSERT INTO debts (name, total_amount, paid_amount, due_date, monthly_payment, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [data.name, data.total_amount, data.paid_amount || 0, data.due_date || null, data.monthly_payment || 0, data.notes || '']);
    this.scheduleSave();
    const id = this.get('SELECT last_insert_rowid() as id');
    return { id: id ? id.id : 0 };
  }

  getDebts() {
    return this.all('SELECT * FROM debts WHERE is_active = 1 ORDER BY due_date ASC');
  }

  updateDebt(id, data) {
    const debt = this.get('SELECT * FROM debts WHERE id = ?', [id]);
    if (!debt) return null;

    this.run('UPDATE debts SET name=?, total_amount=?, paid_amount=?, due_date=?, monthly_payment=?, notes=?, is_active=? WHERE id = ?',
      [data.name ?? debt.name, data.total_amount ?? debt.total_amount,
       data.paid_amount ?? debt.paid_amount, data.due_date ?? debt.due_date,
       data.monthly_payment ?? debt.monthly_payment, data.notes ?? debt.notes,
       data.is_active ?? debt.is_active, id]);
    this.scheduleSave();

    const updated = this.get('SELECT * FROM debts WHERE id = ?', [id]);
    if (updated && updated.paid_amount >= updated.total_amount) {
      this.run('UPDATE debts SET is_active = 0 WHERE id = ?', [id]);
      // Unlock achievement only when ALL debts are cleared
      const remaining = this.get('SELECT COUNT(*) as c FROM debts WHERE is_active = 1');
      if (!remaining || remaining.c === 0) {
        this.unlockAchievement('debt_clear');
      }
    }

    return updated;
  }

  deleteDebt(id) {
    this.run('DELETE FROM debts WHERE id = ?', [id]);
  }

  // ============ BUDGET ============
  setBudget(data) {
    const existing = this.get('SELECT 1 FROM budgets WHERE month = ?', [data.month]);
    if (existing) {
      this.run('UPDATE budgets SET total_income=?, fixed_expenses=?, savings_goal=? WHERE month=?',
        [data.total_income, data.fixed_expenses, data.savings_goal || 0, data.month]);
    } else {
      this.run('INSERT INTO budgets (month, total_income, fixed_expenses, savings_goal) VALUES (?, ?, ?, ?)',
        [data.month, data.total_income, data.fixed_expenses, data.savings_goal || 0]);
    }
  }

  getBudget(month) {
    const m = month || new Date().toISOString().slice(0, 7);
    return this.get('SELECT * FROM budgets WHERE month = ?', [m]);
  }

  getDailyLimit() {
    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const budget = this.getBudget(currentMonth);

    if (!budget) return { limit: 0, spent: 0, remaining: 0, daysLeft: 0, hasBudget: false };

    const debts = this.get('SELECT COALESCE(SUM(monthly_payment), 0) as total FROM debts WHERE is_active = 1');
    const spent = this.get("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense' AND substr(date, 1, 7) = ?", [currentMonth]);

    // Bug #7 Fix: budget.total_income is the baseline; don't double-count recorded income transactions
    const totalIncome = budget.total_income;
    const totalObligations = budget.fixed_expenses + (debts ? debts.total : 0) + budget.savings_goal;
    const availableMoney = totalIncome - totalObligations - (spent ? spent.total : 0);

    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const daysLeft = lastDay - today.getDate() + 1;
    const dailyLimit = Math.max(0, availableMoney / daysLeft);

    const todayStr = this.getToday();
    const todaySpent = this.get("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense' AND date = ?", [todayStr]);

    return {
      hasBudget: true,
      dailyLimit: Math.round(dailyLimit * 100) / 100,
      todaySpent: todaySpent ? todaySpent.total : 0,
      todayRemaining: Math.max(0, Math.round((dailyLimit - (todaySpent ? todaySpent.total : 0)) * 100) / 100),
      monthlyRemaining: Math.round(availableMoney * 100) / 100,
      totalSpentThisMonth: spent ? spent.total : 0,
      daysLeft,
      totalIncome,
      totalObligations,
    };
  }

  // ============ XP ============
  getUserStats() {
    const stats = this.get('SELECT * FROM user_stats WHERE id = 1');
    if (!stats) return { xp: 0, level: 1, current_streak: 0, best_streak: 0, total_tasks_completed: 0, xpForNextLevel: 100, xpProgress: 0, xpNeeded: 100, progressPercent: 0, financeBadge: { key: 'kumarbaz', label: 'Kumarbaz', icon: '🎲' } };
    const xpForNext = this.xpForLevel(stats.level + 1);
    const xpForCurrent = this.xpForLevel(stats.level);
    const financeBadge = this.calcFinanceBadge();
    return {
      ...stats,
      xpForNextLevel: xpForNext,
      xpProgress: stats.xp - xpForCurrent,
      xpNeeded: xpForNext - xpForCurrent,
      progressPercent: xpForNext - xpForCurrent > 0 ? Math.round(((stats.xp - xpForCurrent) / (xpForNext - xpForCurrent)) * 100) : 0,
      financeBadge,
    };
  }

  xpForLevel(level) {
    return Math.floor(100 * Math.pow(level - 1, 1.5));
  }

  addLifeCoins(amount) {
    this.run('UPDATE user_stats SET life_coins = life_coins + ? WHERE id = 1', [amount]);
    return amount;
  }

  addXP(amount, reason) {
    const stats = this.getUserStats();
    
    // Gamification 2.0: Dynamic XP (Weekend multiplier)
    const day = new Date().getDay();
    let multiplier = 1.0;
    if (day === 0 || day === 6) multiplier = 1.5; // +50% XP weekends
    
    // Bug #2 Fix: Check Equipment Bonus with includes() for multi-equipment support
    const equip = (stats.active_equipment_ids || '').toLowerCase();
    if (equip.includes('reading_glasses') && reason.toLowerCase().includes('kitap')) {
      multiplier += 0.2; // +20%
    }
    if (equip.includes('running_shoes') && (reason.toLowerCase().includes('koşu') || reason.toLowerCase().includes('spor'))) {
      multiplier += 0.2;
    }

    const finalAmount = Math.round(amount * multiplier);
    
    const newXP = stats.xp + finalAmount;
    let newLevel = stats.level;
    while (newXP >= this.xpForLevel(newLevel + 1)) newLevel++;

    this.run('UPDATE user_stats SET xp = ?, level = ? WHERE id = 1', [newXP, newLevel]);
    // Bug #1 Fix: Log finalAmount (with multiplier) instead of raw amount
    this.run('INSERT INTO xp_history (amount, reason, date) VALUES (?, ?, ?)', [finalAmount, reason, this.getNow()]);
    this.scheduleSave();

    if (newLevel >= 5) this.unlockAchievement('level_5');
    if (newLevel >= 10) this.unlockAchievement('level_10');

    return { xp: newXP, level: newLevel, leveledUp: newLevel > stats.level };
  }

  removeXP(amount, reason) {
    const stats = this.getUserStats();
    const newXP = Math.max(0, stats.xp - amount);
    let newLevel = 1;
    while (newXP >= this.xpForLevel(newLevel + 1)) newLevel++;

    this.run('UPDATE user_stats SET xp = ?, level = ? WHERE id = 1', [newXP, newLevel]);
    this.run('INSERT INTO xp_history (amount, reason, date) VALUES (?, ?, ?)', [-amount, reason, this.getNow()]);
    this.scheduleSave();
    return { xp: newXP, level: newLevel };
  }

  getDailyTasks() {
    this.generateDailyTasks();
    const tasks = this.all('SELECT * FROM daily_tasks WHERE date = ? ORDER BY id ASC', [this.getToday()]);
    return tasks.map(t => {
      t.subtasks = this.all('SELECT * FROM subtasks WHERE task_id = ?', [t.id]);
      return t;
    });
  }

  addDailyTask(data) {
    this.run('INSERT INTO daily_tasks (title, description, xp_reward, xp_penalty, is_system, date, project_id) VALUES (?, ?, ?, ?, 0, ?, ?)',
      [data.title, data.description || '', data.xp_reward || 10, data.xp_penalty || 5, data.date || this.getToday(), data.project_id || null]);
    const id = this.get('SELECT last_insert_rowid() as id');
    return { id: id ? id.id : 0 };
  }

  // ============ PROJECTS & SUBTASKS ============
  addProject(data) {
    this.run('INSERT INTO projects (name, description, color) VALUES (?, ?, ?)',
      [data.name, data.description || '', data.color || '#6366f1']);
    const id = this.get('SELECT last_insert_rowid() as id');
    return { id: id ? id.id : 0 };
  }

  getProjects() {
    return this.all('SELECT * FROM projects ORDER BY created_at DESC');
  }

  updateProject(id, data) {
    this.run('UPDATE projects SET name = ?, description = ?, color = ?, is_completed = ? WHERE id = ?',
      [data.name, data.description, data.color, data.is_completed ? 1 : 0, id]);
  }

  deleteProject(id) {
    this.run('DELETE FROM projects WHERE id = ?', [id]);
    this.run('UPDATE daily_tasks SET project_id = NULL WHERE project_id = ?', [id]);
  }

  addSubtask(data) {
    this.run('INSERT INTO subtasks (task_id, title) VALUES (?, ?)', [data.task_id, data.title]);
    const id = this.get('SELECT last_insert_rowid() as id');
    return { id: id ? id.id : 0 };
  }

  toggleSubtask(id) {
    const subtask = this.get('SELECT * FROM subtasks WHERE id = ?', [id]);
    if (subtask) {
      const newStatus = subtask.is_completed ? 0 : 1;
      this.run('UPDATE subtasks SET is_completed = ? WHERE id = ?', [newStatus, id]);
      return { is_completed: newStatus };
    }
    return null;
  }

  completeTask(taskId) {
    const task = this.get('SELECT * FROM daily_tasks WHERE id = ?', [taskId]);
    if (!task || task.status !== 'pending') return null;

    this.run("UPDATE daily_tasks SET status = 'completed', completed_at = ? WHERE id = ?", [this.getNow(), taskId]);
    const result = this.addXP(task.xp_reward, `Görev tamamlandı: ${task.title}`);
    this.addLifeCoins(2); // +2 LifeCoins per task
    this.updateStreak(true);
    this.run('UPDATE user_stats SET total_tasks_completed = total_tasks_completed + 1 WHERE id = 1');

    // Reduce difficulty multiplier on success (min 1.0)
    const stats = this.get('SELECT difficulty_multiplier FROM user_stats WHERE id = 1');
    if (stats && stats.difficulty_multiplier > 1.0) {
      const newMult = Math.max(1.0, (stats.difficulty_multiplier || 1.0) * 0.9);
      this.run('UPDATE user_stats SET difficulty_multiplier = ? WHERE id = 1', [Math.round(newMult * 100) / 100]);
    }

    return result;
  }

  failTask(taskId) {
    const task = this.get('SELECT * FROM daily_tasks WHERE id = ?', [taskId]);
    if (!task || task.status !== 'pending') return null;

    this.run("UPDATE daily_tasks SET status = 'failed' WHERE id = ?", [taskId]);

    // Apply difficulty multiplier to penalty
    const stats = this.get('SELECT difficulty_multiplier FROM user_stats WHERE id = 1');
    const mult = (stats && stats.difficulty_multiplier) ? stats.difficulty_multiplier : 1.0;
    const penalty = Math.round(task.xp_penalty * mult);

    // Increase difficulty multiplier by 50% (compounds)
    const newMult = Math.round(mult * 1.5 * 100) / 100;
    this.run('UPDATE user_stats SET difficulty_multiplier = ? WHERE id = 1', [newMult]);

    return { ...this.removeXP(penalty, `Görev başarısız: ${task.title}`), difficultyMultiplier: newMult, actualPenalty: penalty };
  }

  updateStreak(success) {
    const stats = this.get('SELECT * FROM user_stats WHERE id = 1');
    const today = this.getToday();

    if (success) {
      let newStreak = stats.current_streak;
      if (stats.last_active_date !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        newStreak = (stats.last_active_date === yesterdayStr) ? newStreak + 1 : 1;
      }

      const bestStreak = Math.max(stats.best_streak, newStreak);
      this.run('UPDATE user_stats SET current_streak = ?, best_streak = ?, last_active_date = ? WHERE id = 1',
        [newStreak, bestStreak, today]);

      if (newStreak >= 3) this.unlockAchievement('streak_3');
      if (newStreak >= 7) this.unlockAchievement('streak_7');
      if (newStreak >= 30) this.unlockAchievement('streak_30');
    }
  }

  checkStreak() {
    const stats = this.get('SELECT * FROM user_stats WHERE id = 1');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (stats && stats.last_active_date && stats.last_active_date < yesterdayStr) {
      if (stats.streak_freezes_owned > 0) {
        // Use Streak Freeze
        this.run('UPDATE user_stats SET streak_freezes_owned = streak_freezes_owned - 1, last_active_date = ? WHERE id = 1', [yesterdayStr]);
        return { streakBroken: false, currentStreak: stats.current_streak, freezeUsed: true };
      } else {
        this.run('UPDATE user_stats SET current_streak = 0 WHERE id = 1');
        return { streakBroken: true, previousStreak: stats.current_streak, freezeUsed: false };
      }
    }
    return { streakBroken: false, currentStreak: stats ? stats.current_streak : 0, freezeUsed: false };
  }

  getAchievements() {
    return this.all('SELECT * FROM achievements ORDER BY unlocked DESC, xp_reward ASC');
  }

  unlockAchievement(key) {
    const a = this.get('SELECT * FROM achievements WHERE key = ? AND unlocked = 0', [key]);
    if (a) {
      this.run('UPDATE achievements SET unlocked = 1, unlocked_at = ? WHERE key = ?', [this.getNow(), key]);
      this.addXP(a.xp_reward, `Başarım: ${a.title}`);
      return a;
    }
    return null;
  }

  // ============ HABITS ============
  addHabit(data) {
    this.run('INSERT INTO habits (name, icon, color, xp_reward) VALUES (?, ?, ?, ?)',
      [data.name, data.icon || '✓', data.color || '#6366f1', data.xp_reward || 5]);
    this.scheduleSave();
    const id = this.get('SELECT last_insert_rowid() as id');
    return { id: id ? id.id : 0 };
  }

  getHabits() {
    const today = this.getToday();
    const habits = this.all('SELECT * FROM habits WHERE is_active = 1 ORDER BY id ASC');
    if (habits.length === 0) return [];

    // Single query: completedToday for all habits
    const todayCompletions = new Set(
      this.all('SELECT habit_id FROM habit_completions WHERE date = ?', [today])
        .map(r => r.habit_id)
    );

    // Single query: last 365 days of completions for streak calculation
    const allCompletions = this.all(
      "SELECT habit_id, date FROM habit_completions WHERE date >= date('now', '-365 days') ORDER BY habit_id, date DESC"
    );

    // Group by habit_id
    const completionsByHabit = {};
    for (const row of allCompletions) {
      if (!completionsByHabit[row.habit_id]) completionsByHabit[row.habit_id] = [];
      completionsByHabit[row.habit_id].push(row.date);
    }

    return habits.map(h => {
      const streak = this.calcStreakFromDates(completionsByHabit[h.id] || []);
      return { ...h, completedToday: todayCompletions.has(h.id), streak };
    });
  }

  calcStreakFromDates(dates) {
    if (!dates.length) return 0;
    let streak = 0;
    let checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);
    const dateSet = new Set(dates);
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (dateSet.has(dateStr)) { streak++; checkDate.setDate(checkDate.getDate() - 1); }
      else break;
    }
    return streak;
  }

  getHabitStreak(habitId) {
    const dates = this.all(
      "SELECT date FROM habit_completions WHERE habit_id = ? AND date >= date('now', '-365 days') ORDER BY date DESC",
      [habitId]
    ).map(r => r.date);
    return this.calcStreakFromDates(dates);
  }

  toggleHabit(habitId, date) {
    const d = date || this.getToday();
    const existing = this.get('SELECT 1 FROM habit_completions WHERE habit_id = ? AND date = ?', [habitId, d]);
    if (existing) {
      this.run('DELETE FROM habit_completions WHERE habit_id = ? AND date = ?', [habitId, d]);
      return { completed: false };
    } else {
      this.run('INSERT INTO habit_completions (habit_id, date) VALUES (?, ?)', [habitId, d]);
      const habit = this.get('SELECT * FROM habits WHERE id = ?', [habitId]);
      if (habit) {
        this.addXP(habit.xp_reward, `Alışkanlık: ${habit.name}`);
        this.addLifeCoins(1); // +1 LifeCoin per habit
      }
      this.checkAllHabits7Achievement(d);
      return { completed: true };
    }
  }

  deleteHabit(id) {
    this.run('UPDATE habits SET is_active = 0 WHERE id = ?', [id]);
  }

  // ============ POMODORO ============
  savePomodoro(data) {
    this.run('INSERT INTO pomodoro_sessions (duration, type, completed, date) VALUES (?, ?, ?, ?)',
      [data.duration, data.type, data.completed ? 1 : 0, this.getNow()]);
    this.scheduleSave();

    if (data.completed && data.type === 'work') {
      this.addXP(10, 'Pomodoro tamamlandı');
      const count = this.get("SELECT COUNT(*) as c FROM pomodoro_sessions WHERE type = 'work' AND completed = 1");
      if (count && count.c >= 10) this.unlockAchievement('pomodoro_10');
      if (count && count.c >= 50) this.unlockAchievement('pomodoro_50');
    }

    const id = this.get('SELECT last_insert_rowid() as id');
    return { id: id ? id.id : 0 };
  }

  getPomodoroStats() {
    const today = this.getToday();
    const todayCount = this.get(`SELECT COUNT(*) as count, COALESCE(SUM(duration), 0) as totalMinutes FROM pomodoro_sessions WHERE type = 'work' AND completed = 1 AND substr(date, 1, 10) = ?`, [today]);
    const totalCount = this.get(`SELECT COUNT(*) as count, COALESCE(SUM(duration), 0) as totalMinutes FROM pomodoro_sessions WHERE type = 'work' AND completed = 1`);
    return {
      today: todayCount || { count: 0, totalMinutes: 0 },
      total: totalCount || { count: 0, totalMinutes: 0 }
    };
  }

  // ============ XP HISTORY ============
  getXPHistory(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split('T')[0];
    return this.all('SELECT * FROM xp_history WHERE date >= ? ORDER BY date ASC LIMIT 500', [sinceStr]);
  }

  // ============ LOOT BOX ============
  checkLootBox() {
    const stats = this.get('SELECT level, last_lootbox_level FROM user_stats WHERE id = 1');
    if (!stats) return { available: false };

    const lastClaimed = stats.last_lootbox_level || 0;
    const currentLevel = stats.level;
    // Every 5 levels
    const nextLootLevel = Math.floor(lastClaimed / 5) * 5 + 5;
    const available = currentLevel >= nextLootLevel && nextLootLevel > lastClaimed;

    return { available, nextLevel: nextLootLevel, currentLevel };
  }

  openLootBox() {
    const check = this.checkLootBox();
    if (!check.available) return null;

    // Mark as claimed
    this.run('UPDATE user_stats SET last_lootbox_level = ? WHERE id = 1', [check.nextLevel]);

    // Random reward
    const rewards = [
      { type: 'xp', amount: 50, label: '+50 Bonus XP', icon: '⚡' },
      { type: 'xp', amount: 100, label: '+100 Bonus XP', icon: '💎' },
      { type: 'lifecoin', amount: 50, label: '+50 LifeCoin', icon: '🪙' },
      { type: 'streak_shield', amount: 1, label: 'Seri Kalkanı (1 gün koruma)', icon: '🛡️' },
      { type: 'difficulty_reset', amount: 1, label: 'Zorluk Sıfırlama', icon: '🔄' },
    ];

    const reward = rewards[Math.floor(Math.random() * rewards.length)];

    // Apply reward
    if (reward.type === 'xp') {
      this.addXP(reward.amount, `Loot Box: ${reward.label}`);
    } else if (reward.type === 'lifecoin') {
      this.addLifeCoins(reward.amount);
    } else if (reward.type === 'streak_shield') {
      this.run('UPDATE user_stats SET streak_freezes_owned = streak_freezes_owned + 1 WHERE id = 1');
    } else if (reward.type === 'difficulty_reset') {
      this.run('UPDATE user_stats SET difficulty_multiplier = 1.0 WHERE id = 1');
    }

    return reward;
  }

  // ============ SHOP & ECONOMY ============
  buyItem(itemType, price, itemId) {
    const stats = this.getUserStats();
    if (stats.life_coins >= price) {
      this.run('UPDATE user_stats SET life_coins = life_coins - ? WHERE id = 1', [price]);
      
      if (itemType === 'streak_freeze') {
        this.run('UPDATE user_stats SET streak_freezes_owned = streak_freezes_owned + 1 WHERE id = 1');
      } else if (itemType === 'equipment') {
        const existing = this.get('SELECT 1 FROM user_equipment WHERE equipment_key = ?', [itemId]);
        if (!existing) {
          this.run('INSERT INTO user_equipment (equipment_key) VALUES (?)', [itemId]);
        }
      } else if (itemType === 'theme') {
        this.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('theme', ?)", [itemId]);
      }
      return { success: true };
    }
    return { success: false, reason: 'Yetersiz LifeCoin' };
  }

  getEquipment() {
    return this.all('SELECT * FROM user_equipment');
  }

  equipItem(itemId) {
    this.run('UPDATE user_stats SET active_equipment_ids = ? WHERE id = 1', [itemId]);
  }

  // ============ BOSS BATTLE (Weekly) ============
  getBossBattle() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon...
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7)); // Find Monday

    const days = [];
    let successDays = 0;

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const todayStr = today.toISOString().split('T')[0];

      const tasks = this.all('SELECT * FROM daily_tasks WHERE date = ? AND is_system = 1', [dateStr]);
      const allCompleted = tasks.length > 0 && tasks.every(t => t.status === 'completed');
      const anyFailed = tasks.some(t => t.status === 'failed');
      const isPast = dateStr < todayStr;
      const isToday = dateStr === todayStr;

      // Bug #9 Fix: Count today's completed tasks in successDays
      let status = 'future';
      if (isToday) {
        if (allCompleted) { status = 'passed'; successDays++; }
        else status = 'today';
      }
      else if (allCompleted) { status = 'passed'; successDays++; }
      else if (isPast && anyFailed) status = 'failed';
      else if (isPast) status = 'pending';

      days.push({
        date: dateStr,
        dayLabel: ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'][i],
        status
      });
    }

    // Check if boss battle won (5+ days success)
    const isSunday = dayOfWeek === 0;
    const bossDefeated = successDays >= 5;

    return {
      days,
      successDays,
      bossDefeated,
      reward: bossDefeated ? 100 : 0,
      isSunday
    };
  }

  // ============ SETTINGS ============
  getSettings() {
    const rows = this.all('SELECT * FROM settings');
    const settings = {};
    for (const row of rows) settings[row.key] = row.value;
    return settings;
  }

  setSetting(key, value) {
    const existing = this.get('SELECT 1 FROM settings WHERE key = ?', [key]);
    if (existing) {
      this.run('UPDATE settings SET value = ? WHERE key = ?', [String(value), key]);
    } else {
      this.run('INSERT INTO settings (key, value) VALUES (?, ?)', [key, String(value)]);
    }
  }

  // Check if all active habits have been completed for 7 consecutive days
  checkAllHabits7Achievement(todayDate) {
    const achievement = this.get("SELECT * FROM achievements WHERE key = 'all_habits_7' AND unlocked = 0");
    if (!achievement) return;

    const habits = this.all('SELECT id FROM habits WHERE is_active = 1');
    if (habits.length === 0) return;

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const d = new Date();
      d.setDate(d.getDate() - dayOffset);
      const dateStr = d.toISOString().split('T')[0];
      for (const habit of habits) {
        const done = this.get('SELECT 1 FROM habit_completions WHERE habit_id = ? AND date = ?', [habit.id, dateStr]);
        if (!done) return; // Not all habits done on this day
      }
    }

    // All habits completed for 7 consecutive days!
    this.unlockAchievement('all_habits_7');
  }

  // ============ BUDGET MASTER ACHIEVEMENT ============
  checkBudgetMasterAchievement() {
    const month = this.getNow().slice(0, 7);
    const budget = this.get('SELECT * FROM budgets WHERE month = ?', [month]);
    if (!budget) return;

    const totalExpense = this.get("SELECT SUM(amount) as s FROM transactions WHERE type='expense' AND substr(date,1,7) = ?", [month]);
    const spent = totalExpense ? (totalExpense.s || 0) : 0;
    const limit = budget.total_income - budget.fixed_expenses - budget.savings_goal;

    // Trigger near month end (last 3 days) if still under limit
    const today = new Date();
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    if (today.getDate() >= lastDay - 2 && spent <= limit) {
      this.unlockAchievement('budget_master');
    }
  }

  // ============ HABIT STATISTICS ============
  getHabitStats(habitId) {
    const rows = this.all(
      "SELECT date FROM habit_completions WHERE habit_id = ? AND date >= date('now', '-28 days') ORDER BY date DESC",
      [habitId]
    );
    const completedDates = new Set(rows.map(r => r.date));

    const days = [];
    for (let i = 27; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      days.push({ date: dateStr, completed: completedDates.has(dateStr), dayOfWeek: d.getDay() });
    }

    const allDates = this.all(
      "SELECT date FROM habit_completions WHERE habit_id = ? ORDER BY date DESC", [habitId]
    ).map(r => r.date);
    const bestStreak = this.calcBestStreak(allDates);

    const skippedDays = [0, 0, 0, 0, 0, 0, 0];
    days.forEach(d => { if (!d.completed) skippedDays[d.dayOfWeek]++; });
    const mostSkippedDay = skippedDays.indexOf(Math.max(...skippedDays));

    return {
      days,
      totalCompleted: rows.length,
      completionRate: Math.round((rows.length / 28) * 100),
      bestStreak,
      mostSkippedDay,
    };
  }

  calcBestStreak(datesDesc) {
    if (!datesDesc.length) return 0;
    const sorted = [...datesDesc].reverse();
    let best = 0, current = 0, prev = null;
    for (const dateStr of sorted) {
      if (!prev) { current = 1; }
      else {
        const diff = (new Date(dateStr) - new Date(prev)) / 86400000;
        current = diff === 1 ? current + 1 : 1;
      }
      if (current > best) best = current;
      prev = dateStr;
    }
    return best;
  }

  // ============ RECURRING TRANSACTIONS ============
  addRecurring(data) {
    this.run(
      'INSERT INTO recurring_transactions (type, amount, category, description, period, day_of_month, day_of_week) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [data.type, data.amount, data.category, data.description || '', data.period, data.day_of_month || null, data.day_of_week || null]
    );
    this.scheduleSave();
    const id = this.get('SELECT last_insert_rowid() as id');
    return { id: id ? id.id : 0 };
  }

  getRecurrings() {
    return this.all('SELECT * FROM recurring_transactions WHERE is_active = 1 ORDER BY id ASC');
  }

  deleteRecurring(id) {
    this.run('UPDATE recurring_transactions SET is_active = 0 WHERE id = ?', [id]);
  }

  checkRecurringTransactions() {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const recurrings = this.all('SELECT * FROM recurring_transactions WHERE is_active = 1');

    for (const r of recurrings) {
      let shouldProcess = false;

      if (r.period === 'monthly') {
        const currentMonth = todayStr.slice(0, 7);
        const lastMonth = r.last_processed ? r.last_processed.slice(0, 7) : null;
        if (lastMonth !== currentMonth && today.getDate() >= r.day_of_month) {
          shouldProcess = true;
        }
      } else if (r.period === 'weekly') {
        if (!r.last_processed) {
          shouldProcess = today.getDay() === r.day_of_week;
        } else {
          const daysSince = (today - new Date(r.last_processed)) / 86400000;
          if (daysSince >= 7) shouldProcess = true;
        }
      }

      if (shouldProcess) {
        this.run(
          'INSERT INTO transactions (type, amount, category, description, date) VALUES (?, ?, ?, ?, ?)',
          [r.type, r.amount, r.category, r.description || '', todayStr]
        );
        this.run('UPDATE recurring_transactions SET last_processed = ? WHERE id = ?', [todayStr, r.id]);
        this.scheduleSave();
      }
    }
  }

  // ============ IMPULSE PURCHASES ============
  addImpulse(data) {
    this.run('INSERT INTO impulse_purchases (amount, category, description, impulse_date) VALUES (?, ?, ?, ?)',
      [data.amount, data.category, data.description || '', this.getToday()]);
    this.scheduleSave();
    const id = this.get('SELECT last_insert_rowid() as id');
    return { id: id ? id.id : 0 };
  }

  getImpulses() {
    return this.all('SELECT * FROM impulse_purchases WHERE resolved = 0 ORDER BY created_at ASC');
  }

  resolveImpulse(id, confirm) {
    const impulse = this.get('SELECT * FROM impulse_purchases WHERE id = ?', [id]);
    if (!impulse) return null;

    this.run('UPDATE impulse_purchases SET resolved = ?, resolved_date = ? WHERE id = ?',
      [confirm ? 1 : 2, this.getToday(), id]);

    if (confirm) {
      this.run('INSERT INTO transactions (type, amount, category, description, date) VALUES (?, ?, ?, ?, ?)',
        ['expense', impulse.amount, impulse.category, impulse.description || '', this.getToday()]);
      this.scheduleSave();
      this.addXP(5, 'Dürtü harcaması onayı (disiplin bonusu)');
      return { action: 'confirmed', xp: 5 };
    } else {
      this.addXP(15, 'Dürtü harcaması reddedildi!');
      this.unlockAchievement('iron_will');
      return { action: 'rejected', xp: 15 };
    }
  }

  // ============ FINANCE BADGE ============
  calcFinanceBadge() {
    const netRow = this.get("SELECT SUM(CASE WHEN type='income' THEN amount ELSE 0 END) - SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as net FROM transactions");
    const net = netRow ? (netRow.net || 0) : 0;

    const activeDebtsRow = this.get('SELECT COUNT(*) as c FROM debts WHERE is_active = 1');
    const hasActiveDebts = activeDebtsRow && activeDebtsRow.c > 0;

    const allDebtsRow = this.get('SELECT COUNT(*) as c FROM debts');
    const hadDebts = allDebtsRow && allDebtsRow.c > 0;

    let monthsUnderBudget = 0;
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const month = d.toISOString().slice(0, 7);
      const b = this.getBudget(month);
      if (!b) continue;
      const spentRow = this.get("SELECT COALESCE(SUM(amount), 0) as s FROM transactions WHERE type='expense' AND substr(date,1,7)=?", [month]);
      const limit = b.total_income - b.fixed_expenses - b.savings_goal;
      if ((spentRow ? spentRow.s : 0) <= limit) monthsUnderBudget++;
    }

    const hasBudget = !!this.getBudget(this.getNow().slice(0, 7));

    if (!hasActiveDebts && hadDebts && monthsUnderBudget >= 6) return { key: 'ozgur', label: 'Finansal Özgür', icon: '👑' };
    if (net >= 5000) return { key: 'yatirimci', label: 'Yatırımcı', icon: '💎' };
    if (!hasActiveDebts && hadDebts) return { key: 'borcsuz', label: 'Borçsuz', icon: '⚡' };
    if (net >= 1000) return { key: 'birikimci', label: 'Birikimci', icon: '💰' };
    if (monthsUnderBudget >= 2) return { key: 'disiplinli', label: 'Disiplinli', icon: '🛡️' };
    if (hasBudget) return { key: 'acemi', label: 'Acemi', icon: '🌱' };
    return { key: 'kumarbaz', label: 'Kumarbaz', icon: '🎲' };
  }

  // ============ SAVINGS GOALS (KUMBARA) ============
  addSavingsGoal(data) {
    this.run('INSERT INTO savings_goals (name, target_amount, icon, color) VALUES (?, ?, ?, ?)',
      [data.name, data.target_amount, data.icon || '🎯', data.color || '#6366f1']);
    this.scheduleSave();
    this.addXP(5, 'Yeni tasarruf hedefi oluşturuldu');
    const id = this.get('SELECT last_insert_rowid() as id');
    return { id: id ? id.id : 0 };
  }

  getSavingsGoals() {
    return this.all('SELECT * FROM savings_goals ORDER BY is_completed ASC, created_at DESC');
  }

  depositSavings(goalId, amount) {
    const goal = this.get('SELECT * FROM savings_goals WHERE id = ?', [goalId]);
    if (!goal) return null;

    this.run('INSERT INTO savings_deposits (goal_id, amount) VALUES (?, ?)', [goalId, amount]);
    const newAmount = goal.current_amount + amount;
    this.run('UPDATE savings_goals SET current_amount = ? WHERE id = ?', [newAmount, goalId]);
    this.scheduleSave();

    const xp = Math.min(25, Math.ceil(amount / 100));
    this.addXP(xp, `Kumbara: ${goal.name}`);

    let completed = false;
    if (newAmount >= goal.target_amount) {
      this.run('UPDATE savings_goals SET is_completed = 1, completed_at = ? WHERE id = ?', [this.getNow(), goalId]);
      this.unlockAchievement('savings_goal_reached');
      this.addLifeCoins(10);
      completed = true;

      const totalCompleted = this.get('SELECT COUNT(*) as c FROM savings_goals WHERE is_completed = 1');
      if (totalCompleted && totalCompleted.c >= 3) this.unlockAchievement('savings_3_goals');
    }

    return { newAmount, xp, completed };
  }

  deleteSavingsGoal(id) {
    this.run('DELETE FROM savings_deposits WHERE goal_id = ?', [id]);
    this.run('DELETE FROM savings_goals WHERE id = ?', [id]);
  }

  // ============ MONTHLY TREND ============
  getMonthlyTrend(months = 12) {
    const result = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const month = d.toISOString().slice(0, 7);
      const row = this.get(
        "SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) as income, COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) as expense FROM transactions WHERE substr(date,1,7) = ?",
        [month]
      );
      result.push({
        month,
        label: d.toLocaleString('tr-TR', { month: 'short' }),
        income: row ? row.income : 0,
        expense: row ? row.expense : 0,
        net: row ? (row.income - row.expense) : 0
      });
    }
    return result;
  }

  // ============ TODAY SUMMARY ============
  getTodaySummary() {
    const today = this.getToday();
    const tx = this.get("SELECT COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) as expense, COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) as income FROM transactions WHERE date = ?", [today]);
    const habits = this.all('SELECT id FROM habits WHERE is_active = 1');
    const completedHabits = this.all('SELECT DISTINCT habit_id FROM habit_completions WHERE date = ?', [today]);
    const xp = this.get("SELECT COALESCE(SUM(amount),0) as total FROM xp_history WHERE substr(date,1,10) = ? AND amount > 0", [today]);
    return {
      todayExpense: tx ? tx.expense : 0,
      todayIncome: tx ? tx.income : 0,
      habitsTotal: habits.length,
      habitsCompleted: completedHabits.length,
      xpEarned: xp ? xp.total : 0
    };
  }

  // ============ MONTH COMPARISON ============
  getMonthComparison() {
    const now = new Date();
    const thisMonth = now.toISOString().slice(0, 7);
    const prev = new Date(now);
    prev.setMonth(prev.getMonth() - 1);
    const lastMonth = prev.toISOString().slice(0, 7);

    const getMonthData = (month) => {
      const totals = this.get(
        "SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) as income, COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) as expense FROM transactions WHERE substr(date,1,7) = ?",
        [month]
      );
      const categories = this.all(
        "SELECT category, SUM(amount) as total FROM transactions WHERE type='expense' AND substr(date,1,7) = ? GROUP BY category ORDER BY total DESC LIMIT 3",
        [month]
      );
      const income = totals ? totals.income : 0;
      const expense = totals ? totals.expense : 0;
      return { income, expense, net: income - expense, savingsRate: income > 0 ? Math.round(((income - expense) / income) * 100) : 0, categories };
    };

    const thisData = getMonthData(thisMonth);
    const lastData = getMonthData(lastMonth);

    const pctChange = (curr, prev) => prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100);

    return {
      thisMonth: { key: thisMonth, ...thisData },
      lastMonth: { key: lastMonth, ...lastData },
      changes: {
        income: pctChange(thisData.income, lastData.income),
        expense: pctChange(thisData.expense, lastData.expense),
        net: pctChange(thisData.net, lastData.net),
        savingsRate: thisData.savingsRate - lastData.savingsRate,
      }
    };
  }

  // ============ REPORT CARD ============
  generateReportCard(periodType, periodKey) {
    const totals = this.get(
      "SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) as income, COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) as expense FROM transactions WHERE substr(date,1,7) = ?",
      [periodKey]
    );
    const income = totals ? totals.income : 0;
    const expense = totals ? totals.expense : 0;

    const topCat = this.get(
      "SELECT category, SUM(amount) as total FROM transactions WHERE type='expense' AND substr(date,1,7) = ? GROUP BY category ORDER BY total DESC LIMIT 1",
      [periodKey]
    );

    const budget = this.getBudget(periodKey);
    let grade = 'C';
    let adherence = null;

    if (budget) {
      const limit = budget.total_income - budget.fixed_expenses - budget.savings_goal;
      adherence = limit > 0 ? Math.round((expense / limit) * 100) : 100;
      if (adherence < 80) grade = 'A';
      else if (adherence <= 100) grade = 'B';
      else if (adherence <= 110) grade = 'C';
      else if (adherence <= 130) grade = 'D';
      else grade = 'F';
    }

    const existing = this.get('SELECT id FROM report_cards WHERE period_key = ?', [periodKey]);
    if (existing) {
      this.run('UPDATE report_cards SET total_spent=?, total_income=?, top_category=?, grade=?, budget_adherence=?, generated_at=? WHERE period_key=?',
        [expense, income, topCat ? topCat.category : null, grade, adherence, this.getNow(), periodKey]);
    } else {
      this.run('INSERT INTO report_cards (period_type, period_key, total_spent, total_income, top_category, grade, budget_adherence) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [periodType, periodKey, expense, income, topCat ? topCat.category : null, grade, adherence]);
    }

    return { periodType, periodKey, totalSpent: expense, totalIncome: income, topCategory: topCat ? topCat.category : null, grade, budgetAdherence: adherence };
  }

  getReportCard(periodType, periodKey) {
    const existing = this.get('SELECT * FROM report_cards WHERE period_key = ?', [periodKey]);
    if (existing) return existing;
    return this.generateReportCard(periodType, periodKey);
  }

  resetAllData() {
    // Bug #4 Fix: Include all new tables in reset
    const tables = ['transactions', 'debts', 'budgets', 'xp_history', 'daily_tasks', 'habit_completions', 'pomodoro_sessions', 'habits', 'recurring_transactions', 'impulse_purchases', 'savings_goals', 'savings_deposits', 'report_cards', 'projects', 'subtasks', 'user_equipment'];
    tables.forEach(t => this.run(`DELETE FROM ${t}`));
    this.run('UPDATE user_stats SET xp = 0, level = 1, current_streak = 0, best_streak = 0, total_tasks_completed = 0, last_active_date = NULL, difficulty_multiplier = 1.0, last_lootbox_level = 0, life_coins = 0, streak_freezes_owned = 0, active_equipment_ids = NULL WHERE id = 1');
    this.run("UPDATE achievements SET unlocked = 0, unlocked_at = NULL");
    this.save();
    this.generateDailyTasks();
  }
}

module.exports = AppDatabase;
