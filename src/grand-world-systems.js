import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const SAVE_KEY = 'nimbu-grand-progress-v1';

export const DISTRICT_DEFINITIONS = [
  { root: 'CITY_0_NIMBU_JUNCTION', name: 'Nimbu Junction', x: -252, z: 82, arrival: 'The railway town appears beyond the first bend' },
  { root: 'CITY_1_NAMASTE_BAZAAR', name: 'Namaste Bazaar', x: -154, z: 37, arrival: 'Colourful awnings reveal the bazaar' },
  { root: 'CITY_2_JHEEL_MANDIR', name: 'Jheel Mandir', x: -42, z: -27, arrival: 'The lake and island shrine open into view' },
  { root: 'CITY_3_HARIYALI_VILLAGE', name: 'Hariyali Village', x: 78, z: 35, arrival: 'Terraced fields reveal the village' },
  { root: 'CITY_4_DEVGARH_FORT', name: 'Devgarh Fort', x: 176, z: -45, arrival: 'The fort rises above the road' },
  { root: 'CITY_5_PAHADI_RAIL', name: 'Pahadi Rail', x: 258, z: -105, arrival: 'The mountain terminus appears through the tunnel' },
];

export const JAPAN_DISTRICT_DEFINITIONS = [
  { root: 'CITY_0_SAKURA_GATE', name: 'Sakura Gate', x: -252, z: 82, arrival: 'The station district opens beneath the cherry trees' },
  { root: 'CITY_1_KONBINI_STREET', name: 'Konbini Street', x: -154, z: 37, arrival: 'Lanterns and shop signs reveal the city lanes' },
  { root: 'CITY_2_KAWA_MARKET', name: 'Kawa Market', x: -42, z: -27, arrival: 'The red bridge appears across the river market' },
  { root: 'CITY_3_MIDORI_VILLAGE', name: 'Midori Village', x: 78, z: 35, arrival: 'Rice fields and quiet homes spread into view' },
  { root: 'CITY_4_INARI_HILL', name: 'Inari Hill', x: 176, z: -45, arrival: 'Vermilion torii gates mark the shrine climb' },
  { root: 'CITY_5_YAMA_ONSEN', name: 'Yama Onsen', x: 258, z: -105, arrival: 'Steam rises beside the mountain terminus' },
];

export const MEXICO_DISTRICT_DEFINITIONS = [
  { root: 'CITY_0_PLAZA_NARANJA', name: 'Plaza Naranja', x: -252, z: 82, arrival: 'Marigold metro canopies reveal the first plaza' },
  { root: 'CITY_1_MERCADO_SOL', name: 'Mercado del Sol', x: -154, z: 37, arrival: 'Papel picado and food stalls fill the market streets' },
  { root: 'CITY_2_CANAL_FLORES', name: 'Canal de Flores', x: -42, z: -27, arrival: 'Colourful boats appear along the flower canal' },
  { root: 'CITY_3_BARRIO_AZUL', name: 'Barrio Azul', x: 78, z: 35, arrival: 'Blue homes and jacaranda trees open into view' },
  { root: 'CITY_4_CERRO_AGAVE', name: 'Cerro Agave', x: 176, z: -45, arrival: 'Agave fields mark the winding hill road' },
  { root: 'CITY_5_MIRADOR_COBRE', name: 'Mirador Cobre', x: 258, z: -105, arrival: 'Copper cliffs frame the final metro stop' },
];

const MISSION_DEFINITIONS = [
  { id: 'ticket', title: 'A phrase for the journey', detail: 'Optionally practise asking for a ticket at Nimbu Junction', target: [-259, 72] },
  { id: 'parcel', title: 'Bazaar delivery', detail: 'Collect the parcel, then deliver it to the fruit vendor', target: [-154, 37] },
  { id: 'lake', title: 'Postcards from Nimbu', detail: 'Collect three Hindi postcards around the world', target: [-42, -27] },
  { id: 'doctor', title: 'A useful sentence', detail: 'Visit the Hariyali clinic and speak to the doctor', target: [78, 35] },
  { id: 'photo', title: 'Fort photographer', detail: 'Reach Devgarh Fort and press P at the viewpoint', target: [176, -45] },
  { id: 'explorer', title: 'Across Nimbu Pradesh', detail: 'Discover all six regions', target: [258, -105] },
];

function safeLoad() {
  try {
    return JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
  } catch {
    return {};
  }
}

function namedRoots(root, pattern) {
  const result = [];
  root.traverse((object) => {
    if (!pattern.test(object.name)) return;
    let parent = object.parent;
    while (parent && parent !== root) {
      if (pattern.test(parent.name)) return;
      parent = parent.parent;
    }
    result.push(object);
  });
  return result;
}

export function batchGrandWorldStatics(world, scene, districtDefinitions = DISTRICT_DEFINITIONS) {
  world.updateMatrixWorld(true);
  const geometryKey = (mesh) => `${mesh.material.uuid}:${mesh.geometry.index ? 'indexed' : 'plain'}:${Object.keys(mesh.geometry.attributes).sort().join(',')}`;
  const groups = new Map();
  world.traverse((mesh) => {
    if (!mesh.isMesh || !/^(?:BATCH_|BACKGROUND_)/.test(mesh.name)) return;
    if (Array.isArray(mesh.material) || !mesh.material || !mesh.geometry?.attributes?.position) return;
    const key = geometryKey(mesh);
    if (!groups.has(key)) groups.set(key, { material: mesh.material, meshes: [] });
    groups.get(key).meshes.push(mesh);
  });

  const batched = [];
  for (const { material, meshes } of groups.values()) {
    if (meshes.length < 3) continue;
    const geometries = meshes.map((mesh) => {
      const geometry = mesh.geometry.clone();
      geometry.applyMatrix4(mesh.matrixWorld);
      return geometry;
    });
    const geometry = mergeGeometries(geometries, false);
    if (!geometry) continue;
    geometry.computeBoundingSphere();
    const batch = new THREE.Mesh(geometry, material);
    batch.name = `BATCHED_${material.name}_${batched.length}`;
    batch.castShadow = false;
    batch.receiveShadow = true;
    scene.add(batch);
    for (const mesh of meshes) mesh.visible = false;
    batched.push(batch);
  }

  // Each town remains independently cullable, but its static building pieces
  // render as a handful of material batches instead of hundreds of meshes.
  for (const definition of districtDefinitions) {
    const district = world.getObjectByName(definition.root);
    if (!district) continue;
    district.updateWorldMatrix(true, true);
    const districtInverse = district.matrixWorld.clone().invert();
    const districtGroups = new Map();
    district.traverse((mesh) => {
      if (!mesh.isMesh || Array.isArray(mesh.material) || !mesh.material || !mesh.geometry?.attributes?.position) return;
      let ancestor = mesh.parent;
      let belongsToBuilding = false;
      while (ancestor && ancestor !== district) {
        if (ancestor.name.startsWith('OBSTACLE_')) {
          belongsToBuilding = true;
          break;
        }
        ancestor = ancestor.parent;
      }
      if (!belongsToBuilding) return;
      const key = geometryKey(mesh);
      if (!districtGroups.has(key)) districtGroups.set(key, { material: mesh.material, meshes: [] });
      districtGroups.get(key).meshes.push(mesh);
    });
    for (const { material, meshes } of districtGroups.values()) {
      if (meshes.length < 2) continue;
      const geometries = meshes.map((mesh) => {
        const geometry = mesh.geometry.clone();
        geometry.applyMatrix4(districtInverse.clone().multiply(mesh.matrixWorld));
        return geometry;
      });
      const geometry = mergeGeometries(geometries, false);
      if (!geometry) continue;
      geometry.computeBoundingSphere();
      const batch = new THREE.Mesh(geometry, material);
      batch.name = `BATCHED_${definition.root}_${material.name}_${batched.length}`;
      batch.castShadow = false;
      batch.receiveShadow = true;
      district.add(batch);
      for (const mesh of meshes) mesh.visible = false;
      batched.push(batch);
    }
  }
  return batched;
}

export class GrandWorldSystems {
  constructor({ scene, world, player, train, terrainY, showDialogue, objective, locationChip, canvas }) {
    this.scene = scene;
    this.world = world;
    this.player = player;
    this.train = train;
    this.terrainY = terrainY;
    this.showDialogue = showDialogue;
    this.objective = objective;
    this.locationChip = locationChip;
    this.canvas = canvas;
    this.elapsed = 0;
    this.visibilityElapsed = 0;
    this.eventElapsed = 0;
    this.currentZone = '';
    this.weatherIndex = 0;
    this.weatherName = 'Clear';
    this.festivalWasActive = false;
    this.notificationTimer = null;
    this.radioTimer = null;
    this.radioStep = 0;
    this.radioStation = 0;
    this.mapOpen = false;
    this.arrivalPulse = 0;

    const saved = safeLoad();
    this.state = {
      money: Number(saved.money ?? 75),
      hasTicket: Boolean(saved.hasTicket),
      scooterRented: true,
      parcelCollected: Boolean(saved.parcelCollected),
      parcelDelivered: Boolean(saved.parcelDelivered),
      doctorVisited: Boolean(saved.doctorVisited),
      fortPhoto: Boolean(saved.fortPhoto),
      discovered: new Set(saved.discovered ?? []),
      postcards: new Set(saved.postcards ?? []),
      phrases: new Set(saved.phrases ?? []),
      discoveries: new Set(saved.discoveries ?? []),
      completedMissions: new Set(saved.completedMissions ?? []),
      npcMemory: saved.npcMemory ?? {},
    };

    this.moneyElement = document.querySelector('#money');
    this.clockWeatherElement = document.querySelector('#clock-weather');
    this.transportElement = document.querySelector('#transport-status');
    this.postcardElement = document.querySelector('#postcard-status');
    this.missionTitle = document.querySelector('#mission-title');
    this.missionDetail = document.querySelector('#mission-detail');
    this.notification = document.querySelector('#notification');
    this.map = document.querySelector('#world-map');
    this.mapMarkers = document.querySelector('#map-markers');
    this.mapPlayer = document.querySelector('#map-player');
    this.missionRoute = document.querySelector('#mission-route');
    this.radio = document.querySelector('#radio');
    this.radioStationElement = document.querySelector('#radio-station');

    this.setupDistricts();
    this.setupInteractions();
    this.setupMovingLife();
    this.setupRoadTraffic();
    this.setupWeather();
    this.setupMap();
    this.setupFestivalAndShops();
    this.restoreCollectedObjects();
    this.updateHud();
    this.refreshMissions();
  }

  persist() {
    const serializable = {
      ...this.state,
      discovered: [...this.state.discovered],
      postcards: [...this.state.postcards],
      phrases: [...this.state.phrases],
      discoveries: [...this.state.discoveries],
      completedMissions: [...this.state.completedMissions],
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(serializable));
  }

  setupDistricts() {
    this.districts = DISTRICT_DEFINITIONS.map((definition) => ({
      ...definition,
      object: this.world.getObjectByName(definition.root),
    }));
  }

  setupInteractions() {
    this.interactions = namedRoots(this.world, /^INTERACT_/).map((object) => ({
      object,
      position: object.getWorldPosition(new THREE.Vector3()),
      prompt: object.userData.prompt ?? 'Talk',
      action: object.userData.action ?? 'talk',
      hindi: object.userData.dialogue_hi ?? '',
      english: object.userData.dialogue_en ?? '',
      dynamic: /^INTERACT_TEMPLE_BELL/.test(object.name),
    }));

    this.signs = namedRoots(this.world, /^SIGN_/).map((object) => ({
      object,
      position: object.getWorldPosition(new THREE.Vector3()),
      prompt: object.userData.prompt ?? 'Read Hindi sign',
      action: 'translate_sign',
      hindi: object.userData.hindi ?? '',
      english: object.userData.english ?? '',
    }));

    this.postcards = namedRoots(this.world, /^COLLECTIBLE_POSTCARD_/).map((object) => ({
      object,
      position: object.getWorldPosition(new THREE.Vector3()),
      prompt: 'Collect Hindi postcard',
      action: 'collect_postcard',
      hindi: object.userData.phrase_hi ?? '',
      english: object.userData.phrase_en ?? '',
    }));

    this.npcInteractions = namedRoots(this.world, /^NPC_ROUTINE_/).map((object) => ({
      object,
      position: object.getWorldPosition(new THREE.Vector3()),
      prompt: 'Talk in Hindi',
      action: 'npc_talk',
      hindi: object.userData.dialogue_hi ?? 'नमस्ते!',
      english: object.userData.dialogue_en ?? 'Hello!',
      dynamic: true,
    }));

    this.discoveries = namedRoots(this.world, /^DISCOVERY_/).map((object) => ({
      object,
      position: object.getWorldPosition(new THREE.Vector3()),
      name: object.userData.discovery_name ?? object.name,
      reward: Number(object.userData.reward ?? 25),
    }));

    this.scooters = namedRoots(this.world, /^SCOOTER(?:$|_DISTRICT_)/);
    this.scooter = this.scooters[0] ?? null;
    this.vehicleCandidates = [];
    for (const scooter of this.scooters) {
      this.vehicleCandidates.push({
        object: scooter,
        position: scooter.getWorldPosition(new THREE.Vector3()),
        prompt: 'Ride scooter · free',
        action: 'enter_scooter',
        hindi: 'स्कूटर चलाएँ',
        english: 'Ride the scooter',
        dynamic: true,
      });
    }
    if (this.train) {
      this.vehicleCandidates.push({
        object: this.train,
        position: this.train.getWorldPosition(new THREE.Vector3()),
        prompt: 'Board train · no ticket required',
        action: 'board_train',
        hindi: 'ट्रेन में चढ़ें',
        english: 'Board the train',
        dynamic: true,
      });
    }
  }

  setupMovingLife() {
    const routineRoots = [
      ...namedRoots(this.world, /^NPC_ROUTINE_/),
      ...namedRoots(this.world, /^ANIMAL_GOAT_/),
    ];
    this.routines = routineRoots.map((object, index) => {
      const position = object.getWorldPosition(new THREE.Vector3());
      this.scene.attach(object);
      object.position.copy(position);
      return {
        object,
        origin: position.clone(),
        radius: Number(object.userData.routine_radius ?? 5),
        speed: Number(object.userData.routine_speed ?? 0.6),
        phase: index * 1.77,
        animal: object.name.startsWith('ANIMAL_'),
      };
    });
  }

  setupRoadTraffic() {
    const route = this.world.getObjectByName('ROAD_ROUTE_WAYPOINTS');
    const points = route?.children
      .filter((point) => /^ROAD_ROUTE_\d+$/.test(point.name))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((point) => point.getWorldPosition(new THREE.Vector3())) ?? [];
    this.roadCurve = points.length > 2 ? new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.24) : null;
    if (this.roadCurve) this.roadCurve.arcLengthDivisions = 220;
    this.autos = namedRoots(this.world, /^AUTO_RICKSHAW_/).map((object, index) => {
      const position = object.getWorldPosition(new THREE.Vector3());
      this.scene.attach(object);
      object.position.copy(position);
      return { object, progress: Number(object.userData.route_offset ?? index * 0.27), speed: 8.5 + index };
    });
    this.roadLength = this.roadCurve?.getLength() ?? 1;
  }

  setupWeather() {
    const count = 720;
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      positions[index * 3] = (Math.random() - 0.5) * 48;
      positions[index * 3 + 1] = Math.random() * 30;
      positions[index * 3 + 2] = (Math.random() - 0.5) * 48;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color: 0xbdefff, size: 0.075, transparent: true, opacity: 0.72, depthWrite: false });
    this.rain = new THREE.Points(geometry, material);
    this.rain.name = 'WEATHER_MONSOON_RAIN';
    this.rain.visible = false;
    this.scene.add(this.rain);
  }

  setupMap() {
    this.mapMarkers.innerHTML = '';
    for (const district of this.districts) {
      const marker = document.createElement('span');
      marker.className = 'world-map__marker world-map__marker--locked';
      marker.dataset.district = district.name;
      marker.textContent = district.name;
      marker.style.left = `${((district.x + 300) / 600) * 100}%`;
      marker.style.top = `${((district.z + 150) / 300) * 100}%`;
      this.mapMarkers.append(marker);
      district.marker = marker;
    }
    this.trainStopMarkers = namedRoots(this.world, /^TRAIN_STOP_/).map((object) => {
      const position = object.getWorldPosition(new THREE.Vector3());
      const marker = document.createElement('span');
      marker.className = 'world-map__station';
      marker.title = object.userData.stop_name ?? 'Railway station';
      marker.style.left = `${((position.x + 300) / 600) * 100}%`;
      marker.style.top = `${((position.z + 150) / 300) * 100}%`;
      this.mapMarkers.append(marker);
      return marker;
    });
  }

  setupFestivalAndShops() {
    this.festival = this.world.getObjectByName('FESTIVAL_GROUP');
    if (this.festival) this.festival.visible = false;
    this.shopMaterials = new Set();
    this.world.traverse((mesh) => {
      if (!mesh.isMesh || !/window_.*glass/i.test(mesh.name)) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) if (material?.emissive) this.shopMaterials.add(material);
    });
  }

  restoreCollectedObjects() {
    for (const postcard of this.postcards) {
      postcard.object.visible = !this.state.postcards.has(postcard.object.name);
    }
  }

  interactionCandidates() {
    return [
      ...this.interactions,
      ...this.signs,
      ...this.postcards.filter((item) => item.object.visible),
      ...this.npcInteractions,
      ...this.vehicleCandidates,
    ];
  }

  updateHud() {
    this.moneyElement.textContent = `₹${this.state.money}`;
    this.postcardElement.textContent = `Postcards ${this.state.postcards.size}/${this.postcards.length}`;
    for (const scooterCandidate of this.vehicleCandidates.filter((item) => item.action === 'enter_scooter')) {
      scooterCandidate.prompt = 'Ride scooter · free';
    }
    const trainCandidate = this.vehicleCandidates.find((item) => item.action === 'board_train');
    if (trainCandidate) trainCandidate.prompt = 'Board train · no ticket required';
  }

  setTransport(label) {
    this.transportElement.textContent = label;
  }

  notify(message, duration = 3600) {
    this.notification.textContent = message;
    this.notification.classList.add('notification--visible');
    if (this.notificationTimer) clearTimeout(this.notificationTimer);
    this.notificationTimer = setTimeout(() => this.notification.classList.remove('notification--visible'), duration);
  }

  addMoney(amount, reason = '') {
    this.state.money += amount;
    this.updateHud();
    this.persist();
    this.notify(`${amount >= 0 ? '+' : '−'}₹${Math.abs(amount)}${reason ? ` · ${reason}` : ''}`);
  }

  spend(amount, reason) {
    if (this.state.money < amount) {
      this.notify(`You need ₹${amount} · complete discoveries and missions to earn more`);
      return false;
    }
    this.state.money -= amount;
    this.updateHud();
    this.persist();
    this.notify(`−₹${amount} · ${reason}`);
    return true;
  }

  completeMission(id) {
    if (this.state.completedMissions.has(id)) return;
    this.state.completedMissions.add(id);
    this.state.money += 25;
    this.notify('Mission complete · +₹25');
    this.updateHud();
    this.persist();
    this.refreshMissions();
  }

  refreshMissions() {
    if (this.state.hasTicket) this.state.completedMissions.add('ticket');
    if (this.state.parcelDelivered) this.state.completedMissions.add('parcel');
    if (this.state.postcards.size >= 3) this.state.completedMissions.add('lake');
    if (this.state.doctorVisited) this.state.completedMissions.add('doctor');
    if (this.state.fortPhoto) this.state.completedMissions.add('photo');
    if (this.state.discovered.size >= this.districts.length) this.state.completedMissions.add('explorer');
    const mission = MISSION_DEFINITIONS.find((item) => !this.state.completedMissions.has(item.id));
    this.currentMission = mission ?? null;
    this.missionTitle.textContent = mission?.title ?? 'Nimbu local';
    this.missionDetail.textContent = mission?.detail ?? 'Explore freely and practise useful Hindi';
    this.persist();
  }

  interact(item) {
    if (!item) return { handled: false };
    const action = item.action;
    if (action === 'npc_talk' && this.state.npcMemory[item.object.name]) {
      this.showDialogue({
        hindi: `फिर मिलकर अच्छा लगा! ${item.hindi}`,
        english: `Good to see you again! ${item.english}`,
      });
    } else if (item.hindi || item.english) this.showDialogue(item);
    if (action === 'buy_train_ticket') {
      this.state.hasTicket = true;
      this.state.phrases.add(item.hindi);
      this.notify('Ticket phrase practised · boarding is always free');
    } else if (action === 'rent_scooter') {
      this.state.scooterRented = true;
      this.notify('Scooters are free across Nimbu · take any one');
    } else if (action === 'scooter_tip') {
      this.notify('हाँ · yes! Every marked scooter is free to ride');
    } else if (action === 'enter_scooter') {
      return { handled: true, command: 'enter_scooter', vehicle: item.object };
    } else if (action === 'board_train') {
      return { handled: true, command: 'board_train' };
    } else if (action === 'chai_phrase') {
      if (this.spend(8, 'masala chai')) this.state.phrases.add(item.hindi);
    } else if (action === 'fruit_phrase') {
      if (this.state.parcelCollected && !this.state.parcelDelivered) {
        this.state.parcelDelivered = true;
        this.notify('Parcel delivered to the fruit vendor');
      } else this.spend(12, 'mangoes');
    } else if (action === 'boat_phrase') {
      this.spend(15, 'boat ride');
      this.state.phrases.add(item.hindi);
    } else if (action === 'doctor_phrase') {
      this.state.doctorVisited = true;
      this.state.phrases.add(item.hindi);
    } else if (action === 'collect_parcel') {
      this.state.parcelCollected = true;
      this.notify('Parcel collected · take it to the Namaste Bazaar fruit vendor');
    } else if (action === 'collect_postcard') {
      if (!this.state.postcards.has(item.object.name)) {
        this.state.postcards.add(item.object.name);
        this.state.phrases.add(item.hindi);
        item.object.visible = false;
        this.addMoney(Number(item.object.userData.reward ?? 10), `postcard · ${item.hindi}`);
      }
    } else if (action === 'translate_sign') {
      this.state.phrases.add(item.hindi);
      this.notify(`Sign translated · ${item.hindi} means “${item.english}”`);
    } else if (action === 'npc_talk') {
      this.state.phrases.add(item.hindi);
      this.state.npcMemory[item.object.name] = (this.state.npcMemory[item.object.name] ?? 0) + 1;
      item.prompt = 'Talk again · they remember you';
    } else if (action === 'ring_bell') {
      this.notify('The temple bell echoes across Pahadi Rail');
    }
    this.canvas.dataset.lastInteraction = action;
    this.refreshMissions();
    this.updateHud();
    this.persist();
    return { handled: true };
  }

  updateZone(position) {
    let nearest = null;
    let nearestDistance = Infinity;
    for (const district of this.districts) {
      const distance = Math.hypot(position.x - district.x, position.z - district.z);
      if (distance < nearestDistance) {
        nearest = district;
        nearestDistance = distance;
      }
    }
    const next = nearestDistance < 58 ? nearest.name : 'Open Road';
    if (next !== this.currentZone) {
      this.currentZone = next;
      this.locationChip.textContent = next;
      this.locationChip.classList.remove('location-chip--arriving');
      requestAnimationFrame(() => this.locationChip.classList.add('location-chip--arriving'));
      if (nearestDistance < 58 && !this.state.discovered.has(nearest.name)) {
        this.state.discovered.add(nearest.name);
        nearest.marker?.classList.remove('world-map__marker--locked');
        this.state.money += 15;
        this.arrivalPulse = 3.4;
        this.notify(`${nearest.arrival} · discovered ${nearest.name} · +₹15`);
        this.refreshMissions();
        this.updateHud();
      }
    }
    return this.currentZone;
  }

  updateDiscoveries(position) {
    for (const item of this.discoveries) {
      if (this.state.discoveries.has(item.object.name)) continue;
      if (position.distanceTo(item.position) < 5.5) {
        this.state.discoveries.add(item.object.name);
        this.state.money += item.reward;
        this.notify(`Discovery · ${item.name} · +₹${item.reward}`);
        this.updateHud();
        this.persist();
      }
    }
  }

  updateLife(delta, viewerPosition) {
    for (const item of this.routines) {
      if (viewerPosition.distanceToSquared(item.origin) > 190 * 190) continue;
      const angle = this.elapsed * item.speed / Math.max(1, item.radius) + item.phase;
      item.object.position.x = item.origin.x + Math.cos(angle) * item.radius;
      item.object.position.z = item.origin.z + Math.sin(angle) * item.radius;
      const y = this.terrainY(item.object.position);
      if (Number.isFinite(y)) item.object.position.y = y;
      item.object.rotation.y = -angle;
      if (item.animal) item.object.rotation.z = Math.sin(this.elapsed * 7 + item.phase) * 0.035;
    }
    if (!this.roadCurve) return;
    const point = new THREE.Vector3();
    const tangent = new THREE.Vector3();
    for (const auto of this.autos) {
      auto.progress = (auto.progress + delta * auto.speed / this.roadLength) % 2;
      const pingPong = auto.progress < 1 ? auto.progress : 2 - auto.progress;
      this.roadCurve.getPointAt(pingPong, point);
      this.roadCurve.getTangentAt(pingPong, tangent);
      if (auto.progress >= 1) tangent.negate();
      auto.object.position.copy(point);
      auto.object.position.y += 0.50;
      auto.object.rotation.y = Math.atan2(tangent.x, tangent.z) + Math.PI * 0.5;
      auto.object.visible = viewerPosition.distanceToSquared(auto.object.position) < 210 * 210;
    }
  }

  updateWeather(delta, position) {
    const nextWeather = Math.floor(this.elapsed / 48) % 3;
    if (nextWeather !== this.weatherIndex) {
      this.weatherIndex = nextWeather;
      this.weatherName = ['Clear', 'Monsoon', 'Mountain mist'][nextWeather];
      this.notify(`Weather changing · ${this.weatherName}`);
    }
    this.rain.visible = this.weatherIndex === 1;
    if (!this.rain.visible) return;
    this.rain.position.set(position.x, position.y + 2, position.z);
    const positions = this.rain.geometry.attributes.position.array;
    for (let index = 0; index < positions.length; index += 3) {
      positions[index + 1] -= delta * 24;
      positions[index] -= delta * 2.5;
      if (positions[index + 1] < 0) {
        positions[index + 1] += 30;
        positions[index] = (Math.random() - 0.5) * 48;
        positions[index + 2] = (Math.random() - 0.5) * 48;
      }
    }
    this.rain.geometry.attributes.position.needsUpdate = true;
  }

  updateFestivalAndShops(worldTime) {
    const hour = Math.floor(worldTime * 24);
    const festivalActive = worldTime > 0.64 && worldTime < 0.86;
    if (this.festival) this.festival.visible = festivalActive;
    if (festivalActive && !this.festivalWasActive) this.notify('Jheel Deepotsav has begun · the lake district has transformed');
    this.festivalWasActive = festivalActive;
    const shopsOpen = hour >= 7 && hour < 21;
    for (const material of this.shopMaterials) {
      material.emissive.set(shopsOpen ? 0x000000 : 0xffb14a);
      material.emissiveIntensity = shopsOpen ? 0 : 0.35;
    }
    this.canvas.dataset.shopsOpen = String(shopsOpen);
  }

  updateAreaVisibility(position) {
    this.visibilityElapsed = 0;
    for (const district of this.districts) {
      if (!district.object) continue;
      const distance = Math.hypot(position.x - district.x, position.z - district.z);
      district.object.visible = distance < 190;
    }
  }

  updateMap(position) {
    this.mapPlayer.style.left = `${THREE.MathUtils.clamp(((position.x + 300) / 600) * 100, 0, 100)}%`;
    this.mapPlayer.style.top = `${THREE.MathUtils.clamp(((position.z + 150) / 300) * 100, 0, 100)}%`;
    for (const district of this.districts) {
      district.marker?.classList.toggle('world-map__marker--locked', !this.state.discovered.has(district.name));
    }
    if (this.missionRoute && this.currentMission?.target) {
      const [targetX, targetZ] = this.currentMission.target;
      const startX = THREE.MathUtils.clamp(position.x + 300, 0, 600);
      const startY = THREE.MathUtils.clamp(position.z + 150, 0, 300);
      const endX = targetX + 300;
      const endY = targetZ + 150;
      this.missionRoute.setAttribute('d', `M ${startX} ${startY} Q ${(startX + endX) * 0.5} ${Math.min(startY, endY) - 24} ${endX} ${endY}`);
      this.missionRoute.classList.add('world-map__mission-route--visible');
    } else this.missionRoute?.classList.remove('world-map__mission-route--visible');
  }

  updateEnvironmentHud(worldTime) {
    const totalMinutes = Math.floor(worldTime * 24 * 60);
    const hour = String(Math.floor(totalMinutes / 60) % 24).padStart(2, '0');
    const minute = String(totalMinutes % 60).padStart(2, '0');
    this.clockWeatherElement.textContent = `${hour}:${minute} · ${this.weatherName}`;
  }

  update(delta, position, worldTime) {
    this.elapsed += delta;
    this.arrivalPulse = Math.max(0, this.arrivalPulse - delta);
    this.visibilityElapsed += delta;
    this.eventElapsed += delta;
    this.updateZone(position);
    this.updateDiscoveries(position);
    this.updateLife(delta, position);
    this.updateWeather(delta, position);
    this.updateFestivalAndShops(worldTime);
    this.updateEnvironmentHud(worldTime);
    this.updateMap(position);
    if (this.visibilityElapsed > 0.30) this.updateAreaVisibility(position);
    if (this.eventElapsed > 38) {
      this.eventElapsed = 0;
      const events = [
        'Roadside event · a herd of goats is crossing the village road',
        'Station announcement · the Pahadi train is approaching',
        'Local event · a wedding procession is moving through the bazaar',
        'Weather notice · monsoon clouds are gathering over the lake',
      ];
      this.notify(events[Math.floor(this.elapsed / 38) % events.length]);
    }
  }

  toggleMap() {
    const open = !this.map.classList.contains('world-map--open');
    this.map.classList.toggle('world-map--open', open);
    this.map.setAttribute('aria-hidden', String(!open));
    this.mapOpen = open;
    return open;
  }

  takePhoto() {
    this.notify(`Photo saved · ${this.currentZone}`);
    if (this.currentZone === 'Devgarh Fort' && !this.state.fortPhoto) {
      this.state.fortPhoto = true;
      this.completeMission('photo');
    }
    this.canvas.classList.remove('camera-flash');
    void this.canvas.offsetWidth;
    this.canvas.classList.add('camera-flash');
  }

  toggleRadio() {
    this.radioStation = (this.radioStation + 1) % 4;
    const stations = ['Radio off', 'Nimbu लोक', 'Pahadi Beats', 'Hindi अभ्यास'];
    this.radioStationElement.textContent = stations[this.radioStation];
    this.radio.classList.toggle('radio--visible', this.radioStation > 0);
    if (this.radioTimer) {
      clearInterval(this.radioTimer);
      this.radioTimer = null;
    }
    if (!this.radioStation) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    this.audioContext = this.audioContext ?? new AudioContextClass();
    const scales = [[], [196, 220, 294, 330], [146.8, 196, 246.9, 293.7], [261.6, 293.7, 329.6, 392]];
    const playNote = () => {
      const now = this.audioContext.currentTime;
      const oscillator = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      oscillator.type = this.radioStation === 2 ? 'square' : 'triangle';
      oscillator.frequency.value = scales[this.radioStation][this.radioStep++ % 4];
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.025, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.30);
      oscillator.connect(gain).connect(this.audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.33);
    };
    playNote();
    this.radioTimer = setInterval(playNote, 380);
  }
}
