// ============ FINANCE PAGE ============
const FinancePage = {
  currentTab: 'overview',

  async render(container) {
    container.innerHTML = Skeleton.card(4);

    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Finans Yönetimi</h1>
        <p class="page-subtitle">Gelir, gider ve borçlarını yönet</p>
      </div>

      <div class="tab-bar">
        <button class="tab-btn active" data-tab="overview">Genel Bakış</button>
        <button class="tab-btn" data-tab="transactions">İşlemler</button>
        <button class="tab-btn" data-tab="debts">Borçlar</button>
        <button class="tab-btn" data-tab="kumbara">Kumbara</button>
        <button class="tab-btn" data-tab="subscriptions">Abonelikler</button>
        <button class="tab-btn" data-tab="budget">Bütçe Ayarla</button>
      </div>

      <div id="finance-content"></div>
    `;

    container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentTab = btn.dataset.tab;
        this.renderTab(btn.dataset.tab);
      });
    });

    await this.renderTab('overview');

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tab);
    });
    this.currentTab = tab;
    this.renderTab(tab);
  },

  async renderTab(tab) {
    const content = document.getElementById('finance-content');
    switch (tab) {
      case 'overview': await this.renderOverview(content); break;
      case 'transactions': await this.renderTransactions(content); break;
      case 'debts': await this.renderDebts(content); break;
      case 'kumbara': await this.renderKumbara(content); break;
      case 'subscriptions': await this.renderSubscriptions(content); break;
      case 'budget': await this.renderBudgetSetup(content); break;
    }
  },

  async renderOverview(container) {
    const [dailyLimit, debts, transactions, impulses, categorySpending] = await Promise.all([
      api.finance.getDailyLimit(),
      api.finance.getDebts(),
      api.finance.getTransactions({ month: getCurrentMonth() }),
      api.finance.getImpulses(),
      api.finance.getCategorySpending(getCurrentMonth())
    ]);

    const totalDebt = debts.reduce((s, d) => s + (d.total_amount - d.paid_amount), 0);
    const monthIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const budgetIncome = dailyLimit.hasBudget ? dailyLimit.totalIncome : 0;
    const totalIncome = monthIncome + budgetIncome;
    const monthExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const remainingBalance = totalIncome - monthExpense;

    container.innerHTML = `
      <!-- Daily Limit Hero -->
      <div class="daily-limit-widget" style="margin-bottom: 20px;">
        <div class="daily-limit-label">Bugün Harcayabileceğin</div>
        <div class="daily-limit-amount" id="live-today-remaining">${dailyLimit.hasBudget ? formatMoney(dailyLimit.todayRemaining) : `<a href="#" onclick="FinancePage.switchTab('budget'); return false;" style="color:var(--accent); cursor:pointer;">Bütçe ayarla →</a>`}</div>
        ${dailyLimit.hasBudget ? `
          <div class="daily-limit-sub">
            Günlük limit: <span id="live-daily-limit">${formatMoney(dailyLimit.dailyLimit)}</span> • Bugün harcanan: <span id="live-today-spent">${formatMoney(dailyLimit.todaySpent)}</span>
          </div>
          <div class="progress-bar mt-16" style="max-width:400px; margin:12px auto 0;">
            <div class="progress-fill" id="live-limit-bar" style="width: ${Math.min(100, (dailyLimit.todaySpent / dailyLimit.dailyLimit) * 100)}%; background: ${dailyLimit.todaySpent > dailyLimit.dailyLimit ? 'var(--danger)' : 'var(--success)'};"></div>
          </div>
        ` : ''}
      </div>

      <!-- Stats Grid -->
      <div class="grid-4 mb-16">
        <div class="card" style="text-align:center;">
          <div class="card-title">Aylık Gelir</div>
          <div class="card-value text-success" style="font-size:24px;">${formatMoney(totalIncome)}</div>
        </div>
        <div class="card" style="text-align:center; border: 1px solid ${remainingBalance >= 0 ? 'var(--success)' : 'var(--danger)'};">
          <div class="card-title">Kalan Bakiye</div>
          <div class="card-value" style="font-size:24px; color: ${remainingBalance >= 0 ? 'var(--success)' : 'var(--danger)'};">${formatMoney(remainingBalance)}</div>
          <div class="text-sm text-muted">Harcanan: ${formatMoney(monthExpense)}</div>
        </div>
        <div class="card" style="text-align:center;">
          <div class="card-title">Toplam Borç</div>
          <div class="card-value text-warning" style="font-size:24px;">${formatMoney(totalDebt)}</div>
        </div>
        <div class="card" style="text-align:center;">
          <div class="card-title">Kalan Gün</div>
          <div class="card-value text-accent" style="font-size:24px;">${dailyLimit.daysLeft}</div>
        </div>
      </div>

      ${categorySpending.length > 0 ? `
      <!-- Category Budget Overview -->
      <div class="card mb-16">
        <div class="card-title">${icon('bar-chart-2', 14)} Kategori Bütçeleri</div>
        <div style="display:flex; flex-wrap:wrap; gap:12px;">
          ${categorySpending.map(cs => {
            const color = cs.percent > 90 ? 'var(--danger)' : cs.percent > 70 ? 'var(--warning)' : 'var(--success)';
            return `
              <div style="flex:1; min-width:180px; padding:10px; border-radius:var(--radius-sm); background:var(--bg-input);">
                <div class="flex-between" style="margin-bottom:4px;">
                  <span class="text-sm font-bold">${this.getCategoryLabel(cs.category)}</span>
                  <span class="text-sm" style="color:${color};">${cs.percent}%</span>
                </div>
                <div class="progress-bar" style="height:6px;">
                  <div class="progress-fill" style="width:${cs.percent}%; background:${color};"></div>
                </div>
                <div class="text-sm text-muted" style="margin-top:2px;">${formatMoney(cs.spent)} / ${formatMoney(cs.budget_limit)}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
      ` : ''}

      <!-- Quick Add -->
      <div class="card">
        <div class="card-title">Hızlı Harcama Ekle</div>
        <div class="form-row">
          <div class="form-group">
            <input type="number" class="form-input" id="quick-amount" placeholder="Tutar (₺)" step="0.01">
          </div>
          <div class="form-group">
            <select class="form-select" id="quick-category">
              <option value="yemek">🍔 Yemek</option>
              <option value="ulasim">🚌 Ulaşım</option>
              <option value="market">🛒 Market</option>
              <option value="eglence">🎮 Eğlence</option>
              <option value="fatura">📱 Fatura</option>
              <option value="saglik">💊 Sağlık</option>
              <option value="giyim">👕 Giyim</option>
              <option value="diger">📦 Diğer</option>
            </select>
          </div>
          <div class="form-group">
            <input type="text" class="form-input" id="quick-desc" placeholder="Açıklama (opsiyonel)">
          </div>
          <div class="form-group" style="flex:0; display:flex; gap:8px;">
            <button class="btn btn-danger" onclick="FinancePage.quickAddExpense()">Ekle</button>
            <button class="btn btn-ghost" onclick="FinancePage.showImpulseModal()" title="24 saat beklet — dürtü harcaması mı?">💭 Dürtü?</button>
          </div>
        </div>
      </div>

      <!-- Pending Impulses -->
      ${impulses.length > 0 ? `
        <div class="card mt-20" style="border: 1px solid var(--warning);">
          <div class="flex-between mb-16">
            <div class="card-title" style="margin:0; color:var(--warning);">💭 Bekleyen Dürtü Harcamaları</div>
          </div>
          ${impulses.map(imp => `
            <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 0; border-bottom:1px solid var(--border);">
              <div>
                <div class="font-bold">${formatMoney(imp.amount)} — ${FinancePage.getCategoryLabel(imp.category)}</div>
                <div class="text-sm text-muted">${imp.description || ''} • ${imp.impulse_date} tarihinde eklendi</div>
              </div>
              <div style="display:flex; gap:8px;">
                <button class="btn btn-success btn-sm" onclick="FinancePage.resolveImpulse(${imp.id}, true)">✓ Onayla +5XP</button>
                <button class="btn btn-danger btn-sm" onclick="FinancePage.resolveImpulse(${imp.id}, false)">✗ Reddet +15XP</button>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <!-- Recent Transactions -->
      ${transactions.length > 0 ? `
        <div class="mt-20">
          <div class="card-title">Son İşlemler</div>
          <div class="table-container">
            <table>
              <thead>
                <tr><th>Tarih</th><th>Kategori</th><th>Açıklama</th><th>Tutar</th></tr>
              </thead>
              <tbody>
                ${transactions.slice(0, 10).map(t => `
                  <tr>
                    <td>${t.date}</td>
                    <td>${this.getCategoryLabel(t.category)}</td>
                    <td>${t.description || '—'}</td>
                    <td><span class="tag tag-${t.type}">${t.type === 'income' ? '+' : '-'}${formatMoney(t.amount)}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  async quickAddExpense() {
    const amount = parseFloat(document.getElementById('quick-amount').value);
    const category = document.getElementById('quick-category').value;
    const desc = document.getElementById('quick-desc').value;

    if (!amount || amount <= 0) {
      Toast.show('Geçerli bir tutar gir!', 'error');
      return;
    }

    await api.finance.addTransaction({
      type: 'expense',
      amount,
      category,
      description: desc,
      date: getTodayStr()
    });

    // Clear inputs
    document.getElementById('quick-amount').value = '';
    document.getElementById('quick-desc').value = '';

    // Refresh all finance data
    const newLimit = await api.finance.getDailyLimit();
    const pct = newLimit.dailyLimit > 0 ? Math.round((newLimit.todaySpent / newLimit.dailyLimit) * 100) : 0;
    Toast.show(
      pct > 100
        ? `⚠️ Limit aşıldı! Kalan: ${formatMoney(newLimit.todayRemaining)}`
        : `✅ ${formatMoney(amount)} eklendi • Kalan: ${formatMoney(newLimit.todayRemaining)}`,
      pct > 100 ? 'error' : 'success'
    );
    await this.afterFinanceChange();
  },

  updateLiveBalance(limit) {
    const patch = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    patch('live-today-remaining', formatMoney(limit.todayRemaining));
    patch('live-today-spent', formatMoney(limit.todaySpent));
    patch('live-daily-limit', formatMoney(limit.dailyLimit));
    const bar = document.getElementById('live-limit-bar');
    if (bar && limit.dailyLimit > 0) {
      const pct = Math.min(100, Math.round((limit.todaySpent / limit.dailyLimit) * 100));
      bar.style.width = pct + '%';
      bar.style.background = pct > 90 ? 'var(--danger)' : pct > 70 ? 'var(--warning)' : 'var(--success)';
    }
  },

  async afterFinanceChange() {
    await this.renderTab(this.currentTab);
    const newLimit = await api.finance.getDailyLimit();
    this.updateLiveBalance(newLimit);
    App.loadUserStats();
    PubSub.publish('balance:updated');
  },

  async showImpulseModal() {
    const amount = parseFloat(document.getElementById('quick-amount').value);
    const category = document.getElementById('quick-category').value;
    const desc = document.getElementById('quick-desc').value;

    if (!amount || amount <= 0) {
      Toast.show('Önce tutarı gir!', 'error');
      return;
    }

    await api.finance.addImpulse({ amount, category, description: desc });

    document.getElementById('quick-amount').value = '';
    document.getElementById('quick-desc').value = '';

    Toast.show(`💭 ${formatMoney(amount)} dürtü listesine eklendi. Yarın tekrar sor!`, 'warning');
    await this.afterFinanceChange();
  },

  async resolveImpulse(id, confirm) {
    const result = await api.finance.resolveImpulse(id, confirm);
    if (result) {
      if (result.action === 'confirmed') {
        Toast.show(`✅ Harcama onaylandı. +${result.xp} XP disiplin bonusu!`, 'xp');
      } else {
        Toast.show(`🧊 Dürtü engellendi! +${result.xp} XP kazandın!`, 'xp');
      }
      await this.afterFinanceChange();
    }
  },

  async renderTransactions(container) {
    const transactions = await api.finance.getTransactions({ limit: 50 });

    container.innerHTML = `
      <div class="flex-between mb-16">
        <div class="card-title" style="margin:0;">Tüm İşlemler</div>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-success btn-sm" onclick="FinancePage.showAddTransactionModal('income')">+ Gelir</button>
          <button class="btn btn-danger btn-sm" onclick="FinancePage.showAddTransactionModal('expense')">+ Gider</button>
          <button class="btn btn-ghost btn-sm" onclick="FinancePage.showAddRecurringModal()" title="Tekrarlayan işlem ekle">🔁 Tekrarlayan</button>
        </div>
      </div>

      ${transactions.length > 0 ? `
        <div class="table-container card">
          <table>
            <thead>
              <tr><th>Tarih</th><th>Tür</th><th>Kategori</th><th>Açıklama</th><th>Tutar</th><th></th></tr>
            </thead>
            <tbody>
              ${transactions.map(t => `
                <tr>
                  <td>${t.date}</td>
                  <td><span class="tag tag-${t.type}">${t.type === 'income' ? 'Gelir' : 'Gider'}</span></td>
                  <td>${this.getCategoryLabel(t.category)}</td>
                  <td>${t.description || '—'}</td>
                  <td class="font-bold ${t.type === 'income' ? 'text-success' : 'text-danger'}">${t.type === 'income' ? '+' : '-'}${formatMoney(t.amount)}</td>
                  <td><button class="btn btn-ghost btn-sm" onclick="FinancePage.deleteTransaction(${t.id})">${icon('trash-2', 14)}</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : `
        <div class="empty-state">
          <div class="empty-state-icon">💸</div>
          <div class="empty-state-text">Henüz işlem yok. İlk gelir veya giderini ekle!</div>
        </div>
      `}
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  showAddTransactionModal(type) {
    const categories = type === 'income'
      ? ['maas', 'ek_gelir', 'freelance', 'yatirim', 'diger']
      : ['yemek', 'ulasim', 'market', 'eglence', 'fatura', 'saglik', 'giyim', 'kira', 'egitim', 'diger'];

    const categoryLabels = {
      maas: '💼 Maaş', ek_gelir: '💵 Ek Gelir', freelance: '💻 Freelance', yatirim: '📈 Yatırım',
      yemek: '🍔 Yemek', ulasim: '🚌 Ulaşım', market: '🛒 Market', eglence: '🎮 Eğlence',
      fatura: '📱 Fatura', saglik: '💊 Sağlık', giyim: '👕 Giyim', kira: '🏠 Kira',
      egitim: '📚 Eğitim', diger: '📦 Diğer'
    };

    showModal(type === 'income' ? 'Gelir Ekle' : 'Gider Ekle', `
      <div class="form-group">
        <label class="form-label">Tutar (₺)</label>
        <input type="number" class="form-input" id="tx-amount" step="0.01" placeholder="0.00">
      </div>
      <div class="form-group">
        <label class="form-label">Kategori</label>
        <select class="form-select" id="tx-category">
          ${categories.map(c => `<option value="${c}">${categoryLabels[c]}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Açıklama</label>
        <input type="text" class="form-input" id="tx-desc" placeholder="Opsiyonel">
      </div>
      <div class="form-group">
        <label class="form-label">Tarih</label>
        <input type="date" class="form-input" id="tx-date" value="${getTodayStr()}">
      </div>
    `, async (overlay) => {
      const amount = parseFloat(document.getElementById('tx-amount').value);
      if (!amount || amount <= 0) { Toast.show('Geçerli tutar gir!', 'error'); return; }

      await api.finance.addTransaction({
        type,
        amount,
        category: document.getElementById('tx-category').value,
        description: document.getElementById('tx-desc').value,
        date: document.getElementById('tx-date').value
      });

      overlay.remove();
      Toast.show(`${type === 'income' ? 'Gelir' : 'Gider'} eklendi: ${formatMoney(amount)}`, 'success');
      await this.afterFinanceChange();
    });
  },

  async deleteTransaction(id) {
    await api.finance.deleteTransaction(id);
    Toast.show('İşlem silindi', 'success');
    await this.afterFinanceChange();
  },

  async renderDebts(container) {
    const debts = await api.finance.getDebts();

    // Fetch forecasts for all debts
    const forecasts = {};
    await Promise.all(debts.map(async d => {
      forecasts[d.id] = await api.finance.getDebtForecast(d.id);
    }));

    container.innerHTML = `
      <div class="flex-between mb-16">
        <div class="card-title" style="margin:0;">Borçlar</div>
        <button class="btn btn-primary btn-sm" onclick="FinancePage.showAddDebtModal()">+ Borç Ekle</button>
      </div>

      ${debts.length > 0 ? `
        <div class="grid-2">
          ${debts.map(d => {
            const remaining = d.total_amount - d.paid_amount;
            const percent = (d.paid_amount / d.total_amount) * 100;
            const forecast = forecasts[d.id];
            const forecastText = forecast && forecast.months !== null && forecast.months !== undefined
              ? (forecast.months === 0 ? 'Ödeme tamamlandı!' : `~${forecast.months} ay kaldı`)
              : (forecast && forecast.message ? forecast.message : '');
            const urgencyColor = d.due_date && new Date(d.due_date) < new Date(Date.now() + 7 * 86400000) ? 'var(--danger)' : '';
            return `
              <div class="debt-card">
                <div class="debt-header">
                  <span class="debt-name">${d.name}</span>
                  <span class="debt-due" ${urgencyColor ? `style="color:${urgencyColor};"` : ''}>${d.due_date ? `Vade: ${d.due_date}` : ''}</span>
                </div>
                <div class="debt-progress">
                  <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percent}%; background: var(--success);"></div>
                  </div>
                  <div class="debt-amounts">
                    <span>Ödenen: ${formatMoney(d.paid_amount)}</span>
                    <span>Kalan: ${formatMoney(remaining)}</span>
                  </div>
                </div>
                ${d.monthly_payment > 0 ? `<div class="text-sm text-muted">Aylık: ${formatMoney(d.monthly_payment)}${forecastText ? ` • ${forecastText}` : ''}</div>` : ''}
                <div style="display:flex; gap:8px; margin-top:10px;">
                  <button class="btn btn-success btn-sm" onclick="FinancePage.showPayDebtModal(${d.id}, ${remaining})">Ödeme Yap</button>
                  <button class="btn btn-ghost btn-sm" onclick="FinancePage.deleteDebt(${d.id})">Sil</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : `
        <div class="empty-state">
          <div class="empty-state-icon">🎉</div>
          <div class="empty-state-text">Borç yok! Harika!</div>
        </div>
      `}
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  showAddDebtModal() {
    showModal('Borç Ekle', `
      <div class="form-group">
        <label class="form-label">Borç Adı</label>
        <input type="text" class="form-input" id="debt-name" placeholder="Örn: Kredi kartı, Arkadaşa borç">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Toplam Tutar (₺)</label>
          <input type="number" class="form-input" id="debt-total" step="0.01">
        </div>
        <div class="form-group">
          <label class="form-label">Ödenen (₺)</label>
          <input type="number" class="form-input" id="debt-paid" value="0" step="0.01">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Aylık Ödeme (₺)</label>
          <input type="number" class="form-input" id="debt-monthly" step="0.01" value="0">
        </div>
        <div class="form-group">
          <label class="form-label">Vade Tarihi</label>
          <input type="date" class="form-input" id="debt-due">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Notlar</label>
        <input type="text" class="form-input" id="debt-notes" placeholder="Opsiyonel">
      </div>
    `, async (overlay) => {
      const name = document.getElementById('debt-name').value;
      const total = parseFloat(document.getElementById('debt-total').value);
      if (!name || !total) { Toast.show('Ad ve tutar gerekli!', 'error'); return; }

      await api.finance.addDebt({
        name,
        total_amount: total,
        paid_amount: parseFloat(document.getElementById('debt-paid').value) || 0,
        monthly_payment: parseFloat(document.getElementById('debt-monthly').value) || 0,
        due_date: document.getElementById('debt-due').value || null,
        notes: document.getElementById('debt-notes').value
      });

      overlay.remove();
      Toast.show('Borç eklendi', 'success');
      await this.afterFinanceChange();
    });
  },

  showPayDebtModal(debtId, remaining) {
    showModal('Ödeme Yap', `
      <div class="form-group">
        <label class="form-label">Ödeme Tutarı (₺)</label>
        <input type="number" class="form-input" id="pay-amount" step="0.01" max="${remaining}" placeholder="Kalan: ${formatMoney(remaining)}">
      </div>
    `, async (overlay) => {
      const amount = parseFloat(document.getElementById('pay-amount').value);
      if (!amount || amount <= 0) { Toast.show('Geçerli tutar gir!', 'error'); return; }

      const debt = (await api.finance.getDebts()).find(d => d.id === debtId);
      if (debt) {
        await api.finance.updateDebt(debtId, { paid_amount: debt.paid_amount + amount });
        Toast.show(`${formatMoney(amount)} ödeme yapıldı!`, 'success');
      }

      overlay.remove();
      await this.afterFinanceChange();
    });
  },

  async deleteDebt(id) {
    await api.finance.deleteDebt(id);
    Toast.show('Borç silindi', 'success');
    await this.afterFinanceChange();
  },

  async renderBudgetSetup(container) {
    const [budget, recurrings, categorySpending] = await Promise.all([
      api.finance.getBudget(getCurrentMonth()),
      api.finance.getRecurrings(),
      api.finance.getCategorySpending(getCurrentMonth())
    ]);

    const periodLabel = (r) => {
      if (r.period === 'monthly') return `Her ayın ${r.day_of_month}. günü`;
      const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
      return `Her ${days[r.day_of_week] || 'hafta'}`;
    };

    container.innerHTML = `
      <div class="card">
        <div class="card-title">Aylık Bütçe Ayarla — ${getCurrentMonth()}</div>
        <div class="form-group">
          <label class="form-label">Aylık Gelir (₺)</label>
          <input type="number" class="form-input" id="budget-income" value="${budget?.total_income || ''}" step="0.01" placeholder="Maaş + ek gelirler">
        </div>
        <div class="form-group">
          <label class="form-label">Sabit Giderler (₺)</label>
          <input type="number" class="form-input" id="budget-fixed" value="${budget?.fixed_expenses || ''}" step="0.01" placeholder="Kira, faturalar, abonelikler...">
        </div>
        <div class="form-group">
          <label class="form-label">Tasarruf Hedefi (₺)</label>
          <input type="number" class="form-input" id="budget-savings" value="${budget?.savings_goal || ''}" step="0.01" placeholder="Bu ay biriktirmek istediğin">
        </div>
        <button class="btn btn-primary" onclick="FinancePage.saveBudget()">Bütçeyi Kaydet</button>
      </div>

      <!-- Category Budgets -->
      <div class="card mt-20">
        <div class="flex-between mb-16">
          <div class="card-title" style="margin:0;">${icon('bar-chart-2', 14)} Kategori Bütçeleri</div>
          <button class="btn btn-ghost btn-sm" onclick="FinancePage.showCategoryBudgetModal()">+ Ekle</button>
        </div>
        ${categorySpending.length > 0 ? `
          <div style="display:flex; flex-direction:column; gap:12px;">
            ${categorySpending.map(cs => {
              const color = cs.percent > 90 ? 'var(--danger)' : cs.percent > 70 ? 'var(--warning)' : 'var(--success)';
              return `
                <div style="padding:10px 0; border-bottom:1px solid var(--border);">
                  <div class="flex-between" style="margin-bottom:6px;">
                    <span class="font-bold">${this.getCategoryLabel(cs.category)}</span>
                    <div style="display:flex; align-items:center; gap:8px;">
                      <span class="text-sm">${formatMoney(cs.spent)} / ${formatMoney(cs.budget_limit)}</span>
                      <button class="btn btn-ghost btn-sm" style="padding:2px 6px; font-size:11px;" onclick="FinancePage.removeCategoryBudget('${cs.category}')">✕</button>
                    </div>
                  </div>
                  <div class="progress-bar" style="height:8px;">
                    <div class="progress-fill" style="width:${cs.percent}%; background:${color};"></div>
                  </div>
                  <div class="text-sm text-muted" style="margin-top:4px;">Kalan: ${formatMoney(cs.remaining)} (${cs.percent}%)</div>
                </div>
              `;
            }).join('')}
          </div>
        ` : `
          <div class="text-sm text-muted" style="padding:16px 0;">
            Kategori bütçesi eklenmemiş. Her kategoriye ayrı limit koyarak harcamalarını kontrol et!
          </div>
        `}
      </div>

      <!-- Recurring Transactions -->
      <div class="card mt-20">
        <div class="flex-between mb-16">
          <div class="card-title" style="margin:0;">🔁 Tekrarlayan İşlemler</div>
          <button class="btn btn-ghost btn-sm" onclick="FinancePage.showAddRecurringModal()">+ Ekle</button>
        </div>

        ${recurrings.length > 0 ? `
          <div class="table-container">
            <table>
              <thead>
                <tr><th>Tür</th><th>Kategori</th><th>Açıklama</th><th>Tutar</th><th>Sıklık</th><th></th></tr>
              </thead>
              <tbody>
                ${recurrings.map(r => `
                  <tr>
                    <td><span class="tag tag-${r.type}">${r.type === 'income' ? 'Gelir' : 'Gider'}</span></td>
                    <td>${this.getCategoryLabel(r.category)}</td>
                    <td>${r.description || '—'}</td>
                    <td class="font-bold ${r.type === 'income' ? 'text-success' : 'text-danger'}">${r.type === 'income' ? '+' : '-'}${formatMoney(r.amount)}</td>
                    <td class="text-muted text-sm">${periodLabel(r)}</td>
                    <td><button class="btn btn-ghost btn-sm" onclick="FinancePage.deleteRecurring(${r.id})">${icon('trash-2', 14)}</button></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : `
          <div class="text-sm text-muted" style="padding:16px 0;">
            Henüz tekrarlayan işlem yok. Maaş, kira, abonelik gibi sabit ödemeler için ekle!
          </div>
        `}
      </div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  async saveBudget() {
    const income = parseFloat(document.getElementById('budget-income').value);
    const fixed = parseFloat(document.getElementById('budget-fixed').value);
    const savings = parseFloat(document.getElementById('budget-savings').value) || 0;

    if (!income) { Toast.show('Gelir girilmeli!', 'error'); return; }

    await api.finance.setBudget({
      month: getCurrentMonth(),
      total_income: income,
      fixed_expenses: fixed || 0,
      savings_goal: savings
    });

    Toast.show('Bütçe kaydedildi! Günlük limitin hesaplandı.', 'success');
    await this.afterFinanceChange();
  },

  showAddRecurringModal() {
    showModal('Tekrarlayan İşlem Ekle', `
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Tür</label>
          <select class="form-select" id="rec-type" onchange="FinancePage.updateRecurringCategories()">
            <option value="expense">Gider</option>
            <option value="income">Gelir</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Tutar (₺)</label>
          <input type="number" class="form-input" id="rec-amount" step="0.01" placeholder="0.00">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Kategori</label>
        <select class="form-select" id="rec-category">
          <option value="kira">🏠 Kira</option>
          <option value="fatura">📱 Fatura</option>
          <option value="market">🛒 Market</option>
          <option value="eglence">🎮 Eğlence</option>
          <option value="egitim">📚 Eğitim</option>
          <option value="saglik">💊 Sağlık</option>
          <option value="diger">📦 Diğer</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Açıklama</label>
        <input type="text" class="form-input" id="rec-desc" placeholder="Örn: Netflix, Elektrik faturası">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Tekrar</label>
          <select class="form-select" id="rec-period" onchange="FinancePage.toggleRecurringDay()">
            <option value="monthly">Aylık</option>
            <option value="weekly">Haftalık</option>
          </select>
        </div>
        <div class="form-group" id="rec-day-group">
          <label class="form-label">Her ayın kaçında?</label>
          <input type="number" class="form-input" id="rec-day" value="1" min="1" max="28">
        </div>
        <div class="form-group" id="rec-weekday-group" style="display:none;">
          <label class="form-label">Hangi gün?</label>
          <select class="form-select" id="rec-weekday">
            <option value="1">Pazartesi</option>
            <option value="2">Salı</option>
            <option value="3">Çarşamba</option>
            <option value="4">Perşembe</option>
            <option value="5">Cuma</option>
            <option value="6">Cumartesi</option>
            <option value="0">Pazar</option>
          </select>
        </div>
      </div>
    `, async (overlay) => {
      const amount = parseFloat(document.getElementById('rec-amount').value);
      if (!amount || amount <= 0) { Toast.show('Geçerli tutar gir!', 'error'); return; }

      const period = document.getElementById('rec-period').value;
      await api.finance.addRecurring({
        type: document.getElementById('rec-type').value,
        amount,
        category: document.getElementById('rec-category').value,
        description: document.getElementById('rec-desc').value,
        period,
        day_of_month: period === 'monthly' ? parseInt(document.getElementById('rec-day').value) : null,
        day_of_week: period === 'weekly' ? parseInt(document.getElementById('rec-weekday').value) : null,
      });

      overlay.remove();
      Toast.show('Tekrarlayan işlem eklendi!', 'success');
      await this.afterFinanceChange();
    });
  },

  toggleRecurringDay() {
    const period = document.getElementById('rec-period')?.value;
    const dayGroup = document.getElementById('rec-day-group');
    const weekdayGroup = document.getElementById('rec-weekday-group');
    if (dayGroup) dayGroup.style.display = period === 'monthly' ? '' : 'none';
    if (weekdayGroup) weekdayGroup.style.display = period === 'weekly' ? '' : 'none';
  },

  async deleteRecurring(id) {
    if (!confirm('Bu tekrarlayan işlemi silmek istediğine emin misin?')) return;
    await api.finance.deleteRecurring(id);
    Toast.show('Tekrarlayan işlem silindi', 'success');
    await this.afterFinanceChange();
  },

  // ============ SUBSCRIPTIONS ============
  async renderSubscriptions(container) {
    const [subs, totals] = await Promise.all([
      api.finance.getSubscriptions(),
      api.finance.getSubscriptionTotal()
    ]);

    container.innerHTML = `
      <div class="flex-between mb-16">
        <div class="card-title" style="margin:0;">Abonelik Yönetimi</div>
        <button class="btn btn-primary btn-sm" onclick="FinancePage.showAddSubscriptionModal()">+ Abonelik Ekle</button>
      </div>

      <!-- Summary -->
      <div class="grid-2 mb-16">
        <div class="card" style="text-align:center;">
          <div class="card-title">Aylık Abonelik Yükü</div>
          <div class="card-value text-danger" style="font-size:28px;">${formatMoney(totals.monthly)}</div>
        </div>
        <div class="card" style="text-align:center;">
          <div class="card-title">Yıllık Maliyet</div>
          <div class="card-value text-warning" style="font-size:28px;">${formatMoney(totals.yearly)}</div>
        </div>
      </div>

      ${subs.length > 0 ? `
        <div class="grid-2">
          ${subs.map(s => `
            <div class="card" style="border-left: 4px solid var(--accent);">
              <div class="flex-between mb-8">
                <div>
                  <span class="font-bold" style="font-size:16px;">${s.service_name || s.description || 'Abonelik'}</span>
                  <span class="text-sm text-muted" style="margin-left:8px;">${this.getCategoryLabel(s.category)}</span>
                </div>
                <button class="btn btn-ghost btn-sm" onclick="FinancePage.deleteSubscription(${s.id})">${icon('trash-2', 14)}</button>
              </div>
              <div class="flex-between">
                <span class="card-value text-danger" style="font-size:20px;">${formatMoney(s.amount)}<span class="text-sm text-muted">/ay</span></span>
                <span class="text-sm text-muted">Her ayın ${s.day_of_month}. günü</span>
              </div>
            </div>
          `).join('')}
        </div>
      ` : `
        <div class="empty-state">
          <div class="empty-state-icon">📺</div>
          <div class="empty-state-text">Henüz abonelik eklenmemiş. Netflix, Spotify gibi aboneliklerini ekle!</div>
        </div>
      `}
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  showAddSubscriptionModal() {
    showModal('Abonelik Ekle', `
      <div class="form-group">
        <label class="form-label">Servis Adı</label>
        <input type="text" class="form-input" id="sub-name" placeholder="Örn: Netflix, Spotify, YouTube Premium">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Aylık Ücret (₺)</label>
          <input type="number" class="form-input" id="sub-amount" step="0.01" min="0.01" placeholder="0.00">
        </div>
        <div class="form-group">
          <label class="form-label">Ödeme Günü</label>
          <input type="number" class="form-input" id="sub-day" value="1" min="1" max="28">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Kategori</label>
        <select class="form-select" id="sub-category">
          <option value="eglence">🎮 Eğlence</option>
          <option value="egitim">📚 Eğitim</option>
          <option value="fatura">📱 Dijital Servis</option>
          <option value="saglik">💊 Sağlık</option>
          <option value="diger">📦 Diğer</option>
        </select>
      </div>
    `, async (overlay) => {
      const name = document.getElementById('sub-name').value.trim();
      const amount = parseFloat(document.getElementById('sub-amount').value);
      if (!name) { Toast.show('Servis adı gir!', 'error'); return; }
      if (!amount || amount <= 0) { Toast.show('Geçerli bir tutar gir!', 'error'); return; }

      await api.finance.addSubscription({
        service_name: name,
        amount,
        category: document.getElementById('sub-category').value,
        day_of_month: parseInt(document.getElementById('sub-day').value) || 1
      });
      overlay.remove();
      Toast.show(`${name} aboneliği eklendi!`, 'success');
      await this.afterFinanceChange();
    });
  },

  async deleteSubscription(id) {
    if (!confirm('Bu aboneliği silmek istediğine emin misin?')) return;
    await api.finance.deleteRecurring(id);
    Toast.show('Abonelik silindi', 'success');
    await this.afterFinanceChange();
  },

  // ============ CATEGORY BUDGETS ============
  showCategoryBudgetModal() {
    showModal('Kategori Bütçesi Ekle', `
      <div class="form-group">
        <label class="form-label">Kategori</label>
        <select class="form-select" id="catbudget-category">
          <option value="yemek">🍔 Yemek</option>
          <option value="ulasim">🚌 Ulaşım</option>
          <option value="market">🛒 Market</option>
          <option value="eglence">🎮 Eğlence</option>
          <option value="fatura">📱 Fatura</option>
          <option value="saglik">💊 Sağlık</option>
          <option value="giyim">👕 Giyim</option>
          <option value="egitim">📚 Eğitim</option>
          <option value="kira">🏠 Kira</option>
          <option value="diger">📦 Diğer</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Aylık Limit (₺)</label>
        <input type="number" class="form-input" id="catbudget-limit" step="0.01" min="1" placeholder="Örn: 500">
      </div>
    `, async (overlay) => {
      const category = document.getElementById('catbudget-category').value;
      const limit = parseFloat(document.getElementById('catbudget-limit').value);
      if (!limit || limit <= 0) { Toast.show('Geçerli bir limit gir!', 'error'); return; }
      await api.finance.setCategoryBudget(getCurrentMonth(), category, limit);
      overlay.remove();
      Toast.show(`${this.getCategoryLabel(category)} bütçesi ayarlandı!`, 'success');
      await this.afterFinanceChange();
    });
  },

  async removeCategoryBudget(category) {
    if (!confirm('Bu kategori bütçesini silmek istediğine emin misin?')) return;
    await api.finance.deleteCategoryBudget(getCurrentMonth(), category);
    Toast.show('Kategori bütçesi silindi', 'success');
    await this.afterFinanceChange();
  },

  // ============ KUMBARA (SAVINGS GOALS) ============
  async renderKumbara(container) {
    const goals = await api.savings.getGoals();
    const active = goals.filter(g => !g.is_completed);
    const completed = goals.filter(g => g.is_completed);

    // Fetch estimated completion for active goals
    const estimates = {};
    await Promise.all(active.map(async g => {
      estimates[g.id] = await api.savings.getEstimatedCompletion(g.id);
    }));

    container.innerHTML = `
      <div class="flex-between mb-16">
        <div class="card-title" style="margin:0;">Tasarruf Hedefleri</div>
        <button class="btn btn-primary btn-sm" onclick="FinancePage.showAddGoalModal()">+ Yeni Hedef</button>
      </div>

      ${active.length > 0 ? `
        <div class="grid-2">
          ${active.map(g => {
            const pct = Math.min(100, Math.round((g.current_amount / g.target_amount) * 100));
            const progressColor = pct < 30 ? 'var(--danger)' : pct < 70 ? 'var(--warning)' : 'var(--success)';
            const est = estimates[g.id];
            const estText = est && est.months !== null && est.months !== undefined
              ? (est.months === 0 ? 'Hedefe ulaşıldı!' : `~${est.months} ay kaldı`)
              : (est && est.message ? est.message : '');
            return `
              <div class="card savings-goal-card" style="border-left: 4px solid ${g.color};">
                <div class="flex-between mb-16">
                  <div>
                    <span style="font-size:24px; margin-right:8px;">${g.icon}</span>
                    <span class="font-bold" style="font-size:18px;">${g.name}</span>
                  </div>
                  <button class="btn btn-ghost btn-sm" onclick="FinancePage.deleteSavingsGoal(${g.id})">${icon('trash-2', 14)}</button>
                </div>
                <div class="flex-between text-sm mb-8">
                  <span>${formatMoney(g.current_amount)}</span>
                  <span class="text-muted">${formatMoney(g.target_amount)}</span>
                </div>
                <div class="progress-bar" style="height:12px;">
                  <div class="progress-fill" style="width:${pct}%; background:${progressColor};"></div>
                </div>
                <div class="flex-between mt-8">
                  <span class="text-sm text-muted">${pct}% tamamlandı${estText ? ` • ${estText}` : ''}</span>
                  <button class="btn btn-success btn-sm" onclick="FinancePage.showDepositModal(${g.id}, ${g.target_amount - g.current_amount})">+ Para Yatır</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : `
        <div class="empty-state">
          <div class="empty-state-icon">🐷</div>
          <div class="empty-state-text">Henüz tasarruf hedefi yok. Biriktirmeye başla!</div>
        </div>
      `}

      ${completed.length > 0 ? `
        <div class="card-title mt-20" style="color: var(--success);">Tamamlanan Hedefler</div>
        <div class="grid-2">
          ${completed.map(g => `
            <div class="card" style="border-left: 4px solid var(--success); opacity:0.8;">
              <div class="flex-between">
                <div>
                  <span style="font-size:20px; margin-right:8px;">${g.icon}</span>
                  <span class="font-bold">${g.name}</span>
                  <span class="tag tag-income" style="margin-left:8px;">Tamamlandı!</span>
                </div>
                <span class="text-sm text-muted">${formatMoney(g.target_amount)}</span>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  showAddGoalModal() {
    const icons = ['🎯', '📱', '🏠', '🚗', '✈️', '💻', '🎓', '💍', '🏖️', '🎁'];
    showModal('Yeni Tasarruf Hedefi', `
      <div class="form-group">
        <label class="form-label">Hedef Adı</label>
        <input type="text" class="form-input" id="goal-name" placeholder="Örn: Yeni Telefon, Tatil">
      </div>
      <div class="form-group">
        <label class="form-label">Hedef Tutar (₺)</label>
        <input type="number" class="form-input" id="goal-amount" step="0.01" placeholder="15000">
      </div>
      <div class="form-group">
        <label class="form-label">İkon</label>
        <div id="goal-icons-container" style="display:flex; gap:8px; flex-wrap:wrap;">
          ${icons.map((ic, i) => `
            <div class="theme-swatch ${i === 0 ? 'active' : ''}" style="width:40px; height:40px; font-size:20px; cursor:pointer;"
              onclick="document.querySelectorAll('#goal-icons-container .theme-swatch').forEach(s=>s.classList.remove('active')); this.classList.add('active'); document.getElementById('goal-icon-val').value='${ic}';">${ic}</div>
          `).join('')}
        </div>
        <input type="hidden" id="goal-icon-val" value="🎯">
      </div>
    `, async (overlay) => {
      const name = document.getElementById('goal-name').value;
      const amount = parseFloat(document.getElementById('goal-amount').value);
      if (!name || !amount || amount <= 0) { Toast.show('Ad ve tutar gerekli!', 'error'); return; }

      await api.savings.addGoal({
        name,
        target_amount: amount,
        icon: document.getElementById('goal-icon-val').value
      });

      overlay.remove();
      SoundManager.play('xpGain');
      Toast.show('Tasarruf hedefi oluşturuldu! +5 XP', 'xp');
      await this.afterFinanceChange();
    });
  },

  showDepositModal(goalId, remaining) {
    showModal('Para Yatır', `
      <div class="form-group">
        <label class="form-label">Yatırılacak Tutar (₺)</label>
        <input type="number" class="form-input" id="deposit-amount" step="0.01" placeholder="Kalan: ${formatMoney(remaining)}">
      </div>
    `, async (overlay) => {
      const amount = parseFloat(document.getElementById('deposit-amount').value);
      if (!amount || amount <= 0) { Toast.show('Geçerli tutar gir!', 'error'); return; }

      const result = await api.savings.deposit(goalId, amount);
      if (result) {
        overlay.remove();
        SoundManager.play('deposit');
        Toast.show(`${formatMoney(amount)} yatırıldı! +${result.xp} XP`, 'xp');
        if (result.completed) {
          SoundManager.play('achievementUnlock');
          Toast.show('Hedef tamamlandı! Tebrikler!', 'levelup');
        }
        await this.afterFinanceChange();
      }
    });
  },

  async deleteSavingsGoal(id) {
    if (!confirm('Bu tasarruf hedefini silmek istediğine emin misin?')) return;
    await api.savings.deleteGoal(id);
    Toast.show('Hedef silindi', 'success');
    await this.afterFinanceChange();
  },

  getCategoryLabel(cat) {
    const labels = {
      maas: '💼 Maaş', ek_gelir: '💵 Ek Gelir', freelance: '💻 Freelance', yatirim: '📈 Yatırım',
      yemek: '🍔 Yemek', ulasim: '🚌 Ulaşım', market: '🛒 Market', eglence: '🎮 Eğlence',
      fatura: '📱 Fatura', saglik: '💊 Sağlık', giyim: '👕 Giyim', kira: '🏠 Kira',
      egitim: '📚 Eğitim', diger: '📦 Diğer'
    };
    return labels[cat] || cat;
  }
};
