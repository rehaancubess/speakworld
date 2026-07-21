import { chromium } from 'playwright-core';

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
page.setDefaultTimeout(120000);
const errors = [];
page.on('console', (message) => {
  if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) errors.push(message.text());
});
page.on('pageerror', (error) => errors.push(error.message));
page.on('response', (response) => {
  if (response.status() >= 400 && !response.url().endsWith('/favicon.ico')) errors.push(`${response.status()} ${response.url()}`);
});

await page.goto(process.env.BASE_URL ?? 'http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await page.evaluate(() => {
  localStorage.removeItem('nimbu-guide-progress-spanish-v1');
  localStorage.removeItem('sayscape-guide-progress-spanish-v2');
});
await page.reload({ waitUntil: 'networkidle' });
await page.locator('#world-select').waitFor({ state: 'visible' });
const selector = await page.evaluate(() => ({
  heading: document.querySelector('#world-select h1')?.textContent,
  choices: Array.from(document.querySelectorAll('[data-world]')).map((item) => item.dataset.world),
  spanish: document.querySelector('[data-world="spanish"]')?.textContent,
}));
await page.screenshot({ path: '/tmp/nimbu-three-world-selection.png', fullPage: true });
await page.locator('[data-world="spanish"]').click();
await page.waitForFunction(() => document.querySelector('#loading')?.classList.contains('loading--hidden'), null, { timeout: 120000 });
await page.waitForTimeout(3500);

const initial = await page.evaluate(() => {
  const state = window.__NIMBU_EXPLORATION__;
  const game = document.querySelector('#game');
  const root = state.world.getObjectByName('WORLD_NIMBU_MEXICO');
  const lessonRoots = [
    'INTERACT_LOCAL_FRIEND', 'INTERACT_CHAI_VENDOR', 'INTERACT_FRUIT_VENDOR',
    'INTERACT_DIRECTIONS_LOCAL', 'INTERACT_TICKET_CLERK', 'INTERACT_PHARMACIST',
  ];
  const mexicoFoliage = [];
  state.world.traverse((object) => {
    if (/^BATCH_MX_(?:JACARANDA|PALM)/.test(object.name) && object.isMesh) mexicoFoliage.push(object.name);
  });
  return {
    asset: state.asset,
    worldId: state.worldId,
    root: Boolean(root),
    rootWorldId: root?.userData.world_id,
    country: root?.userData.country,
    player: state.player.position.toArray(),
    mapSize: [
      state.mapBounds.max.x - state.mapBounds.min.x,
      state.mapBounds.max.y - state.mapBounds.min.y,
      state.mapBounds.max.z - state.mapBounds.min.z,
    ],
    walkables: state.groundMeshes.length,
    obstacles: state.obstacles.length,
    lessonRoots: lessonRoots.every((name) => Boolean(state.world.getObjectByName(name))),
    lessonActions: state.grandSystems.lessons.map((lesson) => lesson.action),
    lessonCount: Number(game.dataset.lessonCount),
    guidePortrait: document.querySelector('#guide-avatar')?.getAttribute('src'),
    ambienceWorld: game.dataset.ambienceWorld,
    guideName: state.grandSystems.config.guideName,
    guideTitle: document.querySelector('#guide-title').textContent,
    guideNative: document.querySelector('#guide-hindi').textContent,
    guideRomajiVisible: !document.querySelector('#guide-romaji').hidden,
    guideEnglish: document.querySelector('#guide-english').textContent,
    guideHeader: document.querySelector('.guide-card__header small').textContent,
    tutorialVisible: document.querySelector('#guide-card').classList.contains('tutorial-panel--visible'),
    inputBlocked: state.grandSystems.inputBlocked,
    firstWalkPending: game.dataset.firstWalkTutorialPending,
    districts: state.grandSystems.districts.filter((district) => district.object).map((district) => district.name),
    metroStops: Array.from({ length: 5 }, (_, index) => state.world.getObjectByName(`TRAIN_STOP_${String(index).padStart(2, '0')}`)).filter(Boolean).length,
    metro: Boolean(state.train && state.trainCurve && state.train.getObjectByName('TRAIN_PLAYER_SEAT')),
    bicycles: state.grandSystems.bicycles.length,
    routines: state.grandSystems.routines.length,
    foliage: mexicoFoliage.length,
    landmarks: [
      'LANDMARK_CANAL_DE_FLORES', 'LANDMARK_MERCADO_ZOCALO',
      'LANDMARK_CERRO_AGAVE_FIELDS', 'BACKGROUND_MEXICO_VOLCANO',
    ].map((name) => [name, Boolean(state.world.getObjectByName(name))]),
    mapTitle: document.querySelector('#world-map-title').textContent,
    mapSubtitle: document.querySelector('#world-map-subtitle').textContent,
    brandSubtitle: document.querySelector('#brand-subtitle').textContent,
    mapRoads: document.querySelectorAll('#world-map-cartography .world-map__road').length,
    mapStations: document.querySelectorAll('#world-map-cartography .world-map__station-dot').length,
    mapWorld: document.querySelector('#world-map-cartography').dataset.world,
    mapTransit: document.querySelector('#world-map-transit-legend').textContent,
    bicycleMarkers: document.querySelectorAll('.world-map__vehicle--bicycle').length,
    cameraBehindDot: Number(game.dataset.cameraBehindDot),
  };
});
await page.keyboard.down('w');
await page.waitForFunction(() => document.querySelector('#guide-card')?.classList.contains('tutorial-panel--visible'), null, { timeout: 15000 });
await page.keyboard.up('w');
const firstWalkTutorial = await page.evaluate(() => ({
  visible: document.querySelector('#guide-card').classList.contains('tutorial-panel--visible'),
  pending: document.querySelector('#game').dataset.firstWalkTutorialPending,
  distance: Number(document.querySelector('#game').dataset.firstWalkDistance),
  inputBlocked: window.__NIMBU_EXPLORATION__.grandSystems.inputBlocked,
}));
await page.screenshot({ path: '/tmp/nimbu-mexico-tutorial.png', fullPage: true });

await page.keyboard.press('Enter');
await page.waitForTimeout(180);
const afterTutorial = await page.evaluate(() => ({
  phase: window.__NIMBU_EXPLORATION__.grandSystems.state.phase,
  navigationTarget: document.querySelector('#game').dataset.navigationTarget,
  objective: document.querySelector('#objective').textContent,
}));
const playerBeforeWalk = initial.player;
await page.keyboard.down('w');
await page.waitForTimeout(950);
await page.keyboard.up('w');
const playerAfterWalk = await page.evaluate(() => window.__NIMBU_EXPLORATION__.player.position.toArray());
const walkingTravel = Math.hypot(...playerAfterWalk.map((value, index) => value - playerBeforeWalk[index]));
await page.screenshot({ path: '/tmp/nimbu-mexico-gameplay.png', fullPage: true });

await page.keyboard.press('m');
await page.waitForTimeout(120);
const mapOpen = await page.locator('#world-map').evaluate((element) => element.classList.contains('world-map--open'));
await page.screenshot({ path: '/tmp/nimbu-mexico-map.png', fullPage: true });
await page.keyboard.press('m');

await page.evaluate(() => {
  const state = window.__NIMBU_EXPLORATION__;
  state.player.position.copy(state.grandSystems.bicycles[0].getWorldPosition(state.player.position));
});
await page.waitForTimeout(120);
await page.keyboard.press('e');
await page.waitForTimeout(140);
const bicycleBefore = await page.evaluate(() => window.__NIMBU_EXPLORATION__.player.position.toArray());
await page.keyboard.down('w');
await page.waitForTimeout(850);
await page.keyboard.up('w');
const bicycle = await page.evaluate(() => ({
  mode: window.__NIMBU_EXPLORATION__.vehicleMode,
  transport: document.querySelector('#transport-status').textContent,
  pose: document.querySelector('#game').dataset.riderPose,
  position: window.__NIMBU_EXPLORATION__.player.position.toArray(),
}));
const bicycleTravel = Math.hypot(...bicycle.position.map((value, index) => value - bicycleBefore[index]));
await page.screenshot({ path: '/tmp/nimbu-mexico-bicycle.png', fullPage: true });
await page.keyboard.press('e');

await page.evaluate(() => {
  const state = window.__NIMBU_EXPLORATION__;
  const item = state.interactions.find((candidate) => candidate.action === 'practice_greeting');
  state.player.position.copy(item.position);
});
await page.waitForTimeout(150);
await page.keyboard.press('e');
await page.waitForTimeout(150);
const practice = await page.evaluate(() => ({
  open: document.querySelector('#practice-panel').classList.contains('practice-panel--visible'),
  role: document.querySelector('#practice-role').textContent,
  native: document.querySelector('#practice-npc-hindi').textContent,
  romajiVisible: !document.querySelector('#practice-npc-romaji').hidden,
  english: document.querySelector('#practice-npc-english').textContent,
  choices: document.querySelectorAll('.practice-choice').length,
}));
await page.screenshot({ path: '/tmp/nimbu-mexico-practice.png', fullPage: true });
await page.keyboard.press('Digit1');
await page.waitForTimeout(100);
const practiceResult = await page.evaluate(() => ({
  result: document.querySelector('#game').dataset.lastPracticeResult,
  feedback: document.querySelector('#practice-feedback').textContent,
  completed: window.__NIMBU_EXPLORATION__.grandSystems.state.completedLessons.size,
}));
await page.keyboard.press('Enter');
await page.waitForTimeout(100);
await page.keyboard.press('Enter');

const metroBefore = await page.evaluate(() => window.__NIMBU_EXPLORATION__.trainProgress);
await page.waitForFunction((before) => Math.abs(window.__NIMBU_EXPLORATION__.trainProgress - before) > 0.0005, metroBefore, { timeout: 8000 });
const metroAfter = await page.evaluate(() => window.__NIMBU_EXPLORATION__.trainProgress);
await page.evaluate(() => {
  const state = window.__NIMBU_EXPLORATION__;
  state.player.position.copy(state.train.getWorldPosition(state.player.position));
});
await page.waitForTimeout(100);
await page.keyboard.press('e');
await page.waitForTimeout(120);
const metroBoarding = await page.evaluate(() => ({
  mode: window.__NIMBU_EXPLORATION__.vehicleMode,
  transport: document.querySelector('#transport-status').textContent,
  playerVisible: window.__NIMBU_EXPLORATION__.player.visible,
}));

if (selector.choices.join(',') !== 'hindi,japanese,spanish' || !selector.spanish?.includes('Mexico')) errors.push('The three-world selector is incomplete.');
if (!initial.asset.endsWith('nimbu_mexico_world.glb') || initial.worldId !== 'spanish' || !initial.root || initial.rootWorldId !== 'spanish' || initial.country !== 'Mexico') errors.push('The Mexico GLB world contract is incomplete.');
if (initial.mapSize[0] < 595 || initial.mapSize[2] < 295 || initial.walkables < 15 || initial.obstacles < 35) errors.push('Mexico terrain, walkables, or collisions are incomplete.');
if (!initial.lessonRoots || initial.lessonActions.filter(Boolean).join(',') !== 'practice_greeting,practice_food,practice_shop,practice_directions,practice_train,practice_pharmacy' || initial.lessonCount !== 10) errors.push('The ten Spanish missions or six core conversations are incomplete.');
if (!initial.guidePortrait?.endsWith('/assets/guides/lola.png') || initial.ambienceWorld !== 'spanish') errors.push('Lola’s portrait or Mexican ambience did not initialize.');
if (initial.guideName !== 'Lola' || !initial.guideNative.includes('Hola') || initial.guideRomajiVisible || !initial.guideEnglish.includes('Hello') || !initial.guideHeader.includes('Spanish') || initial.tutorialVisible || initial.inputBlocked || initial.firstWalkPending !== 'true') errors.push('Fresh Spanish exploration did not initialize before Lola’s lesson.');
if (!firstWalkTutorial.visible || !firstWalkTutorial.inputBlocked || firstWalkTutorial.pending !== 'false' || firstWalkTutorial.distance < 4) errors.push('Walking a few steps did not open Lola’s first tutorial.');
if (initial.districts.length !== 6 || !initial.districts.includes('Mirador Cobre') || !initial.metro || initial.metroStops !== 5 || initial.bicycles !== 6 || initial.routines < 9) errors.push('Mexico districts, bicycles, metro, or ambient locals are incomplete.');
if (initial.foliage < 200 || initial.landmarks.some(([, present]) => !present)) errors.push('Mexico foliage or signature landmarks are incomplete.');
if (initial.mapTitle !== 'Valle Naranja' || !initial.mapSubtitle.includes('Mexico') || !initial.brandSubtitle.includes('Spanish') || initial.mapRoads !== 7 || initial.mapStations !== 5 || initial.mapWorld !== 'spanish' || initial.mapTransit !== '━ Metro' || initial.bicycleMarkers !== 6 || !mapOpen) errors.push('The Mexico UI or authored map is incomplete.');
if (initial.cameraBehindDot > -0.45 || walkingTravel < 2) errors.push(`Mexico walking/camera failed (${walkingTravel.toFixed(2)}m).`);
if (afterTutorial.phase !== 'practice' || afterTutorial.navigationTarget !== 'Lucía' || !afterTutorial.objective.includes('Lucía')) errors.push('Accepting Lola’s tutorial did not start Lucía navigation.');
if (bicycle.mode !== 'bicycle' || bicycle.transport !== 'Bicycle' || bicycle.pose !== 'seated' || bicycleTravel < 2) errors.push(`Mexico bicycle failed (${bicycle.mode}, ${bicycleTravel.toFixed(2)}m).`);
if (!practice.open || !practice.role.includes('Lucía') || !practice.native.includes('Hola') || practice.romajiVisible || !practice.english || practice.choices !== 3 || practiceResult.result !== 'correct' || practiceResult.completed !== 1) errors.push('Spanish text conversation practice failed.');
if (Math.abs(metroAfter - metroBefore) < 0.0005 || metroBoarding.mode !== 'train' || metroBoarding.transport !== 'Metro Naranja' || metroBoarding.playerVisible) errors.push('Mexico metro movement or boarding failed.');

const result = {
  errors, selector, initial, firstWalkTutorial, afterTutorial, walkingTravel, mapOpen,
  bicycle, bicycleTravel, practice, practiceResult,
  metroTravel: Math.abs(metroAfter - metroBefore), metroBoarding,
  screenshots: {
    selector: '/tmp/nimbu-three-world-selection.png', tutorial: '/tmp/nimbu-mexico-tutorial.png',
    gameplay: '/tmp/nimbu-mexico-gameplay.png', map: '/tmp/nimbu-mexico-map.png',
    bicycle: '/tmp/nimbu-mexico-bicycle.png', practice: '/tmp/nimbu-mexico-practice.png',
  },
};
console.log(JSON.stringify(result, null, 2));
await browser.close();
if (errors.length) throw new Error(`Mexico gameplay test failed:\n${errors.join('\n')}`);
