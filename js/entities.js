// ============================================================
// entities.js — Cat entities and Glass target
// ============================================================

import { CAT_COLORS, CAT_STATES, GAME } from './constants.js';

let catIdCounter = 0;

/**
 * A flying cat that can be grabbed and dropped into the glass.
 */
export class Cat {
  constructor(x, y, vx, vy, color) {
    this.id = ++catIdCounter;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.state = CAT_STATES.FLYING;
    this.radius = 28;          // collision radius
    this.rotation = 0;
    this.rotSpeed = (Math.random() - 0.5) * 0.05;
    this.scale = 1;
    this.transformProgress = 0; // 0=catshape, 1=pill
    this.dissolveAlpha = 1;
    this.bobOffset = Math.random() * Math.PI * 2; // for idle bobbing
    this.tailWag = 0;
    this.tailDir = 1;

    // Visual wobble during flight
    this.wobbleAmp = 1 + Math.random() * 2;
    this.wobbleFreq = 0.03 + Math.random() * 0.04;
    this.frame = Math.random() * 100;
  }

  /** Update flying cat position — can go off screen */
  update(canvasW, canvasH) {
    if (this.state === CAT_STATES.FLYING) {
      this.x += this.vx;
      this.y += this.vy;
      // Slight sinusoidal wobble
      this.y += Math.sin(this.frame * this.wobbleFreq) * this.wobbleAmp * 0.3;
      this.rotation += this.rotSpeed;
      this.tailWag += 0.1 * this.tailDir;
      if (Math.abs(this.tailWag) > 0.5) this.tailDir *= -1;
      this.frame++;

      // Bob animation
      this.bobOffset += 0.05;
    } else if (this.state === CAT_STATES.GRABBED) {
      // Position follows fingertip (set externally)
      this.rotation *= 0.9;
      this.scale += (1.1 - this.scale) * 0.2; // slight pulse when grabbed
    } else if (this.state === CAT_STATES.TRANSFORMING) {
      this.transformProgress += 0.03;
      this.scale += (0.7 - this.scale) * 0.1;
      if (this.transformProgress >= 1) {
        this.state = CAT_STATES.DISSOLVING;
        return true; // signal: start dissolution particles
      }
    } else if (this.state === CAT_STATES.DISSOLVING) {
      this.dissolveAlpha -= 0.025;
      this.scale *= 0.95;
      if (this.dissolveAlpha <= 0) {
        return false; // fully dissolved
      }
    }
    return null;
  }

  /** Is cat completely off screen? (margin = 100px) */
  isOffScreen(w, h) {
    const m = 100;
    return this.x < -m || this.x > w + m || this.y < -m || this.y > h + m;
  }

  /** Distance to a point */
  distTo(px, py) {
    const dx = this.x - px;
    const dy = this.y - py;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /** Draw the cat (neon style) */
  draw(ctx) {
    if (this.state === CAT_STATES.DISSOLVING && this.dissolveAlpha <= 0.05) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    const alpha = this.state === CAT_STATES.DISSOLVING ? this.dissolveAlpha : 1;
    ctx.globalAlpha = alpha;

    if (this.state === CAT_STATES.TRANSFORMING && this.transformProgress > 0.5) {
      // Draw pill shape
      this._drawPill(ctx);
    } else {
      // Draw cat shape with morph toward pill
      if (this.state === CAT_STATES.TRANSFORMING) {
        ctx.globalAlpha = alpha * (1 - this.transformProgress * 0.6);
        this._drawCatShape(ctx);
        ctx.globalAlpha = alpha * this.transformProgress * 0.6;
        this._drawPill(ctx);
        ctx.globalAlpha = alpha;
      } else {
        this._drawCatShape(ctx);
      }
    }

    ctx.restore();
  }

  _drawCatShape(ctx) {
    const s = this.scale;
    ctx.rotate(this.rotation);

    // Neon glow
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 20;

    // Body — ellipse
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.ellipse(0, 2, 20 * s, 14 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head — circle
    ctx.beginPath();
    ctx.arc(-16 * s, -8 * s, 12 * s, 0, Math.PI * 2);
    ctx.fill();

    // Ears — triangles
    ctx.beginPath();
    ctx.moveTo(-22 * s, -18 * s);
    ctx.lineTo(-16 * s, -6 * s);
    ctx.lineTo(-10 * s, -16 * s);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-14 * s, -18 * s);
    ctx.lineTo(-10 * s, -8 * s);
    ctx.lineTo(-6 * s, -15 * s);
    ctx.closePath();
    ctx.fill();

    // Eyes — glowing white dots
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-19 * s, -8 * s, 3 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-11 * s, -8 * s, 3 * s, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0a0014';
    ctx.beginPath();
    ctx.arc(-19 * s, -8 * s, 1.5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-11 * s, -8 * s, 1.5 * s, 0, Math.PI * 2);
    ctx.fill();

    // Tail — curved line
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 15;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 4 * s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(18 * s, 0);
    ctx.quadraticCurveTo(30 * s, -10 * s + this.tailWag * 8, 34 * s, -20 * s + this.tailWag * 12);
    ctx.stroke();

    // Whiskers
    ctx.shadowBlur = 4;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1 * s;
    ctx.beginPath();
    ctx.moveTo(-24 * s, -10 * s);
    ctx.lineTo(-36 * s, -14 * s);
    ctx.moveTo(-24 * s, -6 * s);
    ctx.lineTo(-36 * s, -4 * s);
    ctx.stroke();

    // Grabbed indicator — pulsing ring
    if (this.state === CAT_STATES.GRABBED) {
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 25;
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.01) * 0.3;
      ctx.beginPath();
      ctx.arc(0, 0, 32 * s, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  _drawPill(ctx) {
    const s = this.scale * 0.6;
    const w = 18 * s;
    const h = 8 * s;

    // Glow
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 25;

    // Capsule shape
    ctx.fillStyle = this.color;
    ctx.beginPath();
    const rx = w;
    const ry = h;
    ctx.moveTo(0, -ry);
    ctx.lineTo(rx, -ry);
    ctx.arcTo(rx + ry, -ry, rx + ry, 0, ry);
    ctx.arcTo(rx + ry, ry, rx, ry, ry);
    ctx.lineTo(0, ry);
    ctx.arcTo(-ry, ry, -ry, 0, ry);
    ctx.arcTo(-ry, -ry, 0, -ry, ry);
    ctx.closePath();
    ctx.fill();

    // Pill split line
    ctx.shadowBlur = 4;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(rx * 0.3, -ry);
    ctx.lineTo(rx * 0.3, ry);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

/**
 * The Glass target on the right side of the screen.
 */
export class Glass {
  constructor(x, y, radius) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.pulse = 0;
    this.glowIntensity = 0;
  }

  update(canvasW, canvasH, grabbedCatNearby) {
    // Pulsing animation
    this.pulse = Math.sin(Date.now() * 0.003) * 0.3 + 0.7;

    // Glow intensifies when a grabbed cat is near
    const targetGlow = grabbedCatNearby ? 1 : 0.2;
    this.glowIntensity += (targetGlow - this.glowIntensity) * 0.1;
  }

  /** Check if a point is inside the glass drop zone */
  containsPoint(px, py) {
    const dx = this.x - px;
    const dy = this.y - py;
    return Math.sqrt(dx * dx + dy * dy) < this.radius;
  }

  draw(ctx) {
    ctx.save();
    const alpha = 0.5 + this.glowIntensity * 0.5;

    // Outer glow
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 20 + this.glowIntensity * 30;

    // Glass body
    const w = 60;
    const h = 90;
    const x = this.x - w / 2;
    const y = this.y - h / 2;

    // Draw glass shape (trapezoid — wider at top)
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 3;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    // Rim
    ctx.moveTo(x - 8, y);
    ctx.lineTo(x + w + 8, y);
    // Right side (angled inward)
    ctx.lineTo(x + w - 4, y + h);
    // Bottom
    ctx.lineTo(x + 4, y + h);
    ctx.closePath();
    ctx.stroke();

    // Glass rim highlight
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.globalAlpha = alpha * 0.7;
    ctx.beginPath();
    ctx.moveTo(x - 10, y + 2);
    ctx.lineTo(x + w + 10, y + 2);
    ctx.stroke();

    // Glass interior shimmer
    ctx.fillStyle = 'rgba(0, 255, 255, 0.05)';
    ctx.globalAlpha = alpha * (0.3 + this.glowIntensity * 0.3);
    ctx.beginPath();
    ctx.moveTo(x - 8, y);
    ctx.lineTo(x + w + 8, y);
    ctx.lineTo(x + w - 4, y + h);
    ctx.lineTo(x + 4, y + h);
    ctx.closePath();
    ctx.fill();

    // Drop zone ring
    ctx.strokeStyle = '#ff00ff';
    ctx.lineWidth = 2;
    ctx.globalAlpha = alpha * 0.6 * this.pulse;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Glow circle when cat is nearby
    if (this.glowIntensity > 0.25) {
      ctx.shadowColor = '#ff00ff';
      ctx.shadowBlur = 30 * this.glowIntensity;
      ctx.fillStyle = 'rgba(255, 0, 255, 0.1)';
      ctx.globalAlpha = this.glowIntensity * 0.3;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

/**
 * Factory: spawn a new flying cat from an edge.
 */
export function spawnCat(canvasW, canvasH) {
  const edge = Math.floor(Math.random() * 3); // 0=left, 1=top, 2=bottom

  let x, y, vx, vy;
  const speed = GAME.CAT_SPEED_MIN + Math.random() * (GAME.CAT_SPEED_MAX - GAME.CAT_SPEED_MIN);

  if (edge === 0) {
    // Left edge → fly rightward with some vertical drift
    x = -40;
    y = 80 + Math.random() * (canvasH - 160);
    vx = speed;
    vy = (Math.random() - 0.5) * speed * 0.7;
  } else if (edge === 1) {
    // Top edge → fly downward with horizontal drift
    x = 100 + Math.random() * (canvasW - 200);
    y = -40;
    vx = (Math.random() - 0.5) * speed;
    vy = speed * 0.8;
  } else {
    // Bottom edge → fly upward
    x = 100 + Math.random() * (canvasW - 200);
    y = canvasH + 40;
    vx = (Math.random() - 0.5) * speed;
    vy = -speed * 0.8;
  }

  const color = CAT_COLORS[Math.floor(Math.random() * CAT_COLORS.length)];
  return new Cat(x, y, vx, vy, color);
}
