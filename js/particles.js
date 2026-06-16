// ============================================================
// particles.js — Particle systems for visual effects
// ============================================================

import { COLORS } from './constants.js';

/**
 * Single particle with position, velocity, lifetime.
 */
export class Particle {
  constructor(x, y, color, size = 3, life = 60) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 6;
    this.vy = (Math.random() - 0.5) * 6 - 2;
    this.color = color;
    this.size = size;
    this.life = life;
    this.maxLife = life;
    this.alpha = 1;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.05; // slight gravity
    this.life--;
    this.alpha = this.life / this.maxLife;
    this.size *= 0.98;
  }

  get dead() {
    return this.life <= 0 || this.size < 0.2;
  }
}

/**
 * Manages multiple particle systems (trail, dissolution, etc.).
 */
export class ParticleSystem {
  constructor() {
    this.trail = [];
    this.dissolve = [];
    this.sparkles = [];
  }

  /** Add a trail dot at fingertip position */
  addTrail(x, y) {
    this.trail.push(new Particle(x, y, COLORS.cyan, 3 + Math.random() * 3, 25));
  }

  /** Burst of particles for cat dissolution */
  addDissolveBurst(x, y, catColor) {
    for (let i = 0; i < 30; i++) {
      const colors = [catColor, COLORS.white, COLORS.magenta, COLORS.yellow];
      const color = colors[Math.floor(Math.random() * colors.length)];
      this.dissolve.push(new Particle(x, y, color, 2 + Math.random() * 4, 40 + Math.random() * 40));
    }
  }

  /** Sparkle effect for transformation moment */
  addSparkles(x, y) {
    for (let i = 0; i < 15; i++) {
      const p = new Particle(x, y, COLORS.white, 1 + Math.random() * 2, 20);
      p.vx = (Math.random() - 0.5) * 10;
      p.vy = (Math.random() - 0.5) * 10;
      this.sparkles.push(p);
    }
  }

  update() {
    this._updateArray(this.trail);
    this._updateArray(this.dissolve);
    this._updateArray(this.sparkles);
  }

  _updateArray(arr) {
    for (let i = arr.length - 1; i >= 0; i--) {
      arr[i].update();
      if (arr[i].dead) arr.splice(i, 1);
    }
  }

  draw(ctx) {
    // Trail — cyan glow dots
    for (const p of this.trail) {
      ctx.save();
      ctx.globalAlpha = p.alpha * 0.7;
      ctx.shadowColor = COLORS.cyan;
      ctx.shadowBlur = 12;
      ctx.fillStyle = COLORS.cyan;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Dissolve particles — colored burst
    for (const p of this.dissolve) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Sparkles — white flashes
    for (const p of this.sparkles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.shadowColor = COLORS.white;
      ctx.shadowBlur = 6;
      ctx.fillStyle = COLORS.white;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}
