import * as THREE from 'three';
import type { GrowthStage, PetId } from '../types';

/**
 * Pet3DModels:
 * Voxel 3D Mascot Models for Chinese Companions.
 * Handcrafted blocky voxel aesthetic (MagicaVoxel / Crossy Road style).
 * Supports 4 pets (panda, red_panda, golden_monkey, imperial_cat) across 3 growth stages (baby, junior, adult).
 */

// Immutable palette templates. Each returned model owns cloned render resources.
const matVoxelWhite = new THREE.MeshStandardMaterial({ color: 0xf5f5f0, roughness: 0.3, metalness: 0.05 });
const matVoxelBlack = new THREE.MeshStandardMaterial({ color: 0x18191a, roughness: 0.4, metalness: 0.1 });
const matVoxelBlush = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.4 });
const matVoxelEye = new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.1, metalness: 0.6 });
const matVoxelCinnabar = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.3, metalness: 0.15 }); // Palace red
const matVoxelGold = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.2, metalness: 0.75 }); // Imperial gold
const matVoxelJade = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.25, metalness: 0.2 }); // Jade
const matVoxelBamboo = new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.35 });
const matVoxelRedPanda = new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.35 });
const matVoxelRedPandaCream = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.3 });
const matVoxelMonkeyFur = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.35, metalness: 0.2 });
const matVoxelMonkeySkin = new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.4 });
const matVoxelBronze = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.4, metalness: 0.5 }); // Three Kingdoms Bronze

function ownModelMaterials(group: THREE.Group): THREE.Group {
  const materials = new Map<THREE.Material, THREE.Material>();
  const textures = new Map<THREE.Texture, THREE.Texture>();
  const ownMaterial = (source: THREE.Material): THREE.Material => {
    const existing = materials.get(source);
    if (existing) return existing;
    const owned = source.clone();
    materials.set(source, owned);
    for (const [property, value] of Object.entries(owned)) {
      if (!(value instanceof THREE.Texture)) continue;
      let texture = textures.get(value);
      if (!texture) { texture = value.clone(); textures.set(value, texture); }
      (owned as unknown as Record<string, unknown>)[property] = texture;
    }
    return owned;
  };
  group.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    object.material = Array.isArray(object.material) ? object.material.map(ownMaterial) : ownMaterial(object.material);
  });
  return group;
}

function addBlock(
  group: THREE.Group,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  material: THREE.Material
): THREE.Mesh {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

export function create3DPetModel(petId: PetId, stage: GrowthStage): THREE.Group {
  const root = new THREE.Group();

  switch (petId) {
    case 'panda':
      buildVoxelPanda(root, stage);
      break;
    case 'red_panda':
      buildVoxelRedPanda(root, stage);
      break;
    case 'golden_monkey':
      buildVoxelGoldenMonkey(root, stage);
      break;
    case 'imperial_cat':
      buildVoxelImperialCat(root, stage);
      break;
  }

  // Position center slightly
  root.position.y = -0.2;
  return ownModelMaterials(root);
}

// ==========================================
// 1. VOXEL PANDA: Đoàn Đoàn (团团)
// ==========================================
function buildVoxelPanda(root: THREE.Group, stage: GrowthStage) {
  const isBaby = stage === 'baby';
  const isAdult = stage === 'adult';
  const scale = isBaby ? 0.88 : isAdult ? 1.15 : 1.0;

  const panda = new THREE.Group();
  panda.scale.set(scale, scale, scale);

  // 1. Voxel Body
  addBlock(panda, 0, 0.55, 0, 0.9, 0.8, 0.75, matVoxelWhite);
  // Black shoulder band & chest
  addBlock(panda, 0, 0.72, 0, 0.94, 0.36, 0.78, isAdult ? matVoxelCinnabar : matVoxelBlack);

  // 2. Voxel Head
  const headY = 1.35;
  addBlock(panda, 0, headY, 0, 1.05, 0.85, 0.95, matVoxelWhite);

  // Voxel Ears
  addBlock(panda, -0.42, headY + 0.48, 0, 0.3, 0.3, 0.25, matVoxelBlack);
  addBlock(panda, 0.42, headY + 0.48, 0, 0.3, 0.3, 0.25, matVoxelBlack);

  // Voxel Eye Patches
  addBlock(panda, -0.26, headY + 0.08, 0.49, 0.26, 0.26, 0.06, matVoxelBlack);
  addBlock(panda, 0.26, headY + 0.08, 0.49, 0.26, 0.26, 0.06, matVoxelBlack);

  // Voxel Glossy Eyes
  addBlock(panda, -0.24, headY + 0.09, 0.53, 0.12, 0.12, 0.04, matVoxelEye);
  addBlock(panda, 0.24, headY + 0.09, 0.53, 0.12, 0.12, 0.04, matVoxelEye);

  // Voxel Snout & Nose
  addBlock(panda, 0, headY - 0.12, 0.52, 0.34, 0.22, 0.2, matVoxelWhite);
  addBlock(panda, 0, headY - 0.06, 0.63, 0.14, 0.09, 0.06, matVoxelBlack);

  // Blushing Cheeks
  addBlock(panda, -0.42, headY - 0.12, 0.49, 0.16, 0.1, 0.04, matVoxelBlush);
  addBlock(panda, 0.42, headY - 0.12, 0.49, 0.16, 0.1, 0.04, matVoxelBlush);

  // Arms / Paws
  addBlock(panda, -0.56, 0.65, 0.12, 0.26, 0.48, 0.26, matVoxelBlack);
  addBlock(panda, 0.56, 0.65, 0.12, 0.26, 0.48, 0.26, matVoxelBlack);

  // Feet
  addBlock(panda, -0.32, 0.12, 0.18, 0.32, 0.24, 0.44, matVoxelBlack);
  addBlock(panda, 0.32, 0.12, 0.18, 0.32, 0.24, 0.44, matVoxelBlack);

  // --- STAGE EVOLUTION ACCESSORIES ---
  if (isBaby) {
    // Stage 1: Baby Bamboo Sprout on top of head
    addBlock(panda, 0, headY + 0.52, 0, 0.08, 0.22, 0.08, matVoxelBamboo);
    addBlock(panda, 0.09, headY + 0.6, 0, 0.16, 0.08, 0.06, matVoxelBamboo);
  } else if (stage === 'junior') {
    // Stage 2: Red Martial Headband (Khăn đỏ thư sinh)
    addBlock(panda, 0, headY + 0.22, 0, 1.09, 0.12, 0.99, matVoxelCinnabar);
    // Ribbon tails hanging on right
    addBlock(panda, 0.56, headY + 0.12, -0.15, 0.08, 0.32, 0.08, matVoxelCinnabar);
    addBlock(panda, 0.62, headY - 0.05, -0.15, 0.08, 0.24, 0.08, matVoxelCinnabar);

    // Bamboo stalk in hand
    addBlock(panda, 0.58, 0.8, 0.28, 0.09, 0.8, 0.09, matVoxelBamboo);
  } else {
    // Stage 3: Tam Quốc Grand General Panda (Quan Vũ / Triệu Vân võ tướng)
    // Imperial Red Headband with Gold Medallion
    addBlock(panda, 0, headY + 0.22, 0, 1.1, 0.14, 1.01, matVoxelCinnabar);
    addBlock(panda, 0, headY + 0.24, 0.52, 0.2, 0.2, 0.06, matVoxelGold);

    // General's Cape (Chiến bào)
    addBlock(panda, 0, 0.65, -0.42, 0.98, 0.9, 0.14, matVoxelCinnabar);
    // Gold Shoulder Armor Pauldrons
    addBlock(panda, -0.58, 0.88, 0.08, 0.32, 0.18, 0.32, matVoxelGold);
    addBlock(panda, 0.58, 0.88, 0.08, 0.32, 0.18, 0.32, matVoxelGold);

    // Green Dragon Crescent Staff / Jade Glaive (Thanh Long Đao / Trượng Ngọc)
    addBlock(panda, 0.68, 0.8, 0.28, 0.08, 1.6, 0.08, matVoxelBronze);
    // Jade Blade
    addBlock(panda, 0.68, 1.62, 0.36, 0.08, 0.38, 0.22, matVoxelJade);
    addBlock(panda, 0.68, 1.76, 0.44, 0.08, 0.22, 0.14, matVoxelGold);

    // Golden Halo Base Disc (Bệ sen hào quang)
    addBlock(panda, 0, 0.02, 0, 1.3, 0.04, 1.3, matVoxelGold);
  }

  root.add(panda);
}

// ==========================================
// 2. VOXEL RED PANDA: Đào Đào (淘淘)
// ==========================================
function buildVoxelRedPanda(root: THREE.Group, stage: GrowthStage) {
  const isBaby = stage === 'baby';
  const isAdult = stage === 'adult';
  const scale = isBaby ? 0.88 : isAdult ? 1.15 : 1.0;

  const redPanda = new THREE.Group();
  redPanda.scale.set(scale, scale, scale);

  // Body
  addBlock(redPanda, 0, 0.52, 0, 0.8, 0.75, 0.7, matVoxelRedPanda);
  addBlock(redPanda, 0, 0.48, 0.22, 0.52, 0.5, 0.3, matVoxelRedPandaCream);

  // Head
  const headY = 1.28;
  addBlock(redPanda, 0, headY, 0, 0.95, 0.8, 0.85, matVoxelRedPanda);

  // Ears (Pointed with white tufts)
  addBlock(redPanda, -0.38, headY + 0.48, 0, 0.28, 0.32, 0.22, matVoxelRedPanda);
  addBlock(redPanda, -0.38, headY + 0.46, 0.08, 0.18, 0.24, 0.1, matVoxelRedPandaCream);
  addBlock(redPanda, 0.38, headY + 0.48, 0, 0.28, 0.32, 0.22, matVoxelRedPanda);
  addBlock(redPanda, 0.38, headY + 0.46, 0.08, 0.18, 0.24, 0.1, matVoxelRedPandaCream);

  // White Cheeks
  addBlock(redPanda, -0.32, headY - 0.1, 0.44, 0.26, 0.24, 0.06, matVoxelRedPandaCream);
  addBlock(redPanda, 0.32, headY - 0.1, 0.44, 0.26, 0.24, 0.06, matVoxelRedPandaCream);

  // Eyes
  addBlock(redPanda, -0.22, headY + 0.06, 0.44, 0.12, 0.12, 0.04, matVoxelEye);
  addBlock(redPanda, 0.22, headY + 0.06, 0.44, 0.12, 0.12, 0.04, matVoxelEye);

  // Snout
  addBlock(redPanda, 0, headY - 0.12, 0.48, 0.26, 0.2, 0.18, matVoxelRedPandaCream);
  addBlock(redPanda, 0, headY - 0.06, 0.58, 0.12, 0.08, 0.04, matVoxelBlack);

  // Paws & Feet
  addBlock(redPanda, -0.46, 0.52, 0.1, 0.22, 0.4, 0.22, matVoxelBlack);
  addBlock(redPanda, 0.46, 0.52, 0.1, 0.22, 0.4, 0.22, matVoxelBlack);
  addBlock(redPanda, -0.28, 0.1, 0.14, 0.28, 0.2, 0.38, matVoxelBlack);
  addBlock(redPanda, 0.28, 0.1, 0.14, 0.28, 0.2, 0.38, matVoxelBlack);

  // Fluffy Striped Voxel Tail
  for (let i = 0; i < 4; i++) {
    addBlock(
      redPanda,
      0,
      0.35 + i * 0.18,
      -0.45 - i * 0.12,
      0.38 - i * 0.02,
      0.2,
      0.36 - i * 0.02,
      i % 2 === 0 ? matVoxelRedPanda : matVoxelGold
    );
  }

  // Stage Evolution Accessories
  if (isBaby) {
    // Mini Voxel Red Apple
    addBlock(redPanda, 0, 0.52, 0.45, 0.22, 0.22, 0.22, matVoxelCinnabar);
    addBlock(redPanda, 0, 0.65, 0.45, 0.04, 0.08, 0.04, matVoxelBamboo);
  } else if (stage === 'junior') {
    // Jade Collar Pendant
    addBlock(redPanda, 0, 0.92, 0.38, 0.16, 0.16, 0.08, matVoxelJade);
  } else {
    // Zhuge Liang Strategist Feather Fan (Quạt Lông Vũ Khổng Minh)
    addBlock(redPanda, 0.58, 0.8, 0.3, 0.06, 0.5, 0.06, matVoxelBronze);
    addBlock(redPanda, 0.58, 1.1, 0.35, 0.06, 0.32, 0.26, matVoxelWhite);
    addBlock(redPanda, 0.58, 1.25, 0.38, 0.06, 0.18, 0.18, matVoxelGold);
  }

  root.add(redPanda);
}

// ==========================================
// 3. VOXEL GOLDEN MONKEY: Tiểu Ngộ Không (小悟空)
// ==========================================
function buildVoxelGoldenMonkey(root: THREE.Group, stage: GrowthStage) {
  const isBaby = stage === 'baby';
  const isAdult = stage === 'adult';
  const scale = isBaby ? 0.88 : isAdult ? 1.15 : 1.0;

  const monkey = new THREE.Group();
  monkey.scale.set(scale, scale, scale);

  // Body
  addBlock(monkey, 0, 0.52, 0, 0.78, 0.75, 0.68, matVoxelMonkeyFur);
  addBlock(monkey, 0, 0.5, 0.22, 0.5, 0.48, 0.28, matVoxelMonkeySkin);

  // Head
  const headY = 1.28;
  addBlock(monkey, 0, headY, 0, 0.92, 0.82, 0.85, matVoxelMonkeyFur);

  // Face Plate
  addBlock(monkey, 0, headY - 0.04, 0.44, 0.72, 0.62, 0.06, matVoxelMonkeySkin);

  // Eyes
  addBlock(monkey, -0.18, headY + 0.06, 0.48, 0.12, 0.12, 0.04, matVoxelEye);
  addBlock(monkey, 0.18, headY + 0.06, 0.48, 0.12, 0.12, 0.04, matVoxelEye);

  // Round Ears
  addBlock(monkey, -0.48, headY + 0.12, 0, 0.18, 0.28, 0.24, matVoxelMonkeySkin);
  addBlock(monkey, 0.48, headY + 0.12, 0, 0.18, 0.28, 0.24, matVoxelMonkeySkin);

  // Curled Monkey Tail
  addBlock(monkey, 0, 0.38, -0.42, 0.12, 0.12, 0.28, matVoxelMonkeyFur);
  addBlock(monkey, 0, 0.56, -0.52, 0.12, 0.26, 0.12, matVoxelMonkeyFur);
  addBlock(monkey, 0, 0.72, -0.45, 0.12, 0.12, 0.18, matVoxelMonkeyFur);

  // Stage Evolution Accessories
  if (isBaby) {
    // Mini Immortal Peach (Đào Tiên)
    addBlock(monkey, 0, 0.52, 0.46, 0.24, 0.26, 0.24, matVoxelBlush);
    addBlock(monkey, 0, 0.66, 0.46, 0.06, 0.06, 0.06, matVoxelBamboo);
  } else if (stage === 'junior') {
    // Golden Circlet (Vòng Kim Cô - 紧箍儿)
    addBlock(monkey, 0, headY + 0.26, 0, 0.96, 0.08, 0.89, matVoxelGold);
    addBlock(monkey, 0, headY + 0.28, 0.46, 0.16, 0.14, 0.06, matVoxelGold);
  } else {
    // Tề Thiên Đại Thánh (Monkey King Battle Mode)
    // Golden Circlet with Red Ribbon
    addBlock(monkey, 0, headY + 0.26, 0, 0.98, 0.1, 0.91, matVoxelGold);
    addBlock(monkey, 0, headY + 0.28, 0.48, 0.18, 0.16, 0.06, matVoxelGold);
    // Pheasant tail feathers (Lông trĩ trên mũ)
    addBlock(monkey, -0.12, headY + 0.52, -0.1, 0.06, 0.46, 0.06, matVoxelCinnabar);
    addBlock(monkey, 0.12, headY + 0.52, -0.1, 0.06, 0.46, 0.06, matVoxelCinnabar);

    // Golden Armor Pauldrons
    addBlock(monkey, -0.52, 0.82, 0.06, 0.28, 0.16, 0.28, matVoxelGold);
    addBlock(monkey, 0.52, 0.82, 0.06, 0.28, 0.16, 0.28, matVoxelGold);

    // Glowing Ruyi Jingu Bang (Như Ý Kim Cô Bổng)
    addBlock(monkey, 0.64, 0.8, 0.28, 0.07, 1.6, 0.07, matVoxelCinnabar);
    addBlock(monkey, 0.64, 1.5, 0.28, 0.09, 0.24, 0.09, matVoxelGold);
    addBlock(monkey, 0.64, 0.1, 0.28, 0.09, 0.24, 0.09, matVoxelGold);
  }

  root.add(monkey);
}

// ==========================================
// 4. VOXEL IMPERIAL CAT: Ngự Miêu (御猫)
// ==========================================
function buildVoxelImperialCat(root: THREE.Group, stage: GrowthStage) {
  const isBaby = stage === 'baby';
  const isAdult = stage === 'adult';
  const scale = isBaby ? 0.88 : isAdult ? 1.15 : 1.0;

  const cat = new THREE.Group();
  cat.scale.set(scale, scale, scale);

  // Body
  addBlock(cat, 0, 0.5, 0, 0.76, 0.72, 0.68, matVoxelWhite);

  // Head
  const headY = 1.25;
  addBlock(cat, 0, headY, 0, 0.88, 0.78, 0.82, matVoxelWhite);

  // Triangular Ears
  addBlock(cat, -0.32, headY + 0.46, 0, 0.24, 0.3, 0.22, matVoxelWhite);
  addBlock(cat, -0.32, headY + 0.44, 0.06, 0.16, 0.22, 0.1, matVoxelBlush);
  addBlock(cat, 0.32, headY + 0.46, 0, 0.24, 0.3, 0.22, matVoxelWhite);
  addBlock(cat, 0.32, headY + 0.44, 0.06, 0.16, 0.22, 0.1, matVoxelBlush);

  // Heterochromia Voxel Eyes (Amber & Jade)
  addBlock(cat, -0.2, headY + 0.06, 0.42, 0.12, 0.12, 0.04, matVoxelGold);
  addBlock(cat, 0.2, headY + 0.06, 0.42, 0.12, 0.12, 0.04, matVoxelJade);

  // Cute Cat Snout & Pink Nose
  addBlock(cat, 0, headY - 0.12, 0.44, 0.26, 0.18, 0.14, matVoxelWhite);
  addBlock(cat, 0, headY - 0.06, 0.52, 0.08, 0.06, 0.04, matVoxelBlush);

  // Paws
  addBlock(cat, -0.26, 0.1, 0.16, 0.22, 0.2, 0.34, matVoxelWhite);
  addBlock(cat, 0.26, 0.1, 0.16, 0.22, 0.2, 0.34, matVoxelWhite);

  // Curled Tail
  addBlock(cat, 0, 0.32, -0.4, 0.1, 0.1, 0.24, matVoxelWhite);
  addBlock(cat, 0, 0.52, -0.48, 0.1, 0.32, 0.1, matVoxelWhite);

  // Stage Evolution Accessories
  if (isBaby) {
    // Red Ribbon Bow
    addBlock(cat, 0, 0.88, 0.38, 0.18, 0.12, 0.06, matVoxelCinnabar);
  } else if (stage === 'junior') {
    // Imperial Red Collar with Gold Bell
    addBlock(cat, 0, 0.88, 0, 0.8, 0.08, 0.74, matVoxelCinnabar);
    addBlock(cat, 0, 0.84, 0.42, 0.12, 0.12, 0.12, matVoxelGold);
  } else {
    // Forbidden City Imperial Crown & Silk Mantle
    addBlock(cat, 0, headY + 0.46, 0, 0.42, 0.22, 0.42, matVoxelGold);
    addBlock(cat, 0, headY + 0.54, 0.22, 0.1, 0.1, 0.06, matVoxelCinnabar);

    // Royal Cape
    addBlock(cat, 0, 0.58, -0.38, 0.82, 0.76, 0.1, matVoxelCinnabar);
  }

  root.add(cat);
}

// ==========================================
// VOXEL FOOD ITEMS (For 3D Feeding Animation)
// ==========================================
export function create3DFoodModel(foodIcon: string): THREE.Group {
  const foodGroup = new THREE.Group();

  switch (foodIcon) {
    case 'apple': {
      // Voxel Apple
      addBlock(foodGroup, 0, 0, 0, 0.32, 0.32, 0.32, matVoxelCinnabar);
      addBlock(foodGroup, 0, 0.2, 0, 0.06, 0.12, 0.06, matVoxelBronze);
      addBlock(foodGroup, 0.08, 0.22, 0, 0.12, 0.06, 0.04, matVoxelBamboo);
      break;
    }
    case 'peach': {
      // Voxel Immortal Peach
      addBlock(foodGroup, 0, 0, 0, 0.34, 0.34, 0.34, matVoxelBlush);
      addBlock(foodGroup, 0, 0.2, 0, 0.14, 0.14, 0.14, matVoxelCinnabar);
      break;
    }
    case 'fish': {
      // Voxel Imperial Fish
      addBlock(foodGroup, 0, 0, 0, 0.42, 0.26, 0.18, matVoxelGold);
      addBlock(foodGroup, -0.26, 0, 0, 0.16, 0.22, 0.06, matVoxelGold);
      break;
    }
    case 'bamboo':
    default: {
      // Voxel Bamboo Shoot
      addBlock(foodGroup, 0, -0.08, 0, 0.28, 0.22, 0.28, matVoxelBamboo);
      addBlock(foodGroup, 0, 0.1, 0, 0.2, 0.2, 0.2, matVoxelJade);
      addBlock(foodGroup, 0, 0.24, 0, 0.12, 0.14, 0.12, matVoxelJade);
      break;
    }
  }

  return ownModelMaterials(foodGroup);
}
