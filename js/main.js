// ============================================================
// main.js — Entry point. Wires up screens, tracker, and game.
// ============================================================

import { Game } from './game.js';
import { FingerTracker } from './tracker.js';

// DOM elements
const videoEl = document.getElementById('video-feed');
const canvasEl = document.getElementById('game-canvas');
const loadingScreen = document.getElementById('loading-screen');
const loadingStatus = document.getElementById('loading-status');
const cameraError = document.getElementById('camera-error');
const useMouseBtn = document.getElementById('use-mouse-btn');
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const gameoverScreen = document.getElementById('gameover-screen');
const finalScoreEl = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');
const scoreValueEl = document.getElementById('score-value');
const comboValueEl = document.getElementById('combo-value');
const missedValueEl = document.getElementById('missed-value');
const hudEl = document.getElementById('hud');
const transformOverlay = document.getElementById('transform-overlay');

let game = null;
let tracker = null;

// ---- INIT ----

function showScreen(screen) {
  [loadingScreen, startScreen, gameoverScreen].forEach(s => {
    if (s) s.style.display = 'none';
  });
  if (screen) screen.style.display = 'flex';
}

function initTracker() {
  tracker = new FingerTracker(videoEl, canvasEl);
  game = new Game(canvasEl, tracker, {
    scoreEl: scoreValueEl,
    comboEl: comboValueEl,
    missedEl: missedValueEl,
  });

  // Wire game callbacks
  game.onGameOver = (score) => {
    hudEl.style.display = 'none';
    finalScoreEl.textContent = score;
    transformOverlay.style.display = 'none';
    showScreen(gameoverScreen);
  };

  game.onCatProcessed = (points) => {
    // Flash overlay briefly
    transformOverlay.style.display = 'block';
    setTimeout(() => { transformOverlay.style.display = 'none'; }, 200);
  };

  tracker.onReady = (mode) => {
    console.log(`Tracking ready: ${mode}`);
    hudEl.style.display = 'flex';
    showScreen(startScreen);
  };

  tracker.onError = (err) => {
    console.error('Tracker error:', err);
    loadingStatus.textContent = 'CAMERA UNAVAILABLE';
    cameraError.style.display = 'block';
    // Show mouse fallback option
    useMouseBtn.onclick = () => {
      cameraError.style.display = 'none';
      loadingStatus.textContent = 'USING MOUSE CONTROLS';
      tracker.startMouseOnly();
    };
  };

  tracker.start();
}

// ---- BUTTON HANDLERS ----

startBtn.addEventListener('click', () => {
  showScreen(null); // hide all screens
  hudEl.style.display = 'flex';
  game.start();
});

restartBtn.addEventListener('click', () => {
  gameoverScreen.style.display = 'none';
  hudEl.style.display = 'flex';
  game.start();
});

// ---- STARTUP ----

// Check for ?mode=mouse URL param (used by e2e tests to skip camera)
const urlParams = new URLSearchParams(window.location.search);
const forceMouse = urlParams.get('mode') === 'mouse';

function bootWithMouse() {
  tracker = new FingerTracker(videoEl, canvasEl);
  game = new Game(canvasEl, tracker, {
    scoreEl: scoreValueEl,
    comboEl: comboValueEl,
    missedEl: missedValueEl,
  });
  game.onGameOver = (score) => {
    hudEl.style.display = 'none';
    finalScoreEl.textContent = score;
    transformOverlay.style.display = 'none';
    showScreen(gameoverScreen);
  };
  game.onCatProcessed = () => {
    transformOverlay.style.display = 'block';
    setTimeout(() => { transformOverlay.style.display = 'none'; }, 200);
  };
  tracker.onReady = (mode) => {
    console.log(`Tracking ready: ${mode}`);
    hudEl.style.display = 'flex';
    showScreen(startScreen);
  };
  tracker.onError = () => {
    // Fallback: just use mouse
    tracker.startMouseOnly();
  };
  tracker.startMouseOnly();
}

if (forceMouse) {
  loadingStatus.textContent = 'USING MOUSE CONTROLS';
  bootWithMouse();
} else {
  showScreen(loadingScreen);
  loadingStatus.textContent = 'INITIALIZING CAMERA...';
  initTracker();
}
