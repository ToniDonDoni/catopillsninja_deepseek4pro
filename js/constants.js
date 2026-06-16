// ============================================================
// constants.js — Game-wide constants and configuration
// ============================================================

export const COLORS = {
  cyan: '#00ffff',
  magenta: '#ff00ff',
  pink: '#ff69b4',
  lime: '#39ff14',
  yellow: '#ffff00',
  orange: '#ff6600',
  purple: '#9b00ff',
  white: '#ffffff',
  darkBg: '#0a0014',
};

export const CAT_COLORS = [COLORS.cyan, COLORS.magenta, COLORS.lime, COLORS.orange, COLORS.purple, COLORS.yellow];

export const GAME = {
  TARGET_FPS: 60,
  MISS_LIMIT: 5,           // missed cats before game over
  SPAWN_INTERVAL_MIN: 600,  // ms between spawns (min)
  SPAWN_INTERVAL_MAX: 1500, // ms between spawns (max)
  CAT_SPEED_MIN: 2.5,       // pixels per frame
  CAT_SPEED_MAX: 5.0,
  GRAB_RADIUS: 60,          // pixels — fingertip grab distance
  GLASS_X_RATIO: 0.85,      // glass horizontal position as ratio of canvas width
  GLASS_Y_RATIO: 0.65,      // glass vertical position
  GLASS_RADIUS: 70,         // glass drop zone radius
  COMBO_TIMEOUT: 2000,      // ms before combo resets
  SCORE_PER_CAT: 10,
  MAX_COMBO_MULTIPLIER: 5,
  TRAIL_LENGTH: 12,         // fingertip trail particles
  PARTICLE_COUNT: 30,       // dissolution particles
};

export const CAT_STATES = {
  FLYING: 'flying',
  GRABBED: 'grabbed',
  TRANSFORMING: 'transforming',
  DISSOLVING: 'dissolving',
};
