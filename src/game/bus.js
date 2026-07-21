import * as THREE from 'three';
import { COLORS, outlinedMesh } from './palette.js';
import { PLANET_RADIUS, terrainHeightAt } from './world.js';

function busBox(width, height, depth, color, options = {}) {
  const mesh = outlinedMesh(new THREE.BoxGeometry(width, height, depth), color, options);
  mesh.position.y = height * 0.5;
  return mesh;
}

function createShuttleBus() {
  const group = new THREE.Group();
  group.name = 'Shikhar mountain shuttle';

  const chassis = busBox(1.72, 0.28, 3.55, COLORS.ink);
  chassis.position.y = 0.42;
  const body = busBox(1.62, 1.65, 3.38, COLORS.saffron);
  body.position.y = 1.22;
  const roof = busBox(1.74, 0.18, 3.48, COLORS.paper);
  roof.position.y = 2.1;
  const front = busBox(1.5, 0.64, 0.08, COLORS.sky, { castShadow: false });
  front.position.set(0, 1.64, 1.73);
  const destination = busBox(1.18, 0.28, 0.09, COLORS.ink, { castShadow: false });
  destination.position.set(0, 1.98, 1.77);
  const bumper = busBox(1.68, 0.16, 0.18, COLORS.red);
  bumper.position.set(0, 0.58, 1.78);
  group.add(chassis, body, roof, front, destination, bumper);

  for (const side of [-1, 1]) {
    for (const z of [-1.05, -0.28, 0.49]) {
      const window = busBox(0.06, 0.58, 0.6, COLORS.sky, { castShadow: false });
      window.position.set(side * 0.84, 1.57, z);
      group.add(window);
    }
  }

  const wheels = [];
  for (const side of [-1, 1]) {
    for (const z of [-1.08, 1.06]) {
      const wheel = outlinedMesh(new THREE.CylinderGeometry(0.31, 0.31, 0.18, 12), COLORS.ink);
      wheel.rotation.z = Math.PI * 0.5;
      wheel.position.set(side * 0.88, 0.42, z);
      group.add(wheel);
      wheels.push(wheel);
    }
  }

  for (const x of [-0.55, 0.55]) {
    const lamp = outlinedMesh(new THREE.SphereGeometry(0.11, 8, 6), COLORS.yellow);
    lamp.position.set(x, 1.02, 1.81);
    group.add(lamp);
  }

  group.userData.wheels = wheels;
  return group;
}

export function createBus(path) {
  const group = createShuttleBus();
  const orientation = new THREE.Matrix4();
  const right = new THREE.Vector3();
  const roadUp = new THREE.Vector3();
  const roadBefore = new THREE.Vector3();
  const roadAfter = new THREE.Vector3();
  const boardingNormal = new THREE.Vector3();
  const boardingTangent = new THREE.Vector3();
  const stops = path.stops.map((stop) => ({ ...stop }));
  let progress = 0;
  let travelDirection = 1;
  let dwell = 7;
  let currentStop = stops[0];
  let targetStop = stops[1];
  let rider = false;
  let wheelAngle = 0;
  const speed = 4.6;

  function roadPosition(value, target) {
    const normal = path.directionAt(value);
    return target.copy(normal).multiplyScalar(PLANET_RADIUS + terrainHeightAt(normal) + 0.12);
  }

  function syncBus() {
    boardingNormal.copy(path.directionAt(progress));
    const step = 0.0025 * travelDirection;
    roadPosition(THREE.MathUtils.clamp(progress - step, 0, 1), roadBefore);
    roadPosition(THREE.MathUtils.clamp(progress + step, 0, 1), roadAfter);
    boardingTangent.copy(roadAfter).sub(roadBefore).normalize();
    if (boardingTangent.lengthSq() < 0.5) {
      boardingTangent.copy(path.tangentAt(progress));
      if (travelDirection < 0) boardingTangent.multiplyScalar(-1);
    }
    right.crossVectors(boardingNormal, boardingTangent).normalize();
    roadUp.crossVectors(boardingTangent, right).normalize();
    orientation.makeBasis(right, roadUp, boardingTangent);
    group.quaternion.setFromRotationMatrix(orientation);
    roadPosition(progress, group.position);
  }

  function beginLeg(direction) {
    travelDirection = direction;
    currentStop = null;
    targetStop = direction > 0 ? stops[1] : stops[0];
  }

  function update(delta) {
    if (dwell > 0) {
      dwell = Math.max(0, dwell - delta);
      if (dwell === 0) beginLeg(progress < 0.5 ? 1 : -1);
    } else {
      const step = (speed / path.length) * delta * travelDirection;
      progress += step;
      const arrived = travelDirection > 0 ? progress >= 1 : progress <= 0;
      if (arrived) {
        progress = travelDirection > 0 ? 1 : 0;
        currentStop = travelDirection > 0 ? stops[1] : stops[0];
        targetStop = null;
        dwell = 9;
      }
      wheelAngle -= speed * delta * 2.25;
    }

    group.userData.wheels.forEach((wheel) => { wheel.rotation.x = wheelAngle; });
    syncBus();
  }

  function requestArrival(stopId = stops[0].id) {
    if (rider) return false;
    const stopIndex = Math.max(0, stops.findIndex((stop) => stop.id === stopId));
    const requestedProgress = stopIndex === 0 ? 0 : 1;
    if (dwell > 0 && currentStop?.id === stops[stopIndex].id) return true;
    const approachDistance = Math.min(0.24, 11 / path.length);
    progress = stopIndex === 0 ? approachDistance : 1 - approachDistance;
    travelDirection = stopIndex === 0 ? -1 : 1;
    targetStop = stops[stopIndex];
    currentStop = null;
    dwell = 0;
    syncBus();
    return true;
  }

  function canBoard(playerPosition) {
    return dwell > 0 && playerPosition.distanceTo(group.position) < 3.8;
  }

  function board() {
    if (dwell <= 0) return false;
    rider = true;
    dwell = Math.min(dwell, 2.5);
    return true;
  }

  function leave() {
    rider = false;
  }

  syncBus();

  return {
    group,
    update,
    requestArrival,
    canBoard,
    board,
    leave,
    get onboard() { return rider; },
    get stopped() { return dwell > 0; },
    get arriving() { return dwell <= 0; },
    get arrivalSeconds() {
      if (dwell > 0 || !targetStop) return 0;
      const targetProgress = targetStop.id === stops[0].id ? 0 : 1;
      return Math.abs(targetProgress - progress) * path.length / speed;
    },
    get arrivingAt() { return dwell > 0 ? null : targetStop; },
    get stoppedAt() { return dwell > 0 ? currentStop : null; },
    get stops() { return stops.map((stop) => ({ ...stop })); },
    get progress() { return progress; },
    get elevation() { return terrainHeightAt(boardingNormal); },
    closestStop(playerPosition) {
      let closest = null;
      stops.forEach((stop) => {
        const position = stop.direction.clone().multiplyScalar(PLANET_RADIUS + terrainHeightAt(stop.direction) + 0.1);
        const distance = playerPosition.distanceTo(position);
        if (!closest || distance < closest.distance) closest = { stop, position, distance };
      });
      return closest;
    },
    get riderNormal() { return boardingNormal.clone(); },
    get riderForward() { return boardingTangent.clone(); },
    get exitNormal() {
      const across = new THREE.Vector3().crossVectors(boardingNormal, boardingTangent).normalize();
      return boardingNormal.clone().addScaledVector(across, 2.85 / PLANET_RADIUS).normalize();
    },
  };
}
