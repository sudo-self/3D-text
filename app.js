document.addEventListener("DOMContentLoaded", () => {
  let scene, camera, renderer, controls, textMesh;
  const loader = new THREE.FontLoader();
  const exporter = new THREE.GLTFExporter();
  const textureLoader = new THREE.TextureLoader();
  let userTexture = null;

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

    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambient);
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

        // Ensure sliders always update the current material
        metalSlider.dispatchEvent(new Event("input"));
        roughSlider.dispatchEvent(new Event("input"));
        depthSlider.dispatchEvent(new Event("input"));
      },
      undefined,
      err => console.error(err)
    );
  }

  const metalSlider = document.getElementById("metalness");
  const roughSlider = document.getElementById("roughness");
  const depthSlider = document.getElementById("depth");

  metalSlider.addEventListener("input", e => {
    const value = parseFloat(e.target.value);
    document.getElementById("metalValue").textContent = value.toFixed(2);
    if (textMesh && textMesh.material) {
      textMesh.material.metalness = value;
      textMesh.material.needsUpdate = true;
    }
  });

  roughSlider.addEventListener("input", e => {
    const value = parseFloat(e.target.value);
    document.getElementById("roughValue").textContent = value.toFixed(2);
    if (textMesh && textMesh.material) {
      textMesh.material.roughness = value;
      textMesh.material.needsUpdate = true;
    }
  });

  depthSlider.addEventListener("input", e => {
    const value = parseFloat(e.target.value);
    document.getElementById("depthValue").textContent = value.toFixed(2);
    if (textMesh && textMesh.geometry) {
      const geom = new THREE.TextGeometry(
        textMesh.geometry.parameters.text,
        {
          font: textMesh.geometry.parameters.font,
          size: 1,
          height: value,
          curveSegments: 12,
          bevelEnabled: true,
          bevelThickness: 0.05,
          bevelSize: 0.05,
          bevelSegments: 3
        }
      );
      geom.center();
      textMesh.geometry.dispose();
      textMesh.geometry = geom;
      fitCameraToObject(textMesh);
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
  });

  const generateTextureBtn = document.getElementById("generateTextureBtn");
  generateTextureBtn.addEventListener("click", async () => {
    const prompt = document.getElementById("texturePrompt").value.trim();
    if (!prompt) return alert("Enter a prompt!");

    generateTextureBtn.disabled = true;
    generateTextureBtn.querySelector("span").textContent = "Generating...";

    try {
      const res = await fetch(`https://text-to-image.jessejesse.workers.dev/?prompt=${encodeURIComponent(prompt)}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      userTexture = textureLoader.load(url);
      texturePreview.src = url;
      texturePreview.classList.remove("hidden");
    } catch (err) {
      console.error(err);
      alert("Texture generation failed");
    } finally {
      generateTextureBtn.disabled = false;
      generateTextureBtn.querySelector("span").textContent = "Generate Texture";
    }
  });

  const generateBtn = document.getElementById("generateBtn");
  generateBtn.addEventListener("click", () => {
    const text = document.getElementById("textInput").value;
    const color = document.getElementById("textColor").value;
    const font = document.getElementById("fontStyle").value;
    const depth = parseFloat(depthSlider.value);
    const metalness = parseFloat(metalSlider.value);
    const roughness = parseFloat(roughSlider.value);

    document.getElementById("loading").classList.remove("hidden");
    setTimeout(() => {
      createText(text, color, font, depth, metalness, roughness);
      document.getElementById("loading").classList.add("hidden");
      document.getElementById("downloadBtn").disabled = false;
    }, 100);
  });

  const downloadBtn = document.getElementById("downloadBtn");
  downloadBtn.addEventListener("click", () => {
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
});








