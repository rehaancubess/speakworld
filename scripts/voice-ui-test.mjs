import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: [
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    '--autoplay-policy=no-user-gesture-required',
  ],
});

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:5173/';
const cases = [
  { id: 'hindi', guide: 'Asha', speaker: 'Ravi', phrase: 'नमस्ते', context: 'Nimbu Junction', saveKey: 'sayscape-guide-progress-hindi-v2' },
  { id: 'japanese', guide: 'Yuki', speaker: 'Haru', phrase: 'こんにちは', context: 'Sakura Gate', saveKey: 'sayscape-guide-progress-japanese-v2' },
  { id: 'spanish', guide: 'Lola', speaker: 'Lucía', phrase: '¡Hola!', context: 'Plaza Naranja', saveKey: 'sayscape-guide-progress-spanish-v2' },
];

const results = [];
try {
  for (const world of cases) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.setDefaultTimeout(120_000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) errors.push(message.text());
    });

    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.evaluate((saveKey) => localStorage.removeItem(saveKey), world.saveKey);
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator(`[data-world="${world.id}"]`).click();
    await page.waitForFunction(() => document.querySelector('#loading')?.classList.contains('loading--hidden'));
    assert.equal(await page.locator('#guide-card').isHidden(), true);
    assert.equal(await page.locator('#game').getAttribute('data-first-walk-tutorial-pending'), 'true');
    await page.keyboard.down('w');
    await page.waitForFunction(() => document.querySelector('#guide-card')?.classList.contains('tutorial-panel--visible'), null, { timeout: 15_000 });
    await page.keyboard.up('w');
    await page.locator('#guide-card').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#game').getAttribute('data-first-walk-tutorial-pending'), 'false');
    assert.ok(Number(await page.locator('#game').getAttribute('data-first-walk-distance')) >= 4);
    assert.equal(await page.locator('#guide-phrase-list .guide-phrase-row').count(), 3);
    assert.match(await page.locator('#guide-start').textContent(), /I remember these/i);
    assert.match(await page.locator('#guide-context').textContent(), new RegExp(world.context, 'i'));

    const voiceStatus = await page.evaluate(() => fetch('/api/voice/status').then((response) => response.json()));
    if (process.env.EXPECT_VOICE_CONFIGURED === '1') assert.equal(voiceStatus.configured, true);
    assert.equal(await page.locator('#guide-listen').isVisible(), true);
    assert.match(await page.locator('#guide-audio-status').textContent(), /AI voice/i);
    await page.waitForFunction((guide) => document.querySelector('#guide-listen')?.textContent === `Pause ${guide}`, world.guide);
    assert.equal(await page.locator('#guide-listen').getAttribute('aria-pressed'), 'true');
    await page.locator('#guide-listen').click();
    await page.waitForFunction((guide) => document.querySelector('#guide-listen')?.textContent === `Listen to ${guide}`, world.guide);
    if (voiceStatus.configured) assert.equal(voiceStatus.worlds.includes(world.id), true);
    await page.locator('#guide-start').click();

    await page.locator('#lesson-status').click();
    await page.locator('#mission-board').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#mission-list .mission-list__item').count(), 10);
    await page.locator('#mission-board-close').click();

    await page.evaluate(() => {
      const systems = window.__NIMBU_EXPLORATION__.grandSystems;
      const lesson = systems.currentLesson;
      const item = systems.interactions.find((entry) => entry.action === lesson.action);
      systems.openPractice(lesson, item);
    });
    await page.locator('#practice-panel').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#practice-panel').getAttribute('data-practice-mode'), 'voice');
    assert.equal(await page.locator('#practice-mode-voice').isVisible(), true);
    assert.equal(await page.locator('#voice-start').isVisible(), true);
    assert.match(await page.locator('#voice-hint-native').textContent(), new RegExp(world.phrase));
    assert.match(await page.locator('#practice-context').textContent(), new RegExp(world.context, 'i'));

    await page.locator('#voice-start').click();
    if (voiceStatus.configured) {
      await page.locator('#voice-mic-toggle').waitFor({ state: 'visible', timeout: 45_000 });
      await page.locator('.voice-line--local').waitFor({ state: 'visible', timeout: 45_000 });
      await page.waitForFunction(() => /Your turn · speak naturally/i.test(document.querySelector('#voice-status')?.textContent || ''), null, { timeout: 45_000 });
      assert.match(await page.locator('.voice-line--local').last().textContent(), new RegExp(`^${world.speaker}:`));
      await page.locator('#voice-mic-toggle').click();
      assert.match(await page.locator('#voice-status').textContent(), /paused/i);
      await page.locator('#voice-mic-toggle').click();
      assert.match(await page.locator('#voice-status').textContent(), /Listening/i);
    } else {
      await page.waitForFunction(() => /not configured/i.test(document.querySelector('#voice-status')?.textContent || ''));
    }
    await page.locator('#voice-use-text').click();
    assert.equal(await page.locator('#practice-panel').getAttribute('data-practice-mode'), 'text');
    assert.equal(await page.locator('#practice-choices button').count(), 3);
    await page.locator('#practice-choices button').first().click();
    assert.equal(await page.locator('#game').getAttribute('data-last-practice-source'), 'text');
    assert.deepEqual(errors, []);
    results.push({ world: world.id, tutorialAudio: voiceStatus.configured, liveVoice: voiceStatus.configured, textFallback: true });
    await page.close();
  }

  console.log(JSON.stringify({ ok: true, worlds: results }, null, 2));
} finally {
  await browser.close();
}
