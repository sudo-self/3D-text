let scene, camera, renderer, controls, textMesh;
let fontLoader, textureLoader;
let userTexture = null;

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0f0f0);

  camera = new THREE.PerspectiveCamera(45, viewer.clientWidth / viewer.clientHeight, 0.1, 1000);
  camera.position.set(0, 2, 8);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(viewer.clientWidth, viewer.clientHeight);
  document.getElementById("viewer").appendChild(renderer.domElement);

  controls = new THREE.OrbitControls(camera, renderer.domElement);

  const light1 = new THREE.DirectionalLight(0xffffff, 1);
  light1.position.set(5, 10, 7.5);
  scene.add(light1);
  scene.add(new THREE.AmbientLight(0x888888));

  fontLoader = new THREE.FontLoader();
  textureLoader = new THREE.TextureLoader();

  updateText();

  animate();
}

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

// Update 3D Text
function updateText() {
  const text = document.getElementById("textInput").value;
  const color = document.getElementById("textColor").value;
  const depth = parseFloat(document.getElementById("depth").value);
  const bevel = parseFloat(document.getElementById("bevel").value);
  const curve = parseInt(document.getElementById("curve").value);
  const fontStyle = document.getElementById("fontStyle").value;

  fontLoader.load(`https://threejs.org/examples/fonts/${fontStyle}_regular.typeface.json`, font => {
    if (textMesh) {
      scene.remove(textMesh);
      textMesh.geometry.dispose();
    }

    const geometry = new THREE.TextGeometry(text, {
      font: font,
      size: 1,
      height: depth,
      curveSegments: curve,
      bevelEnabled: bevel > 0,
      bevelThickness: bevel,
      bevelSize: bevel * 0.2,
    });

    geometry.center();

    const material = new THREE.MeshStandardMaterial({
      color: color,
      map: userTexture || null,
    });

    textMesh = new THREE.Mesh(geometry, material);
    scene.add(textMesh);
  });
}

// File Upload
document.getElementById("textureInput").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    userTexture = textureLoader.load(event.target.result, () => updateText());
    const preview = document.getElementById("texturePreview");
    preview.src = event.target.result;
    preview.classList.remove("hidden");
  };
  reader.readAsDataURL(file);
});

// Generate via Worker
document.getElementById("generateTextureBtn").addEventListener("click", async () => {
  const prompt = document.getElementById("texturePrompt").value.trim();
  if (!prompt) return alert("Enter a prompt first!");

  try {
    const res = await fetch(`https://text-to-image.jessejesse.workers.dev/?prompt=${encodeURIComponent(prompt)}`);
    if (!res.ok) throw new Error("Worker request failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    userTexture = textureLoader.load(url, () => updateText());
    const preview = document.getElementById("texturePreview");
    preview.src = url;
    preview.classList.remove("hidden");
  } catch (err) {
    console.error(err);
    alert("Texture generation failed.");
  }
});

// Sliders update
["depth", "bevel", "curve"].forEach(id => {
  document.getElementById(id).addEventListener("input", e => {
    document.getElementById(id + "Value").textContent = e.target.value;
    updateText();
  });
});

// Text & color
document.getElementById("textInput").addEventListener("input", updateText);
document.getElementById("textColor").addEventListener("input", updateText);
document.getElementById("fontStyle").addEventListener("change", updateText);

// Download GLB
document.getElementById("downloadBtn").addEventListener("click", () => {
  if (!textMesh) return;
  const exporter = new THREE.GLTFExporter();

  exporter.parse(
    textMesh,
    result => {
      const metadata = {
        asset: { generator: "jessejesse.com Text-to-GLB", version: "2.0" },
        extras: { author: "jessejesse.com" }
      };
      if (result.asset) Object.assign(result.asset, metadata.asset);
      else result.asset = metadata.asset;
      result.extras = metadata.extras;

      const blob = result instanceof ArrayBuffer
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







