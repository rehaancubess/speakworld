import * as THREE from 'three';
import { COLORS, outlinedMesh } from './palette.js';
import { PLANET_RADIUS, terrainHeightAt } from './world.js';

function trainBox(width, height, depth, color) {
  const mesh = outlinedMesh(new THREE.BoxGeometry(width, height, depth), color);
  mesh.position.y = height * 0.5;
  return mesh;
}

function trainCylinder(radiusTop, radiusBottom, height, color, segments = 10) {
  const mesh = outlinedMesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), color);
  mesh.position.y = height * 0.5;
  return mesh;
}

function addWheels(group, positions) {
  const wheels = [];
  positions.forEach(([x, z]) => {
    const wheel = outlinedMesh(new THREE.CylinderGeometry(0.3, 0.3, 0.16, 12), COLORS.ink);
    wheel.position.set(x, 0.35, z);
    wheel.rotation.z = Math.PI * 0.5;
    group.add(wheel);
    wheels.push(wheel);
  });
  group.userData.wheels = wheels;
}

function createLocomotive() {
  const group = new THREE.Group();
  group.name = 'Nimbu Express locomotive';

  const chassis = trainBox(1.45, 0.3, 2.45, COLORS.ink);
  chassis.position.y = 0.43;
  const boiler = outlinedMesh(new THREE.CylinderGeometry(0.43, 0.43, 1.35, 12), COLORS.red);
  boiler.rotation.x = Math.PI * 0.5;
  boiler.position.set(0, 1.08, 0.4);
  const boilerCap = outlinedMesh(new THREE.CylinderGeometry(0.48, 0.48, 0.16, 12), COLORS.yellow);
  boilerCap.rotation.x = Math.PI * 0.5;
  boilerCap.position.set(0, 1.08, 1.1);
  const cabin = trainBox(1.25, 1.45, 0.9, COLORS.teal);
  cabin.position.set(0, 1.13, -0.72);
  const roof = trainBox(1.48, 0.16, 1.12, COLORS.yellow);
  roof.position.set(0, 1.92, -0.72);
  group.add(chassis, boiler, boilerCap, cabin, roof);

  for (const x of [-0.42, 0.42]) {
    const window = trainBox(0.31, 0.46, 0.07, COLORS.sky);
    window.position.set(x, 1.42, -1.19);
    group.add(window);
  }

  const chimney = trainCylinder(0.14, 0.2, 0.72, COLORS.ink, 9);
  chimney.position.set(0, 1.48, 0.73);
  const chimneyLip = trainCylinder(0.23, 0.16, 0.16, COLORS.ink, 9);
  chimneyLip.position.set(0, 1.93, 0.73);
  const lamp = outlinedMesh(new THREE.SphereGeometry(0.16, 9, 7), COLORS.paper);
  lamp.position.set(0, 1.14, 1.28);
  group.add(chimney, chimneyLip, lamp);

  const pilot = outlinedMesh(new THREE.ConeGeometry(0.7, 0.65, 4), COLORS.saffron);
  pilot.rotation.x = Math.PI * 0.5;
  pilot.rotation.y = Math.PI * 0.25;
  pilot.position.set(0, 0.43, 1.55);
  group.add(pilot);

  addWheels(group, [
    [-0.72, -0.72], [0.72, -0.72],
    [-0.72, 0.68], [0.72, 0.68],
  ]);
  return group;
}

function createCarriage(color, trim) {
  const group = new THREE.Group();
  const chassis = trainBox(1.5, 0.28, 2.35, COLORS.ink);
  chassis.position.y = 0.42;
  const body = trainBox(1.38, 1.25, 2.2, color);
  body.position.y = 1.14;
  const roof = trainBox(1.58, 0.17, 2.42, trim);
  roof.position.y = 1.84;
  group.add(chassis, body, roof);

  for (const side of [-1, 1]) {
    for (const z of [-0.65, 0, 0.65]) {
      const window = trainBox(0.07, 0.48, 0.45, COLORS.sky);
      window.position.set(side * 0.72, 1.28, z);
      group.add(window);
    }
  }
  addWheels(group, [
    [-0.75, -0.7], [0.75, -0.7],
    [-0.75, 0.7], [0.75, 0.7],
  ]);
  return group;
}

function positiveAngle(angle) {
  return ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
}

export function createTrain(path) {
  const group = new THREE.Group();
  group.name = 'Moving Nimbu Express';
  const cars = [
    { object: createLocomotive(), offset: 0 },
    { object: createCarriage(COLORS.yellow, COLORS.red), offset: 2.75 },
    { object: createCarriage(COLORS.blue, COLORS.paper), offset: 5.5 },
  ];
  cars.forEach(({ object }) => group.add(object));

  const orientation = new THREE.Matrix4();
  const right = new THREE.Vector3();
  const railUp = new THREE.Vector3();
  const railBefore = new THREE.Vector3();
  const railAfter = new THREE.Vector3();
  const railForward = new THREE.Vector3();
  const boardingNormal = new THREE.Vector3();
  const boardingTangent = new THREE.Vector3();
  const stops = (path.stops?.length
    ? path.stops
    : [{ id: 'nadi', name: 'Nadi Para Junction', angle: path.stationAngle }])
    .map((stop) => ({ ...stop, angle: positiveAngle(stop.angle) }))
    .sort((a, b) => a.angle - b.angle);
  let headAngle = path.stationAngle + 1.1;
  let dwell = 0;
  let rider = false;
  let wheelAngle = 0;
  const speed = 5.8;

  function nextStopAfter(angle) {
    let next = stops[0];
    let shortest = Infinity;
    stops.forEach((stop) => {
      let distance = positiveAngle(stop.angle - angle);
      if (distance < 0.002) distance += Math.PI * 2;
      if (distance < shortest) {
        shortest = distance;
        next = stop;
      }
    });
    return next;
  }

  let targetStop = nextStopAfter(headAngle);
  let currentStop = null;

  function placeCar(car, angle) {
    const normal = path.directionAt(angle);
    const sampleStep = 0.0025;
    const beforeNormal = path.directionAt(angle - sampleStep);
    const afterNormal = path.directionAt(angle + sampleStep);
    railBefore.copy(beforeNormal).multiplyScalar(PLANET_RADIUS + terrainHeightAt(beforeNormal) + 0.13);
    railAfter.copy(afterNormal).multiplyScalar(PLANET_RADIUS + terrainHeightAt(afterNormal) + 0.13);
    railForward.copy(railAfter).sub(railBefore).normalize();
    right.crossVectors(normal, railForward).normalize();
    railUp.crossVectors(railForward, right).normalize();
    orientation.makeBasis(right, railUp, railForward);
    car.quaternion.setFromRotationMatrix(orientation);
    car.position.copy(normal).multiplyScalar(PLANET_RADIUS + terrainHeightAt(normal) + 0.13);
  }

  function syncCars() {
    cars.forEach(({ object, offset }) => placeCar(object, headAngle - offset / path.trackRadius));
    const riderAngle = headAngle - 3.25 / path.trackRadius;
    boardingNormal.copy(path.directionAt(riderAngle));
    const beforeNormal = path.directionAt(riderAngle - 0.0025);
    const afterNormal = path.directionAt(riderAngle + 0.0025);
    railBefore.copy(beforeNormal).multiplyScalar(PLANET_RADIUS + terrainHeightAt(beforeNormal) + 0.13);
    railAfter.copy(afterNormal).multiplyScalar(PLANET_RADIUS + terrainHeightAt(afterNormal) + 0.13);
    boardingTangent.copy(railAfter).sub(railBefore).normalize();
  }

  function update(delta) {
    if (dwell > 0) {
      dwell = Math.max(0, dwell - delta);
      if (dwell === 0) {
        currentStop = null;
        targetStop = nextStopAfter(headAngle);
      }
    } else {
      const step = (speed / path.trackRadius) * delta;
      const remaining = positiveAngle(targetStop.angle - headAngle);
      if (remaining <= step) {
        headAngle = targetStop.angle;
        currentStop = targetStop;
        dwell = 10;
      } else {
        headAngle = positiveAngle(headAngle + step);
      }
      wheelAngle -= speed * delta * 2.2;
    }
    cars.forEach(({ object }) => {
      object.userData.wheels?.forEach((wheel) => {
        wheel.rotation.x = wheelAngle;
      });
    });
    syncCars();
  }

  function requestArrival(stopId = 'nadi') {
    if (rider) return false;
    const stop = stops.find(({ id }) => id === stopId) ?? stops[0];
    if (dwell > 0 && currentStop?.id === stop.id) return true;
    headAngle = positiveAngle(stop.angle - 18 / path.trackRadius);
    targetStop = stop;
    currentStop = null;
    dwell = 0;
    syncCars();
    return true;
  }

  function canBoard(playerPosition) {
    const boardingPosition = boardingNormal.clone().multiplyScalar(PLANET_RADIUS + terrainHeightAt(boardingNormal) + 0.1);
    return dwell > 0 && playerPosition.distanceTo(boardingPosition) < 4.6;
  }

  function board() {
    if (dwell <= 0) return false;
    rider = true;
    dwell = Math.min(dwell, 2.8);
    return true;
  }

  function leave() {
    rider = false;
  }

  syncCars();

  return {
    group,
    update,
    requestArrival,
    canBoard,
    board,
    leave,
    get onboard() {
      return rider;
    },
    get stopped() {
      return dwell > 0;
    },
    get arriving() {
      return dwell <= 0;
    },
    get arrivalSeconds() {
      if (dwell > 0) return 0;
      return positiveAngle(targetStop.angle - headAngle) * path.trackRadius / speed;
    },
    get arrivingAt() {
      return dwell > 0 ? null : targetStop;
    },
    get stoppedAt() {
      return dwell > 0 ? currentStop : null;
    },
    get stationPosition() {
      const normal = path.directionAt(path.stationAngle);
      return normal.multiplyScalar(PLANET_RADIUS + terrainHeightAt(normal) + 0.1);
    },
    get stops() {
      return stops.map((stop) => ({ ...stop }));
    },
    closestStop(playerPosition) {
      let closest = null;
      stops.forEach((stop) => {
        const normal = path.directionAt(stop.angle);
        const position = normal.multiplyScalar(PLANET_RADIUS + terrainHeightAt(normal) + 0.1);
        const distance = playerPosition.distanceTo(position);
        if (!closest || distance < closest.distance) closest = { stop, position, distance };
      });
      return closest;
    },
    get boardingPosition() {
      return boardingNormal.clone().multiplyScalar(PLANET_RADIUS + terrainHeightAt(boardingNormal) + 0.1);
    },
    get riderNormal() {
      return boardingNormal.clone();
    },
    get riderForward() {
      return boardingTangent.clone();
    },
    get exitNormal() {
      const across = new THREE.Vector3().crossVectors(boardingNormal, boardingTangent).normalize();
      return boardingNormal.clone().addScaledVector(across, 4.25 / PLANET_RADIUS).normalize();
    },
  };
}
