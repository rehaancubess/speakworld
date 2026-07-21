import * as THREE from 'three';

export const COLORS = {
  ink: 0x263538,
  sky: 0x8edbd2,
  haze: 0xcce9dc,
  ground: 0xa9ad92,
  grass: 0x4e8a5d,
  darkGrass: 0x32694f,
  road: 0x667b7b,
  roadLight: 0x9eaa9d,
  paper: 0xe9ead6,
  white: 0xf4f0dc,
  red: 0xcf654b,
  yellow: 0xdba347,
  saffron: 0xd48642,
  teal: 0x54a69c,
  blue: 0x54839a,
  indigo: 0x4b5366,
  pink: 0xb9867c,
  brown: 0x75614e,
  stone: 0x929184,
  water: 0x4f9ba1,
  black: 0x19272a,
};

const materialCache = new Map();
const gradientData = new Uint8Array([48, 118, 188, 255]);
const gradientMap = new THREE.DataTexture(gradientData, gradientData.length, 1, THREE.RedFormat);
gradientMap.minFilter = THREE.NearestFilter;
gradientMap.magFilter = THREE.NearestFilter;
gradientMap.generateMipmaps = false;
gradientMap.needsUpdate = true;

export function toonMaterial(color, options = {}) {
  const key = `${color}-${options.roughness ?? 1}-${options.side ?? THREE.FrontSide}`;
  if (!materialCache.has(key)) {
    materialCache.set(
      key,
      new THREE.MeshToonMaterial({
        color,
        side: options.side ?? THREE.FrontSide,
        flatShading: true,
        gradientMap,
      }),
    );
  }
  return materialCache.get(key);
}

export const inkMaterial = new THREE.LineBasicMaterial({
  color: COLORS.ink,
  transparent: true,
  opacity: 0.74,
});

export function outlinedMesh(geometry, color, options = {}) {
  const mesh = new THREE.Mesh(geometry, toonMaterial(color, options));
  mesh.castShadow = options.castShadow ?? true;
  mesh.receiveShadow = options.receiveShadow ?? true;

  mesh.userData.outline = options.outline !== false;

  return mesh;
}
