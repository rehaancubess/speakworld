import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { collidesWithObstacle } from './movement-physics.js';
import { batchGrandWorldStatics } from './grand-world-systems.js';
import { GuideWorldSystems } from './guide-world-systems.js';
import { CountryAmbience } from './country-ambience.js';
import './slice-preview.css';

const WORLD_OPTIONS = {
  hindi: {
    id: 'hindi',
    asset: '/assets/nimbu_grand_world.glb',
    rootName: 'WORLD_NIMBU_GRAND',
    loadingName: 'Nimbu Pradesh',
    brandMark: 'न',
    brandSubtitle: 'Walk into Hindi',
    guideName: 'Asha',
    guideMark: 'आ',
    guidePortrait: '/assets/guides/asha.png',
    language: 'Hindi',
    mapSubtitle: 'Discover India through Hindi',
    mapTitle: 'Nimbu Pradesh',
    transitKind: 'train',
    transitVehicle: 'Pahadi Express',
  },
  japanese: {
    id: 'japanese',
    asset: '/assets/nimbu_japan_world.glb',
    rootName: 'WORLD_NIMBU_JAPAN',
    loadingName: 'Aozora Japan',
    brandMark: 'あ',
    brandSubtitle: 'Walk into Japanese',
    guideName: 'Yuki',
    guideMark: 'ゆ',
    guidePortrait: '/assets/guides/yuki.png',
    language: 'Japanese',
    mapSubtitle: 'Discover Japan through Japanese',
    mapTitle: 'Aozora Japan',
    transitKind: 'subway',
    transitVehicle: 'Aozora Subway',
  },
  spanish: {
    id: 'spanish',
    asset: '/assets/nimbu_mexico_world.glb',
    rootName: 'WORLD_NIMBU_MEXICO',
    loadingName: 'Valle Naranja',
    brandMark: 'ñ',
    brandSubtitle: 'Walk into Spanish',
    guideName: 'Lola',
    guideMark: 'ñ',
    guidePortrait: '/assets/guides/lola.png',
    language: 'Spanish',
    mapSubtitle: 'Discover Mexico through Spanish',
    mapTitle: 'Valle Naranja',
    transitKind: 'metro',
    transitVehicle: 'Metro Naranja',
  },
};
const PLAYER_NAME = 'PLAYER_RIG_DIORAMA';
const WALK_SPEED = 5.2;
const RUN_SPEED = 8.8;
const TURN_SPEED = 2.05;
const PLAYER_RADIUS = 0.43;
const PLAYER_HEIGHT = 2.75;
const STEP_HEIGHT = 0.72;
const JUMP_SPEED = 5.6;
const GRAVITY = 15.5;
const CAMERA_DISTANCE = 10.6;
const CAMERA_HEIGHT = 7.2;
const CAMERA_FOCUS_HEIGHT = 1.65;
const SCOOTER_MAX_SPEED = 18.5;
const SCOOTER_REVERSE_SPEED = 5.5;
const SCOOTER_ACCELERATION = 15.0;
const BICYCLE_MAX_SPEED = 11.5;
const BICYCLE_REVERSE_SPEED = 2.8;
const BICYCLE_ACCELERATION = 8.5;
const UP = new THREE.Vector3(0, 1, 0);
const DOWN = new THREE.Vector3(0, -1, 0);

const canvas = document.querySelector('#game');
const worldSelect = document.querySelector('#world-select');
const loading = document.querySelector('#loading');
const loadingMark = loading.querySelector('.loading__mark');
const loadingCopy = loading.querySelector('p');
const brandMark = document.querySelector('#brand-mark');
const brandSubtitle = document.querySelector('#brand-subtitle');
const worldMapSubtitle = document.querySelector('#world-map-subtitle');
const worldMapTitle = document.querySelector('#world-map-title');
const locationChip = document.querySelector('#location-chip');
const objective = document.querySelector('#objective');
const interaction = document.querySelector('#interaction');
const interactionText = document.querySelector('#interaction-text');
const dialogue = document.querySelector('#dialogue');
const dialogueHindi = document.querySelector('#dialogue-hindi');
const dialogueRomaji = document.querySelector('#dialogue-romaji');
const dialogueEnglish = document.querySelector('#dialogue-english');
const soundToggle = document.querySelector('#sound-toggle');
const soundToggleLabel = soundToggle.querySelector('strong');
const countryAmbience = new CountryAmbience({ volume: 0.18 });
window.__SAYSCAPE_AUDIO__ = countryAmbience;
const audioDuckReasons = new Set();

function updateAudioDucking(reason, active) {
  if (active) audioDuckReasons.add(reason);
  else audioDuckReasons.delete(reason);
  countryAmbience.setDucked(audioDuckReasons.size > 0);
  canvas.dataset.audioDucked = String(audioDuckReasons.size > 0);
}

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
});
let pixelRatio = Math.min(window.devicePixelRatio, 1.45);
renderer.setPixelRatio(pixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.13;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const daySky = new THREE.Color(0x67c5ce);
scene.background = daySky.clone();
scene.fog = new THREE.Fog(0x67c5ce, 88, 255);

const camera = new THREE.PerspectiveCamera(47, window.innerWidth / window.innerHeight, 0.08, 360);
camera.position.set(-40, 11, 21);

const hemisphere = new THREE.HemisphereLight(0xe6fff2, 0x465329, 2.45);
scene.add(hemisphere);
const ambient = new THREE.AmbientLight(0xffead1, 0.38);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xffc77e, 3.55);
sun.castShadow = true;
sun.shadow.mapSize.set(1536, 1536);
sun.shadow.camera.left = -28;
sun.shadow.camera.right = 28;
sun.shadow.camera.top = 28;
sun.shadow.camera.bottom = -28;
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 82;
sun.shadow.bias = -0.00028;
scene.add(sun, sun.target);

const keys = new Set();
const clock = new THREE.Clock();
const groundRaycaster = new THREE.Raycaster();
const cameraRaycaster = new THREE.Raycaster();
const rayOrigin = new THREE.Vector3();
const candidate = new THREE.Vector3();
const desiredVelocity = new THREE.Vector3();
const velocity = new THREE.Vector3();
const heading = new THREE.Vector3(1, 0, 0);
const right = new THREE.Vector3(0, 0, 1);
const back = new THREE.Vector3(-1, 0, 0);
const orientationMatrix = new THREE.Matrix4();
const cameraFocus = new THREE.Vector3();
const cameraLookAt = new THREE.Vector3();
const desiredCamera = new THREE.Vector3();
const cameraDirection = new THREE.Vector3();
const lastSafePosition = new THREE.Vector3();
const trainPosition = new THREE.Vector3();
const trainTangent = new THREE.Vector3();
const trainBack = new THREE.Vector3();
const trainMatrix = new THREE.Matrix4();
const mapBounds = new THREE.Box3();
const interactionWorldPosition = new THREE.Vector3();

let world = null;
let currentWorld = null;
let player = null;
let playerVisual = null;
let playerVisualBaseY = 0;
let scooterRiderLift = 0.58;
let playerYaw = 0;
let verticalVelocity = 0;
let grounded = false;
let jumpRequested = false;
let groundMeshes = [];
let groundDetailMeshes = [];
let obstacles = [];
let dynamicAutoObstacles = [];
let cameraCollisionMeshes = [];
let interactions = [];
let currentInteraction = null;
let physicsProps = [];
let animatedLimbs = [];
let animatedBodies = [];
let windObjects = [];
let walkTime = 0;
let lastFootstepBeat = -1;
let lastBicycleSoundBeat = -1;
let lastSafeGround = 0;
let recoveredCount = 0;
let currentZone = '';
let dialogueTimer = null;
let bellPivot = null;
let bellTime = 0;
let train = null;
let trainCurve = null;
let trainProgress = 0;
let trainRouteLength = 0;
let trainStops = [];
let trainDwellTime = 0;
let trainStopCooldown = 0;
let trainDoors = [];
let performanceTime = 0;
let performanceFrames = 0;
let adaptiveQuality = false;
let grandSystems = null;
let scooter = null;
let scooterSpeed = 0;
let cycleTime = 0;
let vehicleMode = 'walk';
let trainSeat = null;
let trainExitPoint = null;
let scooterExitPoint = null;

function topLevelNamedRoots(root, pattern) {
  const roots = [];
  root.traverse((object) => {
    if (!pattern.test(object.name)) return;
    let ancestor = object.parent;
    while (ancestor && ancestor !== root) {
      if (pattern.test(ancestor.name)) return;
      ancestor = ancestor.parent;
    }
    roots.push(object);
  });
  return roots;
}

function obstacleFromObject(object) {
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return null;
  const meshes = [];
  object.traverse((child) => {
    if (child.isMesh) meshes.push(child);
  });
  return { name: object.name, object, box, meshes };
}

function dynamicObstacleFromObject(object) {
  object.updateWorldMatrix(true, true);
  const inverseRoot = object.matrixWorld.clone().invert();
  const localBox = new THREE.Box3();
  const relativeMatrix = new THREE.Matrix4();
  object.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;
    if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
    if (!child.geometry.boundingBox) return;
    relativeMatrix.multiplyMatrices(inverseRoot, child.matrixWorld);
    localBox.union(child.geometry.boundingBox.clone().applyMatrix4(relativeMatrix));
  });
  if (localBox.isEmpty()) return null;
  return {
    name: object.name,
    object,
    localBox,
    box: localBox.clone().applyMatrix4(object.matrixWorld),
    meshes: [],
  };
}

function refreshDynamicAutoObstacles() {
  for (const obstacle of dynamicAutoObstacles) {
    obstacle.object.updateWorldMatrix(true, true);
    obstacle.box.copy(obstacle.localBox).applyMatrix4(obstacle.object.matrixWorld);
  }
}

function prepareMesh(mesh) {
  const isTerrain = mesh.name.startsWith('WALKABLE_') && /TERRAIN/.test(mesh.name);
  const isWalkable = mesh.name.startsWith('WALKABLE_');
  const isTiny = /(?:Sleeper_|window_|cross|cup_|flag|patch|hair_)/i.test(mesh.name);
  const isWater = /water|stream/i.test(mesh.name);
  const isHeroShadow = /(?:Player_|Train_car_body|Train_car_roof|Scooter_|_body$|_roof$)/i.test(mesh.name);
  mesh.castShadow = isHeroShadow && !isTerrain && !isTiny && !isWater;
  mesh.receiveShadow = !isWater;
  mesh.frustumCulled = true;
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const material of materials) {
    if (!material) continue;
    material.roughness = isWater ? 0.25 : 0.86;
    material.metalness = isWater ? 0.04 : Math.min(material.metalness ?? 0, 0.1);
    material.flatShading = !isWalkable;
    material.needsUpdate = true;
  }
}

function surfaceHit(position) {
  if (!groundDetailMeshes.length) return null;
  rayOrigin.set(position.x, position.y + 30, position.z);
  groundRaycaster.set(rayOrigin, DOWN);
  groundRaycaster.far = 70;
  return groundRaycaster.intersectObjects(groundDetailMeshes, false)[0] ?? null;
}

function analyticalTerrainY(position) {
  return 0.07;
}

function terrainY(position) {
  const hit = surfaceHit(position);
  const terrain = analyticalTerrainY(position);
  if (!hit || hit.point.y < terrain - 0.24) return terrain;
  return Math.max(terrain, hit.point.y + 0.07);
}

function insideMap(position) {
  return position.x > mapBounds.min.x + 1.4
    && position.x < mapBounds.max.x - 1.4
    && position.z > mapBounds.min.z + 1.4
    && position.z < mapBounds.max.z - 1.4;
}

function collides(position, ignoredObject = null) {
  refreshDynamicAutoObstacles();
  const collisionCandidates = [...obstacles, ...dynamicAutoObstacles]
    .filter(({ object }) => object !== ignoredObject);
  return collidesWithObstacle(position, collisionCandidates, {
    radius: PLAYER_RADIUS,
    height: PLAYER_HEIGHT,
    feetOffset: 0.05,
  });
}

function tryMovementAxis(axis, amount) {
  if (!amount) return true;
  candidate.copy(player.position);
  candidate[axis] += amount;
  const nextGround = terrainY(candidate);
  if (!Number.isFinite(nextGround) || !insideMap(candidate)) return false;
  if (grounded && Math.abs(nextGround - player.position.y) > STEP_HEIGHT) return false;
  if (collides(candidate)) return false;
  player.position[axis] = candidate[axis];
  if (grounded) player.position.y = nextGround;
  return true;
}

function groundPlayer() {
  const height = terrainY(player.position);
  if (!Number.isFinite(height)) return false;
  if (player.position.y <= height + 0.14 && verticalVelocity <= 0) {
    const landingSpeed = Math.abs(verticalVelocity);
    const wasGrounded = grounded;
    player.position.y = height;
    verticalVelocity = 0;
    grounded = true;
    if (!wasGrounded && landingSpeed > 1.2) countryAmbience.playCue('land');
    lastSafePosition.copy(player.position);
    lastSafeGround = height;
    return true;
  }
  return false;
}

function recoverPlayer() {
  player.position.copy(lastSafePosition);
  player.position.y = lastSafeGround;
  verticalVelocity = 0;
  grounded = true;
  velocity.set(0, 0, 0);
  recoveredCount += 1;
  canvas.dataset.recoveredCount = String(recoveredCount);
}

function orientPlayer() {
  right.crossVectors(heading, UP).normalize();
  back.copy(heading).negate();
  orientationMatrix.makeBasis(right, UP, back);
  player.quaternion.setFromRotationMatrix(orientationMatrix);
}

function setupCharacterAnimation() {
  playerVisual = player.getObjectByName('PLAYER_VISUAL') ?? player;
  playerVisualBaseY = playerVisual.position.y;
  animatedLimbs = [
    ['Player_leg_-1', 1],
    ['Player_leg_1', -1],
    ['Player_arm_-1', -1],
    ['Player_arm_1', 1],
  ].flatMap(([name, direction]) => {
    const limb = player.getObjectByName(name);
    return limb ? [{ limb, direction, base: limb.rotation.x }] : [];
  });
  animatedBodies = [];
  player.traverse((object) => {
    if (/^Player_(?:torso|head|hair_|backpack)/.test(object.name)) {
      animatedBodies.push({ object, baseY: object.position.y });
    }
  });
}

function setScooterRiderPose(active) {
  if (!playerVisual) return;
  playerVisual.position.y = playerVisualBaseY + (active ? scooterRiderLift : 0);
  playerVisual.rotation.x = active ? 0.08 : 0;
  playerVisual.rotation.z = 0;
  for (const item of animatedLimbs) {
    const seatedAngle = item.limb.name.includes('leg') ? 1.20 : 1.02;
    item.limb.rotation.x = active ? seatedAngle : item.base;
  }
  canvas.dataset.riderPose = active ? 'seated' : 'walking';
  canvas.dataset.riderVisible = String(player.visible);
}

function setupTrain(root) {
  train = root.getObjectByName('TOY_TRAIN');
  const route = root.getObjectByName('TRAIN_ROUTE_WAYPOINTS');
  if (!train || !route) return false;
  const points = route.children
    .filter((point) => /^TRAIN_ROUTE_\d+$/.test(point.name))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((point) => point.getWorldPosition(new THREE.Vector3()));
  if (points.length < 3) return false;
  trainCurve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.24);
  trainCurve.arcLengthDivisions = 160;
  trainRouteLength = trainCurve.getLength();
  trainStops = topLevelNamedRoots(root, /^TRAIN_STOP_/).map((object) => ({
    object,
    position: object.getWorldPosition(new THREE.Vector3()),
    name: object.userData.stop_name ?? 'Station',
  }));
  trainDoors = [];
  train.traverse((object) => {
    if (!object.name.startsWith('TRAIN_DOOR_')) return;
    trainDoors.push({ object, closedPosition: object.position.clone() });
  });
  scene.attach(train);
  trainProgress = 0.06;
  canvas.dataset.trainRouteLength = trainRouteLength.toFixed(2);
  return true;
}

function setupInteractions(root) {
  interactions = topLevelNamedRoots(root, /^INTERACT_/).map((object) => ({
    object,
    position: object.getWorldPosition(new THREE.Vector3()),
    prompt: object.userData.prompt ?? 'Interact',
    action: object.userData.action ?? 'inspect',
    hindi: object.userData.dialogue_hi ?? '',
    romaji: object.userData.dialogue_romaji ?? '',
    english: object.userData.dialogue_en ?? '',
  }));
  bellPivot = root.getObjectByName('TEMPLE_BELL_PIVOT');
  canvas.dataset.interactionCount = String(interactions.length);
}

function setupPhysicsProps(root) {
  const propRoots = topLevelNamedRoots(root, /^PHYSICS_/);
  physicsProps = propRoots.map((object) => {
    const position = object.getWorldPosition(new THREE.Vector3());
    scene.attach(object);
    object.position.copy(position);
    return {
      root: object,
      radius: Number(object.userData.physics_radius ?? 0.5),
      velocity: new THREE.Vector3(),
      previous: position.clone(),
    };
  });
  canvas.dataset.physicsPropCount = String(physicsProps.length);
}

function setupWind(root) {
  windObjects = [];
  root.traverse((object) => {
    if (!object.name.startsWith('ANIM_WIND_')) return;
    windObjects.push({
      object,
      phase: Number(object.userData.wind_phase ?? Math.random() * 6),
      baseX: object.rotation.x,
      baseY: object.rotation.y,
      baseZ: object.rotation.z,
    });
  });
}

function initializeCamera() {
  cameraFocus.copy(player.position).add(new THREE.Vector3(0, CAMERA_FOCUS_HEIGHT, 0));
  right.crossVectors(heading, UP).normalize();
  desiredCamera.copy(cameraFocus)
    .addScaledVector(heading, -CAMERA_DISTANCE)
    .addScaledVector(UP, CAMERA_HEIGHT)
    .addScaledVector(right, 1.1);
  camera.position.copy(desiredCamera);
  cameraLookAt.copy(cameraFocus).addScaledVector(heading, 2.0);
  camera.lookAt(cameraLookAt);
}

function showDialogue(item) {
  if (!dialogue) return;
  dialogueHindi.textContent = item.hindi;
  dialogueRomaji.textContent = item.romaji ?? '';
  dialogueRomaji.hidden = !item.romaji;
  dialogueEnglish.textContent = item.english;
  dialogue.classList.add('dialogue--visible');
  if (dialogueTimer) clearTimeout(dialogueTimer);
  dialogueTimer = setTimeout(() => dialogue.classList.remove('dialogue--visible'), 4800);
}

function performInteraction() {
  if (vehicleMode === 'walk') updateInteractionPrompt();
  if (!currentInteraction) return false;
  const result = grandSystems?.interact(currentInteraction) ?? { handled: false };
  if (!grandSystems) showDialogue(currentInteraction);
  if (result.command === 'enter_scooter') return enterScooter(result.vehicle);
  if (result.command === 'enter_bicycle') return enterScooter(result.vehicle);
  if (result.command === 'board_train') return boardTrain();
  if (currentInteraction.action === 'ring_bell') {
    bellTime = 2.2;
    countryAmbience.playCue('temple_bell');
  } else if (result.handled || !grandSystems) {
    countryAmbience.playCue('interact');
  }
  canvas.dataset.lastInteraction = currentInteraction.action;
  return result.handled || !grandSystems;
}

function updateInteractionPrompt() {
  if (grandSystems?.inputBlocked) {
    currentInteraction = null;
    interaction.classList.remove('interaction--visible');
    return;
  }
  if (vehicleMode === 'scooter' || vehicleMode === 'bicycle') {
    currentInteraction = null;
    interactionText.textContent = vehicleMode === 'bicycle' ? 'Park bicycle' : 'Park scooter';
    interaction.classList.add('interaction--visible');
    return;
  }
  if (vehicleMode === 'train') {
    currentInteraction = null;
    interactionText.textContent = `Disembark ${currentWorld?.transitKind ?? 'train'}`;
    interaction.classList.add('interaction--visible');
    return;
  }
  currentInteraction = null;
  let nearest = Infinity;
  for (const item of interactions) {
    if (!item.object?.visible) continue;
    if (item.dynamic) {
      item.object.getWorldPosition(interactionWorldPosition);
      item.position.copy(interactionWorldPosition);
    }
    const distance = Math.hypot(player.position.x - item.position.x, player.position.z - item.position.z);
    const interactionRange = item.action === 'board_train'
      ? 14
      : (item.action === 'enter_scooter' || item.action === 'enter_bicycle') ? 5.2 : 4.2;
    if (distance < interactionRange && distance < nearest) {
      nearest = distance;
      currentInteraction = item;
    }
  }
  if (currentInteraction) {
    interactionText.textContent = currentInteraction.prompt;
    interaction.classList.add('interaction--visible');
  } else {
    interaction.classList.remove('interaction--visible');
  }
}

function updateZone() {
  if (!grandSystems) return;
  currentZone = grandSystems.updateZone(player.position);
}

function enterScooter(selectedScooter = scooter) {
  if (!selectedScooter || vehicleMode !== 'walk') return false;
  scooter = selectedScooter;
  const kind = scooter.userData.vehicle_type === 'bicycle' || scooter.name.startsWith('BICYCLE')
    ? 'bicycle'
    : 'scooter';
  scooterExitPoint = scooter.getObjectByName(kind === 'bicycle' ? 'BICYCLE_EXIT_POINT' : 'SCOOTER_EXIT_POINT');
  const position = scooter.getWorldPosition(new THREE.Vector3());
  if (Math.hypot(player.position.x - position.x, player.position.z - position.z) > 4.5) return false;
  const parkedHeading = new THREE.Vector3(1, 0, 0)
    .applyQuaternion(scooter.getWorldQuaternion(new THREE.Quaternion()))
    .setY(0)
    .normalize();
  const forwardProbe = position.clone().addScaledVector(parkedHeading, 3.2);
  const reverseProbe = position.clone().addScaledVector(parkedHeading, -3.2);
  forwardProbe.y = terrainY(forwardProbe);
  reverseProbe.y = terrainY(reverseProbe);
  if (collides(forwardProbe) && !collides(reverseProbe)) parkedHeading.negate();
  if (parkedHeading.lengthSq() > 0.5) {
    heading.copy(parkedHeading);
    playerYaw = Math.atan2(heading.x, -heading.z);
  }
  const seat = scooter.getObjectByName(kind === 'bicycle' ? 'BICYCLE_DRIVER_SEAT' : 'SCOOTER_DRIVER_SEAT');
  const seatPosition = seat?.getWorldPosition(new THREE.Vector3());
  scene.attach(scooter);
  const floor = terrainY(position);
  player.position.set(position.x, floor, position.z);
  if (seatPosition && Number.isFinite(floor)) scooterRiderLift = THREE.MathUtils.clamp(seatPosition.y - floor - 1.02, 0.48, 0.72);
  player.visible = true;
  orientPlayer();
  setScooterRiderPose(true);
  scooterSpeed = 0;
  cycleTime = 0;
  vehicleMode = kind;
  grandSystems?.setTransport(kind === 'bicycle' ? 'Bicycle' : 'Scooter');
  grandSystems?.recordWorldEvent('vehicle_boarded', { vehicleType: kind });
  countryAmbience.playCue(kind === 'bicycle' ? 'bicycle_mount' : 'vehicle_start');
  grandSystems?.notify(`${kind === 'bicycle' ? 'Bicycle' : 'Scooter'} ready · W/S move · A/D steer · E park`);
  canvas.dataset.vehicleMode = vehicleMode;
  return true;
}

function exitScooter() {
  if (!scooter || (vehicleMode !== 'scooter' && vehicleMode !== 'bicycle')) return false;
  const side = new THREE.Vector3().crossVectors(heading, UP).normalize();
  candidate.copy(player.position).addScaledVector(side, -1.8);
  const floor = terrainY(candidate);
  if (Number.isFinite(floor) && !collides(candidate)) player.position.set(candidate.x, floor, candidate.z);
  player.visible = true;
  setScooterRiderPose(false);
  scooterSpeed = 0;
  vehicleMode = 'walk';
  countryAmbience.updateMotion(null);
  countryAmbience.playCue('vehicle_stop');
  grandSystems?.setTransport('On foot');
  canvas.dataset.vehicleMode = vehicleMode;
  return true;
}

function boardTrain() {
  if (!train || !trainSeat || vehicleMode !== 'walk') return false;
  const trainPositionNow = train.getWorldPosition(new THREE.Vector3());
  if (Math.hypot(player.position.x - trainPositionNow.x, player.position.z - trainPositionNow.z) > 16) return false;
  player.visible = false;
  velocity.set(0, 0, 0);
  vehicleMode = 'train';
  grandSystems?.setTransport(currentWorld?.transitVehicle ?? 'Train');
  grandSystems?.recordWorldEvent('transit_boarded', { transitType: currentWorld?.transitKind ?? 'train' });
  countryAmbience.playCue('transit_board');
  grandSystems?.notify(`Aboard the ${currentWorld?.transitKind ?? 'train'} · watch the world pass · E disembark`);
  canvas.dataset.vehicleMode = vehicleMode;
  return true;
}

function exitTrain() {
  if (!train || vehicleMode !== 'train') return false;
  const exitPosition = trainExitPoint?.getWorldPosition(new THREE.Vector3())
    ?? train.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0, 3));
  const floor = terrainY(exitPosition);
  player.position.set(exitPosition.x, Number.isFinite(floor) ? floor : exitPosition.y, exitPosition.z);
  player.visible = true;
  vehicleMode = 'walk';
  countryAmbience.updateMotion(null);
  countryAmbience.playCue('vehicle_stop');
  grounded = true;
  lastSafePosition.copy(player.position);
  lastSafeGround = player.position.y;
  grandSystems?.setTransport('On foot');
  canvas.dataset.vehicleMode = vehicleMode;
  return true;
}

function updateScooter(delta) {
  const turn = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
  const drive = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0);
  const bicycle = vehicleMode === 'bicycle';
  const maxSpeed = bicycle ? BICYCLE_MAX_SPEED : SCOOTER_MAX_SPEED;
  const reverseSpeed = bicycle ? BICYCLE_REVERSE_SPEED : SCOOTER_REVERSE_SPEED;
  const acceleration = bicycle ? BICYCLE_ACCELERATION : SCOOTER_ACCELERATION;
  if (drive > 0) scooterSpeed = Math.min(maxSpeed, scooterSpeed + acceleration * delta);
  else if (drive < 0) scooterSpeed = Math.max(-reverseSpeed, scooterSpeed - acceleration * 0.72 * delta);
  else scooterSpeed *= Math.exp(-delta * (bicycle ? 1.75 : 2.35));

  const steering = THREE.MathUtils.clamp(Math.abs(scooterSpeed) / 5.5, 0.25, 1);
  playerYaw += turn * TURN_SPEED * 0.92 * steering * Math.sign(scooterSpeed || 1) * delta;
  heading.set(Math.sin(playerYaw), 0, -Math.cos(playerYaw)).normalize();
  velocity.copy(heading).multiplyScalar(scooterSpeed);
  if (!tryMovementAxis('x', velocity.x * delta)) scooterSpeed *= -0.18;
  if (!tryMovementAxis('z', velocity.z * delta)) scooterSpeed *= -0.18;

  scooter.position.copy(player.position);
  scooter.position.y += 0.52;
  scooter.rotation.set(0, Math.PI * 0.5 - playerYaw, -turn * Math.min(0.18, Math.abs(scooterSpeed) * 0.009));
  orientPlayer();
  setScooterRiderPose(true);
  if (bicycle) {
    cycleTime += scooterSpeed * delta * 2.4;
    for (const item of animatedLimbs) {
      if (item.limb.name.includes('leg')) {
        item.limb.rotation.x = 1.02 + Math.sin(cycleTime) * 0.32 * item.direction;
      } else {
        item.limb.rotation.x = 1.00;
      }
    }
  }
  scooter.traverse((object) => {
    if (object.name.startsWith('Scooter_wheel_') || object.name.startsWith('Bicycle_wheel_')) {
      object.rotation.y += scooterSpeed * delta * 2.4;
    }
    if (object.name.startsWith('Bicycle_crank_')) object.rotation.y = cycleTime;
  });
  if (bicycle) {
    countryAmbience.updateMotion(null);
    const bicycleBeat = Math.floor(Math.abs(cycleTime) / Math.PI);
    if (Math.abs(scooterSpeed) > 1.2 && bicycleBeat !== lastBicycleSoundBeat) {
      lastBicycleSoundBeat = bicycleBeat;
      countryAmbience.playCue('bicycle_roll');
    }
  } else {
    countryAmbience.updateMotion('scooter', scooterSpeed);
  }
  canvas.dataset.scooterSpeed = scooterSpeed.toFixed(2);
  canvas.dataset.bicycleSpeed = bicycle ? scooterSpeed.toFixed(2) : '';
  canvas.dataset.playerX = player.position.x.toFixed(3);
  canvas.dataset.playerY = player.position.y.toFixed(3);
  canvas.dataset.playerZ = player.position.z.toFixed(3);
}

function updatePlayer(delta) {
  if (grandSystems?.inputBlocked) {
    velocity.set(0, 0, 0);
    return;
  }
  if (vehicleMode === 'scooter' || vehicleMode === 'bicycle') {
    updateScooter(delta);
    return;
  }
  if (vehicleMode === 'train') {
    velocity.set(0, 0, 0);
    countryAmbience.updateMotion('train', Number(train?.userData.speed_mps ?? 19));
    return;
  }
  countryAmbience.updateMotion(null);
  const turn = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
  const drive = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0);
  const running = keys.has('ShiftLeft') || keys.has('ShiftRight');
  const speed = running ? RUN_SPEED : WALK_SPEED;

  if (Math.abs(turn) > 0.01) {
    const movingTurnScale = Math.abs(drive) > 0.01 ? 1.0 : 0.72;
    playerYaw += turn * TURN_SPEED * movingTurnScale * delta;
    heading.set(Math.sin(playerYaw), 0, -Math.cos(playerYaw)).normalize();
  }

  if (Math.abs(drive) > 0.01) desiredVelocity.copy(heading).multiplyScalar(drive * speed);
  else desiredVelocity.set(0, 0, 0);
  const responsiveness = Math.abs(drive) > 0.01 ? 12.5 : 18.0;
  velocity.lerp(desiredVelocity, 1 - Math.exp(-delta * responsiveness));

  if (!tryMovementAxis('x', velocity.x * delta)) velocity.x *= 0.12;
  if (!tryMovementAxis('z', velocity.z * delta)) velocity.z *= 0.12;

  if (jumpRequested && grounded) {
    grounded = false;
    verticalVelocity = JUMP_SPEED;
    countryAmbience.playCue('jump');
  }
  jumpRequested = false;
  if (!grounded) {
    verticalVelocity -= GRAVITY * delta;
    player.position.y += verticalVelocity * delta;
    groundPlayer();
  } else {
    groundPlayer();
  }

  if (!insideMap(player.position) || player.position.y < mapBounds.min.y - 5 || !Number.isFinite(player.position.y)) {
    recoverPlayer();
  }

  orientPlayer();
  const movementSpeed = Math.hypot(velocity.x, velocity.z);
  const moving = movementSpeed > 0.22;
  if (moving) walkTime += delta * (running ? 11.2 : 7.8);
  const footstepBeat = Math.floor(walkTime / Math.PI);
  if (moving && grounded && footstepBeat !== lastFootstepBeat) {
    lastFootstepBeat = footstepBeat;
    countryAmbience.playCue(running ? 'run_step' : 'footstep');
  } else if (!moving) {
    lastFootstepBeat = -1;
  }
  const stride = moving ? Math.min(0.72, 0.34 + movementSpeed * 0.065) : 0;
  for (const { limb, direction, base } of animatedLimbs) {
    const target = base + Math.sin(walkTime) * stride * direction;
    limb.rotation.x = THREE.MathUtils.lerp(limb.rotation.x, target, 1 - Math.exp(-delta * 16));
  }
  const bob = moving ? Math.abs(Math.sin(walkTime * 2)) * 0.065 : Math.sin(clock.elapsedTime * 2) * 0.012;
  for (const item of animatedBodies) item.object.position.y = item.baseY + bob;
  if (playerVisual) {
    playerVisual.rotation.z = THREE.MathUtils.lerp(playerVisual.rotation.z, -turn * 0.11, 1 - Math.exp(-delta * 9));
    playerVisual.rotation.x = THREE.MathUtils.lerp(playerVisual.rotation.x, drive > 0 ? -0.055 : drive < 0 ? 0.04 : 0, 1 - Math.exp(-delta * 8));
  }

  canvas.dataset.playerX = player.position.x.toFixed(3);
  canvas.dataset.playerY = player.position.y.toFixed(3);
  canvas.dataset.playerZ = player.position.z.toFixed(3);
  canvas.dataset.playerYaw = playerYaw.toFixed(4);
  canvas.dataset.grounded = String(grounded);
}

function updatePhysicsProps(delta) {
  for (const prop of physicsProps) {
    const offsetX = prop.root.position.x - player.position.x;
    const offsetZ = prop.root.position.z - player.position.z;
    const distance = Math.hypot(offsetX, offsetZ);
    const playerSpeed = Math.hypot(velocity.x, velocity.z);
    if (distance < prop.radius + 0.92 && playerSpeed > 0.7) {
      const push = new THREE.Vector3(offsetX, 0, offsetZ);
      if (push.lengthSq() < 0.01) push.copy(heading);
      push.normalize().multiplyScalar(Math.min(8.5, 2.0 + playerSpeed * 1.15));
      prop.velocity.x += push.x;
      prop.velocity.z += push.z;
      prop.velocity.y = Math.max(prop.velocity.y, prop.root.name === 'PHYSICS_FOOTBALL' ? 2.2 : 0.8);
    }

    prop.previous.copy(prop.root.position);
    prop.velocity.y -= GRAVITY * delta;
    prop.root.position.addScaledVector(prop.velocity, delta);
    const floor = terrainY(prop.root.position);
    if (!Number.isFinite(floor)) {
      prop.root.position.copy(prop.previous);
      prop.velocity.multiplyScalar(-0.28);
      continue;
    }
    const restingY = floor + prop.radius;
    if (prop.root.position.y < restingY) {
      prop.root.position.y = restingY;
      if (prop.velocity.y < -1.4) prop.velocity.y *= -0.38;
      else prop.velocity.y = 0;
      const groundFriction = Math.exp(-delta * (prop.root.name === 'PHYSICS_FOOTBALL' ? 1.15 : 4.8));
      prop.velocity.x *= groundFriction;
      prop.velocity.z *= groundFriction;
    }
    candidate.copy(prop.root.position);
    if (collidesWithObstacle(candidate, obstacles, { radius: prop.radius * 0.82, height: prop.radius * 1.8, feetOffset: -prop.radius })) {
      prop.root.position.copy(prop.previous);
      prop.velocity.x *= -0.42;
      prop.velocity.z *= -0.42;
    }
    prop.root.rotation.x += prop.velocity.z * delta / Math.max(0.2, prop.radius);
    prop.root.rotation.z -= prop.velocity.x * delta / Math.max(0.2, prop.radius);
  }
}

function updateTrain(delta) {
  if (!train || !trainCurve || !trainRouteLength) return;
  const trainSpeed = Number(train.userData.speed_mps ?? 19);
  trainStopCooldown = Math.max(0, trainStopCooldown - delta);
  if (trainDwellTime > 0) trainDwellTime = Math.max(0, trainDwellTime - delta);
  else trainProgress = (trainProgress + delta * trainSpeed / (trainRouteLength * 2)) % 1;
  const pingPong = trainProgress < 0.5 ? trainProgress * 2 : 2 - trainProgress * 2;
  trainCurve.getPointAt(pingPong, trainPosition);
  trainCurve.getTangentAt(pingPong, trainTangent);
  if (trainProgress >= 0.5) trainTangent.negate();
  trainTangent.y = 0;
  trainTangent.normalize();
  trainBack.copy(trainTangent).negate();
  right.crossVectors(trainTangent, UP).normalize();
  // The authored train is longitudinal on local X. Map that axis directly to
  // the spline tangent so every carriage runs straight along the rails.
  trainMatrix.makeBasis(trainTangent, UP, right);
  train.position.copy(trainPosition);
  train.quaternion.setFromRotationMatrix(trainMatrix);
  train.updateMatrixWorld(true);
  const doorsOpen = trainDwellTime > 0.15;
  for (const { object, closedPosition } of trainDoors) {
    const targetX = closedPosition.x + (doorsOpen ? -0.82 : 0);
    object.position.x = THREE.MathUtils.lerp(object.position.x, targetX, 1 - Math.exp(-delta * 8));
  }
  if (trainDwellTime <= 0 && trainStopCooldown <= 0) {
    const stop = trainStops.find((item) => item.position.distanceToSquared(trainPosition) < 3.4 * 3.4);
    if (stop) {
      trainDwellTime = 3.8;
      trainStopCooldown = 8.0;
      grandSystems?.notify(`${stop.name} · ${currentWorld?.transitKind ?? 'train'} stopping for passengers`);
      if (vehicleMode === 'train' || stop.position.distanceToSquared(player.position) < 42 * 42) {
        countryAmbience.playCue('transit_stop');
      }
    }
  }
  if (vehicleMode === 'train' && trainSeat) {
    trainSeat.getWorldPosition(player.position);
    heading.copy(trainTangent);
    playerYaw = Math.atan2(heading.x, -heading.z);
    velocity.set(0, 0, 0);
    grounded = false;
  }
  canvas.dataset.trainProgress = trainProgress.toFixed(4);
  canvas.dataset.trainDwell = trainDwellTime.toFixed(2);
}

function updateEnvironment(delta) {
  scene.background.copy(daySky);
  scene.fog.color.copy(scene.background);
  hemisphere.intensity = 2.45;
  ambient.intensity = 0.38;
  sun.intensity = 3.55;
  sun.position.set(
    player.position.x + 28,
    38,
    player.position.z + 18,
  );
  sun.target.position.copy(player.position);
  sun.target.updateMatrixWorld();

  for (const item of windObjects) {
    const sway = Math.sin(clock.elapsedTime * 1.5 + item.phase) * 0.035;
    item.object.rotation.x = item.baseX + sway;
    item.object.rotation.z = item.baseZ + sway * 0.7;
  }
  if (bellPivot && bellTime > 0) {
    bellTime = Math.max(0, bellTime - delta);
    bellPivot.rotation.x = Math.sin((2.2 - bellTime) * 15) * 0.42 * (bellTime / 2.2);
  } else if (bellPivot) {
    bellPivot.rotation.x *= Math.exp(-delta * 8);
  }
}

function updateCamera(delta) {
  const arrivalReveal = Math.min(2.5, grandSystems?.arrivalPulse ?? 0);
  const twoWheel = vehicleMode === 'scooter' || vehicleMode === 'bicycle';
  const cameraDistance = (vehicleMode === 'train' ? 18 : twoWheel ? 13.5 : CAMERA_DISTANCE) + arrivalReveal * 1.45;
  const cameraHeight = (vehicleMode === 'train' ? 11 : twoWheel ? 8.2 : CAMERA_HEIGHT) + arrivalReveal * 0.70;
  const focusHeight = vehicleMode === 'train' ? 3.0 : twoWheel ? 2.1 : CAMERA_FOCUS_HEIGHT;
  right.crossVectors(heading, UP).normalize();
  cameraFocus.copy(player.position)
    .addScaledVector(UP, focusHeight)
    .addScaledVector(heading, 1.9);
  desiredCamera.copy(player.position)
    .addScaledVector(heading, -cameraDistance)
    .addScaledVector(UP, cameraHeight)
    .addScaledVector(right, 1.05);

  cameraDirection.copy(desiredCamera).sub(cameraFocus);
  const desiredDistance = cameraDirection.length();
  cameraDirection.normalize();
  cameraRaycaster.set(cameraFocus, cameraDirection);
  cameraRaycaster.far = desiredDistance;
  const obstruction = cameraRaycaster.intersectObjects(cameraCollisionMeshes, false)[0];
  if (obstruction && obstruction.distance < desiredDistance) {
    desiredCamera.copy(cameraFocus)
      .addScaledVector(cameraDirection, Math.max(1.4, obstruction.distance - 0.48))
      .addScaledVector(UP, 0.55);
  }

  camera.position.lerp(desiredCamera, 1 - Math.exp(-delta * 5.6));
  cameraLookAt.lerp(cameraFocus, 1 - Math.exp(-delta * 7.4));
  camera.lookAt(cameraLookAt);
  const cameraBehind = camera.position.clone().sub(player.position).normalize().dot(heading);
  canvas.dataset.cameraBehindDot = cameraBehind.toFixed(4);
}

function updatePerformance(delta) {
  performanceTime += delta;
  performanceFrames += 1;
  if (performanceTime < 2.8) return;
  const fps = performanceFrames / performanceTime;
  canvas.dataset.measuredFps = fps.toFixed(1);
  canvas.dataset.drawCalls = String(renderer.info.render.calls);
  if (!adaptiveQuality && fps < 34) {
    adaptiveQuality = true;
    pixelRatio = Math.min(pixelRatio, 0.65);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.shadowMap.enabled = false;
    camera.far = 170;
    camera.updateProjectionMatrix();
    scene.fog.near = 72;
    scene.fog.far = 165;
    canvas.dataset.performanceTier = 'adaptive';
  } else if (!adaptiveQuality) {
    canvas.dataset.performanceTier = 'full';
  }
  performanceTime = 0;
  performanceFrames = 0;
}

function exposeRuntime() {
  const state = {
    asset: currentWorld?.asset,
    worldId: currentWorld?.id,
    worldConfig: currentWorld,
    world,
    player,
    playerVisual,
    camera,
    heading,
    groundMeshes,
    terrainY,
    obstacles,
    interactions,
    physicsProps,
    dynamicAutoObstacles,
    train,
    trainCurve,
    get scooter() { return scooter; },
    grandSystems,
    mapBounds,
    get vehicleMode() { return vehicleMode; },
    get playerYaw() { return playerYaw; },
    get grounded() { return grounded; },
    get trainProgress() { return trainProgress; },
    get recoveredCount() { return recoveredCount; },
    recoverPlayer,
    collides,
    performInteraction,
  };
  window.__NIMBU_DIORAMA__ = state;
  window.__NIMBU_EXPLORATION__ = state;
}

function applyWorldUi(config) {
  document.body.dataset.world = config.id;
  document.title = `Speakworld · ${config.loadingName}`;
  canvas.dataset.selectedWorld = config.id;
  canvas.dataset.worldId = config.id;
  loadingMark.textContent = config.brandMark;
  loadingCopy.textContent = `Opening ${config.loadingName}…`;
  brandMark.textContent = config.brandMark;
  brandSubtitle.textContent = config.brandSubtitle;
  worldMapSubtitle.textContent = config.mapSubtitle;
  worldMapTitle.textContent = config.mapTitle;
  document.querySelector('.dialogue__label').textContent = `${config.language} phrase`;
  const helpPortrait = document.querySelector('#guide-help-avatar');
  helpPortrait.src = config.guidePortrait;
  helpPortrait.alt = `${config.guideName}, your ${config.language} guide`;
  document.querySelector('#guide-help strong').textContent = `${config.guideName}’s tip`;
  const guidePortrait = document.querySelector('#guide-avatar');
  guidePortrait.src = config.guidePortrait;
  guidePortrait.alt = `${config.guideName}, your ${config.language} guide`;
  document.querySelector('#guide-card').setAttribute('aria-label', `${config.guideName}'s ${config.language} tutorial`);
  document.querySelector('#practice-panel').setAttribute('aria-label', `${config.language} conversation practice`);
  document.querySelector('#world-map').setAttribute('aria-label', `Map of ${config.loadingName}`);
}

function loadWorld(worldId) {
  if (currentWorld) return;
  currentWorld = WORLD_OPTIONS[worldId] ?? WORLD_OPTIONS.hindi;
  applyWorldUi(currentWorld);
  countryAmbience.start(currentWorld.id);
  canvas.dataset.ambienceWorld = currentWorld.id;
  canvas.dataset.ambienceMuted = String(countryAmbience.muted);
  canvas.dataset.soundEngine = 'procedural-score-v2';
  canvas.dataset.soundtrack = countryAmbience.state.soundtrack;
  worldSelect.querySelectorAll('button').forEach((button) => { button.disabled = true; });
  worldSelect.classList.add('world-select--leaving');
  setTimeout(() => { worldSelect.hidden = true; }, 520);
  loading.classList.remove('loading--hidden');

  new GLTFLoader().load(
    currentWorld.asset,
    (gltf) => {
    world = gltf.scene;
    scene.add(world);
    world.updateMatrixWorld(true);
    const worldRoot = world.getObjectByName(currentWorld.rootName);
    if (!worldRoot) {
      loadingCopy.textContent = `${currentWorld.loadingName} has an invalid world root`;
      return;
    }
    player = world.getObjectByName(PLAYER_NAME);
    if (!player) {
      loadingCopy.textContent = 'The walking character is missing';
      return;
    }
    const spawn = player.getWorldPosition(new THREE.Vector3());
    scene.attach(player);
    player.position.copy(spawn);
    player.scale.setScalar(1);

    world.traverse((object) => {
      if (!object.isMesh) return;
      prepareMesh(object);
      if (object.name.startsWith('WALKABLE_')) groundMeshes.push(object);
    });
    // Roads, paths, and bridges need exact surface hits. The base terrain is
    // guaranteed level by the Blender export validator, so the constant
    // analytical fallback avoids raycasting its 32k triangles every frame.
    groundDetailMeshes = groundMeshes.filter((mesh) => !/TERRAIN/.test(mesh.name));
    player.traverse((object) => {
      if (object.isMesh) prepareMesh(object);
    });
    if (groundMeshes.length < 8) {
      loadingCopy.textContent = 'The world paths are incomplete';
      return;
    }

    const terrain = world.getObjectByName('WALKABLE_GRAND_TERRAIN')
      ?? world.getObjectByName('WALKABLE_DI0RAMA_TERRAIN')
      ?? groundMeshes.find((mesh) => /TERRAIN/.test(mesh.name));
    if (!terrain) {
      loadingCopy.textContent = 'The world terrain is missing';
      return;
    }
    mapBounds.setFromObject(terrain);
    obstacles = topLevelNamedRoots(world, /^OBSTACLE_/).map(obstacleFromObject).filter(Boolean);
    cameraCollisionMeshes = obstacles.flatMap((item) => item.meshes);
    setupTrain(world);
    setupInteractions(world);
    setupPhysicsProps(world);
    setupWind(world);
    setupCharacterAnimation();
    trainSeat = train?.getObjectByName('TRAIN_PLAYER_SEAT') ?? null;
    trainExitPoint = train?.getObjectByName('TRAIN_EXIT_POINT') ?? null;
    scooter = world.getObjectByName('SCOOTER') ?? world.getObjectByName('BICYCLE');
    scooterExitPoint = world.getObjectByName('SCOOTER_EXIT_POINT') ?? world.getObjectByName('BICYCLE_EXIT_POINT');

    heading.set(
      Number(player.userData.spawn_heading_x ?? 1),
      0,
      Number(player.userData.spawn_heading_z ?? 0),
    ).normalize();
    playerYaw = Math.atan2(heading.x, -heading.z);
    const initialGround = terrainY(player.position);
    if (!Number.isFinite(initialGround)) {
      loadingCopy.textContent = 'The character is not standing in the world';
      return;
    }
    player.position.y = initialGround;
    grounded = true;
    lastSafePosition.copy(player.position);
    lastSafeGround = initialGround;
    orientPlayer();
    initializeCamera();
    grandSystems = new GuideWorldSystems({
      scene,
      world,
      player,
      camera,
      train,
      terrainY,
      showDialogue,
      objective,
      locationChip,
      canvas,
      worldId: currentWorld.id,
    });
    dynamicAutoObstacles = grandSystems.autos.map(({ object }) => dynamicObstacleFromObject(object)).filter(Boolean);
    canvas.dataset.dynamicAutoObstacleCount = String(dynamicAutoObstacles.length);
    interactions = grandSystems.interactionCandidates();
    const batched = batchGrandWorldStatics(world, scene, grandSystems.config.districts);
    canvas.dataset.batchedMeshCount = String(batched.length);
    canvas.dataset.interactionCount = String(interactions.length);
    canvas.dataset.vehicleMode = vehicleMode;
    updateZone();

    canvas.dataset.mapAsset = currentWorld.asset;
    canvas.dataset.playableGroundMode = worldRoot.userData.playable_ground_mode ?? 'level';
    canvas.dataset.walkableSurfaceCount = String(groundMeshes.length);
    canvas.dataset.obstacleCount = String(obstacles.length);
    canvas.dataset.recoveredCount = '0';
    canvas.dataset.grounded = 'true';
    exposeRuntime();
    loading.classList.add('loading--hidden');
    },
    (event) => {
      if (!event.total) return;
      const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
      loadingCopy.textContent = `Opening ${currentWorld.loadingName}… ${percent}%`;
    },
    (error) => {
      console.error(error);
      loadingCopy.textContent = `Could not open ${currentWorld.loadingName}`;
    },
  );
}

worldSelect.addEventListener('click', (event) => {
  const choice = event.target.closest('[data-world]');
  if (!choice) return;
  loadWorld(choice.dataset.world);
});

soundToggle.addEventListener('click', () => {
  if (currentWorld) countryAmbience.start(currentWorld.id);
  const muted = countryAmbience.toggleMuted();
  soundToggle.classList.toggle('sound-toggle--muted', muted);
  soundToggle.setAttribute('aria-pressed', String(muted));
  soundToggle.setAttribute('aria-label', muted ? 'Play music and sounds' : 'Mute music and sounds');
  soundToggleLabel.textContent = muted ? 'Music & sounds off' : 'Music & sounds on';
  canvas.dataset.ambienceMuted = String(muted);
  if (!muted) countryAmbience.playCue('mission_start');
});

window.addEventListener('sayscape:audio-cue', (event) => {
  countryAmbience.playCue(event.detail?.type);
});
window.addEventListener('sayscape:voice-state', (event) => {
  updateAudioDucking('voice', Boolean(event.detail?.active));
});
window.addEventListener('sayscape:narration-state', (event) => {
  updateAudioDucking('narration', Boolean(event.detail?.active));
});

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.20);
  if (player) {
    // Preserve real movement speed on slower devices without allowing a
    // single large collision step to tunnel through scenery.
    const movementSteps = Math.max(1, Math.ceil(delta / 0.05));
    const movementDelta = delta / movementSteps;
    for (let step = 0; step < movementSteps; step += 1) updatePlayer(movementDelta);
    updatePhysicsProps(delta);
    updateTrain(delta);
    updateEnvironment(delta);
    grandSystems?.update(delta, player.position);
    updateCamera(delta);
    updateInteractionPrompt();
    updateZone();
  }
  renderer.render(scene, camera);
  updatePerformance(delta);
}

window.addEventListener('keydown', (event) => {
  if (grandSystems?.handleKey(event.code)) {
    event.preventDefault();
    return;
  }
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight', 'Space'].includes(event.code)) {
    event.preventDefault();
    keys.add(event.code);
  }
  if (event.code === 'Space' && !event.repeat) jumpRequested = true;
  if (event.code === 'KeyE' && !event.repeat) {
    event.preventDefault();
    if (vehicleMode === 'scooter' || vehicleMode === 'bicycle') exitScooter();
    else if (vehicleMode === 'train') exitTrain();
    else performInteraction();
  }
  if (event.code === 'KeyM' && !event.repeat) {
    const open = grandSystems?.toggleMap();
    if (typeof open === 'boolean') countryAmbience.playCue(open ? 'ui_open' : 'ui_close');
  }
});
window.addEventListener('keyup', (event) => keys.delete(event.code));
window.addEventListener('blur', () => keys.clear());
window.addEventListener('beforeunload', () => countryAmbience.dispose());
window.addEventListener('resize', () => {
  pixelRatio = Math.min(window.devicePixelRatio, adaptiveQuality ? 0.65 : 1.45);
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

animate();
