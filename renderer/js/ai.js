// ============ AI DANIŞMAN PAGE ============
const AiPage = {
  currentTab: 'chat',
  history: [],
  context: null,
  isLoading: false,

  async render(container) {
    container.innerHTML = Skeleton.card(3);

    const settings = await api.settings.getAll();
    const hasKey = !!(settings.groq_api_key);

    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">${icon('bot', 18)} AI Finansal Danışman</h1>
        <p class="page-subtitle">Harcama verilerine dayalı kişisel finans asistanın</p>
      </div>

      ${!hasKey ? `
        <div class="card mb-16" style="border-color: var(--warning); background: rgba(245,158,11,0.05);">
          <div style="display:flex; align-items:center; gap:10px;">
            ${icon('alert-triangle', 16)}
            <div>
              <div class="font-bold">Groq API Key Gerekli</div>
              <div class="text-sm text-muted">
                <a href="#" onclick="App.navigateTo('settings')" style="color:var(--accent);">Ayarlar</a> sayfasından ücretsiz Groq API key ekle.
                groq.com/keys adresinden 1 dakikada alabilirsin.
              </div>
            </div>
          </div>
        </div>
      ` : ''}

      <div class="tab-bar">
        <button class="tab-btn ${this.currentTab === 'chat' ? 'active' : ''}" data-tab="chat" onclick="AiPage.switchTab('chat')">
          ${icon('message-circle', 14)} Sohbet
        </button>
        <button class="tab-btn ${this.currentTab === 'report' ? 'active' : ''}" data-tab="report" onclick="AiPage.switchTab('report')">
          ${icon('file-text', 14)} Aylık Rapor
        </button>
        <button class="tab-btn ${this.currentTab === 'goals' ? 'active' : ''}" data-tab="goals" onclick="AiPage.switchTab('goals')">
          ${icon('target', 14)} Hedef Tahmini
        </button>
      </div>

      <div id="ai-tab-content"></div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
    await this.renderTab(this.currentTab);
  },

  async switchTab(tab) {
    this.currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tab);
    });
    await this.renderTab(tab);
  },

  async renderTab(tab) {
    const content = document.getElementById('ai-tab-content');
    if (!content) return;
    if (tab === 'chat') await this.renderChat(content);
    else if (tab === 'report') await this.renderReport(content);
    else await this.renderGoals(content);
  },

  async renderChat(container) {
    container.innerHTML = `
      <div class="card mt-16" style="display:flex; flex-direction:column; min-height:480px;">
        <!-- Öneri butonları -->
        <div id="ai-suggestions" style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px; ${this.history.length > 0 ? 'display:none;' : ''}">
          ${['Bu ay nasıl harcadım?', 'Tasarruf hedefime ne zaman ulaşırım?', 'Nereden tasarruf edebilirim?', 'Geçen aya göre nasılım?'].map(q => `
            <button class="btn btn-ghost btn-sm" style="font-size:12px; border:1px solid var(--border);"
              onclick="AiPage.sendSuggestion('${q}')">${q}</button>
          `).join('')}
        </div>

        <!-- Mesaj listesi -->
        <div id="ai-messages" style="flex:1; overflow-y:auto; max-height:360px; display:flex; flex-direction:column; gap:12px; padding:4px 0; margin-bottom:16px;">
          ${this.history.length === 0 ? `
            <div style="text-align:center; color:var(--text-muted); margin:auto; padding:40px 0;">
              ${icon('bot', 32)}<br>
              <div style="margin-top:12px; font-size:14px;">Finansal verilerini analiz etmeme izin ver.<br>Yukarıdaki sorulardan birini seç veya kendin yaz.</div>
            </div>
          ` : this.renderMessages()}
        </div>

        <!-- Input -->
        <div style="display:flex; gap:8px; border-top:1px solid var(--border); padding-top:12px;">
          <textarea id="ai-input" class="form-input" placeholder="Finansal durumun hakkında bir şey sor..." rows="2"
            style="flex:1; resize:none; font-size:13px;"
            onkeydown="if(event.key==='Enter' && !event.shiftKey){ event.preventDefault(); AiPage.send(); }"></textarea>
          <button class="btn btn-primary" id="ai-send-btn" onclick="AiPage.send()" style="align-self:flex-end;">
            ${icon('send', 14)}
          </button>
        </div>
        ${this.history.length > 0 ? `
          <button class="btn btn-ghost btn-sm" style="margin-top:8px; font-size:11px;" onclick="AiPage.clearHistory()">
            ${icon('trash-2', 12)} Sohbeti Temizle
          </button>
        ` : ''}
      </div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
    // Scroll to bottom
    const messages = document.getElementById('ai-messages');
    if (messages) messages.scrollTop = messages.scrollHeight;
  },

  renderMessages() {
    return this.history.map(msg => `
      <div style="display:flex; ${msg.role === 'user' ? 'justify-content:flex-end;' : 'justify-content:flex-start;'}">
        <div style="
          max-width:80%;
          padding:10px 14px;
          border-radius:${msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px'};
          background:${msg.role === 'user' ? 'var(--accent-200)' : 'var(--surface-3)'};
          font-size:13px;
          line-height:1.6;
          white-space:pre-wrap;
        ">${this.formatText(msg.content)}</div>
      </div>
    `).join('');
  },

  formatText(text) {
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code style="background:var(--surface-2);padding:1px 4px;border-radius:3px;">$1</code>');
  },

  async send() {
    const input = document.getElementById('ai-input');
    if (!input) return;
    const message = input.value.trim();
    if (!message || this.isLoading) return;
    input.value = '';
    await this.sendMessage(message);
  },

  async sendSuggestion(text) {
    await this.sendMessage(text);
  },

  async sendMessage(message) {
    this.isLoading = true;
    this.history.push({ role: 'user', content: message });
    await this.renderChat(document.getElementById('ai-tab-content'));

    // Yükleniyor göster
    const messages = document.getElementById('ai-messages');
    if (messages) {
      const loadingEl = document.createElement('div');
      loadingEl.id = 'ai-loading';
      loadingEl.style.cssText = 'display:flex; justify-content:flex-start;';
      loadingEl.innerHTML = `<div style="padding:10px 14px; border-radius:16px 16px 16px 4px; background:var(--surface-3); font-size:13px;">
        <span style="display:inline-flex; gap:4px; align-items:center;">
          <span class="skeleton-line" style="width:8px;height:8px;border-radius:50%;animation-delay:0s;"></span>
          <span class="skeleton-line" style="width:8px;height:8px;border-radius:50%;animation-delay:0.2s;"></span>
          <span class="skeleton-line" style="width:8px;height:8px;border-radius:50%;animation-delay:0.4s;"></span>
        </span>
      </div>`;
      messages.appendChild(loadingEl);
      messages.scrollTop = messages.scrollHeight;
    }

    // Context yükle (ilk mesajda)
    if (!this.context) {
      try {
        this.context = await api.ai.getContext();
      } catch (e) {
        this.context = {};
        console.warn('AI context yüklenemedi:', e);
      }
    }

    // API çağrısı
    const historyToSend = this.history.slice(0, -1); // son user mesajı zaten gönderiliyor
    const result = await api.ai.chat(message, historyToSend, this.context);

    if (result.error) {
      this.history.push({ role: 'assistant', content: `Hata: ${result.error}` });
    } else {
      this.history.push({ role: 'assistant', content: result.reply });
    }

    this.isLoading = false;
    await this.renderChat(document.getElementById('ai-tab-content'));
  },

  clearHistory() {
    this.history = [];
    this.context = null;
    this.renderChat(document.getElementById('ai-tab-content'));
  },

  async renderReport(container) {
    const savedReport = localStorage.getItem('ai_monthly_report');
    const savedDate = localStorage.getItem('ai_monthly_report_date');
    const today = new Date().toISOString().split('T')[0];
    const isToday = savedDate === today;

    container.innerHTML = `
      <div class="card mt-16">
        <div class="flex-between mb-16">
          <div>
            <div class="card-title">${icon('file-text', 14)} Aylık Finansal Rapor</div>
            ${savedDate ? `<div class="text-sm text-muted">Son rapor: ${savedDate}</div>` : ''}
          </div>
          <button class="btn btn-primary" id="gen-report-btn" onclick="AiPage.generateReport()">
            ${icon('refresh-cw', 14)} ${savedReport ? 'Yenile' : 'Rapor Oluştur'}
          </button>
        </div>

        <div id="report-content">
          ${savedReport ? `
            <div style="line-height:1.8; font-size:14px; white-space:pre-wrap;">${this.formatText(savedReport)}</div>
          ` : `
            <div style="text-align:center; color:var(--text-muted); padding:40px 0;">
              ${icon('file-text', 32)}<br>
              <div style="margin-top:12px;">"Rapor Oluştur" butonuna bas — AI son 6 ayı analiz edecek.</div>
            </div>
          `}
        </div>
      </div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  async generateReport() {
    const btn = document.getElementById('gen-report-btn');
    const reportContent = document.getElementById('report-content');
    if (btn) { btn.disabled = true; btn.innerHTML = icon('loader', 14) + ' Oluşturuluyor...'; }
    if (reportContent) reportContent.innerHTML = '<div class="text-muted" style="padding:20px 0;">AI analiz ediyor, birkaç saniye...</div>';

    const ctx = await api.ai.getContext();
    const prompt = `Kullanıcının son 6 aylık finansal verilerini analiz et ve kapsamlı bir rapor sun. Şunları içersin:
1. Genel finansal durum özeti
2. En yüksek harcama kategorileri
3. Gelir/gider trendi (artış mı, azalış mı?)
4. Tasarruf hedeflerine ilerleme
5. 3 somut iyileştirme önerisi

Raporu düzenli, başlıklı ve okunması kolay yaz.`;

    const result = await api.ai.chat(prompt, [], ctx);

    if (result.error) {
      if (reportContent) reportContent.innerHTML = `<div class="text-danger">Hata: ${result.error}</div>`;
    } else {
      localStorage.setItem('ai_monthly_report', result.reply);
      localStorage.setItem('ai_monthly_report_date', new Date().toISOString().split('T')[0]);
      if (reportContent) reportContent.innerHTML = `<div style="line-height:1.8; font-size:14px; white-space:pre-wrap;">${this.formatText(result.reply)}</div>`;
    }

    if (btn) {
      btn.disabled = false;
      if (typeof lucide !== 'undefined') lucide.createIcons();
      btn.innerHTML = icon('refresh-cw', 14) + ' Yenile';
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  async renderGoals(container) {
    const goals = await api.savings.getGoals();
    const activeGoals = goals.filter(g => !g.is_completed);

    container.innerHTML = `
      <div class="card mt-16">
        <div class="card-title mb-16">${icon('target', 14)} Tasarruf Hedefi Tahmini</div>

        ${activeGoals.length === 0 ? `
          <div style="text-align:center; color:var(--text-muted); padding:40px 0;">
            ${icon('target', 32)}<br>
            <div style="margin-top:12px;">Aktif tasarruf hedefi yok.<br>Finans sayfasından hedef ekle.</div>
          </div>
        ` : activeGoals.map(g => {
          const percent = g.target_amount > 0 ? Math.round((g.current_amount / g.target_amount) * 100) : 0;
          const remaining = g.target_amount - g.current_amount;
          return `
            <div class="card mb-16" style="background:var(--surface-3);">
              <div class="flex-between mb-8">
                <div style="font-size:20px;">${g.icon}</div>
                <div class="text-sm text-muted">%${percent} tamamlandı</div>
              </div>
              <div class="font-bold mb-4">${g.name}</div>
              <div class="text-sm text-muted mb-8">
                ${g.current_amount.toLocaleString('tr-TR')}₺ / ${g.target_amount.toLocaleString('tr-TR')}₺
                — kalan: ${remaining.toLocaleString('tr-TR')}₺
              </div>
              <div class="progress-bar mb-12"><div class="progress-fill" style="width:${percent}%;"></div></div>
              <div id="goal-estimate-${g.id}"></div>
              <button class="btn btn-ghost btn-sm" onclick="AiPage.estimateGoal(${g.id}, '${g.name}', ${g.target_amount}, ${g.current_amount})">
                ${icon('bot', 12)} AI Tahmini Al
              </button>
            </div>
          `;
        }).join('')}
      </div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  async estimateGoal(goalId, name, target, current) {
    const el = document.getElementById(`goal-estimate-${goalId}`);
    if (!el) return;
    el.innerHTML = '<div class="text-muted text-sm">Hesaplanıyor...</div>';

    const ctx = await api.ai.getContext();
    const remaining = target - current;
    const prompt = `"${name}" tasarruf hedefim için ${remaining.toLocaleString('tr-TR')}₺ daha biriktirmem gerekiyor (toplam hedef: ${target.toLocaleString('tr-TR')}₺, biriken: ${current.toLocaleString('tr-TR')}₺). Mevcut gelir/gider trendime bakarak bu hedefe kaç ayda ulaşabileceğimi tahmin et. Aylık ne kadar ayırabildiğimi hesapla ve kısa bir öneri sun. 3-4 cümle yeterli.`;

    const result = await api.ai.chat(prompt, [], ctx);

    if (result.error) {
      el.innerHTML = `<div class="text-danger text-sm">Hata: ${result.error}</div>`;
    } else {
      el.innerHTML = `
        <div style="background:var(--accent-100); border-radius:8px; padding:10px; margin-bottom:8px; font-size:13px; line-height:1.6;">
          ${icon('bot', 12)} ${this.formatText(result.reply)}
        </div>
      `;
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
  }
};
