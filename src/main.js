import * as THREE from "three";
import initialRecipe from "./recipe.json";
import GUI from "lil-gui";

let recipe = structuredClone(initialRecipe);
const appendages = [];

function clearAppendages() {
  for(const a of appendages) {
    a.mesh.geometry.dispose();
    a.mesh.material.dispose();
    scene.remove(a.mesh);
  }
  appendages.length = 0;
}

function createAppendage(recipe, position) {
  baseGeometry = buildBaseGeometry(recipe.base);
  const geometry = baseGeometry.clone();
  const material = buildMaterial(recipe.material);

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  mesh.rotation.x = 0.35;

  scene.add(mesh);
  appendages.push({
    recipe,
    baseGeometry,
    geometry,
    mesh
  });
} 

// Button logic
const generateBtn = document.createElement("button");
generateBtn.innerText = "Generate Appendage";
generateBtn.style.position = "fixed";
generateBtn.style.top = "12px";
generateBtn.style.left = "12px";
generateBtn.style.zIndex = "10";
document.body.appendChild(generateBtn);

generateBtn.onclick = () => {
  recipe = generateAppendageRecipe();

  // Rebuild base geometry
  const newBase = buildBaseGeometry(recipe.base);
  baseGeometry.dispose();
  geometry.dispose();

  baseGeometry = newBase;
  geometry = baseGeometry.clone();

  // Update mesh
  mesh.geometry = geometry;

  // Update material
  mesh.material.dispose();
  mesh.material = buildMaterial(recipe.material);

  rebuildGUI();
};



function moveModifierUp(index) {
  if(index <= 0) return;
  const mods = recipe.modifiers;
  [mods[index - 1], mods[index]] = [mods[index], mods[index - 1]];
  rebuildGUI();
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function choose(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateAppendageRecipe() {
  return {
    base: {
      type: "cylinder",
      height: rand(2.5, 4.5),
      radiusBottom: rand(0.3, 0.6),
      radiusTop: rand(0.02, 0.1),
      radialSegments: 32,
      heightSegments: 64
    },

  material: {
    type: "standard",
    color: "#7a5a3a",      // darker bone / horn
    emissive: "#120a05",
    roughness: 0.8,
    metalness: 0.05
  }
  ,

    modifiers: [
      {
        type: "taper",
        enabled: true,
        axis: "y",
        range: 1.0,
        amount: rand(0.8, 1.4),
        strength: rand(-0.8, -0.4)
      },
      {
        type: "bend",
        enabled: true,
        axis: choose(["x", "z"]),
        amount: rand(0.3, 0.8),
        strength: rand(0.2, 0.6)
      },
      {
        type: "twistNoise",
        enabled: true,
        axis: "y",
        twist: rand(0.2, 0.6),
        noiseAmp: rand(0.01, 0.05),
        noiseFreq: rand(2.0, 5.0),
        timeScale: rand(0.2, 0.6)
      }
    ]
  };
}


function moveModifierDown(index) {
  const mods = recipe.modifiers;
  if(index >= mods.length - 1) return;
  [mods[index], mods[index + 1]] = [mods[index + 1], mods[index]];
  rebuildGUI();
}

function getDriverValue(v, axis) {
  switch(axis) {
    case "x": return v.x;
    case "y": return v.y;
    case "z": return v.z;
    case "radial": return Math.sqrt(v.x * v.x + v.z * v.z);
    case "angle": return Math.atan2(v.z, v.x);
    default: return v.y;
  }
}

let gui;

function rebuildGUI() {
  if(gui) gui.destroy();
  gui = new GUI();

  recipe.modifiers.forEach((mod, index) => {
    const folder = gui.addFolder(`${index}: ${mod.type}`);

    folder.add(mod, "enabled");

    //Reorder buttons
    folder.add({ up: () => moveModifierUp(index)}, "up");
    folder.add({ down: () => moveModifierDown(index)}, "down");

    // Modifier params
    if (mod.type === "bend") {
      folder.add(mod, "amount", 0, 2, 0.01);
      folder.add(mod, "strength", 0, 1, 0.01);
    }

    if (mod.type === "twistNoise") {
      folder.add(mod, "twist", 0, 3, 0.01);
      folder.add(mod, "noiseAmp", 0, 0.2, 0.001);
      folder.add(mod, "noiseFreq", 0, 10, 0.1);
      folder.add(mod, "timeScale", 0, 3, 0.01);
    }

    if (mod.type === "taper") {
      folder.add(mod, "amount", -2, 2, 0.01);
      folder.add(mod, "strength", -1, 1, 0.01);
    }
  });
}

rebuildGUI();
// ---------- 1) Three.js basics (smallest render loop) ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x072639);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, -0.2, 5.5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const rim = new THREE.DirectionalLight(0xffffff, 0.6);
rim.position.set(-3, 2, -2);
scene.add(rim);
document.body.style.margin = "0";
document.body.appendChild(renderer.domElement);

// Simple light so deformation reads (no fancy setup)
scene.add(new THREE.AmbientLight(0xffffff, 0.35));
const dir = new THREE.DirectionalLight(0xffffff, 1.0);
dir.position.set(2, 3, 4);
scene.add(dir);

// ---------- 2) Build geometry from recipe.base ----------
function buildBaseGeometry(base) {
  if (base.type === "torus") {
    return new THREE.TorusGeometry(
      base.radius,
      base.tube,
      base.radialSegments,
      base.tubularSegments
    );
  } else if (base.type === "cylinder") {
    return new THREE.CylinderGeometry(
      base.radiusTop ?? 0.05,
      base.radiusBottom ?? 0.4,
      base.height ?? 3.0,
      base.radialSegments ?? 32,
      base.heightSegments ?? 64
    );
  }
  throw new Error(`Unknown base type: ${base.type}`);
}

// ---------- 3) Apply procedural modifier by editing vertices ----------
function twistNoise(geometry, mod, time) {
  const localTime = time * (mod.timeScale ?? 1.0);
  const pos = geometry.attributes.position;
  const v = new THREE.Vector3();

  // Get appropriate dimension for normalization based on geometry type
  const normalizeRange = recipe.base.tube ?? recipe.base.height ?? 2.0;

  for(let i = 0; i < pos.count; ++i){
    v.fromBufferAttribute(pos, i);

    //Twist around Y
    const animatedTwist = mod.twist * (1 + 0.3 * Math.sin(localTime));
    const normalizedY = v.y / normalizeRange;
    const angle = animatedTwist * normalizedY;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const x = v.x * cosA - v.z * sinA;
    const z = v.x * sinA + v.z * cosA;
    v.x = x;
    v.z = z;

    //Sine-based noise
    const n = 
      Math.sin(v.x * mod.noiseFreq + localTime) *
      Math.sin(v.y * mod.noiseFreq + localTime) *
      Math.sin(v.z * mod.noiseFreq + localTime);
    const radial = new THREE.Vector3(v.x, 0, v.z);
    const radialLength = radial.length();
    if (radialLength > 0.0001) {
      radial.divideScalar(radialLength);
      v.addScaledVector(radial, n * mod.noiseAmp);
    }

    pos.setXYZ(i, v.x, v.y, v.z);
  }

  pos.needsUpdate = true;
}


function bend(geometry, mod, time) {
  const pos = geometry.attributes.position;
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);

    const d = getDriverValue(v, mod.axis);
    // Distance along X drives bend amount
    const t = d * mod.amount;

    // Bend upward (parabolic curve)
    v.y += t * t * mod.strength;

    pos.setXYZ(i, v.x, v.y, v.z);
  }

  pos.needsUpdate = true;
}

function taper(geometry, mod, time) {
  const pos = geometry.attributes.position;
  const v = new THREE.Vector3();

  for(let i = 0; i < pos.count; i++){
    v.fromBufferAttribute(pos, i);

    const d = getDriverValue(v, mod.axis);
    //Normalize along chosen axis (Y by default over here)
    const t = Math.max(0, d / mod.range) * mod.amount;

    //Scale factor
    const s = THREE.MathUtils.clamp(
      1 + t * mod.strength,
      0.2,
      2.0
    );

    v.x *= s;
    v.z *= s;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
}

const MODIFIERS = {
  twistNoise,
  bend,
  taper
};

// ---------- 4) Material from recipe.material ----------
function buildMaterial(mat) {
  if (mat.type === "standard") {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(mat.color),
      emissive: new THREE.Color(mat.emissive),
      wireframe: !!mat.wireframe,
      metalness: mat.metalness ?? 0.0,
      roughness: mat.roughness ?? 1.0
    });
  }
  throw new Error(`Unknown material type: ${mat.type}`);
}

// Build + deform once (later you can rebuild on recipe changes)
let baseGeometry = buildBaseGeometry(recipe.base);
let geometry = baseGeometry.clone();
const mesh = new THREE.Mesh(geometry, buildMaterial(recipe.material));
scene.add(mesh);

// Nice framing
mesh.rotation.x = 0.35;

// ---------- 5) Animate slowly ----------
const clock = new THREE.Clock();

function animate() {
  const t = clock.getElapsedTime();

  geometry.copy(baseGeometry);

  if (recipe.modifiers) {
    for (const mod of recipe.modifiers) {
      if (mod.enabled === false) continue;

      const fn = MODIFIERS[mod.type];
      if (!fn) {
        throw new Error(`Unknown modifier: ${mod.type}`);
      }
      fn(geometry, mod, t);
    }
  }

  geometry.computeVertexNormals();

  mesh.rotation.y = t * 0.25;
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();

// ---------- 6) Resize handling (tiny but necessary) ----------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
