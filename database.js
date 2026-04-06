const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class AppDatabase {
  constructor() {
    this.db = null;
    this.dbPath = null;
  }

  initialize(userDataPath) {
    this.dbPath = path.join(userDataPath, 'lifedash.db');
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.init();
    return this;
  }

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
      `CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        icon TEXT DEFAULT '📁',
        color TEXT DEFAULT '#6366f1',
        status TEXT DEFAULT 'active',
        xp_bonus INTEGER DEFAULT 50,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS subtasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER,
        project_id INTEGER,
        title TEXT NOT NULL,
        is_completed INTEGER DEFAULT 0,
        completed_at DATETIME,
        FOREIGN KEY(project_id) REFERENCES projects(id)
      )`,
      `CREATE TABLE IF NOT EXISTS daily_challenges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        challenge_type TEXT NOT NULL,
        description TEXT NOT NULL,
        target_value INTEGER NOT NULL,
        current_value INTEGER DEFAULT 0,
        reward_xp INTEGER NOT NULL,
        reward_coins INTEGER DEFAULT 0,
        is_completed INTEGER DEFAULT 0,
        UNIQUE(date, challenge_type, description)
      )`,
      `CREATE TABLE IF NOT EXISTS shop_items (
        id INTEGER PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        name TEXT,
        description TEXT,
        icon TEXT,
        type TEXT,
        price_coins INTEGER,
        rarity TEXT DEFAULT 'common',
        data TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS user_inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_key TEXT NOT NULL,
        quantity INTEGER DEFAULT 1,
        equipped INTEGER DEFAULT 0,
        purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS active_buffs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        buff_type TEXT NOT NULL,
        multiplier REAL NOT NULL DEFAULT 1.5,
        expires_at TEXT NOT NULL,
        source TEXT,
        reason TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS category_budgets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        month TEXT NOT NULL,
        category TEXT NOT NULL,
        budget_limit REAL NOT NULL,
        UNIQUE(month, category)
      )`,
      `CREATE TABLE IF NOT EXISTS dynamic_quests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        reward_xp INTEGER NOT NULL,
        reward_coins INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      )`
    ];

    sqls.forEach(sql => this.db.exec(sql));

    // Init user stats
    const stats = this.get('SELECT * FROM user_stats WHERE id = 1');
    if (!stats) {
      this.db.exec('INSERT INTO user_stats (id, xp, level, current_streak, best_streak, total_tasks_completed, difficulty_multiplier, last_lootbox_level) VALUES (1, 0, 1, 0, 0, 0, 1.0, 0)');
    }

    // Migration: add new columns to existing DBs
    try { this.db.exec('ALTER TABLE user_stats ADD COLUMN difficulty_multiplier REAL NOT NULL DEFAULT 1.0'); } catch {}
    try { this.db.exec('ALTER TABLE user_stats ADD COLUMN last_lootbox_level INTEGER NOT NULL DEFAULT 0'); } catch {}
    try { this.db.exec('ALTER TABLE user_stats ADD COLUMN finance_badge TEXT'); } catch {}
    try { this.db.exec('ALTER TABLE user_stats ADD COLUMN lifecoins INTEGER DEFAULT 0'); } catch {}
    try { this.db.exec('ALTER TABLE user_stats ADD COLUMN streak_freezes INTEGER DEFAULT 0'); } catch {}
    try { this.db.exec('ALTER TABLE pomodoro_sessions ADD COLUMN label TEXT'); } catch {}
    try { this.db.exec('ALTER TABLE pomodoro_sessions ADD COLUMN project_id INTEGER'); } catch {}
    try { this.db.exec('ALTER TABLE user_stats ADD COLUMN prestige_level INTEGER DEFAULT 0'); } catch {}
    try { this.db.exec('ALTER TABLE recurring_transactions ADD COLUMN is_subscription INTEGER DEFAULT 0'); } catch {}
    try { this.db.exec('ALTER TABLE recurring_transactions ADD COLUMN service_name TEXT'); } catch {}

    // Create indexes for frequently queried columns
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_habit_comp ON habit_completions(habit_id, date)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_date ON daily_tasks(date, status)',
      'CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(date)',
      'CREATE INDEX IF NOT EXISTS idx_xp_date ON xp_history(date)',
      'CREATE INDEX IF NOT EXISTS idx_savings_deposits ON savings_deposits(goal_id, date)',
    ];
    indexes.forEach(sql => this.db.exec(sql));

    // Recurring tasks table
    this.db.exec(`CREATE TABLE IF NOT EXISTS recurring_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      xp_reward INTEGER DEFAULT 10,
      xp_penalty INTEGER DEFAULT 5,
      recurrence TEXT NOT NULL DEFAULT 'daily',
      days_of_week TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )`);

    // Journal entries table
    this.db.exec(`CREATE TABLE IF NOT EXISTS journal_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT UNIQUE NOT NULL,
      mood INTEGER DEFAULT 3,
      content TEXT,
      tags TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )`);

    // Weekly reviews table
    this.db.exec(`CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_start TEXT UNIQUE NOT NULL,
      wins TEXT,
      challenges TEXT,
      goals_next TEXT,
      rating INTEGER DEFAULT 3,
      auto_stats TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )`);

    // Crafting recipes table
    this.db.exec(`CREATE TABLE IF NOT EXISTS crafting_recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item1_key TEXT NOT NULL,
      item2_key TEXT NOT NULL,
      result_key TEXT NOT NULL,
      coin_cost INTEGER DEFAULT 0
    )`);

    // Assets table (Net Worth Tracker)
    this.db.exec(`CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'other',
      value REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    )`);

    this.initAchievements();
    this.initSettings();
    this.initCraftingRecipes();
    this.generateDailyTasks();
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
      sound_effects: 'true'
    };

    for (const [key, value] of Object.entries(defaults)) {
      const existing = this.get('SELECT 1 FROM settings WHERE key = ?', [key]);
      if (!existing) {
        this.run('INSERT INTO settings (key, value) VALUES (?, ?)', [key, value]);
      }
    }
  }

  getToday() {
    return new Date().toISOString().split('T')[0];
  }

  getNow() {
    return new Date().toISOString().replace('T', ' ').slice(0, 19);
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

      // Generate from recurring tasks
      const recurringTasks = this.all('SELECT * FROM recurring_tasks WHERE is_active = 1');
      const todayDay = new Date().getDay();
      for (const rt of recurringTasks) {
        let shouldAdd = false;
        if (rt.recurrence === 'daily') shouldAdd = true;
        else if (rt.recurrence === 'weekdays') shouldAdd = todayDay >= 1 && todayDay <= 5;
        else if (rt.recurrence === 'weekly' && rt.days_of_week) {
          try { const days = JSON.parse(rt.days_of_week); shouldAdd = days.includes(todayDay); } catch {}
        }
        if (shouldAdd) {
          this.run('INSERT INTO daily_tasks (title, description, xp_reward, xp_penalty, is_system, date) VALUES (?, ?, ?, ?, 0, ?)',
            [rt.title, rt.description || '', rt.xp_reward, rt.xp_penalty, today]);
        }
      }
    }
  }

  // ============ RECURRING TASKS ============
  addRecurringTask(data) {
    const info = this.run(
      'INSERT INTO recurring_tasks (title, description, xp_reward, xp_penalty, recurrence, days_of_week) VALUES (?, ?, ?, ?, ?, ?)',
      [data.title, data.description || '', data.xp_reward || 10, data.xp_penalty || 5, data.recurrence || 'daily', data.days_of_week ? JSON.stringify(data.days_of_week) : null]
    );
    return { id: Number(info.lastInsertRowid) };
  }

  getRecurringTasks() {
    return this.all('SELECT * FROM recurring_tasks WHERE is_active = 1 ORDER BY id ASC');
  }

  updateRecurringTask(id, data) {
    const rt = this.get('SELECT * FROM recurring_tasks WHERE id = ?', [id]);
    if (!rt) return null;
    this.run('UPDATE recurring_tasks SET title=?, description=?, xp_reward=?, xp_penalty=?, recurrence=?, days_of_week=? WHERE id=?',
      [data.title ?? rt.title, data.description ?? rt.description, data.xp_reward ?? rt.xp_reward, data.xp_penalty ?? rt.xp_penalty, data.recurrence ?? rt.recurrence, data.days_of_week ? JSON.stringify(data.days_of_week) : rt.days_of_week, id]);
    return this.get('SELECT * FROM recurring_tasks WHERE id = ?', [id]);
  }

  deleteRecurringTask(id) {
    this.run('UPDATE recurring_tasks SET is_active = 0 WHERE id = ?', [id]);
  }

  // ============ TRANSACTIONS ============
  addTransaction(data) {
    const amount = Number(data.amount);
    if (!amount || amount <= 0) {
      throw new Error('İşlem tutarı geçersiz. (Pozitif olmalıdır)');
    }
    const info = this.run('INSERT INTO transactions (type, amount, category, description, date) VALUES (?, ?, ?, ?, ?)',
      [data.type, amount, data.category, data.description || '', data.date || this.getToday()]);

    this.unlockAchievement('first_transaction');

    // Net savings achievements
    const totals = this.get("SELECT SUM(CASE WHEN type='income' THEN amount ELSE 0 END) - SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as net FROM transactions");
    const net = totals ? (totals.net || 0) : 0;
    if (net >= 1000) this.unlockAchievement('save_1000');
    if (net >= 5000) this.unlockAchievement('save_5000');

    // Budget master check on each expense
    if (data.type === 'expense') this.checkBudgetMasterAchievement();

    return { id: Number(info.lastInsertRowid) };
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
    const info = this.run('INSERT INTO debts (name, total_amount, paid_amount, due_date, monthly_payment, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [data.name, data.total_amount, data.paid_amount || 0, data.due_date || null, data.monthly_payment || 0, data.notes || '']);

    return { id: Number(info.lastInsertRowid) };
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

  // ============ ASSETS (Net Worth) ============
  getAssets() {
    return this.all('SELECT * FROM assets ORDER BY type, name');
  }

  addAsset(data) {
    return this.run('INSERT INTO assets (name, type, value, notes) VALUES (?, ?, ?, ?)',
      [data.name, data.type, data.value, data.notes || null]);
  }

  updateAsset(id, data) {
    return this.run('UPDATE assets SET name=?, type=?, value=?, notes=? WHERE id=?',
      [data.name, data.type, data.value, data.notes || null, id]);
  }

  deleteAsset(id) {
    return this.run('DELETE FROM assets WHERE id=?', [id]);
  }

  getNetWorth() {
    const totalAssets = this.get('SELECT COALESCE(SUM(value), 0) as total FROM assets');
    const totalDebts  = this.get("SELECT COALESCE(SUM(total_amount - paid_amount), 0) as total FROM debts WHERE is_active = 1");
    const assets = this.getAssets();
    return {
      totalAssets: totalAssets.total,
      totalDebts:  totalDebts.total,
      netWorth:    totalAssets.total - totalDebts.total,
      assets
    };
  }

  getExpensesByCategory(month) {
    const m = month || new Date().toISOString().slice(0, 7);
    return this.all(
      "SELECT category, SUM(amount) as total FROM transactions WHERE type='expense' AND substr(date,1,7)=? GROUP BY category ORDER BY total DESC",
      [m]
    );
  }

  getDebtForecast(debtId) {
    const debt = this.get('SELECT * FROM debts WHERE id = ?', [debtId]);
    if (!debt || !debt.is_active) return null;

    const remaining = debt.total_amount - debt.paid_amount;
    if (remaining <= 0) return { months: 0 };

    if (debt.monthly_payment > 0) {
      const months = Math.ceil(remaining / debt.monthly_payment);
      return { months, monthly_payment: debt.monthly_payment, remaining: Math.round(remaining) };
    }

    return { months: null, message: 'Aylık ödeme belirlenmemiş', remaining: Math.round(remaining) };
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
    const currentMonth = today.toISOString().slice(0, 7);
    const budget = this.getBudget(currentMonth);

    if (!budget) return { limit: 0, spent: 0, remaining: 0, daysLeft: 0, hasBudget: false };

    const debts = this.get('SELECT COALESCE(SUM(monthly_payment), 0) as total FROM debts WHERE is_active = 1');
    const spent = this.get("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense' AND substr(date, 1, 7) = ?", [currentMonth]);
    const income = this.get("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'income' AND substr(date, 1, 7) = ?", [currentMonth]);

    const totalIncome = budget.total_income + (income ? income.total : 0);
    const totalObligations = budget.fixed_expenses + (debts ? debts.total : 0) + budget.savings_goal;
    const availableMoney = totalIncome - totalObligations - (spent ? spent.total : 0);

    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const daysLeft = lastDay - today.getDate() + 1;
    const dailyLimit = Math.max(0, availableMoney / daysLeft);

    const todayStr = today.toISOString().split('T')[0];
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

  // ============ CATEGORY BUDGETS ============
  setCategoryBudget(month, category, budgetLimit) {
    const existing = this.get('SELECT 1 FROM category_budgets WHERE month = ? AND category = ?', [month, category]);
    if (existing) {
      this.run('UPDATE category_budgets SET budget_limit = ? WHERE month = ? AND category = ?', [budgetLimit, month, category]);
    } else {
      this.run('INSERT INTO category_budgets (month, category, budget_limit) VALUES (?, ?, ?)', [month, category, budgetLimit]);
    }
  }

  deleteCategoryBudget(month, category) {
    this.run('DELETE FROM category_budgets WHERE month = ? AND category = ?', [month, category]);
  }

  getCategoryBudgets(month) {
    const m = month || new Date().toISOString().slice(0, 7);
    return this.all('SELECT * FROM category_budgets WHERE month = ?', [m]);
  }

  getCategorySpending(month) {
    const m = month || new Date().toISOString().slice(0, 7);
    const budgets = this.getCategoryBudgets(m);
    const spending = this.all(
      "SELECT category, SUM(amount) as total FROM transactions WHERE type = 'expense' AND substr(date, 1, 7) = ? GROUP BY category",
      [m]
    );
    const spendMap = {};
    spending.forEach(s => { spendMap[s.category] = s.total; });

    return budgets.map(b => ({
      category: b.category,
      budget_limit: b.budget_limit,
      spent: spendMap[b.category] || 0,
      remaining: Math.max(0, b.budget_limit - (spendMap[b.category] || 0)),
      percent: Math.min(100, Math.round(((spendMap[b.category] || 0) / b.budget_limit) * 100))
    }));
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

  getXPMultiplier(reason) {
    let multiplier = 1.0;
    // Equipment bonuses
    try {
      const equipped = this.getEquippedItems();
      for (const item of equipped) {
        const data = JSON.parse(item.data || '{}');
        if (!data.bonus_type || !data.bonus_value) continue;
        if (data.bonus_type === 'xp_habit' && reason && reason.includes('Alışkanlık')) multiplier += data.bonus_value;
        else if (data.bonus_type === 'xp_pomodoro' && reason && reason.includes('Pomodoro')) multiplier += data.bonus_value;
        else if (data.bonus_type === 'xp_zero_spend' && reason && reason.includes('0₺')) multiplier += data.bonus_value;
        else if (data.bonus_type === 'streak_bonus') {
          const stats = this.get('SELECT current_streak FROM user_stats WHERE id = 1');
          if (stats && stats.current_streak > 0) multiplier += data.bonus_value;
        }
      }
    } catch {}
    // Active buffs
    try {
      const buffs = this.getActiveBuffs();
      for (const buff of buffs) {
        if (buff.buff_type === 'xp' || buff.buff_type === 'shop_boost') {
          multiplier *= buff.multiplier;
        }
      }
    } catch {}
    // Prestige bonus
    try {
      const prestige = this.get('SELECT prestige_level FROM user_stats WHERE id = 1');
      if (prestige && prestige.prestige_level > 0) {
        multiplier += prestige.prestige_level * 0.05;
      }
    } catch {}
    return multiplier;
  }

  getCoinMultiplier() {
    let multiplier = 1.0;
    try {
      const equipped = this.getEquippedItems();
      for (const item of equipped) {
        const data = JSON.parse(item.data || '{}');
        if (data.bonus_type === 'coin_bonus' && data.bonus_value) multiplier += data.bonus_value;
      }
    } catch {}
    return multiplier;
  }

  addXP(amount, reason) {
    const stats = this.getUserStats();
    const xpMultiplier = this.getXPMultiplier(reason);
    const finalAmount = Math.round(amount * xpMultiplier);
    const newXP = stats.xp + finalAmount;
    let newLevel = stats.level;
    while (newXP >= this.xpForLevel(newLevel + 1)) newLevel++;

    // Award LifeCoins (1 coin per 10 XP) with coin multiplier
    const coinMultiplier = this.getCoinMultiplier();
    const coinsEarned = Math.max(0, Math.floor((finalAmount / 10) * coinMultiplier));
    const currentCoins = stats.lifecoins || 0;

    this.run('UPDATE user_stats SET xp = ?, level = ?, lifecoins = ? WHERE id = 1', [newXP, newLevel, currentCoins + coinsEarned]);
    this.run('INSERT INTO xp_history (amount, reason, date) VALUES (?, ?, ?)', [finalAmount, reason, this.getNow()]);

    if (newLevel >= 5) this.unlockAchievement('level_5');
    if (newLevel >= 10) this.unlockAchievement('level_10');

    return { xp: newXP, level: newLevel, leveledUp: newLevel > stats.level, coinsEarned, xpMultiplier: xpMultiplier > 1 ? xpMultiplier : null };
  }

  removeXP(amount, reason) {
    const stats = this.getUserStats();
    const newXP = Math.max(0, stats.xp - amount);
    let newLevel = 1;
    while (newXP >= this.xpForLevel(newLevel + 1)) newLevel++;

    this.run('UPDATE user_stats SET xp = ?, level = ? WHERE id = 1', [newXP, newLevel]);
    this.run('INSERT INTO xp_history (amount, reason, date) VALUES (?, ?, ?)', [-amount, reason, this.getNow()]);

    return { xp: newXP, level: newLevel };
  }

  getDailyTasks() {
    this.generateDailyTasks();
    return this.all('SELECT * FROM daily_tasks WHERE date = ? ORDER BY id ASC', [this.getToday()]);
  }

  completeTask(taskId) {
    const task = this.get('SELECT * FROM daily_tasks WHERE id = ?', [taskId]);
    if (!task || task.status !== 'pending') return null;

    this.run("UPDATE daily_tasks SET status = 'completed', completed_at = ? WHERE id = ?", [this.getNow(), taskId]);
    const result = this.addXP(task.xp_reward, `Görev tamamlandı: ${task.title}`);
    this.updateStreak(true);
    this.run('UPDATE user_stats SET total_tasks_completed = total_tasks_completed + 1 WHERE id = 1');

    // Reduce difficulty multiplier on success (min 1.0)
    const stats = this.get('SELECT difficulty_multiplier FROM user_stats WHERE id = 1');
    if (stats && stats.difficulty_multiplier > 1.0) {
      const newMult = Math.max(1.0, (stats.difficulty_multiplier || 1.0) * 0.9);
      this.run('UPDATE user_stats SET difficulty_multiplier = ? WHERE id = 1', [Math.round(newMult * 100) / 100]);
    }

    // Combo chain
    const combo = this.updateCombo();
    result.combo = combo;

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
      // Check for streak freeze before breaking
      const freezes = stats.streak_freezes || 0;
      if (freezes > 0 && stats.current_streak > 0) {
        this.run('UPDATE user_stats SET streak_freezes = ? WHERE id = 1', [freezes - 1]);
        return { streakBroken: false, currentStreak: stats.current_streak, freezeUsed: true, freezesRemaining: freezes - 1 };
      }
      this.run('UPDATE user_stats SET current_streak = 0 WHERE id = 1');
      return { streakBroken: true, previousStreak: stats.current_streak };
    }
    return { streakBroken: false, currentStreak: stats ? stats.current_streak : 0 };
  }

  // ============ LIFECOIN & SHOP ============
  getLifeCoins() {
    const stats = this.get('SELECT lifecoins FROM user_stats WHERE id = 1');
    return stats ? stats.lifecoins || 0 : 0;
  }

  addLifeCoins(amount, reason) {
    const current = this.getLifeCoins();
    this.run('UPDATE user_stats SET lifecoins = ? WHERE id = 1', [current + amount]);
    return current + amount;
  }

  spendLifeCoins(amount) {
    const current = this.getLifeCoins();
    if (current < amount) return { success: false, message: 'Yetersiz LifeCoin' };
    this.run('UPDATE user_stats SET lifecoins = ? WHERE id = 1', [current - amount]);
    return { success: true, remaining: current - amount };
  }

  seedShopItems() {
    const existing = this.get('SELECT COUNT(*) as c FROM shop_items');
    if (existing && existing.c > 0) return;

    const items = [
      { key: 'theme_midnight', name: 'Midnight Tema', desc: 'Saf siyah AMOLED tema', icon: '🖤', type: 'theme', price: 200, rarity: 'rare', data: '{"theme":"midnight"}' },
      { key: 'theme_cherry', name: 'Cherry Tema', desc: 'Koyu kirmizi tema', icon: '🍒', type: 'theme', price: 200, rarity: 'rare', data: '{"theme":"cherry"}' },
      { key: 'theme_nordic', name: 'Nordic Tema', desc: 'Soguk mavi-gri tema', icon: '❄️', type: 'theme', price: 200, rarity: 'rare', data: '{"theme":"nordic"}' },
      { key: 'xp_boost_15', name: 'XP Booster x1.5', desc: '24 saat %50 fazla XP', icon: '⚡', type: 'boost', price: 150, rarity: 'rare', data: '{"multiplier":1.5,"hours":24}' },
      { key: 'xp_boost_20', name: 'XP Booster x2.0', desc: '12 saat %100 fazla XP', icon: '🔥', type: 'boost', price: 400, rarity: 'epic', data: '{"multiplier":2.0,"hours":12}' },
      { key: 'streak_freeze', name: 'Seri Dondurucu', desc: 'Seriyi 1 gun korur', icon: '🧊', type: 'consumable', price: 500, rarity: 'epic', data: '{"freezes":1}' },
      { key: 'extra_challenge', name: 'Ekstra Challenge', desc: 'Bugun 1 ekstra challenge', icon: '🎲', type: 'consumable', price: 50, rarity: 'common', data: '{}' },
      { key: 'lucky_dice', name: 'Sansli Zar', desc: 'Loot box sansi +%50', icon: '🎰', type: 'consumable', price: 150, rarity: 'rare', data: '{}' },
      { key: 'gold_frame', name: 'Altin Cerceve', desc: 'Profil kartinda altin border', icon: '🏅', type: 'frame', price: 500, rarity: 'epic', data: '{"frame":"gold"}' },
      { key: 'neon_frame', name: 'Neon Cerceve', desc: 'Profil kartinda neon glow', icon: '💎', type: 'frame', price: 300, rarity: 'rare', data: '{"frame":"neon"}' },
      { key: 'reading_glasses', name: 'Okuma Gozlugu', desc: 'Kitap aliskanligindan +%10 XP', icon: '📖', type: 'equipment', price: 250, rarity: 'rare', data: '{"slot":"accessory","bonus_type":"xp_habit","bonus_value":0.10}' },
      { key: 'gold_shield', name: 'Altin Kalkani', desc: 'Streak bonusu +%15', icon: '🛡️', type: 'equipment', price: 600, rarity: 'epic', data: '{"slot":"accessory","bonus_type":"streak_bonus","bonus_value":0.15}' },
      { key: 'focus_spoon', name: 'Odak Kasigi', desc: 'Pomodoro XP +%10', icon: '🥄', type: 'equipment', price: 200, rarity: 'rare', data: '{"slot":"tool","bonus_type":"xp_pomodoro","bonus_value":0.10}' },
      { key: 'thrifty_wallet', name: 'Cimri Cuzdan', desc: '0TL harcama gunu +%20 XP', icon: '👛', type: 'equipment', price: 300, rarity: 'rare', data: '{"slot":"accessory","bonus_type":"xp_zero_spend","bonus_value":0.20}' },
      { key: 'coin_magnet', name: 'Coin Miknatisi', desc: 'Tum coin kazanimlari +%25', icon: '🧲', type: 'equipment', price: 1000, rarity: 'legendary', data: '{"slot":"tool","bonus_type":"coin_bonus","bonus_value":0.25}' },
      { key: 'xp_potions_3', name: 'Deneyim Iksirleri (3lu)', desc: '3 adet kucuk XP boost (1 saat, x1.25)', icon: '🧪', type: 'consumable', price: 75, rarity: 'common', data: '{"multiplier":1.25,"hours":1,"quantity":3}' },
      { key: 'boss_armor', name: 'Boss Zirhi', desc: 'Sonraki boss battleda %25 avantaj', icon: '⚔️', type: 'consumable', price: 400, rarity: 'epic', data: '{}' },
      { key: 'impulse_speed', name: 'Durtu Hizlandirici', desc: 'Impulse bekleme 24s → 12s', icon: '⏰', type: 'consumable', price: 100, rarity: 'rare', data: '{}' },
    ];

    for (const item of items) {
      this.run(
        'INSERT OR IGNORE INTO shop_items (key, name, description, icon, type, price_coins, rarity, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [item.key, item.name, item.desc, item.icon, item.type, item.price, item.rarity, item.data]
      );
    }
  }

  getShopItems() {
    this.seedShopItems();
    return this.all('SELECT * FROM shop_items ORDER BY type, price_coins ASC');
  }

  purchaseItem(itemKey) {
    const item = this.get('SELECT * FROM shop_items WHERE key = ?', [itemKey]);
    if (!item) return { success: false, message: 'Urun bulunamadi' };

    const currentCoins = this.getLifeCoins();
    if (currentCoins < item.price_coins) return { success: false, message: 'Yetersiz LifeCoin' };

    try {
      this.db.transaction(() => {
        this.run('UPDATE user_stats SET lifecoins = ? WHERE id = 1', [currentCoins - item.price_coins]);
        
        const existing = this.get('SELECT * FROM user_inventory WHERE item_key = ?', [itemKey]);
        if (existing) {
          this.run('UPDATE user_inventory SET quantity = quantity + 1 WHERE item_key = ?', [itemKey]);
        } else {
          this.run('INSERT INTO user_inventory (item_key, quantity) VALUES (?, 1)', [itemKey]);
        }
      })();
      return { success: true, item, remaining: currentCoins - item.price_coins };
    } catch (e) {
      return { success: false, message: 'İşlem başarısız: ' + e.message };
    }
  }

  getInventory() {
    return this.all(
      'SELECT ui.*, si.name, si.description, si.icon, si.type, si.rarity, si.data FROM user_inventory ui JOIN shop_items si ON ui.item_key = si.key ORDER BY si.type, ui.purchased_at DESC'
    );
  }

  equipItem(itemKey) {
    const item = this.get('SELECT * FROM shop_items WHERE key = ?', [itemKey]);
    if (!item) return false;
    const data = JSON.parse(item.data || '{}');
    // Unequip same slot first
    if (data.slot) {
      const equipped = this.getInventory().filter(i => i.equipped && JSON.parse(i.data || '{}').slot === data.slot);
      equipped.forEach(e => this.run('UPDATE user_inventory SET equipped = 0 WHERE item_key = ?', [e.item_key]));
    }
    this.run('UPDATE user_inventory SET equipped = 1 WHERE item_key = ?', [itemKey]);
    return true;
  }

  unequipItem(itemKey) {
    this.run('UPDATE user_inventory SET equipped = 0 WHERE item_key = ?', [itemKey]);
    return true;
  }

  getEquippedItems() {
    return this.all(
      'SELECT ui.*, si.name, si.description, si.icon, si.type, si.rarity, si.data FROM user_inventory ui JOIN shop_items si ON ui.item_key = si.key WHERE ui.equipped = 1'
    );
  }

  // ============ ACTIVE BUFFS ============
  getActiveBuffs() {
    const now = this.getNow();
    // Clean expired buffs
    this.run('DELETE FROM active_buffs WHERE expires_at < ?', [now]);
    return this.all('SELECT * FROM active_buffs ORDER BY multiplier DESC');
  }

  addBuff(type, multiplier, hours, source, reason) {
    const expires = new Date(Date.now() + hours * 3600000).toISOString();
    this.run('INSERT INTO active_buffs (buff_type, multiplier, expires_at, source, reason) VALUES (?, ?, ?, ?, ?)',
      [type, multiplier, expires, source || '', reason || '']);
  }

  // ============ STREAK FREEZE ============
  getStreakFreezes() {
    const stats = this.get('SELECT streak_freezes FROM user_stats WHERE id = 1');
    return stats ? stats.streak_freezes || 0 : 0;
  }

  addStreakFreeze(count) {
    const current = this.getStreakFreezes();
    this.run('UPDATE user_stats SET streak_freezes = ? WHERE id = 1', [current + count]);
  }

  useConsumable(itemKey) {
    const inv = this.get('SELECT * FROM user_inventory WHERE item_key = ?', [itemKey]);
    if (!inv || inv.quantity <= 0) return { success: false, message: 'Envanterde yok' };
    const item = this.get('SELECT * FROM shop_items WHERE key = ?', [itemKey]);
    if (!item) return { success: false, message: 'Ürün bulunamadı' };
    const data = JSON.parse(item.data || '{}');

    let result = { success: true, item: item.name, effect: '' };

    switch (itemKey) {
      case 'streak_freeze':
        this.addStreakFreeze(data.freezes || 1);
        result.effect = `+${data.freezes || 1} seri dondurucu eklendi`;
        break;
      case 'xp_potions_3':
        this.addBuff('xp', data.multiplier || 1.25, data.hours || 1, 'consumable', 'XP İksiri');
        result.effect = `x${data.multiplier || 1.25} XP çarpanı ${data.hours || 1} saat aktif`;
        break;
      case 'boss_armor':
        this.setSetting('boss_armor_active', 'true');
        result.effect = 'Sonraki boss battle\'da %25 avantaj';
        break;
      case 'impulse_speed':
        this.setSetting('impulse_speed_12h', 'true');
        result.effect = 'Dürtü bekleme süresi 12 saate düştü';
        break;
      case 'extra_challenge': {
        const today = this.getToday();
        const pool = [
          { desc: 'Bonus: 1 pomodoro tamamla', target: 1, xp: 15, coins: 5 },
          { desc: 'Bonus: 2 görev tamamla', target: 2, xp: 15, coins: 5 },
          { desc: 'Bonus: 1 alışkanlık işle', target: 1, xp: 10, coins: 3 },
        ];
        const ch = pool[Math.floor(Math.random() * pool.length)];
        try {
          this.run('INSERT INTO daily_challenges (date, challenge_type, description, target_value, reward_xp, reward_coins) VALUES (?, ?, ?, ?, ?, ?)',
            [today, 'bonus', ch.desc, ch.target, ch.xp, ch.coins]);
        } catch {}
        result.effect = `Bonus challenge eklendi: ${ch.desc}`;
        break;
      }
      case 'lucky_dice': {
        const xpReward = Math.floor(Math.random() * 91) + 10;
        const coinReward = Math.floor(Math.random() * 46) + 5;
        this.addXP(xpReward, 'Şanslı Zar');
        this.addLifeCoins(coinReward, 'Şanslı Zar');
        result.effect = `+${xpReward} XP ve +${coinReward} coin kazandın!`;
        result.xp = xpReward;
        result.coins = coinReward;
        break;
      }
      default:
        return { success: false, message: 'Bilinmeyen consumable' };
    }

    // Decrease quantity
    if (inv.quantity <= 1) {
      this.run('DELETE FROM user_inventory WHERE item_key = ?', [itemKey]);
    } else {
      this.run('UPDATE user_inventory SET quantity = quantity - 1 WHERE item_key = ?', [itemKey]);
    }

    return result;
  }

  useStreakFreeze() {
    const current = this.getStreakFreezes();
    if (current <= 0) return false;
    this.run('UPDATE user_stats SET streak_freezes = ? WHERE id = 1', [current - 1]);
    return true;
  }

  // ============ PROJECTS & SUBTASKS ============
  addProject(data) {
    const info = this.run(
      'INSERT INTO projects (name, description, icon, color, xp_bonus) VALUES (?, ?, ?, ?, ?)',
      [data.name, data.description || '', data.icon || '📁', data.color || '#6366f1', data.xp_bonus || 50]
    );
    return { id: Number(info.lastInsertRowid) };
  }

  getProjects() {
    const projects = this.all("SELECT * FROM projects WHERE status != 'archived' ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'completed' THEN 1 END, created_at DESC");
    return projects.map(p => {
      const subtasks = this.all('SELECT * FROM subtasks WHERE project_id = ? ORDER BY id ASC', [p.id]);
      const completedCount = subtasks.filter(s => s.is_completed).length;
      return {
        ...p,
        subtasks,
        subtaskCount: subtasks.length,
        completedCount,
        progress: subtasks.length > 0 ? Math.round((completedCount / subtasks.length) * 100) : 0
      };
    });
  }

  updateProject(id, data) {
    const project = this.get('SELECT * FROM projects WHERE id = ?', [id]);
    if (!project) return null;
    this.run('UPDATE projects SET name=?, description=?, icon=?, color=?, xp_bonus=? WHERE id = ?',
      [data.name ?? project.name, data.description ?? project.description, data.icon ?? project.icon,
       data.color ?? project.color, data.xp_bonus ?? project.xp_bonus, id]);
    return this.get('SELECT * FROM projects WHERE id = ?', [id]);
  }

  completeProject(id) {
    const project = this.get('SELECT * FROM projects WHERE id = ?', [id]);
    if (!project) return null;
    this.run("UPDATE projects SET status = 'completed' WHERE id = ?", [id]);
    const xp = project.xp_bonus || 50;
    this.addXP(xp, `Proje tamamlandı: ${project.name}`);
    return { xp };
  }

  deleteProject(id) {
    this.run('DELETE FROM subtasks WHERE project_id = ?', [id]);
    this.run('DELETE FROM projects WHERE id = ?', [id]);
  }

  addSubtask(data) {
    const info = this.run(
      'INSERT INTO subtasks (project_id, task_id, title) VALUES (?, ?, ?)',
      [data.project_id || null, data.task_id || null, data.title]
    );
    return { id: Number(info.lastInsertRowid) };
  }

  toggleSubtask(subtaskId) {
    const st = this.get('SELECT * FROM subtasks WHERE id = ?', [subtaskId]);
    if (!st) return null;
    const newState = st.is_completed ? 0 : 1;
    this.run('UPDATE subtasks SET is_completed = ?, completed_at = ? WHERE id = ?',
      [newState, newState ? this.getNow() : null, subtaskId]);
    return { is_completed: newState };
  }

  deleteSubtask(id) {
    this.run('DELETE FROM subtasks WHERE id = ?', [id]);
  }

  getAchievements() {
    return this.all('SELECT * FROM achievements ORDER BY unlocked DESC, xp_reward ASC');
  }

  getAchievementProgress() {
    const achievements = this.getAchievements();
    const stats = this.getUserStats();
    const progressMap = {};

    for (const a of achievements) {
      if (a.unlocked) { progressMap[a.key] = { current: 1, target: 1, percent: 100 }; continue; }

      let current = 0, target = 1;
      switch (a.key) {
        case 'level_5': current = stats.level; target = 5; break;
        case 'level_10': current = stats.level; target = 10; break;
        case 'streak_7': current = stats.current_streak; target = 7; break;
        case 'streak_30': current = stats.current_streak; target = 30; break;
        case 'tasks_10': current = stats.total_tasks_completed; target = 10; break;
        case 'tasks_50': current = stats.total_tasks_completed; target = 50; break;
        case 'tasks_100': current = stats.total_tasks_completed; target = 100; break;
        case 'pomodoro_10': {
          const pom = this.get("SELECT COUNT(*) as c FROM pomodoro_sessions WHERE type='work' AND completed=1");
          current = pom ? pom.c : 0; target = 10; break;
        }
        case 'pomodoro_50': {
          const pom = this.get("SELECT COUNT(*) as c FROM pomodoro_sessions WHERE type='work' AND completed=1");
          current = pom ? pom.c : 0; target = 50; break;
        }
        default: current = 0; target = 1;
      }
      progressMap[a.key] = { current: Math.min(current, target), target, percent: Math.min(100, Math.round((current / target) * 100)) };
    }
    return progressMap;
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
    const info = this.run('INSERT INTO habits (name, icon, color, xp_reward) VALUES (?, ?, ?, ?)',
      [data.name, data.icon || '✓', data.color || '#6366f1', data.xp_reward || 5]);

    return { id: Number(info.lastInsertRowid) };
  }

  updateHabit(id, data) {
    const habit = this.get('SELECT * FROM habits WHERE id = ?', [id]);
    if (!habit) return null;
    this.run('UPDATE habits SET name=?, icon=?, color=?, xp_reward=? WHERE id=?',
      [data.name ?? habit.name, data.icon ?? habit.icon, data.color ?? habit.color, data.xp_reward ?? habit.xp_reward, id]);
    return this.get('SELECT * FROM habits WHERE id = ?', [id]);
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
      if (habit) this.addXP(habit.xp_reward, `Alışkanlık: ${habit.name}`);
      this.checkAllHabits7Achievement(d);
      const combo = this.updateCombo();
      return { completed: true, combo };
    }
  }

  deleteHabit(id) {
    this.run('UPDATE habits SET is_active = 0 WHERE id = ?', [id]);
  }

  // ============ POMODORO ============
  savePomodoro(data) {
    const info = this.run('INSERT INTO pomodoro_sessions (duration, type, completed, date, label, project_id) VALUES (?, ?, ?, ?, ?, ?)',
      [data.duration, data.type, data.completed ? 1 : 0, this.getNow(), data.label || null, data.project_id || null]);

    let combo = null;
    if (data.completed && data.type === 'work') {
      this.addXP(10, 'Pomodoro tamamlandı');
      const count = this.get("SELECT COUNT(*) as c FROM pomodoro_sessions WHERE type = 'work' AND completed = 1");
      if (count && count.c >= 10) this.unlockAchievement('pomodoro_10');
      if (count && count.c >= 50) this.unlockAchievement('pomodoro_50');
      combo = this.updateCombo();
    }

    return { id: Number(info.lastInsertRowid), combo };
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

  getPomodoroTrend(days = 7) {
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const row = this.get(
        "SELECT COUNT(*) as count, COALESCE(SUM(duration), 0) as totalMinutes FROM pomodoro_sessions WHERE type = 'work' AND completed = 1 AND substr(date, 1, 10) = ?",
        [dateStr]
      );
      result.push({ date: dateStr, count: row ? row.count : 0, totalMinutes: row ? row.totalMinutes : 0 });
    }
    return result;
  }

  getPomodoroByHour() {
    const rows = this.all(
      "SELECT CAST(substr(date, 12, 2) AS INTEGER) as hour, COUNT(*) as count FROM pomodoro_sessions WHERE type = 'work' AND completed = 1 GROUP BY hour ORDER BY hour ASC"
    );
    const hours = new Array(24).fill(0);
    rows.forEach(r => { hours[r.hour] = r.count; });
    return hours;
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
      { type: 'xp', amount: 200, label: '+200 Mega XP', icon: '🌟' },
      { type: 'coins', amount: 30, label: '+30 LifeCoin', icon: '🪙' },
      { type: 'coins', amount: 75, label: '+75 LifeCoin', icon: '💰' },
      { type: 'streak_shield', amount: 1, label: 'Seri Kalkanı (1 gün koruma)', icon: '🛡️' },
      { type: 'difficulty_reset', amount: 1, label: 'Zorluk Sıfırlama', icon: '🔄' },
    ];

    const reward = rewards[Math.floor(Math.random() * rewards.length)];

    // Apply reward
    if (reward.type === 'xp') {
      this.addXP(reward.amount, `Loot Box: ${reward.label}`);
    } else if (reward.type === 'coins') {
      this.addLifeCoins(reward.amount, `Loot Box: ${reward.label}`);
    } else if (reward.type === 'streak_shield') {
      this.addStreakFreeze(reward.amount);
    } else if (reward.type === 'difficulty_reset') {
      this.run('UPDATE user_stats SET difficulty_multiplier = 1.0 WHERE id = 1');
    }

    return reward;
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

      let status = 'future';
      if (isToday) status = 'today';
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

    // Auto-claim boss reward once per week
    let rewardClaimed = false;
    const mondayStr = monday.toISOString().split('T')[0];
    const lastRewardWeek = this.get("SELECT value FROM settings WHERE key = 'boss_reward_week'");
    if (bossDefeated && (!lastRewardWeek || lastRewardWeek.value !== mondayStr)) {
      this.addXP(100, 'Haftalık Boss yenildi!');
      this.addLifeCoins(25, 'Boss ödülü');
      this.setSetting('boss_reward_week', mondayStr);
      rewardClaimed = true;
    }

    return {
      days,
      successDays,
      bossDefeated,
      reward: bossDefeated ? 100 : 0,
      rewardClaimed,
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

  // ============ DAILY LOGIN REWARD ============
  checkDailyLogin() {
    const today = this.getToday();
    const lastLogin = this.get("SELECT value FROM settings WHERE key = 'last_login_date'");
    if (lastLogin && lastLogin.value === today) return null; // Already claimed today

    const loginStreak = this.get("SELECT value FROM settings WHERE key = 'login_streak'");
    const lastDate = lastLogin ? lastLogin.value : null;
    let streak = loginStreak ? parseInt(loginStreak.value) || 0 : 0;

    // Check if consecutive
    if (lastDate) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      streak = (lastDate === yesterdayStr) ? streak + 1 : 1;
    } else {
      streak = 1;
    }

    // 7-day cycle rewards
    const xpRewards = [5, 10, 15, 20, 25, 35, 50];
    const coinRewards = [2, 3, 5, 5, 8, 12, 25];
    const dayIndex = ((streak - 1) % 7);
    const xp = xpRewards[dayIndex];
    const coins = coinRewards[dayIndex];

    this.addXP(xp, 'Günlük giriş ödülü');
    this.addLifeCoins(coins, 'Günlük giriş ödülü');
    this.setSetting('last_login_date', today);
    this.setSetting('login_streak', String(streak));

    return { streak, dayInCycle: dayIndex + 1, xp, coins, isDay7: dayIndex === 6 };
  }

  // ============ COMBO CHAIN ============
  updateCombo() {
    const now = Date.now();
    const lastComboTime = this.get("SELECT value FROM settings WHERE key = 'last_combo_time'");
    const comboCount = this.get("SELECT value FROM settings WHERE key = 'combo_count'");

    let count = comboCount ? parseInt(comboCount.value) || 0 : 0;
    const lastTime = lastComboTime ? parseInt(lastComboTime.value) || 0 : 0;

    // 5 minute window
    if (now - lastTime < 5 * 60 * 1000 && lastTime > 0) {
      count++;
    } else {
      count = 1;
    }

    this.setSetting('last_combo_time', String(now));
    this.setSetting('combo_count', String(count));

    // Award bonuses at thresholds
    let bonus = null;
    if (count === 3) {
      this.addXP(5, 'Combo x3!');
      bonus = { count, xp: 5, coins: 0 };
    } else if (count === 5) {
      this.addXP(15, 'Combo x5!');
      this.addLifeCoins(3, 'Combo x5');
      bonus = { count, xp: 15, coins: 3 };
    } else if (count === 10) {
      this.addXP(50, 'Combo x10! MEGA!');
      this.addLifeCoins(10, 'Combo x10');
      bonus = { count, xp: 50, coins: 10 };
    } else if (count > 10 && count % 5 === 0) {
      this.addXP(25, `Combo x${count}!`);
      this.addLifeCoins(5, `Combo x${count}`);
      bonus = { count, xp: 25, coins: 5 };
    }

    return { count, bonus };
  }

  // ============ JOURNAL ============
  addJournalEntry(data) {
    const today = data.date || this.getToday();
    const existing = this.get('SELECT id FROM journal_entries WHERE date = ?', [today]);
    if (existing) {
      this.run('UPDATE journal_entries SET mood=?, content=?, tags=?, updated_at=? WHERE date=?',
        [data.mood || 3, data.content || '', data.tags ? JSON.stringify(data.tags) : '[]', this.getNow(), today]);
      return { id: existing.id, updated: true };
    }
    const info = this.run('INSERT INTO journal_entries (date, mood, content, tags) VALUES (?, ?, ?, ?)',
      [today, data.mood || 3, data.content || '', data.tags ? JSON.stringify(data.tags) : '[]']);
    this.addXP(5, 'Günlük yazıldı');
    return { id: Number(info.lastInsertRowid), updated: false };
  }

  getJournalEntries(month) {
    if (month) {
      return this.all('SELECT * FROM journal_entries WHERE substr(date,1,7) = ? ORDER BY date DESC', [month]);
    }
    return this.all('SELECT * FROM journal_entries ORDER BY date DESC LIMIT 30');
  }

  getJournalEntry(date) {
    return this.get('SELECT * FROM journal_entries WHERE date = ?', [date]);
  }

  deleteJournalEntry(date) {
    this.run('DELETE FROM journal_entries WHERE date = ?', [date]);
  }

  getMoodTrend(days = 30) {
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const entry = this.get('SELECT mood FROM journal_entries WHERE date = ?', [dateStr]);
      result.push({ date: dateStr, mood: entry ? entry.mood : null });
    }
    return result;
  }

  // ============ WEEKLY REVIEW ============
  addReview(data) {
    const existing = this.get('SELECT id FROM reviews WHERE week_start = ?', [data.week_start]);
    // Auto stats
    const weekEnd = new Date(data.week_start);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekEndStr = weekEnd.toISOString().split('T')[0];
    const xpRow = this.get("SELECT COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END),0) as total FROM xp_history WHERE substr(date,1,10) >= ? AND substr(date,1,10) <= ?", [data.week_start, weekEndStr]);
    const taskRow = this.get("SELECT COUNT(*) as total, SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed FROM daily_tasks WHERE date >= ? AND date <= ?", [data.week_start, weekEndStr]);
    const pomRow = this.get("SELECT COUNT(*) as c FROM pomodoro_sessions WHERE type='work' AND completed=1 AND substr(date,1,10) >= ? AND substr(date,1,10) <= ?", [data.week_start, weekEndStr]);
    const spentRow = this.get("SELECT COALESCE(SUM(amount),0) as s FROM transactions WHERE type='expense' AND date >= ? AND date <= ?", [data.week_start, weekEndStr]);

    const autoStats = JSON.stringify({
      xpEarned: xpRow ? xpRow.total : 0,
      tasksTotal: taskRow ? taskRow.total : 0,
      tasksCompleted: taskRow ? taskRow.completed : 0,
      pomodoros: pomRow ? pomRow.c : 0,
      totalSpent: spentRow ? spentRow.s : 0
    });

    if (existing) {
      this.run('UPDATE reviews SET wins=?, challenges=?, goals_next=?, rating=?, auto_stats=? WHERE week_start=?',
        [JSON.stringify(data.wins || []), JSON.stringify(data.challenges || []), JSON.stringify(data.goals_next || []), data.rating || 3, autoStats, data.week_start]);
      return { id: existing.id, updated: true };
    }
    const info = this.run('INSERT INTO reviews (week_start, wins, challenges, goals_next, rating, auto_stats) VALUES (?, ?, ?, ?, ?, ?)',
      [data.week_start, JSON.stringify(data.wins || []), JSON.stringify(data.challenges || []), JSON.stringify(data.goals_next || []), data.rating || 3, autoStats]);
    this.addXP(15, 'Haftalık değerlendirme yapıldı');
    return { id: Number(info.lastInsertRowid), updated: false };
  }

  getReview(weekStart) {
    return this.get('SELECT * FROM reviews WHERE week_start = ?', [weekStart]);
  }

  getReviews(limit = 10) {
    return this.all('SELECT * FROM reviews ORDER BY week_start DESC LIMIT ?', [limit]);
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

  getHabitHeatmap(habitId, months = 3) {
    const rows = this.all(
      `SELECT date FROM habit_completions WHERE habit_id = ? AND date >= date('now', '-${months} months') ORDER BY date ASC`,
      [habitId]
    );
    const completedSet = new Set(rows.map(r => r.date));
    const days = [];
    const start = new Date();
    start.setMonth(start.getMonth() - months);
    start.setDate(start.getDate() + 1);
    const end = new Date();
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      days.push({ date: dateStr, completed: completedSet.has(dateStr), dayOfWeek: d.getDay() });
    }
    return days;
  }

  // ============ RECURRING TRANSACTIONS ============
  addRecurring(data) {
    const info = this.run(
      'INSERT INTO recurring_transactions (type, amount, category, description, period, day_of_month, day_of_week) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [data.type, data.amount, data.category, data.description || '', data.period, data.day_of_month != null ? data.day_of_month : null, data.day_of_week != null ? data.day_of_week : null]
    );

    return { id: Number(info.lastInsertRowid) };
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
        if (r.day_of_week == null) continue;
        if (!r.last_processed) {
          shouldProcess = today.getDay() === r.day_of_week;
        } else {
          const daysSince = Math.floor((today - new Date(r.last_processed)) / 86400000);
          if (daysSince >= 7 && today.getDay() === r.day_of_week) shouldProcess = true;
        }
      }

      if (shouldProcess) {
        this.run(
          'INSERT INTO transactions (type, amount, category, description, date) VALUES (?, ?, ?, ?, ?)',
          [r.type, r.amount, r.category, r.description || '', todayStr]
        );
        this.run('UPDATE recurring_transactions SET last_processed = ? WHERE id = ?', [todayStr, r.id]);
    
      }
    }
  }

  // ============ DAILY CHALLENGES ============
  generateDailyChallenges() {
    const today = this.getToday();
    const existing = this.all('SELECT * FROM daily_challenges WHERE date = ? AND challenge_type = ?', [today, 'daily']);
    if (existing.length >= 3) return existing;

    const pool = [
      { desc: 'Bugün 3 görev tamamla', target: 3, xp: 15, coins: 5 },
      { desc: '1 pomodoro tamamla', target: 1, xp: 10, coins: 3 },
      { desc: 'Bugün 0₺ harca', target: 0, xp: 20, coins: 10 },
      { desc: '1 alışkanlık işle', target: 1, xp: 10, coins: 3 },
      { desc: '2 pomodoro tamamla', target: 2, xp: 20, coins: 7 },
      { desc: 'Bugün 2 görev tamamla', target: 2, xp: 10, coins: 3 },
    ];

    // Pick 3 random unique challenges
    const shuffled = pool.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 3);

    for (const ch of selected) {
      try {
        this.run(
          'INSERT OR IGNORE INTO daily_challenges (date, challenge_type, description, target_value, reward_xp, reward_coins) VALUES (?, ?, ?, ?, ?, ?)',
          [today, 'daily', ch.desc, ch.target, ch.xp, ch.coins]
        );
      } catch {}
    }

    return this.getDailyChallenges();
  }

  getDailyChallenges() {
    const today = this.getToday();
    this.generateDailyChallenges();
    return this.all('SELECT * FROM daily_challenges WHERE date = ? ORDER BY id ASC', [today]);
  }

  updateChallengeProgress(type, value) {
    const today = this.getToday();
    const challenges = this.all('SELECT * FROM daily_challenges WHERE date = ? AND is_completed = 0', [today]);

    for (const ch of challenges) {
      let shouldUpdate = false;
      let newValue = ch.current_value;

      if (type === 'task_complete' && ch.description.includes('görev tamamla')) {
        newValue = ch.current_value + value;
        shouldUpdate = true;
      } else if (type === 'pomodoro_complete' && ch.description.includes('pomodoro tamamla')) {
        newValue = ch.current_value + value;
        shouldUpdate = true;
      } else if (type === 'habit_toggle' && ch.description.includes('alışkanlık işle')) {
        newValue = ch.current_value + value;
        shouldUpdate = true;
      } else if (type === 'zero_spend' && ch.description.includes('0₺ harca')) {
        // Check at end of day — for now, mark progress as 1 if no spending yet
        const spent = this.get("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense' AND date = ?", [today]);
        newValue = (!spent || spent.total === 0) ? 1 : 0;
        shouldUpdate = true;
      }

      if (shouldUpdate) {
        this.run('UPDATE daily_challenges SET current_value = ? WHERE id = ?', [newValue, ch.id]);
        if (newValue >= ch.target_value) {
          this.run('UPDATE daily_challenges SET is_completed = 1 WHERE id = ?', [ch.id]);
          this.addXP(ch.reward_xp, `Challenge: ${ch.description}`);
          if (ch.reward_coins && ch.reward_coins > 0) {
            this.addLifeCoins(ch.reward_coins, `Challenge: ${ch.description}`);
          }
        }
      }
    }
  }

  // ============ SUBSCRIPTIONS ============
  addSubscription(data) {
    const info = this.run(
      'INSERT INTO recurring_transactions (type, amount, category, description, period, day_of_month, is_subscription, service_name) VALUES (?, ?, ?, ?, ?, ?, 1, ?)',
      ['expense', data.amount, data.category || 'abonelik', data.description || '', data.period || 'monthly', data.day_of_month || 1, data.service_name || '']
    );
    return { id: Number(info.lastInsertRowid) };
  }

  getSubscriptions() {
    return this.all('SELECT * FROM recurring_transactions WHERE is_active = 1 AND is_subscription = 1 ORDER BY amount DESC');
  }

  getSubscriptionTotal() {
    const result = this.get('SELECT COALESCE(SUM(amount), 0) as monthly, COALESCE(SUM(amount) * 12, 0) as yearly FROM recurring_transactions WHERE is_active = 1 AND is_subscription = 1');
    return result || { monthly: 0, yearly: 0 };
  }

  // ============ IMPULSE PURCHASES ============
  addImpulse(data) {
    const info = this.run('INSERT INTO impulse_purchases (amount, category, description, impulse_date) VALUES (?, ?, ?, ?)',
      [data.amount, data.category, data.description || '', this.getToday()]);

    return { id: Number(info.lastInsertRowid) };
  }

  getImpulses() {
    return this.all('SELECT * FROM impulse_purchases WHERE resolved = 0 ORDER BY created_at ASC');
  }

  resolveImpulse(id, shouldConfirm) {
    const impulse = this.get('SELECT * FROM impulse_purchases WHERE id = ?', [id]);
    if (!impulse) return null;

    this.run('UPDATE impulse_purchases SET resolved = ?, resolved_date = ? WHERE id = ?',
      [shouldConfirm ? 1 : 2, this.getToday(), id]);

    if (shouldConfirm) {
      this.run('INSERT INTO transactions (type, amount, category, description, date) VALUES (?, ?, ?, ?, ?)',
        ['expense', impulse.amount, impulse.category, impulse.description || '', this.getToday()]);
  
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
    const info = this.run('INSERT INTO savings_goals (name, target_amount, icon, color) VALUES (?, ?, ?, ?)',
      [data.name, data.target_amount, data.icon || '🎯', data.color || '#6366f1']);

    this.addXP(5, 'Yeni tasarruf hedefi oluşturuldu');
    return { id: Number(info.lastInsertRowid) };
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


    const xp = Math.min(25, Math.ceil(amount / 100));
    this.addXP(xp, `Kumbara: ${goal.name}`);

    let completed = false;
    if (newAmount >= goal.target_amount) {
      this.run('UPDATE savings_goals SET is_completed = 1, completed_at = ? WHERE id = ?', [this.getNow(), goalId]);
      this.unlockAchievement('savings_goal_reached');
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

  getEstimatedCompletion(goalId) {
    const goal = this.get('SELECT * FROM savings_goals WHERE id = ?', [goalId]);
    if (!goal || goal.is_completed) return null;

    const remaining = goal.target_amount - goal.current_amount;
    if (remaining <= 0) return { months: 0 };

    // Calculate average monthly deposit from last 6 months
    const deposits = this.all(
      "SELECT substr(date, 1, 7) as month, SUM(amount) as total FROM savings_deposits WHERE goal_id = ? GROUP BY substr(date, 1, 7) ORDER BY month DESC LIMIT 6",
      [goalId]
    );

    if (deposits.length === 0) return { months: null, message: 'Henüz yatırım yok' };

    const avgMonthly = deposits.reduce((s, d) => s + d.total, 0) / deposits.length;
    if (avgMonthly <= 0) return { months: null, message: 'Ortalama yatırım 0' };

    const months = Math.ceil(remaining / avgMonthly);
    return { months, avgMonthly: Math.round(avgMonthly), remaining: Math.round(remaining) };
  }

  getSavingsDepositHistory(goalId) {
    return this.all(
      "SELECT substr(date, 1, 7) as month, SUM(amount) as total FROM savings_deposits WHERE goal_id = ? GROUP BY substr(date, 1, 7) ORDER BY month DESC LIMIT 6",
      [goalId]
    );
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

  // ============ DATA EXPORT ============
  exportData(type) {
    switch (type) {
      case 'transactions': {
        const rows = this.all('SELECT * FROM transactions ORDER BY date DESC');
        const header = 'Tarih,Tur,Kategori,Tutar,Aciklama';
        const csv = rows.map(r => `${r.date},${r.type},${r.category},${r.amount},"${(r.description || '').replace(/"/g, '""')}"`);
        return { format: 'csv', filename: 'islemler.csv', content: header + '\n' + csv.join('\n') };
      }
      case 'habits': {
        const habits = this.all('SELECT * FROM habits WHERE is_active = 1');
        const completions = this.all("SELECT hc.*, h.name as habit_name FROM habit_completions hc JOIN habits h ON hc.habit_id = h.id ORDER BY hc.date DESC");
        const header = 'Tarih,Aliskanlik,Tamamlandi';
        const csv = completions.map(c => `${c.date},"${c.habit_name}",Evet`);
        return { format: 'csv', filename: 'aliskanliklar.csv', content: header + '\n' + csv.join('\n') };
      }
      case 'pomodoro': {
        const rows = this.all("SELECT * FROM pomodoro_sessions WHERE type = 'work' AND completed = 1 ORDER BY date DESC");
        const header = 'Tarih,Sure(dk),Etiket';
        const csv = rows.map(r => `${r.date},${r.duration},"${r.label || ''}"`);
        return { format: 'csv', filename: 'pomodoro.csv', content: header + '\n' + csv.join('\n') };
      }
      case 'all': {
        const data = {
          transactions: this.all('SELECT * FROM transactions ORDER BY date DESC'),
          debts: this.all('SELECT * FROM debts'),
          habits: this.all('SELECT * FROM habits'),
          habit_completions: this.all('SELECT * FROM habit_completions'),
          pomodoro_sessions: this.all('SELECT * FROM pomodoro_sessions'),
          user_stats: this.get('SELECT * FROM user_stats WHERE id = 1'),
          achievements: this.all('SELECT * FROM achievements'),
          xp_history: this.all('SELECT * FROM xp_history ORDER BY date DESC LIMIT 500'),
          journal_entries: this.all('SELECT * FROM journal_entries ORDER BY date DESC'),
          savings_goals: this.all('SELECT * FROM savings_goals'),
          projects: this.all('SELECT * FROM projects'),
        };
        return { format: 'json', filename: 'lifedash-data.json', content: JSON.stringify(data, null, 2) };
      }
      default:
        return null;
    }
  }

  // ============ CALENDAR ============
  getMonthSummary(yearMonth) {
    // Get all days data for a given month (YYYY-MM)
    const days = {};
    const [year, month] = yearMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${yearMonth}-${String(d).padStart(2, '0')}`;
      const taskRow = this.get("SELECT COUNT(*) as total, SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed FROM daily_tasks WHERE date = ?", [dateStr]);
      const habitRow = this.get("SELECT COUNT(DISTINCT hc.habit_id) as done FROM habit_completions hc WHERE hc.date = ?", [dateStr]);
      const expenseRow = this.get("SELECT COALESCE(SUM(amount),0) as s FROM transactions WHERE type='expense' AND date = ?", [dateStr]);
      const incomeRow = this.get("SELECT COALESCE(SUM(amount),0) as s FROM transactions WHERE type='income' AND date = ?", [dateStr]);
      const pomRow = this.get("SELECT COUNT(*) as c FROM pomodoro_sessions WHERE type='work' AND completed=1 AND substr(date,1,10) = ?", [dateStr]);
      const xpRow = this.get("SELECT COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END),0) as total FROM xp_history WHERE substr(date,1,10) = ?", [dateStr]);
      const journalRow = this.get("SELECT mood FROM journal_entries WHERE date = ?", [dateStr]);

      const tasksTotal = taskRow ? taskRow.total : 0;
      const tasksCompleted = taskRow ? (taskRow.completed || 0) : 0;
      const habitsCompleted = habitRow ? habitRow.done : 0;
      const expense = expenseRow ? expenseRow.s : 0;
      const income = incomeRow ? incomeRow.s : 0;
      const pomodoros = pomRow ? pomRow.c : 0;
      const xpEarned = xpRow ? xpRow.total : 0;
      const mood = journalRow ? journalRow.mood : null;

      const hasData = tasksTotal > 0 || habitsCompleted > 0 || expense > 0 || income > 0 || pomodoros > 0 || xpEarned > 0;

      if (hasData || mood) {
        // Score: 0-100 based on task completion, habits, and spending discipline
        let score = 0;
        if (tasksTotal > 0) score += (tasksCompleted / tasksTotal) * 40;
        if (habitsCompleted > 0) score += Math.min(habitsCompleted * 10, 30);
        if (pomodoros > 0) score += Math.min(pomodoros * 5, 20);
        if (xpEarned > 0) score += 10;

        days[dateStr] = {
          tasksTotal, tasksCompleted, habitsCompleted, expense, income, pomodoros, xpEarned, mood,
          score: Math.min(100, Math.round(score))
        };
      }
    }
    return days;
  }

  // ============ DAILY DICE ============
  rollDailyDice() {
    const today = this.getToday();
    const lastDice = this.get("SELECT value FROM settings WHERE key = 'last_dice_date'");
    if (lastDice && lastDice.value === today) return { already_rolled: true };

    this.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('last_dice_date', ?)", [today]);

    // Weighted random rewards
    const roll = Math.random();
    let reward;
    if (roll < 0.35) {
      // Common: 10-30 XP
      const xp = 10 + Math.floor(Math.random() * 21);
      this.addXP(xp, 'Günlük zar atışı');
      reward = { type: 'xp', amount: xp, icon: '⚡', label: `+${xp} XP` };
    } else if (roll < 0.6) {
      // Common: 5-20 coins
      const coins = 5 + Math.floor(Math.random() * 16);
      this.addLifeCoins(coins, 'Günlük zar atışı');
      reward = { type: 'coins', amount: coins, icon: '🪙', label: `+${coins} Coin` };
    } else if (roll < 0.8) {
      // Uncommon: 40-70 XP
      const xp = 40 + Math.floor(Math.random() * 31);
      this.addXP(xp, 'Günlük zar atışı (şanslı!)');
      reward = { type: 'xp', amount: xp, icon: '🌟', label: `+${xp} XP (Şanslı!)` };
    } else if (roll < 0.92) {
      // Rare: 30-50 coins
      const coins = 30 + Math.floor(Math.random() * 21);
      this.addLifeCoins(coins, 'Günlük zar atışı (nadir!)');
      reward = { type: 'coins', amount: coins, icon: '💰', label: `+${coins} Coin (Nadir!)` };
    } else if (roll < 0.97) {
      // Epic: streak freeze
      this.run('UPDATE user_stats SET streak_freezes = streak_freezes + 1 WHERE id = 1');
      reward = { type: 'streak_freeze', amount: 1, icon: '❄️', label: 'Seri Dondurucu!' };
    } else {
      // Legendary: 80-100 XP + 40-50 coins
      const xp = 80 + Math.floor(Math.random() * 21);
      const coins = 40 + Math.floor(Math.random() * 11);
      this.addXP(xp, 'Günlük zar atışı (EFSANEVİ!)');
      this.addLifeCoins(coins, 'Günlük zar atışı (EFSANEVİ!)');
      reward = { type: 'legendary', amount: xp, icon: '👑', label: `+${xp} XP & +${coins} Coin (EFSANEVİ!)` };
    }
    return { rolled: true, reward };
  }

  canRollDice() {
    const today = this.getToday();
    const lastDice = this.get("SELECT value FROM settings WHERE key = 'last_dice_date'");
    return !lastDice || lastDice.value !== today;
  }

  // ============ PRESTIGE ============
  doPrestige() {
    const stats = this.getUserStats();
    if (stats.level < 25) return { success: false, message: 'Prestige için Level 25 gerekli!' };

    const newPrestige = (stats.prestige_level || 0) + 1;
    this.run('UPDATE user_stats SET level = 1, xp = 0, prestige_level = ?, difficulty_multiplier = 1.0 WHERE id = 1', [newPrestige]);

    // Reset daily tasks and streaks but keep achievements & inventory
    this.run("DELETE FROM xp_history");
    this.run("DELETE FROM daily_tasks");
    this.generateDailyTasks();

    this.addLifeCoins(50 * newPrestige, `Prestige ${newPrestige} ödülü`);

    return {
      success: true,
      prestige_level: newPrestige,
      permanent_bonus: newPrestige * 5,
      coins_reward: 50 * newPrestige
    };
  }

  getPrestigeInfo() {
    const stats = this.getUserStats();
    return {
      current_level: stats.level,
      prestige_level: stats.prestige_level || 0,
      can_prestige: stats.level >= 25,
      permanent_bonus: (stats.prestige_level || 0) * 5,
      next_bonus: ((stats.prestige_level || 0) + 1) * 5
    };
  }

  // ============ CRAFTING ============
  initCraftingRecipes() {
    const recipes = [
      ['reading_glasses', 'focus_spoon', 'master_scholar', 15],
      ['xp_potions_3', 'xp_potions_3', 'mega_xp_potion', 20],
      ['streak_freeze_pack', 'boss_armor', 'guardian_shield', 25],
      ['lucky_dice', 'lucky_dice', 'fortune_amulet', 30],
    ];
    for (const [i1, i2, result, cost] of recipes) {
      const existing = this.get('SELECT 1 FROM crafting_recipes WHERE item1_key = ? AND item2_key = ?', [i1, i2]);
      if (!existing) {
        this.run('INSERT INTO crafting_recipes (item1_key, item2_key, result_key, coin_cost) VALUES (?, ?, ?, ?)', [i1, i2, result, cost]);
      }
    }

    // Add crafted items to shop_items if not exists
    const craftedItems = [
      ['master_scholar', 'Master Scholar', 'Tüm XP kaynakları +15% bonus', '🎓', 'equipment', 0, 'epic', '{"bonus_type":"xp_all","bonus_value":0.15}'],
      ['mega_xp_potion', 'Mega XP İksiri', 'x1.5 XP çarpanı 3 saat boyunca', '🧪', 'consumable', 0, 'epic', '{"buff_type":"xp","multiplier":1.5,"hours":3}'],
      ['guardian_shield', 'Koruyucu Kalkan', 'Seri koruması + Boss zırhı aktif', '🛡️', 'equipment', 0, 'legendary', '{"bonus_type":"streak_bonus","bonus_value":0.1}'],
      ['fortune_amulet', 'Şans Muskası', 'Coin kazancı +25%', '🍀', 'equipment', 0, 'legendary', '{"bonus_type":"coin_bonus","bonus_value":0.25}'],
    ];
    for (const [key, name, desc, icon, type, price, rarity, data] of craftedItems) {
      const existing = this.get('SELECT 1 FROM shop_items WHERE key = ?', [key]);
      if (!existing) {
        this.run('INSERT INTO shop_items (key, name, description, icon, type, price_coins, rarity, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [key, name, desc, icon, type, price, rarity, data]);
      }
    }
  }

  getCraftingRecipes() {
    const recipes = this.all('SELECT * FROM crafting_recipes');
    const inventory = this.all('SELECT item_key, quantity FROM user_inventory');
    const invMap = {};
    inventory.forEach(i => invMap[i.item_key] = i.quantity);

    return recipes.map(r => {
      const item1 = this.get('SELECT * FROM shop_items WHERE key = ?', [r.item1_key]);
      const item2 = this.get('SELECT * FROM shop_items WHERE key = ?', [r.item2_key]);
      const result = this.get('SELECT * FROM shop_items WHERE key = ?', [r.result_key]);
      const hasItem1 = (invMap[r.item1_key] || 0) >= (r.item1_key === r.item2_key ? 2 : 1);
      const hasItem2 = r.item1_key === r.item2_key ? hasItem1 : (invMap[r.item2_key] || 0) >= 1;
      const stats = this.getUserStats();
      const hasCoins = (stats.lifecoins || 0) >= r.coin_cost;
      return {
        ...r,
        item1, item2, result,
        canCraft: hasItem1 && hasItem2 && hasCoins,
        hasItem1, hasItem2, hasCoins
      };
    });
  }

  craftItem(recipeId) {
    const recipe = this.get('SELECT * FROM crafting_recipes WHERE id = ?', [recipeId]);
    if (!recipe) return { success: false, message: 'Tarif bulunamadı!' };

    // Pre-check outside transaction to avoid unnecessary locks
    const inv1 = this.get('SELECT * FROM user_inventory WHERE item_key = ?', [recipe.item1_key]);
    const needed1 = recipe.item1_key === recipe.item2_key ? 2 : 1;
    if (!inv1 || inv1.quantity < needed1) return { success: false, message: 'Yeterli malzeme yok!' };
    
    let inv2 = null;
    if (recipe.item1_key !== recipe.item2_key) {
      inv2 = this.get('SELECT * FROM user_inventory WHERE item_key = ?', [recipe.item2_key]);
      if (!inv2 || inv2.quantity < 1) return { success: false, message: 'Yeterli malzeme yok!' };
    }

    const stats = this.getUserStats();
    if ((stats.lifecoins || 0) < recipe.coin_cost) return { success: false, message: 'Yeterli coin yok!' };

    try {
      this.db.transaction(() => {
        // Re-fetch to ensure atomicity
        if (recipe.item1_key !== recipe.item2_key) {
           const currentInv2 = this.get('SELECT * FROM user_inventory WHERE item_key = ?', [recipe.item2_key]);
           if (currentInv2.quantity <= 1) this.run('DELETE FROM user_inventory WHERE item_key = ?', [recipe.item2_key]);
           else this.run('UPDATE user_inventory SET quantity = quantity - 1 WHERE item_key = ?', [recipe.item2_key]);
        }
        
        const currentInv1 = this.get('SELECT * FROM user_inventory WHERE item_key = ?', [recipe.item1_key]);
        if (currentInv1.quantity <= needed1) this.run('DELETE FROM user_inventory WHERE item_key = ?', [recipe.item1_key]);
        else this.run('UPDATE user_inventory SET quantity = quantity - ? WHERE item_key = ?', [needed1, recipe.item1_key]);

        this.run('UPDATE user_stats SET lifecoins = lifecoins - ? WHERE id = 1', [recipe.coin_cost]);

        const existing = this.get('SELECT * FROM user_inventory WHERE item_key = ?', [recipe.result_key]);
        if (existing) {
          this.run('UPDATE user_inventory SET quantity = quantity + 1 WHERE item_key = ?', [recipe.result_key]);
        } else {
          this.run('INSERT INTO user_inventory (item_key, quantity) VALUES (?, 1)', [recipe.result_key]);
        }
      })();
      
      const resultItem = this.get('SELECT * FROM shop_items WHERE key = ?', [recipe.result_key]);
      return { success: true, item: resultItem };
    } catch (e) {
      return { success: false, message: 'Craft işlemi başarısız: ' + e.message };
    }
  }

  resetAllData() {
    const tables = [
      'transactions', 'debts', 'budgets', 'xp_history', 'daily_tasks',
      'habit_completions', 'pomodoro_sessions', 'habits', 'recurring_transactions',
      'impulse_purchases', 'savings_goals', 'savings_deposits', 'report_cards',
      'active_buffs', 'user_inventory', 'category_budgets', 'journal_entries',
      'projects', 'subtasks', 'recurring_tasks', 'reviews', 'daily_challenges',
      'dynamic_quests'
    ];
    tables.forEach(t => this.db.exec(`DELETE FROM ${t}`));
    this.run('UPDATE user_stats SET xp = 0, level = 1, current_streak = 0, best_streak = 0, total_tasks_completed = 0, last_active_date = NULL, difficulty_multiplier = 1.0, last_lootbox_level = 0, lifecoins = 0 WHERE id = 1');
    this.run("UPDATE achievements SET unlocked = 0, unlocked_at = NULL");
    this.generateDailyTasks();
  }

  // ============ DYNAMIC QUESTS (AI DUNGEON MASTER) ============
  addDynamicQuest(data) {
    return this.run('INSERT INTO dynamic_quests (title, description, reward_xp, reward_coins) VALUES (?, ?, ?, ?)',
      [data.title, data.description, data.reward_xp, data.reward_coins]);
  }

  getActiveDynamicQuests() {
    return this.all("SELECT * FROM dynamic_quests WHERE status = 'active' ORDER BY created_at DESC");
  }

  completeDynamicQuest(id) {
    const quest = this.get("SELECT * FROM dynamic_quests WHERE id = ? AND status = 'active'", [id]);
    if (!quest) return { success: false, message: 'Görev bulunamadı veya zaten tamamlandı.' };

    try {
      this.db.transaction(() => {
        this.run("UPDATE dynamic_quests SET status = 'completed' WHERE id = ?", [id]);
        this.run('UPDATE user_stats SET xp = xp + ?, lifecoins = lifecoins + ? WHERE id = 1', [quest.reward_xp, quest.reward_coins]);
      })();

      // Level check
      let newLevel = this.getUserStats().level;
      let newXP = this.getUserStats().xp;
      while (newXP >= this.xpForLevel(newLevel + 1)) newLevel++;
      if (newLevel > this.getUserStats().level) {
          this.run('UPDATE user_stats SET level = ? WHERE id = 1', [newLevel]);
      }

      return { success: true, xp: quest.reward_xp, coins: quest.reward_coins, newLevel, levelChanged: newLevel > this.getUserStats().level };
    } catch(e) {
      return { success: false, message: e.message };
    }
  }
}

module.exports = AppDatabase;
