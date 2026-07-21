import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { SOUND_DESIGN } from '../src/country-ambience.js';

assert.deepEqual(Object.keys(SOUND_DESIGN), ['hindi', 'japanese', 'spanish']);
for (const design of Object.values(SOUND_DESIGN)) {
  assert.ok(design.title.length > 5);
  assert.ok(design.layers.length >= 4);
}

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: [
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--autoplay-policy=no-user-gesture-required',
  ],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(120_000);
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) errors.push(message.text());
});

try {
  await page.goto(process.env.BASE_URL ?? 'http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  await page.locator('[data-world="hindi"]').click();
  await page.waitForFunction(() => document.querySelector('#loading')?.classList.contains('loading--hidden'));
  await page.waitForFunction(() => window.__SAYSCAPE_AUDIO__?.state.playing === true);

  const initial = await page.evaluate(() => ({
    engine: document.querySelector('#game').dataset.soundEngine,
    soundtrack: document.querySelector('#game').dataset.soundtrack,
    audio: window.__SAYSCAPE_AUDIO__.state,
    label: document.querySelector('#sound-toggle strong').textContent,
  }));
  assert.equal(initial.engine, 'procedural-score-v2');
  assert.equal(initial.soundtrack, 'Monsoon Courtyard');
  assert.equal(initial.audio.current, 'hindi');
  assert.equal(initial.audio.playing, true);
  assert.equal(initial.audio.volume, 0.18);
  assert.match(initial.label, /Music & sounds on/);

  const cueResults = await page.evaluate(() => [
    'interact', 'jump', 'land', 'footstep', 'vehicle_start', 'transit_board',
    'temple_bell', 'ui_close', 'mission_complete',
  ].map((type) => [type, window.__SAYSCAPE_AUDIO__.playCue(type)]));
  assert.ok(cueResults.every(([, played]) => played), JSON.stringify(cueResults));

  await page.evaluate(() => window.__SAYSCAPE_AUDIO__.updateMotion('scooter', 12));
  assert.equal((await page.evaluate(() => window.__SAYSCAPE_AUDIO__.state)).motion, 'scooter');
  await page.evaluate(() => window.__SAYSCAPE_AUDIO__.updateMotion(null));
  assert.equal((await page.evaluate(() => window.__SAYSCAPE_AUDIO__.state)).motion, null);

  await page.evaluate(() => window.__SAYSCAPE_AUDIO__.setDucked(true));
  assert.equal((await page.evaluate(() => window.__SAYSCAPE_AUDIO__.state)).ducked, true);
  await page.evaluate(() => window.__SAYSCAPE_AUDIO__.setDucked(false));
  assert.equal((await page.evaluate(() => window.__SAYSCAPE_AUDIO__.state)).ducked, false);

  await page.evaluate(() => document.querySelector('#sound-toggle').click());
  assert.equal(await page.locator('#game').getAttribute('data-ambience-muted'), 'true');
  assert.match(await page.locator('#sound-toggle strong').textContent(), /off/);
  await page.evaluate(() => document.querySelector('#sound-toggle').click());
  assert.equal(await page.locator('#game').getAttribute('data-ambience-muted'), 'false');
  assert.deepEqual(errors, []);

  console.log(JSON.stringify({ ok: true, soundtrack: initial.soundtrack, cues: cueResults.length, ducking: 'passed' }, null, 2));
} finally {
  await browser.close();
}
