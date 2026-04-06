// ============ TUTORIAL / ONBOARDING ENGINE ============
const Tutorial = {
  steps: [
    {
      selector: null,
      title: '⚡ LifeDash\'e Hoş Geldin!',
      text: 'Hayatını oyunlaştırmaya hazır mısın? Görevlerini tamamla, XP kazan, seviye atla ve Boss\'ları yen! Sana uygulamanın temel özelliklerini adım adım göstereceğiz.',
      position: 'center',
      page: null,
      icon: '🚀'
    },
    {
      selector: '#titlebar-xp',
      title: '🏆 XP & Seviye Sistemi',
      text: 'Görevlerini tamamladıkça XP kazanır ve seviye atlarsın. Hafta sonları %50 bonus XP kazanırsın! Seviyeni ve unvanını her zaman buradan takip edebilirsin.',
      position: 'bottom',
      page: 'dashboard'
    },
    {
      selector: '#streak-badge',
      title: '🔥 Günlük Seri',
      text: 'Her gün en az bir görev tamamlayarak serini koru. Seri ne kadar uzarsa o kadar çok başarım açarsın. Mağazadan "Seri Kalkanı" alarak bir günlük koruma sağlayabilirsin.',
      position: 'right',
      page: 'dashboard'
    },
    {
      selector: '.daily-limit-widget',
      title: '💰 Bütçe & Dürtü Kontrolü',
      text: 'Günlük harcama limitini buradan takip et. Harcama eklerken "Dürtü?" butonuna basarak 24 saat bekleme kuralını uygula. Dürtüyü yenersen ekstra XP kazanırsın!',
      position: 'bottom',
      page: 'finance'
    },
    {
      selector: '.wallet',
      title: '🏪 Mağaza & LifeCoin',
      text: 'Görevler ve alışkanlıklarla kazandığın LifeCoin\'leri burada harcayabilirsin. Seri Kalkanı, Okuma Gözlüğü veya Koşu Ayakkabısı satın alarak bonuslar kazan! Hazırsan haydi başlayalım! 🎮',
      position: 'bottom',
      page: 'shop'
    }
  ],

  currentStep: 0,
  spotlightEl: null,
  tooltipEl: null,
  overlayEl: null,
  isActive: false,

  async start() {
    this.currentStep = 0;
    this.isActive = true;
    await this.showStep(0);
  },

  async showStep(index) {
    // Clean previous
    this.cleanup();

    if (index < 0 || index >= this.steps.length) {
      this.finish();
      return;
    }

    this.currentStep = index;
    const step = this.steps[index];

    // Navigate to the required page if needed
    if (step.page && App.currentPage !== step.page) {
      await App.navigateTo(step.page);
      // Small delay so DOM renders
      await new Promise(r => setTimeout(r, 350));
    }

    if (step.selector) {
      this.showSpotlightStep(step, index);
    } else {
      this.showCenterStep(step, index);
    }
  },

  showCenterStep(step, index) {
    // Full-screen overlay
    this.overlayEl = document.createElement('div');
    this.overlayEl.className = 'tutorial-overlay-full';
    document.body.appendChild(this.overlayEl);

    // Center tooltip
    this.tooltipEl = this.createTooltip(step, index, true);
    document.body.appendChild(this.tooltipEl);
  },

  showSpotlightStep(step, index) {
    const target = document.querySelector(step.selector);

    if (!target) {
      // Target not found, skip to next
      console.warn(`Tutorial: selector "${step.selector}" not found, skipping.`);
      this.showStep(index + 1);
      return;
    }

    const rect = target.getBoundingClientRect();
    const pad = 8; // padding around element

    // Spotlight div
    this.spotlightEl = document.createElement('div');
    this.spotlightEl.className = 'tutorial-spotlight pulse';
    this.spotlightEl.style.top = (rect.top - pad) + 'px';
    this.spotlightEl.style.left = (rect.left - pad) + 'px';
    this.spotlightEl.style.width = (rect.width + pad * 2) + 'px';
    this.spotlightEl.style.height = (rect.height + pad * 2) + 'px';
    document.body.appendChild(this.spotlightEl);

    // Click the spotlight overlay to prevent interaction
    this.spotlightEl.addEventListener('click', (e) => e.stopPropagation());

    // Tooltip
    this.tooltipEl = this.createTooltip(step, index, false);
    document.body.appendChild(this.tooltipEl);

    // Position tooltip relative to target
    this.positionTooltip(this.tooltipEl, rect, step.position);
  },

  createTooltip(step, index, isCenter) {
    const tooltip = document.createElement('div');
    tooltip.className = `tutorial-tooltip ${isCenter ? 'center' : ''}`;

    const isFirst = index === 0;
    const isLast = index === this.steps.length - 1;

    tooltip.innerHTML = `
      ${step.icon ? `<div class="tutorial-welcome-icon">${step.icon}</div>` : ''}
      <div class="tutorial-tooltip-title">${step.title}</div>
      <div class="tutorial-tooltip-text">${step.text}</div>
      <div class="tutorial-actions">
        <button class="tutorial-btn tutorial-btn-skip" onclick="Tutorial.finish()">Atla</button>
        <div class="btn-group">
          ${!isFirst ? `<button class="tutorial-btn tutorial-btn-prev" onclick="Tutorial.prev()">← Geri</button>` : ''}
          <button class="tutorial-btn tutorial-btn-next" onclick="Tutorial.next()">${isLast ? '✓ Başla!' : 'İleri →'}</button>
        </div>
      </div>
      <div class="tutorial-dots">
        ${this.steps.map((_, i) => `<div class="tutorial-dot ${i === index ? 'active' : (i < index ? 'done' : '')}"></div>`).join('')}
      </div>
    `;

    return tooltip;
  },

  positionTooltip(tooltip, targetRect, position) {
    // Wait one frame for tooltip to have its dimensions
    requestAnimationFrame(() => {
      const tRect = tooltip.getBoundingClientRect();
      const margin = 16;
      let top, left;

      switch (position) {
        case 'bottom':
          top = targetRect.bottom + margin;
          left = targetRect.left + (targetRect.width / 2) - (tRect.width / 2);
          break;
        case 'top':
          top = targetRect.top - tRect.height - margin;
          left = targetRect.left + (targetRect.width / 2) - (tRect.width / 2);
          break;
        case 'right':
          top = targetRect.top + (targetRect.height / 2) - (tRect.height / 2);
          left = targetRect.right + margin;
          break;
        case 'left':
          top = targetRect.top + (targetRect.height / 2) - (tRect.height / 2);
          left = targetRect.left - tRect.width - margin;
          break;
        default:
          top = targetRect.bottom + margin;
          left = targetRect.left;
      }

      // Clamp within viewport
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (left < 10) left = 10;
      if (left + tRect.width > vw - 10) left = vw - tRect.width - 10;
      if (top < 10) top = 10;
      if (top + tRect.height > vh - 10) top = vh - tRect.height - 10;

      tooltip.style.top = top + 'px';
      tooltip.style.left = left + 'px';
    });
  },

  next() {
    this.showStep(this.currentStep + 1);
  },

  prev() {
    this.showStep(this.currentStep - 1);
  },

  cleanup() {
    if (this.spotlightEl) { this.spotlightEl.remove(); this.spotlightEl = null; }
    if (this.tooltipEl) { this.tooltipEl.remove(); this.tooltipEl = null; }
    if (this.overlayEl) { this.overlayEl.remove(); this.overlayEl = null; }
  },

  async finish() {
    this.cleanup();
    this.isActive = false;
    await api.settings.setSetting('tutorial_completed', 'true');
    // Return to dashboard
    if (App.currentPage !== 'dashboard') {
      await App.navigateTo('dashboard');
    }
    Toast.show('Eğitim tamamlandı! Haydi başlayalım! 🎉', 'success');
  }
};
