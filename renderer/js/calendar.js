// ============ CALENDAR PAGE ============
const CalendarPage = {
  currentMonth: null,

  async render(container) {
    container.innerHTML = Skeleton.card(4);

    const now = new Date();
    this.currentMonth = this.currentMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const [year, month] = this.currentMonth.split('-').map(Number);
    const monthName = new Date(year, month - 1).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
    const daysData = await api.calendar.getMonthSummary(this.currentMonth);

    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDay = new Date(year, month - 1, 1).getDay();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1; // Monday start
    const todayStr = new Date().toISOString().split('T')[0];

    const dayNames = ['Pzt', 'Sal', 'Car', 'Per', 'Cum', 'Cmt', 'Paz'];
    const moodEmojis = { 1: '😢', 2: '😕', 3: '😐', 4: '🙂', 5: '😄' };

    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">${icon('calendar', 14)} Takvim</h1>
        <p class="page-subtitle">Aylik aktivite gorunumu</p>
      </div>

      <div class="card mb-16">
        <div class="flex-between mb-16">
          <button class="btn btn-ghost btn-sm" onclick="CalendarPage.changeMonth(-1)">${icon('chevron-left', 14)} Onceki</button>
          <div class="font-bold" style="font-size:18px; text-transform:capitalize;">${monthName}</div>
          <button class="btn btn-ghost btn-sm" onclick="CalendarPage.changeMonth(1)">Sonraki ${icon('chevron-right', 14)}</button>
        </div>

        <div style="display:grid; grid-template-columns:repeat(7,1fr); gap:4px;">
          ${dayNames.map(d => `<div style="text-align:center; font-size:12px; font-weight:600; color:var(--text-muted); padding:4px;">${d}</div>`).join('')}
          ${Array(startOffset).fill('').map(() => '<div></div>').join('')}
          ${Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dateStr = `${this.currentMonth}-${String(day).padStart(2, '0')}`;
            const data = daysData[dateStr];
            const isToday = dateStr === todayStr;
            const isFuture = dateStr > todayStr;

            let bgColor = 'var(--bg-input)';
            let borderStyle = '';
            if (data && !isFuture) {
              if (data.score >= 70) bgColor = 'rgba(34,197,94,0.15)';
              else if (data.score >= 40) bgColor = 'rgba(245,158,11,0.15)';
              else if (data.score > 0) bgColor = 'rgba(239,68,68,0.1)';
            }
            if (isToday) borderStyle = 'border:2px solid var(--accent);';

            return `
              <div class="calendar-day" style="background:${bgColor}; ${borderStyle} border-radius:8px; padding:6px 4px; min-height:72px; cursor:${data ? 'pointer' : 'default'}; opacity:${isFuture ? '0.3' : '1'};"
                ${data ? `onclick="CalendarPage.showDayDetail('${dateStr}')"` : ''}>
                <div style="font-size:12px; font-weight:${isToday ? '700' : '400'}; color:${isToday ? 'var(--accent)' : 'var(--text-secondary)'}; margin-bottom:2px;">${day}</div>
                ${data ? `
                  <div style="font-size:10px; line-height:1.4;">
                    ${data.mood ? `<div>${moodEmojis[data.mood] || ''}</div>` : ''}
                    ${data.tasksTotal > 0 ? `<div style="color:${data.tasksCompleted === data.tasksTotal ? '#22c55e' : '#f59e0b'};">⚔${data.tasksCompleted}/${data.tasksTotal}</div>` : ''}
                    ${data.pomodoros > 0 ? `<div style="color:#ef4444;">🍅${data.pomodoros}</div>` : ''}
                    ${data.expense > 0 ? `<div style="color:#f97316;">-${Math.round(data.expense)}</div>` : ''}
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Legend -->
      <div class="card mb-16">
        <div class="card-title">Renk Kodlari</div>
        <div style="display:flex; gap:16px; flex-wrap:wrap;">
          <div style="display:flex; align-items:center; gap:6px;">
            <div style="width:16px; height:16px; border-radius:4px; background:rgba(34,197,94,0.15); border:1px solid rgba(34,197,94,0.3);"></div>
            <span class="text-sm">Iyi gun (70+)</span>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <div style="width:16px; height:16px; border-radius:4px; background:rgba(245,158,11,0.15); border:1px solid rgba(245,158,11,0.3);"></div>
            <span class="text-sm">Orta (40-69)</span>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <div style="width:16px; height:16px; border-radius:4px; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3);"></div>
            <span class="text-sm">Dusuk (1-39)</span>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <div style="width:16px; height:16px; border-radius:4px; background:var(--bg-input); border:1px solid var(--border);"></div>
            <span class="text-sm">Veri yok</span>
          </div>
        </div>
      </div>

      <!-- Day Detail Popup -->
      <div id="calendar-day-detail"></div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  changeMonth(offset) {
    const [year, month] = this.currentMonth.split('-').map(Number);
    const d = new Date(year, month - 1 + offset, 1);
    this.currentMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    this.render(document.getElementById('content'));
  },

  async showDayDetail(dateStr) {
    const data = (await api.calendar.getMonthSummary(dateStr.slice(0, 7)))[dateStr];
    if (!data) return;

    const moodEmojis = { 1: '😢', 2: '😕', 3: '😐', 4: '🙂', 5: '😄' };
    const dateLabel = new Date(dateStr + 'T00:00:00').toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" style="max-width:420px;">
        <div class="modal-header">
          <h3 class="modal-title" style="text-transform:capitalize;">${dateLabel}</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
        </div>
        <div class="modal-body">
          ${data.mood ? `<div class="mb-8" style="font-size:24px; text-align:center;">${moodEmojis[data.mood]} Mood: ${data.mood}/5</div>` : ''}
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <div style="text-align:center; padding:12px; background:var(--bg-input); border-radius:var(--radius-sm);">
              <div class="font-bold" style="color:${data.tasksCompleted === data.tasksTotal && data.tasksTotal > 0 ? '#22c55e' : '#f59e0b'};">${data.tasksCompleted}/${data.tasksTotal}</div>
              <div class="text-sm text-muted">Gorevler</div>
            </div>
            <div style="text-align:center; padding:12px; background:var(--bg-input); border-radius:var(--radius-sm);">
              <div class="font-bold" style="color:#6366f1;">${data.habitsCompleted}</div>
              <div class="text-sm text-muted">Aliskanlik</div>
            </div>
            <div style="text-align:center; padding:12px; background:var(--bg-input); border-radius:var(--radius-sm);">
              <div class="font-bold" style="color:#ef4444;">${data.pomodoros}</div>
              <div class="text-sm text-muted">Pomodoro</div>
            </div>
            <div style="text-align:center; padding:12px; background:var(--bg-input); border-radius:var(--radius-sm);">
              <div class="font-bold" style="color:#f59e0b;">+${data.xpEarned}</div>
              <div class="text-sm text-muted">XP</div>
            </div>
          </div>
          <div style="margin-top:12px; display:flex; justify-content:space-between; padding:8px 12px; background:var(--bg-input); border-radius:var(--radius-sm);">
            <div><span class="text-sm text-muted">Gelir:</span> <span class="text-success font-bold">${formatMoney(data.income)}</span></div>
            <div><span class="text-sm text-muted">Gider:</span> <span class="text-danger font-bold">${formatMoney(data.expense)}</span></div>
          </div>
          <div style="margin-top:12px; text-align:center;">
            <div class="text-sm text-muted">Gun Puani</div>
            <div class="font-bold" style="font-size:24px; color:${data.score >= 70 ? '#22c55e' : data.score >= 40 ? '#f59e0b' : '#ef4444'};">${data.score}/100</div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  }
};
