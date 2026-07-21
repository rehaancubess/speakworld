import { chromium } from 'playwright-core';

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});
page.on('pageerror', (error) => errors.push(error.message));
page.on('response', (response) => {
  if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
});

async function teleportToQuestTarget() {
  await page.evaluate(() => {
    const target = window.__NIMBU_DEV__.quests.targetWorldPosition;
    if (!target) return;
    const length = Math.hypot(target.x, target.y, target.z);
    const normal = { x: target.x / length, y: target.y / length, z: target.z / length };
    let tangent = { x: -normal.z, y: 0, z: normal.x };
    let tangentLength = Math.hypot(tangent.x, tangent.y, tangent.z);
    if (tangentLength < 0.1) {
      tangent = { x: 0, y: normal.z, z: -normal.y };
      tangentLength = Math.hypot(tangent.x, tangent.y, tangent.z);
    }
    const angularOffset = 1.85 / 58;
    window.__NIMBU_DEV__.player.teleportTo(
      normal.x + (tangent.x / tangentLength) * angularOffset,
      normal.y + (tangent.y / tangentLength) * angularOffset,
      normal.z + (tangent.z / tangentLength) * angularOffset,
    );
    window.__NIMBU_DEV__.player.faceToward(target.x, target.y, target.z);
    window.__NIMBU_DEV__.snapCamera();
  });
  await page.waitForTimeout(320);
}

async function chooseFirstAvailable() {
  const choices = page.locator('.dialogue__choice:not(:disabled)');
  if (await choices.count()) {
    await choices.first().click();
    await page.waitForTimeout(110);
    return true;
  }
  return false;
}

async function completeCurrentMission(mission) {
  await teleportToQuestTarget();
  await page.keyboard.press('e');
  await page.waitForTimeout(150);
  if (!(await page.locator('#dialogue').evaluate((element) => element.classList.contains('dialogue--visible')))) {
    errors.push(`Mission ${mission} did not open its dialogue.`);
    return;
  }

  if (mission === 1) {
    await page.locator('.dialogue__choice').nth(1).click();
    await page.waitForTimeout(100);
    const retryCopy = await page.locator('#dialogue-text').textContent();
    if (!retryCopy.includes('Rekha')) errors.push('The first wrong answer did not create an in-world consequence.');
    await page.keyboard.press('e');
    await page.waitForTimeout(100);
  }

  for (let guard = 0; guard < 14; guard += 1) {
    const visible = await page.locator('#dialogue').evaluate((element) => element.classList.contains('dialogue--visible'));
    if (!visible) return;
    if (!(await chooseFirstAvailable())) {
      await page.keyboard.press('e');
      await page.waitForTimeout(110);
    }
  }
  errors.push(`Mission ${mission} exceeded the dialogue guard.`);
}

await page.goto(process.env.BASE_URL ?? 'http://127.0.0.1:5173/', { waitUntil: 'networkidle', timeout: 120000 });
await page.waitForFunction(() => document.querySelector('#loading').classList.contains('loading--hidden'));
await page.waitForTimeout(650);
await page.screenshot({ path: '/tmp/nimbu-first-days-menu.png' });
await page.locator('#start-button').click();
await page.waitForTimeout(1350);

const opening = await page.evaluate(() => window.__NIMBU_DEV__.gameState.snapshot);
if (opening.day !== 1 || opening.money !== 2800 || !opening.inventory.includes('Suitcase')) {
  errors.push(`Unexpected opening state: ${JSON.stringify(opening)}`);
}
await page.screenshot({ path: '/tmp/nimbu-day1-arrival.png' });

const totalQuests = await page.evaluate(() => window.__NIMBU_DEV__.quests.totalQuests);
const completedDays = [];
for (let mission = 1; mission <= totalQuests; mission += 1) {
  await completeCurrentMission(mission);
  await page.waitForTimeout(650);

  const missionState = await page.evaluate(() => window.__NIMBU_DEV__.gameState.snapshot);
  if (mission === 20) {
    if (Math.abs(missionState.minutes - (17 * 60 + 30)) > 2) errors.push(`Festival decorating ended at ${missionState.minutes}, not sunset.`);
    await page.screenshot({ path: '/tmp/nimbu-festival-sunset.png' });
  }
  if (mission === 21) {
    if (Math.abs(missionState.minutes - (19 * 60 + 15)) > 2) errors.push(`Festival food stall ended at ${missionState.minutes}, not evening.`);
    await page.screenshot({ path: '/tmp/nimbu-festival-evening.png' });
  }
  if (mission === 22) {
    if (Math.abs(missionState.minutes - (21 * 60 + 30)) > 2) errors.push(`Festival celebration ended at ${missionState.minutes}, not night.`);
    await page.screenshot({ path: '/tmp/nimbu-festival-night.png' });
  }

  const transitionVisible = await page.locator('#day-transition').evaluate((element) => (
    element.classList.contains('day-transition--visible')
  ));
  if (transitionVisible) {
    const state = await page.evaluate(() => window.__NIMBU_DEV__.gameState.snapshot);
    completedDays.push(state.day);
    await page.screenshot({ path: `/tmp/nimbu-day${state.day}-complete.png` });

    if (state.day === 1) {
      if (!state.inventory.includes('Guesthouse key')) errors.push('Day 1 did not award the guesthouse key.');
      if (state.money !== 2100) errors.push(`Day 1 deposit produced ₹${state.money}, expected ₹2100.`);
    }
    if (state.day === 2) {
      if (!state.inventory.includes('Phone') || !state.inventory.includes('Activated SIM')) {
        errors.push('Day 2 did not activate the phone and SIM.');
      }
      if (!state.contacts.includes('Mohan')) errors.push('Day 2 did not persist Mohan as a contact.');
    }
    if (state.day === 4 && !state.memories.fanFixed) errors.push('Day 4 did not persist the repaired fan.');

    await page.locator('#next-day-button').click();
    await page.waitForTimeout(720);
    if (state.day < 5) await page.screenshot({ path: `/tmp/nimbu-day${state.day + 1}-morning.png` });
  }
}

const finalState = await page.evaluate(() => ({
  state: window.__NIMBU_DEV__.gameState.snapshot,
  complete: window.__NIMBU_DEV__.quests.complete,
  questIndex: window.__NIMBU_DEV__.quests.questIndex,
}));
if (!finalState.complete || !finalState.state.complete) errors.push('The five-day story did not reach completion.');
if (finalState.questIndex !== totalQuests) errors.push(`Completed ${finalState.questIndex}/${totalQuests} missions.`);
if (completedDays.join(',') !== '1,2,3,4,5') errors.push(`Unexpected day transitions: ${completedDays.join(',')}`);

await page.locator('#phone-button').click();
await page.waitForTimeout(250);
if (!(await page.locator('#phone-panel').evaluate((element) => element.classList.contains('phone-panel--visible')))) {
  errors.push('Phone panel did not open.');
}
await page.screenshot({ path: '/tmp/nimbu-five-days-phone.png' });

await page.reload({ waitUntil: 'networkidle' });
await page.waitForFunction(() => document.querySelector('#loading').classList.contains('loading--hidden'));
const restored = await page.evaluate(() => window.__NIMBU_DEV__.gameState.snapshot);
if (!restored.complete || restored.questIndex !== totalQuests || restored.money !== finalState.state.money) {
  errors.push(`Autosave did not restore the completed journey: ${JSON.stringify(restored)}`);
}

const result = {
  errors,
  totalQuests,
  completedDays,
  money: finalState.state.money,
  inventory: finalState.state.inventory,
  contacts: finalState.state.contacts,
  memories: finalState.state.memories,
  autosaveRestored: restored.complete,
};
console.log(JSON.stringify(result, null, 2));
await browser.close();
if (errors.length) throw new Error(`Five-day visual playthrough failed:\n${errors.join('\n')}`);
