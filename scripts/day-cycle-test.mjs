import { chromium } from 'playwright-core';

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});

await page.addInitScript(() => {
  localStorage.setItem('nimbu-nagar-first-days-v2', JSON.stringify({
    version: 2,
    day: 1,
    minutes: 1270,
    money: 2100,
    inventory: ['Luggage at guesthouse', 'Guesthouse key'],
    contacts: ['Leela'],
    relationships: { leela: 4, rekha: 2, dev: 3 },
    memories: { roomPreference: 'quiet courtyard room' },
    messages: [],
    journal: [],
    questIndex: 3,
    awaitingDay: true,
    complete: false,
    playerNormal: null,
  }));
});

await page.goto(process.env.BASE_URL ?? 'http://127.0.0.1:5173/', { waitUntil: 'networkidle', timeout: 120000 });
await page.waitForFunction(() => document.querySelector('#loading').classList.contains('loading--hidden'));
await page.locator('#start-button').click();
await page.waitForTimeout(3000);
if (!(await page.locator('#day-transition').evaluate((element) => element.classList.contains('day-transition--visible')))) {
  errors.push('Saved overnight transition did not reopen.');
}
await page.locator('#next-day-button').click();
await page.waitForFunction(() => getComputedStyle(document.querySelector('#waypoint')).opacity === '1');
const state = await page.evaluate(() => window.__NIMBU_DEV__.gameState.snapshot);
if (state.day !== 2 || state.minutes !== 450) errors.push(`Unexpected morning state: ${JSON.stringify(state)}`);
const waypoint = await page.locator('#waypoint').evaluate((element) => ({
  className: element.className,
  opacity: getComputedStyle(element).opacity,
  rect: element.getBoundingClientRect().toJSON(),
}));
const questDebug = await page.evaluate(() => ({
  paused: window.__NIMBU_DEV__.quests.pausedForDay,
  complete: window.__NIMBU_DEV__.quests.complete,
  targetName: window.__NIMBU_DEV__.quests.targetName,
  hasTarget: Boolean(window.__NIMBU_DEV__.quests.targetWorldPosition),
}));
if (!waypoint.className.includes('waypoint--visible') || waypoint.opacity !== '1') {
  errors.push(`Top waypoint is not visible: ${JSON.stringify(waypoint)}`);
}
await page.screenshot({ path: '/tmp/nimbu-clean-morning-spawn.png' });

await page.evaluate(() => window.__NIMBU_DEV__.gameState.setTime(22 * 60));
await page.waitForTimeout(350);
await page.screenshot({ path: '/tmp/nimbu-night-cycle.png' });

console.log(JSON.stringify({ errors, day: state.day, morningMinutes: state.minutes, waypoint, questDebug }, null, 2));
await browser.close();
if (errors.length) throw new Error(errors.join('\n'));
