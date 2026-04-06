// ============ TASKS PAGE ============
const TasksPage = {
  currentTab: 'daily',

  async render(container) {
    container.innerHTML = Skeleton.list();

    const [tasks, stats] = await Promise.all([
      api.tasks.getDailyTasks(),
      api.xp.getUserStats()
    ]);

    const pending = tasks.filter(t => t.status === 'pending');
    const completed = tasks.filter(t => t.status === 'completed');
    const failed = tasks.filter(t => t.status === 'failed');

    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Görevler & Projeler</h1>
        <p class="page-subtitle">Görevleri tamamla, XP kazan. Zorluk çarpanı: <span class="${(stats.difficulty_multiplier || 1) > 1 ? 'text-danger font-bold' : 'text-success font-bold'}">x${(stats.difficulty_multiplier || 1).toFixed(1)}</span></p>
      </div>

      <div class="tab-bar">
        <button class="tab-btn ${this.currentTab === 'daily' ? 'active' : ''}" data-tab="daily">Günlük Görevler</button>
        <button class="tab-btn ${this.currentTab === 'projects' ? 'active' : ''}" data-tab="projects">Projeler</button>
        <button class="tab-btn ${this.currentTab === 'recurring' ? 'active' : ''}" data-tab="recurring">Tekrarlayan</button>
      </div>

      <!-- XP Summary -->
      <div class="xp-bar-container mb-16">
        <div class="xp-level">Lv.${stats.level}</div>
        <div class="xp-info">
          <div class="xp-text">
            <span>${stats.xpProgress} / ${stats.xpNeeded} XP</span>
            <span>${icon('flame', 14)} ${stats.current_streak} gün seri</span>
          </div>
          <div class="xp-bar">
            <div class="xp-fill" style="width: ${stats.progressPercent}%"></div>
          </div>
        </div>
      </div>

      <div id="tasks-content"></div>
    `;

    container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentTab = btn.dataset.tab;
        this.renderTab(btn.dataset.tab, tasks, pending, completed, failed);
      });
    });

    this.renderTab(this.currentTab, tasks, pending, completed, failed);

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  renderTab(tab, tasks, pending, completed, failed) {
    const content = document.getElementById('tasks-content');
    if (tab === 'daily') {
      this.renderDailyTasks(content, pending, completed, failed);
    } else if (tab === 'projects') {
      this.renderProjects(content);
    } else if (tab === 'recurring') {
      this.renderRecurringTasks(content);
    }
  },

  renderDailyTasks(container, pending, completed, failed) {
    container.innerHTML = `
      <!-- Pending Tasks -->
      ${pending.length > 0 ? `
        <div class="card-title">Bekleyen Görevler</div>
        <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:20px;">
          ${pending.map(t => `
            <div class="task-card">
              <div class="task-status-icon" style="background: var(--warning-glow);">⏳</div>
              <div class="task-info">
                <div class="task-title">${t.title}</div>
                <div class="task-desc">${t.description || ''}</div>
              </div>
              <span class="task-xp task-xp-reward">+${t.xp_reward} XP</span>
              <span class="task-xp task-xp-penalty">-${t.xp_penalty} XP</span>
              <div class="task-actions">
                <button class="btn btn-success btn-sm" onclick="TasksPage.complete(${t.id})">✓ Tamamla</button>
                <button class="btn btn-danger btn-sm" onclick="TasksPage.fail(${t.id})">✗ Başarısız</button>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <!-- Completed Tasks -->
      ${completed.length > 0 ? `
        <div class="card-title">Tamamlanan ${icon('check-circle', 14)}</div>
        <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:20px;">
          ${completed.map(t => `
            <div class="task-card completed">
              <div class="task-status-icon" style="background: var(--success-glow);">${icon('check-circle', 14)}</div>
              <div class="task-info">
                <div class="task-title">${t.title}</div>
                <div class="task-desc">${t.description || ''}</div>
              </div>
              <span class="task-xp task-xp-reward">+${t.xp_reward} XP</span>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <!-- Failed Tasks -->
      ${failed.length > 0 ? `
        <div class="card-title">Başarısız ${icon('x-circle', 14)}</div>
        <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:20px;">
          ${failed.map(t => `
            <div class="task-card failed">
              <div class="task-status-icon" style="background: var(--danger-glow);">${icon('x-circle', 14)}</div>
              <div class="task-info">
                <div class="task-title">${t.title}</div>
                <div class="task-desc">${t.description || ''}</div>
              </div>
              <span class="task-xp task-xp-penalty">-${t.xp_penalty} XP</span>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${pending.length === 0 && completed.length === 0 && failed.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon">${icon('swords', 14)}</div>
          <div class="empty-state-text">Bugün için görev yok.</div>
        </div>
      ` : ''}
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  async renderProjects(container) {
    const projects = await api.projects.getAll();
    const active = projects.filter(p => p.status === 'active');
    const completed = projects.filter(p => p.status === 'completed');

    container.innerHTML = `
      <div class="flex-between mb-16">
        <div class="card-title" style="margin:0;">Aktif Projeler</div>
        <button class="btn btn-primary btn-sm" onclick="TasksPage.showAddProjectModal()">${icon('plus', 14)} Proje Ekle</button>
      </div>

      ${active.length > 0 ? `
        <div style="display:flex; flex-direction:column; gap:16px; margin-bottom:20px;">
          ${active.map(p => `
            <div class="card" style="border-left: 4px solid ${p.color};">
              <div class="flex-between mb-8">
                <div>
                  <span style="font-size:20px; margin-right:8px;">${p.icon}</span>
                  <span class="font-bold" style="font-size:16px;">${p.name}</span>
                  ${p.description ? `<span class="text-sm text-muted" style="margin-left:8px;">${p.description}</span>` : ''}
                </div>
                <div style="display:flex; gap:6px;">
                  ${p.progress === 100 ? `<button class="btn btn-success btn-sm" onclick="TasksPage.completeProject(${p.id})">✓ Tamamla (+${p.xp_bonus} XP)</button>` : ''}
                  <button class="btn btn-ghost btn-sm" onclick="TasksPage.deleteProject(${p.id})">${icon('trash-2', 14)}</button>
                </div>
              </div>
              <div class="progress-bar mb-8" style="height:8px;">
                <div class="progress-fill" style="width:${p.progress}%; background:${p.color};"></div>
              </div>
              <div class="text-sm text-muted mb-8">${p.completedCount}/${p.subtaskCount} alt görev • ${p.progress}%</div>

              <!-- Subtasks -->
              <div style="display:flex; flex-direction:column; gap:6px; margin-left:12px;">
                ${p.subtasks.map(st => `
                  <div style="display:flex; align-items:center; gap:8px;">
                    <input type="checkbox" ${st.is_completed ? 'checked' : ''} onchange="TasksPage.toggleSubtask(${st.id})" style="cursor:pointer;">
                    <span style="${st.is_completed ? 'text-decoration:line-through; opacity:0.5;' : ''}">${st.title}</span>
                    <button class="btn btn-ghost" style="padding:0 4px; font-size:11px; opacity:0.5;" onclick="TasksPage.deleteSubtask(${st.id})">✕</button>
                  </div>
                `).join('')}
              </div>
              <div style="margin-top:8px;">
                <button class="btn btn-ghost btn-sm" onclick="TasksPage.showAddSubtaskModal(${p.id})">${icon('plus', 14)} Alt Görev Ekle</button>
              </div>
            </div>
          `).join('')}
        </div>
      ` : `
        <div class="empty-state">
          <div class="empty-state-icon">📁</div>
          <div class="empty-state-text">Henüz proje yok. Büyük hedeflerini projelere böl!</div>
          <button class="btn btn-primary" onclick="TasksPage.showAddProjectModal()">İlk Projeyi Oluştur</button>
        </div>
      `}

      ${completed.length > 0 ? `
        <div class="card-title mt-20" style="color:var(--success);">Tamamlanan Projeler</div>
        <div style="display:flex; flex-direction:column; gap:10px;">
          ${completed.map(p => `
            <div class="card" style="border-left: 4px solid var(--success); opacity:0.7;">
              <span style="font-size:18px; margin-right:8px;">${p.icon}</span>
              <span class="font-bold">${p.name}</span>
              <span class="tag tag-income" style="margin-left:8px;">Tamamlandı</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  showAddProjectModal() {
    const icons = ['📁', '🚀', '💡', '🎯', '📱', '🌐', '🎨', '📖', '🏋️', '🎓'];
    const colors = ['#6366f1', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];
    showModal('Yeni Proje', `
      <div class="form-group">
        <label class="form-label">Proje Adı</label>
        <input type="text" class="form-input" id="proj-name" placeholder="Örn: Web sitesi yap, Kitap oku">
      </div>
      <div class="form-group">
        <label class="form-label">Açıklama</label>
        <input type="text" class="form-input" id="proj-desc" placeholder="Opsiyonel">
      </div>
      <div class="form-group">
        <label class="form-label">İkon</label>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          ${icons.map((ic, i) => `<div style="font-size:24px; cursor:pointer; padding:4px 8px; border-radius:8px; ${i === 0 ? 'background:var(--bg-input);' : ''}" onclick="document.querySelectorAll('#proj-icon-grid > div').forEach(d=>d.style.background=''); this.style.background='var(--bg-input)'; document.getElementById('proj-icon').value='${ic}';" id="proj-icon-grid">${ic}</div>`).join('')}
        </div>
        <input type="hidden" id="proj-icon" value="📁">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Renk</label>
          <input type="color" class="form-input" id="proj-color" value="#6366f1" style="height:40px;">
        </div>
        <div class="form-group">
          <label class="form-label">XP Bonus</label>
          <input type="number" class="form-input" id="proj-xp" value="50" min="10" max="500">
        </div>
      </div>
    `, async (overlay) => {
      const name = document.getElementById('proj-name').value.trim();
      if (!name) { Toast.show('Proje adı gir!', 'error'); return; }
      await api.projects.add({
        name,
        description: document.getElementById('proj-desc').value,
        icon: document.getElementById('proj-icon').value,
        color: document.getElementById('proj-color').value,
        xp_bonus: parseInt(document.getElementById('proj-xp').value) || 50
      });
      overlay.remove();
      Toast.show('Proje oluşturuldu!', 'success');
      this.renderProjects(document.getElementById('tasks-content'));
    });
  },

  showAddSubtaskModal(projectId) {
    showModal('Alt Görev Ekle', `
      <div class="form-group">
        <label class="form-label">Alt Görev</label>
        <input type="text" class="form-input" id="subtask-title" placeholder="Örn: Tasarım yap, Kodu yaz">
      </div>
    `, async (overlay) => {
      const title = document.getElementById('subtask-title').value.trim();
      if (!title) { Toast.show('Görev adı gir!', 'error'); return; }
      await api.projects.addSubtask({ project_id: projectId, title });
      overlay.remove();
      Toast.show('Alt görev eklendi!', 'success');
      this.renderProjects(document.getElementById('tasks-content'));
    });
  },

  async toggleSubtask(subtaskId) {
    await api.projects.toggleSubtask(subtaskId);
    this.renderProjects(document.getElementById('tasks-content'));
  },

  async deleteSubtask(subtaskId) {
    await api.projects.deleteSubtask(subtaskId);
    this.renderProjects(document.getElementById('tasks-content'));
  },

  async completeProject(projectId) {
    const result = await api.projects.complete(projectId);
    if (result) {
      Toast.show(`Proje tamamlandı! +${result.xp} XP 🎉`, 'xp');
      await App.loadUserStats();
      PubSub.publish('xp:changed');
    }
    this.renderProjects(document.getElementById('tasks-content'));
  },

  async deleteProject(projectId) {
    if (!confirm('Bu projeyi ve tüm alt görevlerini silmek istediğine emin misin?')) return;
    await api.projects.delete(projectId);
    Toast.show('Proje silindi', 'success');
    this.renderProjects(document.getElementById('tasks-content'));
  },

  async complete(taskId) {
    const result = await api.tasks.completeTask(taskId);
    if (result) {
      Toast.show(`+${result.leveledUp ? '🎉 SEVİYE ATLADIN! ' : ''}XP kazandın!`, 'xp');
      if (result.leveledUp) {
        Toast.show(`Seviye ${result.level}! Tebrikler! 🎉`, 'success');
      }
    }
    await App.loadUserStats();
    PubSub.publish('xp:changed');
    PubSub.publish('task:completed');
    api.challenges.updateProgress('task_complete', 1);
    await this.render(document.getElementById('content'));
  },

  async fail(taskId) {
    const result = await api.tasks.failTask(taskId);
    if (result) {
      Toast.show('XP kaybettin! Yarın daha çok çalış! 💪', 'error');
    }
    await App.loadUserStats();
    PubSub.publish('xp:changed');
    await this.render(document.getElementById('content'));
  },

  async renderRecurringTasks(container) {
    const recurring = await api.tasks.getRecurringTasks();
    const recLabels = { daily: 'Her gün', weekdays: 'Hafta içi', weekly: 'Haftalık' };

    container.innerHTML = `
      <div class="flex-between mb-16">
        <div class="card-title" style="margin:0;">Tekrarlayan Görevler</div>
        <button class="btn btn-primary btn-sm" onclick="TasksPage.showAddRecurringTaskModal()">${icon('plus', 14)} Ekle</button>
      </div>
      ${recurring.length > 0 ? `
        <div style="display:flex; flex-direction:column; gap:10px;">
          ${recurring.map(rt => `
            <div class="task-card">
              <div class="task-status-icon" style="background: var(--accent-glow);">${icon('refresh-cw', 14)}</div>
              <div class="task-info">
                <div class="task-title">${rt.title}</div>
                <div class="task-desc">${recLabels[rt.recurrence] || rt.recurrence} • +${rt.xp_reward} XP / -${rt.xp_penalty} XP</div>
              </div>
              <button class="btn btn-ghost btn-sm" onclick="TasksPage.deleteRecurringTask(${rt.id})">${icon('trash-2', 14)}</button>
            </div>
          `).join('')}
        </div>
      ` : `
        <div class="empty-state">
          <div class="empty-state-icon">${icon('refresh-cw', 14)}</div>
          <div class="empty-state-text">Henüz tekrarlayan görev yok. Her gün otomatik oluşturulacak görevler ekle!</div>
        </div>
      `}
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  showAddRecurringTaskModal() {
    showModal('Tekrarlayan Görev Ekle', `
      <div class="form-group">
        <label class="form-label">Görev Adı</label>
        <input type="text" class="form-input" id="rt-title" placeholder="Örn: 30dk kitap oku">
      </div>
      <div class="form-group">
        <label class="form-label">Açıklama</label>
        <input type="text" class="form-input" id="rt-desc" placeholder="Opsiyonel">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Tekrar</label>
          <select class="form-select" id="rt-recurrence">
            <option value="daily">Her gün</option>
            <option value="weekdays">Hafta içi</option>
            <option value="weekly">Haftalık</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">XP Ödülü</label>
          <input type="number" class="form-input" id="rt-xp" value="10" min="1" max="100">
        </div>
        <div class="form-group">
          <label class="form-label">XP Ceza</label>
          <input type="number" class="form-input" id="rt-penalty" value="5" min="0" max="50">
        </div>
      </div>
    `, async (overlay) => {
      const title = document.getElementById('rt-title').value;
      if (!title) { Toast.show('Görev adı gerekli!', 'error'); return; }
      await api.tasks.addRecurringTask({
        title,
        description: document.getElementById('rt-desc').value,
        xp_reward: parseInt(document.getElementById('rt-xp').value) || 10,
        xp_penalty: parseInt(document.getElementById('rt-penalty').value) || 5,
        recurrence: document.getElementById('rt-recurrence').value
      });
      overlay.remove();
      Toast.show('Tekrarlayan görev eklendi! Yarından itibaren otomatik oluşturulacak.', 'success');
      this.renderRecurringTasks(document.getElementById('tasks-content'));
    });
  },

  async deleteRecurringTask(id) {
    if (!confirm('Bu tekrarlayan görevi silmek istediğine emin misin?')) return;
    await api.tasks.deleteRecurringTask(id);
    Toast.show('Tekrarlayan görev silindi', 'success');
    this.renderRecurringTasks(document.getElementById('tasks-content'));
  }
};
