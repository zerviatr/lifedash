// ============ DASHBOARD PAGE ============
const DashboardPage = {
  widgetDefaults: {
    xp_bar: { label: 'XP Bar', visible: true },
    quick_stats: { label: 'Hizli Istatistikler', visible: true },
    quick_actions: { label: 'Hizli Islemler', visible: true },
    challenges: { label: 'Gunun Gorevleri', visible: true },
    kumbara: { label: 'Kumbara', visible: true },
    daily_dice: { label: 'Gunluk Zar', visible: true },
    today_summary: { label: 'Bugunun Ozeti', visible: true },
    weekly_xp: { label: 'Haftalik XP', visible: true },
    boss_battle: { label: 'Boss Battle', visible: true },
    currency: { label: 'Anlik Kurlar', visible: true },
  },

  async getWidgetConfig() {
    try {
      const settings = await api.settings.getAll();
      if (settings.dashboard_widgets) return JSON.parse(settings.dashboard_widgets);
    } catch {}
    return this.widgetDefaults;
  },

  async saveWidgetConfig(config) {
    await api.settings.set('dashboard_widgets', JSON.stringify(config));
  },

  showConfigPanel: false,

  async render(container) {
    container.innerHTML = Skeleton.dashboard();

    const [stats, dailyLimit, tasks, pomodoroStats, bossBattle, lootCheck, savingsGoals, todaySummary, xpHistory, challenges, canRollDice] = await Promise.all([
      api.xp.getUserStats(),
      api.finance.getDailyLimit(),
      api.tasks.getDailyTasks(),
      api.pomodoro.getStats(),
      api.xp.getBossBattle(),
      api.xp.checkLootBox(),
      api.savings.getGoals(),
      api.reports.getTodaySummary(),
      api.xp.getXPHistory(7),
      api.challenges.getDaily(),
      api.xp.canRollDice()
    ]);

    App.userStats = stats;
    App.updateTitleBar();
    App.updateStreak();

    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const totalTasks = tasks.length;
    const title = getLevelTitle(stats.level);
    const wc = await this.getWidgetConfig();
    const isVisible = (key) => wc[key] ? wc[key].visible !== false : true;

    container.innerHTML = `
      <div class="page-header" style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
          <h1 class="page-title">Dashboard</h1>
          <p class="page-subtitle">Hos geldin! Bugunun ozeti asagida.</p>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="DashboardPage.toggleWidgetConfig()" title="Widget Ayarlari" style="font-size:16px;">${icon('settings', 14)}</button>
      </div>

      <!-- Widget Config Panel -->
      <div id="widget-config-panel" style="display:${this.showConfigPanel ? 'block' : 'none'}; margin-bottom:16px;">
        <div class="card" style="border:1px solid var(--accent)30;">
          <div class="card-title">Widget Gorunurlugu</div>
          <div style="display:flex; flex-wrap:wrap; gap:8px;">
            ${Object.entries(wc).map(([key, w]) => `
              <label style="display:flex; align-items:center; gap:6px; padding:6px 10px; background:var(--bg-input); border-radius:var(--radius-sm); cursor:pointer; font-size:13px;">
                <input type="checkbox" ${w.visible !== false ? 'checked' : ''} onchange="DashboardPage.toggleWidget('${key}', this.checked)">
                ${w.label}
              </label>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- XP Bar -->
      ${isVisible('xp_bar') ? `<div class="xp-bar-container">
        <div class="xp-level">
          <div>Lv.${stats.level}</div>
          <div style="font-size:12px; color:var(--text-muted);">${title}</div>
        </div>
        <div class="xp-info">
          <div class="xp-text">
            <span>${stats.xpProgress} / ${stats.xpNeeded} XP</span>
            <span>Sonraki seviye: Lv.${stats.level + 1}</span>
          </div>
          <div class="xp-bar">
            <div class="xp-fill" style="width: ${stats.progressPercent}%"></div>
          </div>
        </div>
        <div class="xp-stats">
          <div>Seri: <span>🔥 ${stats.current_streak}</span></div>
          <div>En iyi: <span>${stats.best_streak}</span></div>
          <div>Zorluk: <span class="${(stats.difficulty_multiplier || 1) > 1 ? 'text-danger' : 'text-success'}">x${(stats.difficulty_multiplier || 1).toFixed(1)}</span></div>
        </div>
        ${lootCheck.available ? `
          <button class="btn btn-primary btn-sm" onclick="DashboardPage.openLootBox()" style="animation: lootPulse 2s infinite;">🎁 Loot Box!</button>
        ` : ''}
      </div>` : ''}

      <!-- Quick Stats -->
      ${isVisible('quick_stats') ? `<div class="grid-4 mb-16">
        <div class="card daily-limit-widget">
          <div class="daily-limit-label">Bugunku Limitin</div>
          <div class="daily-limit-amount" id="dash-daily-limit">${dailyLimit.hasBudget ? formatMoney(dailyLimit.dailyLimit) : '—'}</div>
          <div class="daily-limit-sub" id="dash-limit-sub">${dailyLimit.hasBudget ? `Harcanan: <span id="dash-today-spent">${formatMoney(dailyLimit.todaySpent)}</span> • Kalan: <span id="dash-today-remaining">${formatMoney(dailyLimit.todayRemaining)}</span>` : `<a href="#" onclick="App.navigateTo('finance'); setTimeout(() => FinancePage.switchTab('budget'), 100); return false;" style="color:var(--accent); cursor:pointer;">Butce ayarla →</a>`}</div>
        </div>

        <div class="card" style="text-align:center;">
          <div class="card-title">Gorevler</div>
          <div class="card-value ${completedTasks === totalTasks && totalTasks > 0 ? 'text-success' : 'text-accent'}">${completedTasks}/${totalTasks}</div>
          <div class="text-sm text-muted mt-16">Bugunku gorevler</div>
        </div>

        <div class="card" style="text-align:center;">
          <div class="card-title">Pomodoro</div>
          <div class="card-value text-danger">${pomodoroStats.today.count}</div>
          <div class="text-sm text-muted mt-16">${pomodoroStats.today.totalMinutes} dakika odak</div>
        </div>

        <div class="card" style="text-align:center;">
          <div class="card-title">Aylik Kalan</div>
          <div class="card-value ${dailyLimit.monthlyRemaining >= 0 ? 'text-success' : 'text-danger'}" id="dash-monthly-remaining">${dailyLimit.hasBudget ? formatMoney(dailyLimit.monthlyRemaining) : '—'}</div>
          <div class="text-sm text-muted mt-16">${dailyLimit.daysLeft} gun kaldi</div>
        </div>
      </div>` : ''}

      <!-- Hizli Islemler -->
      ${isVisible('quick_actions') ? `<div style="display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap;">
        <button class="btn btn-danger btn-sm" onclick="DashboardPage.quickExpense()">+ Harcama</button>
        <button class="btn btn-success btn-sm" onclick="DashboardPage.quickIncome()">+ Gelir</button>
        <button class="btn btn-primary btn-sm" onclick="App.navigateTo('pomodoro')">${icon('timer', 14)} Pomodoro</button>
        <button class="btn btn-ghost btn-sm" onclick="App.navigateTo('habits')">${icon('target', 14)} Aliskanliklar</button>
      </div>` : ''}

      <!-- Daily Challenges -->
      ${isVisible('challenges') && challenges.length > 0 ? `
      <div class="card mb-16">
        <div class="card-title">Günün Görevleri</div>
        <div style="display:flex; flex-direction:column; gap:10px;">
          ${challenges.map(ch => {
            const pct = ch.target_value > 0 ? Math.min(100, Math.round((ch.current_value / ch.target_value) * 100)) : (ch.is_completed ? 100 : 0);
            return `
              <div style="display:flex; align-items:center; gap:12px; padding:8px; border-radius:var(--radius-sm); background:${ch.is_completed ? 'rgba(16,185,129,0.1)' : 'var(--bg-input)'};">
                <span style="font-size:18px;">${ch.is_completed ? icon('check-circle', 14) : '⚔️'}</span>
                <div style="flex:1;">
                  <div class="text-sm font-bold" style="${ch.is_completed ? 'text-decoration:line-through; opacity:0.6;' : ''}">${ch.description}</div>
                  ${!ch.is_completed ? `
                    <div class="progress-bar mt-4" style="height:4px;">
                      <div class="progress-fill" style="width:${pct}%; background:var(--accent);"></div>
                    </div>
                  ` : ''}
                </div>
                <span class="text-sm ${ch.is_completed ? 'text-success' : 'text-warning'} font-bold">+${ch.reward_xp} XP</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
      ` : ''}

      <!-- Kumbara Widget -->
      ${isVisible('kumbara') ? (() => {
        const activeGoals = savingsGoals.filter(g => !g.is_completed).slice(0, 3);
        if (activeGoals.length === 0) return '';
        return `
          <div class="card mb-16" style="cursor:pointer;" onclick="App.navigateTo('finance'); setTimeout(() => FinancePage.switchTab('kumbara'), 100);">
            <div class="flex-between mb-8">
              <div class="card-title" style="margin:0;">Kumbara</div>
              <span class="text-sm text-accent">Detay &rarr;</span>
            </div>
            ${activeGoals.map(g => {
              const pct = Math.min(100, Math.round((g.current_amount / g.target_amount) * 100));
              return `
                <div style="margin-bottom:8px;">
                  <div class="flex-between text-sm">
                    <span>${g.icon} ${g.name}</span>
                    <span>${pct}%</span>
                  </div>
                  <div class="progress-bar" style="height:8px;">
                    <div class="progress-fill" style="width:${pct}%; background:${g.color};"></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;
      })() : ''}

      <!-- Bugunun Ozeti + Haftalik XP -->
      <div class="grid-2 mb-16">
        ${isVisible('today_summary') ? `<div class="card">
          <div class="card-title">Bugunun Ozeti</div>
          <div class="grid-4" style="text-align:center;">
            <div>
              <div class="text-danger font-bold">${todaySummary.todayExpense > 0 ? '-' : ''}${formatMoney(todaySummary.todayExpense)}</div>
              <div class="text-sm text-muted">Harcama</div>
            </div>
            <div>
              <div class="text-success font-bold">+${formatMoney(todaySummary.todayIncome)}</div>
              <div class="text-sm text-muted">Gelir</div>
            </div>
            <div>
              <div class="text-accent font-bold">${todaySummary.habitsCompleted}/${todaySummary.habitsTotal}</div>
              <div class="text-sm text-muted">Aliskanlik</div>
            </div>
            <div>
              <div class="text-warning font-bold">+${todaySummary.xpEarned} XP</div>
              <div class="text-sm text-muted">Kazanilan</div>
            </div>
          </div>
        </div>` : ''}

        ${isVisible('weekly_xp') ? `<div class="card">
          <div class="card-title">${icon('bar-chart-2', 14)} Haftalik XP</div>
          <canvas id="chart-weekly-xp" width="400" height="140" style="width:100%; height:140px;"></canvas>
          <div class="text-sm text-muted" style="text-align:center; margin-top:8px;" id="weekly-xp-summary"></div>
        </div>` : ''}
      </div>

      <!-- Daily Dice -->
      ${isVisible('daily_dice') && canRollDice ? `
      <div class="card mb-16" style="text-align:center; background:linear-gradient(135deg, var(--bg-card), rgba(251,191,36,0.05)); border:1px solid rgba(251,191,36,0.2);">
        <div style="font-size:48px; margin-bottom:8px;" id="dice-emoji">${icon('dice-5', 14)}</div>
        <div class="font-bold" style="font-size:16px; margin-bottom:4px;">Günlük Zar Atışı</div>
        <div class="text-sm text-muted mb-8">Bugünkü şansını dene!</div>
        <button class="btn btn-warning" onclick="DashboardPage.rollDice()" id="dice-btn">Zar At!</button>
        <div id="dice-result" style="margin-top:12px; display:none;"></div>
      </div>
      ` : ''}

      <!-- Boss Battle + Currency -->
      <div class="grid-2 mb-16">
        <!-- Boss Battle -->
        ${isVisible('boss_battle') ? `<div class="boss-widget">
          <div class="boss-title">${icon('trophy', 14)} Haftalik Boss Battle</div>
          <div class="boss-days">
            ${bossBattle.days.map(d => `
              <div class="boss-day ${d.status}" title="${d.date}">
                ${d.status === 'passed' ? '✓' : d.status === 'failed' ? '✗' : d.dayLabel}
              </div>
            `).join('')}
          </div>
          <div class="text-sm ${bossBattle.successDays >= 5 ? 'text-success' : 'text-muted'}">
            ${bossBattle.bossDefeated ? '🎉 Boss yenildi! +100 XP' : `${bossBattle.successDays}/5 gun tamamlandi`}
          </div>
        </div>` : ''}

        <!-- Mini Currency -->
        ${isVisible('currency') ? `<div class="card">
          <div class="card-title">${icon('wallet', 14)} Anlik Kurlar</div>
          <div id="mini-currency-widget">
            ${CurrencyPage.getMiniWidget()}
          </div>
        </div>` : ''}
      </div>
    `;

    // Draw weekly XP chart
    if (isVisible('weekly_xp')) this.drawWeeklyXP('chart-weekly-xp', xpHistory);
  },

  patchBalance(limit) {
    if (!limit.hasBudget) return;
    const patch = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    patch('dash-daily-limit', formatMoney(limit.dailyLimit));
    patch('dash-today-spent', formatMoney(limit.todaySpent));
    patch('dash-today-remaining', formatMoney(limit.todayRemaining));
    const mr = document.getElementById('dash-monthly-remaining');
    if (mr) {
      mr.textContent = formatMoney(limit.monthlyRemaining);
      mr.className = `card-value ${limit.monthlyRemaining >= 0 ? 'text-success' : 'text-danger'}`;
    }
  },

  toggleWidgetConfig() {
    this.showConfigPanel = !this.showConfigPanel;
    const panel = document.getElementById('widget-config-panel');
    if (panel) panel.style.display = this.showConfigPanel ? 'block' : 'none';
  },

  async toggleWidget(key, visible) {
    const config = await this.getWidgetConfig();
    if (config[key]) config[key].visible = visible;
    await this.saveWidgetConfig(config);
    await this.render(document.getElementById('content'));
  },

  async rollDice() {
    const btn = document.getElementById('dice-btn');
    const emoji = document.getElementById('dice-emoji');
    const resultEl = document.getElementById('dice-result');
    if (btn) btn.disabled = true;

    // Dice animation
    const faces = ['🎲', '🎯', '⚡', '🪙', '🌟', '💰'];
    let animCount = 0;
    const anim = setInterval(() => {
      if (emoji) emoji.textContent = faces[animCount % faces.length];
      animCount++;
    }, 100);

    SoundManager.play('diceRoll');
    await new Promise(r => setTimeout(r, 800));
    clearInterval(anim);

    const result = await api.xp.rollDailyDice();
    if (result.rolled && result.reward) {
      if (emoji) emoji.textContent = result.reward.icon;
      if (resultEl) {
        resultEl.style.display = 'block';
        resultEl.innerHTML = `<div class="font-bold text-warning" style="font-size:18px;">${result.reward.label}</div>`;
      }
      Toast.show(`🎲 ${result.reward.label}`, 'loot');
      await App.loadUserStats();
    }
    if (btn) btn.style.display = 'none';
  },

  async openLootBox() {
    const reward = await api.xp.openLootBox();
    if (reward) {
      Toast.show(`🎁 Loot Box: ${reward.icon} ${reward.label}`, 'loot');
      await App.loadUserStats();
      await this.render(document.getElementById('content'));
    }
  },

  drawWeeklyXP(canvasId, xpHistory) {
    // Aggregate XP by day for last 7 days
    const dayLabels = ['Pzt', 'Sal', 'Car', 'Per', 'Cum', 'Cmt', 'Paz'];
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - mondayOffset + i);
      days.push(d.toISOString().split('T')[0]);
    }

    const xpByDay = {};
    days.forEach(d => xpByDay[d] = 0);
    xpHistory.forEach(e => {
      const dateStr = e.date.split(' ')[0];
      if (xpByDay[dateStr] !== undefined && e.amount > 0) {
        xpByDay[dateStr] += e.amount;
      }
    });

    const dayValues = days.map(d => xpByDay[d]);
    const totalXP = dayValues.reduce((a, b) => a + b, 0);
    const avgXP = Math.round(totalXP / 7);

    const summaryEl = document.getElementById('weekly-xp-summary');
    if (summaryEl) summaryEl.textContent = `Bu hafta: +${totalXP} XP | Gunluk ort: ${avgXP} XP`;

    ChartUtils.barChart('chart-weekly-xp', { labels: dayLabels, values: dayValues }, { suffix: ' XP' });
  },

  quickExpense() {
    const categories = ['Yemek', 'Ulasim', 'Alisveris', 'Fatura', 'Eglence', 'Saglik', 'Egitim', 'Diger'];
    showModal('Hizli Harcama', `
      <div class="form-group">
        <label class="form-label">Tutar (₺)</label>
        <input type="number" class="form-input" id="quick-amount" step="0.01" min="0" placeholder="0.00">
      </div>
      <div class="form-group">
        <label class="form-label">Kategori</label>
        <select class="form-select" id="quick-category">
          ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Aciklama</label>
        <input type="text" class="form-input" id="quick-desc" placeholder="Opsiyonel">
      </div>
    `, async (overlay) => {
      const amount = parseFloat(document.getElementById('quick-amount').value);
      if (!amount || amount <= 0) { Toast.show('Tutar gir!', 'error'); return; }
      const category = document.getElementById('quick-category').value;
      const description = document.getElementById('quick-desc').value || '';
      await api.finance.addTransaction({ type: 'expense', amount, category, description, date: getTodayStr() });
      overlay.remove();
      Toast.show(`-${formatMoney(amount)} harcama eklendi`, 'warning');
      await App.loadUserStats();
      if (App.currentPage === 'dashboard') await DashboardPage.render(document.getElementById('content'));
    });
  },

  quickIncome() {
    const categories = ['Maas', 'Freelance', 'Yatirim', 'Hediye', 'Diger'];
    showModal('Hizli Gelir', `
      <div class="form-group">
        <label class="form-label">Tutar (₺)</label>
        <input type="number" class="form-input" id="quick-amount" step="0.01" min="0" placeholder="0.00">
      </div>
      <div class="form-group">
        <label class="form-label">Kategori</label>
        <select class="form-select" id="quick-category">
          ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
      </div>
    `, async (overlay) => {
      const amount = parseFloat(document.getElementById('quick-amount').value);
      if (!amount || amount <= 0) { Toast.show('Tutar gir!', 'error'); return; }
      const category = document.getElementById('quick-category').value;
      await api.finance.addTransaction({ type: 'income', amount, category, description: '', date: getTodayStr() });
      overlay.remove();
      Toast.show(`+${formatMoney(amount)} gelir eklendi`, 'success');
      await App.loadUserStats();
      if (App.currentPage === 'dashboard') await DashboardPage.render(document.getElementById('content'));
    });
  }
};
