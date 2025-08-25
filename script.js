document.addEventListener("DOMContentLoaded", () => {
  let scene, camera, renderer, controls, textMesh;
  const loader = new THREE.FontLoader();
  const exporter = new THREE.GLTFExporter();
  const textureLoader = new THREE.TextureLoader();
  let userTexture = null;

  let currentText = "3D-Text";
  let currentFont = "helvetiker";
  let currentDepth = 1;
  let currentBevel = 0.2;
  let currentCurve = 12;
  let currentColor = "#667eea";

  const viewer = document.getElementById("viewer");

  function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    const width = viewer.clientWidth;
    const height = viewer.clientHeight;

    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 2, 6);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    viewer.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dir = new THREE.DirectionalLight(0xffffff, 1);
    dir.position.set(5, 10, 5);
    scene.add(dir);

    window.addEventListener("resize", onWindowResize);
    animate();
  }

  function onWindowResize() {
    camera.aspect = viewer.clientWidth / viewer.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(viewer.clientWidth, viewer.clientHeight);
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

  function createText() {
    const fontUrl = `https://cdn.jsdelivr.net/npm/three@0.132.2/examples/fonts/${currentFont}_regular.typeface.json`;

    loader.load(fontUrl, font => {
      const geometry = new THREE.TextGeometry(currentText, {
        font,
        size: 1,
        height: currentDepth,
        curveSegments: currentCurve,
        bevelEnabled: true,
        bevelThickness: currentBevel,
        bevelSize: currentBevel,
        bevelSegments: 3
      });
      geometry.center();

      let material;
      if (textMesh && textMesh.material) {
        material = textMesh.material;
        material.color.set(currentColor);
        material.map = userTexture || null;
        material.needsUpdate = true;
      } else {
        material = new THREE.MeshStandardMaterial({
          color: currentColor,
          map: userTexture || null
        });
      }

      if (textMesh) scene.remove(textMesh);
      textMesh = new THREE.Mesh(geometry, material);
      scene.add(textMesh);
      fitCameraToObject(textMesh);
    });
  }

  // --- UI Controls ---
  const depthSlider = document.getElementById("depth");
  const bevelSlider = document.getElementById("bevel");
  const curveSlider = document.getElementById("curve");

  depthSlider.addEventListener("input", e => {
    currentDepth = parseFloat(e.target.value);
    document.getElementById("depthValue").textContent = currentDepth.toFixed(2);
    if (textMesh) createText();
  });

  bevelSlider.addEventListener("input", e => {
    currentBevel = parseFloat(e.target.value);
    document.getElementById("bevelValue").textContent = currentBevel.toFixed(2);
    if (textMesh) createText();
  });

  curveSlider.addEventListener("input", e => {
    currentCurve = parseInt(e.target.value);
    document.getElementById("curveValue").textContent = currentCurve;
    if (textMesh) createText();
  });

  // --- Texture Upload ---
  const textureInput = document.getElementById("textureInput");
  const texturePreview = document.getElementById("texturePreview");

  textureInput.addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    userTexture = textureLoader.load(url);
    texturePreview.src = url;
    texturePreview.classList.remove("hidden");
    if (textMesh) {
      textMesh.material.map = userTexture;
      textMesh.material.needsUpdate = true;
    }
  });

  // --- Worker-generated texture ---
  const generateTextureBtn = document.getElementById("generateTextureBtn");
  const texturePromptInput = document.getElementById("texturePrompt");

  generateTextureBtn.addEventListener("click", async () => {
    const prompt = texturePromptInput.value.trim();
    if (!prompt) return alert("Enter a texture prompt first.");
    try {
      const response = await fetch(`https://text-to-image.jessejesse.workers.dev/?prompt=${encodeURIComponent(prompt)}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      userTexture = textureLoader.load(url);
      texturePreview.src = url;
      texturePreview.classList.remove("hidden");
      if (textMesh) {
        textMesh.material.map = userTexture;
        textMesh.material.needsUpdate = true;
      }
    } catch (err) {
      console.error("Failed to generate texture:", err);
      alert("Texture generation failed.");
    }
  });

  // --- Generate 3D Text ---
  document.getElementById("generateBtn").addEventListener("click", () => {
    currentText = document.getElementById("textInput").value || "3D-Text";
    currentColor = document.getElementById("textColor").value;
    currentFont = document.getElementById("fontStyle").value;
    createText();
  });

  // --- Download GLB ---
  document.getElementById("downloadBtn").addEventListener("click", () => {
    if (!textMesh) return;

    exporter.parse(scene, result => {
      const blob = new Blob([result instanceof ArrayBuffer ? result : JSON.stringify(result, null, 2)], {
        type: "model/gltf-binary"
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "3d-text.glb";
      link.click();
    }, { binary: true });
  });

  init();
});









