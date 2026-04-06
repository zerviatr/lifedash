// ============ CURRENCY PAGE ============
const CurrencyPage = {
  rates: null,
  crypto: null,
  refreshInterval: null,
  counterInterval: null,
  lastUpdateTime: null,

  async render(container) {
    container.innerHTML = Skeleton.card(4);

    container.innerHTML = `
      <div class="page-header">
        <div class="flex-between">
          <div>
            <h1 class="page-title">Doviz & Kripto</h1>
            <p class="page-subtitle" id="currency-update-time">Yukleniyor...</p>
          </div>
          <button class="btn btn-primary btn-sm currency-refresh-btn" onclick="CurrencyPage.forceRefresh()">
            <span class="refresh-icon">${icon('refresh-cw', 14)}</span> Yenile
          </button>
        </div>
      </div>

      <div class="tab-bar">
        <button class="tab-btn active" data-tab="fiat" onclick="CurrencyPage.switchTab('fiat')">${icon('arrow-left-right', 14)} Doviz</button>
        <button class="tab-btn" data-tab="crypto" onclick="CurrencyPage.switchTab('crypto')">₿ Kripto</button>
        <button class="tab-btn" data-tab="converter" onclick="CurrencyPage.switchTab('converter')">${icon('refresh-cw', 14)} Cevirici</button>
      </div>

      <div id="currency-content">
        <div class="empty-state">
          <div class="empty-state-icon">${icon('arrow-left-right', 14)}</div>
          <div class="empty-state-text">Veriler yukleniyor...</div>
        </div>
      </div>
    `;

    await this.refresh();
    this.switchTab('fiat');

    // Auto refresh every 30s
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    this.refreshInterval = setInterval(() => this.refresh(), 30000);

    // Live counter update every 1s
    if (this.counterInterval) clearInterval(this.counterInterval);
    this.counterInterval = setInterval(() => this.updateCounter(), 1000);

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  updateCounter() {
    const timeEl = document.getElementById('currency-update-time');
    if (!timeEl || !this.lastUpdateTime) return;
    const seconds = Math.floor((Date.now() - this.lastUpdateTime) / 1000);
    if (seconds < 5) {
      timeEl.textContent = 'Az once guncellendi';
    } else if (seconds < 60) {
      timeEl.textContent = `${seconds} saniye once guncellendi`;
    } else {
      const mins = Math.floor(seconds / 60);
      timeEl.textContent = `${mins} dakika once guncellendi`;
    }
  },

  async refresh(forceRefresh = false) {
    try {
      const [ratesData, cryptoData] = await Promise.all([
        api.currency.fetchRates(forceRefresh),
        api.currency.fetchCrypto(forceRefresh)
      ]);

      // Extract _cachedAt metadata and clean from rates object
      let cachedAt = null;
      if (ratesData && ratesData._cachedAt) {
        cachedAt = ratesData._cachedAt;
        this.rates = Object.fromEntries(Object.entries(ratesData).filter(([k]) => k !== '_cachedAt'));
      } else {
        this.rates = ratesData;
      }
      this.crypto = cryptoData;
      this.lastUpdateTime = cachedAt || Date.now();
      this.updateCounter();

      // Re-render current tab
      const activeTab = document.querySelector('.tab-btn.active');
      if (activeTab) this.switchTab(activeTab.dataset.tab);

      if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (e) {
      console.error('Currency refresh error:', e);
      Toast.show('Doviz verileri alinamadi. Internet baglantini kontrol et.', 'error');
    }
  },

  async forceRefresh() {
    const btn = document.querySelector('.currency-refresh-btn');
    const iconEl = btn ? btn.querySelector('.refresh-icon') : null;
    if (iconEl) iconEl.classList.add('spin-icon');
    if (btn) btn.disabled = true;
    await this.refresh(true);
    if (iconEl) iconEl.classList.remove('spin-icon');
    if (btn) btn.disabled = false;
  },

  switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tab);
    });
    const content = document.getElementById('currency-content');
    switch (tab) {
      case 'fiat': this.renderFiat(content); break;
      case 'crypto': this.renderCrypto(content); break;
      case 'converter': this.renderConverter(content); break;
    }
  },

  renderFiat(container) {
    if (!this.rates) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⏳</div><div class="empty-state-text">Doviz kurlari yukleniyor...</div></div>';
      return;
    }

    const currencies = [
      { code: 'USD', name: 'Amerikan Dolari', flag: '🇺🇸' },
      { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
      { code: 'GBP', name: 'Ingiliz Sterlini', flag: '🇬🇧' },
      { code: 'JPY', name: 'Japon Yeni', flag: '🇯🇵' },
      { code: 'CHF', name: 'Isvicre Frangi', flag: '🇨🇭' },
      { code: 'CAD', name: 'Kanada Dolari', flag: '🇨🇦' },
      { code: 'AUD', name: 'Avustralya Dolari', flag: '🇦🇺' },
      { code: 'SAR', name: 'Suudi Riyali', flag: '🇸🇦' },
      { code: 'CNY', name: 'Cin Yuani', flag: '🇨🇳' },
      { code: 'RUB', name: 'Rus Rublesi', flag: '🇷🇺' },
    ];

    container.innerHTML = `
      <div class="currency-grid">
        ${currencies.map(c => {
          const rate = this.rates[c.code];
          if (!rate) return '';
          return `
            <div class="currency-card">
              <div class="currency-pair">${c.flag} ${c.code} / TRY</div>
              <div class="currency-price">${rate.toFixed(c.code === 'JPY' || c.code === 'RUB' ? 4 : 2)} ₺</div>
              <div class="text-sm text-muted">${c.name}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  renderCrypto(container) {
    if (!this.crypto || this.crypto.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">₿</div><div class="empty-state-text">Kripto verileri yukleniyor...</div></div>';
      return;
    }

    container.innerHTML = `
      <div class="table-container card">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Coin</th>
              <th>Fiyat (USD)</th>
              <th>Fiyat (TRY)</th>
              <th>24s Degisim</th>
              <th>Market Cap</th>
            </tr>
          </thead>
          <tbody>
            ${this.crypto.map((c, i) => {
              const change = c.price_change_percentage_24h || 0;
              const tryRate = this.rates && this.rates['USD'] ? this.rates['USD'] : 1;
              const tryPrice = c.current_price * tryRate;
              return `
                <tr>
                  <td>${i + 1}</td>
                  <td>
                    <div style="display:flex; align-items:center; gap:8px;">
                      <img src="${c.image}" width="24" height="24" style="border-radius:50%;" onerror="this.style.display='none'">
                      <div>
                        <div class="font-bold">${c.name}</div>
                        <div class="text-sm text-muted">${c.symbol.toUpperCase()}</div>
                      </div>
                    </div>
                  </td>
                  <td class="font-bold">$${c.current_price.toLocaleString('en-US', { maximumFractionDigits: 2 })}</td>
                  <td class="font-bold">${tryPrice.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ₺</td>
                  <td>
                    <span class="currency-change ${change >= 0 ? 'up' : 'down'}">
                      ${change >= 0 ? icon('trending-up', 14) : icon('trending-down', 14)} ${Math.abs(change).toFixed(2)}%
                    </span>
                  </td>
                  <td class="text-muted">$${(c.market_cap / 1e9).toFixed(1)}B</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  renderConverter(container) {
    container.innerHTML = `
      <div class="converter-box">
        <div class="card-title">Doviz Cevirici</div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Tutar</label>
            <input type="number" class="form-input" id="conv-amount" value="1" step="0.01" oninput="CurrencyPage.convert()">
          </div>
          <div class="form-group">
            <label class="form-label">Kaynak</label>
            <select class="form-select" id="conv-from" onchange="CurrencyPage.convert()">
              <option value="TRY">🇹🇷 TRY</option>
              <option value="USD" selected>🇺🇸 USD</option>
              <option value="EUR">🇪🇺 EUR</option>
              <option value="GBP">🇬🇧 GBP</option>
              <option value="JPY">🇯🇵 JPY</option>
              <option value="CHF">🇨🇭 CHF</option>
            </select>
          </div>
          <div class="form-group" style="flex:0; display:flex; align-items:flex-end; padding-bottom:6px;">
            <button class="btn btn-ghost btn-icon" onclick="CurrencyPage.swapCurrencies()" style="font-size:18px;">⇄</button>
          </div>
          <div class="form-group">
            <label class="form-label">Hedef</label>
            <select class="form-select" id="conv-to" onchange="CurrencyPage.convert()">
              <option value="TRY" selected>🇹🇷 TRY</option>
              <option value="USD">🇺🇸 USD</option>
              <option value="EUR">🇪🇺 EUR</option>
              <option value="GBP">🇬🇧 GBP</option>
              <option value="JPY">🇯🇵 JPY</option>
              <option value="CHF">🇨🇭 CHF</option>
            </select>
          </div>
        </div>
        <div id="conv-result" style="text-align:center; margin-top:16px;">
          <div class="card-value text-accent" id="conv-result-value">—</div>
        </div>
      </div>
    `;

    this.convert();

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  convert() {
    if (!this.rates) return;

    const amount = parseFloat(document.getElementById('conv-amount').value) || 0;
    const from = document.getElementById('conv-from').value;
    const to = document.getElementById('conv-to').value;
    const resultEl = document.getElementById('conv-result-value');

    let inTRY;
    if (from === 'TRY') {
      inTRY = amount;
    } else {
      inTRY = amount * (this.rates[from] || 1);
    }

    let result;
    if (to === 'TRY') {
      result = inTRY;
    } else {
      result = inTRY / (this.rates[to] || 1);
    }

    if (resultEl) {
      resultEl.textContent = `${amount.toFixed(2)} ${from} = ${result.toFixed(2)} ${to}`;
    }
  },

  swapCurrencies() {
    const from = document.getElementById('conv-from');
    const to = document.getElementById('conv-to');
    const temp = from.value;
    from.value = to.value;
    to.value = temp;
    this.convert();
  },

  // Mini widget for dashboard
  getMiniWidget() {
    if (!this.rates) return '<div class="text-sm text-muted">Kur verisi yok</div>';

    return `
      <div class="mini-currency">
        <div class="mini-currency-item">
          <div class="mini-currency-label">🇺🇸 USD</div>
          <div class="mini-currency-value">${this.rates['USD'] ? this.rates['USD'].toFixed(2) + ' ₺' : '—'}</div>
        </div>
        <div class="mini-currency-item">
          <div class="mini-currency-label">🇪🇺 EUR</div>
          <div class="mini-currency-value">${this.rates['EUR'] ? this.rates['EUR'].toFixed(2) + ' ₺' : '—'}</div>
        </div>
        <div class="mini-currency-item">
          <div class="mini-currency-label">🇬🇧 GBP</div>
          <div class="mini-currency-value">${this.rates['GBP'] ? this.rates['GBP'].toFixed(2) + ' ₺' : '—'}</div>
        </div>
        <div class="mini-currency-item">
          <div class="mini-currency-label">₿ BTC</div>
          <div class="mini-currency-value">${this.crypto && this.crypto[0] ? '$' + Math.round(this.crypto[0].current_price).toLocaleString() : '—'}</div>
        </div>
      </div>
    `;
  },

  destroy() {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    if (this.counterInterval) clearInterval(this.counterInterval);
  }
};
