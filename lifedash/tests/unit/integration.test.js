/**
 * LifeDash — E2E Integration Tests (Electron-native)
 * 
 * These tests run inside Electron's Node runtime and test
 * full user flows by interacting with the database and
 * verifying IPC handler responses.
 * 
 * Run with: npm run test:unit (uses ELECTRON_RUN_AS_NODE)
 */

const { createTestDb, cleanupTestDb } = require('../setup/jest.setup');
const path = require('path');
const fs = require('fs');

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
// E1: IPC Bridge — getUserStats returns correct structure
// =============================================
describe('E1: IPC — getUserStats response structure', () => {
  test('should return all required fields for Dashboard rendering', () => {
    const stats = db.getUserStats();
    
    expect(stats).toHaveProperty('xp');
    expect(stats).toHaveProperty('level');
    expect(stats).toHaveProperty('current_streak');
    expect(stats).toHaveProperty('best_streak');
    expect(stats).toHaveProperty('xpProgress');
    expect(stats).toHaveProperty('xpNeeded');
    expect(stats).toHaveProperty('progressPercent');
    expect(stats).toHaveProperty('financeBadge');
    expect(stats.financeBadge).toHaveProperty('key');
    expect(stats.financeBadge).toHaveProperty('label');
    expect(stats.financeBadge).toHaveProperty('icon');
  });
});

// =============================================
// E2: IPC — getDailyLimit returns valid structure
// =============================================
describe('E2: IPC — getDailyLimit response', () => {
  test('should return hasBudget:false when no budget is set', () => {
    db.resetAllData();
    const limit = db.getDailyLimit();
    expect(limit).toHaveProperty('hasBudget', false);
  });

  test('should return full structure when budget is set', () => {
    const month = db.getToday().slice(0, 7);
    db.setBudget({ month, total_income: 15000, fixed_expenses: 5000, savings_goal: 2000 });
    
    const limit = db.getDailyLimit();
    expect(limit.hasBudget).toBe(true);
    expect(limit).toHaveProperty('dailyLimit');
    expect(limit).toHaveProperty('todaySpent');
    expect(limit).toHaveProperty('todayRemaining');
    expect(limit).toHaveProperty('monthlyRemaining');
    expect(limit).toHaveProperty('daysLeft');
    expect(limit).toHaveProperty('totalIncome');
    expect(limit).toHaveProperty('totalObligations');
    expect(limit.dailyLimit).toBeGreaterThan(0);
    expect(limit.daysLeft).toBeGreaterThan(0);
  });
});

// =============================================
// E3: Full user flow — expense updates budget
// =============================================
describe('E3: User Flow — adding expense updates daily limit', () => {
  test('adding an expense should decrease monthlyRemaining', () => {
    db.resetAllData();
    const month = db.getToday().slice(0, 7);
    db.setBudget({ month, total_income: 10000, fixed_expenses: 3000, savings_goal: 0 });
    
    const limitBefore = db.getDailyLimit();
    
    db.addTransaction({ type: 'expense', amount: 500, category: 'Yemek', date: db.getToday() });
    
    const limitAfter = db.getDailyLimit();
    expect(limitAfter.monthlyRemaining).toBe(limitBefore.monthlyRemaining - 500);
    expect(limitAfter.todaySpent).toBe(500);
  });
});

// =============================================
// E4: Full user flow — task completion gives XP and LifeCoins
// =============================================
describe('E4: User Flow — task completion rewards', () => {
  test('completing task should give XP and LifeCoins', () => {
    db.resetAllData();
    
    const task = db.addDailyTask({ title: 'E2E Test Task', xp_reward: 30, xp_penalty: 15 });
    const statsBefore = db.getUserStats();
    
    db.completeTask(task.id);
    
    const statsAfter = db.getUserStats();
    expect(statsAfter.xp).toBeGreaterThan(statsBefore.xp);
    expect(statsAfter.total_tasks_completed).toBe(statsBefore.total_tasks_completed + 1);
    expect(statsAfter.life_coins).toBeGreaterThan(statsBefore.life_coins);
  });
});

// =============================================
// E5: Full user flow — habit completion cycle
// =============================================
describe('E5: User Flow — habit completion', () => {
  test('should add habit, complete it, and verify streak', () => {
    db.resetAllData();
    
    // Add a habit
    const habit = db.addHabit({ name: 'Test Habit', icon: '🏃', xp_reward: 10 });
    expect(habit.id).toBeGreaterThan(0);
    
    // Get habits — should have one
    const habits = db.getHabits();
    expect(habits.length).toBe(1);
    expect(habits[0].name).toBe('Test Habit');
    expect(habits[0].completedToday).toBeFalsy();
    
    // Complete the habit
    db.toggleHabit(habit.id);
    
    // Verify completion
    const habitsAfter = db.getHabits();
    expect(habitsAfter[0].completedToday).toBeTruthy();
  });
});

// =============================================
// E6: Full user flow — savings goal deposits
// =============================================
describe('E6: User Flow — savings goals', () => {
  test('should create a savings goal and add deposit', () => {
    db.resetAllData();
    
    // Add savings goal
    const goal = db.addSavingsGoal({ name: 'Tatil Fonu', target_amount: 5000, icon: '🏖️', color: '#06b6d4' });
    expect(goal.id).toBeGreaterThan(0);
    
    // Get goals
    const goals = db.getSavingsGoals();
    expect(goals.length).toBe(1);
    expect(goals[0].target_amount).toBe(5000);
    expect(goals[0].current_amount).toBe(0);
    
    // Add deposit
    db.depositSavings(goal.id, 1000);
    
    // Verify
    const goalsAfter = db.getSavingsGoals();
    expect(goalsAfter[0].current_amount).toBe(1000);
  });
});

// =============================================
// E7: Full user flow — achievement unlocking
// =============================================
describe('E7: User Flow — achievements', () => {
  test('first_transaction achievement should unlock when adding a transaction', () => {
    db.resetAllData();
    
    // Before — achievement should be locked
    const achievementsBefore = db.getAchievements();
    const firstTx = achievementsBefore.find(a => a.key === 'first_transaction');
    expect(firstTx.unlocked).toBe(0);
    
    // Add a transaction
    db.addTransaction({ type: 'expense', amount: 10, category: 'Diger', date: db.getToday() });
    
    // After — achievement should be unlocked
    const achievementsAfter = db.getAchievements();
    const firstTxAfter = achievementsAfter.find(a => a.key === 'first_transaction');
    expect(firstTxAfter.unlocked).toBe(1);
  });
});

// =============================================
// E8: IPC — settings read/write roundtrip
// =============================================
describe('E8: IPC — settings persistence', () => {
  test('should read and write settings correctly', () => {
    const settings = db.getSettings();
    expect(settings).toHaveProperty('theme');
    
    // Update a setting
    db.setSetting('theme', 'ocean');
    const updated = db.getSettings();
    expect(updated.theme).toBe('ocean');
    
    // Reset
    db.setSetting('theme', 'default');
  });
});
