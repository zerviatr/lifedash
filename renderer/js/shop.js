// ============ SHOP PAGE ============
const ShopPage = {
  currentTab: 'shop',

  async render(container) {
    container.innerHTML = Skeleton.card(4);

    const [items, inventory, coins, buffs] = await Promise.all([
      api.shop.getItems(),
      api.shop.getInventory(),
      api.shop.getLifeCoins(),
      api.shop.getActiveBuffs()
    ]);

    const ownedKeys = new Set(inventory.map(i => i.item_key));
    const rarityColors = { common: '#9ca3af', rare: '#3b82f6', epic: '#a855f7', legendary: '#f59e0b' };
    const rarityLabels = { common: 'Siradan', rare: 'Nadir', epic: 'Epik', legendary: 'Efsanevi' };

    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">${icon('shopping-cart', 14)} Dukkan</h1>
        <p class="page-subtitle">LifeCoin harca, oduller kazan! <span style="color:#fbbf24; font-weight:bold;">🪙 ${coins} LifeCoin</span></p>
      </div>

      <div class="tab-bar">
        <button class="tab-btn ${this.currentTab === 'shop' ? 'active' : ''}" data-tab="shop">Dukkan</button>
        <button class="tab-btn ${this.currentTab === 'inventory' ? 'active' : ''}" data-tab="inventory">Envanter</button>
        <button class="tab-btn ${this.currentTab === 'crafting' ? 'active' : ''}" data-tab="crafting">Crafting</button>
        <button class="tab-btn ${this.currentTab === 'buffs' ? 'active' : ''}" data-tab="buffs">Aktif Buff'lar</button>
      </div>

      <div id="shop-content"></div>
    `;

    container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentTab = btn.dataset.tab;
        this.renderTab(btn.dataset.tab, items, inventory, coins, buffs, ownedKeys, rarityColors, rarityLabels);
      });
    });

    this.renderTab(this.currentTab, items, inventory, coins, buffs, ownedKeys, rarityColors, rarityLabels);

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  renderTab(tab, items, inventory, coins, buffs, ownedKeys, rarityColors, rarityLabels) {
    const content = document.getElementById('shop-content');
    if (tab === 'shop') this.renderShop(content, items, coins, ownedKeys, rarityColors, rarityLabels);
    else if (tab === 'inventory') this.renderInventory(content, inventory, rarityColors, rarityLabels);
    else if (tab === 'crafting') this.renderCrafting(content, rarityColors, rarityLabels);
    else if (tab === 'buffs') this.renderBuffs(content, buffs);
  },

  renderShop(container, items, coins, ownedKeys, rarityColors, rarityLabels) {
    const types = ['theme', 'boost', 'consumable', 'equipment', 'frame'];
    const typeLabels = { theme: 'Temalar', boost: "Boost'lar", consumable: 'Tuketilebilirler', equipment: 'Ekipmanlar', frame: 'Cerceveler' };

    container.innerHTML = types.map(type => {
      const typeItems = items.filter(i => i.type === type);
      if (typeItems.length === 0) return '';
      return `
        <div class="card-title mt-20">${typeLabels[type] || type}</div>
        <div class="grid-3">
          ${typeItems.map(item => {
            const owned = ownedKeys.has(item.key);
            const canAfford = coins >= item.price_coins;
            const rColor = rarityColors[item.rarity] || '#9ca3af';
            return `
              <div class="card" style="border-top: 3px solid ${rColor}; position:relative;">
                <div style="position:absolute; top:8px; right:8px;">
                  <span class="text-sm font-bold" style="color:${rColor};">${rarityLabels[item.rarity] || item.rarity}</span>
                </div>
                <div style="font-size:32px; margin-bottom:8px;">${item.icon}</div>
                <div class="font-bold" style="font-size:14px;">${item.name}</div>
                <div class="text-sm text-muted" style="margin:4px 0 12px;">${item.description}</div>
                <div class="flex-between">
                  <span style="color:#fbbf24; font-weight:bold;">🪙 ${item.price_coins}</span>
                  ${owned ? `<span class="tag tag-income">Sahip</span>` :
                    `<button class="btn ${canAfford ? 'btn-primary' : 'btn-ghost'} btn-sm" ${!canAfford ? 'disabled' : ''}
                      onclick="ShopPage.purchase('${item.key}')">
                      ${canAfford ? 'Satin Al' : `${item.price_coins - coins} coin daha lazim`}
                    </button>`
                  }
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  renderInventory(container, inventory, rarityColors, rarityLabels) {
    if (inventory.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🎒</div>
          <div class="empty-state-text">Envanterin bos. Dukkandan urun satin al!</div>
        </div>
      `;
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    container.innerHTML = `
      <div class="grid-3 mt-20">
        ${inventory.map(item => {
          const rColor = rarityColors[item.rarity] || '#9ca3af';
          const isEquipment = item.type === 'equipment';
          return `
            <div class="card" style="border-left: 3px solid ${rColor};">
              <div class="flex-between mb-8">
                <div>
                  <span style="font-size:24px;">${item.icon}</span>
                  <span class="font-bold">${item.name}</span>
                </div>
                ${item.quantity > 1 ? `<span class="tag">x${item.quantity}</span>` : ''}
              </div>
              <div class="text-sm text-muted mb-8">${item.description}</div>
              ${isEquipment ? `
                <button class="btn ${item.equipped ? 'btn-danger' : 'btn-success'} btn-sm"
                  onclick="ShopPage.toggleEquip('${item.item_key}', ${item.equipped})">
                  ${item.equipped ? 'Cikar' : 'Kus'}
                </button>
              ` : ''}
              ${item.type === 'boost' ? `
                <button class="btn btn-primary btn-sm" onclick="ShopPage.useBoost('${item.item_key}')">Kullan</button>
              ` : ''}
              ${item.type === 'consumable' ? `
                <button class="btn btn-warning btn-sm" onclick="ShopPage.useConsumable('${item.item_key}')">Kullan</button>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  renderBuffs(container, buffs) {
    if (buffs.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">✨</div>
          <div class="empty-state-text">Aktif buff yok. Dukkandan boost satin al veya ozel etkinlikleri bekle!</div>
        </div>
      `;
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:12px; margin-top:20px;">
        ${buffs.map(b => {
          const expires = new Date(b.expires_at);
          const remaining = Math.max(0, Math.round((expires - Date.now()) / 60000));
          const hours = Math.floor(remaining / 60);
          const mins = remaining % 60;
          return `
            <div class="card" style="border-left: 4px solid #fbbf24;">
              <div class="flex-between">
                <div>
                  <span class="font-bold">x${b.multiplier} XP Carpani</span>
                  <span class="text-sm text-muted" style="margin-left:8px;">${b.reason || b.source || ''}</span>
                </div>
                <span class="text-sm text-warning font-bold">${hours > 0 ? `${hours}s ${mins}dk` : `${mins}dk`} kaldi</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  async renderCrafting(container, rarityColors, rarityLabels) {
    const recipes = await api.shop.getCraftingRecipes();

    if (recipes.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">${icon('hammer', 14)}</div>
          <div class="empty-state-text">Crafting tarifleri yukleniyor...</div>
        </div>
      `;
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    container.innerHTML = `
      <div class="card-title mt-20">Crafting Tarifleri</div>
      <div class="text-sm text-muted mb-16">2 item birlestirip daha guclu itemlar olustur!</div>
      <div class="grid-2">
        ${recipes.map(r => {
          const rColor = r.result ? (rarityColors[r.result.rarity] || '#9ca3af') : '#9ca3af';
          return `
            <div class="card" style="border-top:3px solid ${rColor};">
              <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
                <div style="text-align:center; min-width:60px;">
                  <div style="font-size:28px;">${r.item1 ? r.item1.icon : '?'}</div>
                  <div class="text-sm ${r.hasItem1 ? 'text-success' : 'text-danger'}">${r.item1 ? r.item1.name : r.item1_key}</div>
                </div>
                <span style="font-size:20px; color:var(--text-muted);">+</span>
                <div style="text-align:center; min-width:60px;">
                  <div style="font-size:28px;">${r.item2 ? r.item2.icon : '?'}</div>
                  <div class="text-sm ${r.hasItem2 ? 'text-success' : 'text-danger'}">${r.item2 ? r.item2.name : r.item2_key}</div>
                </div>
                <span style="font-size:20px; color:var(--text-muted);">=</span>
                <div style="text-align:center; min-width:60px;">
                  <div style="font-size:32px;">${r.result ? r.result.icon : '?'}</div>
                  <div class="font-bold text-sm" style="color:${rColor};">${r.result ? r.result.name : r.result_key}</div>
                </div>
              </div>
              <div class="text-sm text-muted mb-8">${r.result ? r.result.description : ''}</div>
              <div class="flex-between">
                <span class="text-sm" style="color:#fbbf24;">Maliyet: 🪙 ${r.coin_cost}</span>
                <button class="btn ${r.canCraft ? 'btn-primary' : 'btn-ghost'} btn-sm" ${!r.canCraft ? 'disabled' : ''}
                  onclick="ShopPage.craftItem(${r.id})">
                  ${r.canCraft ? `${icon('hammer', 14)} Craft` : 'Malzeme Eksik'}
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  async craftItem(recipeId) {
    const result = await api.shop.craftItem(recipeId);
    if (result.success) {
      SoundManager.play('achievementUnlock');
      Toast.show(`${result.item.icon} ${result.item.name} olusturuldu!`, 'loot');
      await App.loadUserStats();
      await this.render(document.getElementById('content'));
    } else {
      Toast.show(result.message || 'Craft basarisiz!', 'error');
    }
  },

  async purchase(itemKey) {
    const result = await api.shop.purchase(itemKey);
    if (result.success) {
      SoundManager.play('shopPurchase');
      Toast.show(`${result.item.name} satin alindi!`, 'success');
      await App.loadUserStats();
      PubSub.publish('coins:changed');
      await this.render(document.getElementById('content'));
    } else {
      Toast.show(result.message || 'Satin alma basarisiz!', 'error');
    }
  },

  async toggleEquip(itemKey, isEquipped) {
    if (isEquipped) {
      await api.shop.unequip(itemKey);
      Toast.show('Ekipman cikarildi', 'success');
    } else {
      await api.shop.equip(itemKey);
      Toast.show('Ekipman kusildi!', 'success');
    }
    await this.render(document.getElementById('content'));
  },

  async useBoost(itemKey) {
    const inventory = await api.shop.getInventory();
    const item = inventory.find(i => i.item_key === itemKey);
    if (!item) return;
    const data = JSON.parse(item.data || '{}');
    await api.shop.addBuff('shop_boost', data.multiplier || 1.5, data.hours || 24, 'shop', item.name);
    Toast.show(`${item.name} aktif edildi! x${data.multiplier || 1.5} XP carpani!`, 'xp');
    SoundManager.play('coinEarn');
    await this.render(document.getElementById('content'));
  },

  async useConsumable(itemKey) {
    const result = await api.shop.useConsumable(itemKey);
    if (result.success) {
      SoundManager.play('coinEarn');
      Toast.show(`${result.item}: ${result.effect}`, 'xp');
      await App.loadUserStats();
      await this.render(document.getElementById('content'));
    } else {
      Toast.show(result.message || 'Kullanilamadi!', 'error');
    }
  }
};
