// ============ ACHIEVEMENTS PAGE ============
const AchievementsPage = {
  async render(container) {
    const [achievements, stats, xpHistory] = await Promise.all([
      api.gamification.getAchievements(),
      api.gamification.getUserStats(),
      api.gamification.getXPHistory(365)
    ]);

    const badge = stats.financeBadge || { key: 'kumarbaz', label: 'Kumarbaz', icon: '🎲' };
    const allBadges = [
      { key: 'kumarbaz', label: 'Kumarbaz', icon: '🎲', desc: 'Henuz butce kurulmadi' },
      { key: 'acemi', label: 'Acemi', icon: '🌱', desc: 'Butce kuruldu' },
      { key: 'disiplinli', label: 'Disiplinli', icon: '🛡️', desc: '2 ay ust uste butce altinda' },
      { key: 'birikimci', label: 'Birikimci', icon: '💰', desc: 'Net 1.000 TL+ tasarruf' },
      { key: 'borcsuz', label: 'Borcsuz', icon: '⚡', desc: 'Tum borclar kapatildi' },
      { key: 'yatirimci', label: 'Yatirimci', icon: '💎', desc: 'Net 5.000 TL+ tasarruf' },
      { key: 'ozgur', label: 'Finansal Ozgur', icon: '👑', desc: '6 ay butce altinda + borcsuz' },
    ];

    const unlocked = achievements.filter(a => a.unlocked);
    const locked = achievements.filter(a => !a.unlocked);
    const title = getLevelTitle(stats.level);

    // Calculate active days from XP history
    const activeDays = new Set(xpHistory.map(e => e.date.split(' ')[0])).size;

    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Basarim Vitrini</h1>
        <p class="page-subtitle">${unlocked.length} / ${achievements.length} basarim acildi</p>
      </div>

      <!-- Profile Hero Card -->
      <div class="profile-hero mb-16">
        <div class="profile-hero-inner">
          <div class="profile-level-circle">
            <div class="profile-level-num">${stats.level}</div>
            <div class="profile-level-title">${title}</div>
          </div>
          <div class="profile-info">
            <div class="profile-badge-main">${badge.icon} ${badge.label}</div>
            <div class="profile-stats-row">
              <div class="profile-stat">
                <div class="profile-stat-val">${stats.xp.toLocaleString('tr-TR')}</div>
                <div class="profile-stat-label">Toplam XP</div>
              </div>
              <div class="profile-stat">
                <div class="profile-stat-val">${activeDays}</div>
                <div class="profile-stat-label">Aktif Gun</div>
              </div>
              <div class="profile-stat">
                <div class="profile-stat-val">${stats.best_streak}</div>
                <div class="profile-stat-label">En Uzun Seri</div>
              </div>
              <div class="profile-stat">
                <div class="profile-stat-val">${unlocked.length}</div>
                <div class="profile-stat-label">Basarim</div>
              </div>
            </div>
          </div>
        </div>
        <div class="profile-xp-bar">
          <div class="xp-text" style="font-size:11px; margin-bottom:4px;">
            <span>${stats.xpProgress} / ${stats.xpNeeded} XP</span>
            <span>Lv.${stats.level + 1}</span>
          </div>
          <div class="xp-bar" style="height:6px;">
            <div class="xp-fill" style="width:${stats.progressPercent}%;"></div>
          </div>
        </div>
      </div>

      <!-- Unlocked Achievements -->
      ${unlocked.length > 0 ? `
        <div class="card-title">Acilan Basarimlar</div>
        <div class="grid-3 mb-16">
          ${unlocked.map(a => `
            <div class="achievement-card-showcase unlocked">
              <div class="achievement-icon-lg">${a.icon}</div>
              <div class="achievement-title">${a.title}</div>
              <div class="achievement-desc">${a.description}</div>
              <div class="flex-between mt-8">
                <span class="achievement-xp">+${a.xp_reward} XP</span>
                <span class="text-sm text-muted">${a.unlocked_at ? new Date(a.unlocked_at).toLocaleDateString('tr-TR') : ''}</span>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <!-- Locked -->
      ${locked.length > 0 ? `
        <div class="card-title">Kilitli Basarimlar</div>
        <div class="grid-3 mb-16">
          ${locked.map(a => `
            <div class="achievement-card-showcase locked">
              <div class="achievement-icon-lg" style="filter:grayscale(1); opacity:0.4;">${a.icon}</div>
              <div class="achievement-title">${a.title}</div>
              <div class="achievement-desc">${a.description}</div>
              <div class="achievement-xp" style="opacity:0.5;">+${a.xp_reward} XP</div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <!-- Finance Badges -->
      <div class="card-title">Finans Rozetleri</div>
      <div class="card mb-16" style="padding:16px;">
        <div style="display:grid; grid-template-columns:repeat(7,1fr); gap:8px; text-align:center;">
          ${allBadges.map(b => {
            const isActive = b.key === badge.key;
            const order = ['kumarbaz','acemi','disiplinli','birikimci','borcsuz','yatirimci','ozgur'];
            const isPassed = order.indexOf(b.key) < order.indexOf(badge.key);
            return `
              <div style="padding:10px 4px; border-radius:10px; background:${isActive ? 'var(--accent)22; border:2px solid var(--accent); box-shadow: 0 0 12px var(--accent)44' : isPassed ? 'var(--success)15; border:1px solid var(--success)40' : 'var(--surface); border:1px solid var(--border)'}; opacity:${isActive || isPassed ? '1' : '0.4'};" title="${b.desc}">
                <div style="font-size:28px;">${b.icon}</div>
                <div style="font-size:10px; margin-top:4px; color:${isActive ? 'var(--accent)' : 'var(--text-muted)'}; font-weight:${isActive ? '700' : '400'};">${b.label}</div>
              </div>
            `;
          }).join('')}
        </div>
        <div class="text-sm text-muted" style="margin-top:12px; text-align:center;">
          ${(() => {
            const order = ['kumarbaz','acemi','disiplinli','birikimci','borcsuz','yatirimci','ozgur'];
            const idx = order.indexOf(badge.key);
            const next = allBadges[idx + 1];
            return next ? `Sonraki: <span class="font-bold">${next.icon} ${next.label}</span> — ${next.desc}` : '<span class="text-success font-bold">En yuksek rozete ulastin!</span>';
          })()}
        </div>
      </div>
    `;
  }
};
