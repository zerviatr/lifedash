// ============ TASKS PAGE ============
const TasksPage = {
  async render(container) {
    const [tasks, stats, projects] = await Promise.all([
      api.tasks.getDailyTasks(),
      api.gamification.getUserStats(),
      api.tasks.getProjects()
    ]);

    this.projects = projects; // Cache for modals

    const pending = tasks.filter(t => t.status === 'pending');
    const completed = tasks.filter(t => t.status === 'completed');
    const failed = tasks.filter(t => t.status === 'failed');

    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Görevler & Projeler</h1>
        <p class="page-subtitle">Görevleri tamamla, XP kazan. Zorluk çarpanı: <span class="${(stats.difficulty_multiplier || 1) > 1 ? 'text-danger font-bold' : 'text-success font-bold'}">x${(stats.difficulty_multiplier || 1).toFixed(1)}</span></p>
      </div>

      <!-- XP Summary -->
      <div class="xp-bar-container mb-16">
        <div class="xp-level">Lv.${stats.level}</div>
        <div class="xp-info">
          <div class="xp-text">
            <span>${stats.xpProgress} / ${stats.xpNeeded} XP</span>
            <span>🔥 ${stats.current_streak} gün seri</span>
          </div>
          <div class="xp-bar">
            <div class="xp-fill" style="width: ${stats.progressPercent}%"></div>
          </div>
        </div>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center;" class="mb-16">
        <div class="card-title" style="margin:0;">Projeler</div>
        <button class="btn btn-primary btn-sm" onclick="TasksPage.showAddProjectModal()">+ Yeni Proje</button>
      </div>
      
      <div class="projects-grid mb-20" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px;">
        ${projects.map(p => `
          <div class="card p-10" style="border-left: 4px solid ${p.color};">
            <h3 style="margin:0 0 5px 0;">${p.name}</h3>
            <p style="font-size: 12px; color: var(--text-secondary); margin:0 0 10px 0;">${p.description}</p>
            <div style="text-align:right;">
              <button class="btn btn-danger btn-sm" onclick="TasksPage.deleteProject(${p.id})">Sil</button>
            </div>
          </div>
        `).join('')}
        ${projects.length === 0 ? '<div class="text-secondary text-sm">Henüz bir proje yok.</div>' : ''}
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center;" class="mb-16">
        <div class="card-title" style="margin:0;">Günlük Görevler</div>
        <button class="btn btn-primary btn-sm" onclick="TasksPage.showAddTaskModal()">+ Görev Ekle</button>
      </div>

      <!-- Pending Tasks -->
      ${pending.length > 0 ? `
        <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:20px;">
          ${pending.map(t => `
            <div class="task-card">
              <div class="task-status-icon" style="background: var(--warning-glow);">⏳</div>
              <div class="task-info">
                <div class="task-title">
                  ${t.title}
                  ${t.project_id ? ` <span class="badge" style="font-size:10px; opacity:0.7; border: 1px solid var(--border); padding: 2px 5px; border-radius:4px; margin-left:5px;">${projects.find(p=>p.id===t.project_id)?.name || 'Proje'}</span>` : ''}
                </div>
                <div class="task-desc">${t.description || ''}</div>
                
                ${t.subtasks && t.subtasks.length > 0 ? `
                  <div class="subtasks-list mt-10" style="background: var(--bg-primary); padding:8px; border-radius:6px;">
                    ${t.subtasks.map(st => `
                      <div class="subtask-item" style="display:flex; align-items:center; gap:5px; margin-top:5px; font-size:12px;">
                        <input type="checkbox" ${st.is_completed ? 'checked' : ''} onchange="TasksPage.toggleSubtask(${st.id})">
                        <span style="text-decoration: ${st.is_completed ? 'line-through' : 'none'}; opacity: ${st.is_completed ? '0.5' : '1'}">${st.title}</span>
                      </div>
                    `).join('')}
                  </div>
                ` : ''}
                <button class="btn btn-ghost btn-sm mt-5" style="padding:2px 8px; font-size:10px;" onclick="TasksPage.showAddSubtaskModal(${t.id})">+ Alt Görev Ekle</button>

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
        <div class="card-title">Tamamlanan ✅</div>
        <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:20px;">
          ${completed.map(t => `
            <div class="task-card completed">
              <div class="task-status-icon" style="background: var(--success-glow);">✅</div>
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
        <div class="card-title">Başarısız ❌</div>
        <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:20px;">
          ${failed.map(t => `
            <div class="task-card failed">
              <div class="task-status-icon" style="background: var(--danger-glow);">❌</div>
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
          <div class="empty-state-icon">⚔️</div>
          <div class="empty-state-text">Bugün için görev yok.</div>
        </div>
      ` : ''}
    `;
  },

  async toggleSubtask(id) {
    await api.tasks.toggleSubtask(id);
    await this.render(document.getElementById('content'));
  },

  async deleteProject(id) {
    if(confirm('Projeyi silmek istiyor musunuz? Altındaki günlük görevler silinmez ancak proje bağları kopar.')) {
      await api.tasks.deleteProject(id);
      await this.render(document.getElementById('content'));
    }
  },

  showAddProjectModal() {
    const html = `
      <div class="form-group">
        <label>Proje Adı</label>
        <input type="text" id="proj-name" class="input">
      </div>
      <div class="form-group">
        <label>Açıklama</label>
        <input type="text" id="proj-desc" class="input">
      </div>
      <div class="form-group">
        <label>Renk</label>
        <input type="color" id="proj-color" class="input" value="#6366f1" style="height:40px;">
      </div>
    `;
    showModal('Yeni Proje Ekle', html, async (modal) => {
      const name = modal.querySelector('#proj-name').value;
      const desc = modal.querySelector('#proj-desc').value;
      const color = modal.querySelector('#proj-color').value;
      if (!name) return Toast.show('Proje adı girin.', 'warning');
      
      await api.tasks.addProject({ name, description: desc, color });
      modal.remove();
      Toast.show('Proje oluşturuldu.', 'success');
      await this.render(document.getElementById('content'));
    });
  },

  showAddSubtaskModal(taskId) {
    const html = `
      <div class="form-group">
        <label>Alt Görev Başlığı</label>
        <input type="text" id="subtask-title" class="input">
      </div>
    `;
    showModal('Alt Görev Ekle', html, async (modal) => {
      const title = modal.querySelector('#subtask-title').value;
      if (!title) return Toast.show('Başlık girin.', 'warning');
      
      await api.tasks.addSubtask({ task_id: taskId, title });
      modal.remove();
      await this.render(document.getElementById('content'));
    });
  },

  showAddTaskModal() {
    const projectsOptions = (this.projects || []).map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    
    const html = `
      <div class="form-group">
        <label>Görev Başlığı</label>
        <input type="text" id="task-title" class="input">
      </div>
      <div class="form-group">
        <label>Açıklama</label>
        <input type="text" id="task-desc" class="input">
      </div>
      <div class="form-group">
        <label>Bağlı Proje (Opsiyonel)</label>
        <select id="task-project" class="input">
          <option value="">-- Proje Yok --</option>
          ${projectsOptions}
        </select>
      </div>
      <div style="display:flex; gap:10px;">
        <div class="form-group" style="flex:1;">
          <label>Ödül (+XP)</label>
          <input type="number" id="task-xp" class="input" value="10">
        </div>
        <div class="form-group" style="flex:1;">
          <label>Ceza (-XP)</label>
          <input type="number" id="task-penalty" class="input" value="5">
        </div>
      </div>
    `;
    showModal('Özel Görev Ekle', html, async (modal) => {
      const title = modal.querySelector('#task-title').value;
      const desc = modal.querySelector('#task-desc').value;
      const proj = modal.querySelector('#task-project').value;
      const xp = modal.querySelector('#task-xp').value;
      const penalty = modal.querySelector('#task-penalty').value;
      
      if (!title) return Toast.show('Başlık girin.', 'warning');
      
      await api.tasks.addDailyTask({
        title, 
        description: desc, 
        project_id: proj ? parseInt(proj) : null,
        xp_reward: parseInt(xp) || 10,
        xp_penalty: parseInt(penalty) || 5
      });
      modal.remove();
      Toast.show('Görev eklendi.', 'success');
      await this.render(document.getElementById('content'));
    });
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
    await this.render(document.getElementById('content'));
  },

  async fail(taskId) {
    const result = await api.tasks.failTask(taskId);
    if (result) {
      Toast.show('XP kaybettin! Yarın daha çok çalış! 💪', 'error');
    }
    await App.loadUserStats();
    await this.render(document.getElementById('content'));
  }
};
