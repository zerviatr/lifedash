const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Window controls
  window: {
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
  },

  system: {
    getAutoLaunch: () => ipcRenderer.invoke('get-auto-launch'),
    setAutoLaunch: (enabled) => ipcRenderer.invoke('set-auto-launch', enabled),
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    onUpdateAvailable: (callback) => {
      ipcRenderer.once('update-available', (_, data) => callback(data));
    },
    onNotification: (callback) => {
      ipcRenderer.once('notification', (_, data) => callback(data));
    },
    backupDb: () => ipcRenderer.invoke('system-backup-db')
  },

  finance: {
    addTransaction: (data) => ipcRenderer.invoke('db-add-transaction', data),
    getTransactions: (filters) => ipcRenderer.invoke('db-get-transactions', filters),
    deleteTransaction: (id) => ipcRenderer.invoke('db-delete-transaction', id),
    
    addDebt: (data) => ipcRenderer.invoke('db-add-debt', data),
    getDebts: () => ipcRenderer.invoke('db-get-debts'),
    updateDebt: (id, data) => ipcRenderer.invoke('db-update-debt', id, data),
    deleteDebt: (id) => ipcRenderer.invoke('db-delete-debt', id),
    
    setBudget: (data) => ipcRenderer.invoke('db-set-budget', data),
    getBudget: (month) => ipcRenderer.invoke('db-get-budget', month),
    getDailyLimit: () => ipcRenderer.invoke('db-get-daily-limit'),
    
    fetchCurrencyRates: (forceRefresh = false) => ipcRenderer.invoke('fetch-currency-rates', forceRefresh),
    fetchCryptoRates: (forceRefresh = false) => ipcRenderer.invoke('fetch-crypto-rates', forceRefresh),
    
    addRecurring: (data) => ipcRenderer.invoke('db-add-recurring', data),
    getRecurrings: () => ipcRenderer.invoke('db-get-recurrings'),
    deleteRecurring: (id) => ipcRenderer.invoke('db-delete-recurring', id),
    
    addSavingsGoal: (data) => ipcRenderer.invoke('db-add-savings-goal', data),
    getSavingsGoals: () => ipcRenderer.invoke('db-get-savings-goals'),
    depositSavings: (goalId, amount) => ipcRenderer.invoke('db-deposit-savings', goalId, amount),
    deleteSavingsGoal: (id) => ipcRenderer.invoke('db-delete-savings-goal', id),
    
    getTodaySummary: () => ipcRenderer.invoke('db-get-today-summary'),
    getMonthlyTrend: (months) => ipcRenderer.invoke('db-get-monthly-trend', months),
    getMonthComparison: () => ipcRenderer.invoke('db-get-month-comparison'),
    
    addImpulse: (data) => ipcRenderer.invoke('db-add-impulse', data),
    getImpulses: () => ipcRenderer.invoke('db-get-impulses'),
    resolveImpulse: (id, confirm) => ipcRenderer.invoke('db-resolve-impulse', id, confirm)
  },

  reports: {
    generateReportCard: (type, key) => ipcRenderer.invoke('db-generate-report-card', type, key),
    getReportCard: (type, key) => ipcRenderer.invoke('db-get-report-card', type, key)
  },

  gamification: {
    getUserStats: () => ipcRenderer.invoke('db-get-user-stats'),
    addXP: (amount, reason) => ipcRenderer.invoke('db-add-xp', amount, reason),
    removeXP: (amount, reason) => ipcRenderer.invoke('db-remove-xp', amount, reason),
    getAchievements: () => ipcRenderer.invoke('db-get-achievements'),
    checkStreak: () => ipcRenderer.invoke('db-check-streak'),
    getXPHistory: (days) => ipcRenderer.invoke('db-get-xp-history', days),
    
    checkLootBox: () => ipcRenderer.invoke('db-check-lootbox'),
    openLootBox: () => ipcRenderer.invoke('db-open-lootbox'),
    getBossBattle: () => ipcRenderer.invoke('db-get-boss-battle'),
    buyItem: (type, price, id) => ipcRenderer.invoke('db-buy-item', type, price, id),
    getEquipment: () => ipcRenderer.invoke('db-get-equipment'),
    equipItem: (id) => ipcRenderer.invoke('db-equip-item', id)
  },

  tasks: {
    addDailyTask: (data) => ipcRenderer.invoke('db-add-daily-task', data),
    getDailyTasks: () => ipcRenderer.invoke('db-get-daily-tasks'),
    completeTask: (taskId) => ipcRenderer.invoke('db-complete-task', taskId),
    failTask: (taskId) => ipcRenderer.invoke('db-fail-task', taskId),
    addProject: (data) => ipcRenderer.invoke('db-add-project', data),
    getProjects: () => ipcRenderer.invoke('db-get-projects'),
    updateProject: (id, data) => ipcRenderer.invoke('db-update-project', id, data),
    deleteProject: (id) => ipcRenderer.invoke('db-delete-project', id),
    addSubtask: (data) => ipcRenderer.invoke('db-add-subtask', data),
    toggleSubtask: (id) => ipcRenderer.invoke('db-toggle-subtask', id)
  },

  habits: {
    addHabit: (data) => ipcRenderer.invoke('db-add-habit', data),
    getHabits: () => ipcRenderer.invoke('db-get-habits'),
    toggleHabit: (habitId, date) => ipcRenderer.invoke('db-toggle-habit', habitId, date),
    deleteHabit: (id) => ipcRenderer.invoke('db-delete-habit', id),
    getHabitStats: (id) => ipcRenderer.invoke('db-get-habit-stats', id)
  },

  pomodoro: {
    savePomodoro: (data) => ipcRenderer.invoke('db-save-pomodoro', data),
    getPomodoroStats: () => ipcRenderer.invoke('db-get-pomodoro-stats')
  },

  settings: {
    getSettings: () => ipcRenderer.invoke('db-get-settings'),
    setSetting: (key, value) => ipcRenderer.invoke('db-set-setting', key, value),
    resetAllData: () => ipcRenderer.invoke('db-reset-all-data')
  }
});
