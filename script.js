let scene, camera, renderer, controls, textMesh;
const loader = new THREE.FontLoader();
const exporter = new THREE.GLTFExporter();
const textureLoader = new THREE.TextureLoader();
let userTexture = null;

init();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);

  const width = document.getElementById("renderCanvas").clientWidth;
  const height = document.getElementById("renderCanvas").clientHeight;

  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.set(0, 2, 6);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  document.getElementById("renderCanvas").appendChild(renderer.domElement);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(5, 10, 7.5);
  scene.add(dirLight);

  animate();
}

// --- Slider updates ---
const sliders = [
  { id: "metalness", span: "metalValue" },
  { id: "roughness", span: "roughValue" },
  { id: "depth", span: "depthValue" }
];
sliders.forEach(s => {
  const slider = document.getElementById(s.id);
  const label = document.getElementById(s.span);
  slider.addEventListener("input", () => {
    label.textContent = slider.value;
  });
});

// --- User file upload ---
document.getElementById("textureInput")?.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  userTexture = textureLoader.load(url, () => {
    console.log("User texture loaded");
    document.getElementById("texturePreview").src = url;
    document.getElementById("texturePreview").classList.remove("hidden");
  });
});

// --- AI-generated texture ---
document.getElementById("generateTextureBtn")?.addEventListener("click", async () => {
  const prompt = document.getElementById("texturePrompt").value.trim();
  if (!prompt) return alert("Please enter a prompt for the texture!");

  const btn = document.getElementById("generateTextureBtn");
  btn.disabled = true;
  btn.textContent = "Generating...";

  try {
    const response = await fetch(`https://text-to-image.jessejesse.workers.dev/?prompt=${encodeURIComponent(prompt)}`);
    if (!response.ok) throw new Error("Failed to generate texture");

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    userTexture = textureLoader.load(url, () => console.log("AI texture loaded"));
    const preview = document.getElementById("generatedTexturePreview");
    preview.src = url;
    preview.classList.remove("hidden");

  } catch (err) {
    console.error(err);
    alert("Texture generation failed");
  } finally {
    btn.disabled = false;
    btn.textContent = "Generate";
  }
});

// --- Create 3D text ---
function createText(text, color, fontName, depth, metalness = 0.5, roughness = 0.5) {
  loader.load(`https://threejs.org/examples/fonts/${fontName}_regular.typeface.json`, (font) => {
    const geometry = new THREE.TextGeometry(text, {
      font,
      size: 1,
      height: depth,
      curveSegments: 12,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 3
    });

    geometry.computeBoundingBox();
    geometry.center();

    let material;
    if (userTexture) {
      material = new THREE.MeshStandardMaterial({ map: userTexture, metalness, roughness });
    } else {
      material = new THREE.MeshStandardMaterial({ color, metalness, roughness });
    }

    const mesh = new THREE.Mesh(geometry, material);

    if (textMesh) scene.remove(textMesh);
    textMesh = mesh;
    scene.add(mesh);

    fitCameraToObject(mesh, camera, controls);
  });
}

// --- Camera fit ---
function fitCameraToObject(object, camera, controls) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  object.position.sub(center);

  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = camera.fov * (Math.PI / 180);
  let cameraZ = Math.abs(maxDim / (2 * Math.tan(fov / 2))) * 1.5;

  camera.position.set(0, 0, cameraZ);
  camera.lookAt(0, 0, 0);
  controls.update();
}

// --- Animate ---
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

// --- Generate button ---
document.getElementById("generateBtn")?.addEventListener("click", () => {
  const text = document.getElementById("textInput").value;
  const color = document.getElementById("textColor").value;
  const font = document.getElementById("fontStyle").value;
  const depth = parseFloat(document.getElementById("depth").value);
  const metalness = parseFloat(document.getElementById("metalness")?.value) || 0.5;
  const roughness = parseFloat(document.getElementById("roughness")?.value) || 0.5;

  document.getElementById("loading").classList.remove("hidden");
  setTimeout(() => {
    createText(text, color, font, depth, metalness, roughness);
    document.getElementById("loading").classList.add("hidden");
    document.getElementById("downloadBtn").disabled = false;
  }, 500);
});

// --- Download button ---
document.getElementById("downloadBtn")?.addEventListener("click", () => {
  if (!textMesh) return;

  exporter.parse(
    textMesh,
    (result) => {
      let blob;
      if (result instanceof ArrayBuffer) {
        blob = new Blob([result], { type: "model/gltf-binary" });
      } else {
        blob = new Blob([JSON.stringify(result, null, 2)], { type: "model/gltf+json" });
      }

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "3d-text.glb";
      link.click();
    },
    { binary: true }
  );
});


