import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: [
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--autoplay-policy=no-user-gesture-required',
  ],
});

const worlds = [
  { id: 'hindi', guide: 'Asha', saveKey: 'sayscape-guide-progress-hindi-v2', audioPath: '/assets/audio/hindi/asha/greeting.mp3' },
  { id: 'japanese', guide: 'Yuki', saveKey: 'sayscape-guide-progress-japanese-v2', audioPath: '/assets/audio/japanese/yuki/greeting.mp3' },
  { id: 'spanish', guide: 'Lola', saveKey: 'sayscape-guide-progress-spanish-v2', audioPath: '/assets/audio/spanish/lola/greeting.mp3' },
];

const results = [];
try {
  for (const world of worlds) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.setDefaultTimeout(120_000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) errors.push(message.text());
    });

    await page.goto(process.env.BASE_URL ?? 'http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
    await page.evaluate((saveKey) => localStorage.removeItem(saveKey), world.saveKey);
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator(`[data-world="${world.id}"]`).click();
    await page.waitForFunction(() => document.querySelector('#loading')?.classList.contains('loading--hidden'));

    const before = await page.evaluate(() => ({
      tutorialVisible: document.querySelector('#guide-card').classList.contains('tutorial-panel--visible'),
      pending: document.querySelector('#game').dataset.firstWalkTutorialPending,
      inputBlocked: window.__NIMBU_EXPLORATION__.grandSystems.inputBlocked,
    }));
    assert.deepEqual(before, { tutorialVisible: false, pending: 'true', inputBlocked: false });

    await page.keyboard.down('w');
    await page.waitForFunction(() => document.querySelector('#guide-card')?.classList.contains('tutorial-panel--visible'));
    await page.keyboard.up('w');
    await page.waitForFunction((guide) => document.querySelector('#guide-listen')?.textContent === `Pause ${guide}`, world.guide);
    await page.waitForTimeout(500);

    const after = await page.evaluate(() => {
      const systems = window.__NIMBU_EXPLORATION__.grandSystems;
      return {
        tutorialVisible: document.querySelector('#guide-card').classList.contains('tutorial-panel--visible'),
        pending: document.querySelector('#game').dataset.firstWalkTutorialPending,
        walked: Number(document.querySelector('#game').dataset.firstWalkDistance),
        inputBlocked: systems.inputBlocked,
        narrationPaused: systems.guideNarration.audio.paused,
        narrationTime: systems.guideNarration.audio.currentTime,
        narrationSrc: new URL(systems.guideNarration.audio.src).pathname,
        listenLabel: document.querySelector('#guide-listen').textContent,
      };
    });
    assert.equal(after.tutorialVisible, true);
    assert.equal(after.pending, 'false');
    assert.ok(after.walked >= 4);
    assert.equal(after.inputBlocked, true);
    assert.equal(after.narrationPaused, false);
    assert.ok(after.narrationTime > 0);
    assert.equal(after.narrationSrc, world.audioPath);
    assert.equal(after.listenLabel, `Pause ${world.guide}`);
    assert.deepEqual(errors, []);

    if (world.id === 'hindi') await page.screenshot({ path: '/tmp/speakworld-first-walk-tutorial.png', fullPage: true });
    results.push({ world: world.id, guide: world.guide, walked: after.walked, narration: 'playing' });
    await page.close();
  }
  console.log(JSON.stringify({ ok: true, worlds: results, screenshot: '/tmp/speakworld-first-walk-tutorial.png' }, null, 2));
} finally {
  await browser.close();
}
