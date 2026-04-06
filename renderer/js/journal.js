// ============ JOURNAL PAGE ============
const JournalPage = {
  selectedDate: null,

  async render(container) {
    container.innerHTML = Skeleton.card(4);

    this.selectedDate = this.selectedDate || getTodayStr();
    const [entry, entries, moodTrend] = await Promise.all([
      api.journal.getEntry(this.selectedDate),
      api.journal.getEntries(),
      api.journal.getMoodTrend(30)
    ]);

    const moodEmojis = ['', '\u{1F622}', '\u{1F615}', '\u{1F610}', '\u{1F642}', '\u{1F604}'];
    const moodLabels = ['', 'Kotu', 'Eh', 'Normal', 'Iyi', 'Harika'];
    const currentMood = entry ? entry.mood : 3;
    const currentContent = entry ? entry.content : '';
    const currentTags = entry ? (typeof entry.tags === 'string' ? JSON.parse(entry.tags || '[]') : entry.tags || []) : [];

    container.innerHTML = `
      <div class="page-header">
        <div class="flex-between">
          <div>
            <h1 class="page-title">Gunluk</h1>
            <p class="page-subtitle">Dusuncelerini yaz, ruh halini takip et</p>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <input type="date" class="form-input" id="journal-date" value="${this.selectedDate}" style="width:160px;" onchange="JournalPage.selectedDate=this.value; JournalPage.render(document.getElementById('content'))">
          </div>
        </div>
      </div>

      <!-- Mood Selector -->
      <div class="card mb-16">
        <div class="card-title">Bugunun Ruh Hali</div>
        <div style="display:flex; justify-content:center; gap:16px; margin:12px 0;">
          ${[1,2,3,4,5].map(m => `
            <button class="btn ${currentMood === m ? 'btn-primary' : 'btn-ghost'}" style="font-size:28px; width:56px; height:56px; border-radius:50%;"
              onclick="JournalPage.setMood(${m})" id="mood-btn-${m}">
              ${moodEmojis[m]}
            </button>
          `).join('')}
        </div>
        <div style="text-align:center;" class="text-sm text-muted" id="mood-label">${moodLabels[currentMood]}</div>
      </div>

      <!-- Content -->
      <div class="card mb-16">
        <div class="card-title">${icon('book-open', 14)} Gunluk Yazisi</div>
        <textarea class="form-input" id="journal-content" rows="6" placeholder="Bugunu nasil gecirdin? Neler hissettin?" style="resize:vertical; min-height:120px;">${currentContent}</textarea>
        <div class="form-group mt-16">
          <label class="form-label">Etiketler (virgul ile ayir)</label>
          <input type="text" class="form-input" id="journal-tags" placeholder="Ornek: verimli, mutlu, yorgun" value="${currentTags.join(', ')}">
        </div>
        <div style="text-align:right; margin-top:12px;">
          <button class="btn btn-primary" onclick="JournalPage.save()">Kaydet ${entry ? '(Guncelle)' : '(+5 XP)'}</button>
        </div>
      </div>

      <!-- Mood Trend (30 days) -->
      <div class="card mb-16">
        <div class="card-title">${icon('calendar', 14)} Son 30 Gun Ruh Hali</div>
        <div style="display:flex; gap:3px; align-items:end; height:80px; padding:8px 0;">
          ${moodTrend.map(d => {
            if (d.mood === null) return `<div style="flex:1; height:4px; background:var(--border); border-radius:2px;" title="${d.date}: kayit yok"></div>`;
            const colors = ['', 'var(--danger)', 'var(--warning)', 'var(--text-muted)', 'var(--success)', 'var(--accent)'];
            const h = (d.mood / 5) * 100;
            return `<div style="flex:1; height:${h}%; background:${colors[d.mood]}; border-radius:2px; min-height:4px;" title="${d.date}: ${moodEmojis[d.mood]} ${moodLabels[d.mood]}"></div>`;
          }).join('')}
        </div>
      </div>

      <!-- Recent Entries -->
      ${entries.length > 0 ? `
        <div class="card-title">Son Girisler</div>
        <div style="display:flex; flex-direction:column; gap:10px;">
          ${entries.slice(0, 10).map(e => {
            const tags = typeof e.tags === 'string' ? JSON.parse(e.tags || '[]') : e.tags || [];
            return `
              <div class="card" style="cursor:pointer;" onclick="JournalPage.selectedDate='${e.date}'; JournalPage.render(document.getElementById('content'))">
                <div class="flex-between">
                  <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-size:24px;">${moodEmojis[e.mood] || '\u{1F610}'}</span>
                    <div>
                      <div class="font-bold">${e.date}</div>
                      <div class="text-sm text-muted">${(e.content || '').slice(0, 80)}${(e.content || '').length > 80 ? '...' : ''}</div>
                    </div>
                  </div>
                  <div style="display:flex; gap:4px;">
                    ${tags.map(t => `<span class="tag">${t}</span>`).join('')}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : ''}
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  currentMoodValue: 3,

  setMood(val) {
    this.currentMoodValue = val;
    const moodLabels = ['', 'Kotu', 'Eh', 'Normal', 'Iyi', 'Harika'];
    for (let i = 1; i <= 5; i++) {
      const btn = document.getElementById(`mood-btn-${i}`);
      if (btn) {
        btn.className = `btn ${i === val ? 'btn-primary' : 'btn-ghost'}`;
      }
    }
    const label = document.getElementById('mood-label');
    if (label) label.textContent = moodLabels[val];
  },

  async save() {
    const content = document.getElementById('journal-content').value;
    const tagsStr = document.getElementById('journal-tags').value;
    const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];

    // Mood değerini direkt state'den al
    const mood = this.currentMoodValue || 3;

    const result = await api.journal.add({
      date: this.selectedDate || getTodayStr(),
      mood,
      content,
      tags
    });

    SoundManager.play('journalSave');
    Toast.show(result.updated ? 'Gunluk guncellendi!' : 'Gunluk kaydedildi! +5 XP', result.updated ? 'success' : 'xp');
    if (!result.updated) await App.loadUserStats();
    await this.render(document.getElementById('content'));
  }
};
