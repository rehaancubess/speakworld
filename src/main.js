import * as THREE from 'three';
import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js';
import './style.css';
import { COLORS } from './game/palette.js';
import {
  PLANET_RADIUS,
  createWorld,
  getRailStationDirection,
  getRailStopDirection,
  getRegionalDirection,
} from './game/world.js';
import { createNpc, createPlayer, createQuestMarker } from './game/characters.js';
import { createQuestController } from './game/quests.js';
import { createAudioSystem } from './game/audio.js';
import { createTrain } from './game/train.js';
import { createBus } from './game/bus.js';
import { createGameState, formatClock, timePeriod } from './game/state.js';

const canvas = document.querySelector('#game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const outlineEffect = new OutlineEffect(renderer, {
  defaultThickness: 0.0042,
  defaultColor: [0.09, 0.14, 0.15],
  defaultAlpha: 0.82,
  defaultKeepAlive: true,
});

const scene = new THREE.Scene();
scene.background = new THREE.Color(COLORS.sky);
scene.fog = new THREE.FogExp2(COLORS.sky, 0.0062);

const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.08, 240);
camera.position.set(0, 31, 14);

const hemisphere = new THREE.HemisphereLight(0xdffff1, 0x4d6253, 2.3);
scene.add(hemisphere);

const worldFill = new THREE.AmbientLight(0xeaf4df, 0.72);
scene.add(worldFill);

const sun = new THREE.DirectionalLight(0xffe0ad, 3.4);
sun.position.set(-24, 42, 18);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -18;
sun.shadow.camera.right = 18;
sun.shadow.camera.top = 18;
sun.shadow.camera.bottom = -18;
sun.shadow.camera.near = 4;
sun.shadow.camera.far = 90;
sun.shadow.bias = -0.0003;
scene.add(sun);

const farSideSun = new THREE.DirectionalLight(0xbfe4d8, 1.25);
farSideSun.position.set(28, -35, -24);
scene.add(farSideSun);

const moon = new THREE.DirectionalLight(0x9eb8e8, 0);
moon.position.set(18, 30, -32);
scene.add(moon);

const world = createWorld(scene);
const gameState = createGameState();
const player = createPlayer(world.obstacles);
scene.add(player.group);
const train = createTrain(world.railPath);
scene.add(train.group);
const bus = createBus(world.shuttlePath);
scene.add(bus.group);

if (import.meta.env.DEV) window.__NIMBU_DEV__ = { player, world, train, bus };

const npcs = [
  createNpc({
    id: 'asha',
    name: 'Asha',
    x: -3.15,
    z: 6.15,
    yaw: 2.15,
    shirt: COLORS.red,
    trousers: COLORS.paper,
    skin: 0x9e6448,
    hair: COLORS.ink,
    scarf: COLORS.yellow,
  }),
  createNpc({
    id: 'kabir',
    name: 'Kabir',
    x: 10.55,
    z: -0.15,
    yaw: -1.55,
    shirt: COLORS.teal,
    trousers: COLORS.ink,
    skin: 0xa56d4e,
    hair: COLORS.black,
    scarf: COLORS.red,
    scale: 1.03,
  }),
  createNpc({
    id: 'suman',
    name: 'Suman',
    x: -6.0,
    z: -6.05,
    yaw: 0.78,
    shirt: COLORS.yellow,
    trousers: COLORS.indigo,
    skin: 0xa96d4f,
    hair: COLORS.black,
    scarf: COLORS.teal,
    scale: 0.98,
  }),
  createNpc({
    id: 'meera',
    name: 'Meera',
    x: -9.25,
    z: -5.7,
    yaw: 1.25,
    shirt: COLORS.yellow,
    trousers: COLORS.red,
    skin: 0x965f46,
    hair: 0x39323a,
    scarf: COLORS.blue,
    scale: 0.96,
  }),
  createNpc({
    id: 'neha',
    name: 'Neha',
    x: 4.75,
    z: 7.15,
    yaw: -1.4,
    shirt: COLORS.paper,
    trousers: COLORS.blue,
    skin: 0xa96d50,
    hair: COLORS.ink,
    scarf: COLORS.red,
    scale: 0.96,
  }),
  createNpc({
    id: 'raju',
    name: 'Raju',
    x: 1.0,
    z: 4.25,
    yaw: 2.6,
    shirt: COLORS.yellow,
    trousers: COLORS.darkGrass,
    skin: 0xa46749,
    hair: COLORS.black,
    scarf: COLORS.paper,
    scale: 1.01,
  }),
  createNpc({
    id: 'uncle',
    name: 'Ramesh Uncle',
    x: 5.0,
    z: 1.0,
    yaw: -2.2,
    shirt: COLORS.paper,
    trousers: COLORS.brown,
    skin: 0x98634d,
    hair: COLORS.paper,
    scale: 0.92,
  }),
  createNpc({
    id: 'tara',
    name: 'Tara',
    x: 7.2,
    z: -1.8,
    yaw: 0.2,
    shirt: COLORS.blue,
    trousers: COLORS.ink,
    skin: 0xb77858,
    hair: COLORS.ink,
    scale: 0.88,
  }),
  createNpc({
    id: 'rekha',
    name: 'Rekha',
    direction: getRailStationDirection(0.45, 1.75),
    yaw: 2.9,
    shirt: COLORS.red,
    trousers: COLORS.indigo,
    skin: 0x9d6248,
    hair: COLORS.black,
    scarf: COLORS.yellow,
  }),
  createNpc({
    id: 'vikram',
    name: 'Vikram',
    direction: getRegionalDirection('mountain', 6.7, -2.15),
    yaw: 1.1,
    shirt: COLORS.blue,
    trousers: COLORS.brown,
    skin: 0xa46b4f,
    hair: COLORS.ink,
    scarf: COLORS.paper,
    scale: 1.02,
  }),
  createNpc({
    id: 'aman',
    name: 'Aman',
    direction: getRegionalDirection('farms', 0.2, 0),
    yaw: -0.7,
    shirt: COLORS.darkGrass,
    trousers: COLORS.paper,
    skin: 0x9b6348,
    hair: COLORS.black,
    scarf: COLORS.yellow,
    scale: 1.03,
  }),
  createNpc({
    id: 'zoya',
    name: 'Zoya',
    direction: getRegionalDirection('mela', 0, 0),
    yaw: 0.4,
    shirt: COLORS.pink,
    trousers: COLORS.indigo,
    skin: 0xad7457,
    hair: COLORS.ink,
    scarf: COLORS.teal,
    scale: 0.97,
  }),
  createNpc({
    id: 'dev',
    name: 'Dev',
    direction: getRegionalDirection('forest', 0, 0),
    yaw: -2.2,
    shirt: COLORS.saffron,
    trousers: COLORS.darkGrass,
    skin: 0xa56a4d,
    hair: COLORS.black,
    scarf: COLORS.paper,
    scale: 1.04,
  }),
  createNpc({
    id: 'leela',
    name: 'Leela',
    direction: getRailStopDirection('sundar', 0.65, 3.15),
    yaw: 1.5,
    shirt: COLORS.darkGrass,
    trousers: COLORS.paper,
    skin: 0xa86d50,
    hair: COLORS.ink,
    scarf: COLORS.yellow,
    scale: 0.97,
  }),
  createNpc({
    id: 'mohan',
    name: 'Mohan',
    direction: getRailStopDirection('rangila', 0.65, 3.15),
    yaw: -1.1,
    shirt: COLORS.teal,
    trousers: COLORS.indigo,
    skin: 0x9b6248,
    hair: COLORS.black,
    scarf: COLORS.saffron,
    scale: 1.02,
  }),
  createNpc({
    id: 'naina',
    name: 'Naina',
    direction: getRailStopDirection('pahadi', 0.65, 3.15),
    yaw: 2.2,
    shirt: COLORS.red,
    trousers: COLORS.blue,
    skin: 0xab7053,
    hair: COLORS.ink,
    scarf: COLORS.paper,
  }),
];
npcs.forEach((npc) => scene.add(npc.group));

const starPositions = [];
for (let i = 0; i < 520; i += 1) {
  const y = 1 - (2 * (i + 0.5)) / 520;
  const radial = Math.sqrt(Math.max(0, 1 - y * y));
  const angle = i * Math.PI * (3 - Math.sqrt(5));
  const radius = 172 + ((i * 37) % 19);
  starPositions.push(Math.cos(angle) * radial * radius, y * radius, Math.sin(angle) * radial * radius);
}
const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
const starMaterial = new THREE.PointsMaterial({
  color: 0xfff2c8,
  size: 0.72,
  transparent: true,
  opacity: 0,
  depthWrite: false,
});
const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

const lampNpcIds = ['kabir', 'leela', 'rekha', 'mohan', 'naina', 'zoya', 'vikram'];
const lampColors = [0xffc76e, 0xffdc9c, 0xf7bd71, 0xffd36f, 0xffba71, 0xff8a65, 0xffcf83];
const nightLights = lampNpcIds.map((id, index) => {
  const npc = npcs.find((candidate) => candidate.id === id);
  const npcPosition = npc.worldPosition;
  const normal = npcPosition.clone().normalize();
  const light = new THREE.PointLight(lampColors[index], 0, 15, 1.7);
  light.position.copy(normal).multiplyScalar(npcPosition.length() + 4);
  scene.add(light);
  return { light, id };
});

const festivalLightColors = [0xff6f61, 0xffd45c, 0x73ddd1];
const festivalNormal = npcs.find((npc) => npc.id === 'zoya').worldPosition.normalize();
const festivalLights = festivalLightColors.map((color, index) => {
  const light = new THREE.PointLight(color, 0, 19, 1.55);
  const offset = new THREE.Vector3(index - 1, 0, (index % 2 ? 1 : -1) * 1.4);
  offset.addScaledVector(festivalNormal, -offset.dot(festivalNormal));
  light.position.copy(festivalNormal).multiplyScalar(PLANET_RADIUS + 4.8).add(offset.multiplyScalar(2.1));
  scene.add(light);
  return light;
});

const npcSchedules = {
  asha: [[7, 12], [15, 20.5]],
  kabir: [[6, 11.5], [17, 21.5]],
  suman: [[8, 18.5]],
  meera: [[9, 18]],
  neha: [[8, 20]],
  raju: [[7, 22]],
  uncle: [[8, 20.5]],
  tara: [[9, 19]],
  rekha: [[6, 22]],
  vikram: [[8, 20.5]],
  aman: [[7, 19]],
  zoya: [[11, 22.5]],
  dev: [[7, 20]],
  leela: [[0, 24]],
  mohan: [[9.5, 18.5]],
  naina: [[9, 19.5]],
};

const marker = createQuestMarker();
const audio = createAudioSystem();
const keys = new Set();
let started = false;
let dialogueActive = false;
let questCardOpen = false;
let zoneTimer = null;
let currentZone = '';
let trainRider = false;
let busRider = false;
let playerNearTrainStop = null;
let playerNearBusStop = null;
let nearbyTransport = 'train';
let phoneOpen = false;
let currentState = gameState.snapshot;

const ui = {
  loading: document.querySelector('#loading'),
  titleScreen: document.querySelector('#title-screen'),
  startButton: document.querySelector('#start-button'),
  hud: document.querySelector('#hud'),
  timeTint: document.querySelector('#time-tint'),
  dayLabel: document.querySelector('#day-label'),
  clockLabel: document.querySelector('#clock-label'),
  moneyLabel: document.querySelector('#money-label'),
  questButton: document.querySelector('#quest-button'),
  questCard: document.querySelector('#quest-card'),
  questKicker: document.querySelector('#quest-kicker'),
  questTitle: document.querySelector('#quest-title'),
  questCopy: document.querySelector('#quest-copy'),
  questHint: document.querySelector('#quest-hint'),
  phoneButton: document.querySelector('#phone-button'),
  phoneNotification: document.querySelector('#phone-notification'),
  phonePanel: document.querySelector('#phone-panel'),
  phoneClose: document.querySelector('#phone-close'),
  phoneClock: document.querySelector('#phone-clock'),
  phoneMoney: document.querySelector('#phone-money'),
  phoneMessages: document.querySelector('#phone-messages'),
  phoneInventory: document.querySelector('#phone-inventory'),
  phoneContacts: document.querySelector('#phone-contacts'),
  phoneJournal: document.querySelector('#phone-journal'),
  waypoint: document.querySelector('#waypoint'),
  waypointArrow: document.querySelector('#waypoint-arrow'),
  waypointName: document.querySelector('#waypoint-name'),
  waypointDistance: document.querySelector('#waypoint-distance'),
  trainPrompt: document.querySelector('#train-prompt'),
  trainKey: document.querySelector('#train-key'),
  trainAction: document.querySelector('#train-action'),
  trainStatus: document.querySelector('#train-status'),
  prompt: document.querySelector('#interaction-prompt'),
  promptText: document.querySelector('#interaction-prompt p'),
  zone: document.querySelector('#zone-title'),
  zoneName: document.querySelector('#zone-title strong'),
  dialogue: document.querySelector('#dialogue'),
  dialogueName: document.querySelector('#dialogue-name'),
  dialogueText: document.querySelector('#dialogue-text'),
  dialogueChoices: document.querySelector('#dialogue-choices'),
  dialogueNext: document.querySelector('#dialogue-next'),
  toast: document.querySelector('#toast'),
  toastCopy: document.querySelector('#toast-copy'),
  dayTransition: document.querySelector('#day-transition'),
  dayTransitionKicker: document.querySelector('#day-transition-kicker'),
  dayTransitionTitle: document.querySelector('#day-transition-title'),
  dayTransitionRecap: document.querySelector('#day-transition-recap'),
  dayTransitionStats: document.querySelector('#day-transition-stats'),
  nextDayButton: document.querySelector('#next-day-button'),
  player,
  showToast(message) {
    ui.toastCopy.textContent = message;
    ui.toast.classList.add('toast--visible');
    audio.success();
    window.setTimeout(() => ui.toast.classList.remove('toast--visible'), 3600);
  },
  playChoice() {
    audio.click();
    window.setTimeout(() => audio.dialogue(), 90);
  },
};

function relationshipWord(score) {
  if (score >= 5) return 'Friend';
  if (score >= 3) return 'Friendly';
  if (score >= 1) return 'Acquaintance';
  return 'New';
}

function renderGameState(state) {
  currentState = state;
  const story = gameState.dayStory;
  const clockText = formatClock(state.minutes);
  ui.dayLabel.textContent = `Day ${state.day} · ${story.title}`;
  ui.clockLabel.textContent = clockText;
  ui.moneyLabel.textContent = `₹${state.money.toLocaleString('en-IN')}`;
  ui.phoneClock.textContent = `${clockText} · ${timePeriod(state.minutes)}`;
  ui.phoneMoney.textContent = `₹${state.money.toLocaleString('en-IN')}`;

  ui.phoneInventory.replaceChildren();
  (state.inventory.length ? state.inventory : ['Bag is empty']).forEach((item) => {
    const chip = document.createElement('span');
    chip.textContent = item;
    ui.phoneInventory.append(chip);
  });

  ui.phoneMessages.replaceChildren();
  state.messages.slice(0, 5).forEach((message) => {
    const article = document.createElement('article');
    const sender = document.createElement('strong');
    sender.textContent = message.from;
    article.append(sender, document.createTextNode(message.text));
    ui.phoneMessages.append(article);
  });

  ui.phoneContacts.replaceChildren();
  if (!state.contacts.length) {
    const article = document.createElement('article');
    article.textContent = 'No local contacts yet';
    ui.phoneContacts.append(article);
  } else {
    state.contacts.forEach((contact) => {
      const npc = npcs.find((candidate) => candidate.name === contact);
      const score = npc ? (state.relationships[npc.id] ?? 0) : 0;
      const article = document.createElement('article');
      const name = document.createElement('strong');
      const relationship = document.createElement('span');
      name.textContent = contact;
      relationship.textContent = relationshipWord(score);
      article.append(name, relationship);
      ui.phoneContacts.append(article);
    });
  }

  ui.phoneJournal.replaceChildren();
  state.journal.slice(-5).reverse().forEach((entry) => {
    const article = document.createElement('article');
    article.textContent = entry;
    ui.phoneJournal.append(article);
  });

  ui.phoneNotification.textContent = String(Math.min(9, state.messages.length));
  player.setCarryingItem(state.inventory.includes('Suitcase') ? 'suitcase' : null);
  ui.startButton.textContent = state.questIndex > 0 && !state.complete
    ? `Continue Day ${state.day}`
    : state.complete ? 'Return to Nimbu Nagar' : 'Enter Hindi world';
}

function togglePhone(force) {
  phoneOpen = force ?? !phoneOpen;
  ui.phonePanel.classList.toggle('phone-panel--visible', phoneOpen);
  if (phoneOpen) {
    questCardOpen = false;
    ui.questCard.classList.remove('quest-card--visible');
  }
  audio.click();
}

function showDayComplete(story, finalDay) {
  if (!started) return;
  const state = gameState.snapshot;
  const friendlyPeople = Object.values(state.relationships).filter((score) => score >= 3).length;
  ui.dayTransitionKicker.textContent = finalDay ? 'Your first five days are complete' : `Day ${story.day} complete`;
  ui.dayTransitionTitle.textContent = story.title;
  ui.dayTransitionRecap.textContent = story.recap;
  ui.dayTransitionStats.innerHTML = `
    <span>₹${state.money.toLocaleString('en-IN')} remaining</span>
    <span>${state.inventory.length} items</span>
    <span>${state.contacts.length} contacts</span>
    <span>${friendlyPeople} friendships</span>
  `;
  ui.nextDayButton.textContent = finalDay ? 'Keep exploring' : `Sleep · Begin Day ${story.day + 1}`;
  window.setTimeout(() => ui.dayTransition.classList.add('day-transition--visible'), 520);
}

function beginStoryDay(day) {
  ui.dayTransition.classList.remove('day-transition--visible');
  const guesthouse = getRailStopDirection('sundar', -4.2, 2.75);
  player.teleportTo(guesthouse.x, guesthouse.y, guesthouse.z);
  const target = getRailStopDirection('sundar', 2.5, 2.75);
  player.faceToward(target.x, target.y, target.z);
  cameraUp.copy(player.up);
  updateCamera(0, true);
  keys.clear();
  currentZone = '';
  showZone(`Day ${day} · ${gameState.dayStory.title}`);
  updateWaypoint();
}

gameState.subscribe(renderGameState);

const savedPlayerNormal = gameState.snapshot.playerNormal;
if (savedPlayerNormal?.length === 3) {
  player.teleportTo(...savedPlayerNormal);
} else {
  const arrivalStart = getRailStopDirection('nadi', -2.4, 3.4);
  player.teleportTo(arrivalStart.x, arrivalStart.y, arrivalStart.z);
  const arrivalTarget = npcs.find((npc) => npc.id === 'rekha').worldPosition;
  player.faceToward(arrivalTarget.x, arrivalTarget.y, arrivalTarget.z);
}

const quests = createQuestController({
  npcs,
  marker,
  ui,
  gameState,
  onDayComplete: showDayComplete,
  onDayStart: beginStoryDay,
  onDialogueChange(active) {
    dialogueActive = active;
    if (active) {
      audio.dialogue();
      questCardOpen = false;
      ui.questCard.classList.remove('quest-card--visible');
    }
  },
});
quests.init();
if (import.meta.env.DEV) Object.assign(window.__NIMBU_DEV__, { quests, gameState });

function showZone(name) {
  if (!started || name === currentZone) return;
  currentZone = name;
  ui.zoneName.textContent = name;
  ui.zone.classList.add('zone-title--visible');
  window.clearTimeout(zoneTimer);
  zoneTimer = window.setTimeout(() => ui.zone.classList.remove('zone-title--visible'), 2200);
}

function updateZone() {
  showZone(world.getZoneName(player.normal));
}

const trainLookTarget = new THREE.Vector3();

function activeRide() {
  if (busRider) return { type: 'bus', vehicle: bus, name: 'Shikhar Shuttle' };
  if (trainRider) return { type: 'train', vehicle: train, name: 'Nimbu Express' };
  return null;
}

function updateTransportInteraction() {
  if (!started || phoneOpen || quests.pausedForDay) {
    ui.trainPrompt.classList.remove('train-prompt--visible');
    return;
  }

  ui.trainPrompt.classList.remove('train-prompt--waiting');
  const riding = activeRide();
  if (riding) {
    ui.trainKey.textContent = 'F';
    ui.trainAction.textContent = `Leave ${riding.name}`;
    ui.trainStatus.textContent = riding.type === 'bus' ? 'Step off at the next mountain stop' : 'Step off beside the railway';
    ui.trainPrompt.classList.add('train-prompt--visible');
    return;
  }

  const trainClosest = train.closestStop(player.worldPosition);
  const busClosest = bus.closestStop(player.worldPosition);
  const nearTrain = trainClosest.distance < 11.5;
  const nearBus = busClosest.distance < 8.5;
  const trainStopId = nearTrain ? trainClosest.stop.id : null;
  const busStopId = nearBus ? busClosest.stop.id : null;
  if (trainStopId && trainStopId !== playerNearTrainStop) train.requestArrival(trainStopId);
  if (busStopId && busStopId !== playerNearBusStop) bus.requestArrival(busStopId);
  playerNearTrainStop = trainStopId;
  playerNearBusStop = busStopId;

  const options = [];
  if (nearTrain) options.push({ type: 'train', vehicle: train, closest: trainClosest, name: 'Nimbu Express' });
  if (nearBus) options.push({ type: 'bus', vehicle: bus, closest: busClosest, name: 'Shikhar Shuttle' });
  if (!options.length) {
    ui.trainPrompt.classList.remove('train-prompt--visible');
    return;
  }
  options.sort((a, b) => {
    const boardableDifference = Number(b.vehicle.canBoard(player.worldPosition)) - Number(a.vehicle.canBoard(player.worldPosition));
    return boardableDifference || a.closest.distance - b.closest.distance;
  });
  const selected = options[0];
  const { vehicle, closest } = selected;
  nearbyTransport = selected.type;

  if (vehicle.canBoard(player.worldPosition)) {
    ui.trainKey.textContent = 'F';
    ui.trainAction.textContent = `Board ${selected.name}`;
    ui.trainStatus.textContent = `Waiting at ${vehicle.stoppedAt?.name ?? closest.stop.name}`;
    ui.trainPrompt.classList.add('train-prompt--visible');
    return;
  }

  if (vehicle.arrivingAt?.id === closest.stop.id) {
    ui.trainKey.textContent = '…';
    ui.trainAction.textContent = `${selected.type === 'bus' ? 'Bus' : 'Train'} arriving at ${closest.stop.name}`;
    ui.trainStatus.textContent = `${Math.max(1, Math.ceil(vehicle.arrivalSeconds))} seconds · wait at the marked stop`;
    ui.trainPrompt.classList.add('train-prompt--visible', 'train-prompt--waiting');
    return;
  }

  if (vehicle.stoppedAt?.id === closest.stop.id) {
    ui.trainKey.textContent = '↗';
    ui.trainAction.textContent = `Walk closer to the ${selected.type}`;
    ui.trainStatus.textContent = selected.type === 'bus' ? 'Board beside the shelter' : 'Board from the platform';
    ui.trainPrompt.classList.add('train-prompt--visible', 'train-prompt--waiting');
    return;
  }

  ui.trainPrompt.classList.remove('train-prompt--visible');
}

function toggleTransportRide() {
  if (!started || dialogueActive || phoneOpen || quests.pausedForDay) return;
  const riding = activeRide();
  if (riding) {
    const exitNormal = riding.vehicle.exitNormal;
    const trackNormal = riding.vehicle.riderNormal;
    riding.vehicle.leave();
    trainRider = false;
    busRider = false;
    player.group.visible = true;
    player.teleportTo(exitNormal.x, exitNormal.y, exitNormal.z);
    trainLookTarget.copy(trackNormal);
    player.faceToward(trainLookTarget.x, trainLookTarget.y, trainLookTarget.z);
    keys.clear();
    ui.showToast(`You left the ${riding.name} — explore this part of the globe`);
    return;
  }

  const boardable = [
    { type: 'train', vehicle: train, distance: train.closestStop(player.worldPosition).distance },
    { type: 'bus', vehicle: bus, distance: bus.closestStop(player.worldPosition).distance },
  ]
    .filter((option) => option.vehicle.canBoard(player.worldPosition))
    .sort((a, b) => a.distance - b.distance)[0];
  if (boardable) nearbyTransport = boardable.type;
  const vehicle = boardable?.vehicle ?? (nearbyTransport === 'bus' ? bus : train);
  if (!vehicle.canBoard(player.worldPosition) || !vehicle.board()) return;
  trainRider = nearbyTransport === 'train';
  busRider = nearbyTransport === 'bus';
  player.group.visible = false;
  player.cancelMoveTarget();
  keys.clear();
  ui.prompt.classList.remove('interaction-prompt--visible');
  ui.showToast(`${nearbyTransport === 'bus' ? 'Mountain shuttle' : 'All aboard'} — press F whenever you want to step off`);
}

const waypointDirection = new THREE.Vector3();
const waypointRight = new THREE.Vector3();

function updateWaypoint() {
  const targetPosition = quests.targetWorldPosition;
  const visible = started && targetPosition && !quests.complete && !quests.pausedForDay;
  ui.waypoint.classList.toggle('waypoint--visible', Boolean(visible));
  if (!visible) return;

  const up = player.normal;
  const forward = player.forward;
  const targetNormal = targetPosition.normalize();
  const dot = THREE.MathUtils.clamp(up.dot(targetNormal), -1, 1);
  const distance = Math.acos(dot) * PLANET_RADIUS;
  waypointDirection.copy(targetNormal).addScaledVector(up, -dot);
  if (waypointDirection.lengthSq() > 0.0001) waypointDirection.normalize();
  else waypointDirection.copy(forward).multiplyScalar(-1);
  waypointRight.crossVectors(up, forward).normalize();
  const angle = Math.atan2(waypointDirection.dot(waypointRight), waypointDirection.dot(forward));

  ui.waypointArrow.style.transform = `rotate(${angle}rad)`;
  ui.waypointName.textContent = `${quests.targetName} · ${quests.targetLocation}`;
  ui.waypointDistance.textContent = distance < 2.5 ? 'You are here' : `${Math.round(distance)} m along the globe`;
}

function toggleQuestCard(force) {
  questCardOpen = force ?? !questCardOpen;
  ui.questCard.classList.toggle('quest-card--visible', questCardOpen);
  if (questCardOpen) {
    phoneOpen = false;
    ui.phonePanel.classList.remove('phone-panel--visible');
  }
  audio.click();
}

function interact() {
  if (!started || trainRider || busRider || phoneOpen || quests.pausedForDay) return;
  if (quests.interact()) audio.dialogue();
}

ui.startButton.addEventListener('click', () => {
  started = true;
  audio.startAmbience();
  audio.click();
  ui.titleScreen.classList.add('screen--leaving');
  window.setTimeout(() => {
    ui.titleScreen.classList.remove('screen--visible');
    ui.hud.classList.add('hud--visible');
    ui.hud.setAttribute('aria-hidden', 'false');
    showZone(world.getZoneName(player.normal));
    toggleQuestCard(true);
    window.setTimeout(() => toggleQuestCard(false), 4600);
    window.setTimeout(() => quests.showPendingDayComplete(), 1050);
  }, 920);
});

ui.questButton.addEventListener('click', () => toggleQuestCard());
ui.phoneButton.addEventListener('click', () => togglePhone());
ui.phoneClose.addEventListener('click', () => togglePhone(false));
ui.nextDayButton.addEventListener('click', () => {
  audio.click();
  quests.startNextDay();
  ui.dayTransition.classList.remove('day-transition--visible');
});
ui.dialogue.addEventListener('click', interact);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
canvas.addEventListener('pointerup', (event) => {
  if (!started || dialogueActive || trainRider || busRider || phoneOpen || quests.pausedForDay || event.button !== 0) return;
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObject(world.planet, false)[0];
  if (hit?.point) {
    player.setMoveTarget(hit.point);
    audio.click();
  }
});

window.addEventListener('keydown', (event) => {
  keys.add(event.code);
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
    event.preventDefault();
  }
  if (event.code === 'KeyE' && !event.repeat) interact();
  if (event.code === 'KeyF' && !event.repeat) toggleTransportRide();
  if (event.code === 'KeyQ' && !event.repeat && started) toggleQuestCard();
  if (event.code === 'KeyP' && !event.repeat && started) togglePhone();
  if (event.code === 'Escape' && !event.repeat) {
    togglePhone(false);
    if (questCardOpen) toggleQuestCard(false);
  }
  if (/^Digit[1-3]$/.test(event.code) && !event.repeat && dialogueActive) {
    quests.choose(Number(event.code.slice(-1)) - 1);
  }
});

window.addEventListener('keyup', (event) => keys.delete(event.code));
window.addEventListener('blur', () => keys.clear());

const desiredCamera = new THREE.Vector3();
const cameraTarget = new THREE.Vector3();
const cameraUp = new THREE.Vector3(0, 1, 0);
const menuTarget = new THREE.Vector3(0, 0, 0);
const cameraRaycaster = new THREE.Raycaster();
const cameraRayDirection = new THREE.Vector3();
const rideCameraSide = new THREE.Vector3();
const skyColor = new THREE.Color();
const skyStops = [
  { hour: 0, color: new THREE.Color(0x172844) },
  { hour: 5.2, color: new THREE.Color(0x1f3854) },
  { hour: 6.5, color: new THREE.Color(0xe49a72) },
  { hour: 8.1, color: new THREE.Color(COLORS.sky) },
  { hour: 16.5, color: new THREE.Color(0x79c9c8) },
  { hour: 18.4, color: new THREE.Color(0xd77862) },
  { hour: 20.1, color: new THREE.Color(0x22344f) },
  { hour: 24, color: new THREE.Color(0x172844) },
];

function sampleSky(hour) {
  let start = skyStops[0];
  let end = skyStops.at(-1);
  for (let i = 0; i < skyStops.length - 1; i += 1) {
    if (hour >= skyStops[i].hour && hour <= skyStops[i + 1].hour) {
      start = skyStops[i];
      end = skyStops[i + 1];
      break;
    }
  }
  const blend = THREE.MathUtils.smoothstep(hour, start.hour, end.hour);
  return skyColor.copy(start.color).lerp(end.color, blend);
}

function updateTimeOfDay() {
  const hour = currentState.minutes / 60;
  world.setStoryState?.(currentState);
  const sunrise = THREE.MathUtils.smoothstep(hour, 5.4, 7.6);
  const sunset = 1 - THREE.MathUtils.smoothstep(hour, 17.4, 20.1);
  const daylight = sunrise * sunset;
  const nightAmount = 1 - daylight;
  const sky = sampleSky(hour);
  scene.background.copy(sky);
  scene.fog.color.copy(sky);

  const solarAngle = ((hour - 6) / 24) * Math.PI * 2;
  sun.position.set(Math.cos(solarAngle) * 48, Math.sin(solarAngle) * 58, 24);
  moon.position.copy(sun.position).multiplyScalar(-0.82);
  sun.intensity = 0.08 + daylight * 3.32;
  moon.intensity = Math.max(0, nightAmount - 0.18) * 1.35;
  hemisphere.intensity = 0.42 + daylight * 1.88;
  worldFill.intensity = 0.25 + daylight * 0.47;
  farSideSun.intensity = 0.35 + daylight * 0.9;
  starMaterial.opacity = Math.max(0, nightAmount - 0.2) * 0.92;
  stars.rotation.y += 0.000035;

  nightLights.forEach(({ light, id }) => {
    const festivalBoost = id === 'zoya' && currentState.day === 5 ? 1.35 : 1;
    light.intensity = Math.max(0, nightAmount - 0.28) * 20 * festivalBoost;
  });
  const festivalActive = currentState.day === 5 && hour >= 17;
  festivalLights.forEach((light, index) => {
    light.intensity = festivalActive
      ? Math.max(0.25, nightAmount) * (22 + Math.sin(performance.now() * 0.002 + index) * 4)
      : 0;
  });

  ui.timeTint.style.background = `rgba(18, 28, 62, ${Math.max(0, nightAmount - 0.35) * 0.22})`;
  audio.setNightAmount?.(nightAmount);
}

function updateNpcSchedules() {
  const hour = currentState.minutes / 60;
  npcs.forEach((npc) => {
    const scheduled = (npcSchedules[npc.id] ?? [[0, 24]])
      .some(([opens, closes]) => hour >= opens && hour < closes);
    const festivalVolunteer = currentState.day === 5
      && ['asha', 'kabir', 'suman', 'zoya'].includes(npc.id)
      && hour >= 12;
    npc.group.visible = npc.id === quests.targetId || scheduled || festivalVolunteer;
  });
}

function updateMenuCamera(elapsed) {
  const angle = elapsed * 0.075 - 0.65;
  camera.position.set(Math.cos(angle) * 136, 54 + Math.sin(elapsed * 0.16) * 3, Math.sin(angle) * 136);
  camera.up.set(0, 1, 0);
  camera.lookAt(menuTarget);
}

function updateCamera(delta, immediate = false) {
  const position = player.worldPosition;
  const up = player.up;
  const forward = player.forward;
  const riding = trainRider || busRider;
  const cameraHeight = riding ? 5.1 : dialogueActive ? 3.35 : 3.12;
  const cameraDistance = riding ? 10.8 : dialogueActive ? 5.85 : 6.65;
  const lookAhead = riding ? 3.7 : dialogueActive ? 2.05 : 2.2 + Math.min(player.speed * 0.15, 0.6);

  desiredCamera.copy(position)
    .addScaledVector(up, cameraHeight)
    .addScaledVector(forward, -cameraDistance);
  if (riding) {
    rideCameraSide.crossVectors(up, forward).normalize();
    desiredCamera.addScaledVector(rideCameraSide, 5.4);
  } else if (dialogueActive) {
    rideCameraSide.crossVectors(up, forward).normalize();
    desiredCamera.addScaledVector(rideCameraSide, 2.15);
  }
  cameraTarget.copy(position)
    .addScaledVector(up, riding ? 1.9 : 1.35)
    .addScaledVector(forward, lookAhead);

  if (!riding) {
    cameraRayDirection.copy(desiredCamera).sub(cameraTarget);
    const desiredDistance = cameraRayDirection.length();
    cameraRayDirection.normalize();
    cameraRaycaster.set(cameraTarget, cameraRayDirection);
    cameraRaycaster.near = 0.18;
    cameraRaycaster.far = desiredDistance;
    const obstruction = cameraRaycaster.intersectObjects(world.cameraBlockers, true)[0];
    if (obstruction) {
      const safeDistance = Math.max(0.78, obstruction.distance - 0.38);
      desiredCamera.copy(cameraTarget).addScaledVector(cameraRayDirection, safeDistance);
    }
  }

  if (immediate) camera.position.copy(desiredCamera);
  else camera.position.lerp(desiredCamera, 1 - Math.exp(-delta * 3.35));
  cameraUp.lerp(up, 1 - Math.exp(-delta * 4.25)).normalize();
  camera.up.copy(cameraUp);
  camera.lookAt(cameraTarget);
}

if (import.meta.env.DEV) {
  window.__NIMBU_DEV__.snapCamera = () => {
    cameraUp.copy(player.up);
    updateCamera(0, true);
  };
}

updateMenuCamera(0);

const clock = new THREE.Clock();
let frame = 0;

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;

  train.update(delta);
  bus.update(delta);
  const riding = activeRide();
  gameState.update(delta, started && !dialogueActive && !riding && !phoneOpen);
  if (riding) {
    const riderNormal = riding.vehicle.riderNormal;
    player.teleportTo(riderNormal.x, riderNormal.y, riderNormal.z);
    trainLookTarget.copy(riderNormal).add(riding.vehicle.riderForward);
    player.faceToward(trainLookTarget.x, trainLookTarget.y, trainLookTarget.z);
  }
  player.update(delta, started && !dialogueActive && !riding && !phoneOpen && !quests.pausedForDay, keys, camera);
  npcs.forEach((npc) => npc.update(elapsed));
  marker.update(elapsed);
  world.update(elapsed, delta);
  if (started) {
    updateTimeOfDay();
    updateCamera(delta);
  }
  else updateMenuCamera(elapsed);

  if (started && frame % 6 === 0) {
    if (riding) ui.prompt.classList.remove('interaction-prompt--visible');
    else quests.update();
    updateZone();
    updateWaypoint();
    updateTransportInteraction();
  }
  if (started && frame % 30 === 0) updateNpcSchedules();
  if (started && frame % 120 === 0) gameState.setPlayerNormal(player.normal);
  frame += 1;

  outlineEffect.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  outlineEffect.setSize?.(window.innerWidth, window.innerHeight);
});

window.setTimeout(() => ui.loading.classList.add('loading--hidden'), 700);
