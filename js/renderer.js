// ============================================================
// renderer.js — Background, grid, and ambient effects
// ============================================================

import { COLORS } from './constants.js';

/**
 * Draws the psychedelic neon background.
 */
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.time = 0;
    this.stars = [];
    this._initStars();
  }

  _initStars() {
    this.stars = [];
    for (let i = 0; i < 60; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: 0.5 + Math.random() * 2,
        speed: 0.2 + Math.random() * 0.5,
        twinkle: Math.random() * Math.PI * 2,
      });
    }
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this._initStars();
  }

  update() {
    this.time += 0.016;
    for (const star of this.stars) {
      star.twinkle += 0.03;
      star.y -= star.speed;
      if (star.y < -10) {
        star.y = this.canvas.height + 10;
        star.x = Math.random() * this.canvas.width;
      }
    }
  }

  drawBackground() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Deep purple-black gradient background
    const bg = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.7);
    bg.addColorStop(0, '#150030');
    bg.addColorStop(0.5, '#0a0018');
    bg.addColorStop(1, '#050010');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Animated neon grid lines (subtle)
    ctx.save();
    ctx.globalAlpha = 0.04;
    ctx.strokeStyle = COLORS.magenta;
    ctx.lineWidth = 1;
    const gridSize = 80;
    const offset = (this.time * 20) % gridSize;

    for (let x = offset; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = offset; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.restore();

    // Vignette
    const vignette = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.3, w * 0.5, h * 0.5, Math.max(w, h) * 0.7);
    vignette.addColorStop(0, 'transparent');
    vignette.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);

    // Stars
    for (const star of this.stars) {
      const alpha = 0.3 + Math.sin(star.twinkle) * 0.3;
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = COLORS.white;
      ctx.shadowColor = COLORS.cyan;
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /** Draw a glow effect around a point (for fingertip highlight) */
  drawFingertipGlow(x, y, intensity = 1) {
    const ctx = this.ctx;
    ctx.save();
    // Outer glow
    ctx.globalAlpha = 0.15 * intensity;
    ctx.shadowColor = COLORS.cyan;
    ctx.shadowBlur = 30;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, 40);
    grad.addColorStop(0, COLORS.cyan);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Inner dot
    ctx.save();
    ctx.globalAlpha = 0.9 * intensity;
    ctx.shadowColor = COLORS.white;
    ctx.shadowBlur = 15;
    ctx.fillStyle = COLORS.white;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
