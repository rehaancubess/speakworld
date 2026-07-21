import { chromium } from 'playwright-core';

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

const page = await browser.newPage({ viewport: { width: 1280, height: 760 }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});
page.on('pageerror', (error) => errors.push(error.message));
page.on('response', (response) => {
  if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
});

const normal = () => page.evaluate(() => {
  const value = window.__NIMBU_DEV__.player.normal;
  return { x: value.x, y: value.y, z: value.z };
});
const angularDistance = (a, b) => {
  const dot = Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z));
  return Math.acos(dot) * (180 / Math.PI);
};

await page.goto(process.env.BASE_URL ?? 'http://127.0.0.1:5173/', { waitUntil: 'networkidle', timeout: 120000 });
await page.locator('#start-button').click();
await page.waitForTimeout(1200);

const start = await normal();
await page.keyboard.down('w');
await page.waitForTimeout(850);
await page.keyboard.up('w');
await page.waitForTimeout(250);
const afterForward = await normal();

await page.evaluate(() => window.__NIMBU_DEV__.player.teleportTo(1, 0.08, 0.12));
await page.waitForTimeout(900);
await page.keyboard.down('d');
await page.waitForTimeout(650);
await page.keyboard.up('d');
await page.waitForTimeout(300);
const eastAfterStrafe = await normal();
await page.screenshot({ path: '/tmp/nimbu-east.png' });

await page.evaluate(() => window.__NIMBU_DEV__.player.teleportTo(0.12, -1, 0.08));
await page.waitForTimeout(900);
const southStart = await normal();
await page.keyboard.down('w');
await page.waitForTimeout(850);
await page.keyboard.up('w');
await page.waitForTimeout(300);
const southAfterForward = await normal();
await page.screenshot({ path: '/tmp/nimbu-south.png' });

await page.evaluate(() => window.__NIMBU_DEV__.player.teleportTo(-1, 0.05, -0.12));
await page.waitForTimeout(900);
await page.screenshot({ path: '/tmp/nimbu-west.png' });

const result = {
  errors,
  movement: {
    forwardDegrees: angularDistance(start, afterForward),
    eastStrafeReached: eastAfterStrafe.x > 0.9,
    farSideForwardDegrees: angularDistance(southStart, southAfterForward),
    farSideReached: southStart.y < -0.98,
  },
};

if (result.movement.forwardDegrees < 0.05) errors.push('W did not move the player on the starting hemisphere.');
if (result.movement.farSideForwardDegrees < 0.05) errors.push('W did not move the player on the far hemisphere.');
if (!result.movement.eastStrafeReached) errors.push('Camera-relative strafe left the east hemisphere unexpectedly.');
if (!result.movement.farSideReached) errors.push('The player could not occupy the underside of the globe.');

console.log(JSON.stringify(result, null, 2));
await browser.close();
