# Neon Kitty Catcher 🐱💊

A psychedelic browser game inspired by Fruit Ninja. Cats fly across the screen — catch them with your finger (via webcam) and drop them into a neon glass on the right. Each cat transforms into a pill and dissolves, earning you points.

## Visual Style

- Acidic neon colors (cyan, magenta, lime, hot pink)
- Strong glow effects on all elements
- Psychedelic background with animated grid and stars
- Smooth particle effects (trails, dissolution bursts, sparkles)
- Dark cyberpunk atmosphere

## Project Structure

```
catopillsninja_deepseek4pro/
├── index.html              # Main HTML with MediaPipe CDN scripts
├── style.css               # Neon/psychedelic CSS styling
├── server.js               # Simple Node.js static server
├── package.json            # Dependencies & npm scripts
├── playwright.config.js    # Playwright test configuration
├── js/
│   ├── main.js             # Entry point, screen management, init
│   ├── constants.js        # Game configuration & color palette
│   ├── entities.js         # Cat class, Glass class, cat spawner
│   ├── game.js             # Core game loop, state, physics, scoring
│   ├── renderer.js         # Canvas background, grid, stars, glow
│   ├── tracker.js          # Camera/MediaPipe hand tracking + mouse fallback
│   └── particles.js        # Particle system (trail, dissolve, sparkles)
├── tests/
│   └── game.spec.js        # Playwright E2E test suite (10 tests)
└── playwright-report/
    └── index.html          # Generated HTML test report
```

## How It Works

1. **Camera tracking**: Uses MediaPipe Hands to detect your index fingertip via webcam
2. **Mouse fallback**: Automatically falls back to mouse/touch if camera is unavailable, or use `?mode=mouse` URL parameter
3. **Grab mechanics**: Press and hold (mouse down / finger detected) near a flying cat to grab it
4. **Drop zone**: Drag grabbed cats to the glowing glass on the right side of the screen
5. **Transformation**: Cats morph into pills, then dissolve into particles — scoring points
6. **Combo system**: Consecutive catches multiply your score (up to 5x)
7. **Game over**: Miss 5 cats and the game ends; restart anytime

## Installation

```bash
cd /work/catopillsninja_deepseek4pro
npm install
npx playwright install chromium
```

## Run Instructions

Start the development server:

```bash
npm start
# or: node server.js
```

Then open **http://localhost:8080** in your browser.

For mouse-only mode (no camera prompt):

```
http://localhost:8080/?mode=mouse
```

## Test Execution

```bash
# Run all tests
npm test

# Run with visible browser
npm run test:headed

# Run a specific test
npx playwright test --grep "game over"

# View HTML report
npm run report
# or: npx playwright show-report
```

## Playwright Report

After running tests, the HTML report is at:

```
/work/catopillsninja_deepseek4pro/playwright-report/index.html
```

To view it:
```bash
cd /work/catopillsninja_deepseek4pro
npx playwright show-report
```

## Test Coverage (10 tests)

| # | Test | What It Verifies |
|---|------|-----------------|
| 1 | Game loads and shows start screen | Initial page load, title, start button |
| 2 | All required DOM elements present | Every game element is attached to the DOM |
| 3 | Starting game activates HUD | HUD visibility, score/combo/missed at 0, canvas visible |
| 4 | Mouse interaction works | Mouse press-drag-release doesn't crash the game |
| 5 | Game runs without crashing | Game survives 5 seconds of play |
| 6 | Missed counter changes | Cats flying off screen increment the missed count |
| 7 | Game over triggers | Miss limit reached → game over screen appears |
| 8 | Restart resets state | Restart button resets score, missed, hides game over |
| 9 | Window resize handled | Game survives viewport resizes |
| 10 | Full lifecycle | Start → play → gameover → restart complete flow |

## Controls

- **Camera mode**: Move your index finger in front of the webcam
- **Mouse mode**: Click and drag to grab cats, release to drop
- **Touch mode**: Touch and drag on mobile devices

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JS (ES modules), Canvas 2D API
- **Hand tracking**: MediaPipe Hands (loaded from CDN)
- **Testing**: Playwright (Chromium, headless)
- **Server**: Node.js `http` module (zero-dependency static server)
