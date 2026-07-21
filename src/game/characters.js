import * as THREE from 'three';
import { COLORS, outlinedMesh } from './palette.js';
import { PLANET_RADIUS, placeOnDirection, placeOnSurface, surfacePoint, terrainHeightAt } from './world.js';

function capsuleLike(radius, length, color, segments = 8) {
  return outlinedMesh(new THREE.CapsuleGeometry(radius, length, 4, segments), color);
}

function makeCharacter({
  shirt = COLORS.red,
  trousers = COLORS.indigo,
  skin = 0xb97855,
  hair = COLORS.ink,
  backpack = false,
  scarf = null,
  scale = 1,
} = {}) {
  const root = new THREE.Group();
  const visual = new THREE.Group();
  visual.scale.setScalar(scale);
  root.add(visual);

  const torso = capsuleLike(0.38, 0.66, shirt, 7);
  torso.position.y = 1.58;
  torso.scale.set(1, 1, 0.76);
  visual.add(torso);

  const shirtHem = outlinedMesh(new THREE.CylinderGeometry(0.37, 0.42, 0.22, 8), shirt);
  shirtHem.position.y = 1.27;
  shirtHem.scale.z = 0.76;
  visual.add(shirtHem);

  const neck = capsuleLike(0.12, 0.05, skin, 7);
  neck.position.y = 2.18;
  visual.add(neck);

  const head = outlinedMesh(new THREE.SphereGeometry(0.34, 10, 8), skin);
  head.position.y = 2.48;
  head.scale.set(0.96, 1.05, 0.92);
  visual.add(head);

  const hairCap = outlinedMesh(
    new THREE.SphereGeometry(0.352, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.54),
    hair,
  );
  hairCap.position.y = 2.58;
  hairCap.scale.set(1, 1.04, 0.96);
  visual.add(hairCap);

  for (const side of [-1, 1]) {
    const ear = outlinedMesh(new THREE.SphereGeometry(0.075, 7, 6), skin);
    ear.position.set(side * 0.33, 2.49, 0);
    visual.add(ear);
  }

  const nose = outlinedMesh(new THREE.ConeGeometry(0.045, 0.11, 7), skin);
  nose.rotation.x = Math.PI * 0.5;
  nose.position.set(0, 2.46, 0.33);
  visual.add(nose);

  const eyeGeometry = new THREE.SphereGeometry(0.035, 6, 5);
  for (const x of [-0.12, 0.12]) {
    const eye = outlinedMesh(eyeGeometry, COLORS.black, { outline: false });
    eye.position.set(x, 2.49, 0.31);
    visual.add(eye);
  }

  const arms = [];
  for (const side of [-1, 1]) {
    const armPivot = new THREE.Group();
    armPivot.position.set(side * 0.39, 1.9, 0);
    armPivot.rotation.z = side * -0.08;
    const sleeve = capsuleLike(0.135, 0.18, shirt, 7);
    sleeve.position.y = -0.12;
    const forearm = capsuleLike(0.105, 0.38, skin, 7);
    forearm.position.y = -0.43;
    const hand = outlinedMesh(new THREE.SphereGeometry(0.12, 8, 7), skin);
    hand.scale.y = 1.16;
    hand.position.y = -0.72;
    armPivot.add(sleeve, forearm, hand);
    visual.add(armPivot);
    arms.push(armPivot);
  }

  const legs = [];
  for (const side of [-1, 1]) {
    const legPivot = new THREE.Group();
    legPivot.position.set(side * 0.19, 1.2, 0);
    const leg = capsuleLike(0.16, 0.61, trousers, 7);
    leg.position.y = -0.39;
    leg.scale.z = 0.9;
    const cuff = outlinedMesh(new THREE.CylinderGeometry(0.17, 0.15, 0.18, 8), trousers);
    cuff.position.y = -0.73;
    const shoe = outlinedMesh(new THREE.BoxGeometry(0.34, 0.2, 0.52), COLORS.yellow);
    shoe.position.set(0, -0.86, 0.12);
    shoe.rotation.x = -0.04;
    legPivot.add(leg, cuff, shoe);
    visual.add(legPivot);
    legs.push(legPivot);
  }

  if (backpack) {
    const bag = capsuleLike(0.31, 0.38, COLORS.ink, 7);
    bag.scale.set(0.94, 1, 0.58);
    bag.position.set(0, 1.7, -0.35);
    visual.add(bag);
    const flap = outlinedMesh(new THREE.BoxGeometry(0.48, 0.28, 0.12), COLORS.red);
    flap.position.set(0, 1.82, -0.61);
    const buckle = outlinedMesh(new THREE.BoxGeometry(0.1, 0.12, 0.05), COLORS.yellow);
    buckle.position.set(0, 1.72, -0.69);
    const loop = outlinedMesh(new THREE.TorusGeometry(0.13, 0.035, 6, 12, Math.PI), COLORS.ink);
    loop.position.set(0, 2.04, -0.36);
    loop.rotation.z = Math.PI;
    visual.add(flap, buckle, loop);
  }

  if (scarf) {
    const scarfMesh = outlinedMesh(new THREE.TorusGeometry(0.25, 0.08, 6, 12), scarf);
    scarfMesh.rotation.x = Math.PI * 0.5;
    scarfMesh.position.y = 2.17;
    visual.add(scarfMesh);
  }

  root.userData.visual = visual;
  root.userData.arms = arms;
  root.userData.legs = legs;
  return root;
}

const _surfaceMatrix = new THREE.Matrix4();
const _surfaceRight = new THREE.Vector3();
const _surfaceForward = new THREE.Vector3();

function orientOnPlanet(object, normal, forward, altitude = 0.1) {
  const up = normal.clone().normalize();
  _surfaceForward.copy(forward).addScaledVector(up, -forward.dot(up)).normalize();
  _surfaceRight.crossVectors(up, _surfaceForward).normalize();
  _surfaceMatrix.makeBasis(_surfaceRight, up, _surfaceForward);
  object.quaternion.setFromRotationMatrix(_surfaceMatrix);
  object.position.copy(up).multiplyScalar(PLANET_RADIUS + terrainHeightAt(up) + altitude);
}

export function createPlayer(obstacles) {
  const group = makeCharacter({
    shirt: COLORS.ink,
    trousers: COLORS.blue,
    skin: 0xb97c5d,
    hair: 0x2d2832,
    backpack: true,
  });
  group.name = 'Mahi, the language learner';

  const normal = surfacePoint(0, 11.2).normalize();
  const forward = surfacePoint(0, 11.0).sub(surfacePoint(0, 11.2)).normalize();
  const preparedObstacles = obstacles.map((obstacle) => ({
    normal: obstacle.normal?.clone().normalize() ?? surfacePoint(obstacle.x, obstacle.z).normalize(),
    radius: obstacle.radius,
  }));
  let walkTime = 0;
  let speed = 0;
  let moveTargetNormal = null;

  const carriedProp = new THREE.Group();
  const suitcase = outlinedMesh(new THREE.BoxGeometry(0.68, 0.52, 0.28), COLORS.brown);
  const suitcaseHandle = outlinedMesh(new THREE.TorusGeometry(0.16, 0.035, 6, 10, Math.PI), COLORS.ink);
  suitcaseHandle.rotation.z = Math.PI;
  suitcaseHandle.position.y = 0.31;
  carriedProp.add(suitcase, suitcaseHandle);
  carriedProp.position.set(0.62, 0.55, 0.06);
  carriedProp.rotation.z = -0.1;
  group.userData.visual.add(carriedProp);

  const cameraForward = new THREE.Vector3();
  const cameraRight = new THREE.Vector3();
  const desiredMove = new THREE.Vector3();
  const candidateNormal = new THREE.Vector3();
  const movementAxis = new THREE.Vector3();
  const transportedMove = new THREE.Vector3();

  function syncTransform() {
    orientOnPlanet(group, normal, forward, 0.1);
  }

  function collides(nextNormal) {
    return preparedObstacles.some((obstacle) => {
      const angle = Math.acos(THREE.MathUtils.clamp(nextNormal.dot(obstacle.normal), -1, 1));
      return angle * PLANET_RADIUS < obstacle.radius + 0.48;
    });
  }

  syncTransform();

  return {
    group,
    get speed() {
      return speed;
    },
    get worldPosition() {
      return normal.clone().multiplyScalar(PLANET_RADIUS + terrainHeightAt(normal) + 0.1);
    },
    get up() {
      return normal.clone();
    },
    get forward() {
      return forward.clone();
    },
    get normal() {
      return normal.clone();
    },
    update(delta, inputEnabled, keys, camera) {
      let inputRight = 0;
      let inputForward = 0;
      if (inputEnabled) {
        inputRight = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0)
          - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
        inputForward = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0)
          - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
      }

      let inputLength = Math.hypot(inputRight, inputForward);
      const lateralOnly = Math.abs(inputRight) > 0.01 && Math.abs(inputForward) < 0.01;
      desiredMove.set(0, 0, 0);
      if (inputLength > 0.01) {
        moveTargetNormal = null;
        camera.getWorldDirection(cameraForward);
        cameraForward.addScaledVector(normal, -cameraForward.dot(normal)).normalize();
        cameraRight.setFromMatrixColumn(camera.matrixWorld, 0);
        cameraRight.addScaledVector(normal, -cameraRight.dot(normal)).normalize();
        desiredMove
          .addScaledVector(cameraForward, inputForward / inputLength)
          .addScaledVector(cameraRight, inputRight / inputLength)
          .addScaledVector(normal, -desiredMove.dot(normal))
          .normalize();
      } else if (inputEnabled && moveTargetNormal) {
        const targetDot = THREE.MathUtils.clamp(normal.dot(moveTargetNormal), -1, 1);
        const targetDistance = Math.acos(targetDot) * PLANET_RADIUS;
        if (targetDistance < 0.28) {
          moveTargetNormal = null;
          inputLength = 0;
        } else {
          desiredMove.copy(moveTargetNormal).addScaledVector(normal, -targetDot).normalize();
          inputLength = 1;
        }
      }

      const running = keys.has('ShiftLeft') || keys.has('ShiftRight');
      const targetSpeed = inputLength > 0
        ? (lateralOnly ? (running ? 4.35 : 2.45) : (running ? 6.2 : 3.8))
        : 0;
      speed = THREE.MathUtils.damp(speed, targetSpeed, inputLength > 0 ? 10 : 14, delta);

      let turnAmount = 0;
      if (inputLength > 0.01 && desiredMove.lengthSq() > 0.5) {
        const stepAngle = (speed * delta) / PLANET_RADIUS;
        movementAxis.crossVectors(normal, desiredMove).normalize();
        candidateNormal.copy(normal).applyAxisAngle(movementAxis, stepAngle).normalize();
        transportedMove.copy(desiredMove).applyAxisAngle(movementAxis, stepAngle);

        if (!collides(candidateNormal)) {
          normal.copy(candidateNormal);
          forward.applyAxisAngle(movementAxis, stepAngle);
        } else {
          speed = THREE.MathUtils.damp(speed, 0, 18, delta);
        }

        transportedMove.addScaledVector(normal, -transportedMove.dot(normal)).normalize();
        const before = forward.clone();
        forward.lerp(transportedMove, 1 - Math.exp(-delta * (lateralOnly ? 6.4 : 10.5)));
        forward.addScaledVector(normal, -forward.dot(normal)).normalize();
        turnAmount = before.cross(forward).dot(normal);
      }

      syncTransform();

      const intensity = Math.min(1, speed / 3.2);
      walkTime += delta * speed * 3.4;
      group.userData.legs[0].rotation.x = Math.sin(walkTime) * 0.65 * intensity;
      group.userData.legs[1].rotation.x = -Math.sin(walkTime) * 0.65 * intensity;
      group.userData.arms[0].rotation.x = -Math.sin(walkTime) * 0.5 * intensity;
      group.userData.arms[1].rotation.x = Math.sin(walkTime) * 0.5 * intensity;
      group.userData.visual.position.y = Math.abs(Math.sin(walkTime * 2)) * 0.045 * intensity;
      group.userData.visual.rotation.z = -THREE.MathUtils.clamp(turnAmount * 0.16, -0.045, 0.045);
    },
    setMoveTarget(point) {
      moveTargetNormal = point.clone().normalize();
    },
    cancelMoveTarget() {
      moveTargetNormal = null;
    },
    teleportTo(x, y, z) {
      normal.set(x, y, z).normalize();
      forward.addScaledVector(normal, -forward.dot(normal));
      if (forward.lengthSq() < 0.01) {
        forward.crossVectors(Math.abs(normal.y) < 0.9 ? _surfaceRight.set(0, 1, 0) : _surfaceRight.set(1, 0, 0), normal);
      }
      forward.normalize();
      moveTargetNormal = null;
      speed = 0;
      syncTransform();
    },
    faceToward(x, y, z) {
      desiredMove.set(x, y, z).normalize();
      forward.copy(desiredMove).addScaledVector(normal, -desiredMove.dot(normal));
      if (forward.lengthSq() < 0.0001) return;
      forward.normalize();
      syncTransform();
    },
    setCarryingItem(item) {
      carriedProp.visible = item === 'suitcase';
    },
  };
}

export function createNpc({
  id,
  name,
  x,
  z,
  direction = null,
  yaw = 0,
  shirt,
  trousers,
  skin,
  hair,
  scarf,
  scale = 1,
}) {
  const group = makeCharacter({ shirt, trousers, skin, hair, scarf, scale });
  group.name = name;
  group.userData.id = id;
  group.userData.name = name;
  group.userData.mapPosition = new THREE.Vector2(x ?? 0, z ?? 0);
  group.userData.baseYaw = yaw;
  if (direction) {
    const normalDirection = Array.isArray(direction)
      ? new THREE.Vector3(...direction)
      : direction.clone();
    placeOnDirection(group, normalDirection, 0.1, yaw);
  } else {
    placeOnSurface(group, x, z, 0.1, yaw);
  }
  const normal = group.position.clone().normalize();
  const baseForward = new THREE.Vector3(0, 0, 1).applyQuaternion(group.quaternion).normalize();
  const animationSeed = direction ? normal.x * 19 + normal.z * 11 : x + z;
  let talking = false;
  let reaction = '';
  let reactionUntil = 0;

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.48 * scale, 18),
    new THREE.MeshBasicMaterial({ color: COLORS.ink, transparent: true, opacity: 0.2, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI * 0.5;
  shadow.position.y = 0.035;
  group.add(shadow);

  return {
    id,
    name,
    group,
    mapPosition: group.userData.mapPosition,
    regionNormal: normal.clone(),
    get worldPosition() {
      return group.position.clone();
    },
    update(elapsed) {
      group.userData.visual.position.y = Math.sin(elapsed * 1.4 + animationSeed) * 0.025;
      group.userData.visual.rotation.z = Math.sin(elapsed * 0.45 + animationSeed * 0.6) * 0.012;
      const arms = group.userData.arms;
      const reacting = reactionUntil > performance.now();
      if (reacting && reaction === 'happy') {
        arms[0].rotation.x = -0.72 + Math.sin(elapsed * 7) * 0.14;
        arms[1].rotation.x = -0.72 - Math.sin(elapsed * 7) * 0.14;
      } else if (reacting && reaction === 'confused') {
        arms[0].rotation.x = -0.85;
        arms[1].rotation.x = Math.sin(elapsed * 3) * 0.12;
      } else if (talking) {
        arms[0].rotation.x = Math.sin(elapsed * 3.2 + animationSeed) * 0.32 - 0.2;
        arms[1].rotation.x = Math.sin(elapsed * 3.2 + animationSeed + 2.1) * 0.28 - 0.12;
      } else {
        arms[0].rotation.x *= 0.86;
        arms[1].rotation.x *= 0.86;
      }
    },
    facePlayer(playerPosition) {
      talking = true;
      const targetForward = playerPosition.clone().addScaledVector(normal, -playerPosition.dot(normal)).normalize();
      orientOnPlanet(group, normal, targetForward, 0.1);
    },
    resetFacing() {
      talking = false;
      orientOnPlanet(group, normal, baseForward, 0.1);
    },
    react(type) {
      reaction = type;
      reactionUntil = performance.now() + 1200;
    },
  };
}

export function createQuestMarker() {
  const group = new THREE.Group();
  const diamond = outlinedMesh(new THREE.OctahedronGeometry(0.35, 0), COLORS.red);
  diamond.rotation.z = Math.PI * 0.25;
  const ring = outlinedMesh(new THREE.TorusGeometry(0.56, 0.055, 6, 18), COLORS.paper);
  ring.rotation.x = Math.PI * 0.5;
  group.add(diamond, ring);
  group.userData.baseY = 3.55;
  group.position.y = group.userData.baseY;
  group.visible = false;
  return {
    group,
    attachTo(npc) {
      if (group.parent) group.parent.remove(group);
      npc.group.add(group);
      group.position.set(0, group.userData.baseY, 0);
      group.visible = true;
    },
    hide() {
      group.visible = false;
    },
    update(elapsed) {
      group.rotation.y = elapsed * 1.5;
      group.position.y = group.userData.baseY + Math.sin(elapsed * 2.4) * 0.16;
    },
  };
}
