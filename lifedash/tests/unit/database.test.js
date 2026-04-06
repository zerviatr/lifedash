/**
 * LifeDash — Database Unit Tests
 * Tests all critical business logic in database.js
 */

const { createTestDb, cleanupTestDb } = require('../setup/jest.setup');

let db, tmpDir;

beforeAll(async () => {
  const result = await createTestDb();
  db = result.db;
  tmpDir = result.tmpDir;
});

afterAll(() => {
  if (db && db.db) db.db.close();
  cleanupTestDb(tmpDir);
});

// =============================================
// U1: XP Ekleme ve Kayıt Doğruluğu
// =============================================
describe('U1: addXP — base XP addition', () => {
  test('should add XP and return updated stats', () => {
    const before = db.getUserStats();
    const result = db.addXP(50, 'Test XP');
    expect(result.xp).toBeGreaterThanOrEqual(before.xp + 50);
    expect(result.level).toBeGreaterThanOrEqual(1);
  });

  test('should record XP in xp_history', () => {
    const history = db.all("SELECT * FROM xp_history WHERE reason = 'Test XP' ORDER BY id DESC LIMIT 1");
    expect(history.length).toBe(1);
    expect(history[0].amount).toBeGreaterThanOrEqual(50);
  });
});

// =============================================
// U2: Hafta Sonu XP Çarpanı
// =============================================
describe('U2: addXP — weekend multiplier', () => {
  test('weekend multiplier logic: 1.5x on Sat/Sun, 1.0x on weekdays', () => {
    const day = new Date().getDay();
    const isWeekend = (day === 0 || day === 6);
    
    const before = db.getUserStats();
    const result = db.addXP(100, 'Weekend Test');
    const gained = result.xp - before.xp;
    
    if (isWeekend) {
      expect(gained).toBe(150); // 100 * 1.5
    } else {
      expect(gained).toBe(100); // 100 * 1.0
    }
  });
});

// =============================================
// U3: Ekipman Bonusu (includes kontrolü)
// =============================================
describe('U3: addXP — equipment bonus', () => {
  test('reading_glasses should add 20% bonus for kitap-related XP', () => {
    // Set equipment
    db.run('UPDATE user_stats SET active_equipment_ids = ? WHERE id = 1', ['reading_glasses']);
    
    const before = db.getUserStats();
    const result = db.addXP(100, 'Kitap okuma');
    const gained = result.xp - before.xp;
    
    const day = new Date().getDay();
    const isWeekend = (day === 0 || day === 6);
    const expectedMultiplier = (isWeekend ? 1.5 : 1.0) + 0.2;
    
    expect(gained).toBe(Math.round(100 * expectedMultiplier));
    
    // Clean up
    db.run('UPDATE user_stats SET active_equipment_ids = NULL WHERE id = 1');
  });

  test('multiple equipment: reading_glasses + running_shoes', () => {
    db.run('UPDATE user_stats SET active_equipment_ids = ? WHERE id = 1', ['reading_glasses,running_shoes']);
    
    const before = db.getUserStats();
    const result = db.addXP(100, 'Spor kitap');
    const gained = result.xp - before.xp;
    
    // Both bonuses: kitap (+0.2) + spor (+0.2)
    const day = new Date().getDay();
    const isWeekend = (day === 0 || day === 6);
    const expectedMultiplier = (isWeekend ? 1.5 : 1.0) + 0.2 + 0.2;
    
    expect(gained).toBe(Math.round(100 * expectedMultiplier));
    
    db.run('UPDATE user_stats SET active_equipment_ids = NULL WHERE id = 1');
  });
});

// =============================================
// U4: XP History'ye FinalAmount Yazılması
// =============================================
describe('U4: addXP — xp_history logs finalAmount', () => {
  test('xp_history should record the multiplied amount, not the raw amount', () => {
    const before = db.getUserStats();
    db.addXP(200, 'FinalAmount Test');
    const after = db.getUserStats();
    const gained = after.xp - before.xp;
    
    const historyEntry = db.get("SELECT * FROM xp_history WHERE reason = 'FinalAmount Test' ORDER BY id DESC LIMIT 1");
    expect(historyEntry).not.toBeNull();
    expect(historyEntry.amount).toBe(gained);
  });
});

// =============================================
// U5: Seri Kontrolü (Streak)
// =============================================
describe('U5: checkStreak — streak continuity', () => {
  test('should not break streak if last_active_date is yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    db.run('UPDATE user_stats SET current_streak = 5, last_active_date = ? WHERE id = 1', [yesterdayStr]);
    
    const result = db.checkStreak();
    expect(result.streakBroken).toBe(false);
    expect(result.currentStreak).toBe(5);
  });

  test('should break streak if last_active_date is older than yesterday', () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 3);
    const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];
    
    db.run('UPDATE user_stats SET current_streak = 5, last_active_date = ?, streak_freezes_owned = 0 WHERE id = 1', [twoDaysAgoStr]);
    
    const result = db.checkStreak();
    expect(result.streakBroken).toBe(true);
    expect(result.previousStreak).toBe(5);
  });
});

// =============================================
// U6: Seri Dondurucu (Streak Freeze)
// =============================================
describe('U6: checkStreak — streak freeze usage', () => {
  test('should use streak freeze instead of breaking streak', () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];
    
    db.run('UPDATE user_stats SET current_streak = 10, last_active_date = ?, streak_freezes_owned = 2 WHERE id = 1', [twoDaysAgoStr]);
    
    const result = db.checkStreak();
    expect(result.streakBroken).toBe(false);
    expect(result.freezeUsed).toBe(true);
    
    // Verify freeze count decreased
    const stats = db.getUserStats();
    expect(stats.streak_freezes_owned).toBe(1);
  });
});

// =============================================
// U7: Günlük Limit Hesaplaması
// =============================================
describe('U7: getDailyLimit — basic calculation', () => {
  test('should return hasBudget: false when no budget is set', () => {
    const limit = db.getDailyLimit();
    expect(limit.hasBudget).toBe(false);
  });

  test('should correctly calculate daily limit with budget', () => {
    const today = new Date();
    const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    
    db.setBudget({
      month,
      total_income: 10000,
      fixed_expenses: 3000,
      savings_goal: 1000
    });
    
    const limit = db.getDailyLimit();
    expect(limit.hasBudget).toBe(true);
    expect(limit.dailyLimit).toBeGreaterThan(0);
    expect(limit.totalIncome).toBe(10000);
    expect(limit.totalObligations).toBeGreaterThanOrEqual(4000); // 3000 + 1000 + debts
  });
});

// =============================================
// U8: Çift Gelir Sayımı Olmaması
// =============================================
describe('U8: getDailyLimit — no income double-counting', () => {
  test('adding income transactions should not inflate the daily limit', () => {
    const today = new Date();
    const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const todayStr = db.getToday();
    
    // Set budget
    db.setBudget({
      month,
      total_income: 10000,
      fixed_expenses: 3000,
      savings_goal: 0
    });
    
    const limitBefore = db.getDailyLimit();
    
    // Add income transaction
    db.addTransaction({ type: 'income', amount: 5000, category: 'Maas', date: todayStr });
    
    const limitAfter = db.getDailyLimit();
    
    // Daily limit should NOT increase — income tx is separate from budget.total_income
    expect(limitAfter.monthlyRemaining).toBe(limitBefore.monthlyRemaining);
  });
});

// =============================================
// U9: resetAllData — Tüm Tabloları Sıfırla
// =============================================
describe('U9: resetAllData — full data reset', () => {
  test('should clear all data and reset user stats', () => {
    // Add some data first
    db.addTransaction({ type: 'expense', amount: 100, category: 'Yemek', date: db.getToday() });
    db.addHabit({ name: 'Test Habit', icon: '🏃' });
    
    // Reset
    db.resetAllData();
    
    // Verify user stats reset
    const stats = db.getUserStats();
    expect(stats.xp).toBe(0);
    expect(stats.level).toBe(1);
    expect(stats.current_streak).toBe(0);
    expect(stats.best_streak).toBe(0);
    expect(stats.total_tasks_completed).toBe(0);

    // Verify tables are cleared
    const txCount = db.get('SELECT COUNT(*) as c FROM transactions');
    expect(txCount.c).toBe(0);
    
    const habitCount = db.get('SELECT COUNT(*) as c FROM habits');
    expect(habitCount.c).toBe(0);
    
    const xpCount = db.get('SELECT COUNT(*) as c FROM xp_history');
    expect(xpCount.c).toBe(0);
  });

  test('should regenerate system daily tasks after reset', () => {
    const tasks = db.getDailyTasks();
    const systemTasks = tasks.filter(t => t.is_system === 1);
    expect(systemTasks.length).toBeGreaterThan(0);
  });
});

// =============================================
// U10: getToday / getNow — Yerel Saat
// =============================================
describe('U10: Date helpers — local time', () => {
  test('getToday should return local date format YYYY-MM-DD', () => {
    const today = db.getToday();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    
    const d = new Date();
    const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    expect(today).toBe(expected);
  });

  test('getNow should return local datetime format YYYY-MM-DD HH:MM:SS', () => {
    const now = db.getNow();
    expect(now).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });
});

// =============================================
// U11: completeTask — XP Ödülü
// =============================================
describe('U11: completeTask — XP reward', () => {
  test('completing a task should add XP and update task status', () => {
    // Reset to clean state
    db.resetAllData();
    
    // Add a custom task
    const task = db.addDailyTask({ title: 'Test Task', xp_reward: 25, xp_penalty: 10 });
    
    const statsBefore = db.getUserStats();
    const result = db.completeTask(task.id);
    
    expect(result).not.toBeNull();
    expect(result.xp).toBeGreaterThan(statsBefore.xp);
    
    // Task status should be completed
    const taskRow = db.get('SELECT * FROM daily_tasks WHERE id = ?', [task.id]);
    expect(taskRow.status).toBe('completed');
  });

  test('completing an already completed task should return null', () => {
    const tasks = db.getDailyTasks();
    const completed = tasks.find(t => t.status === 'completed');
    if (completed) {
      const result = db.completeTask(completed.id);
      expect(result).toBeNull();
    }
  });
});

// =============================================
// U12: failTask — XP Cezası ve Zorluk Çarpanı
// =============================================
describe('U12: failTask — XP penalty and difficulty multiplier', () => {
  test('failing a task should remove XP and increase difficulty', () => {
    // Add a task to fail
    const task = db.addDailyTask({ title: 'Fail Test', xp_reward: 20, xp_penalty: 10 });
    
    const statsBefore = db.getUserStats();
    const multBefore = statsBefore.difficulty_multiplier || 1.0;
    
    const result = db.failTask(task.id);
    
    expect(result).not.toBeNull();
    expect(result.difficultyMultiplier).toBeGreaterThan(multBefore);
    
    // Task should be marked as failed
    const taskRow = db.get('SELECT * FROM daily_tasks WHERE id = ?', [task.id]);
    expect(taskRow.status).toBe('failed');
  });
});

// =============================================
// U13: Transaction CRUD
// =============================================
describe('U13: Transactions — add, get, delete', () => {
  test('should add and retrieve a transaction', () => {
    db.resetAllData();
    
    const result = db.addTransaction({
      type: 'expense',
      amount: 42.50,
      category: 'Yemek',
      description: 'Test lunch',
      date: db.getToday()
    });
    
    expect(result.id).toBeGreaterThan(0);
    
    const txns = db.getTransactions({ type: 'expense' });
    expect(txns.length).toBeGreaterThan(0);
    
    const found = txns.find(t => t.description === 'Test lunch');
    expect(found).toBeDefined();
    expect(found.amount).toBe(42.50);
  });

  test('should delete a transaction', () => {
    const txns = db.getTransactions({});
    const count = txns.length;
    
    if (count > 0) {
      db.deleteTransaction(txns[0].id);
      const after = db.getTransactions({});
      expect(after.length).toBe(count - 1);
    }
  });
});
