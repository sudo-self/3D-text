let scene, camera, renderer, controls, textMesh;
const loader = new THREE.FontLoader();
const exporter = new THREE.GLTFExporter();
const textureLoader = new THREE.TextureLoader();
let userTexture = null;

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    const canvasContainer = document.getElementById("renderCanvas");
    const width = canvasContainer.clientWidth;
    const height = canvasContainer.clientHeight;

    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 2, 6);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    canvasContainer.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;


    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 7.5);
    scene.add(dirLight);

    window.addEventListener('resize', onWindowResize);
    animate();
}

function onWindowResize() {
    const canvasContainer = document.getElementById("renderCanvas");
    const width = canvasContainer.clientWidth;
    const height = canvasContainer.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
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
    let cameraZ = Math.abs(maxDim / (2 * Math.tan(fov / 2))) * 1.5;

    camera.position.set(0, maxDim * 0.6, cameraZ); 
    camera.lookAt(0, 0, 0);
    controls.update();
}


["metalness", "roughness", "depth"].forEach(id => {
    const slider = document.getElementById(id);
    const label = document.getElementById(id + "Value");
    slider.addEventListener("input", () => label.textContent = parseFloat(slider.value).toFixed(2));
});


document.getElementById("textureInput").addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    userTexture = textureLoader.load(url, () => console.log("User texture loaded"));
    const preview = document.getElementById("texturePreview");
    preview.src = url;
    preview.classList.remove("hidden");
});


document.getElementById("generateTextureBtn").addEventListener("click", async () => {
    const prompt = document.getElementById("texturePrompt").value.trim();
    if (!prompt) return alert("Enter a prompt for texture generation!");

    const btn = document.getElementById("generateTextureBtn");
    btn.disabled = true;
    btn.textContent = "Generating...";

    try {
        const res = await fetch(`https://text-to-image.jessejesse.workers.dev/?prompt=${encodeURIComponent(prompt)}`);
        if (!res.ok) throw new Error("Texture generation failed");

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        userTexture = textureLoader.load(url, () => console.log("AI texture loaded"));

        const preview = document.getElementById("texturePreview");
        preview.src = url;
        preview.classList.remove("hidden");
    } catch (err) {
        console.error(err);
        alert("Texture generation failed");
    } finally {
        btn.disabled = false;
        btn.textContent = "Generate Texture";
    }
});


function createText(text, color, fontName, depth, metalness = 0.5, roughness = 0.5) {
    const fontUrl = `https://cdn.jsdelivr.net/npm/three@0.132.2/examples/fonts/${fontName}_regular.typeface.json`;
    loader.load(fontUrl, font => {
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

        const material = userTexture
            ? new THREE.MeshStandardMaterial({ map: userTexture, metalness, roughness })
            : new THREE.MeshStandardMaterial({ color, metalness, roughness });

        if (textMesh) scene.remove(textMesh);
        textMesh = new THREE.Mesh(geometry, material);
        scene.add(textMesh);
        fitCameraToObject(textMesh);
    }, undefined, err => console.error("Font load error:", err));
}


document.getElementById("generateBtn").addEventListener("click", () => {
    const text = document.getElementById("textInput").value;
    const color = document.getElementById("textColor").value;
    const font = document.getElementById("fontStyle").value;
    const depth = parseFloat(document.getElementById("depth").value);
    const metalness = parseFloat(document.getElementById("metalness").value) || 0.5;
    const roughness = parseFloat(document.getElementById("roughness").value) || 0.5;

    document.getElementById("loading").classList.remove("hidden");
    setTimeout(() => {
        createText(text, color, font, depth, metalness, roughness);
        document.getElementById("loading").classList.add("hidden");
        document.getElementById("downloadBtn").disabled = false;
    }, 200);
});


document.getElementById("downloadBtn").addEventListener("click", () => {
    if (!textMesh) return;
    exporter.parse(textMesh, result => {
        const blob = result instanceof ArrayBuffer
            ? new Blob([result], { type: "model/gltf-binary" })
            : new Blob([JSON.stringify(result, null, 2)], { type: "model/gltf+json" });

        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "3d-text.glb";
        link.click();
    }, { binary: true });
});

init();





