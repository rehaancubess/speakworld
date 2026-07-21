import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { COLORS, inkMaterial, outlinedMesh, toonMaterial } from './palette.js';

export const PLANET_RADIUS = 58;
const MOUNTAIN_RELIEF_RADIUS = 54;
const MOUNTAIN_RELIEF_HEIGHT = 9.2;
const SURFACE_OFFSET = 0.035;
const _up = new THREE.Vector3(0, 1, 0);
const RAIL_LATITUDE = 0.32;
const RAIL_HORIZONTAL_RADIUS = Math.sqrt(1 - RAIL_LATITUDE * RAIL_LATITUDE);

export function terrainHeightAt(direction) {
  const normal = direction.clone().normalize();
  const distance = Math.acos(THREE.MathUtils.clamp(normal.dot(MOUNTAIN_SUMMIT_DIRECTION), -1, 1)) * PLANET_RADIUS;
  const shoulder = THREE.MathUtils.clamp(1 - distance / MOUNTAIN_RELIEF_RADIUS, 0, 1);
  const eased = shoulder * shoulder * (3 - 2 * shoulder);
  return eased * MOUNTAIN_RELIEF_HEIGHT;
}

export function surfacePoint(x, z, altitude = 0) {
  const safe = Math.min(x * x + z * z, PLANET_RADIUS * PLANET_RADIUS * 0.96);
  const y = Math.sqrt(PLANET_RADIUS * PLANET_RADIUS - safe);
  const normal = new THREE.Vector3(x, y, z).normalize();
  return normal.multiplyScalar(PLANET_RADIUS + terrainHeightAt(normal) + altitude);
}

export function placeOnSurface(object, x, z, altitude = 0, yaw = 0) {
  const point = surfacePoint(x, z, altitude);
  const normal = point.clone().normalize();
  object.position.copy(point);
  object.quaternion.setFromUnitVectors(_up, normal);
  object.rotateY(yaw);
  return object;
}

export function placeOnDirection(object, direction, altitude = 0, yaw = 0) {
  const normal = direction.clone().normalize();
  object.position.copy(normal).multiplyScalar(PLANET_RADIUS + terrainHeightAt(normal) + altitude);
  object.quaternion.setFromUnitVectors(_up, normal);
  object.rotateY(yaw);
  return object;
}

function groundPatch(x, z, width, depth, color, yaw = 0, altitude = SURFACE_OFFSET, segments = 8) {
  const positions = [];
  const indices = [];
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);

  for (let iz = 0; iz <= segments; iz += 1) {
    for (let ix = 0; ix <= segments; ix += 1) {
      const lx = (ix / segments - 0.5) * width;
      const lz = (iz / segments - 0.5) * depth;
      const wx = x + lx * cos - lz * sin;
      const wz = z + lx * sin + lz * cos;
      const p = surfacePoint(wx, wz, altitude);
      positions.push(p.x, p.y, p.z);
    }
  }

  for (let iz = 0; iz < segments; iz += 1) {
    for (let ix = 0; ix < segments; ix += 1) {
      const a = iz * (segments + 1) + ix;
      const b = a + 1;
      const c = a + segments + 1;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const material = toonMaterial(color, { side: THREE.DoubleSide }).clone();
  material.userData.outlineParameters = { visible: false };
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  return mesh;
}

function groundDisc(x, z, radius, color, altitude = SURFACE_OFFSET, segments = 48) {
  const positions = [];
  const indices = [];
  const center = surfacePoint(x, z, altitude);
  positions.push(center.x, center.y, center.z);
  for (let i = 0; i <= segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2;
    const edge = surfacePoint(x + Math.cos(angle) * radius, z + Math.sin(angle) * radius, altitude);
    positions.push(edge.x, edge.y, edge.z);
    if (i > 0) indices.push(0, i, i + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const material = toonMaterial(color, { side: THREE.DoubleSide }).clone();
  material.userData.outlineParameters = { visible: false };
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  return mesh;
}

function directionDisc(direction, radius, color, altitude = SURFACE_OFFSET, segments = 48) {
  const centerNormal = direction.clone().normalize();
  const tangentA = new THREE.Vector3().crossVectors(_up, centerNormal);
  if (tangentA.lengthSq() < 0.02) tangentA.crossVectors(new THREE.Vector3(1, 0, 0), centerNormal);
  tangentA.normalize();
  const tangentB = new THREE.Vector3().crossVectors(centerNormal, tangentA).normalize();
  const positions = [];
  const indices = [];
  const center = centerNormal.clone().multiplyScalar(PLANET_RADIUS + terrainHeightAt(centerNormal) + altitude);
  positions.push(center.x, center.y, center.z);
  const radialSegments = Math.max(2, Math.ceil(radius / 1.25));
  for (let ring = 1; ring <= radialSegments; ring += 1) {
    const ringRadius = radius * ring / radialSegments;
    const currentStart = 1 + (ring - 1) * segments;
    const previousStart = currentStart - segments;
    for (let i = 0; i < segments; i += 1) {
      const angle = (i / segments) * Math.PI * 2;
      const point = centerNormal.clone()
        .addScaledVector(tangentA, Math.cos(angle) * ringRadius / PLANET_RADIUS)
        .addScaledVector(tangentB, Math.sin(angle) * ringRadius / PLANET_RADIUS)
        .normalize();
      point.multiplyScalar(PLANET_RADIUS + terrainHeightAt(point) + altitude);
      positions.push(point.x, point.y, point.z);
    }
    for (let i = 0; i < segments; i += 1) {
      const next = (i + 1) % segments;
      if (ring === 1) {
        indices.push(0, currentStart + i, currentStart + next);
      } else {
        const a = previousStart + i;
        const b = previousStart + next;
        const c = currentStart + i;
        const d = currentStart + next;
        indices.push(a, c, b, b, c, d);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const material = toonMaterial(color, { side: THREE.DoubleSide }).clone();
  material.userData.outlineParameters = { visible: false };
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  return mesh;
}

function box(width, height, depth, color, options = {}) {
  const radius = Math.min(options.radius ?? 0.025, width * 0.18, height * 0.18, depth * 0.18);
  const geometry = radius > 0.026
    ? new RoundedBoxGeometry(width, height, depth, 2, radius)
    : new THREE.BoxGeometry(width, height, depth);
  const mesh = outlinedMesh(geometry, color, options);
  if (options.outline === false) {
    mesh.material = mesh.material.clone();
    mesh.material.userData.outlineParameters = { visible: false };
  }
  mesh.position.y = height * 0.5;
  return mesh;
}

function cylinder(radiusTop, radiusBottom, height, color, segments = 9, options = {}) {
  const mesh = outlinedMesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments),
    color,
    options,
  );
  mesh.position.y = height * 0.5;
  return mesh;
}

function createSign(text, background = '#e9ead6', foreground = '#263538', width = 2.4, height = 0.68) {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 190;
  const context = canvas.getContext('2d');
  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = foreground;
  context.lineWidth = 15;
  context.strokeRect(9, 9, canvas.width - 18, canvas.height - 18);
  context.fillStyle = foreground;
  context.font = '700 72px Arial, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, canvas.width / 2, canvas.height / 2 + 4, canvas.width - 60);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const signMaterial = new THREE.MeshBasicMaterial({ map: texture, side: THREE.FrontSide });
  // The border is already painted into the texture. Applying the silhouette
  // shader to a thin, double-sided plane can stretch into a dark wedge when
  // viewed edge-on from the spherical world's changing camera angles.
  signMaterial.userData.outlineParameters = { visible: false };
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(width, height), signMaterial);
  sign.castShadow = true;
  return sign;
}

function addWindow(group, x, y, frontZ, trim, pane = COLORS.sky, width = 0.72, height = 0.82) {
  const frame = box(width + 0.14, height + 0.14, 0.1, trim, { castShadow: false });
  frame.position.set(x, y, frontZ + 0.04);
  const glass = box(width, height, 0.12, pane, { castShadow: false, radius: 0.04 });
  glass.position.set(x, y, frontZ + 0.11);
  const sill = box(width + 0.22, 0.1, 0.22, COLORS.paper, { castShadow: false });
  sill.position.set(x, y - height * 0.55, frontZ + 0.15);
  const mullion = box(0.055, height, 0.06, trim, { castShadow: false });
  mullion.position.set(x, y, frontZ + 0.2);
  group.add(frame, glass, sill, mullion);
}

function addBalcony(group, y, width, frontZ, color) {
  const slab = box(width, 0.14, 0.84, COLORS.stone);
  slab.position.set(0, y, frontZ + 0.35);
  const railHeight = 0.62;
  const topRail = box(width, 0.065, 0.065, color, { castShadow: false });
  topRail.position.set(0, y + railHeight, frontZ + 0.72);
  group.add(slab, topRail);
  for (let x = -width * 0.44; x <= width * 0.44; x += 0.36) {
    const bar = box(0.045, railHeight, 0.045, color, { castShadow: false });
    bar.position.set(x, y + railHeight * 0.53, frontZ + 0.72);
    group.add(bar);
  }
}

function addAirConditioner(group, x, y, frontZ) {
  const body = box(0.68, 0.42, 0.3, COLORS.paper, { castShadow: false, radius: 0.055 });
  body.position.set(x, y, frontZ + 0.18);
  const vent = box(0.52, 0.07, 0.035, COLORS.ink, { castShadow: false });
  vent.position.set(x, y - 0.11, frontZ + 0.35);
  group.add(body, vent);
}

function addRoofTank(group, height, x, color = COLORS.black) {
  const standTop = height + 0.72;
  for (const sx of [-0.34, 0.34]) {
    const leg = box(0.07, 0.72, 0.07, COLORS.ink);
    leg.position.set(x + sx, height + 0.36, 0);
    group.add(leg);
  }
  const tank = cylinder(0.48, 0.48, 0.82, color, 12);
  tank.position.set(x, standTop + 0.36, 0);
  const band = outlinedMesh(new THREE.TorusGeometry(0.49, 0.035, 5, 14), COLORS.ink);
  band.position.set(x, standTop + 0.38, 0);
  band.rotation.x = Math.PI * 0.5;
  group.add(tank, band);
}

function createFacade({
  x,
  z,
  yaw,
  width = 5.1,
  depth = 3.4,
  floors = 3,
  color = COLORS.paper,
  trim = COLORS.red,
  sign = null,
  shop = false,
  balcony = true,
  roofTank = false,
  seed = 0,
}) {
  const group = new THREE.Group();
  const floorHeight = 1.72;
  const totalHeight = floors * floorHeight + 0.22;
  const frontZ = depth * 0.5;

  const body = box(width, totalHeight, depth, color, { radius: 0.045 });
  group.add(body);

  const base = box(width + 0.08, 0.35, depth + 0.06, trim);
  base.position.y = 0.18;
  const roof = box(width + 0.22, 0.18, depth + 0.22, COLORS.stone);
  roof.position.y = totalHeight + 0.09;
  const parapetFront = box(width + 0.2, 0.42, 0.12, trim);
  parapetFront.position.set(0, totalHeight + 0.36, frontZ + 0.06);
  group.add(base, roof, parapetFront);

  if (shop) {
    const shutter = box(width * 0.56, 1.28, 0.12, COLORS.indigo, { castShadow: false });
    shutter.position.set(-width * 0.12, 0.83, frontZ + 0.08);
    group.add(shutter);
    for (let sy = 0.36; sy < 1.35; sy += 0.17) {
      const groove = box(width * 0.5, 0.025, 0.035, COLORS.ink, { castShadow: false });
      groove.position.set(-width * 0.12, sy, frontZ + 0.16);
      group.add(groove);
    }
    const door = box(0.72, 1.5, 0.14, COLORS.brown, { castShadow: false, radius: 0.035 });
    door.position.set(width * 0.35, 0.86, frontZ + 0.09);
    const awning = box(width * 0.86, 0.13, 0.85, trim, { radius: 0.04 });
    awning.position.set(0, 1.62, frontZ + 0.38);
    awning.rotation.x = -0.12;
    group.add(door, awning);
  } else {
    const door = box(0.76, 1.48, 0.14, trim, { castShadow: false, radius: 0.045 });
    door.position.set(-width * 0.25, 0.84, frontZ + 0.09);
    group.add(door);
    addWindow(group, width * 0.24, 0.98, frontZ, COLORS.ink, COLORS.teal, 0.82, 0.88);
  }

  for (let floor = 1; floor < floors; floor += 1) {
    const y = floor * floorHeight + 0.86;
    const offset = floor % 2 ? 0.05 : -0.08;
    addWindow(group, -width * 0.27 + offset, y, frontZ, COLORS.ink, COLORS.sky);
    addWindow(group, width * 0.27 + offset, y, frontZ, COLORS.ink, floor % 2 ? COLORS.teal : COLORS.sky);
    const band = box(width + 0.04, 0.095, 0.12, floor % 2 ? trim : COLORS.stone, { castShadow: false });
    band.position.set(0, floor * floorHeight + 0.12, frontZ + 0.06);
    group.add(band);
  }

  if (balcony && floors > 2) addBalcony(group, floorHeight * 1.82, width * 0.78, frontZ, COLORS.ink);
  if ((seed + floors) % 2 === 0 && floors > 2) addAirConditioner(group, width * 0.35, floorHeight * 2.55, frontZ);

  if (sign) {
    const signMesh = createSign(sign, seed % 2 ? '#dba347' : '#e9ead6', '#263538', width * 0.72, 0.57);
    signMesh.position.set(0, shop ? 1.98 : totalHeight - 0.48, frontZ + 0.14);
    group.add(signMesh);
  }

  if (roofTank) addRoofTank(group, totalHeight + 0.18, width * 0.18, seed % 2 ? COLORS.black : COLORS.teal);

  // Drainpipe and small service boxes break up the perfect procedural silhouette.
  const pipe = cylinder(0.045, 0.055, totalHeight * 0.83, COLORS.ink, 7, { castShadow: false });
  pipe.position.set(-width * 0.47, totalHeight * 0.42, frontZ + 0.12);
  group.add(pipe);
  if (seed % 3 === 0) {
    const meter = box(0.35, 0.48, 0.16, COLORS.stone, { castShadow: false, radius: 0.035 });
    meter.position.set(width * 0.44, 1.08, frontZ + 0.12);
    group.add(meter);
  }

  placeOnSurface(group, x, z, 0.035, yaw);
  return { group, obstacle: { x, z, radius: depth * 0.53 } };
}

function createTree(x, z, scale = 1, color = COLORS.darkGrass) {
  const group = new THREE.Group();
  const trunk = cylinder(0.14 * scale, 0.23 * scale, 1.7 * scale, COLORS.brown, 7);
  const crownShapes = [
    [0, 1.9, 0, 0.82, color],
    [0.53, 1.72, 0.06, 0.64, COLORS.grass],
    [-0.49, 1.75, -0.08, 0.61, color],
    [0.08, 2.38, -0.03, 0.58, COLORS.grass],
  ];
  group.add(trunk);
  crownShapes.forEach(([cx, cy, cz, radius, shade]) => {
    const crown = outlinedMesh(new THREE.DodecahedronGeometry(radius * scale, 0), shade);
    crown.position.set(cx * scale, cy * scale, cz * scale);
    group.add(crown);
  });
  placeOnSurface(group, x, z, 0, (x + z) * 0.17);
  return group;
}

function createUtilityPole(x, z, yaw = 0) {
  const group = new THREE.Group();
  const pole = cylinder(0.07, 0.11, 4.25, COLORS.ink, 8);
  const crossbar = box(1.05, 0.09, 0.09, COLORS.ink);
  crossbar.position.set(0, 3.82, 0);
  group.add(pole, crossbar);
  for (const px of [-0.43, 0, 0.43]) {
    const insulator = cylinder(0.075, 0.1, 0.18, COLORS.paper, 7);
    insulator.position.set(px, 3.96, 0);
    group.add(insulator);
  }
  placeOnSurface(group, x, z, 0, yaw);
  return group;
}

function createCableSpan(z, height = 4.15, offset = 0) {
  const group = new THREE.Group();
  const cableMaterial = toonMaterial(COLORS.ink).clone();
  cableMaterial.userData.outlineParameters = { thickness: 0.00055, color: [0.09, 0.14, 0.15] };
  for (let i = 0; i < 3; i += 1) {
    const y = height + i * 0.13;
    const zOffset = offset + (i - 1) * 0.13;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-5.55, y, zOffset),
      new THREE.Vector3(-2.8, y - 0.42 - i * 0.04, zOffset + 0.04),
      new THREE.Vector3(0, y - 0.62 - i * 0.05, zOffset - 0.02),
      new THREE.Vector3(2.8, y - 0.4, zOffset + 0.03),
      new THREE.Vector3(5.55, y, zOffset),
    ]);
    const cable = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 28, 0.012, 5, false),
      cableMaterial,
    );
    cable.castShadow = true;
    group.add(cable);
  }
  placeOnSurface(group, 0, z, 0.03, 0);
  return group;
}

function createStreetLamp(x, z, side = 1) {
  const group = new THREE.Group();
  const pole = cylinder(0.05, 0.075, 2.65, COLORS.ink, 7);
  const arm = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0, 2.45, 0),
        new THREE.Vector3(side * 0.22, 2.78, 0),
        new THREE.Vector3(side * 0.54, 2.54, 0),
      ),
      10,
      0.045,
      6,
      false,
    ),
    toonMaterial(COLORS.ink),
  );
  const shade = cylinder(0.28, 0.12, 0.23, COLORS.yellow, 10);
  shade.position.set(side * 0.54, 2.39, 0);
  shade.rotation.z = Math.PI;
  group.add(pole, arm, shade);
  placeOnSurface(group, x, z, 0, 0);
  return group;
}

function createAutoRickshaw(x, z, yaw = 0) {
  const group = new THREE.Group();
  const chassis = box(1.22, 0.44, 1.95, COLORS.yellow, { radius: 0.09 });
  chassis.position.y = 0.57;
  const cabin = box(1.13, 1.04, 1.18, COLORS.darkGrass, { radius: 0.12 });
  cabin.position.set(0, 1.25, -0.2);
  const windshield = box(0.92, 0.52, 0.08, COLORS.sky, { castShadow: false, radius: 0.035 });
  windshield.position.set(0, 1.46, 0.41);
  windshield.rotation.x = -0.09;
  const canopy = box(1.28, 0.16, 1.35, COLORS.ink, { radius: 0.1 });
  canopy.position.set(0, 1.83, -0.18);
  const bumper = box(0.76, 0.1, 0.12, COLORS.paper);
  bumper.position.set(0, 0.43, 1.02);
  group.add(chassis, cabin, windshield, canopy, bumper);
  const wheelGeometry = new THREE.CylinderGeometry(0.27, 0.27, 0.16, 10);
  for (const [wx, wz] of [[-0.62, -0.55], [0.62, -0.55], [0, 0.81]]) {
    const wheel = outlinedMesh(wheelGeometry, COLORS.black);
    wheel.position.set(wx, 0.32, wz);
    wheel.rotation.z = Math.PI * 0.5;
    group.add(wheel);
  }
  placeOnSurface(group, x, z, 0.1, yaw);
  return { group, obstacle: { x, z, radius: 1.05 } };
}

function createScooter(x, z, yaw = 0, color = COLORS.red) {
  const group = new THREE.Group();
  const wheelGeometry = new THREE.CylinderGeometry(0.24, 0.24, 0.1, 12);
  for (const wz of [-0.55, 0.57]) {
    const wheel = outlinedMesh(wheelGeometry, COLORS.black);
    wheel.position.set(0, 0.26, wz);
    wheel.rotation.z = Math.PI * 0.5;
    group.add(wheel);
  }
  const body = box(0.42, 0.42, 1.04, color, { radius: 0.14 });
  body.position.set(0, 0.55, -0.02);
  body.rotation.x = -0.05;
  const seat = box(0.38, 0.14, 0.58, COLORS.ink, { radius: 0.08 });
  seat.position.set(0, 0.9, -0.18);
  const handle = cylinder(0.035, 0.045, 0.86, COLORS.ink, 7);
  handle.position.set(0, 0.96, 0.4);
  handle.rotation.x = -0.22;
  const headlight = outlinedMesh(new THREE.SphereGeometry(0.13, 9, 7), COLORS.paper);
  headlight.position.set(0, 1.28, 0.53);
  group.add(body, seat, handle, headlight);
  placeOnSurface(group, x, z, 0.08, yaw);
  return group;
}

function createPostbox(x, z, yaw = 0) {
  const group = new THREE.Group();
  const body = cylinder(0.4, 0.44, 1.12, COLORS.red, 11);
  const cap = outlinedMesh(
    new THREE.SphereGeometry(0.405, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.53),
    COLORS.red,
  );
  cap.position.y = 1.12;
  const slot = box(0.5, 0.09, 0.08, COLORS.ink, { castShadow: false });
  slot.position.set(0, 0.87, 0.39);
  const label = createSign('DAAK', '#e9ead6', '#263538', 0.55, 0.22);
  label.position.set(0, 0.62, 0.45);
  group.add(body, cap, slot, label);
  placeOnSurface(group, x, z, 0.02, yaw);
  return group;
}

function createChaiStall(x, z, yaw = 0) {
  const group = new THREE.Group();
  const counter = box(1.72, 1, 0.95, COLORS.teal, { radius: 0.055 });
  const canopy = box(2.4, 0.14, 1.55, COLORS.red, { radius: 0.04 });
  canopy.position.y = 2.35;
  const back = box(1.72, 1.32, 0.12, COLORS.yellow);
  back.position.set(0, 1.42, -0.44);
  group.add(counter, canopy, back);
  for (const px of [-0.92, 0.92]) {
    const pole = cylinder(0.045, 0.055, 2.3, COLORS.ink, 6);
    pole.position.x = px;
    group.add(pole);
  }
  const kettle = outlinedMesh(new THREE.SphereGeometry(0.25, 10, 7), COLORS.stone);
  kettle.scale.y = 0.72;
  kettle.position.set(0.4, 1.2, 0.02);
  const sign = createSign('CHAI  ₹10', '#dba347', '#263538', 1.65, 0.48);
  sign.position.set(0, 2.06, 0.52);
  group.add(kettle, sign);
  placeOnSurface(group, x, z, 0.04, yaw);
  return { group, obstacle: { x, z, radius: 1.02 } };
}

function createHandcart(x, z, yaw = 0) {
  const group = new THREE.Group();
  const cart = box(1.25, 0.22, 0.88, COLORS.blue, { radius: 0.05 });
  cart.position.y = 0.75;
  group.add(cart);
  const wheelGeometry = new THREE.CylinderGeometry(0.33, 0.33, 0.1, 12);
  for (const wx of [-0.62, 0.62]) {
    const wheel = outlinedMesh(wheelGeometry, COLORS.ink);
    wheel.position.set(wx, 0.45, 0);
    wheel.rotation.z = Math.PI * 0.5;
    group.add(wheel);
  }
  for (let i = 0; i < 6; i += 1) {
    const fruit = outlinedMesh(new THREE.IcosahedronGeometry(0.15, 0), i % 2 ? COLORS.yellow : COLORS.red);
    fruit.position.set(-0.42 + (i % 3) * 0.42, 0.96 + Math.floor(i / 3) * 0.18, -0.18 + (i % 2) * 0.3);
    group.add(fruit);
  }
  placeOnSurface(group, x, z, 0.03, yaw);
  return group;
}

function createVegetableMarket(x, z, yaw = 0) {
  const group = new THREE.Group();
  const counter = box(2.7, 0.82, 1.05, COLORS.blue, { radius: 0.055 });
  const canopy = box(3.45, 0.14, 1.85, COLORS.yellow, { radius: 0.045 });
  canopy.position.y = 2.42;
  const backWall = box(2.72, 1.38, 0.11, COLORS.saffron);
  backWall.position.set(0, 1.4, -0.49);
  group.add(counter, canopy, backWall);

  for (const px of [-1.35, 1.35]) {
    const pole = cylinder(0.045, 0.055, 2.38, COLORS.ink, 6);
    pole.position.x = px;
    group.add(pole);
  }

  const sign = createSign('सब्ज़ी  BAZAAR', '#cf654b', '#e9ead6', 2.45, 0.48);
  sign.position.set(0, 2.13, 0.57);
  group.add(sign);

  const crateColors = [COLORS.red, COLORS.grass, COLORS.yellow];
  for (let crateIndex = 0; crateIndex < 3; crateIndex += 1) {
    const crate = box(0.72, 0.22, 0.68, COLORS.brown, { radius: 0.025 });
    crate.position.set(-0.82 + crateIndex * 0.82, 1.02, 0.05);
    group.add(crate);
    for (let item = 0; item < 7; item += 1) {
      const vegetable = outlinedMesh(
        new THREE.IcosahedronGeometry(0.105 + (item % 2) * 0.015, 0),
        crateColors[crateIndex],
      );
      vegetable.position.set(
        -1.04 + crateIndex * 0.82 + (item % 3) * 0.21,
        1.19 + Math.floor(item / 3) * 0.12,
        -0.12 + (item % 2) * 0.25,
      );
      group.add(vegetable);
    }
  }

  const scalePost = cylinder(0.035, 0.04, 0.72, COLORS.ink, 6);
  scalePost.position.set(1.02, 1.52, 0.15);
  const scaleTray = cylinder(0.24, 0.2, 0.055, COLORS.paper, 12);
  scaleTray.position.set(1.02, 1.9, 0.15);
  group.add(scalePost, scaleTray);

  placeOnSurface(group, x, z, 0.04, yaw);
  return { group, obstacle: { x, z, radius: 1.28 } };
}

function createRailwayStop() {
  const group = new THREE.Group();
  const platform = box(7.8, 0.28, 3.2, COLORS.paper, { radius: 0.05, outline: false });
  platform.position.y = 0.14;
  const building = box(4.5, 2.65, 2.25, COLORS.teal, { radius: 0.055, outline: false });
  building.position.set(-1.1, 1.48, -0.35);
  const roof = box(4.85, 0.16, 2.55, COLORS.red, { outline: false });
  roof.position.set(-1.1, 2.88, -0.35);
  const ticketWindow = box(1.2, 0.72, 0.12, COLORS.sky, { castShadow: false });
  ticketWindow.position.set(-1.2, 1.38, 0.81);
  const door = box(0.74, 1.5, 0.13, COLORS.indigo, { castShadow: false });
  door.position.set(0.65, 0.9, 0.81);
  group.add(platform, building, roof, ticketWindow, door);

  const sign = createSign('नदी पारा  JN.', '#e9ead6', '#263538', 3.1, 0.54);
  sign.position.set(-1.1, 2.25, 0.84);
  group.add(sign);

  const canopy = box(3.1, 0.12, 1.15, COLORS.yellow, { outline: false });
  canopy.position.set(2.35, 2.25, 0.42);
  group.add(canopy);
  for (const px of [1.05, 3.65]) {
    const pole = cylinder(0.045, 0.055, 2.2, COLORS.ink, 6);
    pole.position.set(px, 1.1, 0.42);
    group.add(pole);
  }
  const benchSeat = box(1.7, 0.12, 0.45, COLORS.brown);
  benchSeat.position.set(2.35, 0.62, 0.18);
  const benchBack = box(1.7, 0.58, 0.1, COLORS.brown);
  benchBack.position.set(2.35, 0.9, -0.02);
  group.add(benchSeat, benchBack);

  for (const railX of [-1.05, 1.05]) {
    const rail = box(0.08, 0.08, 9.2, COLORS.ink, { castShadow: false });
    rail.position.set(railX, 0.05, 3.35);
    group.add(rail);
  }
  return group;
}

function createRailTown(stop, accent, wallColor, serviceHindi, serviceEnglish) {
  const group = new THREE.Group();
  group.name = `${stop.name} rail town`;

  const platform = box(3.65, 0.3, 10.5, COLORS.paper, { radius: 0.05, outline: false });
  platform.position.set(2.75, 0.15, 0);
  const square = box(5.2, 0.16, 13.5, COLORS.roadLight, { radius: 0.04, outline: false });
  square.position.set(7.05, 0.08, 0);
  group.add(platform, square);

  const shelterRoof = box(2.65, 0.14, 4.5, accent, { outline: false });
  shelterRoof.position.set(3.0, 2.35, -0.2);
  group.add(shelterRoof);
  for (const z of [-1.85, 1.45]) {
    const pole = cylinder(0.055, 0.065, 2.28, COLORS.ink, 7);
    pole.position.set(3.0, 1.14, z);
    group.add(pole);
  }

  const stationSign = createSign(`${stop.hindi}  ${stop.name.toUpperCase()}`, '#e9ead6', '#263538', 3.3, 0.58);
  stationSign.position.set(4.48, 1.8, 0);
  stationSign.rotation.y = -Math.PI * 0.5;
  group.add(stationSign);

  const office = box(3.65, 2.85, 4.2, wallColor, { radius: 0.06, outline: false });
  office.position.set(8.0, 1.5, 0);
  const officeRoof = box(4.0, 0.18, 4.55, accent, { outline: false });
  officeRoof.position.set(8.0, 3.0, 0);
  const door = box(0.82, 1.65, 0.13, COLORS.indigo);
  door.position.set(6.13, 0.93, -0.85);
  door.rotation.y = Math.PI * 0.5;
  const window = box(0.13, 0.78, 1.18, COLORS.sky);
  window.position.set(6.13, 1.55, 0.95);
  group.add(office, officeRoof, door, window);

  const serviceSign = createSign(`${serviceHindi}  ${serviceEnglish}`, '#263538', '#f3d267', 2.8, 0.52);
  serviceSign.position.set(6.08, 2.42, 0);
  serviceSign.rotation.y = -Math.PI * 0.5;
  group.add(serviceSign);

  for (const z of [-4.4, 3.85]) {
    const kiosk = box(2.55, 2.05, 2.7, z < 0 ? COLORS.saffron : COLORS.teal, { radius: 0.045, outline: false });
    kiosk.position.set(7.45, 1.08, z);
    const awning = box(2.85, 0.13, 0.9, z < 0 ? COLORS.red : COLORS.yellow, { outline: false });
    awning.position.set(6.1, 1.95, z);
    awning.rotation.y = Math.PI * 0.5;
    group.add(kiosk, awning);
  }

  const bench = box(1.8, 0.13, 0.48, COLORS.brown);
  bench.position.set(2.85, 0.58, 2.8);
  const benchBack = box(1.8, 0.6, 0.11, COLORS.brown);
  benchBack.position.set(2.85, 0.9, 3.02);
  group.add(bench, benchBack);

  for (const z of [-5.2, 5.15]) {
    const lamp = cylinder(0.045, 0.06, 2.85, COLORS.ink, 7);
    lamp.position.set(4.25, 1.43, z);
    const glow = outlinedMesh(new THREE.SphereGeometry(0.18, 9, 7), COLORS.paper);
    glow.position.set(4.25, 2.92, z);
    group.add(lamp, glow);
  }

  return group;
}

function createFestivalLantern(color, accent) {
  const group = new THREE.Group();
  const pole = cylinder(0.045, 0.065, 2.75, COLORS.ink, 7);
  pole.position.y = 1.375;
  const lantern = outlinedMesh(new THREE.SphereGeometry(0.28, 9, 7), color);
  lantern.scale.y = 1.25;
  lantern.position.y = 2.75;
  const cap = outlinedMesh(new THREE.CylinderGeometry(0.16, 0.2, 0.12, 8), accent);
  cap.position.y = 3.08;
  const tassel = cylinder(0.025, 0.035, 0.38, accent, 6);
  tassel.position.y = 2.31;
  group.add(pole, lantern, cap, tassel);
  return group;
}

function createPlantCluster(x, z, yaw = 0, count = 3) {
  const group = new THREE.Group();
  for (let i = 0; i < count; i += 1) {
    const px = (i - (count - 1) / 2) * 0.45;
    const pot = cylinder(0.16, 0.22, 0.34, i % 2 ? COLORS.red : COLORS.saffron, 8);
    pot.position.x = px;
    const leaves = outlinedMesh(new THREE.DodecahedronGeometry(0.28 + i * 0.015, 0), i % 2 ? COLORS.grass : COLORS.darkGrass);
    leaves.position.set(px, 0.62 + (i % 2) * 0.1, 0);
    group.add(pot, leaves);
  }
  placeOnSurface(group, x, z, 0.02, yaw);
  return group;
}

function makeBench(color = COLORS.brown) {
  const group = new THREE.Group();
  const seat = box(1.7, 0.14, 0.5, color, { radius: 0.035 });
  seat.position.y = 0.62;
  const back = box(1.7, 0.62, 0.12, color, { radius: 0.025 });
  back.position.set(0, 0.94, -0.2);
  group.add(seat, back);
  for (const x of [-0.62, 0.62]) {
    const leg = box(0.11, 0.58, 0.11, COLORS.ink, { radius: 0.02 });
    leg.position.set(x, 0.29, 0);
    group.add(leg);
  }
  return group;
}

function createBench(x, z, yaw = 0, color = COLORS.brown) {
  const group = makeBench(color);
  placeOnSurface(group, x, z, 0.03, yaw);
  return group;
}

function makeDistrictSign(text, background = '#e9ead6', foreground = '#263538') {
  const group = new THREE.Group();
  const board = createSign(text, background, foreground, 2.85, 0.56);
  board.position.y = 2.28;
  group.add(board);
  for (const x of [-1.25, 1.25]) {
    const post = cylinder(0.055, 0.075, 2.15, COLORS.ink, 7);
    post.position.x = x;
    group.add(post);
  }
  return group;
}

function createDistrictSign(text, x, z, yaw = 0, background, foreground) {
  const group = makeDistrictSign(text, background, foreground);
  placeOnSurface(group, x, z, 0.03, yaw);
  return group;
}

function createTeaSeating(x, z, yaw = 0) {
  const group = new THREE.Group();
  const pole = cylinder(0.045, 0.06, 2.45, COLORS.ink, 7);
  const shade = outlinedMesh(new THREE.ConeGeometry(1.35, 0.38, 12), COLORS.red);
  shade.position.y = 2.42;
  const tableTop = cylinder(0.62, 0.62, 0.11, COLORS.yellow, 12);
  tableTop.position.y = 0.94;
  const tableLeg = cylinder(0.09, 0.12, 0.9, COLORS.ink, 7);
  group.add(pole, shade, tableTop, tableLeg);
  for (let i = 0; i < 3; i += 1) {
    const angle = (i / 3) * Math.PI * 2;
    const stool = cylinder(0.25, 0.28, 0.46, i % 2 ? COLORS.teal : COLORS.saffron, 9);
    stool.position.set(Math.cos(angle) * 1.03, 0.23, Math.sin(angle) * 1.03);
    group.add(stool);
  }
  placeOnSurface(group, x, z, 0.03, yaw);
  return group;
}

function createPahadiPlaza() {
  const group = new THREE.Group();
  const paving = cylinder(4.25, 4.25, 0.075, COLORS.roadLight, 32, { castShadow: false });
  group.add(paving);

  const sign = makeDistrictSign('पहाड़ी गाँव  PAHADI GAON', '#54839a', '#e9ead6');
  sign.position.set(0, 0, 3.25);
  sign.rotation.y = Math.PI;
  group.add(sign);

  const leftBench = makeBench(COLORS.brown);
  leftBench.position.set(-2.85, 0.08, 0.9);
  leftBench.rotation.y = Math.PI * 0.5;
  const rightBench = makeBench(COLORS.brown);
  rightBench.position.set(2.85, 0.08, 0.9);
  rightBench.rotation.y = -Math.PI * 0.5;
  group.add(leftBench, rightBench);

  const pumpBase = cylinder(0.34, 0.42, 0.22, COLORS.stone, 10);
  pumpBase.position.set(2.6, 0.11, -1.75);
  const pump = cylinder(0.13, 0.17, 1.15, COLORS.teal, 9);
  pump.position.set(2.6, 0.72, -1.75);
  const handle = box(0.72, 0.09, 0.1, COLORS.ink, { radius: 0.025 });
  handle.position.set(2.86, 1.22, -1.75);
  handle.rotation.z = 0.25;
  group.add(pumpBase, pump, handle);

  return group;
}

function createLaundry(x, z, yaw = 0) {
  const group = new THREE.Group();
  const points = [new THREE.Vector3(-1.45, 2.05, 0), new THREE.Vector3(0, 1.88, 0), new THREE.Vector3(1.45, 2.05, 0)];
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), inkMaterial);
  group.add(line);
  const colors = [COLORS.red, COLORS.paper, COLORS.blue, COLORS.yellow];
  colors.forEach((color, index) => {
    const cloth = outlinedMesh(new THREE.PlaneGeometry(0.46, 0.62), color, { side: THREE.DoubleSide });
    cloth.position.set(-1.05 + index * 0.7, 1.7 + Math.abs(index - 1.5) * 0.06, 0);
    cloth.rotation.y = (index % 2 ? -1 : 1) * 0.07;
    group.add(cloth);
  });
  placeOnSurface(group, x, z, 0.04, yaw);
  return group;
}

function createTemple(x, z, yaw = 0) {
  const group = new THREE.Group();
  const platform = box(4.8, 0.38, 4.4, COLORS.paper, { radius: 0.06 });
  platform.position.y = 0.19;
  const plinth = box(3.45, 0.32, 3.2, COLORS.red);
  plinth.position.y = 0.52;
  const sanctum = box(2.75, 2.35, 2.7, COLORS.saffron, { radius: 0.05 });
  sanctum.position.y = 1.82;
  const doorway = box(0.88, 1.56, 0.13, COLORS.ink, { castShadow: false, radius: 0.045 });
  doorway.position.set(0, 1.34, 1.41);
  group.add(platform, plinth, sanctum, doorway);

  for (const px of [-1.12, 1.12]) {
    const column = cylinder(0.13, 0.16, 2, COLORS.paper, 10);
    column.position.set(px, 1.48, 1.47);
    const capital = box(0.38, 0.14, 0.38, COLORS.red);
    capital.position.set(px, 2.46, 1.47);
    group.add(column, capital);
  }

  const porch = box(3.2, 0.18, 1.25, COLORS.red, { radius: 0.045 });
  porch.position.set(0, 2.6, 1.35);
  group.add(porch);
  for (let i = 0; i < 5; i += 1) {
    const tier = outlinedMesh(
      new THREE.CylinderGeometry(0.58 - i * 0.075, 1.18 - i * 0.12, 0.52, 6),
      i % 2 ? COLORS.yellow : COLORS.saffron,
    );
    tier.position.y = 3.2 + i * 0.42;
    tier.rotation.y = Math.PI / 6;
    group.add(tier);
  }
  const finial = outlinedMesh(new THREE.SphereGeometry(0.17, 9, 7), COLORS.yellow);
  finial.position.y = 5.28;
  const flagPole = cylinder(0.025, 0.025, 1.05, COLORS.ink, 6);
  flagPole.position.y = 5.62;
  const flag = outlinedMesh(new THREE.PlaneGeometry(0.62, 0.35), COLORS.red, { side: THREE.DoubleSide });
  flag.position.set(0.31, 5.92, 0);
  group.add(finial, flagPole, flag);

  for (let i = 0; i < 3; i += 1) {
    const step = box(1.7 + i * 0.55, 0.13, 0.45, COLORS.paper, { castShadow: false });
    step.position.set(0, 0.09 + i * 0.11, 2.42 - i * 0.38);
    group.add(step);
  }
  placeOnSurface(group, x, z, 0.035, yaw);
  return { group, obstacle: { x, z, radius: 2.25 } };
}

function createCricketGround(x, z, yaw = 0) {
  const group = new THREE.Group();
  const pitch = box(1.15, 0.055, 5.5, COLORS.brown, { castShadow: false });
  pitch.position.y = 0.035;
  group.add(pitch);
  for (const wicketZ of [-2.35, 2.35]) {
    for (const sx of [-0.12, 0, 0.12]) {
      const stump = cylinder(0.025, 0.025, 0.58, COLORS.paper, 6);
      stump.position.set(sx, 0.29, wicketZ);
      group.add(stump);
    }
    const crease = box(1.7, 0.018, 0.06, COLORS.paper, { castShadow: false });
    crease.position.set(0, 0.07, wicketZ + Math.sign(wicketZ) * -0.5);
    group.add(crease);
  }
  const scoreboard = createSign('RUNS  42', '#263538', '#e9ead6', 1.35, 0.5);
  scoreboard.position.set(3.5, 1.35, -1.7);
  const boardPosts = [-0.48, 0.48].map((sx) => {
    const post = cylinder(0.04, 0.05, 1.3, COLORS.ink, 6);
    post.position.set(3.5 + sx, 0.65, -1.72);
    return post;
  });
  group.add(scoreboard, ...boardPosts);
  placeOnSurface(group, x, z, 0.06, yaw);
  return group;
}

function createHill(x, z, scale = 1, color = COLORS.darkGrass) {
  const group = new THREE.Group();
  const hill = outlinedMesh(new THREE.DodecahedronGeometry(2.4, 1), color);
  hill.scale.set(1.8 * scale, 0.78 * scale, 1.35 * scale);
  hill.position.y = 1.15 * scale;
  const rock = outlinedMesh(new THREE.DodecahedronGeometry(0.6 * scale, 0), COLORS.stone);
  rock.position.set(1.35 * scale, 0.75 * scale, 0.7 * scale);
  group.add(hill, rock);
  placeOnSurface(group, x, z, -0.25, (x - z) * 0.08);
  return group;
}

function createMountainPeak(scale = 1, color = COLORS.darkGrass) {
  const group = new THREE.Group();
  const base = outlinedMesh(new THREE.ConeGeometry(3.5 * scale, 6.8 * scale, 7), color);
  base.position.y = 3.25 * scale;
  base.scale.z = 0.84;
  const stoneFace = outlinedMesh(new THREE.ConeGeometry(2.25 * scale, 4.4 * scale, 7), COLORS.stone);
  stoneFace.position.set(0.65 * scale, 2.2 * scale, 0.2 * scale);
  stoneFace.scale.set(0.64, 1, 0.56);
  const cap = outlinedMesh(new THREE.ConeGeometry(1.28 * scale, 1.7 * scale, 7), COLORS.paper);
  cap.position.y = 6.25 * scale;
  group.add(base, stoneFace, cap);
  return group;
}

function createBusShelter(label) {
  const group = new THREE.Group();
  const platform = box(4.4, 0.12, 2.5, COLORS.roadLight, { outline: false });
  const back = box(3.7, 1.9, 0.12, COLORS.teal);
  back.position.set(0, 1.02, -0.92);
  const roof = box(4.15, 0.18, 2.15, COLORS.yellow);
  roof.position.set(0, 2.08, -0.08);
  const seat = box(2.35, 0.22, 0.46, COLORS.brown);
  seat.position.set(-0.35, 0.55, -0.55);
  const pole = cylinder(0.07, 0.08, 2.65, COLORS.ink, 7);
  pole.position.set(2.05, 1.33, 0.38);
  const sign = createSign(label, '#e9ead6', '#263538', 2.55, 0.58);
  sign.position.set(0, 1.55, -0.83);
  group.add(platform, back, roof, seat, pole, sign);
  return group;
}

function createLakeJetty() {
  const group = new THREE.Group();
  const deck = box(1.6, 0.16, 4.4, COLORS.brown);
  deck.position.set(0, 0.22, 1.2);
  for (const x of [-0.65, 0.65]) {
    for (const z of [-0.55, 1.15, 2.65]) {
      const post = cylinder(0.07, 0.09, 0.85, COLORS.ink, 7);
      post.position.set(x, 0.25, z);
      group.add(post);
    }
  }
  const boat = outlinedMesh(new THREE.CapsuleGeometry(0.42, 1.15, 4, 8), COLORS.red);
  boat.rotation.x = Math.PI * 0.5;
  boat.rotation.z = Math.PI * 0.5;
  boat.scale.y = 0.36;
  boat.position.set(1.15, 0.14, 2.25);
  group.add(deck, boat);
  return group;
}

function createRailTunnel() {
  const group = new THREE.Group();
  group.name = 'Pahadi rail tunnel';
  for (const z of [-6, -3, 0, 3, 6]) {
    for (const side of [-1, 1]) {
      const wallRock = outlinedMesh(new THREE.DodecahedronGeometry(1.55, 0), z % 4 ? COLORS.stone : COLORS.brown);
      wallRock.scale.set(0.72, 1.45, 1.05);
      wallRock.position.set(side * 2.45, 1.45, z);
      group.add(wallRock);
    }
    const roofRock = outlinedMesh(new THREE.DodecahedronGeometry(1.6, 0), COLORS.darkGrass);
    roofRock.scale.set(1.5, 0.75, 1.08);
    roofRock.position.set(0, 3.32, z);
    group.add(roofRock);
  }
  for (const entrance of [-1, 1]) {
    const darkness = box(3.0, 2.65, 0.08, COLORS.black, { castShadow: false, outline: false });
    darkness.position.set(0, 1.35, entrance * 6.42);
    const portal = outlinedMesh(new THREE.TorusGeometry(2.02, 0.2, 7, 16, Math.PI), COLORS.ink);
    portal.position.set(0, 1.6, entrance * 6.72);
    portal.rotation.z = Math.PI;
    if (entrance > 0) portal.rotation.y = Math.PI;
    group.add(darkness, portal);
  }
  return group;
}

function createField(x, z, yaw = 0) {
  const group = new THREE.Group();
  const soil = box(7.2, 0.05, 6.2, COLORS.brown, { castShadow: false });
  soil.position.y = 0.025;
  group.add(soil);
  for (let row = -2; row <= 2; row += 1) {
    const ridge = box(0.3, 0.11, 5.65, row % 2 ? COLORS.darkGrass : COLORS.grass, { castShadow: false });
    ridge.position.set(row * 1.25, 0.09, 0);
    group.add(ridge);
    for (let iz = -2; iz <= 2; iz += 1) {
      const plant = outlinedMesh(new THREE.ConeGeometry(0.18, 0.48, 6), COLORS.yellow);
      plant.position.set(row * 1.25, 0.35, iz * 1.02);
      group.add(plant);
    }
  }
  placeOnSurface(group, x, z, 0.025, yaw);
  return group;
}

function createCow(x, z, yaw = 0) {
  const group = new THREE.Group();
  const body = outlinedMesh(new THREE.CapsuleGeometry(0.43, 0.82, 4, 8), COLORS.paper);
  body.rotation.z = Math.PI * 0.5;
  body.position.y = 0.92;
  body.scale.z = 0.72;
  const head = outlinedMesh(new THREE.SphereGeometry(0.34, 9, 7), COLORS.paper);
  head.position.set(0.76, 1.02, 0.04);
  head.scale.set(0.82, 1.02, 0.86);
  const muzzle = outlinedMesh(new THREE.SphereGeometry(0.2, 8, 6), COLORS.pink);
  muzzle.position.set(0.98, 0.91, 0.04);
  group.add(body, head, muzzle);
  for (const [lx, lz] of [[-0.45, -0.25], [-0.45, 0.25], [0.42, -0.25], [0.42, 0.25]]) {
    const leg = cylinder(0.07, 0.09, 0.62, COLORS.paper, 7);
    leg.position.set(lx, 0.38, lz);
    group.add(leg);
  }
  for (const lz of [-0.19, 0.19]) {
    const horn = outlinedMesh(new THREE.ConeGeometry(0.065, 0.35, 7), COLORS.yellow);
    horn.position.set(0.76, 1.32, lz);
    horn.rotation.z = -0.65;
    group.add(horn);
  }
  const patch = outlinedMesh(new THREE.SphereGeometry(0.26, 8, 6), COLORS.brown);
  patch.scale.set(1.5, 0.7, 1.01);
  patch.position.set(-0.24, 1.16, -0.34);
  group.add(patch);
  placeOnSurface(group, x, z, 0.04, yaw);
  return group;
}

function createBunting(x, z, width = 8, yaw = 0) {
  const group = new THREE.Group();
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-width * 0.5, 5.02, 0),
      new THREE.Vector3(0, 4.72, 0),
      new THREE.Vector3(width * 0.5, 5.02, 0),
    ]),
    inkMaterial,
  );
  group.add(line);
  const colors = [COLORS.red, COLORS.yellow, COLORS.teal, COLORS.paper];
  for (let i = 0; i < 11; i += 1) {
    const triangle = outlinedMesh(new THREE.ConeGeometry(0.13, 0.3, 3), colors[i % colors.length], { side: THREE.DoubleSide });
    const t = i / 10;
    triangle.position.set(-width * 0.5 + t * width, 4.99 - Math.sin(t * Math.PI) * 0.3 - 0.16, 0);
    triangle.rotation.x = Math.PI;
    triangle.rotation.z = Math.PI;
    group.add(triangle);
  }
  placeOnSurface(group, x, z, 0.03, yaw);
  return group;
}

function createRoadDetails(root) {
  // Slightly mismatched paving slabs line only the bazaar street.
  for (let z = 2.2; z <= 20.5; z += 2.05) {
    const shade = Math.round((z + 23) / 2.05) % 3 === 0 ? COLORS.paper : COLORS.roadLight;
    root.add(
      groundPatch(-4.52, z, 1.72, 1.88, shade, 0, 0.084, 2),
      groundPatch(4.52, z + 0.08, 1.72, 1.88, shade, 0, 0.084, 2),
    );
  }

  for (let z = 2.5; z <= 20; z += 3.1) {
    root.add(groundPatch(0.08 + Math.sin(z) * 0.1, z, 0.11, 1.22, COLORS.paper, 0.025, 0.088, 2));
  }

  // Curbs and occasional painted curb stones.
  for (let z = 2.1; z <= 20.5; z += 2.1) {
    for (const side of [-1, 1]) {
      const curb = new THREE.Group();
      const color = (Math.round(z / 2.1) + (side > 0 ? 1 : 0)) % 7 === 0 ? COLORS.yellow : COLORS.paper;
      const slab = box(0.22, 0.16, 1.95, color, { castShadow: false, radius: 0.035 });
      slab.position.y = 0.08;
      curb.add(slab);
      placeOnSurface(curb, side * 3.63, z, 0.06, 0);
      root.add(curb);
    }
  }

  for (const [x, z, radius] of [[1.25, 13.4, 0.35], [-1.4, 7.5, 0.28], [0.9, 3.4, 0.33]]) {
    const manhole = new THREE.Group();
    const lid = cylinder(radius, radius, 0.055, COLORS.ink, 16, { castShadow: false });
    const ring = outlinedMesh(new THREE.TorusGeometry(radius * 0.68, 0.035, 6, 16), COLORS.stone);
    ring.position.y = 0.065;
    ring.rotation.x = Math.PI * 0.5;
    manhole.add(lid, ring);
    placeOnSurface(manhole, x, z, 0.075, 0);
    root.add(manhole);
  }
}

function createCloud(position, scale = 1) {
  const group = new THREE.Group();
  const material = toonMaterial(COLORS.haze);
  for (const [x, y, z, radius] of [
    [-0.72, 0, 0, 0.72],
    [0, 0.2, 0, 0.94],
    [0.76, -0.02, 0.05, 0.66],
  ]) {
    const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(radius * scale, 0), material);
    puff.position.set(x * scale, y * scale, z * scale);
    group.add(puff);
  }
  group.position.copy(position);
  group.userData.speed = 0.025 + Math.random() * 0.02;
  return group;
}

function createTerrainPlanet() {
  const geometry = new THREE.SphereGeometry(PLANET_RADIUS, 128, 96);
  const positions = geometry.getAttribute('position');
  const colors = [];
  const color = new THREE.Color();
  const terrainColors = [
    new THREE.Color(0x6f9364),
    new THREE.Color(0x87a36d),
    new THREE.Color(0xb2a879),
    new THREE.Color(0x879578),
    new THREE.Color(0x5f835c),
  ];

  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i) / PLANET_RADIUS;
    const y = positions.getY(i) / PLANET_RADIUS;
    const z = positions.getZ(i) / PLANET_RADIUS;
    const direction = new THREE.Vector3(x, y, z).normalize();
    const radius = PLANET_RADIUS + terrainHeightAt(direction);
    positions.setXYZ(i, direction.x * radius, direction.y * radius, direction.z * radius);
    const noise = (
      Math.sin(x * 17.3 + z * 8.1)
      + Math.sin(y * 23.7 - x * 6.4)
      + Math.cos(z * 19.1 + y * 9.2)
    ) / 3;
    const climate = y * 0.9 + noise * 0.42;
    let index = 0;
    if (climate > 0.72) index = 1;
    else if (climate > 0.18) index = 0;
    else if (climate > -0.28) index = 3;
    else if (climate > -0.68) index = 2;
    else index = 4;
    color.copy(terrainColors[index]).offsetHSL(noise * 0.018, 0, noise * 0.035);
    colors.push(color.r, color.g, color.b);
  }

  positions.needsUpdate = true;
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const material = toonMaterial(COLORS.white).clone();
  material.color.set(0xffffff);
  material.vertexColors = true;
  // A screen-space outline around a camera-sized sphere can fold across the
  // near plane on the underside of the world. Terrain shading supplies the
  // silhouette here; illustrated outlines remain on characters and props.
  material.userData.outlineParameters = { visible: false };
  const planet = new THREE.Mesh(geometry, material);
  planet.receiveShadow = true;
  return planet;
}

function createGreatCircleRoad(planeNormal, width = 2.8, color = COLORS.road, altitude = 0.052) {
  const normal = planeNormal.clone().normalize();
  const reference = Math.abs(normal.y) < 0.88 ? _up : new THREE.Vector3(1, 0, 0);
  const basisU = new THREE.Vector3().crossVectors(normal, reference).normalize();
  const basisV = new THREE.Vector3().crossVectors(normal, basisU).normalize();
  const halfAngle = (width * 0.5) / PLANET_RADIUS;
  const positions = [];
  const indices = [];
  const segments = 160;

  for (let i = 0; i <= segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2;
    const center = basisU.clone().multiplyScalar(Math.cos(angle)).addScaledVector(basisV, Math.sin(angle));
    const left = center.clone().multiplyScalar(Math.cos(halfAngle)).addScaledVector(normal, Math.sin(halfAngle));
    const right = center.clone().multiplyScalar(Math.cos(halfAngle)).addScaledVector(normal, -Math.sin(halfAngle));
    left.normalize().multiplyScalar(PLANET_RADIUS + terrainHeightAt(left) + altitude);
    right.normalize().multiplyScalar(PLANET_RADIUS + terrainHeightAt(right) + altitude);
    positions.push(left.x, left.y, left.z, right.x, right.y, right.z);
    if (i < segments) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, b, c, b, d, c);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const roadMaterial = toonMaterial(color, { side: THREE.DoubleSide }).clone();
  roadMaterial.userData.outlineParameters = { visible: false };
  const road = new THREE.Mesh(geometry, roadMaterial);
  road.receiveShadow = true;
  return road;
}

function seeded(index, salt = 0) {
  const value = Math.sin(index * 91.731 + salt * 47.117) * 43758.5453;
  return value - Math.floor(value);
}

function matrixOnPlanet(direction, altitude, yaw, scale, target = new THREE.Matrix4()) {
  const quaternion = new THREE.Quaternion().setFromUnitVectors(_up, direction);
  quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(_up, yaw));
  const position = direction.clone().multiplyScalar(PLANET_RADIUS + terrainHeightAt(direction) + altitude);
  const size = scale instanceof THREE.Vector3 ? scale : new THREE.Vector3(scale, scale, scale);
  return target.compose(position, quaternion, size);
}

function createInstancedFeature(geometry, count, matrices, colors, outlineThickness = 0.0024) {
  const material = toonMaterial(COLORS.white).clone();
  material.color.set(0xffffff);
  material.userData.outlineParameters = {
    thickness: outlineThickness,
    color: [0.09, 0.14, 0.15],
  };
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  for (let i = 0; i < count; i += 1) {
    mesh.setMatrixAt(i, matrices[i]);
    mesh.setColorAt(i, new THREE.Color(colors[i]));
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function distanceToPath(path, direction, samples = 44) {
  let closest = Infinity;
  for (let i = 0; i <= samples; i += 1) {
    const sample = path.directionAt(i / samples);
    const distance = Math.acos(THREE.MathUtils.clamp(sample.dot(direction), -1, 1)) * PLANET_RADIUS;
    closest = Math.min(closest, distance);
  }
  return closest;
}

function createGlobalScenery(shuttlePath) {
  const group = new THREE.Group();
  group.name = 'Around-the-world scenery';
  const roadNormals = [
    new THREE.Vector3(1, 0, 0).normalize(),
    new THREE.Vector3(0.42, 0.16, 0.89).normalize(),
    new THREE.Vector3(-0.62, 0.34, 0.71).normalize(),
  ];
  // Keep a generous arrival clearing around every named district. The global
  // scenery still fills the journeys between them, while conversations remain
  // readable and the follow camera never has to push through a random hut.
  const districtClearings = [
    new THREE.Vector3(1, 0.05, 0.15).normalize(),
    new THREE.Vector3(-0.15, 0.02, -1).normalize(),
    new THREE.Vector3(-1, 0.08, 0.12).normalize(),
    new THREE.Vector3(0.2, -1, 0.1).normalize(),
    new THREE.Vector3(0.15, 0.02, 1).normalize(),
    MOUNTAIN_SUMMIT_DIRECTION,
    MOUNTAIN_LAKE_DIRECTION,
    shuttlePath.stops[0].direction,
  ];
  const clearingCosine = Math.cos(11.5 / PLANET_RADIUS);
  const trees = [];
  const rocks = [];
  const huts = [];
  const crops = [];
  const totalSamples = 520;

  for (let i = 0; i < totalSamples; i += 1) {
    const y = 1 - (2 * (i + 0.5)) / totalSamples;
    const radial = Math.sqrt(Math.max(0, 1 - y * y));
    const angle = i * Math.PI * (3 - Math.sqrt(5));
    const direction = new THREE.Vector3(Math.cos(angle) * radial, y, Math.sin(angle) * radial).normalize();
    if (direction.y > 0.86) continue;
    if (districtClearings.some((anchor) => direction.dot(anchor) > clearingCosine)) continue;
    if (distanceToPath(shuttlePath, direction) < 7.5) continue;
    // Keep a generous, camera-safe corridor around the railway and its platforms.
    if (Math.abs(direction.y - RAIL_LATITUDE) < 0.095) continue;
    const nearRoad = roadNormals.some((roadNormal) => Math.abs(direction.dot(roadNormal)) < 0.045);
    const roll = seeded(i, 1);

    if (!nearRoad && roll < 0.32) trees.push({ direction, index: i });
    else if (!nearRoad && roll < 0.42) crops.push({ direction, index: i });
    else if (roll < 0.5) rocks.push({ direction, index: i });
  }

  const trunkGeometry = new THREE.CylinderGeometry(0.13, 0.22, 1.25, 7);
  trunkGeometry.translate(0, 0.625, 0);
  const crownGeometry = new THREE.DodecahedronGeometry(0.72, 0);
  crownGeometry.translate(0, 1.55, 0);
  const treeMatrices = [];
  const treeColors = [];
  const trunkColors = [];
  trees.forEach(({ direction, index }) => {
    const scale = 0.72 + seeded(index, 2) * 0.82;
    treeMatrices.push(matrixOnPlanet(direction, 0.015, seeded(index, 3) * Math.PI * 2, scale));
    treeColors.push(index % 3 ? COLORS.darkGrass : COLORS.grass);
    trunkColors.push(COLORS.brown);
  });
  group.add(
    createInstancedFeature(trunkGeometry, trees.length, treeMatrices, trunkColors, 0.0018),
    createInstancedFeature(crownGeometry, trees.length, treeMatrices, treeColors, 0.0022),
  );

  const rockGeometry = new THREE.DodecahedronGeometry(0.58, 0);
  rockGeometry.translate(0, 0.42, 0);
  const rockMatrices = [];
  const rockColors = [];
  rocks.forEach(({ direction, index }) => {
    rockMatrices.push(matrixOnPlanet(
      direction,
      0.01,
      seeded(index, 4) * Math.PI * 2,
      new THREE.Vector3(0.75 + seeded(index, 5), 0.55 + seeded(index, 6) * 0.8, 0.7 + seeded(index, 7)),
    ));
    rockColors.push(index % 4 ? COLORS.stone : COLORS.brown);
  });
  group.add(createInstancedFeature(rockGeometry, rocks.length, rockMatrices, rockColors, 0.0018));

  const cropGeometry = new THREE.ConeGeometry(0.18, 0.58, 6);
  cropGeometry.translate(0, 0.29, 0);
  const cropMatrices = [];
  const cropColors = [];
  crops.forEach(({ direction, index }) => {
    cropMatrices.push(matrixOnPlanet(direction, 0.012, seeded(index, 8) * Math.PI * 2, 1 + seeded(index, 9) * 0.65));
    cropColors.push(index % 3 ? COLORS.yellow : COLORS.darkGrass);
  });
  group.add(createInstancedFeature(cropGeometry, crops.length, cropMatrices, cropColors, 0.0015));

  const hutBodyGeometry = new RoundedBoxGeometry(2.15, 1.75, 2, 2, 0.06);
  hutBodyGeometry.translate(0, 0.875, 0);
  const hutRoofGeometry = new THREE.ConeGeometry(1.62, 0.9, 4);
  hutRoofGeometry.rotateY(Math.PI * 0.25);
  hutRoofGeometry.translate(0, 2.18, 0);
  const hutDoorGeometry = new RoundedBoxGeometry(0.56, 1.12, 0.12, 2, 0.035);
  hutDoorGeometry.translate(-0.38, 0.56, 1.03);
  const hutWindowGeometry = new RoundedBoxGeometry(0.48, 0.5, 0.12, 2, 0.025);
  hutWindowGeometry.translate(0.55, 1.05, 1.03);
  const hutMatrices = [];
  const hutColors = [];
  const roofColors = [];
  const doorColors = [];
  const windowColors = [];
  const wallPalette = [COLORS.paper, COLORS.saffron, COLORS.teal, COLORS.pink, COLORS.blue];
  const roofPalette = [COLORS.red, COLORS.yellow, COLORS.indigo];
  huts.forEach(({ direction, index }) => {
    const scale = 0.78 + seeded(index, 10) * 0.48;
    hutMatrices.push(matrixOnPlanet(direction, 0.018, seeded(index, 11) * Math.PI * 2, scale));
    hutColors.push(wallPalette[index % wallPalette.length]);
    roofColors.push(roofPalette[index % roofPalette.length]);
    doorColors.push(COLORS.ink);
    windowColors.push(COLORS.sky);
  });
  if (huts.length) {
    group.add(
      createInstancedFeature(hutBodyGeometry, huts.length, hutMatrices, hutColors, 0.0022),
      createInstancedFeature(hutRoofGeometry, huts.length, hutMatrices, roofColors, 0.0022),
      createInstancedFeature(hutDoorGeometry, huts.length, hutMatrices, doorColors, 0.0014),
      createInstancedFeature(hutWindowGeometry, huts.length, hutMatrices, windowColors, 0.0014),
    );
  }

  return {
    group,
    roadNormals,
    obstacles: [
      ...trees.map(({ direction, index }) => ({ normal: direction.clone(), radius: 0.48 + seeded(index, 2) * 0.46 })),
      ...rocks.map(({ direction, index }) => ({ normal: direction.clone(), radius: 0.42 + seeded(index, 5) * 0.48 })),
    ],
  };
}

const REGION_ANCHORS = {
  farms: new THREE.Vector3(1, 0.05, 0.15).normalize(),
  forest: new THREE.Vector3(-0.15, 0.02, -1).normalize(),
  hills: new THREE.Vector3(-1, 0.08, 0.12).normalize(),
  mela: new THREE.Vector3(0.2, -1, 0.1).normalize(),
  river: new THREE.Vector3(0.15, 0.02, 1).normalize(),
};

const RAIL_STATION_ANGLE = Math.atan2(REGION_ANCHORS.river.z, REGION_ANCHORS.river.x);
const RAIL_STOPS = [
  {
    id: 'rangila',
    name: 'Rangila Junction',
    hindi: 'रंगीला जंक्शन',
    angle: Math.atan2(REGION_ANCHORS.farms.z, REGION_ANCHORS.farms.x),
  },
  {
    id: 'nadi',
    name: 'Nadi Para Junction',
    hindi: 'नदी पारा जंक्शन',
    angle: RAIL_STATION_ANGLE,
  },
  {
    id: 'pahadi',
    name: 'Pahadi Road',
    hindi: 'पहाड़ी रोड',
    angle: Math.atan2(REGION_ANCHORS.hills.z, REGION_ANCHORS.hills.x),
  },
  {
    id: 'sundar',
    name: 'Sundar Van Halt',
    hindi: 'सुंदर वन हॉल्ट',
    angle: Math.atan2(REGION_ANCHORS.forest.z, REGION_ANCHORS.forest.x),
  },
];

function railDirectionAt(angle, across = 0) {
  const direction = new THREE.Vector3(
    Math.cos(angle) * RAIL_HORIZONTAL_RADIUS,
    RAIL_LATITUDE,
    Math.sin(angle) * RAIL_HORIZONTAL_RADIUS,
  );
  if (Math.abs(across) < 0.0001) return direction;
  const tangent = new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle));
  const crossTrack = new THREE.Vector3().crossVectors(direction, tangent).normalize();
  return direction.addScaledVector(crossTrack, across / PLANET_RADIUS).normalize();
}

function railTangentAt(angle) {
  return new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle)).normalize();
}

export function getRailStopDirection(stopId, along = 0, across = 0) {
  const stop = RAIL_STOPS.find(({ id }) => id === stopId);
  if (!stop) throw new Error(`Unknown Nimbu Express stop: ${stopId}`);
  const trackRadius = PLANET_RADIUS * RAIL_HORIZONTAL_RADIUS;
  return railDirectionAt(stop.angle + along / trackRadius, across);
}

export function getRailStationDirection(along = 0, across = 0) {
  return getRailStopDirection('nadi', along, across);
}

function offsetPlanetDirection(anchor, across = 0, along = 0) {
  const tangentA = new THREE.Vector3().crossVectors(_up, anchor);
  if (tangentA.lengthSq() < 0.02) tangentA.crossVectors(new THREE.Vector3(1, 0, 0), anchor);
  tangentA.normalize();
  const tangentB = new THREE.Vector3().crossVectors(anchor, tangentA).normalize();
  return anchor.clone()
    .addScaledVector(tangentA, across / PLANET_RADIUS)
    .addScaledVector(tangentB, along / PLANET_RADIUS)
    .normalize();
}

export function getRegionalDirection(region, across = 0, along = 0) {
  const anchor = REGION_ANCHORS[region];
  if (!anchor) throw new Error(`Unknown Nimbu Nagar region: ${region}`);
  return offsetPlanetDirection(anchor, across, along);
}

const MOUNTAIN_SUMMIT_DIRECTION = offsetPlanetDirection(REGION_ANCHORS.hills, 0, -48);
const MOUNTAIN_LAKE_DIRECTION = offsetPlanetDirection(REGION_ANCHORS.hills, -18, -28);
REGION_ANCHORS.mountain = MOUNTAIN_SUMMIT_DIRECTION;

function createMountainShuttlePath() {
  const start = getRailStopDirection('pahadi', -3, -13.5);
  const end = MOUNTAIN_SUMMIT_DIRECTION.clone();
  const rotationAxis = new THREE.Vector3().crossVectors(start, end).normalize();
  const totalAngle = Math.acos(THREE.MathUtils.clamp(start.dot(end), -1, 1));
  const scratch = new THREE.Vector3();
  const side = new THREE.Vector3();

  function directionAt(value) {
    const t = THREE.MathUtils.clamp(value, 0, 1);
    const direction = start.clone().applyAxisAngle(rotationAxis, totalAngle * t);
    const tangent = new THREE.Vector3().crossVectors(rotationAxis, direction).normalize();
    side.crossVectors(direction, tangent).normalize();
    const switchback = Math.sin(t * Math.PI * 6) * Math.sin(t * Math.PI) * 5.2 / PLANET_RADIUS;
    return direction.addScaledVector(side, switchback).normalize();
  }

  function tangentAt(value) {
    const before = directionAt(Math.max(0, value - 0.0025));
    const after = directionAt(Math.min(1, value + 0.0025));
    scratch.copy(after).sub(before);
    const normal = directionAt(value);
    return scratch.addScaledVector(normal, -scratch.dot(normal)).normalize().clone();
  }

  let length = 0;
  let previous = directionAt(0);
  for (let i = 1; i <= 80; i += 1) {
    const next = directionAt(i / 80);
    length += Math.acos(THREE.MathUtils.clamp(previous.dot(next), -1, 1)) * PLANET_RADIUS;
    previous = next;
  }

  return {
    length,
    directionAt,
    tangentAt,
    stops: [
      { id: 'pahadi-base', name: 'Pahadi Road Bus Stand', direction: directionAt(0), progress: 0 },
      { id: 'shikhar', name: 'Shikhar Dham Summit', direction: directionAt(1), progress: 1 },
    ],
  };
}

function createShuttleRibbon(path, width, color, altitude = 0.075) {
  const positions = [];
  const indices = [];
  const segments = 96;
  const right = new THREE.Vector3();
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const normal = path.directionAt(t);
    const tangent = path.tangentAt(t);
    right.crossVectors(normal, tangent).normalize();
    const leftEdge = normal.clone().addScaledVector(right, -width * 0.5 / PLANET_RADIUS).normalize();
    const rightEdge = normal.clone().addScaledVector(right, width * 0.5 / PLANET_RADIUS).normalize();
    leftEdge.multiplyScalar(PLANET_RADIUS + terrainHeightAt(leftEdge) + altitude);
    rightEdge.multiplyScalar(PLANET_RADIUS + terrainHeightAt(rightEdge) + altitude);
    positions.push(leftEdge.x, leftEdge.y, leftEdge.z, rightEdge.x, rightEdge.y, rightEdge.z);
    if (i < segments) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, b, c, b, d, c);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const material = toonMaterial(color, { side: THREE.DoubleSide }).clone();
  material.userData.outlineParameters = { visible: false };
  const ribbon = new THREE.Mesh(geometry, material);
  ribbon.receiveShadow = true;
  return ribbon;
}

function createRailRibbon(across, width, color, altitude = 0.095) {
  const positions = [];
  const indices = [];
  const segments = 224;
  for (let i = 0; i <= segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2;
    const left = railDirectionAt(angle, across - width * 0.5);
    const right = railDirectionAt(angle, across + width * 0.5);
    left.multiplyScalar(PLANET_RADIUS + terrainHeightAt(left) + altitude);
    right.multiplyScalar(PLANET_RADIUS + terrainHeightAt(right) + altitude);
    positions.push(left.x, left.y, left.z, right.x, right.y, right.z);
    if (i < segments) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, b, c, b, d, c);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const material = toonMaterial(color, { side: THREE.DoubleSide }).clone();
  material.userData.outlineParameters = { visible: false };
  const rail = new THREE.Mesh(geometry, material);
  rail.receiveShadow = true;
  return rail;
}

function createRailLoop() {
  const group = new THREE.Group();
  group.name = 'Nimbu Express globe railway';
  group.add(
    createRailRibbon(0, 1.58, COLORS.stone, 0.065),
    createRailRibbon(-0.66, 0.13, COLORS.ink),
    createRailRibbon(0.66, 0.13, COLORS.ink),
  );

  const sleeperCount = 144;
  const sleeperGeometry = new THREE.BoxGeometry(1.78, 0.08, 0.2);
  sleeperGeometry.translate(0, 0.04, 0);
  const sleeperMaterial = toonMaterial(COLORS.brown).clone();
  sleeperMaterial.userData.outlineParameters = {
    thickness: 0.0014,
    color: [0.09, 0.14, 0.15],
  };
  const sleepers = new THREE.InstancedMesh(sleeperGeometry, sleeperMaterial, sleeperCount);
  const matrix = new THREE.Matrix4();
  const right = new THREE.Vector3();
  for (let i = 0; i < sleeperCount; i += 1) {
    const angle = (i / sleeperCount) * Math.PI * 2;
    const normal = railDirectionAt(angle);
    const tangent = railTangentAt(angle);
    right.crossVectors(normal, tangent).normalize();
    matrix.makeBasis(right, normal, tangent);
    matrix.setPosition(normal.clone().multiplyScalar(PLANET_RADIUS + terrainHeightAt(normal) + 0.105));
    sleepers.setMatrixAt(i, matrix);
  }
  sleepers.instanceMatrix.needsUpdate = true;
  sleepers.receiveShadow = true;
  group.add(sleepers);

  const trackRadius = PLANET_RADIUS * RAIL_HORIZONTAL_RADIUS;
  return {
    group,
    path: {
      stationAngle: RAIL_STATION_ANGLE,
      stops: RAIL_STOPS.map((stop) => ({ ...stop })),
      trackRadius,
      directionAt: railDirectionAt,
      tangentAt: railTangentAt,
    },
  };
}

function placeAlongRail(object, angle, across = 0, altitude = 0.02, yaw = 0) {
  const normal = railDirectionAt(angle, across);
  const tangent = railTangentAt(angle);
  const right = new THREE.Vector3().crossVectors(normal, tangent).normalize();
  const matrix = new THREE.Matrix4().makeBasis(right, normal, tangent);
  object.quaternion.setFromRotationMatrix(matrix);
  object.rotateY(yaw);
  object.position.copy(normal).multiplyScalar(PLANET_RADIUS + terrainHeightAt(normal) + altitude);
  return object;
}

function createRegionalLandmarks(shuttlePath) {
  const group = new THREE.Group();
  const obstacles = [];
  const cameraBlockers = [];
  group.name = 'Regional landmark clusters';
  const railStop = (id) => RAIL_STOPS.find((stop) => stop.id === id);
  const add = (object, anchor, across, along, yaw = 0, altitude = 0.02, collisionRadius = 0, blocksCamera = false) => {
    const direction = offsetPlanetDirection(anchor, across, along);
    if (collisionRadius > 0 && distanceToPath(shuttlePath, direction) < collisionRadius + 2.4) return null;
    placeOnDirection(object, direction, altitude, yaw);
    group.add(object);
    if (collisionRadius > 0) obstacles.push({ normal: direction.clone(), radius: collisionRadius });
    if (blocksCamera) cameraBlockers.push(object);
    return object;
  };

  // Rangila Farms: patterned fields, animals and carts beside the round-world road.
  add(createField(0, 0), REGION_ANCHORS.farms, -5.2, 4.5, 0.18);
  add(createField(0, 0), REGION_ANCHORS.farms, 5.6, 5.2, -0.16);
  add(createField(0, 0), REGION_ANCHORS.farms, 0.4, -7.2, 0.05);
  add(createCow(0, 0), REGION_ANCHORS.farms, -1.8, 2.1, 1.1);
  add(createHandcart(0, 0), REGION_ANCHORS.farms, 2.5, 1.2, -0.4);
  for (let i = 0; i < 7; i += 1) {
    const scale = 1 + (i % 3) * 0.16;
    add(createTree(0, 0, scale), REGION_ANCHORS.farms, -9 + i * 3, -1.8 + (i % 2) * 3.5, i * 0.4, 0.02, 0.72 * scale, true);
  }
  const rangilaStop = railStop('rangila');
  const rangilaTown = createRailTown(rangilaStop, COLORS.yellow, COLORS.teal, 'मोबाइल सेवा', 'MOBILE + SIM');
  placeAlongRail(rangilaTown, rangilaStop.angle, 0, 0.025);
  group.add(rangilaTown);

  // Suraj Mela: stalls, bunting and parked traffic on the far side of the planet.
  add(createChaiStall(0, 0).group, REGION_ANCHORS.mela, -3.4, 1.4, 0.8);
  add(createChaiStall(0, 0).group, REGION_ANCHORS.mela, 3.6, 1.1, -0.7);
  add(createAutoRickshaw(0, 0).group, REGION_ANCHORS.mela, 0.4, -3.6, 0.2);
  add(createHandcart(0, 0), REGION_ANCHORS.mela, -5.5, -3.1, 1.2);
  add(createBunting(0, 0, 11), REGION_ANCHORS.mela, 0, 0.4, 0);
  for (let i = 0; i < 5; i += 1) {
    add(createPlantCluster(0, 0, 0, 3), REGION_ANCHORS.mela, -6 + i * 3, 4.5, i * 0.5);
  }
  const festivalDecorations = new THREE.Group();
  festivalDecorations.name = 'Day 5 festival decorations';
  festivalDecorations.visible = false;
  const addFestival = (object, across, along, yaw = 0) => {
    placeOnDirection(object, offsetPlanetDirection(REGION_ANCHORS.mela, across, along), 0.025, yaw);
    festivalDecorations.add(object);
  };
  [
    [-7.2, -2.8, COLORS.red, COLORS.yellow],
    [-3.8, 4.4, COLORS.yellow, COLORS.red],
    [0, -4.8, COLORS.teal, COLORS.yellow],
    [3.8, 4.4, COLORS.red, COLORS.paper],
    [7.2, -2.8, COLORS.yellow, COLORS.red],
  ].forEach(([across, along, color, accent], index) => {
    addFestival(createFestivalLantern(color, accent), across, along, index * 0.35);
  });
  addFestival(createBunting(0, 0, 13), 0, -1.7, 0.15);
  addFestival(createBunting(0, 0, 10), 0, 3.4, -0.2);
  group.add(festivalDecorations);
  group.userData.festivalDecorations = festivalDecorations;

  // Pahadi Gaon: a compact town, with the railway, bus stand and mountain road
  // deliberately separated into their own readable spaces.
  add(createPahadiPlaza(), REGION_ANCHORS.hills, 0, 0, 0, 0.025);
  const hillHomes = [
    { across: -6.2, along: 6, color: COLORS.paper, trim: COLORS.red, seed: 31 },
    { across: 0, along: 7.6, color: COLORS.teal, trim: COLORS.yellow, seed: 32 },
    { across: 6.2, along: 6, color: COLORS.saffron, trim: COLORS.indigo, seed: 33 },
  ];
  hillHomes.forEach((home, index) => {
    const facade = createFacade({ x: 0, z: 0, yaw: 0, width: 4.2, depth: 3, floors: 2, balcony: false, roofTank: index === 1, ...home }).group;
    add(facade, REGION_ANCHORS.hills, home.across, home.along, Math.PI + (index - 1) * 0.28, 0.02, 2.2, true);
  });
  [
    [-19, 10, 0.72], [19, 11, 0.76], [-22, -9, 0.66], [22, -8, 0.7],
  ].forEach(([across, along, scale], index) => {
    add(createHill(0, 0, scale), REGION_ANCHORS.hills, across, along, index * 0.7, 0.02, 2.8 * scale, true);
  });
  const pahadiStop = railStop('pahadi');
  const pahadiTown = createRailTown(pahadiStop, COLORS.red, COLORS.saffron, 'पार्सल घर', 'PARCEL OFFICE');
  placeAlongRail(pahadiTown, pahadiStop.angle, 0, 0.025);
  group.add(pahadiTown);
  cameraBlockers.push(pahadiTown);

  // The Nimbu Express tunnel sits well beyond the station and bus stand.
  const tunnelAngle = pahadiStop.angle + 17.5 / (PLANET_RADIUS * RAIL_HORIZONTAL_RADIUS);
  const tunnel = createRailTunnel();
  placeAlongRail(tunnel, tunnelAngle, 0, 0.02);
  group.add(tunnel);
  cameraBlockers.push(tunnel);
  obstacles.push({ normal: railDirectionAt(tunnelAngle), radius: 3.9 });
  for (const side of [-1, 1]) {
    const tunnelMountain = createMountainPeak(1.35 + (side > 0 ? 0.12 : 0), side > 0 ? COLORS.darkGrass : COLORS.grass);
    placeAlongRail(tunnelMountain, tunnelAngle, side * 6.2, -0.2, side * 0.2);
    group.add(tunnelMountain);
    cameraBlockers.push(tunnelMountain);
    obstacles.push({ normal: railDirectionAt(tunnelAngle, side * 6.2), radius: 4.5 });
  }

  // A spaced mountain pass gives the climb a distant silhouette from the bus
  // stand without putting rock geometry inside any of the switchbacks.
  [
    [0.58, 20, 3.4, COLORS.grass],
  ].forEach(([progress, sideOffset, scale, color], index) => {
    const roadDirection = shuttlePath.directionAt(progress);
    const roadTangent = shuttlePath.tangentAt(progress);
    const roadside = new THREE.Vector3().crossVectors(roadDirection, roadTangent).normalize();
    const collisionRadius = 3.5 * scale;
    let resolvedOffset = sideOffset;
    let peakDirection;
    do {
      peakDirection = roadDirection.clone()
        .addScaledVector(roadside, resolvedOffset / PLANET_RADIUS)
        .normalize();
      resolvedOffset += Math.sign(sideOffset) * 2.5;
    } while (distanceToPath(shuttlePath, peakDirection, 120) < collisionRadius + 5 && Math.abs(resolvedOffset) < 46);
    const peak = createMountainPeak(scale, color);
    peak.name = `Mountain pass peak ${index + 1}`;
    placeOnDirection(peak, peakDirection, -0.35, index * 0.48);
    group.add(peak);
    cameraBlockers.push(peak);
    obstacles.push({ normal: peakDirection, radius: collisionRadius, kind: 'mountain' });
  });

  // Shikhar Dham: a broad summit plaza and a separate lake basin.
  group.add(
    directionDisc(MOUNTAIN_SUMMIT_DIRECTION, 11.4, COLORS.roadLight, 0.055, 72),
    directionDisc(MOUNTAIN_LAKE_DIRECTION, 8.1, COLORS.paper, 0.05, 60),
    directionDisc(MOUNTAIN_LAKE_DIRECTION, 6.65, COLORS.water, 0.082, 60),
  );
  [
    [-34, -12, 2.3, COLORS.darkGrass],
    [7, -24, 2.75, COLORS.darkGrass],
    [20, -15, 2.2, COLORS.grass],
    [-30, -8, 1.6, COLORS.grass],
    [30, -8, 1.7, COLORS.darkGrass],
  ].forEach(([across, along, scale, color], index) => {
    const mountain = add(
      createMountainPeak(scale, color),
      MOUNTAIN_SUMMIT_DIRECTION,
      across,
      along,
      index * 0.32,
      -0.15,
      3.9 * scale,
      true,
    );
    if (mountain) obstacles.at(-1).kind = 'mountain';
  });
  for (let i = 0; i < 12; i += 1) {
    const angle = i * (Math.PI * 2 / 12) + 0.22;
    const across = Math.cos(angle) * 9.4;
    const along = Math.sin(angle) * 9.1;
    const direction = offsetPlanetDirection(MOUNTAIN_LAKE_DIRECTION, across, along);
    if (distanceToPath(shuttlePath, direction) < 7.2) continue;
    const scale = 0.76 + (i % 3) * 0.13;
    add(createTree(0, 0, scale), MOUNTAIN_LAKE_DIRECTION, across, along, angle, 0.02, 0.7 * scale, true);
  }
  obstacles.push({ normal: MOUNTAIN_LAKE_DIRECTION.clone(), radius: 6.25 });
  add(createLakeJetty(), MOUNTAIN_LAKE_DIRECTION, 0, 5.65, Math.PI, 0.02, 0.85, true);
  add(createBench(0, 0, 0, COLORS.indigo), MOUNTAIN_SUMMIT_DIRECTION, -2.5, -4.6, 0.35, 0.02, 0.7);
  add(createDistrictSign('शिखर धाम  SHIKHAR DHAM', 0, 0), MOUNTAIN_SUMMIT_DIRECTION, 0, 8.4, Math.PI, 0.02, 0.7);
  const summitLodge = createFacade({
    x: 0, z: 0, yaw: 0, width: 4.8, depth: 3.4, floors: 2,
    color: COLORS.saffron, trim: COLORS.indigo, sign: 'पहाड़ी निवास', balcony: true, roofTank: false, seed: 71,
  }).group;
  add(summitLodge, MOUNTAIN_SUMMIT_DIRECTION, 10.6, -4.6, -1.15, 0.02, 2.6, true);

  shuttlePath.stops.forEach((stop, index) => {
    const shelter = createBusShelter(index === 0 ? 'पहाड़ी बस  PAHADI BUS' : 'शिखर धाम  SUMMIT');
    const tangent = shuttlePath.tangentAt(stop.progress);
    const roadside = new THREE.Vector3().crossVectors(stop.direction, tangent).normalize();
    const shelterDirection = stop.direction.clone().addScaledVector(roadside, -5.1 / PLANET_RADIUS).normalize();
    placeOnDirection(shelter, shelterDirection, 0.035, index === 0 ? 0.45 : -0.35);
    group.add(shelter);
    cameraBlockers.push(shelter);
    obstacles.push({ normal: shelterDirection, radius: 2.25 });
  });

  // Nadi Para: temple lane and a shaded grove beyond the station clearing.
  add(createTemple(0, 0).group, REGION_ANCHORS.river, -3.5, 2.8, 0.35, 0.02, 2.2, true);
  const railwayStop = createRailwayStop();
  placeAlongRail(railwayStop, RAIL_STATION_ANGLE, 0, 0.025);
  group.add(railwayStop);
  add(createLaundry(0, 0), REGION_ANCHORS.river, 3.6, 1.8, -0.25);
  add(createPostbox(0, 0), REGION_ANCHORS.river, 0.5, -2.8, 0.2);
  for (let i = 0; i < 10; i += 1) {
    const scale = 0.85 + (i % 4) * 0.13;
    add(createTree(0, 0, scale), REGION_ANCHORS.river, -12 + i * 2.7, 5.5 + (i % 3) * 2, i * 0.7, 0.02, 0.7 * scale, true);
  }

  // Sundar Van is densely layered around a broad, camera-safe learning glade.
  for (let i = 0; i < 24; i += 1) {
    const angle = i * 2.399;
    const radius = 7.6 + (i % 6) * 1.45;
    const scale = 0.82 + (i % 5) * 0.14;
    add(
      createTree(0, 0, scale, i % 3 ? COLORS.darkGrass : COLORS.grass),
      REGION_ANCHORS.forest,
      Math.cos(angle) * radius,
      Math.sin(angle) * radius,
      angle,
      0.02,
      0.68 * scale,
      true,
    );
  }
  add(createHill(0, 0, 1.3), REGION_ANCHORS.forest, -7, -4, 0.5, 0.02, 3.2, true);
  add(createHill(0, 0, 1.1), REGION_ANCHORS.forest, 7, 4, -0.4, 0.02, 2.8, true);
  const sundarStop = railStop('sundar');
  const sundarTown = createRailTown(sundarStop, COLORS.darkGrass, COLORS.paper, 'अतिथि गृह', 'GUESTHOUSE');
  placeAlongRail(sundarTown, sundarStop.angle, 0, 0.025);
  group.add(sundarTown);

  return { group, obstacles, cameraBlockers };
}

const GLOBAL_ZONES = [
  { name: 'Rangila Farms', normal: REGION_ANCHORS.farms },
  { name: 'Sundar Van', normal: REGION_ANCHORS.forest },
  { name: 'Pahadi Gaon', normal: REGION_ANCHORS.hills },
  { name: 'Shikhar Dham', normal: MOUNTAIN_SUMMIT_DIRECTION },
  { name: 'Neel Taal', normal: MOUNTAIN_LAKE_DIRECTION },
  { name: 'Suraj Mela', normal: REGION_ANCHORS.mela },
  { name: 'Nadi Para', normal: REGION_ANCHORS.river },
];

export function createWorld(scene) {
  const root = new THREE.Group();
  root.name = 'Nimbu Nagar — Hindi learning world';
  scene.add(root);

  const planet = createTerrainPlanet();
  root.add(planet);

  const shuttlePath = createMountainShuttlePath();
  const globalScenery = createGlobalScenery(shuttlePath);
  globalScenery.roadNormals.forEach((roadNormal, index) => {
    root.add(createGreatCircleRoad(
      roadNormal,
      index === 0 ? 3.4 : 2.65,
      index === 2 ? COLORS.roadLight : COLORS.road,
      0.05 + index * 0.004,
    ));
  });
  const railLoop = createRailLoop();
  root.add(railLoop.group);
  root.add(
    createShuttleRibbon(shuttlePath, 3.05, COLORS.road, 0.063),
    createShuttleRibbon(shuttlePath, 0.09, COLORS.yellow, 0.078),
  );
  const regionalLandmarks = createRegionalLandmarks(shuttlePath);
  root.add(globalScenery.group, regionalLandmarks.group);

  // One compact circular village, split into recognisable language-learning places.
  root.add(
    groundDisc(0, -3, 26.5, COLORS.grass, 0.018, 72),
    groundDisc(10.8, -0.25, 4.45, COLORS.roadLight, 0.054, 40),
    groundDisc(-6.65, -6.45, 4.5, COLORS.saffron, 0.052, 40),
    groundPatch(0, 12.2, 7.25, 19.5, COLORS.road, 0, 0.062, 22),
    groundPatch(-4.55, 12.2, 1.9, 19.5, COLORS.roadLight, 0, 0.07, 18),
    groundPatch(4.55, 12.2, 1.9, 19.5, COLORS.roadLight, 0, 0.07, 18),
    groundPatch(0, 2.5, 19, 5.3, COLORS.road, 0.02, 0.058, 16),
    groundPatch(-6.8, -5.3, 4.8, 20.5, COLORS.roadLight, -0.5, 0.061, 18),
    groundPatch(7.1, -8.3, 4.2, 23, COLORS.roadLight, 0.55, 0.061, 18),
    groundDisc(7.2, -4.5, 7.1, COLORS.brown, 0.067, 48),
    groundDisc(-14.8, -14.2, 6.1, COLORS.paper, 0.055, 44),
    groundDisc(-14.8, -14.2, 3.8, COLORS.water, 0.082, 44),
  );
  createRoadDetails(root);

  const obstacles = [];
  const cameraBlockers = [globalScenery.group, ...regionalLandmarks.cameraBlockers];
  obstacles.push(...globalScenery.obstacles, ...regionalLandmarks.obstacles);
  const addStructure = (structure) => {
    root.add(structure.group);
    cameraBlockers.push(structure.group);
    if (structure.obstacle) obstacles.push(structure.obstacle);
  };

  const facades = [
    // Upar Bazaar: tight, noisy and vertical.
    { x: -7.1, z: 18.1, yaw: Math.PI * 0.5, width: 5.25, floors: 3, color: COLORS.paper, trim: COLORS.teal, sign: 'किराना STORE', shop: true, roofTank: true, seed: 1 },
    { x: -7.2, z: 12.9, yaw: Math.PI * 0.5, width: 4.9, floors: 4, color: COLORS.pink, trim: COLORS.indigo, balcony: true, roofTank: true, seed: 2 },
    { x: -7.05, z: 7.9, yaw: Math.PI * 0.5, width: 4.8, floors: 3, color: COLORS.paper, trim: COLORS.red, sign: 'डाक घर  POST', shop: true, balcony: false, seed: 3 },
    { x: 7.15, z: 18.2, yaw: -Math.PI * 0.5, width: 5.15, floors: 4, color: COLORS.yellow, trim: COLORS.red, balcony: true, roofTank: true, seed: 9 },
    { x: 7.2, z: 13.0, yaw: -Math.PI * 0.5, width: 5.0, floors: 3, color: COLORS.paper, trim: COLORS.blue, sign: 'TAILOR  दर्जी', shop: true, seed: 10 },
    { x: 7.05, z: 7.9, yaw: -Math.PI * 0.5, width: 4.8, floors: 3, color: COLORS.teal, trim: COLORS.yellow, sign: 'दवा MEDICAL', shop: true, seed: 11 },
    // Low homes follow the lanes into the open half of the village.
    { x: -10.2, z: -1.5, yaw: 1.85, width: 4.7, depth: 3.2, floors: 2, color: COLORS.saffron, trim: COLORS.indigo, balcony: false, roofTank: true, seed: 18 },
    { x: -13.1, z: -6.1, yaw: 1.1, width: 4.9, depth: 3.4, floors: 2, color: COLORS.blue, trim: COLORS.paper, sign: 'नीली हवेली', balcony: false, seed: 19 },
    { x: 14.5, z: 0.2, yaw: -1.9, width: 4.6, depth: 3.2, floors: 2, color: COLORS.paper, trim: COLORS.red, balcony: false, seed: 20 },
    { x: 15.1, z: -7.3, yaw: -2.5, width: 4.5, depth: 3.2, floors: 2, color: COLORS.teal, trim: COLORS.paper, balcony: false, roofTank: true, seed: 21 },
  ];
  facades.forEach((facade) => addStructure(createFacade(facade)));

  // Major silhouettes make each part of the map readable before any dialogue starts.
  addStructure(createTemple(-10.7, -10.6, 0.62));
  addStructure(createAutoRickshaw(2.55, 3.25, 0.15));
  addStructure(createChaiStall(12.45, -0.2, -Math.PI * 0.5));
  addStructure(createVegetableMarket(-7.5, -7.5, 0.78));
  obstacles.push({ x: -14.8, z: -14.2, radius: 3.75 }, { x: 10.2, z: -16.2, radius: 3.2 });
  root.add(
    createPostbox(-4.55, 6.2, Math.PI * 0.5),
    createScooter(-4.72, 15.2, 0.12, COLORS.red),
    createScooter(4.72, 9.8, Math.PI + 0.08, COLORS.teal),
    createHandcart(4.58, 5.65, -Math.PI * 0.5),
    createHandcart(-5.15, -8.75, 0.7),
    createPlantCluster(-9.15, -5.25, 1.4, 4),
    createPlantCluster(-4.4, -7.4, 0.4, 3),
    createPlantCluster(12.4, -10.7, -0.9, 3),
    createTeaSeating(9.15, -2.25, -0.18),
    createBench(12.0, 3.15, -0.25, COLORS.indigo),
    createBench(-8.9, -4.1, 0.65, COLORS.blue),
    createScooter(8.2, -3.2, 0.25, COLORS.red),
    createBunting(10.7, -0.35, 7.2, -Math.PI * 0.5),
    createBunting(-6.8, -6.1, 7.4, 0.78),
    createLaundry(-12.8, -4.6, 1.2),
    createCricketGround(7.2, -4.5, 0.18),
    createField(10.2, -16.2, -0.12),
    createCow(0.5, -8.3, 2.5),
    createBunting(0, 5.7, 10.8, 0),
  );

  // The bazaar keeps its wires; the maidan and fields deliberately breathe.
  for (const z of [15.2, 8.7]) {
    root.add(
      createUtilityPole(-5.45, z, Math.PI * 0.5),
      createUtilityPole(5.45, z, -Math.PI * 0.5),
      createCableSpan(z, 5.15, 0),
    );
  }
  for (const [z, side] of [[13.2, -1], [6.8, 1], [1.5, -1]]) {
    root.add(createStreetLamp(side * 3.9, z, -side));
  }

  // Banyan shade in the maidan, then trees and low hills close the circular map.
  root.add(createTree(12.4, -3.3, 2.15, COLORS.darkGrass));
  obstacles.push({ x: 12.4, z: -3.3, radius: 1.65 });
  const treePositions = [
    [-13.1, 19.8, 1.1], [13.4, 19.5, 1.2], [-16.4, 12, 1.35], [16.7, 11.4, 1.1],
    [-18.3, 1.4, 1.45], [18.2, -1.5, 1.25], [-18.7, -9.3, 1.3], [18.5, -12.2, 1.2],
    [-9.3, -19.8, 1.25], [-3.6, -22.1, 1.4], [3.1, -22.6, 1.25], [17.2, -19.5, 1.35],
  ];
  treePositions.forEach(([x, z, scale], index) => {
    root.add(createTree(x, z, scale, index % 2 ? COLORS.grass : COLORS.darkGrass));
    obstacles.push({ x, z, radius: 0.72 * scale });
  });
  for (const [x, z, scale, color] of [
    [-20.5, -18.2, 1.25, COLORS.darkGrass], [-14.5, -22, 1.05, COLORS.grass],
    [-6.8, -25, 1.2, COLORS.darkGrass], [4.4, -25.5, 1.1, COLORS.grass],
    [15.2, -23.2, 1.3, COLORS.darkGrass], [22.2, -16.2, 1.0, COLORS.grass],
  ]) {
    root.add(createHill(x, z, scale, color));
    obstacles.push({ x, z, radius: 2.8 * scale });
  }

  const clouds = [
    createCloud(new THREE.Vector3(-18, 67, -23), 1.7),
    createCloud(new THREE.Vector3(22, 66, -15), 1.35),
    createCloud(new THREE.Vector3(4, 70, 12), 1.8),
  ];
  clouds.forEach((cloud) => scene.add(cloud));

  return {
    root,
    planet,
    obstacles,
    cameraBlockers,
    railPath: railLoop.path,
    shuttlePath,
    landmarks: {
      mountainSummit: MOUNTAIN_SUMMIT_DIRECTION.clone(),
      mountainLake: MOUNTAIN_LAKE_DIRECTION.clone(),
    },
    clouds,
    setStoryState(storyState) {
      const festival = regionalLandmarks.group.userData.festivalDecorations;
      if (festival) festival.visible = storyState.day >= 5;
    },
    getTerrainHeight(direction) {
      return terrainHeightAt(direction);
    },
    getZoneName(normal) {
      if (normal.y > 0.86) {
        const x = normal.x * PLANET_RADIUS;
        const z = normal.z * PLANET_RADIUS;
        if (z > 5.2) return 'Nimbu Chowk';
        if (x < -7.5 && z < -9) return 'Mandir Ghat';
        if (x > 4 && z < -10.5) return 'Sarson Fields';
        if (x > 6.2 && z < 5.4 && z > -1.2) return 'Chai Gali';
        if (x < -3.6 && z < -3 && z > -10.2) return 'Sabzi Bazaar';
        if (x > 2.2 && z < 1.5) return 'Nimbu Maidan';
        return 'Neem Lane';
      }
      const nearbyRailStop = RAIL_STOPS.find((stop) => normal.dot(railDirectionAt(stop.angle)) > Math.cos(10 / PLANET_RADIUS));
      if (nearbyRailStop) return nearbyRailStop.name;
      let closest = GLOBAL_ZONES[0];
      let closestDot = -Infinity;
      GLOBAL_ZONES.forEach((zone) => {
        const dot = normal.dot(zone.normal);
        if (dot > closestDot) {
          closest = zone;
          closestDot = dot;
        }
      });
      return closest.name;
    },
    update(elapsed, delta) {
      clouds.forEach((cloud, index) => {
        cloud.rotation.y += delta * cloud.userData.speed;
        cloud.position.y += Math.sin(elapsed * 0.2 + index) * delta * 0.025;
      });
    },
  };
}
