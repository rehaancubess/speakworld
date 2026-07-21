import { chromium } from 'playwright-core';

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});
page.on('pageerror', (error) => errors.push(error.message));

await page.goto(process.env.BASE_URL ?? 'http://127.0.0.1:5173/', {
  waitUntil: 'networkidle',
  timeout: 120000,
});
await page.waitForFunction(() => document.querySelector('#loading').classList.contains('loading--hidden'));

const layout = await page.evaluate(() => {
  const { world } = window.__NIMBU_DEV__;
  let closest = { clearance: Infinity, progress: 0, radius: 0 };
  for (let sample = 0; sample <= 240; sample += 1) {
    const progress = sample / 240;
    const direction = world.shuttlePath.directionAt(progress);
    world.obstacles.filter((obstacle) => obstacle.normal).forEach((obstacle) => {
      const dot = Math.max(-1, Math.min(1, direction.dot(obstacle.normal)));
      const clearance = Math.acos(dot) * 58 - obstacle.radius;
      if (clearance < closest.clearance) closest = { clearance, progress, radius: obstacle.radius };
    });
  }
  const elevations = [0, 0.25, 0.5, 0.75, 1].map((progress) => ({
    progress,
    height: world.getTerrainHeight(world.shuttlePath.directionAt(progress)),
  }));
  const mountainClearings = world.obstacles
    .filter((obstacle) => obstacle.kind === 'mountain')
    .map((obstacle) => {
      const lakeDot = Math.max(-1, Math.min(1, obstacle.normal.dot(world.landmarks.mountainLake)));
      const summitDot = Math.max(-1, Math.min(1, obstacle.normal.dot(world.landmarks.mountainSummit)));
      return {
        lake: Math.acos(lakeDot) * 58 - obstacle.radius - 8.1,
        summit: Math.acos(summitDot) * 58 - obstacle.radius - 11.4,
      };
    });
  return {
    length: world.shuttlePath.length,
    closest,
    elevations,
    obstacleCount: world.obstacles.length,
    cameraBlockerCount: world.cameraBlockers.length,
    mountainClearings,
  };
});

if (layout.length < 70) errors.push(`Route length is only ${layout.length.toFixed(1)}m.`);
if (layout.closest.clearance < 1.25) errors.push(`Road clearance is only ${layout.closest.clearance.toFixed(2)}m.`);
if (layout.elevations[0].height > 0.25) errors.push('The base bus stand begins too high on the mountain.');
if (layout.elevations[2].height < 2) errors.push('The middle of the route does not visibly gain elevation.');
if (layout.elevations.at(-1).height < 8.5) errors.push('The summit is not high enough above the base.');
if (layout.mountainClearings.some((clearing) => clearing.lake < 1)) {
  errors.push('A mountain intrudes into the reserved lake clearing.');
}
if (layout.mountainClearings.some((clearing) => clearing.summit < 1)) {
  errors.push('A mountain intrudes into the reserved summit clearing.');
}

console.log(JSON.stringify({ errors, layout }, null, 2));
await browser.close();
if (errors.length) throw new Error(`Route layout test failed:\n${errors.join('\n')}`);
