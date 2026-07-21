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

await page.goto(process.env.BASE_URL ?? 'http://127.0.0.1:5173/', { waitUntil: 'networkidle', timeout: 120000 });
await page.evaluate(() => {
  localStorage.removeItem('nimbu-grand-progress-v1');
  localStorage.removeItem('nimbu-guide-progress-v1');
  localStorage.removeItem('sayscape-guide-progress-hindi-v2');
});
await page.reload({ waitUntil: 'networkidle', timeout: 120000 });
await page.locator('#world-select').waitFor({ state: 'visible' });
await page.locator('[data-world="hindi"]').click();
await page.waitForFunction(() => document.querySelector('#loading')?.classList.contains('loading--hidden'), null, { timeout: 120000 });
// Let the authored world finish shader compilation before timing movement.
await page.waitForTimeout(3800);

const initial = await page.evaluate(() => {
  const state = window.__NIMBU_EXPLORATION__;
  const roots = [
    'INTERACT_LOCAL_FRIEND',
    'INTERACT_CHAI_VENDOR',
    'INTERACT_FRUIT_VENDOR',
    'INTERACT_PHARMACIST',
    'INTERACT_DIRECTIONS_LOCAL',
    'INTERACT_TICKET_CLERK',
  ];
  const roadsideClearances = [];
  state.world.traverse((object) => {
    if (object.userData.roadside_prop) roadsideClearances.push(Number(object.userData.road_edge_clearance_m));
  });
  const autoGeometrySets = state.grandSystems.autos.map(({ object }) => {
    const geometries = [];
    object.traverse((child) => { if (child.isMesh) geometries.push(child.geometry.uuid); });
    return geometries.sort();
  });
  return {
    asset: state.asset,
    player: state.player.position.toArray(),
    camera: state.camera.position.toArray(),
    yaw: state.playerYaw,
    grounded: state.grounded,
    cameraBehindDot: Number(document.querySelector('#game').dataset.cameraBehindDot),
    obstacleCount: state.obstacles.length,
    walkableCount: state.groundMeshes.length,
    interactionCount: state.interactions.length,
    batchedMeshCount: Number(document.querySelector('#game').dataset.batchedMeshCount),
    mapSize: [
      state.mapBounds.max.x - state.mapBounds.min.x,
      state.mapBounds.max.y - state.mapBounds.min.y,
      state.mapBounds.max.z - state.mapBounds.min.z,
    ],
    worldRoot: Boolean(state.world.getObjectByName('WORLD_NIMBU_GRAND')),
    requiredLessonRoots: roots.every((name) => Boolean(state.world.getObjectByName(name))),
    noPhysicalAsha: !state.world.getObjectByName('INTERACT_TOUR_GUIDE')
      && !state.world.getObjectByName('Asha_VISUAL'),
    lessonActions: state.grandSystems.lessons.map((lesson) => lesson.action),
    lessonCount: Number(document.querySelector('#game').dataset.lessonCount),
    guidePortrait: document.querySelector('#guide-avatar')?.getAttribute('src'),
    ambienceWorld: document.querySelector('#game').dataset.ambienceWorld,
    lessonIndex: state.grandSystems.state.lessonIndex,
    lessonPhase: state.grandSystems.state.phase,
    guideReady: document.querySelector('#game').dataset.guideReady,
    tutorialOpen: document.querySelector('#game').dataset.tutorialOpen,
    tutorialVisible: document.querySelector('#guide-card').classList.contains('tutorial-panel--visible'),
    tutorialAriaHidden: document.querySelector('#guide-card').getAttribute('aria-hidden'),
    inputBlocked: state.grandSystems.inputBlocked,
    firstWalkPending: document.querySelector('#game').dataset.firstWalkTutorialPending,
    firstWalkDistance: Number(document.querySelector('#game').dataset.firstWalkDistance),
    guideTitle: document.querySelector('#guide-title').textContent,
    guidePhrase: document.querySelector('#guide-hindi').textContent,
    objective: document.querySelector('#objective').textContent,
    navigationTarget: document.querySelector('#game').dataset.navigationTarget,
    navigationDistance: Number(document.querySelector('#game').dataset.navigationDistance),
    navigationArrow: Number(document.querySelector('#game').dataset.navigationArrowRadians),
    navigatorVisible: !document.querySelector('#objective-navigator').classList.contains('objective-navigator--complete'),
    miniMapVisible: Boolean(document.querySelector('#mini-map')?.offsetParent),
    miniMapWaypoint: document.querySelector('#game').dataset.miniMapWaypoint ?? '',
    miniMapWaypointVisible: document.querySelector('#mini-map-waypoint').classList.contains('mini-map__waypoint--visible'),
    mapRoadPathCount: Number(document.querySelector('#game').dataset.mapRoadPathCount),
    mapStationCount: Number(document.querySelector('#game').dataset.mapStationCount),
    miniMapRoads: document.querySelectorAll('#mini-map-cartography .mini-map__road').length,
    fullMapRoads: document.querySelectorAll('#world-map-cartography .world-map__road').length,
    miniMapStations: document.querySelectorAll('#mini-map-cartography .mini-map__station-dot').length,
    mapWorld: document.querySelector('#world-map-cartography').dataset.world,
    mapTransitLegend: document.querySelector('#world-map-transit-legend').textContent,
    dynamicAutoObstacleCount: Number(document.querySelector('#game').dataset.dynamicAutoObstacleCount),
    autoLengthWidthRatio: Number(document.querySelector('#game').dataset.autoLengthWidthRatio),
    targetMarkerExists: Boolean(document.querySelector('#target-marker')),
    noLegacyStoryUi: !document.querySelector('#clock-weather')
      && !document.querySelector('#mission-card')
      && !document.querySelector('#radio')
      && !document.querySelector('#money-status')
      && !document.querySelector('#postcard-status'),
    train: Boolean(state.train && state.trainCurve && state.train.getObjectByName('TRAIN_PLAYER_SEAT')),
    scooterCount: state.grandSystems.scooters.length,
    districts: state.grandSystems.districts.filter((district) => district.object).length,
    routines: state.grandSystems.routines.length,
    autos: state.grandSystems.autos.length,
    detailedAutos: state.grandSystems.autos.every(({ object }) => (
      object.userData.source_asset === 'indian_auto_rickshaw.glb'
      && object.userData.shared_mesh_instance === true
    )),
    completeAutoVisuals: autoGeometrySets.length === 3
      && autoGeometrySets[0].length >= 3
      && autoGeometrySets.every((set) => set.length === autoGeometrySets[0].length),
    roadsidePropCount: roadsideClearances.length,
    minimumRoadsideClearance: Math.min(...roadsideClearances),
    northShelfRailClearance: Number(state.world.getObjectByName('SCENERY_NORTH_FOREST_SHELF')?.userData.rail_edge_clearance_m),
    terrainSingleMesh: Boolean(state.world.getObjectByName('WALKABLE_GRAND_TERRAIN')?.isMesh),
    terrainFacets: Boolean(state.world.getObjectByName('SCENERY_TERRAIN_FACETS_LIGHT'))
      && Boolean(state.world.getObjectByName('SCENERY_TERRAIN_FACETS_DARK')),
    roadDetails: Boolean(state.world.getObjectByName('ROAD_SURFACE_DETAILS')),
    meadowDetails: Boolean(state.world.getObjectByName('SCENERY_MEADOW_DETAILS')),
    naturalBoundaries: [
      'BACKGROUND_HIMALAYAN_RANGE',
      'BACKGROUND_WEST_DEODAR_WALL',
      'BACKGROUND_EAST_SANDSTONE_CLIFFS',
      'BACKGROUND_SOUTH_TERRACED_ORCHARDS',
    ].every((name) => Boolean(state.world.getObjectByName(name))),
    readableStationBoards: Array.from({ length: 5 }, (_, index) => (
      state.world.getObjectByName(`Station_sign_hindi_${index}`)
      && state.world.getObjectByName(`Station_sign_english_${index}`)
    )).filter(Boolean).length,
    readableBuildingLabels: (() => {
      let count = 0;
      state.world.traverse((object) => { if (/_name_text$/.test(object.name)) count += 1; });
      return count;
    })(),
    upgradedNpcVisuals: [
      'NPC_LOCAL_FRIEND_VISUAL',
      'NPC_CHAI_VENDOR_VISUAL',
      'NPC_FRUIT_VENDOR_VISUAL',
      'NPC_PHARMACIST_VISUAL',
      'NPC_DIRECTIONS_LOCAL_VISUAL',
      'NPC_TICKET_CLERK_VISUAL',
    ].every((name) => Boolean(state.world.getObjectByName(name))),
    articulated: ['Player_leg_-1', 'Player_leg_1', 'Player_arm_-1', 'Player_arm_1']
      .every((name) => Boolean(state.player.getObjectByName(name))),
  };
});

await page.keyboard.down('w');
await page.waitForFunction(() => document.querySelector('#guide-card')?.classList.contains('tutorial-panel--visible'), null, { timeout: 15000 });
await page.keyboard.up('w');
const firstWalkTutorial = await page.evaluate(() => ({
  visible: document.querySelector('#guide-card').classList.contains('tutorial-panel--visible'),
  ariaHidden: document.querySelector('#guide-card').getAttribute('aria-hidden'),
  inputBlocked: window.__NIMBU_EXPLORATION__.grandSystems.inputBlocked,
  pending: document.querySelector('#game').dataset.firstWalkTutorialPending,
  distance: Number(document.querySelector('#game').dataset.firstWalkDistance),
  listenLabel: document.querySelector('#guide-listen').textContent,
}));
await page.screenshot({ path: '/tmp/nimbu-tutorial-popup.png', fullPage: true });
await page.keyboard.press('Enter');
await page.waitForTimeout(180);
const afterTutorial = await page.evaluate(() => ({
  phase: window.__NIMBU_EXPLORATION__.grandSystems.state.phase,
  tutorialVisible: document.querySelector('#guide-card').classList.contains('tutorial-panel--visible'),
  objective: document.querySelector('#objective').textContent,
  navigationTarget: document.querySelector('#game').dataset.navigationTarget,
  navigatorVisible: !document.querySelector('#objective-navigator').classList.contains('objective-navigator--complete'),
  miniMapWaypoint: document.querySelector('#game').dataset.miniMapWaypoint,
  miniMapWaypointVisible: document.querySelector('#mini-map-waypoint').classList.contains('mini-map__waypoint--visible'),
  miniMapRouteVisible: document.querySelector('#mini-map-route').classList.contains('mini-map__route--visible'),
  miniMapDistance: Number(document.querySelector('#game').dataset.miniMapDistance),
  inputBlocked: window.__NIMBU_EXPLORATION__.grandSystems.inputBlocked,
}));

const legSamples = [];
await page.keyboard.down('w');
for (let index = 0; index < 7; index += 1) {
  await page.waitForTimeout(190);
  legSamples.push(await page.evaluate(() => window.__NIMBU_EXPLORATION__.player.getObjectByName('Player_leg_-1').rotation.x));
}
await page.keyboard.up('w');
const playerAfterWalk = await page.evaluate(() => window.__NIMBU_EXPLORATION__.player.position.toArray());
const playerTravel = Math.hypot(...playerAfterWalk.map((value, index) => value - initial.player[index]));
const legSwingRange = Math.max(...legSamples) - Math.min(...legSamples);

await page.keyboard.down('a');
await page.waitForTimeout(1300);
await page.keyboard.up('a');
await page.waitForTimeout(250);
const turnState = await page.evaluate(() => ({
  yaw: window.__NIMBU_EXPLORATION__.playerYaw,
  cameraBehindDot: Number(document.querySelector('#game').dataset.cameraBehindDot),
}));

const headingBeforePointer = await page.evaluate(() => window.__NIMBU_EXPLORATION__.heading.toArray());
await page.mouse.move(700, 450);
await page.mouse.down();
await page.mouse.move(1200, 450, { steps: 6 });
await page.mouse.up();
const headingAfterPointer = await page.evaluate(() => window.__NIMBU_EXPLORATION__.heading.toArray());
const pointerHeadingTravel = Math.hypot(...headingAfterPointer.map((value, index) => value - headingBeforePointer[index]));

await page.keyboard.press('m');
await page.waitForTimeout(150);
const mapOpen = await page.locator('#world-map').evaluate((element) => element.classList.contains('world-map--open'));
const mapRouteVisible = await page.locator('#mission-route').evaluate((element) => element.classList.contains('world-map__mission-route--visible'));
await page.screenshot({ path: '/tmp/nimbu-hindi-map.png', fullPage: true });
await page.keyboard.press('m');

async function teleportToInteraction(action) {
  await page.evaluate((targetAction) => {
    const state = window.__NIMBU_EXPLORATION__;
    const item = state.interactions.find((candidate) => candidate.action === targetAction);
    if (!item) throw new Error(`Missing interaction ${targetAction}`);
    if (item.dynamic) item.position.copy(item.object.getWorldPosition(item.position));
    state.player.position.copy(item.position);
  }, action);
  await page.waitForTimeout(70);
}

await teleportToInteraction('practice_greeting');
await page.waitForTimeout(250);
const greetingMarker = await page.evaluate(() => ({
  target: document.querySelector('#game').dataset.navigationTarget,
  visible: document.querySelector('#game').dataset.targetMarkerVisible,
  label: document.querySelector('#target-marker-label').textContent,
  arrow: Number(document.querySelector('#game').dataset.navigationArrowRadians),
  distance: Number(document.querySelector('#game').dataset.navigationDistance),
}));
await page.screenshot({ path: '/tmp/nimbu-ravi-marker.png', fullPage: true });
await page.keyboard.press('e');
await page.waitForTimeout(180);
const greetingModal = await page.evaluate(() => ({
  visible: document.querySelector('#practice-panel').classList.contains('practice-panel--visible'),
  ariaHidden: document.querySelector('#practice-panel').getAttribute('aria-hidden'),
  role: document.querySelector('#practice-role').textContent,
  npcHindi: document.querySelector('#practice-npc-hindi').textContent,
  choices: document.querySelectorAll('.practice-choice').length,
  practiceLesson: document.querySelector('#game').dataset.practiceLesson,
  inputBlocked: window.__NIMBU_EXPLORATION__.grandSystems.inputBlocked,
}));
await page.screenshot({ path: '/tmp/nimbu-hindi-practice.png', fullPage: true });

await page.locator('#practice-mode-text').click();
await page.keyboard.press('Digit2');
await page.waitForTimeout(90);
const wrongAnswer = await page.evaluate(() => ({
  feedback: document.querySelector('#practice-feedback').textContent,
  retry: document.querySelector('#practice-feedback').classList.contains('practice-feedback--retry'),
  phase: window.__NIMBU_EXPLORATION__.grandSystems.state.phase,
  completed: window.__NIMBU_EXPLORATION__.grandSystems.state.completedLessons.size,
}));

await page.keyboard.press('Digit1');
await page.waitForTimeout(120);
const correctGreeting = await page.evaluate(() => ({
  feedback: document.querySelector('#practice-feedback').textContent,
  success: document.querySelector('#practice-feedback').classList.contains('practice-feedback--success'),
  continueVisible: !document.querySelector('#practice-continue').hidden,
  phase: window.__NIMBU_EXPLORATION__.grandSystems.state.phase,
  completed: window.__NIMBU_EXPLORATION__.grandSystems.state.completedLessons.size,
  result: document.querySelector('#game').dataset.lastPracticeResult,
  source: document.querySelector('#game').dataset.lastPracticeSource,
  objective: document.querySelector('#objective').textContent,
}));
await page.keyboard.press('Enter');
await page.waitForTimeout(120);
const secondLesson = await page.evaluate(() => ({
  lessonIndex: window.__NIMBU_EXPLORATION__.grandSystems.state.lessonIndex,
  phase: window.__NIMBU_EXPLORATION__.grandSystems.state.phase,
  tutorialVisible: document.querySelector('#guide-card').classList.contains('tutorial-panel--visible'),
  title: document.querySelector('#guide-title').textContent,
  hindi: document.querySelector('#guide-hindi').textContent,
  objective: document.querySelector('#objective').textContent,
}));

await page.keyboard.press('Enter');
await page.waitForTimeout(100);

await teleportToInteraction('practice_food');
await page.keyboard.press('e');
await page.waitForTimeout(100);
const voiceAdapter = await page.evaluate(() => {
  const state = window.__NIMBU_EXPLORATION__;
  const phrase = state.grandSystems.currentLesson.phraseHi;
  const accepted = state.grandSystems.submitPracticeResponse(phrase, 'voice-adapter-test');
  return {
    accepted,
    source: document.querySelector('#game').dataset.lastPracticeSource,
    result: document.querySelector('#game').dataset.lastPracticeResult,
    phase: state.grandSystems.state.phase,
    completed: state.grandSystems.state.completedLessons.size,
  };
});
await page.evaluate(() => window.__NIMBU_EXPLORATION__.grandSystems.closePractice());
// Closing a completed conversation opens the following tutorial. Dismiss it
// before testing free-roam transport controls.
await page.evaluate(() => window.__NIMBU_EXPLORATION__.grandSystems.beginLesson());

const trainBefore = await page.evaluate(() => window.__NIMBU_EXPLORATION__.trainProgress);
await page.waitForTimeout(900);
const trainAfter = await page.evaluate(() => ({
  progress: window.__NIMBU_EXPLORATION__.trainProgress,
  dwell: Number(document.querySelector('#game').dataset.trainDwell),
}));

await page.evaluate(() => {
  const state = window.__NIMBU_EXPLORATION__;
  state.player.position.copy(state.train.getWorldPosition(state.player.position));
});
await page.waitForTimeout(40);
await page.keyboard.press('e');
await page.waitForTimeout(250);
const trainMode = await page.evaluate(() => window.__NIMBU_EXPLORATION__.vehicleMode);
await page.keyboard.press('e');

await page.evaluate(() => {
  const state = window.__NIMBU_EXPLORATION__;
  const freeScooter = state.grandSystems.scooters[0];
  state.player.position.copy(freeScooter.getWorldPosition(state.player.position));
});
await page.waitForTimeout(80);
await page.keyboard.press('e');
await page.waitForTimeout(100);
const scooterMode = await page.evaluate(() => window.__NIMBU_EXPLORATION__.vehicleMode);
const scooterRider = await page.evaluate(() => {
  const state = window.__NIMBU_EXPLORATION__;
  return {
    playerVisible: state.player.visible,
    pose: document.querySelector('#game').dataset.riderPose,
    visualY: state.playerVisual.position.y,
    legAngles: [
      state.player.getObjectByName('Player_leg_-1').rotation.x,
      state.player.getObjectByName('Player_leg_1').rotation.x,
    ],
    armAngles: [
      state.player.getObjectByName('Player_arm_-1').rotation.x,
      state.player.getObjectByName('Player_arm_1').rotation.x,
    ],
  };
});
const scooterBefore = await page.evaluate(() => window.__NIMBU_EXPLORATION__.player.position.toArray());
await page.keyboard.down('w');
await page.waitForTimeout(850);
await page.keyboard.up('w');
const scooterAfter = await page.evaluate(() => window.__NIMBU_EXPLORATION__.player.position.toArray());
const scooterTravel = Math.hypot(...scooterAfter.map((value, index) => value - scooterBefore[index]));
await page.screenshot({ path: '/tmp/nimbu-scooter-rider.png', fullPage: true });
await page.keyboard.press('e');

const autoBefore = await page.evaluate(() => window.__NIMBU_EXPLORATION__.grandSystems.autos[0].object.position.toArray());
await page.evaluate(() => {
  const state = window.__NIMBU_EXPLORATION__;
  const auto = state.grandSystems.autos[0].object;
  state.player.position.copy(auto.position).addScaledVector(state.heading, -9);
});
await page.waitForTimeout(900);
const autoAfter = await page.evaluate(() => window.__NIMBU_EXPLORATION__.grandSystems.autos[0].object.position.toArray());
const autoTravel = Math.hypot(...autoAfter.map((value, index) => value - autoBefore[index]));
await page.screenshot({ path: '/tmp/nimbu-auto-rickshaw.png', fullPage: true });

const autoCollisionSetup = await page.evaluate((spawn) => {
  const state = window.__NIMBU_EXPLORATION__;
  state.player.position.fromArray(spawn);
  state.heading.set(1, 0, 0);
  const auto = state.grandSystems.autos[0];
  window.__NIMBU_TEST_ROAD_CURVE__ = state.grandSystems.roadCurve;
  state.grandSystems.roadCurve = null;
  auto.speed = 0;
  auto.object.position.copy(state.player.position).addScaledVector(state.heading, 3.2);
  auto.object.rotation.set(0, 0, 0);
  auto.object.visible = true;
  auto.object.updateWorldMatrix(true, true);
  return {
    player: state.player.position.toArray(),
    auto: auto.object.position.toArray(),
    centerCollides: state.collides(auto.object.position.clone()),
  };
}, initial.player);
await page.keyboard.down('w');
await page.waitForTimeout(1400);
await page.keyboard.up('w');
const autoCollisionResult = await page.evaluate(() => {
  const state = window.__NIMBU_EXPLORATION__;
  const auto = state.grandSystems.autos[0];
  const result = {
    player: state.player.position.toArray(),
    auto: auto.object.position.toArray(),
    remainingForwardGap: auto.object.position.x - state.player.position.x,
    playerInsideAuto: state.collides(state.player.position),
  };
  state.grandSystems.roadCurve = window.__NIMBU_TEST_ROAD_CURVE__;
  auto.speed = 8.5;
  delete window.__NIMBU_TEST_ROAD_CURVE__;
  return result;
});

await page.evaluate((spawn) => {
  const state = window.__NIMBU_EXPLORATION__;
  state.player.position.fromArray(spawn);
}, initial.player);
await page.waitForTimeout(1200);
await page.screenshot({ path: '/tmp/nimbu-guide-gameplay.png', fullPage: true });
await page.waitForTimeout(3200);
const performance = await page.evaluate(() => ({
  fps: Number(document.querySelector('#game').dataset.measuredFps),
  drawCalls: Number(document.querySelector('#game').dataset.drawCalls),
  tier: document.querySelector('#game').dataset.performanceTier,
}));

if (!initial.asset.endsWith('nimbu_grand_world.glb')) errors.push(`Wrong map loaded: ${initial.asset}`);
if (!initial.worldRoot || initial.districts !== 6) errors.push('The six-region grand world contract is incomplete.');
if (initial.mapSize[0] < 595 || initial.mapSize[2] < 295) errors.push(`The world is only ${initial.mapSize[0].toFixed(0)} × ${initial.mapSize[2].toFixed(0)}m.`);
if (!initial.requiredLessonRoots || initial.lessonActions.filter(Boolean).length !== 6 || initial.lessonCount !== 10) errors.push('The ten Hindi missions or six practical conversation targets are incomplete.');
if (initial.guideReady !== 'true' || initial.tutorialOpen === 'true' || initial.tutorialVisible || initial.tutorialAriaHidden !== 'true' || initial.inputBlocked || initial.firstWalkPending !== 'true') errors.push('Fresh exploration did not begin before Asha’s tutorial.');
if (!firstWalkTutorial.visible || firstWalkTutorial.ariaHidden !== 'false' || !firstWalkTutorial.inputBlocked || firstWalkTutorial.pending !== 'false' || firstWalkTutorial.distance < 4) errors.push('Walking a few steps did not open Asha’s first tutorial.');
if (!initial.noPhysicalAsha) errors.push('A physical Asha NPC survived the tutorial-popup pivot.');
if (initial.lessonCount !== 10 || initial.lessonIndex !== 0 || initial.lessonPhase !== 'briefing') errors.push('Fresh ten-mission guide progression is incorrect.');
if (!initial.guidePortrait?.endsWith('/assets/guides/asha.png') || initial.ambienceWorld !== 'hindi') errors.push('Asha’s portrait or Hindi ambience did not initialize.');
if (!initial.guideTitle.includes('Greet') || !initial.guidePhrase || !initial.objective.includes('Asha')) errors.push('The initial guide tutorial is incomplete.');
if (initial.navigatorVisible || initial.navigationTarget !== '' || !initial.targetMarkerExists) errors.push('Navigation should wait until the player accepts Asha’s tutorial.');
if (!initial.miniMapVisible || initial.miniMapWaypoint || initial.miniMapWaypointVisible) errors.push('The local minimap should be visible but hold its waypoint until Asha’s tutorial is accepted.');
if (initial.mapRoadPathCount !== 7 || initial.mapStationCount !== 5 || initial.miniMapRoads !== 7 || initial.fullMapRoads !== 7 || initial.miniMapStations !== 5 || initial.mapWorld !== 'hindi' || initial.mapTransitLegend !== '━ Railway') errors.push('The Hindi full map or minimap does not match the authored roads and railway.');
if (afterTutorial.phase !== 'practice' || afterTutorial.tutorialVisible || !afterTutorial.objective.includes('Ravi') || afterTutorial.navigationTarget !== 'Ravi' || !afterTutorial.navigatorVisible || afterTutorial.inputBlocked) errors.push('Accepting Asha’s tutorial did not begin Ravi practice cleanly.');
if (afterTutorial.miniMapWaypoint !== 'Ravi' || !afterTutorial.miniMapWaypointVisible || !afterTutorial.miniMapRouteVisible || !Number.isFinite(afterTutorial.miniMapDistance)) errors.push('The local minimap did not activate Ravi’s lesson waypoint.');
if (!initial.noLegacyStoryUi) errors.push('A legacy day, guesthouse, weather, money, postcard, or radio UI survived the pivot.');
if (!initial.train || initial.scooterCount !== 6) errors.push('The train or six free-scooter contract is missing.');
if (!initial.detailedAutos || !initial.completeAutoVisuals) errors.push('The downloaded auto-rickshaw asset is incomplete on one or more moving traffic roots.');
if (initial.dynamicAutoObstacleCount !== 3) errors.push(`Expected three moving auto collision volumes, found ${initial.dynamicAutoObstacleCount}.`);
if (!Number.isFinite(initial.autoLengthWidthRatio) || initial.autoLengthWidthRatio < 0.9 || initial.autoLengthWidthRatio > 1.8) errors.push(`The auto-rickshaw is still stretched (length/width ${initial.autoLengthWidthRatio || 0}).`);
if (!initial.articulated) errors.push('The walking character articulation is incomplete.');
if (initial.walkableCount < 15 || initial.obstacleCount < 42) errors.push('Walkable or collision world contracts are incomplete.');
if (initial.interactionCount < 49 || initial.routines < 15 || initial.autos !== 3) errors.push('World activity and interaction density are incomplete.');
if (initial.roadsidePropCount < 50 || initial.minimumRoadsideClearance < 1.59) errors.push('A sign or prop intrudes into a protected road corridor.');
if (initial.northShelfRailClearance < 6) errors.push(`The Devgarh lawn is only ${initial.northShelfRailClearance.toFixed(2)}m from the rail corridor.`);
if (!initial.terrainSingleMesh || !initial.terrainFacets || !initial.roadDetails || !initial.meadowDetails || !initial.naturalBoundaries) errors.push('The richer grass, roads, or four-sided natural boundary contract is incomplete.');
if (initial.readableStationBoards !== 5 || initial.readableBuildingLabels < 40) errors.push('Station boards or storefront labels are still empty.');
if (!initial.upgradedNpcVisuals) errors.push('One or more lesson NPCs still uses the placeholder cylinder model.');
if (initial.batchedMeshCount < 2) errors.push('Static world batching is missing.');
if (!initial.grounded || playerTravel < 2.5) errors.push(`Walking failed (${playerTravel.toFixed(2)}m).`);
if (legSwingRange < 0.24) errors.push('The walk cycle did not visibly animate the legs.');
if (Math.abs(turnState.yaw - initial.yaw) < 0.35) errors.push('A did not turn responsively.');
if (initial.cameraBehindDot > -0.45 || turnState.cameraBehindDot > -0.45) errors.push('The camera did not stay behind the character.');
if (pointerHeadingTravel > 0.001) errors.push('Pointer drag changed the locked character heading.');
if (!mapOpen || !mapRouteVisible) errors.push('The illustrated map or lesson route did not open with M.');
if (greetingMarker.target !== 'Ravi' || greetingMarker.label !== 'RAVI' || !Number.isFinite(greetingMarker.arrow)) errors.push('The current lesson NPC was not marked as Ravi.');
if (!greetingModal.visible || greetingModal.ariaHidden !== 'false' || greetingModal.choices !== 3 || greetingModal.practiceLesson !== 'greeting' || !greetingModal.inputBlocked) errors.push('The greeting text-practice modal did not open correctly.');
if (!wrongAnswer.retry || wrongAnswer.phase !== 'practice' || wrongAnswer.completed !== 0) errors.push('Wrong practice answers do not provide a safe retry.');
if (!correctGreeting.success || !correctGreeting.continueVisible || correctGreeting.phase !== 'return' || correctGreeting.completed !== 1 || correctGreeting.result !== 'correct') errors.push('Correct greeting practice did not complete the lesson.');
if (secondLesson.lessonIndex !== 1 || secondLesson.phase !== 'briefing' || !secondLesson.tutorialVisible || !secondLesson.title.includes('Order food')) errors.push('Completing Ravi practice did not open Asha’s next tutorial.');
if (!voiceAdapter.accepted || voiceAdapter.source !== 'voice-adapter-test' || voiceAdapter.result !== 'correct' || voiceAdapter.completed !== 2) errors.push('The future Realtime transcript adapter seam failed.');
if (Math.abs(trainAfter.progress - trainBefore) < 0.001 && trainAfter.dwell <= 0) errors.push('The train neither moved nor performed a station dwell.');
if (trainMode !== 'train') errors.push('Free train boarding failed.');
if (scooterMode !== 'scooter' || scooterTravel < 1.5) errors.push(`Scooter driving failed (${scooterMode}, ${scooterTravel.toFixed(2)}m).`);
if (autoTravel < 1.5) errors.push(`The imported auto-rickshaw did not move along its route (${autoTravel.toFixed(2)}m).`);
if (!autoCollisionSetup.centerCollides || autoCollisionResult.playerInsideAuto || autoCollisionResult.remainingForwardGap < 0.8) errors.push(`Walking penetrated the moving auto collision volume (gap ${autoCollisionResult.remainingForwardGap.toFixed(2)}m).`);
if (!scooterRider.playerVisible || scooterRider.pose !== 'seated' || scooterRider.visualY < 0.45 || scooterRider.legAngles.some((angle) => angle < 0.9) || scooterRider.armAngles.some((angle) => angle < 0.8)) errors.push('The player is not visibly seated and posed on the scooter.');
const performanceFloor = Number(process.env.NIMBU_HEADLESS_FPS_FLOOR
  ?? (performance.tier === 'adaptive' ? 8 : 25));
if (!Number.isFinite(performance.fps) || performance.fps < performanceFloor) errors.push(`${performance.tier} performance was only ${performance.fps || 0} fps.`);

const result = {
  errors,
  initial,
  firstWalkTutorial,
  playerTravel,
  legSwingRange,
  turnRadians: Math.abs(turnState.yaw - initial.yaw),
  pointerHeadingTravel,
  afterTutorial,
  mapOpen,
  mapRouteVisible,
  greetingMarker,
  greetingModal,
  wrongAnswer,
  correctGreeting,
  secondLesson,
  voiceAdapter,
  trainMode,
  scooterMode,
  scooterRider,
  scooterTravel,
  autoTravel,
  autoCollisionSetup,
  autoCollisionResult,
  performance,
  screenshot: '/tmp/nimbu-guide-gameplay.png',
  tutorialScreenshot: '/tmp/nimbu-tutorial-popup.png',
  practiceScreenshot: '/tmp/nimbu-hindi-practice.png',
  markerScreenshot: '/tmp/nimbu-ravi-marker.png',
  scooterScreenshot: '/tmp/nimbu-scooter-rider.png',
  autoScreenshot: '/tmp/nimbu-auto-rickshaw.png',
  mapScreenshot: '/tmp/nimbu-hindi-map.png',
};
console.log(JSON.stringify(result, null, 2));
await browser.close();
if (errors.length) throw new Error(`Guide-led Hindi gameplay test failed:\n${errors.join('\n')}`);
