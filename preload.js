const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Window controls
  window: {
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
  },

  // Finance
  finance: {
    addTransaction: (data) => ipcRenderer.invoke('db-add-transaction', data),
    getTransactions: (filters) => ipcRenderer.invoke('db-get-transactions', filters),
    deleteTransaction: (id) => ipcRenderer.invoke('db-delete-transaction', id),
    addDebt: (data) => ipcRenderer.invoke('db-add-debt', data),
    getDebts: () => ipcRenderer.invoke('db-get-debts'),
    updateDebt: (id, data) => ipcRenderer.invoke('db-update-debt', id, data),
    deleteDebt: (id) => ipcRenderer.invoke('db-delete-debt', id),
    getDebtForecast: (id) => ipcRenderer.invoke('db-get-debt-forecast', id),
    setBudget: (data) => ipcRenderer.invoke('db-set-budget', data),
    getBudget: (month) => ipcRenderer.invoke('db-get-budget', month),
    getDailyLimit: () => ipcRenderer.invoke('db-get-daily-limit'),
    addRecurring: (data) => ipcRenderer.invoke('db-add-recurring', data),
    getRecurrings: () => ipcRenderer.invoke('db-get-recurrings'),
    deleteRecurring: (id) => ipcRenderer.invoke('db-delete-recurring', id),
    addImpulse: (data) => ipcRenderer.invoke('db-add-impulse', data),
    getImpulses: () => ipcRenderer.invoke('db-get-impulses'),
    resolveImpulse: (id, confirm) => ipcRenderer.invoke('db-resolve-impulse', id, confirm),
    setCategoryBudget: (month, category, limit) => ipcRenderer.invoke('db-set-category-budget', month, category, limit),
    deleteCategoryBudget: (month, category) => ipcRenderer.invoke('db-delete-category-budget', month, category),
    getCategoryBudgets: (month) => ipcRenderer.invoke('db-get-category-budgets', month),
    getCategorySpending: (month) => ipcRenderer.invoke('db-get-category-spending', month),
    addSubscription: (data) => ipcRenderer.invoke('db-add-subscription', data),
    getSubscriptions: () => ipcRenderer.invoke('db-get-subscriptions'),
    getSubscriptionTotal: () => ipcRenderer.invoke('db-get-subscription-total'),
    getAssets: () => ipcRenderer.invoke('db-get-assets'),
    addAsset: (data) => ipcRenderer.invoke('db-add-asset', data),
    updateAsset: (id, data) => ipcRenderer.invoke('db-update-asset', id, data),
    deleteAsset: (id) => ipcRenderer.invoke('db-delete-asset', id),
    getNetWorth: () => ipcRenderer.invoke('db-get-net-worth'),
    getExpensesByCategory: (month) => ipcRenderer.invoke('db-get-expenses-by-category', month),
  },

  // Savings Goals (Kumbara)
  savings: {
    addGoal: (data) => ipcRenderer.invoke('db-add-savings-goal', data),
    getGoals: () => ipcRenderer.invoke('db-get-savings-goals'),
    deposit: (goalId, amount) => ipcRenderer.invoke('db-deposit-savings', goalId, amount),
    deleteGoal: (id) => ipcRenderer.invoke('db-delete-savings-goal', id),
    getEstimatedCompletion: (goalId) => ipcRenderer.invoke('db-get-estimated-completion', goalId),
    getDepositHistory: (goalId) => ipcRenderer.invoke('db-get-savings-deposit-history', goalId),
  },

  // Projects
  projects: {
    add: (data) => ipcRenderer.invoke('db-add-project', data),
    getAll: () => ipcRenderer.invoke('db-get-projects'),
    update: (id, data) => ipcRenderer.invoke('db-update-project', id, data),
    complete: (id) => ipcRenderer.invoke('db-complete-project', id),
    delete: (id) => ipcRenderer.invoke('db-delete-project', id),
    addSubtask: (data) => ipcRenderer.invoke('db-add-subtask', data),
    toggleSubtask: (id) => ipcRenderer.invoke('db-toggle-subtask', id),
    deleteSubtask: (id) => ipcRenderer.invoke('db-delete-subtask', id),
  },

  // Tasks
  tasks: {
    getDailyTasks: () => ipcRenderer.invoke('db-get-daily-tasks'),
    completeTask: (taskId) => ipcRenderer.invoke('db-complete-task', taskId),
    failTask: (taskId) => ipcRenderer.invoke('db-fail-task', taskId),
    addRecurringTask: (data) => ipcRenderer.invoke('db-add-recurring-task', data),
    getRecurringTasks: () => ipcRenderer.invoke('db-get-recurring-tasks'),
    updateRecurringTask: (id, data) => ipcRenderer.invoke('db-update-recurring-task', id, data),
    deleteRecurringTask: (id) => ipcRenderer.invoke('db-delete-recurring-task', id),
  },

  // XP & Gamification
  xp: {
    getUserStats: () => ipcRenderer.invoke('db-get-user-stats'),
    addXP: (amount, reason) => ipcRenderer.invoke('db-add-xp', amount, reason),
    removeXP: (amount, reason) => ipcRenderer.invoke('db-remove-xp', amount, reason),
    getAchievements: () => ipcRenderer.invoke('db-get-achievements'),
    getAchievementProgress: () => ipcRenderer.invoke('db-get-achievement-progress'),
    checkStreak: () => ipcRenderer.invoke('db-check-streak'),
    getXPHistory: (days) => ipcRenderer.invoke('db-get-xp-history', days),
    checkDailyLogin: () => ipcRenderer.invoke('db-check-daily-login'),
    checkLootBox: () => ipcRenderer.invoke('db-check-lootbox'),
    openLootBox: () => ipcRenderer.invoke('db-open-lootbox'),
    getBossBattle: () => ipcRenderer.invoke('db-get-boss-battle'),
    rollDailyDice: () => ipcRenderer.invoke('db-roll-daily-dice'),
    canRollDice: () => ipcRenderer.invoke('db-can-roll-dice'),
    doPrestige: () => ipcRenderer.invoke('db-do-prestige'),
    getPrestigeInfo: () => ipcRenderer.invoke('db-get-prestige-info'),
  },

  // Habits
  habits: {
    add: (data) => ipcRenderer.invoke('db-add-habit', data),
    update: (id, data) => ipcRenderer.invoke('db-update-habit', id, data),
    getAll: () => ipcRenderer.invoke('db-get-habits'),
    toggle: (habitId, date) => ipcRenderer.invoke('db-toggle-habit', habitId, date),
    delete: (id) => ipcRenderer.invoke('db-delete-habit', id),
    getStats: (id) => ipcRenderer.invoke('db-get-habit-stats', id),
    getHeatmap: (id, months) => ipcRenderer.invoke('db-get-habit-heatmap', id, months),
  },

  // Pomodoro
  pomodoro: {
    save: (data) => ipcRenderer.invoke('db-save-pomodoro', data),
    getStats: () => ipcRenderer.invoke('db-get-pomodoro-stats'),
    getTrend: (days) => ipcRenderer.invoke('db-get-pomodoro-trend', days),
    getByHour: () => ipcRenderer.invoke('db-get-pomodoro-by-hour'),
  },

  // Currency & Crypto
  currency: {
    fetchRates: (forceRefresh = false) => ipcRenderer.invoke('fetch-currency-rates', forceRefresh),
    fetchCrypto: (forceRefresh = false) => ipcRenderer.invoke('fetch-crypto-rates', forceRefresh),
  },

  // Reports & Trends
  reports: {
    getTodaySummary: () => ipcRenderer.invoke('db-get-today-summary'),
    getMonthlyTrend: (months) => ipcRenderer.invoke('db-get-monthly-trend', months),
    getMonthComparison: () => ipcRenderer.invoke('db-get-month-comparison'),
    generateReportCard: (type, key) => ipcRenderer.invoke('db-generate-report-card', type, key),
    getReportCard: (type, key) => ipcRenderer.invoke('db-get-report-card', type, key),
  },

  // Settings
  settings: {
    getAll: () => ipcRenderer.invoke('db-get-settings'),
    set: (key, value) => ipcRenderer.invoke('db-set-setting', key, value),
    resetAllData: () => ipcRenderer.invoke('db-reset-all-data'),
    getAutoLaunch: () => ipcRenderer.invoke('get-auto-launch'),
    setAutoLaunch: (enabled) => ipcRenderer.invoke('set-auto-launch', enabled),
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    installUpdate: () => ipcRenderer.invoke('install-update'),
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  },

  // Shop & LifeCoins
  shop: {
    getItems: () => ipcRenderer.invoke('db-get-shop-items'),
    purchase: (itemKey) => ipcRenderer.invoke('db-purchase-item', itemKey),
    getInventory: () => ipcRenderer.invoke('db-get-inventory'),
    equip: (itemKey) => ipcRenderer.invoke('db-equip-item', itemKey),
    unequip: (itemKey) => ipcRenderer.invoke('db-unequip-item', itemKey),
    getEquipped: () => ipcRenderer.invoke('db-get-equipped-items'),
    getActiveBuffs: () => ipcRenderer.invoke('db-get-active-buffs'),
    addBuff: (type, mult, hours, source, reason) => ipcRenderer.invoke('db-add-buff', type, mult, hours, source, reason),
    getLifeCoins: () => ipcRenderer.invoke('db-get-lifecoins'),
    addLifeCoins: (amount, reason) => ipcRenderer.invoke('db-add-lifecoins', amount, reason),
    getStreakFreezes: () => ipcRenderer.invoke('db-get-streak-freezes'),
    useConsumable: (itemKey) => ipcRenderer.invoke('db-use-consumable', itemKey),
    getCraftingRecipes: () => ipcRenderer.invoke('db-get-crafting-recipes'),
    craftItem: (recipeId) => ipcRenderer.invoke('db-craft-item', recipeId),
  },

  // Challenges
  challenges: {
    getDaily: () => ipcRenderer.invoke('db-get-daily-challenges'),
    updateProgress: (type, value) => ipcRenderer.invoke('db-update-challenge-progress', type, value),
  },

  // Journal
  journal: {
    add: (data) => ipcRenderer.invoke('db-add-journal-entry', data),
    getEntries: (month) => ipcRenderer.invoke('db-get-journal-entries', month),
    getEntry: (date) => ipcRenderer.invoke('db-get-journal-entry', date),
    delete: (date) => ipcRenderer.invoke('db-delete-journal-entry', date),
    getMoodTrend: (days) => ipcRenderer.invoke('db-get-mood-trend', days),
  },

  // Reviews
  reviews: {
    add: (data) => ipcRenderer.invoke('db-add-review', data),
    get: (weekStart) => ipcRenderer.invoke('db-get-review', weekStart),
    getAll: (limit) => ipcRenderer.invoke('db-get-reviews', limit),
  },

  // Export
  export: {
    data: (type) => ipcRenderer.invoke('db-export-data', type),
  },

  // Backup
  backup: {
    export: () => ipcRenderer.invoke('backup-export'),
    import: () => ipcRenderer.invoke('backup-import'),
  },

  // Calendar
  calendar: {
    getMonthSummary: (yearMonth) => ipcRenderer.invoke('db-get-month-summary', yearMonth),
  },

  // AI
  ai: {
    chat: (message, history, context) => ipcRenderer.invoke('ai-chat', { message, history, context }),
    getContext: () => ipcRenderer.invoke('ai-get-context'),
    generateQuest: (context) => ipcRenderer.invoke('ai-generate-quest', context),
  },

  // Dynamic Quests
  dynamicQuests: {
    add: (data) => ipcRenderer.invoke('db-add-dynamic-quest', data),
    getActive: () => ipcRenderer.invoke('db-get-active-dynamic-quests'),
    complete: (id) => ipcRenderer.invoke('db-complete-dynamic-quest', id),
  },

  // Events
  events: {
    onUpdateAvailable: (callback) => {
      ipcRenderer.on('update-available', (_, data) => callback(data));
    },
    onUpdateStatus: (callback) => {
      ipcRenderer.removeAllListeners('update-status');
      ipcRenderer.on('update-status', (_, data) => callback(data));
    },
    onNotification: (callback) => {
      ipcRenderer.on('notification', (_, data) => callback(data));
    },
  },
});
