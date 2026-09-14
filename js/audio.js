// Web Audio API Procedural Sound Synthesizer for Short Circuit
// v2.0 — adds ambient drone, tension layer, and 3-second intense beat buildup

class SoundFXEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.masterVolume = 0.8;
    this.sfxVolume = 0.9;
    this.isMuted = false;
    this.initialized = false;

    // Long-running node references
    this._ambientNodes = null;
    this._tensionNodes = null;
    this._beatNodes = [];
  }

  init() {
    if (this.initialized && this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);

      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio initialization failed:', e);
    }
  }

  setMasterVolume(val) {
    this.masterVolume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx)
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
  }

  setSFXVolume(val) {
    this.sfxVolume = Math.max(0, Math.min(1, val));
    if (this.sfxGain && this.ctx)
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx)
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
    return this.isMuted;
  }

  createNoiseBuffer(duration = 0.5) {
    if (!this.ctx) return null;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  // ── 1. UI Click ──────────────────────────────────────────────────────────
  playClick() {
    this.init(); if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.04);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    osc.connect(gain); gain.connect(this.sfxGain);
    osc.start(t); osc.stop(t + 0.05);
  }

  // ── 2. Capacitor Charge Hum ───────────────────────────────────────────────
  playCapacitorHum(duration = 1.0) {
    this.init(); if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator(), osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter(), gain = this.ctx.createGain();
    osc1.type = 'sawtooth'; osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(50, t); osc1.frequency.exponentialRampToValueAtTime(260, t + duration);
    osc2.frequency.setValueAtTime(100, t); osc2.frequency.exponentialRampToValueAtTime(520, t + duration);
    filter.type = 'lowpass'; filter.frequency.setValueAtTime(200, t); filter.frequency.exponentialRampToValueAtTime(1600, t + duration);
    gain.gain.setValueAtTime(0.01, t); gain.gain.linearRampToValueAtTime(0.4, t + duration * 0.7); gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc1.connect(filter); osc2.connect(filter); filter.connect(gain); gain.connect(this.sfxGain);
    osc1.start(t); osc2.start(t); osc1.stop(t + duration); osc2.stop(t + duration);
  }

  // ── 3. Shock Zap ──────────────────────────────────────────────────────────
  playShockZap(isBoosted = false) {
    this.init(); if (!this.ctx) return;
    const t = this.ctx.currentTime, dur = isBoosted ? 0.75 : 0.55;
    const subOsc = this.ctx.createOscillator(), subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(isBoosted ? 130 : 100, t); subOsc.frequency.exponentialRampToValueAtTime(28, t + dur);
    subGain.gain.setValueAtTime(isBoosted ? 0.9 : 0.7, t); subGain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    subOsc.connect(subGain); subGain.connect(this.sfxGain); subOsc.start(t); subOsc.stop(t + dur);

    const nb = this.createNoiseBuffer(dur);
    if (nb) {
      const noise = this.ctx.createBufferSource(); noise.buffer = nb;
      const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(1500, t); bp.frequency.linearRampToValueAtTime(600, t + dur); bp.Q.setValueAtTime(3, t);
      const ng = this.ctx.createGain(); ng.gain.setValueAtTime(isBoosted ? 0.8 : 0.55, t); ng.gain.exponentialRampToValueAtTime(0.001, t + dur);
      noise.connect(bp); bp.connect(ng); ng.connect(this.sfxGain); noise.start(t); noise.stop(t + dur);
    }
    const sizzle = this.ctx.createOscillator(), sg = this.ctx.createGain();
    sizzle.type = 'sawtooth'; sizzle.frequency.setValueAtTime(isBoosted ? 2400 : 1800, t); sizzle.frequency.exponentialRampToValueAtTime(120, t + 0.35);
    sg.gain.setValueAtTime(0.45, t); sg.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    sizzle.connect(sg); sg.connect(this.sfxGain); sizzle.start(t); sizzle.stop(t + 0.35);
  }

  // ── 4. Dud Click ──────────────────────────────────────────────────────────
  playDudClick() {
    this.init(); if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const ping = this.ctx.createOscillator(), pg = this.ctx.createGain();
    ping.type = 'sine'; ping.frequency.setValueAtTime(950, t); ping.frequency.exponentialRampToValueAtTime(220, t + 0.12);
    pg.gain.setValueAtTime(0.35, t); pg.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    ping.connect(pg); pg.connect(this.sfxGain); ping.start(t); ping.stop(t + 0.12);

    const click = this.ctx.createOscillator(), cg = this.ctx.createGain();
    click.type = 'square'; click.frequency.setValueAtTime(140, t); click.frequency.exponentialRampToValueAtTime(40, t + 0.05);
    cg.gain.setValueAtTime(0.4, t); cg.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    click.connect(cg); cg.connect(this.sfxGain); click.start(t); click.stop(t + 0.05);
  }

  // ── 5. Multimeter Scanner ─────────────────────────────────────────────────
  playScannerBeep(isLive) {
    this.init(); if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o1 = this.ctx.createOscillator(), o2 = this.ctx.createOscillator(), g = this.ctx.createGain();
    o1.type = 'sine'; o2.type = 'triangle';
    if (isLive) { o1.frequency.setValueAtTime(880, t); o1.frequency.setValueAtTime(1174, t + 0.1); o2.frequency.setValueAtTime(1760, t); o2.frequency.setValueAtTime(2349, t + 0.1); }
    else { o1.frequency.setValueAtTime(523, t); o1.frequency.setValueAtTime(659, t + 0.12); o2.frequency.setValueAtTime(783, t + 0.12); }
    g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o1.connect(g); o2.connect(g); g.connect(this.sfxGain); o1.start(t); o2.start(t); o1.stop(t + 0.32); o2.stop(t + 0.32);
  }

  // ── 6. Wire Cutters ───────────────────────────────────────────────────────
  playCutters() {
    this.init(); if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const nb = this.createNoiseBuffer(0.12);
    if (nb) {
      const noise = this.ctx.createBufferSource(); noise.buffer = nb;
      const hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.setValueAtTime(2200, t);
      const g = this.ctx.createGain(); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      noise.connect(hp); hp.connect(g); g.connect(this.sfxGain); noise.start(t); noise.stop(t + 0.12);
    }
    const snap = this.ctx.createOscillator(), sg = this.ctx.createGain();
    snap.type = 'sawtooth'; snap.frequency.setValueAtTime(1600, t); snap.frequency.exponentialRampToValueAtTime(180, t + 0.08);
    sg.gain.setValueAtTime(0.4, t); sg.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    snap.connect(sg); sg.connect(this.sfxGain); snap.start(t); snap.stop(t + 0.09);
  }

  // ── 7. Voltage Booster ────────────────────────────────────────────────────
  playBooster() {
    this.init(); if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator(), g = this.ctx.createGain();
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, t); osc.frequency.exponentialRampToValueAtTime(800, t + 0.35);
    g.gain.setValueAtTime(0.35, t); g.gain.linearRampToValueAtTime(0.5, t + 0.25); g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.connect(g); g.connect(this.sfxGain); osc.start(t); osc.stop(t + 0.42);
  }

  // ── 8. Insulated Glove ────────────────────────────────────────────────────
  playGlove() {
    this.init(); if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator(), g = this.ctx.createGain();
    osc.type = 'square'; osc.frequency.setValueAtTime(320, t); osc.frequency.setValueAtTime(160, t + 0.08);
    g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc.connect(g); g.connect(this.sfxGain); osc.start(t); osc.stop(t + 0.25);
  }

  // ── 9. Chamber Reload ─────────────────────────────────────────────────────
  playChamberReload() {
    this.init(); if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [0, 0.1, 0.2].forEach((offset, idx) => {
      const osc = this.ctx.createOscillator(), g = this.ctx.createGain();
      osc.type = 'triangle'; osc.frequency.setValueAtTime(440 + idx * 110, t + offset);
      g.gain.setValueAtTime(0.2, t + offset); g.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.08);
      osc.connect(g); g.connect(this.sfxGain); osc.start(t + offset); osc.stop(t + offset + 0.09);
    });
  }

  // ── 10. Victory ───────────────────────────────────────────────────────────
  playVictory() {
    this.init(); if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [440, 554.37, 659.25, 880].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator(), g = this.ctx.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(freq, t + idx * 0.14);
      g.gain.setValueAtTime(0.25, t + idx * 0.14); g.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.14 + 0.4);
      osc.connect(g); g.connect(this.sfxGain); osc.start(t + idx * 0.14); osc.stop(t + idx * 0.14 + 0.42);
    });
  }

  // ── 11. Defeat ────────────────────────────────────────────────────────────
  playDefeat() {
    this.init(); if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator(), g = this.ctx.createGain();
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(320, t); osc.frequency.linearRampToValueAtTime(90, t + 0.9);
    g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.95);
    osc.connect(g); g.connect(this.sfxGain); osc.start(t); osc.stop(t + 1.0);
  }

  // ── 12. NEW: Ambient Drone (reactive to live wire count) ─────────────────
  startAmbient(liveRatio = 0.5) {
    this.init(); if (!this.ctx) return;
    this.stopAmbient();

    const ambGain = this.ctx.createGain();
    ambGain.gain.setValueAtTime(0, this.ctx.currentTime);
    ambGain.gain.linearRampToValueAtTime(0.07 + liveRatio * 0.08, this.ctx.currentTime + 2.0);

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(55 + liveRatio * 30, this.ctx.currentTime);
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(110 + liveRatio * 55, this.ctx.currentTime);

    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.3, this.ctx.currentTime);
    lfoGain.gain.setValueAtTime(8, this.ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300 + liveRatio * 400, this.ctx.currentTime);
    filter.Q.setValueAtTime(2.5, this.ctx.currentTime);

    osc1.connect(filter); osc2.connect(filter);
    filter.connect(ambGain); ambGain.connect(this.masterGain);

    osc1.start(); osc2.start(); lfo.start();
    this._ambientNodes = { osc1, osc2, lfo, gain: ambGain };
  }

  stopAmbient() {
    if (!this._ambientNodes) return;
    const { osc1, osc2, lfo, gain } = this._ambientNodes;
    const t = this.ctx.currentTime;
    gain.gain.linearRampToValueAtTime(0, t + 1.0);
    setTimeout(() => { try { osc1.stop(); osc2.stop(); lfo.stop(); } catch(e){} }, 1200);
    this._ambientNodes = null;
  }

  updateAmbientIntensity(liveRatio) {
    if (!this._ambientNodes || !this.ctx) return;
    const t = this.ctx.currentTime;
    this._ambientNodes.gain.gain.linearRampToValueAtTime(0.07 + liveRatio * 0.1, t + 1.5);
    this._ambientNodes.osc1.frequency.linearRampToValueAtTime(55 + liveRatio * 30, t + 1.5);
  }

  // ── 13. NEW: Tension Arpeggio Layer (fires at ≤1 HP) ────────────────────
  startTension() {
    this.init(); if (!this.ctx || this._tensionNodes) return;

    const tensGain = this.ctx.createGain();
    tensGain.gain.setValueAtTime(0, this.ctx.currentTime);
    tensGain.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + 1.5);

    // E-minor arpeggio: E2-G2-B2-E3 repeating every 0.5s
    const notes = [82.41, 98, 123.47, 164.81];
    let step = 0;

    const playNote = () => {
      if (!this._tensionNodes) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const noteGain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(notes[step % notes.length], t);
      step++;
      noteGain.gain.setValueAtTime(0.15, t);
      noteGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(noteGain); noteGain.connect(tensGain);
      osc.start(t); osc.stop(t + 0.36);
    };

    const interval = setInterval(playNote, 480);
    tensGain.connect(this.masterGain);
    this._tensionNodes = { gain: tensGain, interval };
  }

  stopTension() {
    if (!this._tensionNodes) return;
    clearInterval(this._tensionNodes.interval);
    const t = this.ctx.currentTime;
    this._tensionNodes.gain.gain.linearRampToValueAtTime(0, t + 0.8);
    this._tensionNodes = null;
  }

  // ── 14. NEW: 3-Second Intense Buildup Beat for Reveal Sequence ───────────
  // Returns a promise that resolves after the full buildup + brief silence gap.
  playIntenseRevealBeat(durationMs = 3000) {
    this.init(); if (!this.ctx) return Promise.resolve();

    return new Promise(resolve => {
      const t = this.ctx.currentTime;
      const dur = durationMs / 1000;
      const allNodes = [];

      // Layer 1: Rising drone (sawtooth)
      const drone = this.ctx.createOscillator();
      const droneGain = this.ctx.createGain();
      drone.type = 'sawtooth';
      drone.frequency.setValueAtTime(60, t);
      drone.frequency.exponentialRampToValueAtTime(220, t + dur);
      droneGain.gain.setValueAtTime(0.0, t);
      droneGain.gain.linearRampToValueAtTime(0.28, t + dur * 0.6);
      droneGain.gain.linearRampToValueAtTime(0.38, t + dur);
      drone.connect(droneGain); droneGain.connect(this.masterGain);
      drone.start(t); drone.stop(t + dur + 0.1);
      allNodes.push(drone);

      // Layer 2: Pulsing beat kicks (every ~0.4s, getting faster)
      const numKicks = Math.floor(dur / 0.4);
      for (let i = 0; i < numKicks; i++) {
        const gap = 0.4 - (i / numKicks) * 0.18; // speeds up
        const kickTime = t + i * gap;
        const kick = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();
        kick.type = 'sine';
        kick.frequency.setValueAtTime(180, kickTime);
        kick.frequency.exponentialRampToValueAtTime(40, kickTime + 0.1);
        kickGain.gain.setValueAtTime(0.35 + (i / numKicks) * 0.2, kickTime);
        kickGain.gain.exponentialRampToValueAtTime(0.001, kickTime + 0.12);
        kick.connect(kickGain); kickGain.connect(this.masterGain);
        kick.start(kickTime); kick.stop(kickTime + 0.13);
        allNodes.push(kick);
      }

      // Layer 3: High-frequency electric sizzle that intensifies
      const sizzle = this.ctx.createOscillator();
      const sizzleGain = this.ctx.createGain();
      const sizzleFilter = this.ctx.createBiquadFilter();
      sizzle.type = 'sawtooth';
      sizzle.frequency.setValueAtTime(800, t);
      sizzle.frequency.exponentialRampToValueAtTime(3200, t + dur);
      sizzleFilter.type = 'bandpass';
      sizzleFilter.frequency.setValueAtTime(1200, t);
      sizzleFilter.Q.setValueAtTime(5, t);
      sizzleGain.gain.setValueAtTime(0.0, t);
      sizzleGain.gain.linearRampToValueAtTime(0.05, t + dur * 0.5);
      sizzleGain.gain.linearRampToValueAtTime(0.18, t + dur);
      sizzle.connect(sizzleFilter); sizzleFilter.connect(sizzleGain); sizzleGain.connect(this.masterGain);
      sizzle.start(t); sizzle.stop(t + dur + 0.1);
      allNodes.push(sizzle);

      // Layer 4: Noise crackle that gets louder
      const nb = this.createNoiseBuffer(dur);
      if (nb) {
        const noise = this.ctx.createBufferSource(); noise.buffer = nb;
        const noiseFilter = this.ctx.createBiquadFilter(); noiseFilter.type = 'bandpass'; noiseFilter.frequency.setValueAtTime(2000, t);
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0, t);
        noiseGain.gain.linearRampToValueAtTime(0.06, t + dur * 0.7);
        noiseGain.gain.linearRampToValueAtTime(0.14, t + dur);
        noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(this.masterGain);
        noise.start(t); noise.stop(t + dur);
      }

      // Final: A dramatic silence drop at the very end before reveal
      setTimeout(resolve, durationMs + 80);
    });
  }

  // ── 15. NEW: Circuit Tap sound ────────────────────────────────────────────
  playCircuitTap() {
    this.init(); if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [0, 0.08, 0.16].forEach((offset, i) => {
      const osc = this.ctx.createOscillator(), g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1800 - i * 300, t + offset);
      g.gain.setValueAtTime(0.2, t + offset); g.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.07);
      osc.connect(g); g.connect(this.sfxGain); osc.start(t + offset); osc.stop(t + offset + 0.08);
    });
  }

  // ── 16. NEW: Signal Jammer sound ─────────────────────────────────────────
  playJammer() {
    this.init(); if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const nb = this.createNoiseBuffer(0.25);
    if (nb) {
      const noise = this.ctx.createBufferSource(); noise.buffer = nb;
      const filter = this.ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.setValueAtTime(4000, t); filter.Q.setValueAtTime(2, t);
      const g = this.ctx.createGain(); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      noise.connect(filter); filter.connect(g); g.connect(this.sfxGain); noise.start(t); noise.stop(t + 0.26);
    }
    const osc = this.ctx.createOscillator(), og = this.ctx.createGain();
    osc.type = 'square'; osc.frequency.setValueAtTime(2800, t); osc.frequency.setValueAtTime(1400, t + 0.08); osc.frequency.setValueAtTime(2800, t + 0.16);
    og.gain.setValueAtTime(0.2, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(og); og.connect(this.sfxGain); osc.start(t); osc.stop(t + 0.26);
  }

  // ── 17. Emote sound ───────────────────────────────────────────────────────
  playEmote() {
    this.init(); if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator(), g = this.ctx.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(660, t); osc.frequency.setValueAtTime(880, t + 0.05);
    g.gain.setValueAtTime(0.15, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(g); g.connect(this.sfxGain); osc.start(t); osc.stop(t + 0.16);
  }

  // ── 18. Critical Voltage alarm beep ──────────────────────────────────────
  playCriticalAlarm() {
    this.init(); if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [0, 0.25].forEach(offset => {
      const osc = this.ctx.createOscillator(), g = this.ctx.createGain();
      osc.type = 'square'; osc.frequency.setValueAtTime(880, t + offset);
      g.gain.setValueAtTime(0.18, t + offset); g.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.18);
      osc.connect(g); g.connect(this.sfxGain); osc.start(t + offset); osc.stop(t + offset + 0.19);
    });
  }
}

window.soundFX = new SoundFXEngine();
