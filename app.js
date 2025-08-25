document.addEventListener("DOMContentLoaded", () => {
  let scene, camera, renderer, controls, textMesh;
  const loader = new THREE.FontLoader();
  const exporter = new THREE.GLTFExporter();
  const textureLoader = new THREE.TextureLoader();
  let userTexture = null;


  let currentText = "text-to-glb";
  let currentFont = "helvetiker";
  let currentDepth = 0.5;
  let currentMetalness = 0.5;
  let currentRoughness = 0.5;
  let currentColor = "#667eea";

  const canvasContainer = document.getElementById("renderCanvas");

  function init() {
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

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dir = new THREE.DirectionalLight(0xffffff, 1);
    dir.position.set(5, 10, 5);
    scene.add(dir);

    window.addEventListener("resize", onWindowResize);
    animate();
  }

  function onWindowResize() {
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

  function createText() {
    const fontUrl = `https://cdn.jsdelivr.net/npm/three@0.132.2/examples/fonts/${currentFont}_regular.typeface.json`;

    loader.load(fontUrl, font => {
      const geometry = new THREE.TextGeometry(currentText, {
        font,
        size: 1,
        height: currentDepth,
        curveSegments: 12,
        bevelEnabled: true,
        bevelThickness: 0.05,
        bevelSize: 0.05,
        bevelSegments: 3
      });
      geometry.center();

      let material;
      if (textMesh && textMesh.material) {
        material = textMesh.material; 
        material.color.set(currentColor);
        material.metalness = currentMetalness;
        material.roughness = currentRoughness;
        material.map = userTexture || null;
        material.needsUpdate = true;
      } else {
        material = new THREE.MeshStandardMaterial({
          color: currentColor,
          metalness: currentMetalness,
          roughness: currentRoughness,
          map: userTexture || null
        });
      }

      if (textMesh) scene.remove(textMesh);
      textMesh = new THREE.Mesh(geometry, material);
      scene.add(textMesh);
      fitCameraToObject(textMesh);
    });
  }


  const metalSlider = document.getElementById("metalness");
  const roughSlider = document.getElementById("roughness");
  const depthSlider = document.getElementById("depth");

  metalSlider.addEventListener("input", e => {
    currentMetalness = parseFloat(e.target.value);
    document.getElementById("metalValue").textContent = currentMetalness.toFixed(2);
    if (textMesh) {
      textMesh.material.metalness = currentMetalness;
      textMesh.material.needsUpdate = true;
    }
  });

  roughSlider.addEventListener("input", e => {
    currentRoughness = parseFloat(e.target.value);
    document.getElementById("roughValue").textContent = currentRoughness.toFixed(2);
    if (textMesh) {
      textMesh.material.roughness = currentRoughness;
      textMesh.material.needsUpdate = true;
    }
  });

  depthSlider.addEventListener("input", e => {
    currentDepth = parseFloat(e.target.value);
    document.getElementById("depthValue").textContent = currentDepth.toFixed(2);
    if (textMesh) {
      createText(); 
    }
  });


  const textureInput = document.getElementById("textureInput");
  const texturePreview = document.getElementById("texturePreview");

  textureInput.addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    userTexture = textureLoader.load(url);
    texturePreview.src = url;
    texturePreview.classList.remove("hidden");
    if (textMesh) textMesh.material.map = userTexture;
  });

  document.getElementById("generateBtn").addEventListener("click", () => {
    currentText = document.getElementById("textInput").value || "3D-Text";
    currentColor = document.getElementById("textColor").value;
    currentFont = document.getElementById("fontStyle").value;
    document.getElementById("loading").classList.remove("hidden");

    setTimeout(() => {
      createText();
      document.getElementById("loading").classList.add("hidden");
      document.getElementById("downloadBtn").disabled = false;
    }, 100);
  });

  // Export
  document.getElementById("downloadBtn").addEventListener("click", () => {
    if (!textMesh) return;

    exporter.parse(
      scene, // export whole scene
      result => {
        if (result.asset) {
          result.asset.extras = { website: "jessejesse.com" };
        } else {
          result.asset = { extras: { website: "jessejesse.com" } };
        }

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
});





