// ============================================================
// game.js — Core game state, loop, and logic
// ============================================================

import { GAME, CAT_STATES } from './constants.js';
import { Cat, Glass, spawnCat } from './entities.js';
import { ParticleSystem } from './particles.js';
import { Renderer } from './renderer.js';

export class Game {
  constructor(canvas, tracker, hudElements) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.tracker = tracker;
    this.renderer = new Renderer(canvas);
    this.particles = new ParticleSystem();

    // HUD DOM elements
    this.scoreEl = hudElements.scoreEl;
    this.comboEl = hudElements.comboEl;
    this.missedEl = hudElements.missedEl;

    // Game state
    this.state = 'loading'; // loading | ready | playing | gameover
    this.cats = [];
    this.glass = null;
    this.grabbedCat = null;    // reference to currently grabbed cat
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.missed = 0;
    this.lastSpawnTime = 0;
    this.spawnInterval = GAME.SPAWN_INTERVAL_MAX;
    this.difficultyTimer = 0;

    // For tracking transform sequence
    this.transformingCat = null;
    this.transformFlash = 0;

    // Frame timing
    this.lastFrameTime = 0;
    this.animFrameId = null;

    // Callbacks for UI
    this.onScoreChange = null;
    this.onGameOver = null;
    this.onCatProcessed = null;

    // Resize
    this._handleResize = this._handleResize.bind(this);
    window.addEventListener('resize', this._handleResize);
    this._handleResize();
  }

  _handleResize() {
    this.renderer.resize();
    // Update glass position
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.glass = new Glass(
      w * GAME.GLASS_X_RATIO,
      h * GAME.GLASS_Y_RATIO,
      GAME.GLASS_RADIUS
    );
  }

  /** Start the game loop */
  start() {
    this.state = 'playing';
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.missed = 0;
    this.difficultyTimer = 0;
    this.cats = [];
    this.grabbedCat = null;
    this.transformingCat = null;
    this.transformFlash = 0;
    this.lastSpawnTime = performance.now();
    this.lastFrameTime = performance.now();
    this._updateHUD();
    this._loop(performance.now());
  }

  /** Main game loop */
  _loop(timestamp) {
    if (this.state !== 'playing' && this.state !== 'gameover') return;

    const dt = Math.min(timestamp - this.lastFrameTime, 50); // cap at 50ms
    this.lastFrameTime = timestamp;

    this._update(dt, timestamp);
    this._draw();

    if (this.state === 'playing') {
      this.animFrameId = requestAnimationFrame((t) => this._loop(t));
    }
  }

  _update(dt, timestamp) {
    if (this.state !== 'playing') return;

    this.renderer.update();
    this.particles.update();

    // Difficulty ramp: gradually spawn faster
    this.difficultyTimer += dt;
    const difficulty = Math.min(this.difficultyTimer / 60000, 1); // ramp over 60s
    this.spawnInterval = GAME.SPAWN_INTERVAL_MAX - (GAME.SPAWN_INTERVAL_MAX - GAME.SPAWN_INTERVAL_MIN) * difficulty;

    // Spawn new cats
    if (timestamp - this.lastSpawnTime > this.spawnInterval) {
      this.cats.push(spawnCat(this.canvas.width, this.canvas.height));
      this.lastSpawnTime = timestamp;
    }

    // Combo timer
    if (this.combo > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 0;
        this._updateHUD();
      }
    }

    // Get finger position
    const finger = this.tracker.getPosition();
    const fingerActive = finger.grabbing;
    const fx = finger.x;
    const fy = finger.y;

    // Grab logic: if finger is active and near a flying cat, grab it
    if (fingerActive && !this.grabbedCat && !this.transformingCat) {
      let closest = null;
      let closestDist = Infinity;
      for (const cat of this.cats) {
        if (cat.state !== CAT_STATES.FLYING) continue;
        const d = cat.distTo(fx, fy);
        if (d < GAME.GRAB_RADIUS && d < closestDist) {
          closest = cat;
          closestDist = d;
        }
      }
      if (closest) {
        this.grabbedCat = closest;
        closest.state = CAT_STATES.GRABBED;
      }
    }

    // Release cat if finger is no longer active
    if (!fingerActive && this.grabbedCat) {
      this.grabbedCat.state = CAT_STATES.FLYING;
      // Give it a small random velocity so it flies away
      this.grabbedCat.vx = (Math.random() - 0.5) * 3;
      this.grabbedCat.vy = (Math.random() - 0.5) * 3 - 1;
      this.grabbedCat = null;
    }

    // Move grabbed cat to finger position
    if (this.grabbedCat) {
      this.grabbedCat.x += (fx - this.grabbedCat.x) * 0.3;
      this.grabbedCat.y += (fy - this.grabbedCat.y) * 0.3;

      // Check if grabbed cat is over the glass
      if (this.glass.containsPoint(this.grabbedCat.x, this.grabbedCat.y)) {
        this._processCat(this.grabbedCat);
        this.grabbedCat = null;
      }
    }

    // Update glass
    const grabbedNearGlass = this.grabbedCat
      ? this.glass.containsPoint(this.grabbedCat.x, this.grabbedCat.y)
      : false;
    this.glass.update(this.canvas.width, this.canvas.height, grabbedNearGlass);

    // Handle transforming cat
    if (this.transformingCat) {
      const done = this.transformingCat.update(this.canvas.width, this.canvas.height);
      if (done === true) {
        // Just started dissolving — spawn particles
        this.particles.addDissolveBurst(this.transformingCat.x, this.transformingCat.y, this.transformingCat.color);
        this.particles.addSparkles(this.transformingCat.x, this.transformingCat.y);
        this.transformFlash = 15; // flash frames
      } else if (done === false) {
        // Fully dissolved — remove
        this.cats = this.cats.filter(c => c !== this.transformingCat);
        this.transformingCat = null;
      }
    }

    // Update all cats
    const w = this.canvas.width;
    const h = this.canvas.height;
    for (let i = this.cats.length - 1; i >= 0; i--) {
      const cat = this.cats[i];
      if (cat === this.transformingCat) continue; // handled above

      cat.update(w, h);

      // Remove cats that fly off screen (only flying ones)
      if (cat.state === CAT_STATES.FLYING && cat.isOffScreen(w, h)) {
        this.cats.splice(i, 1);
        // Count as missed if we missed it while playing
        this.missed++;
        this._updateHUD();
        if (this.missed >= GAME.MISS_LIMIT) {
          this._gameOver();
        }
      } else if (cat.state === CAT_STATES.DISSOLVING && cat.dissolveAlpha <= 0) {
        this.cats.splice(i, 1);
      }
    }

    // Trail particles at finger
    if (fingerActive) {
      this.particles.addTrail(fx, fy);
    }

    // Transform flash decay
    if (this.transformFlash > 0) {
      this.transformFlash--;
    }
  }

  _processCat(cat) {
    cat.state = CAT_STATES.TRANSFORMING;
    cat.transformProgress = 0;
    this.transformingCat = cat;

    // Combo logic
    this.comboTimer = GAME.COMBO_TIMEOUT;
    this.combo = Math.min(this.combo + 1, GAME.MAX_COMBO_MULTIPLIER);
    const points = GAME.SCORE_PER_CAT * this.combo;
    this.score += points;
    this._updateHUD();

    if (this.onScoreChange) this.onScoreChange(this.score, this.combo);
    if (this.onCatProcessed) this.onCatProcessed(points, this.combo);
  }

  _gameOver() {
    this.state = 'gameover';
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.onGameOver) this.onGameOver(this.score);
  }

  _updateHUD() {
    if (this.scoreEl) this.scoreEl.textContent = this.score;
    if (this.comboEl) this.comboEl.textContent = this.combo;
    if (this.missedEl) this.missedEl.textContent = this.missed;
  }

  _draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Fingertip glow
    const finger = this.tracker.getPosition();
    if (finger.visible) {
      this.renderer.drawFingertipGlow(finger.x, finger.y);
    }

    // Background
    this.renderer.drawBackground();

    // Transform flash overlay
    if (this.transformFlash > 0) {
      ctx.save();
      ctx.globalAlpha = this.transformFlash / 25;
      ctx.fillStyle = '#ff00ff';
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    // Glass
    this.glass.draw(ctx);

    // Cats
    for (const cat of this.cats) {
      cat.draw(ctx);
    }

    // Particles
    this.particles.draw(ctx);

    // Fingertip cursor dot
    if (finger.visible) {
      ctx.save();
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(finger.x, finger.y, 4, 0, Math.PI * 2);
      ctx.fill();

      // Crosshair ring — only when grabbing
      if (finger.grabbing) {
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(finger.x, finger.y, GAME.GRAB_RADIUS, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Draw "DROP HERE" text near glass
    if (this.grabbedCat) {
      const g = this.glass;
      ctx.save();
      ctx.globalAlpha = 0.6 + Math.sin(Date.now() * 0.005) * 0.3;
      ctx.fillStyle = '#ff00ff';
      ctx.shadowColor = '#ff00ff';
      ctx.shadowBlur = 15;
      ctx.font = 'bold 16px Orbitron, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('DROP!', g.x, g.y - g.radius - 20);
      ctx.restore();
    }

    // Combo popup text
    if (this.combo > 1 && this.state === 'playing') {
      ctx.save();
      ctx.globalAlpha = this.comboTimer / GAME.COMBO_TIMEOUT * 0.8;
      ctx.fillStyle = '#ffff00';
      ctx.shadowColor = '#ffff00';
      ctx.shadowBlur = 20;
      ctx.font = 'bold 24px Orbitron, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${this.combo}x COMBO!`, w / 2, 100);
      ctx.restore();
    }
  }

  /** Stop game and cleanup */
  destroy() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    window.removeEventListener('resize', this._handleResize);
    this.tracker.stop();
  }
}
