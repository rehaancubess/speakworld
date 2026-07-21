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
  localStorage.removeItem('nimbu-guide-progress-japanese-v1');
  localStorage.removeItem('sayscape-guide-progress-japanese-v2');
});
await page.reload({ waitUntil: 'networkidle' });
await page.locator('#world-select').waitFor({ state: 'visible' });
const selector = await page.evaluate(() => ({
  heading: document.querySelector('#world-select h1')?.textContent,
  choices: Array.from(document.querySelectorAll('[data-world]')).map((item) => item.dataset.world),
  hindi: document.querySelector('[data-world="hindi"]')?.textContent,
  japanese: document.querySelector('[data-world="japanese"]')?.textContent,
  spanish: document.querySelector('[data-world="spanish"]')?.textContent,
}));
await page.screenshot({ path: '/tmp/nimbu-world-selection.png', fullPage: true });
await page.locator('[data-world="japanese"]').click();
await page.waitForFunction(() => document.querySelector('#loading')?.classList.contains('loading--hidden'), null, { timeout: 120000 });
await page.waitForTimeout(3500);

const initial = await page.evaluate(() => {
  const state = window.__NIMBU_EXPLORATION__;
  const game = document.querySelector('#game');
  const root = state.world.getObjectByName('WORLD_NIMBU_JAPAN');
  const lessonRoots = [
    'INTERACT_LOCAL_FRIEND',
    'INTERACT_FRUIT_VENDOR',
    'INTERACT_CHAI_VENDOR',
    'INTERACT_DIRECTIONS_LOCAL',
    'INTERACT_TICKET_CLERK',
    'INTERACT_PHARMACIST',
  ];
  const cherryCanopies = [];
  const northTrunks = [];
  state.world.traverse((object) => {
    if (/^BATCH_(?:JP_CANOPY|NORTH_SAKURA_\d)/.test(object.name) && object.isMesh) {
      cherryCanopies.push(object.material?.name ?? '');
    }
    if (/^BATCH_NORTH_SAKURA_TRUNK_/.test(object.name) && object.isMesh) northTrunks.push(object);
  });
  const northTreeGroundErrors = northTrunks.map((trunk) => {
    trunk.geometry.computeBoundingBox();
    const worldPosition = trunk.getWorldPosition(state.player.position.clone());
    const worldScale = trunk.getWorldScale(state.player.scale.clone());
    const bottom = worldPosition.y + trunk.geometry.boundingBox.min.y * worldScale.y;
    return Math.abs(bottom - Number(trunk.userData.grounded_at_z));
  });
  const toriiGates = Array.from({ length: 5 }, (_, index) => (
    state.world.getObjectByName(`INARI_TORII_${String(index).padStart(2, '0')}`)
  ));
  const toriiMeshCounts = toriiGates.map((gate) => {
    let meshes = 0;
    gate?.traverse((object) => { if (object.isMesh) meshes += 1; });
    return meshes;
  });
  return {
    asset: state.asset,
    worldId: state.worldId,
    datasetWorldId: game.dataset.worldId,
    root: Boolean(root),
    rootWorldId: root?.userData.world_id,
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
    lessonPhase: state.grandSystems.state.phase,
    guideName: state.grandSystems.config.guideName,
    guideTitle: document.querySelector('#guide-title').textContent,
    guideNative: document.querySelector('#guide-hindi').textContent,
    guideRomaji: document.querySelector('#guide-romaji').textContent,
    guideRomajiVisible: !document.querySelector('#guide-romaji').hidden,
    guideEnglish: document.querySelector('#guide-english').textContent,
    guideHeader: document.querySelector('.guide-card__header small').textContent,
    tutorialVisible: document.querySelector('#guide-card').classList.contains('tutorial-panel--visible'),
    inputBlocked: state.grandSystems.inputBlocked,
    firstWalkPending: game.dataset.firstWalkTutorialPending,
    districts: state.grandSystems.districts.filter((district) => district.object).map((district) => district.name),
    subwayStops: state.train ? Array.from({ length: 5 }, (_, index) => state.world.getObjectByName(`TRAIN_STOP_${String(index).padStart(2, '0')}`)).filter(Boolean).length : 0,
    subway: Boolean(state.train && state.trainCurve && state.train.getObjectByName('TRAIN_PLAYER_SEAT')),
    scooterCount: state.grandSystems.scooters.length,
    bicycleCount: state.grandSystems.bicycles.length,
    autoCount: state.grandSystems.autos.length,
    routines: state.grandSystems.routines.length,
    landmarks: [
      'LANDMARK_INARI_TORII_PATH',
      'BACKGROUND_MOUNT_FUJI',
      'WALKABLE_KAWA_RED_BRIDGE',
      'LANDMARK_YAMA_ONSEN',
    ].map((name) => [name, Boolean(state.world.getObjectByName(name))]),
    mapTitle: document.querySelector('#world-map-title').textContent,
    mapSubtitle: document.querySelector('#world-map-subtitle').textContent,
    brandSubtitle: document.querySelector('#brand-subtitle').textContent,
    worldSelectHidden: document.querySelector('#world-select').hidden,
    cameraBehindDot: Number(game.dataset.cameraBehindDot),
    mapRoadPathCount: Number(game.dataset.mapRoadPathCount),
    mapStationCount: Number(game.dataset.mapStationCount),
    miniMapRoads: document.querySelectorAll('#mini-map-cartography .mini-map__road').length,
    fullMapRoads: document.querySelectorAll('#world-map-cartography .world-map__road').length,
    miniMapStations: document.querySelectorAll('#mini-map-cartography .mini-map__station-dot').length,
    mapWorld: document.querySelector('#world-map-cartography').dataset.world,
    mapTransitLegend: document.querySelector('#world-map-transit-legend').textContent,
    bicycleMapMarkers: document.querySelectorAll('.world-map__vehicle--bicycle').length,
    cherryCanopyCount: cherryCanopies.length,
    nonCherryCanopies: cherryCanopies.filter((name) => !name.includes('Sakura')).length,
    groundedNorthEdge: Boolean(state.world.getObjectByName('WALKABLE_JAPAN_NORTH_EMBANKMENT')),
    northTrunkCount: northTrunks.length,
    northTreeGroundError: Math.max(0, ...northTreeGroundErrors),
    toriiGateCount: toriiGates.filter(Boolean).length,
    toriiSourceCount: toriiGates.filter((gate) => (
      gate?.userData.source_asset === 'japanese_torii_gate_game_asset.glb'
      && gate?.userData.asset_license === 'CC-BY-4.0'
      && gate?.userData.shared_mesh_instance === true
    )).length,
    toriiMeshCounts,
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
await page.screenshot({ path: '/tmp/nimbu-japan-tutorial.png', fullPage: true });
await page.keyboard.press('Enter');
await page.waitForTimeout(180);
const afterTutorial = await page.evaluate(() => ({
  phase: window.__NIMBU_EXPLORATION__.grandSystems.state.phase,
  navigationTarget: document.querySelector('#game').dataset.navigationTarget,
  miniMapWaypoint: document.querySelector('#game').dataset.miniMapWaypoint,
  objective: document.querySelector('#objective').textContent,
  inputBlocked: window.__NIMBU_EXPLORATION__.grandSystems.inputBlocked,
}));

await page.keyboard.press('m');
await page.waitForTimeout(120);
const mapOpen = await page.locator('#world-map').evaluate((element) => element.classList.contains('world-map--open'));
await page.screenshot({ path: '/tmp/nimbu-japan-map.png', fullPage: true });
await page.keyboard.press('m');

const playerBeforeWalk = initial.player;
await page.keyboard.down('w');
await page.waitForTimeout(950);
await page.keyboard.up('w');
const playerAfterWalk = await page.evaluate(() => window.__NIMBU_EXPLORATION__.player.position.toArray());
const walkingTravel = Math.hypot(...playerAfterWalk.map((value, index) => value - playerBeforeWalk[index]));
await page.screenshot({ path: '/tmp/nimbu-japan-gameplay.png', fullPage: true });

await page.evaluate(() => {
  const state = window.__NIMBU_EXPLORATION__;
  state.player.position.set(-76, 3, -154);
  const ground = state.grandSystems.terrainY(state.player.position);
  if (Number.isFinite(ground)) state.player.position.y = ground;
});
await page.waitForTimeout(220);
await page.screenshot({ path: '/tmp/nimbu-japan-north-border.png', fullPage: true });

await page.evaluate(() => {
  const state = window.__NIMBU_EXPLORATION__;
  const bicycle = state.grandSystems.bicycles[0];
  state.player.position.copy(bicycle.getWorldPosition(state.player.position));
});
await page.waitForTimeout(120);
await page.keyboard.press('e');
await page.waitForTimeout(160);
const bicycleBefore = await page.evaluate(() => window.__NIMBU_EXPLORATION__.player.position.toArray());
await page.keyboard.down('w');
const pedalSamples = [];
for (let index = 0; index < 6; index += 1) {
  await page.waitForTimeout(190);
  pedalSamples.push(await page.evaluate(() => (
    window.__NIMBU_EXPLORATION__.player.getObjectByName('Player_leg_-1').rotation.x
  )));
}
const bicycleRide = await page.evaluate(() => {
  const state = window.__NIMBU_EXPLORATION__;
  return {
    mode: state.vehicleMode,
    transport: document.querySelector('#transport-status').textContent,
    pose: document.querySelector('#game').dataset.riderPose,
    speed: Number(document.querySelector('#game').dataset.bicycleSpeed),
    playerVisible: state.player.visible,
    position: state.player.position.toArray(),
    legAngles: [
      state.player.getObjectByName('Player_leg_-1').rotation.x,
      state.player.getObjectByName('Player_leg_1').rotation.x,
    ],
  };
});
await page.keyboard.up('w');
const bicycleTravel = Math.hypot(...bicycleRide.position.map((value, index) => value - bicycleBefore[index]));
const pedalRange = Math.max(...pedalSamples) - Math.min(...pedalSamples);
await page.screenshot({ path: '/tmp/nimbu-japan-bicycle.png', fullPage: true });
await page.keyboard.press('e');
await page.waitForTimeout(100);

await page.evaluate(() => {
  const state = window.__NIMBU_EXPLORATION__;
  const item = state.interactions.find((candidate) => candidate.action === 'practice_greeting');
  state.player.position.copy(item.position);
});
await page.waitForTimeout(180);
await page.keyboard.press('e');
await page.waitForTimeout(160);
const practice = await page.evaluate(() => ({
  open: document.querySelector('#practice-panel').classList.contains('practice-panel--visible'),
  role: document.querySelector('#practice-role').textContent,
  native: document.querySelector('#practice-npc-hindi').textContent,
  romaji: document.querySelector('#practice-npc-romaji').textContent,
  romajiVisible: !document.querySelector('#practice-npc-romaji').hidden,
  english: document.querySelector('#practice-npc-english').textContent,
  choices: Array.from(document.querySelectorAll('.practice-choice')).map((choice) => ({
    native: choice.querySelector('.practice-choice__hindi')?.textContent,
    romaji: choice.querySelector('.practice-choice__romaji')?.textContent,
    english: choice.querySelector('.practice-choice__english')?.textContent,
  })),
}));
await page.screenshot({ path: '/tmp/nimbu-japan-practice.png', fullPage: true });
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

const subwayBefore = await page.evaluate(() => window.__NIMBU_EXPLORATION__.trainProgress);
await page.waitForFunction((before) => (
  Math.abs(window.__NIMBU_EXPLORATION__.trainProgress - before) > 0.0005
), subwayBefore, { timeout: 8000 });
const subwayAfter = await page.evaluate(() => window.__NIMBU_EXPLORATION__.trainProgress);
await page.evaluate(() => {
  const state = window.__NIMBU_EXPLORATION__;
  state.player.position.copy(state.train.getWorldPosition(state.player.position));
});
await page.waitForTimeout(80);
await page.keyboard.press('e');
await page.waitForTimeout(140);
const subwayBoarding = await page.evaluate(() => ({
  mode: window.__NIMBU_EXPLORATION__.vehicleMode,
  transport: document.querySelector('#transport-status').textContent,
  playerVisible: window.__NIMBU_EXPLORATION__.player.visible,
}));
await page.keyboard.press('e');
await page.waitForTimeout(100);

if (selector.choices.join(',') !== 'hindi,japanese,spanish' || !selector.heading?.includes('Which language') || !selector.spanish?.includes('Mexico')) errors.push('The three-language Speakworld selector is incomplete.');
if (!initial.asset.endsWith('nimbu_japan_world.glb') || initial.worldId !== 'japanese' || initial.datasetWorldId !== 'japanese') errors.push('The Japanese selection did not load the Japanese runtime.');
if (!initial.root || initial.rootWorldId !== 'japanese') errors.push('The Japanese GLB root contract is missing.');
if (initial.mapSize[0] < 595 || initial.mapSize[2] < 295) errors.push(`Japan is only ${initial.mapSize[0].toFixed(0)} × ${initial.mapSize[2].toFixed(0)}m.`);
if (initial.walkables < 15 || initial.obstacles < 35) errors.push('Japanese walkable or collision coverage is incomplete.');
if (!initial.lessonRoots || initial.lessonActions.filter(Boolean).join(',') !== 'practice_greeting,practice_shop,practice_food,practice_directions,practice_train,practice_pharmacy') errors.push('The six Japanese survival conversations are incomplete or out of order.');
if (initial.lessonCount !== 10 || initial.lessonPhase !== 'briefing' || initial.guideName !== 'Yuki' || initial.tutorialVisible || initial.inputBlocked || initial.firstWalkPending !== 'true') errors.push('Fresh Japanese exploration did not initialize before Yuki’s lesson.');
if (!firstWalkTutorial.visible || !firstWalkTutorial.inputBlocked || firstWalkTutorial.pending !== 'false' || firstWalkTutorial.distance < 4) errors.push('Walking a few steps did not open Yuki’s first tutorial.');
if (!initial.guidePortrait?.endsWith('/assets/guides/yuki.png') || initial.ambienceWorld !== 'japanese') errors.push('Yuki’s portrait or Japanese ambience did not initialize.');
if (!initial.guideNative.includes('こんにちは') || !initial.guideRomaji.includes('Konnichiwa') || !initial.guideRomajiVisible || !initial.guideEnglish.includes('Hello')) errors.push('The first tutorial is not fully trilingual.');
if (initial.districts.length !== 6 || !initial.districts.includes('Yama Onsen')) errors.push('The six Japanese districts are incomplete.');
if (!initial.subway || initial.subwayStops !== 5 || initial.scooterCount !== 0 || initial.bicycleCount !== 6 || initial.autoCount !== 0) errors.push('Japan should have walking, six bicycles, and a five-stop subway without Hindi vehicles.');
if (initial.routines < 9 || initial.landmarks.some(([, present]) => !present)) errors.push('Japanese ambience or major landmarks are incomplete.');
if (initial.mapTitle !== 'Aozora Japan' || !initial.mapSubtitle.includes('Japan') || !initial.brandSubtitle.includes('Japanese') || !initial.worldSelectHidden) errors.push('World-specific Japanese interface copy did not apply.');
if (initial.mapRoadPathCount !== 7 || initial.mapStationCount !== 5 || initial.miniMapRoads !== 7 || initial.fullMapRoads !== 7 || initial.miniMapStations !== 5 || initial.mapWorld !== 'japanese' || initial.mapTransitLegend !== '━ Subway' || initial.bicycleMapMarkers !== 6 || !mapOpen) errors.push('The Japanese full map or minimap does not match the authored roads, subway, and bicycles.');
if (initial.cherryCanopyCount < 210 || initial.nonCherryCanopies !== 0) errors.push(`Japan still has non-cherry trees (${initial.cherryCanopyCount} checked, ${initial.nonCherryCanopies} non-cherry).`);
if (!initial.groundedNorthEdge || initial.northTrunkCount < 35 || initial.northTreeGroundError > 0.12) errors.push(`Japan's north Sakura boundary is not grounded (${initial.northTrunkCount} trunks, ${initial.northTreeGroundError.toFixed(3)}m error).`);
if (initial.toriiGateCount !== 5 || initial.toriiSourceCount !== 5 || initial.toriiMeshCounts.some((count) => count !== 1)) errors.push('The five attributed, instanced torii gate assets are incomplete.');
if (initial.cameraBehindDot > -0.45 || walkingTravel < 2) errors.push(`Japanese walking/camera failed (${walkingTravel.toFixed(2)}m).`);
if (bicycleRide.mode !== 'bicycle' || bicycleRide.transport !== 'Bicycle' || bicycleRide.pose !== 'seated' || !bicycleRide.playerVisible || bicycleRide.speed < 1 || bicycleTravel < 2 || pedalRange < 0.30) errors.push(`The free bicycle is not visibly rideable (${bicycleRide.mode}, ${bicycleTravel.toFixed(2)}m, pedal range ${pedalRange.toFixed(2)}).`);
if (afterTutorial.phase !== 'practice' || afterTutorial.navigationTarget !== 'Haru' || afterTutorial.miniMapWaypoint !== 'Haru' || !afterTutorial.objective.includes('Haru') || afterTutorial.inputBlocked) errors.push('Accepting Yuki’s tutorial did not start Haru navigation.');
if (!practice.open || !practice.role.includes('Haru') || !practice.native || !practice.romaji || !practice.romajiVisible || !practice.english || practice.choices.length !== 3 || practice.choices.some((choice) => !choice.romaji)) errors.push('The Japanese conversation panel is not fully trilingual.');
if (practiceResult.result !== 'correct' || practiceResult.completed !== 1 || !practiceResult.feedback.includes('Kochira')) errors.push('Japanese greeting completion failed.');
if (Math.abs(subwayAfter - subwayBefore) < 0.0005) errors.push('The Japanese subway did not move.');
if (subwayBoarding.mode !== 'train' || subwayBoarding.transport !== 'Aozora Subway' || subwayBoarding.playerVisible) errors.push('Free Japanese subway boarding failed.');

const result = {
  errors,
  selector,
  initial,
  firstWalkTutorial,
  afterTutorial,
  mapOpen,
  walkingTravel,
  bicycleRide,
  bicycleTravel,
  pedalRange,
  practice,
  practiceResult,
  subwayTravel: Math.abs(subwayAfter - subwayBefore),
  subwayBoarding,
  screenshots: {
    selector: '/tmp/nimbu-world-selection.png',
    tutorial: '/tmp/nimbu-japan-tutorial.png',
    practice: '/tmp/nimbu-japan-practice.png',
    gameplay: '/tmp/nimbu-japan-gameplay.png',
    map: '/tmp/nimbu-japan-map.png',
    bicycle: '/tmp/nimbu-japan-bicycle.png',
    northBorder: '/tmp/nimbu-japan-north-border.png',
  },
};
console.log(JSON.stringify(result, null, 2));
await browser.close();
if (errors.length) throw new Error(`Japanese gameplay test failed:\n${errors.join('\n')}`);
