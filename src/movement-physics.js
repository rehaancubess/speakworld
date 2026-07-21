import * as THREE from 'three';

export const DEFAULT_PLAYER_RADIUS = 0.34;

export function insidePlayableArea(position, radiusX = 11.9, radiusZ = 10.0, margin = 0.96) {
  return (position.x * position.x) / (radiusX * radiusX)
    + (position.z * position.z) / (radiusZ * radiusZ) < margin;
}

export function collidesWithObstacle(position, obstacles, options = {}) {
  const radius = options.radius ?? DEFAULT_PLAYER_RADIUS;
  const feet = position.y + (options.feetOffset ?? 0.08);
  const head = position.y + (options.height ?? 2.35);
  return obstacles.some(({ box }) => (
    position.x > box.min.x - radius
    && position.x < box.max.x + radius
    && position.z > box.min.z - radius
    && position.z < box.max.z + radius
    && head > box.min.y
    && feet < box.max.y
  ));
}

export function resolvePlanarMovement({
  position,
  velocity,
  delta,
  obstacles,
  terrainY,
  inside = insidePlayableArea,
  collides = collidesWithObstacle,
}) {
  let blockedX = false;
  let blockedZ = false;

  const nextX = position.clone();
  nextX.x += velocity.x * delta;
  nextX.y = terrainY(nextX);
  if (inside(nextX) && !collides(nextX, obstacles)) {
    position.copy(nextX);
  } else {
    velocity.x = 0;
    blockedX = true;
  }

  const nextZ = position.clone();
  nextZ.z += velocity.z * delta;
  nextZ.y = terrainY(nextZ);
  if (inside(nextZ) && !collides(nextZ, obstacles)) {
    position.copy(nextZ);
  } else {
    velocity.z = 0;
    blockedZ = true;
  }

  position.y = terrainY(position);
  return { blockedX, blockedZ };
}

export function obstacle(name, min, max) {
  return {
    name,
    box: new THREE.Box3(new THREE.Vector3(...min), new THREE.Vector3(...max)),
  };
}
