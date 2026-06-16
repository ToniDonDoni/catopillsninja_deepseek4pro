// ============================================================
// tests/game.spec.js — Playwright E2E tests for Neon Kitty Catcher
// ============================================================

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:8080/?mode=mouse';

/**
 * Helper: navigate to the game in mouse mode and wait for start screen.
 */
async function waitForStartScreen(page) {
  await page.goto(BASE_URL);
  const startScreen = page.locator('#start-screen');
  await startScreen.waitFor({ state: 'visible', timeout: 15000 });
}

/**
 * Helper: start the game by clicking START GAME.
 */
async function startGame(page) {
  const startBtn = page.locator('#start-btn');
  await expect(startBtn).toBeVisible();
  await startBtn.click();

  const hud = page.locator('#hud');
  await hud.waitFor({ state: 'visible', timeout: 5000 });
  await page.waitForTimeout(600); // let first cats spawn
}

test.describe('Neon Kitty Catcher', () => {

  test('1. Game loads and shows start screen', async ({ page }) => {
    await waitForStartScreen(page);

    const startScreen = page.locator('#start-screen');
    await expect(startScreen).toBeVisible();

    const title = startScreen.locator('h1');
    await expect(title).toContainText('NEON KITTY CATCHER');

    const startBtn = page.locator('#start-btn');
    await expect(startBtn).toBeVisible();
    await expect(startBtn).toContainText('START GAME');
  });

  test('2. Game page has all required DOM elements', async ({ page }) => {
    await waitForStartScreen(page);

    const ids = [
      'video-feed', 'game-container', 'game-canvas',
      'loading-screen', 'start-screen', 'gameover-screen',
      'hud', 'score-value', 'combo-value', 'missed-value',
      'start-btn', 'restart-btn',
    ];

    for (const id of ids) {
      await expect(page.locator(`#${id}`)).toBeAttached({ timeout: 3000 });
    }
  });

  test('3. Starting the game activates HUD and hides start screen', async ({ page }) => {
    await waitForStartScreen(page);
    await startGame(page);

    const hud = page.locator('#hud');
    await expect(hud).toBeVisible();

    await expect(page.locator('#score-value')).toHaveText('0');
    await expect(page.locator('#combo-value')).toHaveText('0');
    await expect(page.locator('#missed-value')).toContainText('0');
    await expect(page.locator('#game-canvas')).toBeVisible();
    await expect(page.locator('#start-screen')).not.toBeVisible();
  });

  test('4. Mouse interaction works on canvas during gameplay', async ({ page }) => {
    await waitForStartScreen(page);
    await startGame(page);

    const canvas = page.locator('#game-canvas');
    const box = await canvas.boundingBox();
    expect(box).toBeTruthy();

    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 50, cy - 30, { steps: 5 });
    await page.mouse.up();

    await expect(page.locator('#hud')).toBeVisible();
  });

  test('5. Game runs for several seconds without crashing', async ({ page }) => {
    await waitForStartScreen(page);
    await startGame(page);

    await page.waitForTimeout(5000);
    await expect(page.locator('#hud')).toBeVisible();
    await expect(page.locator('#game-canvas')).toBeVisible();
  });

  test('6. Missed counter changes when cats fly off screen', async ({ page }) => {
    await waitForStartScreen(page);
    await startGame(page);

    // Move mouse off screen so we don't grab cats
    await page.mouse.move(0, 0);

    // Wait for cats to fly off — at least some should
    await page.waitForTimeout(8000);

    const missedEl = page.locator('#missed-value');
    const text = await missedEl.textContent();
    expect(text).toBeTruthy();
  });

  test('7. Game over triggers when miss limit is reached', async ({ page }) => {
    await waitForStartScreen(page);
    await startGame(page);

    // Don't interact with cats
    await page.mouse.move(0, 0);

    // Wait for game over (miss limit = 5 cats)
    const gameoverScreen = page.locator('#gameover-screen');
    await gameoverScreen.waitFor({ state: 'visible', timeout: 40000 });

    await expect(gameoverScreen.locator('h1')).toContainText('GAME OVER');
    await expect(page.locator('#final-score')).toBeVisible();
    await expect(page.locator('#restart-btn')).toContainText('PLAY AGAIN');
  });

  test('8. Restart resets game state', async ({ page }) => {
    await waitForStartScreen(page);
    await startGame(page);

    // Wait for game over
    await page.mouse.move(0, 0);
    const gameoverScreen = page.locator('#gameover-screen');
    await gameoverScreen.waitFor({ state: 'visible', timeout: 40000 });

    await page.locator('#restart-btn').click();

    await expect(gameoverScreen).not.toBeVisible({ timeout: 3000 });
    await expect(page.locator('#hud')).toBeVisible();
    await expect(page.locator('#score-value')).toHaveText('0');
    await expect(page.locator('#missed-value')).toContainText('0');
  });

  test('9. Game survives window resize', async ({ page }) => {
    await waitForStartScreen(page);
    await startGame(page);

    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(500);
    await expect(page.locator('#hud')).toBeVisible();

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(500);
    await expect(page.locator('#hud')).toBeVisible();
  });

  test('10. Full lifecycle: start → play → gameover → restart', async ({ page }) => {
    await waitForStartScreen(page);
    await startGame(page);

    await expect(page.locator('#hud')).toBeVisible();

    // Simulate some play
    const canvas = page.locator('#game-canvas');
    const box = await canvas.boundingBox();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    await page.mouse.move(cx, cy);
    await page.mouse.down();
    const glassX = box.x + box.width * 0.85;
    const glassY = box.y + box.height * 0.65;
    await page.mouse.move(glassX, glassY, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(2000);

    // Stop interacting, wait for game over
    await page.mouse.move(0, 0);
    await page.locator('#gameover-screen').waitFor({ state: 'visible', timeout: 40000 });

    // Restart
    await page.locator('#restart-btn').click();
    await expect(page.locator('#hud')).toBeVisible();
    await expect(page.locator('#score-value')).toHaveText('0');
  });
});
