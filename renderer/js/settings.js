// ============ SETTINGS PAGE ============
const SettingsPage = {
  async render(container) {
    container.innerHTML = Skeleton.card(4);

    const [settings, autoLaunch, userStats, appVersion] = await Promise.all([
      api.settings.getAll(),
      api.settings.getAutoLaunch(),
      api.xp.getUserStats(),
      api.settings.getAppVersion()
    ]);

    const currentTheme = settings.theme || 'dark';

    const themes = [
      { id: 'dark', name: 'Gece', bg: '#0f0f23', accent: '#6366f1', icon: '🌙' },
      { id: 'cyberpunk', name: 'Cyberpunk', bg: '#1a0a2e', accent: '#e040fb', icon: '💜' },
      { id: 'forest', name: 'Orman', bg: '#0a1f0a', accent: '#4caf50', icon: '🌲' },
      { id: 'ocean', name: 'Okyanus', bg: '#0a1628', accent: '#00bcd4', icon: '🌊' },
      { id: 'sunset', name: 'Gun Batimi', bg: '#1f0f0a', accent: '#ff7043', icon: '🌅' },
      { id: 'midnight', name: 'Gece Yarisi', bg: '#000000', accent: '#818cf8', icon: '🖤' },
      { id: 'cherry', name: 'Kiraz', bg: '#1a0a0a', accent: '#ef4444', icon: '🍒' },
      { id: 'nordic', name: 'Nordic', bg: '#0d1117', accent: '#58a6ff', icon: '❄️' },
    ];

    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">${icon('settings', 14)} Ayarlar</h1>
        <p class="page-subtitle">Uygulama tercihlerini ozellestir</p>
      </div>

      <!-- Theme -->
      <div class="card mb-16">
        <div class="card-title">${icon('palette', 14)} Tema</div>
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
            <div class="setting-label">${icon('bell', 14)} Bildirimler</div>
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
            <div class="setting-label">${icon('volume-2', 14)} Ses Efektleri</div>
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

      <!-- AI Danışman -->
      <div class="card mb-16">
        <div class="card-title">${icon('bot', 14)} AI Danışman</div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">Groq API Key</div>
            <div class="setting-desc">
              <a href="https://console.groq.com/keys" target="_blank" style="color:var(--accent);">console.groq.com/keys</a> adresinden ücretsiz alabilirsin (14.400 istek/gün)
            </div>
          </div>
        </div>
        <div class="form-group" style="margin-top:8px;">
          <input type="password" class="form-input" id="groq-key-input"
            placeholder="gsk_xxxxxxxxxxxx"
            value="${settings.groq_api_key ? '••••••••••••••••' : ''}"
            onfocus="if(this.value.startsWith('•')) this.value=''"
            onchange="SettingsPage.saveGroqKey(this.value)">
          <div class="text-sm mt-8" id="groq-key-status" style="color:${settings.groq_api_key ? 'var(--success)' : 'var(--text-muted)'};">
            ${settings.groq_api_key ? '✓ API key kayıtlı' : 'Henüz API key girilmedi'}
          </div>
        </div>
      </div>

      <!-- Update -->
      <div class="card mb-16">
        <div class="card-title">${icon('refresh-cw', 14)} Guncelleme</div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">Mevcut Versiyon: v${appVersion}</div>
            <div class="setting-desc" id="update-status-text">Guncelleme kontrol edilmedi</div>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <button class="btn btn-primary btn-sm" id="update-check-btn" onclick="SettingsPage.checkUpdate()">Kontrol Et</button>
            <button class="btn btn-warning btn-sm" id="update-install-btn" style="display:none;" onclick="SettingsPage.installUpdate()">Simdi Kur</button>
          </div>
        </div>
        <div id="update-progress-wrap" style="display:none; margin-top:12px;">
          <div class="progress-bar" style="height:6px; border-radius:4px; overflow:hidden;">
            <div class="progress-fill" id="update-progress-fill" style="width:0%; transition:width 0.3s ease;"></div>
          </div>
          <div class="text-sm text-muted mt-8" id="update-progress-text">%0 indiriliyor...</div>
        </div>
        <div id="update-result" style="display:none; margin-top:12px; padding:12px; border-radius:8px; background:var(--bg-input);"></div>
      </div>

      <!-- Gamification Info -->
      <div class="card mb-16">
        <div class="card-title">Gamification Bilgisi</div>
        <div class="text-sm" style="line-height:2; color: var(--text-secondary);">
          <div class="flex-between"><span>Zorluk Carpani</span><span class="font-bold text-warning">x${(userStats.difficulty_multiplier || 1.0).toFixed(1)}</span></div>
          <div class="flex-between"><span>Her 5 seviyede</span><span class="font-bold text-accent">${icon('gift', 14)} Loot Box</span></div>
          <div class="flex-between"><span>Hafta sonu 5+ gun basari</span><span class="font-bold text-danger">⚔️ Boss Battle Odulu</span></div>
        </div>
      </div>

      <!-- Backup -->
      <div class="card mb-16">
        <div class="card-title">Yedekleme</div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">Verileri Disa Aktar</div>
            <div class="setting-desc">Tum verileri .db dosyasi olarak kaydet${settings.last_backup_date ? ` • Son yedek: ${new Date(settings.last_backup_date).toLocaleDateString('tr-TR')}` : ''}</div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="SettingsPage.exportBackup()">Disa Aktar</button>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">Yedekten Geri Yukle</div>
            <div class="setting-desc">Mevcut verilerin ustune yazilacak (geri alinamaz!)</div>
          </div>
          <button class="btn btn-warning btn-sm" onclick="SettingsPage.importBackup()">Iceri Aktar</button>
        </div>
      </div>

      <!-- Data Export -->
      <div class="card mb-16">
        <div class="card-title">${icon('package', 14)} Veri Ihracat</div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">Islemler (CSV)</div>
            <div class="setting-desc">Gelir/gider kayitlarini CSV olarak indir</div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="SettingsPage.exportData('transactions')">CSV Indir</button>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">Aliskanliklar (CSV)</div>
            <div class="setting-desc">Aliskanlik tamamlama gecmisini CSV olarak indir</div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="SettingsPage.exportData('habits')">CSV Indir</button>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">Pomodoro (CSV)</div>
            <div class="setting-desc">Pomodoro oturum kayitlarini CSV olarak indir</div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="SettingsPage.exportData('pomodoro')">CSV Indir</button>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">Tum Veriler (JSON)</div>
            <div class="setting-desc">Tum verileri tek JSON dosyasi olarak indir</div>
          </div>
          <button class="btn btn-success btn-sm" onclick="SettingsPage.exportData('all')">JSON Indir</button>
        </div>
      </div>

      <!-- Data -->
      <div class="card mb-16">
        <div class="card-title">Veri Yonetimi</div>
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
          Finans + Doviz/Kripto + Gamification + Aliskanlik Takibi<br>
          5 Tema • Akilli Bildirimler • Raporlar & Grafikler<br>
          Tum veriler yerel bilgisayarinda saklanir.
        </div>
      </div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Otomatik güncelleme durum dinleyicisi
    if (api.events && api.events.onUpdateStatus) {
      api.events.onUpdateStatus((data) => SettingsPage.handleUpdateStatus(data));
    }
  },

  handleUpdateStatus(data) {
    const statusText = document.getElementById('update-status-text');
    const progressWrap = document.getElementById('update-progress-wrap');
    const progressFill = document.getElementById('update-progress-fill');
    const progressText = document.getElementById('update-progress-text');
    const installBtn = document.getElementById('update-install-btn');
    const result = document.getElementById('update-result');

    if (!statusText) return;

    switch (data.status) {
      case 'checking':
        statusText.textContent = 'Guncelleme kontrol ediliyor...';
        break;
      case 'up-to-date':
        statusText.textContent = 'En guncel versiyon kullaniliyor';
        if (result) { result.style.display = 'block'; result.innerHTML = '<div class="text-success font-bold">Uygulamaniz guncel!</div>'; }
        break;
      case 'available':
        statusText.textContent = `v${data.version} bulundu, indiriliyor...`;
        if (progressWrap) progressWrap.style.display = 'block';
        break;
      case 'downloading':
        statusText.textContent = `v${data.version || ''} indiriliyor... %${data.percent}`;
        if (progressWrap) progressWrap.style.display = 'block';
        if (progressFill) progressFill.style.width = data.percent + '%';
        if (progressText) progressText.textContent = `%${data.percent} indiriliyor...`;
        break;
      case 'ready':
        statusText.textContent = `v${data.version} hazir — uygulama kapaninca otomatik kurulacak`;
        if (progressWrap) progressWrap.style.display = 'none';
        if (installBtn) installBtn.style.display = 'inline-block';
        if (result) { result.style.display = 'block'; result.innerHTML = `<div class="text-warning font-bold">v${data.version} indirildi. Uygulamayi kapatin, otomatik kurulacak.</div>`; }
        break;
      case 'error':
        statusText.textContent = 'Guncelleme hatasi: ' + (data.message || '');
        if (progressWrap) progressWrap.style.display = 'none';
        break;
    }
  },

  async checkUpdate() {
    const btn = document.getElementById('update-check-btn');
    const statusText = document.getElementById('update-status-text');
    if (btn) { btn.disabled = true; btn.textContent = 'Kontrol ediliyor...'; }
    if (statusText) statusText.textContent = 'Kontrol ediliyor...';

    try {
      const data = await api.settings.checkForUpdates();
      if (data && data.status === 'dev-mode') {
        if (statusText) statusText.textContent = 'Gelistirme modunda guncelleme kontrolu devre disi';
      }
      // Gercek durum guncellemesi 'update-status' eventi ile gelecek
    } catch (e) {
      if (statusText) statusText.textContent = 'Baglanti hatasi';
    }
    if (btn) { btn.disabled = false; btn.textContent = 'Kontrol Et'; }
  },

  async saveGroqKey(value) {
    if (!value || value.startsWith('•')) return;
    await api.settings.set('groq_api_key', value.trim().replace(/[\r\n\t]/g, ''));
    const status = document.getElementById('groq-key-status');
    if (status) {
      status.textContent = '✓ API key kaydedildi';
      status.style.color = 'var(--success)';
    }
    Toast.show('Groq API key kaydedildi!', 'success');
  },

  installUpdate() {
    if (confirm('Uygulama yeniden baslatilacak ve guncelleme kurulacak. Hazir misin?')) {
      // Kullanıcıya görsel geri bildirim ver, sonra kapat
      const btn = document.getElementById('update-install-btn');
      const statusText = document.getElementById('update-status-text');
      if (btn) { btn.disabled = true; btn.textContent = 'Kuruluyor...'; }
      if (statusText) statusText.textContent = 'Guncelleme kuruluyor — uygulama kapanip yeniden acilacak...';
      Toast.show('Guncelleme basliyor, uygulama yeniden acilacak!', 'success');
      setTimeout(() => api.settings.installUpdate(), 500);
    }
  },

  async changeTheme(themeId) {
    await App.setTheme(themeId);
    Toast.show(`Tema degistirildi: ${themeId}`, 'success');
    await this.render(document.getElementById('content'));
  },

  async toggleAutoLaunch(enabled) {
    const result = await api.settings.setAutoLaunch(enabled);
    if (result) {
      Toast.show(enabled ? 'Otomatik baslatma acildi' : 'Otomatik baslatma kapatildi', 'success');
    }
  },

  async setSetting(key, value) {
    const val = typeof value === 'boolean' ? String(value) : value;
    await api.settings.set(key, val);
    Toast.show('Ayar kaydedildi', 'success');
  },

  async toggleSound(enabled) {
    await api.settings.set('sound_effects', String(enabled));
    SoundManager.enabled = enabled;
    if (enabled) SoundManager.play('taskComplete');
    Toast.show(enabled ? 'Ses efektleri acildi' : 'Ses efektleri kapatildi', 'success');
  },

  async exportBackup() {
    const result = await api.backup.export();
    if (result.success) {
      Toast.show('Yedekleme basariyla kaydedildi!', 'success');
    } else if (result.error) {
      Toast.show('Yedekleme hatasi: ' + result.error, 'error');
    }
  },

  async importBackup() {
    if (!confirm('Mevcut tum veriler silinip yedekteki verilerle degistirilecek! Emin misin?')) return;
    const result = await api.backup.import();
    if (result.success) {
      Toast.show('Yedek yuklendi, uygulama yeniden baslatiliyor...', 'success');
    } else if (result.error) {
      Toast.show('Yukleme hatasi: ' + result.error, 'error');
    }
  },

  async exportData(type) {
    const result = await api.export.data(type);
    if (result.success) {
      Toast.show(`${type === 'all' ? 'JSON' : 'CSV'} dosyasi kaydedildi!`, 'success');
    } else if (result.cancelled) {
      // user cancelled dialog
    } else {
      Toast.show('Ihracat hatasi: ' + (result.error || 'Bilinmeyen hata'), 'error');
    }
  },

  async resetData() {
    if (confirm('Tum veriler silinecek! Bu islem geri alinamaz. Emin misin?')) {
      await api.settings.resetAllData();
      Toast.show('Veriler sifirlandi. Uygulama yeniden baslatiliyor...', 'warning');
      setTimeout(() => location.reload(), 1500);
    }
  }
};
