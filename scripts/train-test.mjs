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

await page.goto(process.env.BASE_URL ?? 'http://127.0.0.1:5173/', { waitUntil: 'networkidle', timeout: 120000 });
await page.waitForFunction(() => document.querySelector('#loading').classList.contains('loading--hidden'));
await page.locator('#start-button').click();
await page.waitForTimeout(1300);

const stopNames = await page.evaluate(() => window.__NIMBU_DEV__.world.railPath.stops.map((stop) => stop.name));
if (stopNames.length !== 4) errors.push(`Expected four railway stops, found ${stopNames.length}.`);

await page.evaluate(() => {
  const { player, world, snapCamera } = window.__NIMBU_DEV__;
  const path = world.railPath;
  const platform = path.directionAt(path.stationAngle, 1.75);
  const tangent = path.tangentAt(path.stationAngle);
  player.teleportTo(platform.x, platform.y, platform.z);
  player.faceToward(platform.x + tangent.x, platform.y + tangent.y, platform.z + tangent.z);
  snapCamera();
});

try {
  await page.waitForFunction(
    () => window.__NIMBU_DEV__.train.arriving || window.__NIMBU_DEV__.train.stopped,
    null,
    { timeout: 5000 },
  );
} catch {
  errors.push('Approaching Nadi Para did not request the train.');
}
const requested = await page.evaluate(() => (
  window.__NIMBU_DEV__.train.arriving || window.__NIMBU_DEV__.train.stopped
));

try {
  await page.waitForFunction(() => window.__NIMBU_DEV__.train.stopped, null, { timeout: 15000 });
} catch {
  errors.push('The train did not stop at Nadi Para.');
}
const ready = await page.evaluate(() => ({
  stopped: window.__NIMBU_DEV__.train.stopped,
  canBoard: window.__NIMBU_DEV__.train.canBoard(window.__NIMBU_DEV__.player.worldPosition),
}));
if (!ready.stopped && !errors.includes('The train did not stop at Nadi Para.')) errors.push('The train did not stop at Nadi Para.');
if (!ready.canBoard) errors.push('The stopped train could not be boarded from the platform.');
await page.waitForTimeout(250);
await page.screenshot({ path: '/tmp/nimbu-train-station.png' });

await page.keyboard.press('f');
await page.waitForTimeout(450);
const boarded = await page.evaluate(() => ({
  onboard: window.__NIMBU_DEV__.train.onboard,
  playerVisible: window.__NIMBU_DEV__.player.group.visible,
  normal: window.__NIMBU_DEV__.train.riderNormal,
}));
if (!boarded.onboard) errors.push('F did not board the Nimbu Express.');
if (boarded.playerVisible) errors.push('The walking avatar remained visible inside the train.');

await page.evaluate(() => {
  window.__NIMBU_TRAIN_START__ = window.__NIMBU_DEV__.train.riderNormal;
});
try {
  await page.waitForFunction(() => {
    const start = window.__NIMBU_TRAIN_START__;
    const current = window.__NIMBU_DEV__.train.riderNormal;
    const dot = Math.max(-1, Math.min(1, start.x * current.x + start.y * current.y + start.z * current.z));
    return Math.acos(dot) * 58 > 2;
  }, null, { timeout: 20000 });
} catch {
  errors.push('The boarded train did not carry the rider around the globe.');
}
const riding = await page.evaluate(() => ({
  onboard: window.__NIMBU_DEV__.train.onboard,
  normal: window.__NIMBU_DEV__.train.riderNormal,
}));
const rideDot = boarded.normal.x * riding.normal.x + boarded.normal.y * riding.normal.y + boarded.normal.z * riding.normal.z;
const rideDistance = Math.acos(Math.max(-1, Math.min(1, rideDot))) * 58;
if (!riding.onboard) errors.push('The rider was removed while the train was moving.');
if (rideDistance < 2 && !errors.includes('The boarded train did not carry the rider around the globe.')) {
  errors.push('The boarded train did not carry the rider around the globe.');
}
await page.screenshot({ path: '/tmp/nimbu-train-ride.png' });

await page.keyboard.press('f');
await page.waitForTimeout(500);
const leftTrain = await page.evaluate(() => ({
  onboard: window.__NIMBU_DEV__.train.onboard,
  playerVisible: window.__NIMBU_DEV__.player.group.visible,
}));
if (leftTrain.onboard) errors.push('F did not leave the train.');
if (!leftTrain.playerVisible) errors.push('The walking avatar did not return after leaving the train.');
await page.screenshot({ path: '/tmp/nimbu-train-exit.png' });

const result = { errors, stopNames, requested, ready, rideDistance, leftTrain };
console.log(JSON.stringify(result, null, 2));
await browser.close();
if (errors.length) throw new Error(`Train test failed:\n${errors.join('\n')}`);
