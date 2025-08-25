
['metalness','roughness','depth'].forEach(id => {
  const slider = document.getElementById(id);
  const label = document.getElementById(id+'Value');
  slider.addEventListener('input', ()=> label.textContent=parseFloat(slider.value).toFixed(2));
});


document.getElementById("textureInput").addEventListener("change", e => {
  const file = e.target.files[0];
  if(!file) return;
  const url = URL.createObjectURL(file);
  userTexture = new THREE.TextureLoader().load(url);
  const preview = document.getElementById("texturePreview");
  preview.src = url;
  preview.classList.remove("hidden");
});


document.getElementById("generateTextureBtn").addEventListener("click", async () => {
  const prompt = document.getElementById("texturePrompt").value.trim();
  if(!prompt) return alert("Enter prompt!");
  document.getElementById("loading").classList.remove("hidden");

  try {
    const res = await fetch(`https://text-to-image.jessejesse.workers.dev/?prompt=${encodeURIComponent(prompt)}`);
    if(!res.ok) throw new Error("Failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    userTexture = new THREE.TextureLoader().load(url);
    const preview = document.getElementById("texturePreview");
    preview.src = url;
    preview.classList.remove("hidden");
  } catch(e) {
    console.error(e);
    alert("Texture generation failed");
  } finally {
    document.getElementById("loading").classList.add("hidden");
  }
});


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
  }, 500);
});


document.getElementById("downloadBtn").addEventListener("click", () => {
  if(!textMesh) return;
  exporter.parse(textMesh, result => {
    let blob = result instanceof ArrayBuffer
      ? new Blob([result], {type:"model/gltf-binary"})
      : new Blob([JSON.stringify(result,null,2)], {type:"model/gltf+json"});
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "3d-text.glb";
    link.click();
  }, {binary:true});
});



