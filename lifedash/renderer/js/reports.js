// ============ REPORTS PAGE ============
const ReportsPage = {
  async render(container) {
    const currentMonth = getCurrentMonth();
    const [transactions, habits, pomodoroStats, xpHistory, userStats, trendData, comparison, reportCard] = await Promise.all([
      api.finance.getTransactions({ month: currentMonth }),
      api.habits.getHabits(),
      api.pomodoro.getPomodoroStats(),
      api.gamification.getXPHistory(30),
      api.gamification.getUserStats(),
      api.finance.getMonthlyTrend(12),
      api.finance.getMonthComparison(),
      api.reports.generateReportCard('monthly', currentMonth)
    ]);

    const expenses = transactions.filter(t => t.type === 'expense');
    const income = transactions.filter(t => t.type === 'income');
    const totalExpense = expenses.reduce((s, t) => s + t.amount, 0);
    const totalIncome = income.reduce((s, t) => s + t.amount, 0);

    // Category breakdown
    const categories = {};
    expenses.forEach(t => {
      categories[t.category] = (categories[t.category] || 0) + t.amount;
    });

    const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0];

    // Grade colors & messages
    const gradeConfig = {
      A: { color: '#22c55e', bg: 'rgba(34,197,94,0.15)', msg: 'Muhtesem! Butceni harika yonetiyorsun!' },
      B: { color: '#06b6d4', bg: 'rgba(6,182,212,0.15)', msg: 'Guzel gidiyorsun, hedeflerin yakin!' },
      C: { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', msg: 'Fena degil ama daha iyi olabilir.' },
      D: { color: '#f97316', bg: 'rgba(249,115,22,0.15)', msg: 'Dikkat! Harcamalarini gozden gecir.' },
      F: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)', msg: 'Acil durum! Butceni asiyorsun.' }
    };
    const gc = gradeConfig[reportCard.grade] || gradeConfig.C;

    // Comparison arrows
    const arrow = (val) => val > 0 ? `<span class="text-success">+${val}%</span>` : val < 0 ? `<span class="text-danger">${val}%</span>` : `<span class="text-muted">0%</span>`;
    const expArrow = (val) => val > 0 ? `<span class="text-danger">+${val}%</span>` : val < 0 ? `<span class="text-success">${val}%</span>` : `<span class="text-muted">0%</span>`;

    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Raporlar & Analiz</h1>
        <p class="page-subtitle">${new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })} ozeti</p>
      </div>

      <!-- Report Card -->
      <div class="card mb-16" style="border: 1px solid ${gc.color}30;">
        <div style="display:flex; align-items:center; gap:24px;">
          <div class="report-grade" style="background:${gc.bg}; color:${gc.color}; min-width:80px; height:80px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:36px; font-weight:900; border:3px solid ${gc.color};">
            ${reportCard.grade}
          </div>
          <div style="flex:1;">
            <div class="font-bold" style="font-size:18px; margin-bottom:4px;">Aylik Finansal Karne</div>
            <div class="text-muted" style="margin-bottom:8px;">${gc.msg}</div>
            <div class="text-sm">
              ${reportCard.budgetAdherence !== null ? `Butce kullanimi: <span class="font-bold" style="color:${gc.color};">%${reportCard.budgetAdherence}</span>` : 'Butce ayarlanmamis — karne hesaplanamadi.'}
              ${reportCard.topCategory ? ` | En cok harcama: ${getCategoryEmoji(reportCard.topCategory)}` : ''}
            </div>
          </div>
        </div>
      </div>

      <!-- Insights -->
      <div class="grid-4 mb-16">
        <div class="card" style="text-align:center;">
          <div class="card-title">Toplam Gelir</div>
          <div class="card-value text-success" style="font-size:22px;">${formatMoney(totalIncome)}</div>
        </div>
        <div class="card" style="text-align:center;">
          <div class="card-title">Toplam Gider</div>
          <div class="card-value text-danger" style="font-size:22px;">${formatMoney(totalExpense)}</div>
        </div>
        <div class="card" style="text-align:center;">
          <div class="card-title">Net Durum</div>
          <div class="card-value ${totalIncome - totalExpense >= 0 ? 'text-success' : 'text-danger'}" style="font-size:22px;">${formatMoney(totalIncome - totalExpense)}</div>
        </div>
        <div class="card" style="text-align:center;">
          <div class="card-title">En Cok Harcama</div>
          <div class="card-value text-warning" style="font-size:16px;">${topCategory ? getCategoryEmoji(topCategory[0]) + ' ' + formatMoney(topCategory[1]) : '—'}</div>
        </div>
      </div>

      <!-- 12-Month Trend Chart -->
      <div class="chart-container mb-16">
        <div class="card-title">12 Aylik Gelir / Gider / Tasarruf Trendi</div>
        <canvas id="chart-trend" width="800" height="280"></canvas>
      </div>

      <!-- Month Comparison -->
      <div class="card mb-16">
        <div class="card-title">Gecen Ay vs Bu Ay</div>
        <div class="grid-2" style="gap:0;">
          <div style="padding:16px; border-right:1px solid var(--border);">
            <div class="text-sm text-muted mb-8">${comparison.lastMonth.key}</div>
            <div class="flex-between mb-8"><span>Gelir</span><span class="font-bold text-success">${formatMoney(comparison.lastMonth.income)}</span></div>
            <div class="flex-between mb-8"><span>Gider</span><span class="font-bold text-danger">${formatMoney(comparison.lastMonth.expense)}</span></div>
            <div class="flex-between mb-8"><span>Net</span><span class="font-bold">${formatMoney(comparison.lastMonth.net)}</span></div>
            <div class="flex-between"><span>Tasarruf Orani</span><span class="font-bold">%${comparison.lastMonth.savingsRate}</span></div>
          </div>
          <div style="padding:16px;">
            <div class="text-sm text-muted mb-8">${comparison.thisMonth.key} <span class="tag tag-income" style="font-size:10px;">Bu Ay</span></div>
            <div class="flex-between mb-8"><span>Gelir</span><span class="font-bold text-success">${formatMoney(comparison.thisMonth.income)} ${arrow(comparison.changes.income)}</span></div>
            <div class="flex-between mb-8"><span>Gider</span><span class="font-bold text-danger">${formatMoney(comparison.thisMonth.expense)} ${expArrow(comparison.changes.expense)}</span></div>
            <div class="flex-between mb-8"><span>Net</span><span class="font-bold">${formatMoney(comparison.thisMonth.net)} ${arrow(comparison.changes.net)}</span></div>
            <div class="flex-between"><span>Tasarruf Orani</span><span class="font-bold">%${comparison.thisMonth.savingsRate} ${arrow(comparison.changes.savingsRate)}</span></div>
          </div>
        </div>
        ${comparison.thisMonth.categories.length > 0 ? `
          <div style="border-top:1px solid var(--border); padding:12px 16px;">
            <div class="text-sm text-muted mb-8">Bu Ayin En Cok Harcama Kategorileri</div>
            <div style="display:flex; gap:12px;">
              ${comparison.thisMonth.categories.map((c, i) => `
                <div class="tag" style="font-size:12px;">${i + 1}. ${getCategoryEmoji(c.category)} ${formatMoney(c.total)}</div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>

      <!-- Charts Row -->
      <div class="grid-2 mb-16">
        <div class="chart-container">
          <div class="card-title">Kategori Bazli Harcamalar</div>
          <canvas id="chart-pie" width="400" height="250"></canvas>
        </div>
        <div class="chart-container">
          <div class="card-title">Son 30 Gun XP Kazanimi</div>
          <canvas id="chart-xp" width="400" height="250"></canvas>
        </div>
      </div>

      <div class="grid-2 mb-16">
        <div class="chart-container">
          <div class="card-title">Gunluk Harcama Trendi</div>
          <canvas id="chart-daily" width="400" height="250"></canvas>
        </div>
        <div class="chart-container">
          <div class="card-title">Aliskanlik Tamamlama</div>
          <canvas id="chart-habits" width="400" height="250"></canvas>
        </div>
      </div>

      <!-- Stats Summary -->
      <div class="card">
        <div class="card-title">Ozet Istatistikler</div>
        <div class="grid-3" style="margin-top:12px;">
          <div style="text-align:center; padding:12px;">
            <div class="text-sm text-muted">Islem Sayisi</div>
            <div class="font-bold" style="font-size:20px;">${transactions.length}</div>
          </div>
          <div style="text-align:center; padding:12px;">
            <div class="text-sm text-muted">Gunluk Ortalama Harcama</div>
            <div class="font-bold" style="font-size:20px;">${formatMoney(totalExpense / Math.max(1, new Date().getDate()))}</div>
          </div>
          <div style="text-align:center; padding:12px;">
            <div class="text-sm text-muted">Toplam Pomodoro</div>
            <div class="font-bold" style="font-size:20px;">${pomodoroStats.total.count} (${Math.round(pomodoroStats.total.totalMinutes / 60)}s)</div>
          </div>
        </div>
      </div>
    `;

    // Draw charts after DOM is ready
    requestAnimationFrame(() => {
      this.drawTrendChart('chart-trend', trendData);
      this.drawPieChart('chart-pie', categories);
      this.drawXPChart('chart-xp', xpHistory || []);
      this.drawDailyChart('chart-daily', expenses);
      this.drawHabitsChart('chart-habits', habits);
    });
  },

  drawTrendChart(canvasId, trendData) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = 280;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    const padding = { top: 20, right: 20, bottom: 35, left: 60 };

    if (!trendData || trendData.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '14px Segoe UI';
      ctx.textAlign = 'center';
      ctx.fillText('Veri yok', w / 2, h / 2);
      return;
    }

    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    const allValues = trendData.flatMap(d => [d.income, d.expense, Math.abs(d.net)]);
    const maxVal = Math.max(...allValues, 100);

    // Grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();
      ctx.fillStyle = '#64748b';
      ctx.font = '10px Segoe UI';
      ctx.textAlign = 'right';
      ctx.fillText(formatShortMoney(maxVal - (maxVal / 4) * i), padding.left - 8, y + 4);
    }

    const stepX = chartW / Math.max(1, trendData.length - 1);

    const drawLine = (key, color, alpha = 1) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = alpha;
      trendData.forEach((d, i) => {
        const x = padding.left + stepX * i;
        const y = padding.top + chartH - (d[key] / maxVal) * chartH;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Dots
      trendData.forEach((d, i) => {
        const x = padding.left + stepX * i;
        const y = padding.top + chartH - (d[key] / maxVal) * chartH;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    };

    drawLine('income', '#22c55e');
    drawLine('expense', '#ef4444');
    drawLine('net', '#6366f1', 0.7);

    // X labels
    ctx.fillStyle = '#64748b';
    ctx.font = '10px Segoe UI';
    ctx.textAlign = 'center';
    trendData.forEach((d, i) => {
      const x = padding.left + stepX * i;
      ctx.fillText(d.label, x, h - 8);
    });

    // Legend
    const legendX = padding.left + 10;
    const legendY = padding.top + 10;
    [['Gelir', '#22c55e'], ['Gider', '#ef4444'], ['Net', '#6366f1']].forEach(([label, color], i) => {
      const lx = legendX + i * 80;
      ctx.fillStyle = color;
      ctx.fillRect(lx, legendY - 8, 12, 12);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '11px Segoe UI';
      ctx.textAlign = 'left';
      ctx.fillText(label, lx + 16, legendY);
    });
  },

  drawPieChart(canvasId, categories) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = 250;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const entries = Object.entries(categories).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '14px Segoe UI';
      ctx.textAlign = 'center';
      ctx.fillText('Henuz harcama verisi yok', w / 2, h / 2);
      return;
    }

    const total = entries.reduce((s, [, v]) => s + v, 0);
    const colors = ['#6366f1', '#ef4444', '#22c55e', '#f59e0b', '#06b6d4', '#ec4899', '#8b5cf6', '#f97316'];
    const cx = w * 0.35, cy = h / 2, r = Math.min(w * 0.3, h * 0.4);

    let startAngle = -Math.PI / 2;
    entries.forEach(([cat, amount], i) => {
      const sliceAngle = (amount / total) * 2 * Math.PI;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, startAngle + sliceAngle);
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
      startAngle += sliceAngle;
    });

    const legendX = w * 0.68;
    let legendY = 30;
    ctx.font = '12px Segoe UI';
    entries.forEach(([cat, amount], i) => {
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(legendX, legendY - 8, 12, 12);
      ctx.fillStyle = '#e2e8f0';
      ctx.textAlign = 'left';
      const pct = ((amount / total) * 100).toFixed(0);
      ctx.fillText(`${getCategoryEmoji(cat)} ${pct}%`, legendX + 18, legendY);
      legendY += 22;
    });
  },

  drawXPChart(canvasId, xpHistory) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = 250;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    const padding = { top: 20, right: 20, bottom: 30, left: 50 };

    const dailyXP = {};
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dailyXP[`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`] = 0;
    }

    xpHistory.forEach(entry => {
      const date = entry.date.split(' ')[0];
      if (dailyXP[date] !== undefined && entry.amount > 0) {
        dailyXP[date] += entry.amount;
      }
    });

    const dates = Object.keys(dailyXP);
    const values = Object.values(dailyXP);
    const maxVal = Math.max(...values, 10);

    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();
      ctx.fillStyle = '#64748b';
      ctx.font = '10px Segoe UI';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(maxVal - (maxVal / 4) * i), padding.left - 8, y + 4);
    }

    ctx.beginPath();
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;
    const stepX = chartW / (dates.length - 1);

    values.forEach((val, i) => {
      const x = padding.left + stepX * i;
      const y = padding.top + chartH - (val / maxVal) * chartH;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    const lastX = padding.left + stepX * (values.length - 1);
    ctx.lineTo(lastX, padding.top + chartH);
    ctx.lineTo(padding.left, padding.top + chartH);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
    grad.addColorStop(0, 'rgba(99, 102, 241, 0.3)');
    grad.addColorStop(1, 'rgba(99, 102, 241, 0.0)');
    ctx.fillStyle = grad;
    ctx.fill();

    values.forEach((val, i) => {
      const x = padding.left + stepX * i;
      const y = padding.top + chartH - (val / maxVal) * chartH;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#6366f1';
      ctx.fill();
    });

    ctx.fillStyle = '#64748b';
    ctx.font = '9px Segoe UI';
    ctx.textAlign = 'center';
    dates.forEach((d, i) => {
      if (i % 5 === 0 || i === dates.length - 1) {
        const x = padding.left + stepX * i;
        ctx.fillText(d.slice(5), x, h - 8);
      }
    });
  },

  drawDailyChart(canvasId, expenses) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = 250;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    const padding = { top: 20, right: 20, bottom: 30, left: 50 };

    const daily = {};
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      const d = `${getCurrentMonth()}-${String(i).padStart(2, '0')}`;
      daily[d] = 0;
    }

    expenses.forEach(t => {
      if (daily[t.date] !== undefined) daily[t.date] += t.amount;
    });

    const dates = Object.keys(daily).slice(0, today.getDate());
    const values = dates.map(d => daily[d]);
    const maxVal = Math.max(...values, 100);

    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;
    const barW = Math.max(4, (chartW / dates.length) - 2);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();
      ctx.fillStyle = '#64748b';
      ctx.font = '10px Segoe UI';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(maxVal - (maxVal / 4) * i), padding.left - 8, y + 4);
    }

    values.forEach((val, i) => {
      const x = padding.left + (chartW / dates.length) * i + 1;
      const barH = (val / maxVal) * chartH;
      const y = padding.top + chartH - barH;
      const grad = ctx.createLinearGradient(0, y, 0, y + barH);
      grad.addColorStop(0, '#ef4444');
      grad.addColorStop(1, 'rgba(239, 68, 68, 0.3)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, [3, 3, 0, 0]);
      ctx.fill();
    });

    ctx.fillStyle = '#64748b';
    ctx.font = '9px Segoe UI';
    ctx.textAlign = 'center';
    dates.forEach((d, i) => {
      if (i % 5 === 0 || i === dates.length - 1) {
        const x = padding.left + (chartW / dates.length) * i + barW / 2;
        ctx.fillText(d.slice(8), x, h - 8);
      }
    });
  },

  drawHabitsChart(canvasId, habits) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = 250;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    if (habits.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '14px Segoe UI';
      ctx.textAlign = 'center';
      ctx.fillText('Henuz aliskanlik yok', w / 2, h / 2);
      return;
    }

    const padding = { top: 20, right: 20, bottom: 40, left: 40 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;
    const barW = Math.min(40, (chartW / habits.length) - 10);
    const colors = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

    habits.forEach((habit, i) => {
      const streakDays = habit.streak || 0;
      const maxStreak = 30;
      const ratio = Math.min(1, streakDays / maxStreak);
      const barH = ratio * chartH;
      const x = padding.left + (chartW / habits.length) * i + ((chartW / habits.length) - barW) / 2;
      const y = padding.top + chartH - barH;

      const grad = ctx.createLinearGradient(0, y, 0, y + barH);
      grad.addColorStop(0, colors[i % colors.length]);
      grad.addColorStop(1, colors[i % colors.length] + '40');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]);
      ctx.fill();

      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 11px Segoe UI';
      ctx.textAlign = 'center';
      ctx.fillText(`${streakDays}g`, x + barW / 2, y - 6);

      ctx.fillStyle = '#64748b';
      ctx.font = '10px Segoe UI';
      ctx.save();
      ctx.translate(x + barW / 2, h - 5);
      ctx.rotate(-0.3);
      ctx.fillText(habit.name.slice(0, 10), 0, 0);
      ctx.restore();
    });
  }
};

function getCategoryEmoji(cat) {
  const emojis = {
    yemek: '🍔', ulasim: '🚌', market: '🛒', eglence: '🎮',
    fatura: '📱', saglik: '💊', giyim: '👕', kira: '🏠',
    egitim: '📚', maas: '💼', ek_gelir: '💵', freelance: '💻',
    yatirim: '📈', alisveris: '🛍️', hediye: '🎁', diger: '📦'
  };
  return emojis[(cat || '').toLowerCase()] || '📦';
}

function formatShortMoney(amount) {
  if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'M';
  if (amount >= 1000) return (amount / 1000).toFixed(0) + 'K';
  return Math.round(amount).toString();
}
