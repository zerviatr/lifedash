// ============ SHOP PAGE ============
const ShopPage = {
  async render(container) {
    const stats = await api.gamification.getUserStats();
    const inventory = await api.gamification.getEquipment();
    
    // Check if equipment owned
    const ownsGlasses = inventory.find(e => e.equipment_key === 'reading_glasses');
    const ownsShoes = inventory.find(e => e.equipment_key === 'running_shoes');
    
    const activeEquipment = stats.active_equipment_ids || null;
    
    container.innerHTML = `
      <div class="page-header" style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h1 class="page-title">Mağaza</h1>
          <p class="page-subtitle">LifeCoin'lerini harcayarak özel eşyalar al.</p>
        </div>
        <div class="wallet" style="background: var(--bg-secondary); padding: 10px 20px; border-radius: 8px; font-weight:bold; font-size: 18px; color: var(--warning);">
          🪙 ${stats.life_coins} LifeCoin
        </div>
      </div>
      
      <div class="card mb-20">
        <div class="card-title">Sarf Malzemeleri</div>
        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px;">
          <div class="shop-item card" style="background: var(--bg-primary); border:1px solid var(--border);">
            <div style="font-size:30px; text-align:center; margin-bottom:10px;">🛡️</div>
            <h3 style="text-align:center; margin:0 0 5px 0;">Seri Kalkanı</h3>
            <p style="font-size:12px; color: var(--text-secondary); text-align:center; margin:0 0 15px 0;">Bir gün giriş yapmazsan serini bozulmaktan korur. (Mevcut: ${stats.streak_freezes_owned})</p>
            <button class="btn btn-primary" style="width:100%;" onclick="ShopPage.buy('streak_freeze', 100)">🪙 100 Satın Al</button>
          </div>
        </div>
      </div>
      
      <div class="card mb-20">
        <div class="card-title">Kalıcı Ekipmanlar</div>
        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px;">
          
          <div class="shop-item card" style="background: var(--bg-primary); border:1px solid ${activeEquipment === 'reading_glasses' ? 'var(--success)' : 'var(--border)'};">
            <div style="font-size:30px; text-align:center; margin-bottom:10px;">👓</div>
            <h3 style="text-align:center; margin:0 0 5px 0;">Okuma Gözlüğü</h3>
            <p style="font-size:12px; color: var(--text-secondary); text-align:center; margin:0 0 15px 0;">İçinde 'kitap' geçen tüm görevlerden %20 fazla XP kazandırır.</p>
            ${ownsGlasses 
              ? `<button class="btn ${activeEquipment === 'reading_glasses' ? 'btn-ghost disabled' : 'btn-success'}" style="width:100%;" onclick="ShopPage.equip('reading_glasses')">${activeEquipment === 'reading_glasses' ? 'Kuşanıldı' : 'Kuşan'}</button>`
              : `<button class="btn btn-primary" style="width:100%;" onclick="ShopPage.buy('equipment', 500, 'reading_glasses')">🪙 500 Satın Al</button>`
            }
          </div>
          
          <div class="shop-item card" style="background: var(--bg-primary); border:1px solid ${activeEquipment === 'running_shoes' ? 'var(--success)' : 'var(--border)'};">
            <div style="font-size:30px; text-align:center; margin-bottom:10px;">👟</div>
            <h3 style="text-align:center; margin:0 0 5px 0;">Koşu Ayakkabısı</h3>
            <p style="font-size:12px; color: var(--text-secondary); text-align:center; margin:0 0 15px 0;">İçinde 'spor' veya 'koşu' geçen görevlerden %20 fazla XP kazandırır.</p>
            ${ownsShoes 
              ? `<button class="btn ${activeEquipment === 'running_shoes' ? 'btn-ghost disabled' : 'btn-success'}" style="width:100%;" onclick="ShopPage.equip('running_shoes')">${activeEquipment === 'running_shoes' ? 'Kuşanıldı' : 'Kuşan'}</button>`
              : `<button class="btn btn-primary" style="width:100%;" onclick="ShopPage.buy('equipment', 500, 'running_shoes')">🪙 500 Satın Al</button>`
            }
          </div>
        </div>
      </div>
    `;
  },
  
  async buy(type, price, id = null) {
    if(!confirm('Satın almak istediğinize emin misiniz?')) return;
    const res = await api.gamification.buyItem(type, price, id);
    if(res.success) {
      Toast.show('Satın alma başarılı!', 'success');
      SoundManager.play('achievementUnlock');
      await App.loadUserStats(); // Update header
      this.render(document.getElementById('content'));
    } else {
      Toast.show(res.reason || 'Satın alma başarısız.', 'error');
      SoundManager.play('impulseReject');
    }
  },
  
  async equip(id) {
    await api.gamification.equipItem(id);
    Toast.show('Ekipman kuşanıldı!', 'success');
    await App.loadUserStats();
    this.render(document.getElementById('content'));
  }
};
