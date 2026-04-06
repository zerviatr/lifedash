// ============ VFX ENGINE v5.0 (FAZ 11) ============
const VFX = {
  canvas: null,
  ctx: null,
  particles: [],
  running: false,

  init() {
    this.canvas = document.getElementById('vfx-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
  },

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  },

  startLoop() {
    if (this.running) return;
    this.running = true;
    this.rafId = null;
    this.update();
  },

  stop() {
    if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
    this.running = false;
    this.particles = [];
    this.ctx && this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  },

  update() {
    if (!this.ctx || this.particles.length === 0) {
      this.running = false;
      this.rafId = null;
      this.ctx && this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      return;
    }

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (var i = this.particles.length - 1; i >= 0; i--) {
      var p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity || 0;
      p.life -= p.decay || 0.02;
      p.rotation += p.rotationSpeed || 0;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rotation);
      this.ctx.globalAlpha = p.life;

      if (p.type === 'confetti') {
        this.ctx.fillStyle = p.color;
        this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      } else if (p.type === 'sparkle') {
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, p.size * p.life, 0, Math.PI * 2);
        this.ctx.fill();
      } else if (p.type === 'ring') {
        this.ctx.strokeStyle = p.color;
        this.ctx.lineWidth = 2 * p.life;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, p.size * (1 - p.life) * 3, 0, Math.PI * 2);
        this.ctx.stroke();
      }

      this.ctx.restore();
    }

    requestAnimationFrame(() => this.update());
  },

  confetti(x, y, count) {
    count = count || 60;
    var colors = ['#6366f1', '#818cf8', '#f59e0b', '#22c55e', '#ef4444', '#ec4899', '#06b6d4'];

    for (var i = 0; i < count; i++) {
      this.particles.push({
        type: 'confetti',
        x: x || this.canvas.width / 2,
        y: y || this.canvas.height / 2,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 1) * 10 - 3,
        gravity: 0.15,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
        decay: 0.008 + Math.random() * 0.005,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2
      });
    }

    // Cap particles
    if (this.particles.length > 200) {
      this.particles.splice(0, this.particles.length - 200);
    }

    this.startLoop();
  },

  xpSparkle(el, count) {
    if (!el) return;
    count = count || 8;
    var rect = el.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;

    for (var i = 0; i < count; i++) {
      this.particles.push({
        type: 'sparkle',
        x: cx,
        y: cy,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6 - 2,
        gravity: 0.05,
        size: Math.random() * 3 + 2,
        color: '#818cf8',
        life: 1,
        decay: 0.03,
        rotation: 0,
        rotationSpeed: 0
      });
    }
    this.startLoop();
  },

  comboFlash(count) {
    var el = document.createElement('div');
    el.className = 'combo-flash';
    el.textContent = count + 'x COMBO!';
    document.body.appendChild(el);
    el.addEventListener('animationend', function() { el.remove(); });
  },

  levelUpCelebration(level) {
    // Full screen overlay
    var overlay = document.createElement('div');
    overlay.className = 'level-up-overlay';
    overlay.innerHTML = '<div class="level-up-text">LEVEL ' + level + '</div>';
    document.body.appendChild(overlay);

    // Confetti burst
    this.confetti(this.canvas.width / 2, this.canvas.height / 2, 80);

    // Gold ring
    this.particles.push({
      type: 'ring',
      x: this.canvas.width / 2,
      y: this.canvas.height / 2,
      vx: 0, vy: 0,
      gravity: 0,
      size: 80,
      color: '#f59e0b',
      life: 1,
      decay: 0.015,
      rotation: 0,
      rotationSpeed: 0
    });
    this.startLoop();

    setTimeout(function() { overlay.remove(); }, 2000);
  }
};
