import { chromium } from 'playwright-core';

const worlds = [
  { id: 'hindi', root: 'WORLD_NIMBU_GRAND' },
  { id: 'japanese', root: 'WORLD_NIMBU_JAPAN' },
  { id: 'spanish', root: 'WORLD_NIMBU_MEXICO' },
];

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

const results = [];
for (const world of worlds) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(120000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) errors.push(message.text());
  });
  await page.goto(process.env.BASE_URL ?? 'http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  await page.locator(`[data-world="${world.id}"]`).click();
  await page.waitForFunction(() => document.querySelector('#loading')?.classList.contains('loading--hidden'));
  await page.waitForTimeout(1800);
  const result = await page.evaluate(({ rootName }) => {
    const state = window.__NIMBU_EXPLORATION__;
    const root = state.world.getObjectByName(rootName);
    const terrain = state.groundMeshes.find((mesh) => /TERRAIN/.test(mesh.name));
    terrain.geometry.computeBoundingBox();
    const terrainWorldBounds = terrain.geometry.boundingBox.clone().applyMatrix4(terrain.matrixWorld);
    const authoredStops = [
      [-272, -103], [-154, -37], [-42, 27], [78, -35], [176, 45], [258, 105],
    ];
    const surfaceHeights = authoredStops.map(([x, authoredY]) => {
      const probe = state.player.position.clone().set(x, 20, -authoredY);
      return state.terrainY(probe);
    });
    return {
      mode: root.userData.playable_ground_mode,
      groundZ: root.userData.playable_ground_z_m,
      terrainSpan: terrainWorldBounds.max.y - terrainWorldBounds.min.y,
      surfaceHeights,
      datasetMode: document.querySelector('#game').dataset.playableGroundMode,
    };
  }, { rootName: world.root });
  if (world.id === 'japanese') {
    await page.keyboard.press('Enter');
    await page.evaluate(() => {
      const state = window.__NIMBU_EXPLORATION__;
      const probe = state.player.position.clone().set(160, 20, -46);
      state.player.position.set(160, state.terrainY(probe), -46);
      state.camera.position.set(148, 9, -32);
    });
    await page.waitForTimeout(900);
    result.inari = await page.evaluate(() => {
      const state = window.__NIMBU_EXPLORATION__;
      const floor = state.terrainY(state.player.position);
      return {
        playerY: state.player.position.y,
        floor,
        delta: state.player.position.y - floor,
      };
    });
    await page.screenshot({ path: '/tmp/sayscape-japan-inari-level.png', fullPage: true });
  }
  result.id = world.id;
  result.errors = errors;
  results.push(result);
  await page.close();
}

await browser.close();

for (const result of results) {
  if (result.mode !== 'level' || result.datasetMode !== 'level') {
    throw new Error(`${result.id}: expected level ground metadata, got ${JSON.stringify(result)}`);
  }
  if (Math.abs(result.groundZ) > 0.001 || result.terrainSpan > 0.001) {
    throw new Error(`${result.id}: terrain is not level: ${JSON.stringify(result)}`);
  }
  if (result.surfaceHeights.some((height) => !Number.isFinite(height) || height < 0.06 || height > 0.75)) {
    throw new Error(`${result.id}: invalid walkable surface heights: ${JSON.stringify(result)}`);
  }
  if (result.inari && Math.abs(result.inari.delta) > 0.01) {
    throw new Error(`${result.id}: player is not grounded at Inari Hill: ${JSON.stringify(result)}`);
  }
  if (result.errors.length) throw new Error(`${result.id}: browser errors: ${result.errors.join(' | ')}`);
}

console.log(JSON.stringify({ ok: true, worlds: results }, null, 2));
