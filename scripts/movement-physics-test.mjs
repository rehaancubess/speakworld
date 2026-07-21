import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  collidesWithObstacle,
  insidePlayableArea,
  obstacle,
  resolvePlanarMovement,
} from '../src/movement-physics.js';

const flatGround = () => 0;

{
  const position = new THREE.Vector3(0, 0, 0);
  const velocity = new THREE.Vector3(2, 0, -1);
  const result = resolvePlanarMovement({ position, velocity, delta: 0.5, obstacles: [], terrainY: flatGround });
  assert.deepEqual(result, { blockedX: false, blockedZ: false });
  assert.equal(position.x, 1);
  assert.equal(position.z, -0.5);
}

{
  const wall = obstacle('wall', [0.8, -1, -2], [1.4, 3, 2]);
  const position = new THREE.Vector3(0, 0, 0);
  const velocity = new THREE.Vector3(2, 0, -1);
  const result = resolvePlanarMovement({ position, velocity, delta: 0.5, obstacles: [wall], terrainY: flatGround });
  assert.equal(result.blockedX, true, 'the wall must block the X component');
  assert.equal(result.blockedZ, false, 'the free Z component must slide along the wall');
  assert.equal(position.x, 0);
  assert.equal(position.z, -0.5);
}

{
  const position = new THREE.Vector3(11.7, 0, 0);
  const velocity = new THREE.Vector3(2, 0, 0);
  const result = resolvePlanarMovement({ position, velocity, delta: 0.5, obstacles: [], terrainY: flatGround });
  assert.equal(result.blockedX, true, 'the plateau boundary must be solid');
  assert.equal(position.x, 11.7);
}

{
  const tree = obstacle('tree', [-0.5, -0.2, -0.5], [0.5, 3.2, 0.5]);
  assert.equal(collidesWithObstacle(new THREE.Vector3(0.7, 0, 0), [tree]), true);
  assert.equal(collidesWithObstacle(new THREE.Vector3(1.2, 0, 0), [tree]), false);
  assert.equal(insidePlayableArea(new THREE.Vector3(0, 0, 0)), true);
  assert.equal(insidePlayableArea(new THREE.Vector3(20, 0, 0)), false);
}

console.log('movement physics: all checks passed');
