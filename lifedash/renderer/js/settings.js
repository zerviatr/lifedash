// ============ SETTINGS PAGE ============
const SettingsPage = {
  async render(container) {
    const [settings, autoLaunch, userStats, appVersion] = await Promise.all([
      api.settings.getSettings(),
      api.system.getAutoLaunch(),
      api.gamification.getUserStats(),
      api.system.getAppVersion()
    ]);

    const currentTheme = settings.theme || 'dark';

    const themes = [
      { id: 'dark', name: 'Gece', bg: '#0f0f23', accent: '#6366f1', icon: '🌙' },
      { id: 'cyberpunk', name: 'Cyberpunk', bg: '#1a0a2e', accent: '#e040fb', icon: '💜' },
      { id: 'forest', name: 'Orman', bg: '#0a1f0a', accent: '#4caf50', icon: '🌲' },
      { id: 'ocean', name: 'Okyanus', bg: '#0a1628', accent: '#00bcd4', icon: '🌊' },
      { id: 'sunset', name: 'Gun Batimi', bg: '#1f0f0a', accent: '#ff7043', icon: '🌅' },
    ];

    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Ayarlar</h1>
        <p class="page-subtitle">Uygulama tercihlerini ozellestir</p>
      </div>

      <!-- Theme -->
      <div class="card mb-16">
        <div class="card-title">Tema</div>
        <div class="theme-grid">
          ${themes.map(t => `
            <div style="text-align:center;">
              <div class="theme-swatch ${currentTheme === t.id ? 'active' : ''}"
                style="background: linear-gradient(135deg, ${t.bg}, ${t.accent}40);"
                onclick="SettingsPage.changeTheme('${t.id}')">
                ${t.icon}
              </div>
              <div class="theme-swatch-label">${t.name}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- General -->
      <div class="card mb-16">
        <div class="card-title">Genel</div>

        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">Windows ile baslat</div>
            <div class="setting-desc">Bilgisayar acildiginda LifeDash otomatik calissin</div>
          </div>
          <label class="toggle">
            <input type="checkbox" ${autoLaunch ? 'checked' : ''} onchange="SettingsPage.toggleAutoLaunch(this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">Bildirimler</div>
            <div class="setting-desc">Gunluk hatirlatmalar ve butce uyarilari</div>
          </div>
          <label class="toggle">
            <input type="checkbox" ${settings.notifications === 'true' ? 'checked' : ''} onchange="SettingsPage.setSetting('notifications', this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">Gunluk hatirlatma (20:00)</div>
            <div class="setting-desc">Tamamlanmamis gorevler icin aksam hatirlatma</div>
          </div>
          <label class="toggle">
            <input type="checkbox" ${settings.daily_reminder === 'true' ? 'checked' : ''} onchange="SettingsPage.setSetting('daily_reminder', this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">Ses Efektleri</div>
            <div class="setting-desc">XP kazanimi, seviye atlama ve basarim sesleri</div>
          </div>
          <label class="toggle">
            <input type="checkbox" ${settings.sound_effects !== 'false' ? 'checked' : ''} onchange="SettingsPage.toggleSound(this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <!-- Pomodoro Settings -->
      <div class="card mb-16">
        <div class="card-title">Pomodoro Sureleri</div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Calisma (dk)</label>
            <input type="number" class="form-input" value="${settings.pomodoro_work || 25}" min="1" max="90"
              onchange="SettingsPage.setSetting('pomodoro_work', this.value)">
          </div>
          <div class="form-group">
            <label class="form-label">Kisa Mola (dk)</label>
            <input type="number" class="form-input" value="${settings.pomodoro_break || 5}" min="1" max="30"
              onchange="SettingsPage.setSetting('pomodoro_break', this.value)">
          </div>
          <div class="form-group">
            <label class="form-label">Uzun Mola (dk)</label>
            <input type="number" class="form-input" value="${settings.pomodoro_long_break || 15}" min="1" max="60"
              onchange="SettingsPage.setSetting('pomodoro_long_break', this.value)">
          </div>
        </div>
      </div>

      <!-- Currency -->
      <div class="card mb-16">
        <div class="card-title">Para Birimi</div>
        <div class="form-group">
          <select class="form-select" onchange="SettingsPage.setSetting('currency', this.value)">
            <option value="TRY" ${settings.currency === 'TRY' ? 'selected' : ''}>🇹🇷 Turk Lirasi (₺)</option>
            <option value="USD" ${settings.currency === 'USD' ? 'selected' : ''}>🇺🇸 Dolar ($)</option>
            <option value="EUR" ${settings.currency === 'EUR' ? 'selected' : ''}>🇪🇺 Euro (€)</option>
            <option value="GBP" ${settings.currency === 'GBP' ? 'selected' : ''}>🇬🇧 Sterlin (£)</option>
          </select>
        </div>
      </div>

      <!-- Update -->
      <div class="card mb-16">
        <div class="card-title">Guncelleme</div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">Mevcut Versiyon: v${appVersion}</div>
            <div class="setting-desc" id="update-status">Guncelleme kontrol edilmedi</div>
          </div>
          <button class="btn btn-primary btn-sm" id="update-check-btn" onclick="SettingsPage.checkUpdate()">Guncelleme Kontrol Et</button>
        </div>
        <div id="update-result" style="display:none; margin-top:12px; padding:12px; border-radius:8px; background:var(--bg-input);"></div>
      </div>

      <!-- Gamification Info -->
      <div class="card mb-16">
        <div class="card-title">Gamification Bilgisi</div>
        <div class="text-sm" style="line-height:2; color: var(--text-secondary);">
          <div class="flex-between"><span>Zorluk Carpani</span><span class="font-bold text-warning">x${(userStats.difficulty_multiplier || 1.0).toFixed(1)}</span></div>
          <div class="flex-between"><span>Her 5 seviyede</span><span class="font-bold text-accent">🎁 Loot Box</span></div>
          <div class="flex-between"><span>Hafta sonu 5+ gun basari</span><span class="font-bold text-danger">⚔️ Boss Battle Odulu</span></div>
        </div>
      </div>

      <!-- Tutorial -->
      <div class="card mb-16">
        <div class="card-title">Eğitim</div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">Uygulama Turu</div>
            <div class="setting-desc">LifeDash'in temel özelliklerini adım adım keşfet</div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="SettingsPage.replayTutorial()">🎓 Eğitimi Tekrar Oynat</button>
        </div>
      </div>

      <!-- Data -->
      <div class="card mb-16">
        <div class="card-title">Veri Yonetimi</div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">Yedekle</div>
            <div class="setting-desc">Veritabanını ZIP olarak yedekle</div>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="SettingsPage.backupData()">💾 Yedekle</button>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">Verileri Sifirla</div>
            <div class="setting-desc">Tum XP, gorev ve istatistikleri sifirla (geri alinamaz!)</div>
          </div>
          <button class="btn btn-danger btn-sm" onclick="SettingsPage.resetData()">Sifirla</button>
        </div>
      </div>

      <!-- About -->
      <div class="card">
        <div class="card-title">Hakkinda</div>
        <div class="text-sm" style="line-height:1.8; color: var(--text-secondary);">
          <strong>LifeDash</strong> v${appVersion}<br>
          Finans + Doviz/Kripto + Gamification + Surec Yoneticisi<br>
          5 Tema • Akilli Bildirimler • Raporlar & Grafikler<br>
          Tum veriler yerel bilgisayarinda saklanir.
        </div>
      </div>
    `;
  },

  async checkUpdate() {
    const btn = document.getElementById('update-check-btn');
    const status = document.getElementById('update-status');
    const result = document.getElementById('update-result');
    if (btn) { btn.disabled = true; btn.textContent = 'Kontrol ediliyor...'; }
    if (status) status.textContent = 'Kontrol ediliyor...';

    try {
      const data = await api.system.checkForUpdates();
      if (data.available) {
        if (status) status.textContent = `Yeni versiyon mevcut: v${data.newVersion}`;
        if (result) {
          result.style.display = 'block';
          result.innerHTML = `
            <div class="text-success font-bold" style="margin-bottom:8px;">Yeni versiyon: v${data.newVersion}</div>
            ${data.changelog ? `<div class="text-sm text-muted" style="margin-bottom:8px;">${data.changelog}</div>` : ''}
            <div class="text-sm text-muted">Uygulamayi kapatip yeni exe'yi calistir veya <code>npm start</code> ile yeniden baslat.</div>
          `;
        }
      } else {
        if (status) status.textContent = 'En guncel versiyon kullaniliyor';
        if (result) {
          result.style.display = 'block';
          result.innerHTML = '<div class="text-success font-bold">Uygulamaniz guncel!</div>';
        }
        if (data.error) {
          if (status) status.textContent = 'Kontrol basarisiz: ' + data.error;
        }
      }
    } catch (e) {
      if (status) status.textContent = 'Baglanti hatasi';
    }
    if (btn) { btn.disabled = false; btn.textContent = 'Guncelleme Kontrol Et'; }
  },

  async changeTheme(themeId) {
    await App.setTheme(themeId);
    Toast.show(`Tema degistirildi: ${themeId}`, 'success');
    await this.render(document.getElementById('content'));
  },

  async toggleAutoLaunch(enabled) {
    const result = await api.system.setAutoLaunch(enabled);
    if (result) {
      Toast.show(enabled ? 'Otomatik baslatma acildi' : 'Otomatik baslatma kapatildi', 'success');
    }
  },

  async setSetting(key, value) {
    const val = typeof value === 'boolean' ? String(value) : value;
    await api.settings.setSetting(key, val);
    Toast.show('Ayar kaydedildi', 'success');
  },

  async toggleSound(enabled) {
    await api.settings.setSetting('sound_effects', String(enabled));
    SoundManager.enabled = enabled;
    if (enabled) SoundManager.play('taskComplete');
    Toast.show(enabled ? 'Ses efektleri acildi' : 'Ses efektleri kapatildi', 'success');
  },

  async resetData() {
    if (confirm('Tum veriler silinecek! Bu islem geri alinamaz. Emin misin?')) {
      await api.settings.resetAllData();
      Toast.show('Veriler sifirlandi. Uygulama yeniden baslatiliyor...', 'warning');
      setTimeout(() => location.reload(), 1500);
    }
  },

  async replayTutorial() {
    await api.settings.setSetting('tutorial_completed', 'false');
    Tutorial.start();
  },

  async backupData() {
    const result = await api.system.backupDb();
    if (result.success) {
      Toast.show(`Yedek kaydedildi: ${result.path}`, 'success');
    } else if (!result.canceled) {
      Toast.show('Yedekleme hatası: ' + (result.error || 'Bilinmeyen hata'), 'error');
    }
  }
};
