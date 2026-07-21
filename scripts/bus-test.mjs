import { chromium } from 'playwright-core';

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:5173/';
const errors = [];
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});
page.on('pageerror', (error) => errors.push(error.message));

await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 120000 });
await page.waitForFunction(() => document.querySelector('#loading').classList.contains('loading--hidden'));
await page.locator('#start-button').click();
await page.waitForTimeout(1200);

const route = await page.evaluate(() => ({
  length: window.__NIMBU_DEV__.world.shuttlePath.length,
  stops: window.__NIMBU_DEV__.bus.stops.map((stop) => stop.name),
  summitZone: window.__NIMBU_DEV__.world.getZoneName(window.__NIMBU_DEV__.world.landmarks.mountainSummit),
  lakeZone: window.__NIMBU_DEV__.world.getZoneName(window.__NIMBU_DEV__.world.landmarks.mountainLake),
}));
const routeClearance = await page.evaluate(() => {
  const { world } = window.__NIMBU_DEV__;
  let closest = { clearance: Infinity, progress: 0, radius: 0 };
  for (let sample = 0; sample <= 180; sample += 1) {
    const progress = sample / 180;
    const direction = world.shuttlePath.directionAt(progress);
    world.obstacles.filter((obstacle) => obstacle.normal).forEach((obstacle) => {
      const dot = Math.max(-1, Math.min(1, direction.dot(obstacle.normal)));
      const clearance = Math.acos(dot) * 58 - obstacle.radius;
      if (clearance < closest.clearance) closest = { clearance, progress, radius: obstacle.radius };
    });
  }
  return closest;
});
if (route.stops.length !== 2) errors.push(`Expected two shuttle stops, found ${route.stops.length}.`);
if (route.length < 70) errors.push(`Mountain route is too short: ${route.length.toFixed(1)}m.`);
if (routeClearance.clearance < 1.25) {
  errors.push(`The mountain road passes too close to scenery: ${routeClearance.clearance.toFixed(2)}m clearance.`);
}
if (route.summitZone !== 'Shikhar Dham') errors.push(`Unexpected summit zone: ${route.summitZone}.`);
if (route.lakeZone !== 'Neel Taal') errors.push(`Unexpected lake zone: ${route.lakeZone}.`);

await page.evaluate(() => {
  const { player, world, bus, snapCamera } = window.__NIMBU_DEV__;
  const base = world.shuttlePath.stops[0].direction;
  const tangent = world.shuttlePath.tangentAt(0);
  const waitingSpot = bus.exitNormal;
  player.teleportTo(waitingSpot.x, waitingSpot.y, waitingSpot.z);
  player.faceToward(base.x + tangent.x, base.y + tangent.y, base.z + tangent.z);
  snapCamera();
});

try {
  await page.waitForFunction(() => window.__NIMBU_DEV__.bus.stoppedAt?.id === 'pahadi-base', null, { timeout: 12000 });
} catch {
  errors.push('The shuttle did not arrive at Pahadi Road Bus Stand.');
}
await page.waitForTimeout(450);
const ready = await page.evaluate(() => ({
  stoppedAt: window.__NIMBU_DEV__.bus.stoppedAt?.id,
  canBoard: window.__NIMBU_DEV__.bus.canBoard(window.__NIMBU_DEV__.player.worldPosition),
}));
if (!ready.canBoard) errors.push('The mountain shuttle could not be boarded from its shelter.');
await page.screenshot({ path: '/tmp/nimbu-mountain-bus-stop.png' });

await page.keyboard.press('f');
await page.waitForTimeout(450);
const boarded = await page.evaluate(() => ({
  onboard: window.__NIMBU_DEV__.bus.onboard,
  playerVisible: window.__NIMBU_DEV__.player.group.visible,
  normal: window.__NIMBU_DEV__.bus.riderNormal,
}));
if (!boarded.onboard) errors.push('F did not board the mountain shuttle.');
if (boarded.playerVisible) errors.push('The walking avatar remained visible inside the shuttle.');

// Advance the retained in-game shuttle deterministically so this test inspects
// the actual mid-climb camera without waiting through the full player journey.
await page.evaluate(() => {
  window.__NIMBU_DEV__.bus.update(3);
  window.__NIMBU_DEV__.bus.update(9.2);
});
try {
  await page.waitForFunction(() => (
    window.__NIMBU_DEV__.bus.progress > 0.48
    && window.__NIMBU_DEV__.bus.elevation > 2
  ), null, { timeout: 24000 });
} catch {
  errors.push('The boarded shuttle did not visibly climb the mountain terrain.');
}
await page.waitForTimeout(900);
const climbed = await page.evaluate(() => ({
  progress: window.__NIMBU_DEV__.bus.progress,
  elevation: window.__NIMBU_DEV__.bus.elevation,
}));
await page.screenshot({ path: '/tmp/nimbu-mountain-bus-ride.png' });

await page.keyboard.press('f');
await page.waitForTimeout(450);
const leftBus = await page.evaluate(() => ({
  onboard: window.__NIMBU_DEV__.bus.onboard,
  playerVisible: window.__NIMBU_DEV__.player.group.visible,
}));
if (leftBus.onboard) errors.push('F did not leave the mountain shuttle.');
if (!leftBus.playerVisible) errors.push('The walking avatar did not return after leaving the shuttle.');

await page.evaluate(() => {
  const { player, world, snapCamera } = window.__NIMBU_DEV__;
  const summit = world.shuttlePath.stops[1].direction;
  const tangent = world.shuttlePath.tangentAt(1);
  const right = {
    x: summit.y * tangent.z - summit.z * tangent.y,
    y: summit.z * tangent.x - summit.x * tangent.z,
    z: summit.x * tangent.y - summit.y * tangent.x,
  };
  const view = {
    x: summit.x + right.x * 2.8 / 58,
    y: summit.y + right.y * 2.8 / 58,
    z: summit.z + right.z * 2.8 / 58,
  };
  player.teleportTo(view.x, view.y, view.z);
  player.faceToward(summit.x, summit.y, summit.z);
  snapCamera();
});
await page.waitForTimeout(500);
await page.screenshot({ path: '/tmp/nimbu-shikhar-dham.png' });

await page.evaluate(() => {
  const { player, world, snapCamera } = window.__NIMBU_DEV__;
  const lake = world.landmarks.mountainLake;
  const tangentLength = Math.hypot(lake.x, lake.z);
  const tangent = { x: -lake.z / tangentLength, y: 0, z: lake.x / tangentLength };
  const shore = {
    x: lake.x + tangent.x * 6.25 / 58,
    y: lake.y,
    z: lake.z + tangent.z * 6.25 / 58,
  };
  player.teleportTo(shore.x, shore.y, shore.z);
  player.faceToward(lake.x, lake.y, lake.z);
  snapCamera();
});
await page.waitForTimeout(500);
await page.screenshot({ path: '/tmp/nimbu-neel-taal.png' });

console.log(JSON.stringify({ errors, route, routeClearance, ready, boarded, climbed, leftBus }, null, 2));
await browser.close();
if (errors.length) throw new Error(`Bus test failed:\n${errors.join('\n')}`);
