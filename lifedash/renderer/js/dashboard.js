// ============ DASHBOARD PAGE ============
const DashboardPage = {
  async render(container) {
    const [stats, dailyLimit, tasks, pomodoroStats, bossBattle, lootCheck, savingsGoals, todaySummary, xpHistory] = await Promise.all([
      api.gamification.getUserStats(),
      api.finance.getDailyLimit(),
      api.tasks.getDailyTasks(),
      api.pomodoro.getPomodoroStats(),
      api.gamification.getBossBattle(),
      api.gamification.checkLootBox(),
      api.finance.getSavingsGoals(),
      api.finance.getTodaySummary(),
      api.gamification.getXPHistory(7)
    ]);

    App.userStats = stats;
    App.updateTitleBar();
    App.updateStreak();

    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const totalTasks = tasks.length;
    const title = getLevelTitle(stats.level);

    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Dashboard</h1>
        <p class="page-subtitle">Hos geldin! Bugunun ozeti asagida.</p>
      </div>

      <!-- XP Bar -->
      <div class="xp-bar-container">
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
      </div>

      <!-- Quick Stats -->
      <div class="grid-4 mb-16">
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
      </div>

      <!-- Hizli Islemler -->
      <div style="display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap;">
        <button class="btn btn-danger btn-sm" onclick="DashboardPage.quickExpense()">+ Harcama</button>
        <button class="btn btn-success btn-sm" onclick="DashboardPage.quickIncome()">+ Gelir</button>
        <button class="btn btn-primary btn-sm" onclick="App.navigateTo('pomodoro')">🍅 Pomodoro</button>
        <button class="btn btn-ghost btn-sm" onclick="App.navigateTo('habits')">🎯 Aliskanliklar</button>
      </div>

      <!-- Kumbara Widget -->
      ${(() => {
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
      })()}

      <!-- Bugunun Ozeti + Haftalik XP -->
      <div class="grid-2 mb-16">
        <div class="card">
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
        </div>

        <div class="card">
          <div class="card-title">Haftalik XP</div>
          <canvas id="chart-weekly-xp" width="400" height="140" style="width:100%; height:140px;"></canvas>
          <div class="text-sm text-muted" style="text-align:center; margin-top:8px;" id="weekly-xp-summary"></div>
        </div>
      </div>

      <!-- Boss Battle + Currency -->
      <div class="grid-2 mb-16">
        <!-- Boss Battle -->
        <div class="boss-widget">
          <div class="boss-title">⚔️ Haftalik Boss Battle</div>
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
        </div>

        <!-- Mini Currency -->
        <div class="card">
          <div class="card-title">Anlik Kurlar</div>
          <div id="mini-currency-widget">
            ${typeof CurrencyPage !== 'undefined' && CurrencyPage.getMiniWidget ? CurrencyPage.getMiniWidget() : '<div class="text-sm text-muted">Kur verisi yükleniyor...</div>'}
          </div>
        </div>
      </div>
    `;

    // Draw weekly XP chart
    this.drawWeeklyXP('chart-weekly-xp', xpHistory);
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

  async openLootBox() {
    const reward = await api.gamification.openLootBox();
    if (reward) {
      Toast.show(`🎁 Loot Box: ${reward.icon} ${reward.label}`, 'loot');
      await App.loadUserStats();
      await this.render(document.getElementById('content'));
    }
  },

  drawWeeklyXP(canvasId, xpHistory) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    // Aggregate XP by day for last 7 days
    const dayLabels = ['Pzt', 'Sal', 'Car', 'Per', 'Cum', 'Cmt', 'Paz'];
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - mondayOffset + i);
      days.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
    }

    const xpByDay = {};
    days.forEach(d => xpByDay[d] = 0);
    xpHistory.forEach(e => {
      const dateStr = e.date.split(' ')[0];
      if (xpByDay[dateStr] !== undefined && e.amount > 0) {
        xpByDay[dateStr] += e.amount;
      }
    });

    const values = days.map(d => xpByDay[d]);
    const maxVal = Math.max(...values, 1);
    const totalXP = values.reduce((a, b) => a + b, 0);
    const avgXP = Math.round(totalXP / 7);

    const summaryEl = document.getElementById('weekly-xp-summary');
    if (summaryEl) summaryEl.textContent = `Bu hafta: +${totalXP} XP | Gunluk ort: ${avgXP} XP`;

    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    const pad = { top: 10, bottom: 25, left: 10, right: 10 };
    const barW = (w - pad.left - pad.right) / 7;
    const chartH = h - pad.top - pad.bottom;

    // Get theme colors from CSS
    const styles = getComputedStyle(document.documentElement);
    const accent = styles.getPropertyValue('--accent').trim() || '#6366f1';
    const ghost = styles.getPropertyValue('--border').trim() || '#2a2a4a';
    const textMuted = styles.getPropertyValue('--text-muted').trim() || '#888';

    ctx.clearRect(0, 0, w, h);

    values.forEach((val, i) => {
      const barH = Math.max(4, (val / maxVal) * chartH);
      const x = pad.left + i * barW + barW * 0.15;
      const bw = barW * 0.7;
      const y = pad.top + chartH - barH;
      const isToday = days[i] === todayStr;

      ctx.fillStyle = isToday ? accent : ghost;
      ctx.beginPath();
      const radius = 4;
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + bw - radius, y);
      ctx.quadraticCurveTo(x + bw, y, x + bw, y + radius);
      ctx.lineTo(x + bw, y + barH);
      ctx.lineTo(x, y + barH);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.fill();

      // Value on top
      if (val > 0) {
        ctx.fillStyle = isToday ? accent : textMuted;
        ctx.font = '10px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('+' + val, x + bw / 2, y - 4);
      }

      // Day label
      ctx.fillStyle = isToday ? accent : textMuted;
      ctx.font = isToday ? 'bold 11px system-ui' : '11px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(dayLabels[i], x + bw / 2, h - 6);
    });
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
      if (App.currentPage === 'dashboard') await this.render(document.getElementById('content'));
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
      if (App.currentPage === 'dashboard') await this.render(document.getElementById('content'));
    });
  },

  destroy() {
    // Stub for future intervals or listeners
  }
};
