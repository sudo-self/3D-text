let scene, camera, renderer, controls, textMesh;
const loader = new THREE.FontLoader();
const exporter = new THREE.GLTFExporter();
const textureLoader = new THREE.TextureLoader();
let userTexture = null;

function init() {
  const canvasContainer = document.getElementById("renderCanvas");
  const width = canvasContainer.clientWidth;
  const height = canvasContainer.clientHeight;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);

  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.set(0, 2, 6);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  canvasContainer.appendChild(renderer.domElement);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  // Lighting
  const ambient = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambient);
  const dir = new THREE.DirectionalLight(0xffffff, 1);
  dir.position.set(5, 10, 5);
  scene.add(dir);

  window.addEventListener("resize", onWindowResize);
  animate();
}

function onWindowResize() {
  const canvasContainer = document.getElementById("renderCanvas");
  camera.aspect = canvasContainer.clientWidth / canvasContainer.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

function fitCameraToObject(object) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  object.position.sub(center);

  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = camera.fov * (Math.PI / 180);
  const cameraZ = maxDim / (2 * Math.tan(fov / 2)) * 1.5;

  camera.position.set(0, maxDim * 0.5, cameraZ);
  camera.lookAt(0, 0, 0);
  controls.update();
}

// Sliders
["metalness", "roughness", "depth"].forEach(id => {
  const slider = document.getElementById(id);
  const label = document.getElementById(id + "Value");
  slider.addEventListener("input", () => (label.textContent = parseFloat(slider.value).toFixed(2)));
});

// Texture input
document.getElementById("textureInput").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  userTexture = textureLoader.load(url);
  const preview = document.getElementById("texturePreview");
  preview.src = url;
  preview.classList.remove("hidden");
});

// Texture generation
document.getElementById("generateTextureBtn").addEventListener("click", async () => {
  const prompt = document.getElementById("texturePrompt").value.trim();
  if (!prompt) return alert("Enter a prompt!");

  const btn = document.getElementById("generateTextureBtn");
  btn.disabled = true;
  btn.querySelector("span").textContent = "Generating...";

  try {
    const res = await fetch(`https://text-to-image.jessejesse.workers.dev/?prompt=${encodeURIComponent(prompt)}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    userTexture = textureLoader.load(url);
    const preview = document.getElementById("texturePreview");
    preview.src = url;
    preview.classList.remove("hidden");
  } catch (err) {
    console.error(err);
    alert("Texture generation failed");
  } finally {
    btn.disabled = false;
    btn.querySelector("span").textContent = "Generate Texture";
  }
});

// Create text
function createText(text, color, fontName, depth, metalness = 0.5, roughness = 0.5) {
  const fontUrl = `https://cdn.jsdelivr.net/npm/three@0.132.2/examples/fonts/${fontName}_regular.typeface.json`;
  loader.load(
    fontUrl,
    font => {
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
      geometry.center();

      const material = userTexture
        ? new THREE.MeshStandardMaterial({ map: userTexture, metalness, roughness })
        : new THREE.MeshStandardMaterial({ color, metalness, roughness });

      if (textMesh) scene.remove(textMesh);
      textMesh = new THREE.Mesh(geometry, material);
      scene.add(textMesh);
      fitCameraToObject(textMesh);
    },
    undefined,
    err => console.error(err)
  );
}

// Generate button
document.getElementById("generateBtn").addEventListener("click", () => {
  const text = document.getElementById("textInput").value;
  const color = document.getElementById("textColor").value;
  const font = document.getElementById("fontStyle").value;
  const depth = parseFloat(document.getElementById("depth").value);
  const metalness = parseFloat(document.getElementById("metalness").value);
  const roughness = parseFloat(document.getElementById("roughness").value);

  document.getElementById("loading").classList.remove("hidden");
  setTimeout(() => {
    createText(text, color, font, depth, metalness, roughness);
    document.getElementById("loading").classList.add("hidden");
    document.getElementById("downloadBtn").disabled = false;
  }, 100);
});

// Download
document.getElementById("downloadBtn").addEventListener("click", () => {
  if (!textMesh) return;
  exporter.parse(
    textMesh,
    result => {
      const blob =
        result instanceof ArrayBuffer
          ? new Blob([result], { type: "model/gltf-binary" })
          : new Blob([JSON.stringify(result, null, 2)], { type: "model/gltf+json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "3d-text.glb";
      link.click();
    },
    { binary: true }
  );
});

init();






