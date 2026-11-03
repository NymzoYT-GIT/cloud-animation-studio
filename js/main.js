
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createModelingSystem } from "./modeling.js";
import { createMeshEditor } from "./mesh-editor.js";

const container = document.getElementById("scene");

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color("#383b42");

// Camera
const camera = new THREE.PerspectiveCamera(
  50,
  container.clientWidth / container.clientHeight,
  0.1,
  1000
);

camera.position.set(7, 6, 9);

// Renderer
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance"
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.shadowMap.enabled = true;

container.innerHTML = "";
container.appendChild(renderer.domElement);

// Camera controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 1, 0);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
scene.add(ambientLight);

const sunlight = new THREE.DirectionalLight(0xffffff, 2);
sunlight.position.set(5, 10, 7);
sunlight.castShadow = true;
scene.add(sunlight);

// Ground grid
const grid = new THREE.GridHelper(20, 20, 0xf18b35, 0x666666);
scene.add(grid);

// Default cube
const geometry = new THREE.BoxGeometry(2, 2, 2);

const material = new THREE.MeshStandardMaterial({
  color: 0xd87932,
  roughness: 0.65
});

const cube = new THREE.Mesh(geometry, material);
cube.position.y = 1;
cube.castShadow = true;
cube.receiveShadow = true;

scene.add(cube);

// Ground plane
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.MeshStandardMaterial({
    color: 0x292c33,
    roughness: 1
  })
);

ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.02;
ground.receiveShadow = true;
scene.add(ground);
// Modeling system
const modeling = createModelingSystem(THREE, scene);

// Connect modeling buttons
const buttons = document.querySelectorAll(".sidebar button");

buttons.forEach(button => {
  button.addEventListener("click", () => {
    const name = button.textContent.trim();

    if (["Add Cube", "Add Sphere", "Add Cylinder"].includes(name)) {
      modeling.addObject(name.replace("Add ", ""));
    }
  });
});

// Select the original cube
modeling.addObject("Cube");
cube.visible = false;
// Mesh editing system
const meshEditor = createMeshEditor({
  THREE,
  scene,
  camera,
  renderer,
  getSelectedObject: modeling.getSelectedObject
});

// Window resizing
function resize() {
  const width = container.clientWidth;
  const height = container.clientHeight;

  if (!width || !height) return;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
}

window.addEventListener("resize", resize);

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  controls.update();
  renderer.render(scene, camera);
}

animate();

console.log("Cloud Animation Studio 3D Engine Loaded");
