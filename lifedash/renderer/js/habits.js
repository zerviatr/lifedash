// ============ HABITS PAGE ============
const HabitsPage = {
  currentTab: 'habits',
  statsViewMode: 'list',
  expandedStatId: null,

  async render(container) {
    container.innerHTML = `
      <div class="page-header">
        <div class="flex-between">
          <div>
            <h1 class="page-title">Alışkanlıklar</h1>
            <p class="page-subtitle">Günlük alışkanlıklarını takip et ve XP kazan</p>
          </div>
          <button class="btn btn-primary" onclick="HabitsPage.showAddModal()">+ Yeni Alışkanlık</button>
        </div>
      </div>

      <div class="tab-bar">
        <button class="tab-btn ${this.currentTab === 'habits' ? 'active' : ''}" data-tab="habits" onclick="HabitsPage.switchTab('habits')">📋 Alışkanlıklar</button>
        <button class="tab-btn ${this.currentTab === 'stats' ? 'active' : ''}" data-tab="stats" onclick="HabitsPage.switchTab('stats')">📊 İstatistikler</button>
      </div>

      <div id="habits-content"></div>
    `;

    await this.renderTab(this.currentTab);
  },

  async switchTab(tab) {
    this.currentTab = tab;
    document.querySelectorAll('.tab-btn[data-tab]').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tab);
    });
    await this.renderTab(tab);
  },

  async renderTab(tab) {
    const content = document.getElementById('habits-content');
    if (!content) return;
    if (tab === 'habits') await this.renderHabits(content);
    else await this.renderStats(content);
  },

  async renderHabits(container) {
    const habits = await api.habits.getHabits();

    container.innerHTML = `
      ${habits.length > 0 ? `
        <div class="grid-2 mt-16">
          ${habits.map(h => `
            <div class="habit-item ${h.completedToday ? 'done' : ''}" onclick="HabitsPage.toggle(${h.id})">
              <div class="habit-check" style="${h.completedToday ? '' : `border-color: ${h.color}`}">
                ${h.completedToday ? '✓' : h.icon}
              </div>
              <div style="flex:1;">
                <div class="habit-name">${h.name}</div>
                <div class="habit-streak">${h.streak > 0 ? `🔥 ${h.streak} gün seri` : 'Henüz seri yok'}</div>
              </div>
              <div class="habit-xp">+${h.xp_reward} XP</div>
              <button class="btn btn-ghost btn-sm" style="margin-left:4px;font-size:12px;" onclick="event.stopPropagation(); HabitsPage.deleteHabit(${h.id})">🗑️</button>
            </div>
          `).join('')}
        </div>
      ` : `
        <div class="empty-state mt-16">
          <div class="empty-state-icon">🎯</div>
          <div class="empty-state-text">Henüz alışkanlık eklenmemiş. Hadi başla!</div>
        </div>
      `}

      <!-- Suggested Habits -->
      <div class="card mt-20">
        <div class="card-title">Önerilen Alışkanlıklar</div>
        <div class="grid-3">
          ${this.getSuggestions().map(s => `
            <div class="habit-item" onclick="HabitsPage.addSuggested('${s.name}', '${s.icon}', '${s.color}')" style="cursor:pointer;">
              <div class="habit-check" style="border-color: ${s.color}; font-size:18px;">${s.icon}</div>
              <div>
                <div class="habit-name">${s.name}</div>
                <div class="habit-streak text-muted">Eklemek için tıkla</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  async renderStats(container) {
    const habits = await api.habits.getHabits();

    if (habits.length === 0) {
      container.innerHTML = `
        <div class="empty-state mt-16">
          <div class="empty-state-icon">📊</div>
          <div class="empty-state-text">İstatistik için önce alışkanlık ekle!</div>
        </div>
      `;
      return;
    }

    // Load stats for all habits
    const statsArr = await Promise.all(habits.map(h => api.habits.getHabitStats(h.id)));

    const dayLabels = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

    container.innerHTML = `
      <div class="flex-between" style="margin-top:16px; margin-bottom:16px;">
        <div class="text-sm text-muted">${habits.length} Alışkanlık İstatistiği</div>
        <button class="btn btn-ghost btn-sm" onclick="HabitsPage.toggleStatsView()">
          ${this.statsViewMode === 'grid' ? 'Geniş Görünüme Geç' : 'Küçült (Izgara Görünümü)'}
        </button>
      </div>

      <div class="${this.statsViewMode === 'grid' ? 'grid-2' : ''}">
        ${habits.map((h, i) => {
          const s = statsArr[i];
          const mostSkipped = s.mostSkippedDay !== null ? dayLabels[s.mostSkippedDay] : '—';
          const isExpanded = this.expandedStatId === h.id;

          return `
            <div class="card mb-16" style="cursor:pointer; transition: all 0.3s ease; ${isExpanded ? `border-color:${h.color}; box-shadow: 0 0 20px ${h.color}33;` : ''}" onclick="HabitsPage.toggleExpandStat(${h.id})">
              <div class="flex-between" style="flex-wrap:wrap; gap:12px;">
                <div style="display:flex; align-items:center; gap:10px;">
                  <div style="font-size:24px; width:36px; height:36px; background:${h.color}22; border-radius:8px; display:flex; align-items:center; justify-content:center;">${h.icon}</div>
                  <div>
                    <div class="font-bold" style="font-size:16px;">${h.name}</div>
                    <div class="text-sm text-muted">Son 28 gün</div>
                  </div>
                </div>
                <div style="display:flex; gap:16px; text-align:center; align-items:center;">
                  <div>
                    <div class="font-bold text-success" style="font-size:20px;">${s.completionRate}%</div>
                    <div class="text-sm text-muted">Tamamlanma</div>
                  </div>
                  <div>
                    <div class="font-bold text-accent" style="font-size:20px;">${s.bestStreak}</div>
                    <div class="text-sm text-muted">En uzun seri</div>
                  </div>
                  <div>
                    <div class="font-bold" style="font-size:20px;">${s.totalCompleted}</div>
                    <div class="text-sm text-muted">Toplam gün</div>
                  </div>
                  <div style="font-size:16px; color:var(--text-muted); transition:transform 0.3s; transform:rotate(${isExpanded ? '180' : '0'}deg);">▼</div>
                </div>
              </div>

              ${isExpanded ? `
              <div style="margin-top:16px; animation: slideUp 0.25s ease;">
                <!-- Heatmap -->
                <div style="margin-bottom:8px;">
                  <div style="display:grid; grid-template-columns:repeat(7,1fr); gap:2px; margin-bottom:4px;">
                    ${dayLabels.map(d => `<div style="text-align:center; font-size:10px; color:var(--text-muted);">${d}</div>`).join('')}
                  </div>
                  <div class="habit-heat-grid">
                    ${s.days.map(d => {
                      const isToday = d.date === getTodayStr();
                      return `<div class="heat-cell ${d.completed ? 'completed' : ''} ${isToday ? 'today' : ''}" title="${d.date}"></div>`;
                    }).join('')}
                  </div>
                </div>

                ${s.mostSkippedDay !== null && s.totalCompleted < 28 ? `
                  <div class="text-sm text-muted" style="margin-top:8px;">
                    En çok atlanan gün: <span class="font-bold" style="color:var(--warning);">${mostSkipped}</span>
                  </div>
                ` : ''}
              </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  toggleStatsView() {
    this.statsViewMode = this.statsViewMode === 'grid' ? 'list' : 'grid';
    this.renderTab('stats');
  },

  toggleExpandStat(habitId) {
    this.expandedStatId = this.expandedStatId === habitId ? null : habitId;
    this.renderTab('stats');
  },

  getSuggestions() {
    return [
      { name: '2L Su İç', icon: '💧', color: '#06b6d4' },
      { name: '30dk Egzersiz', icon: '💪', color: '#22c55e' },
      { name: '8 Saat Uyku', icon: '😴', color: '#8b5cf6' },
      { name: 'Kitap Oku', icon: '📖', color: '#f59e0b' },
      { name: 'Meditasyon', icon: '🧘', color: '#ec4899' },
      { name: 'Günlük Yaz', icon: '📝', color: '#6366f1' },
    ];
  },

  async toggle(habitId) {
    const result = await api.habits.toggleHabit(habitId);
    if (result.completed) {
      Toast.show('Alışkanlık tamamlandı! +XP', 'xp');
    }
    await App.loadUserStats();
    if (this.currentTab === 'habits') {
      await this.renderTab('habits');
    }
  },

  async deleteHabit(id) {
    if (!confirm('Bu alışkanlığı silmek istediğine emin misin?')) return;
    await api.habits.deleteHabit(id);
    Toast.show('Alışkanlık silindi', 'success');
    await this.renderTab(this.currentTab);
  },

  showAddModal() {
    showModal('Yeni Alışkanlık', `
      <div class="form-group">
        <label class="form-label">Alışkanlık Adı</label>
        <input type="text" class="form-input" id="habit-name" placeholder="Örn: 2L Su İç">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">İkon</label>
          <input type="text" class="form-input" id="habit-icon" value="✓" maxlength="4">
        </div>
        <div class="form-group">
          <label class="form-label">Renk</label>
          <input type="color" class="form-input" id="habit-color" value="#6366f1" style="height:42px;padding:4px;">
        </div>
        <div class="form-group">
          <label class="form-label">XP Ödülü</label>
          <input type="number" class="form-input" id="habit-xp" value="5" min="1" max="50">
        </div>
      </div>
    `, async (overlay) => {
      const name = document.getElementById('habit-name').value;
      if (!name) { Toast.show('İsim gerekli!', 'error'); return; }

      await api.habits.addHabit({
        name,
        icon: document.getElementById('habit-icon').value || '✓',
        color: document.getElementById('habit-color').value,
        xp_reward: parseInt(document.getElementById('habit-xp').value) || 5
      });

      overlay.remove();
      Toast.show('Alışkanlık eklendi!', 'success');
      await this.renderTab(this.currentTab);
    });
  },

  async addSuggested(name, icon, color) {
    await api.habits.addHabit({ name, icon, color, xp_reward: 5 });
    Toast.show(`"${name}" eklendi!`, 'success');
    await this.renderTab(this.currentTab);
  }
};
