let scene, camera, renderer, controls, textMesh;
const loader = new THREE.FontLoader();
const exporter = new THREE.GLTFExporter();

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

function createText(text, color, fontName, depth, metalness = 0.5, roughness = 0.5) {
  loader.load(
    `https://threejs.org/examples/fonts/${fontName}_regular.typeface.json`,
    function (font) {
      const geometry = new THREE.TextGeometry(text, {
        font: font,
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

   
      const material = new THREE.MeshStandardMaterial({
        color: color,
        metalness: metalness,
        roughness: roughness
      });

      const mesh = new THREE.Mesh(geometry, material);

      if (textMesh) scene.remove(textMesh);
      textMesh = mesh;
      scene.add(mesh);

      fitCameraToObject(mesh, camera, controls);
    }
  );
}


function fitCameraToObject(object, camera, controls) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  object.position.sub(center);

  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = camera.fov * (Math.PI / 180);
  let cameraZ = Math.abs(maxDim / (2 * Math.tan(fov / 2)));
  cameraZ *= 1.5;

  camera.position.set(0, 0, cameraZ);
  camera.lookAt(0, 0, 0);
  controls.update();
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

document.getElementById("generateBtn").addEventListener("click", () => {
  const text = document.getElementById("textInput").value;
  const color = document.getElementById("textColor").value;
  const font = document.getElementById("fontStyle").value;
  const depth = parseFloat(document.getElementById("depth").value);

  document.getElementById("loading").classList.remove("hidden");
  setTimeout(() => {
    createText(text, color, font, depth);
    document.getElementById("loading").classList.add("hidden");
    document.getElementById("downloadBtn").disabled = false;
  }, 500);
});

document.getElementById("downloadBtn").addEventListener("click", () => {
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
