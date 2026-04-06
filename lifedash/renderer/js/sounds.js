// ============ SOUND MANAGER ============
const SoundManager = {
  ctx: null,
  enabled: true,

  async init() {
    try {
      const settings = await api.settings.getSettings();
      this.enabled = settings.sound_effects !== 'false';
    } catch { this.enabled = true; }
  },

  getCtx() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },

  play(name) {
    if (!this.enabled) return;
    try {
      const fn = this.sounds[name];
      if (fn) fn.call(this);
    } catch {}
  },

  tone(freq, duration, type = 'sine', volume = 0.3, delay = 0) {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    
    const startTime = ctx.currentTime + delay;
    const attackTime = Math.min(0.02, duration * 0.1);
    const decayTime = Math.min(0.05, duration * 0.2);
    const sustainLevel = volume * 0.6;
    const releaseTime = Math.min(0.05, duration * 0.2);
    
    // ADSR Envelope integration
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + attackTime);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.01, sustainLevel), startTime + attackTime + decayTime);
    
    const releaseStart = startTime + duration - releaseTime;
    gain.gain.setValueAtTime(Math.max(0.01, sustainLevel), releaseStart);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration);
  },

  sounds: {
    xpGain() {
      this.tone(440, 0.15, 'sine', 0.2);
      this.tone(660, 0.15, 'sine', 0.2, 0.08);
    },

    levelUp() {
      this.tone(523, 0.15, 'square', 0.15);
      this.tone(659, 0.15, 'square', 0.15, 0.12);
      this.tone(784, 0.15, 'square', 0.15, 0.24);
      this.tone(1047, 0.3, 'square', 0.2, 0.36);
    },

    lootBox() {
      for (let i = 0; i < 6; i++) {
        const freq = 800 + Math.random() * 1200;
        this.tone(freq, 0.08, 'sine', 0.12, i * 0.06);
      }
      this.tone(1200, 0.3, 'sine', 0.2, 0.4);
    },

    achievementUnlock() {
      this.tone(523, 0.4, 'sine', 0.15);
      this.tone(659, 0.4, 'sine', 0.15);
      this.tone(784, 0.4, 'sine', 0.15);
      this.tone(1047, 0.5, 'sine', 0.2, 0.15);
    },

    taskComplete() {
      this.tone(1000, 0.12, 'sine', 0.25);
    },

    impulseReject() {
      this.tone(150, 0.5, 'sine', 0.3);
      this.tone(120, 0.4, 'sine', 0.2, 0.1);
    },

    bossBattleWin() {
      this.tone(392, 0.15, 'square', 0.15);
      this.tone(523, 0.15, 'square', 0.15, 0.15);
      this.tone(659, 0.15, 'square', 0.15, 0.3);
      this.tone(784, 0.2, 'square', 0.15, 0.45);
      this.tone(1047, 0.4, 'square', 0.2, 0.55);
    },

    bossBattleLose() {
      this.tone(400, 0.2, 'sawtooth', 0.15);
      this.tone(300, 0.2, 'sawtooth', 0.15, 0.2);
      this.tone(200, 0.3, 'sawtooth', 0.15, 0.4);
      this.tone(150, 0.4, 'sawtooth', 0.1, 0.6);
    },

    deposit() {
      this.tone(600, 0.1, 'sine', 0.2);
      this.tone(800, 0.1, 'sine', 0.2, 0.08);
      this.tone(1000, 0.15, 'sine', 0.15, 0.16);
    }
  }
};
