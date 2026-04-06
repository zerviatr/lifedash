// ============ SOUND MANAGER ============
const SoundManager = {
  ctx: null,
  enabled: true,

  async init() {
    try {
      const settings = await api.settings.getAll();
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

  // ADSR envelope tone generator
  tone(freq, duration, type = 'sine', volume = 0.3, delay = 0, envelope = null) {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;

    const env = envelope || { attack: 0.01, decay: 0.05, sustain: 0.8, release: 0.03 };
    const startTime = ctx.currentTime + delay;
    const attackEnd = startTime + env.attack;
    const decayEnd = attackEnd + env.decay;
    const sustainLevel = volume * env.sustain;
    const releaseStart = startTime + duration - env.release;
    const endTime = startTime + duration;

    gain.gain.setValueAtTime(0.001, startTime);
    // Attack: ramp to peak
    gain.gain.linearRampToValueAtTime(volume, attackEnd);
    // Decay: ramp to sustain level
    gain.gain.exponentialRampToValueAtTime(Math.max(sustainLevel, 0.001), decayEnd);
    // Sustain: hold level
    gain.gain.setValueAtTime(Math.max(sustainLevel, 0.001), Math.max(decayEnd, releaseStart));
    // Release: fade to silence
    gain.gain.exponentialRampToValueAtTime(0.001, endTime);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(endTime + 0.01);
  },

  // Noise burst generator for percussive effects
  noise(duration, volume = 0.1, delay = 0, filterFreq = 4000) {
    const ctx = this.getCtx();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = filterFreq;

    const gain = ctx.createGain();
    const startTime = ctx.currentTime + delay;
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(startTime);
    source.stop(startTime + duration + 0.01);
  },

  sounds: {
    xpGain() {
      this.tone(440, 0.15, 'sine', 0.2);
      this.tone(660, 0.15, 'sine', 0.2, 0.08);
    },

    levelUp() {
      this.tone(523, 0.15, 'square', 0.15, 0, { attack: 0.01, decay: 0.02, sustain: 0.9, release: 0.03 });
      this.tone(659, 0.15, 'square', 0.15, 0.12, { attack: 0.01, decay: 0.02, sustain: 0.9, release: 0.03 });
      this.tone(784, 0.15, 'square', 0.15, 0.24, { attack: 0.01, decay: 0.02, sustain: 0.9, release: 0.03 });
      this.tone(1047, 0.3, 'square', 0.2, 0.36, { attack: 0.01, decay: 0.05, sustain: 0.7, release: 0.08 });
    },

    lootBox() {
      for (let i = 0; i < 6; i++) {
        const freq = 800 + Math.random() * 1200;
        this.tone(freq, 0.08, 'sine', 0.12, i * 0.06);
      }
      this.tone(1200, 0.3, 'sine', 0.2, 0.4, { attack: 0.02, decay: 0.08, sustain: 0.6, release: 0.1 });
    },

    achievementUnlock() {
      this.tone(523, 0.25, 'sine', 0.15, 0, { attack: 0.02, decay: 0.05, sustain: 0.8, release: 0.05 });
      this.tone(659, 0.25, 'sine', 0.15, 0.12, { attack: 0.02, decay: 0.05, sustain: 0.8, release: 0.05 });
      this.tone(784, 0.25, 'sine', 0.15, 0.24, { attack: 0.02, decay: 0.05, sustain: 0.8, release: 0.05 });
      this.tone(1047, 0.4, 'sine', 0.2, 0.36, { attack: 0.02, decay: 0.08, sustain: 0.7, release: 0.1 });
    },

    taskComplete() {
      this.tone(1000, 0.12, 'sine', 0.25);
    },

    impulseReject() {
      this.tone(150, 0.5, 'sine', 0.3, 0, { attack: 0.02, decay: 0.1, sustain: 0.6, release: 0.15 });
      this.tone(120, 0.4, 'sine', 0.2, 0.1, { attack: 0.02, decay: 0.1, sustain: 0.5, release: 0.15 });
    },

    bossBattleWin() {
      this.tone(392, 0.15, 'square', 0.15, 0, { attack: 0.01, decay: 0.03, sustain: 0.8, release: 0.03 });
      this.tone(523, 0.15, 'square', 0.15, 0.15, { attack: 0.01, decay: 0.03, sustain: 0.8, release: 0.03 });
      this.tone(659, 0.15, 'square', 0.15, 0.3, { attack: 0.01, decay: 0.03, sustain: 0.8, release: 0.03 });
      this.tone(784, 0.2, 'square', 0.15, 0.45, { attack: 0.01, decay: 0.03, sustain: 0.8, release: 0.05 });
      this.tone(1047, 0.4, 'square', 0.2, 0.55, { attack: 0.02, decay: 0.05, sustain: 0.7, release: 0.1 });
    },

    bossBattleLose() {
      this.tone(400, 0.2, 'sawtooth', 0.15, 0, { attack: 0.02, decay: 0.05, sustain: 0.7, release: 0.06 });
      this.tone(300, 0.2, 'sawtooth', 0.15, 0.2, { attack: 0.02, decay: 0.05, sustain: 0.7, release: 0.06 });
      this.tone(200, 0.3, 'sawtooth', 0.15, 0.4, { attack: 0.02, decay: 0.08, sustain: 0.6, release: 0.1 });
      this.tone(150, 0.4, 'sawtooth', 0.1, 0.6, { attack: 0.02, decay: 0.1, sustain: 0.5, release: 0.15 });
    },

    deposit() {
      this.tone(600, 0.1, 'sine', 0.2);
      this.tone(800, 0.1, 'sine', 0.2, 0.08);
      this.tone(1000, 0.15, 'sine', 0.15, 0.16);
    },

    // New sounds for gamification 2.0

    coinEarn() {
      // Metallic clink sound
      this.tone(2400, 0.06, 'sine', 0.15, 0, { attack: 0.005, decay: 0.02, sustain: 0.3, release: 0.03 });
      this.tone(3200, 0.08, 'sine', 0.1, 0.03, { attack: 0.005, decay: 0.03, sustain: 0.2, release: 0.04 });
      this.tone(4000, 0.05, 'sine', 0.06, 0.05, { attack: 0.003, decay: 0.02, sustain: 0.2, release: 0.02 });
    },

    shopPurchase() {
      // Ka-ching register sound
      this.tone(1200, 0.08, 'sine', 0.2, 0, { attack: 0.005, decay: 0.02, sustain: 0.4, release: 0.04 });
      this.noise(0.05, 0.08, 0.02, 6000);
      this.tone(1600, 0.06, 'sine', 0.15, 0.06, { attack: 0.005, decay: 0.02, sustain: 0.3, release: 0.03 });
      this.tone(2400, 0.12, 'sine', 0.12, 0.1, { attack: 0.01, decay: 0.04, sustain: 0.3, release: 0.06 });
    },

    streakFreeze() {
      // Ice crack / crystalline sound
      this.noise(0.08, 0.12, 0, 8000);
      this.tone(3000, 0.15, 'sine', 0.08, 0.02, { attack: 0.005, decay: 0.06, sustain: 0.2, release: 0.08 });
      this.tone(2000, 0.2, 'sine', 0.1, 0.05, { attack: 0.01, decay: 0.08, sustain: 0.3, release: 0.1 });
      this.tone(4500, 0.1, 'sine', 0.05, 0.08, { attack: 0.003, decay: 0.04, sustain: 0.15, release: 0.05 });
    },

    challengeComplete() {
      // Short triumphant fanfare
      this.tone(587, 0.12, 'square', 0.12, 0, { attack: 0.01, decay: 0.03, sustain: 0.8, release: 0.02 });
      this.tone(740, 0.12, 'square', 0.12, 0.1, { attack: 0.01, decay: 0.03, sustain: 0.8, release: 0.02 });
      this.tone(880, 0.12, 'square', 0.12, 0.2, { attack: 0.01, decay: 0.03, sustain: 0.8, release: 0.02 });
      this.tone(1175, 0.35, 'square', 0.15, 0.3, { attack: 0.02, decay: 0.06, sustain: 0.7, release: 0.1 });
      this.tone(587, 0.35, 'sine', 0.08, 0.3, { attack: 0.02, decay: 0.06, sustain: 0.5, release: 0.1 });
    },

    combo() {
      // Rising pitch combo sound
      this.tone(600, 0.06, 'square', 0.15, 0, { attack: 0.005, decay: 0.02, sustain: 0.5, release: 0.02 });
      this.tone(900, 0.06, 'square', 0.15, 0.05, { attack: 0.005, decay: 0.02, sustain: 0.5, release: 0.02 });
      this.tone(1200, 0.1, 'square', 0.2, 0.1, { attack: 0.005, decay: 0.03, sustain: 0.6, release: 0.03 });
    },

    diceRoll() {
      // Dice rattling sound
      for (let i = 0; i < 6; i++) {
        this.noise(0.03, 0.04, i * 0.06, 4000);
        this.tone(300 + Math.random() * 200, 0.03, 'sine', 0.08, i * 0.06);
      }
      this.tone(800, 0.15, 'sine', 0.15, 0.4, { attack: 0.01, decay: 0.05, sustain: 0.5, release: 0.08 });
    },

    journalSave() {
      // Soft pen scratch + chime
      this.tone(500, 0.12, 'sine', 0.1, 0, { attack: 0.02, decay: 0.04, sustain: 0.4, release: 0.06 });
      this.tone(750, 0.15, 'sine', 0.12, 0.1, { attack: 0.02, decay: 0.04, sustain: 0.5, release: 0.08 });
    }
  }
};
