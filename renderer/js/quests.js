// ============ AI DUNGEON MASTER PAGE ============
const QuestsPage = {
  async render(container) {
    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title text-accent">Dungeon Master</h1>
        <p class="page-subtitle">AI tarafından yaratılmış dinamik RPG harcama/alışkanlık görevleri</p>
      </div>

      <div class="quest-board" id="quest-board-container">
        <div class="dm-controls">
          <button class="prompt-btn" id="btn-generate-quest" onclick="QuestsPage.generateNewQuest()">
            <i data-lucide="sparkles"></i> Kader Zarını At (Yeni Görev İste)
          </button>
        </div>
        <div id="quest-list">
          <div style="text-align:center; padding: 40px; color: var(--muted);">Yükleniyor...</div>
        </div>
      </div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
    await this.loadQuests();
  },

  async loadQuests() {
    const list = document.getElementById('quest-list');
    if (!list) return;

    try {
      const quests = await api.dynamicQuests.getActive();
      
      if (!quests || quests.length === 0) {
        list.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon" style="color:var(--accent);">📜</div>
            <div class="empty-state-text">Şu an aktif bir DM görevi yok. Kader zarını at!</div>
          </div>
        `;
        return;
      }

      list.innerHTML = quests.map(q => `
        <div class="quest-card" id="quest-card-${q.id}">
          <div class="quest-title">${q.title}</div>
          <div class="quest-desc">"${q.description}"</div>
          <div style="display:flex; justify-content:space-between; align-items:flex-end;">
            <div class="quest-rewards">
              <span class="reward-badge reward-xp">+${q.reward_xp} XP</span>
              <span class="reward-badge reward-coins">+${q.reward_coins} Coin</span>
            </div>
            <button class="quest-complete-btn" onclick="QuestsPage.completeQuest(${q.id}, event)">Tamamla</button>
          </div>
        </div>
      `).join('');
    } catch (error) {
      console.error(error);
      list.innerHTML = `<div style="text-align:center; padding: 20px; color: var(--danger);">Görevler yüklenirken hata oluştu!</div>`;
    }
  },

  async generateNewQuest() {
    const btn = document.getElementById('btn-generate-quest');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Zarlar Dönüyor...';
    btn.disabled = true;

    try {
      // Gather some context for the DM
      const context = await api.ai.getContext();
      const result = await api.ai.generateQuest(context);

      if (result.error) {
        Toast.show(result.error, 'error');
      } else if (result.quest) {
        const q = result.quest;
        await api.dynamicQuests.add({
          title: q.title,
          description: q.description,
          reward_xp: q.reward_xp || 50,
          reward_coins: q.reward_coins || 10
        });
        Toast.show('Yeni Bir Görev Belirdi!', 'success');
        SoundManager.play('levelUp'); // Epic sound
        await this.loadQuests();
      }
    } catch (e) {
      console.error(e);
      Toast.show('Görev üretilirken bir ritüel hatası oluştu.', 'error');
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
  },

  async completeQuest(id, event) {
    const btn = event.currentTarget;
    btn.disabled = true;
    btn.innerHTML = 'Tamamlanıyor...';

    try {
      const res = await api.dynamicQuests.complete(id);
      if (res.success) {
        // Explode XP from the button context
        this.spawnXPParticles(event.clientX, event.clientY, res.xp, res.coins);
        
        Toast.show(`Görev Tamamlandı! +${res.xp} XP, +${res.coins} Coin`, 'xp');
        SoundManager.play('check');

        // Check level up via event
        if (res.levelChanged) {
          setTimeout(() => {
            PubSub.publish('stats:refreshed', { level: res.newLevel });
          }, 1500);
        }

        // Animate card removal
        const card = document.getElementById(`quest-card-${id}`);
        if(card) {
          card.style.transform = 'scale(0.95)';
          card.style.opacity = '0';
          setTimeout(() => this.loadQuests(), 400); // Reload after animation
        } else {
          this.loadQuests();
        }

        // Inform app to refresh UI like titlebar
        App.loadUserStats();
      } else {
        Toast.show(res.message, 'error');
        btn.disabled = false;
        btn.innerHTML = 'Tamamla';
      }
    } catch (e) {
      console.error(e);
      Toast.show('Görev tamamlamada sorun yaşandı.', 'error');
      btn.disabled = false;
      btn.innerHTML = 'Tamamla';
    }
  },

  spawnXPParticles(x, y, xp, coins) {
    const numParticles = 10;
    for (let i = 0; i < numParticles; i++) {
        const isCoin = i % 3 === 0; // 1/3 odds coin representation
        const el = document.createElement('div');
        el.className = 'xp-particle';
        
        // Randomize text visually for bulk
        el.innerText = isCoin ? '+Coin' : '+XP';
        el.style.color = isCoin ? 'var(--warning)' : 'var(--success)';
        
        // Random spawn offsets around the click
        const offsetX = (Math.random() - 0.5) * 80;
        const offsetY = (Math.random() - 0.5) * 40;
        
        el.style.left = (x + offsetX) + 'px';
        el.style.top = (y + offsetY) + 'px';
        
        // Randomize animation specific timings slightly
        el.style.animationDuration = (0.8 + Math.random() * 0.6) + 's';
        
        document.body.appendChild(el);
        
        // Clean up
        setTimeout(() => {
            if(el.parentNode) el.remove();
        }, 1500);
    }
  }
};
