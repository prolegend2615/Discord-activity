// HTML5 Canvas Oscilloscope & Spark Particles for Short Circuit Workbench

class CanvasFX {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.animationFrame = null;
    this.time = 0;
    this.state = 'idle'; // 'idle', 'charging', 'buildup', 'shock', 'dud'
    this.particles = [];
    this.sparksCount = 0;
    this.screenShakeEnabled = true;

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.startLoop();
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * (window.devicePixelRatio || 1);
    this.canvas.height = rect.height * (window.devicePixelRatio || 1);
    if (this.ctx) {
      this.ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    }
  }

  setState(newState) {
    this.state = newState;
  }

  triggerHitFlash(elementId, color = '#ff0055') {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.classList.remove('hit-flash-active');
    void el.offsetWidth; // Force reflow
    el.classList.add('hit-flash-active');
    setTimeout(() => {
      el.classList.remove('hit-flash-active');
    }, 450);
  }

  triggerSparks(xRatio = 0.5, yRatio = 0.5, count = 35, color = '#00ffcc') {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const originX = rect.width * xRatio;
    const originY = rect.height * yRatio;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 8;
      this.particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        decay: 0.02 + Math.random() * 0.04,
        size: 1.5 + Math.random() * 2.5,
        color: Math.random() > 0.3 ? color : '#ffffff'
      });
    }

    if (this.screenShakeEnabled) {
      this.triggerScreenShake();
    }
  }

  triggerScreenShake(intensity = 'normal') {
    if (!this.screenShakeEnabled) return;
    const terminal = document.getElementById('terminal-container') || document.body;
    terminal.classList.remove('shake-normal', 'shake-heavy');
    void terminal.offsetWidth; // Force reflow
    terminal.classList.add(intensity === 'heavy' ? 'shake-heavy' : 'shake-normal');

    setTimeout(() => {
      terminal.classList.remove('shake-normal', 'shake-heavy');
    }, 450);
  }

  startLoop() {
    const render = () => {
      this.draw();
      this.animationFrame = requestAnimationFrame(render);
    };
    render();
  }

  draw() {
    if (!this.canvas || !this.ctx) return;
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    this.ctx.clearRect(0, 0, w, h);
    this.time += 0.05;

    // Draw CRT grid lines in oscilloscope
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(0, 255, 204, 0.07)';
    this.ctx.lineWidth = 1;

    const gridSize = 20;
    for (let x = 0; x < w; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, h);
      this.ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(w, y);
      this.ctx.stroke();
    }

    // Oscilloscope central line / Waveform
    this.ctx.beginPath();
    const midY = h / 2;
    this.ctx.moveTo(0, midY);

    let amp = 10;
    let freq = 0.03;
    let color = '#00ffcc';

    if (this.state === 'charging') {
      amp = 26 + Math.sin(this.time * 8) * 8;
      freq = 0.08;
      color = '#ffaa00';
    } else if (this.state === 'buildup') {
      amp = 36 + Math.sin(this.time * 16) * 16 + (Math.random() - 0.5) * 10;
      freq = 0.12 + Math.sin(this.time * 6) * 0.04;
      color = Math.sin(this.time * 10) > 0 ? '#ffaa00' : '#ff0055';
    } else if (this.state === 'shock') {
      amp = 50 + (Math.random() - 0.5) * 24;
      freq = 0.18;
      color = '#ff0055';
    } else if (this.state === 'dud') {
      amp = 2;
      freq = 0.01;
      color = '#667788';
    }

    for (let x = 0; x < w; x += 3) {
      const noise = (Math.random() - 0.5) * (this.state === 'shock' ? 14 : (this.state === 'buildup' ? 8 : 2));
      const wave = Math.sin(x * freq + this.time * 4) * Math.cos(x * 0.01 + this.time) * amp;
      this.ctx.lineTo(x, midY + wave + noise);
    }

    this.ctx.shadowBlur = 12;
    this.ctx.shadowColor = color;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2.2;
    this.ctx.stroke();
    this.ctx.restore();

    // Draw and update electrical spark particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15; // subtle gravity
      p.life -= p.decay;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.globalAlpha = p.life;
      this.ctx.fillStyle = p.color;
      this.ctx.shadowBlur = 8;
      this.ctx.shadowColor = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
  }
}

window.CanvasFX = CanvasFX;
