import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const app = document.getElementById("app");

const state = {
  gallery: null,
  selectedId: null,
  category: "All",
  lodIndex: 0,
  renderMode: "solid",
  autoRotate: false,
  activeObject: null,
  modelToken: 0,
};

const three = {
  scene: null,
  camera: null,
  renderer: null,
  controls: null,
  loader: new GLTFLoader(),
  materials: null,
  container: null,
  status: null,
  animationId: null,
};

const renderModes = [
  { id: "solid", label: "Solid", note: "Studio clay" },
  { id: "wire", label: "Wire", note: "Topology lines" },
  { id: "edges", label: "Edges", note: "Clay + outline" },
  { id: "normals", label: "Normals", note: "Surface direction" },
];

const icons = {
  cube: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.7 20 7v9.9l-8 4.4-8-4.4V7l8-4.3Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="m4.4 7.3 7.6 4.2 7.6-4.2M12 11.5v8.7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`,
  reset: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.8 10a7.5 7.5 0 1 1 2.1 7.3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M4.8 4.8V10h5.1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  play: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M10 8.8 15.4 12 10 15.2V8.8Z" fill="currentColor"/></svg>`,
  pause: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M9 8.4h2.1v7.2H9zm4 0h2.1v7.2H13z" fill="currentColor"/></svg>`,
  download: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5v11m0 0 4-4m-4 4-4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 18.5h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  github: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8a9.2 9.2 0 0 0-2.9 17.9c.46.08.63-.2.63-.44v-1.55c-2.58.56-3.12-1.1-3.12-1.1-.42-1.08-1.03-1.37-1.03-1.37-.85-.58.06-.57.06-.57.94.07 1.43.97 1.43.97.83 1.42 2.17 1.01 2.7.78.08-.6.32-1.01.58-1.24-2.06-.24-4.22-1.03-4.22-4.57 0-1.01.36-1.84.96-2.49-.1-.24-.42-1.2.1-2.45 0 0 .79-.25 2.57.95A8.8 8.8 0 0 1 12 6.29c.79 0 1.58.11 2.32.32 1.78-1.2 2.56-.95 2.56-.95.52 1.25.2 2.21.1 2.45.6.65.96 1.48.96 2.49 0 3.55-2.17 4.32-4.23 4.56.33.29.63.86.63 1.74v2.58c0 .25.16.53.64.44A9.2 9.2 0 0 0 12 2.8Z" fill="currentColor"/></svg>`,
  chevronLeft: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 5-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  chevronRight: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 5 7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};

init().catch((error) => {
  app.className = "fatal-screen";
  app.textContent = error instanceof Error ? error.message : "Gallery unavailable";
});

async function init() {
  const response = await fetch("./assets/gallery.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Gallery request was unsuccessful: ${response.status}`);
  }

  state.gallery = await response.json();
  state.selectedId = state.gallery.items[0]?.id ?? null;
  render();
  setupThree();
  await loadSelectedModel();
  animate();
}

function render() {
  const selected = getSelectedItem();
  const selectedLod = selected?.lods[state.lodIndex] ?? null;

  app.className = "app-shell";
  app.innerHTML = `
    <header class="topbar">
      <h1 class="brand">${escapeHtml(state.gallery.title)}</h1>
      <nav class="nav" aria-label="Primary">
        <a href="#gallery" aria-current="page">Gallery</a>
        <a href="#about">About</a>
        <a href="#sources">Sources</a>
      </nav>
      <a class="github-link" href="https://github.com/Hitsuki-Ban/asset-postprocess-showcase" aria-label="GitHub repository">
        ${icons.github}
      </a>
    </header>
    <main id="gallery" class="workspace">
      <div class="controls-row">
        <div class="filter-tabs" role="tablist" aria-label="Gallery categories">
          ${state.gallery.categories.map(categoryButton).join("")}
        </div>
        <div class="viewer-actions" aria-label="Viewer controls">
          <button type="button" class="tool-button" data-action="reset">${icons.reset}<span>Reset View</span></button>
          <button type="button" class="tool-button ${state.autoRotate ? "is-active" : ""}" data-action="rotate">
            ${state.autoRotate ? icons.pause : icons.play}<span>Auto Rotate</span>
          </button>
        </div>
      </div>
      <section class="gallery-main">
        <div class="viewer-frame" id="viewer-frame">
          <div class="viewer-mark">${icons.cube}</div>
          <div class="viewer-mode-readout">${escapeHtml(currentRenderMode().label)} · ${escapeHtml(selectedLod?.id ?? "LOD0")}</div>
          <div class="model-status is-visible" id="model-status">Loading model...</div>
          <div class="viewer-hints" aria-hidden="true">
            <span class="hint"><span class="hint-icon"></span>Orbit</span>
            <span class="hint"><span class="hint-icon"></span>Zoom</span>
            <span class="hint"><span class="hint-icon"></span>Pan</span>
          </div>
        </div>
        ${selected && selectedLod ? detailsTemplate(selected, selectedLod) : emptyTemplate()}
      </section>
      <section class="exhibit-rail" aria-label="Selected artifacts">
        <button type="button" class="rail-arrow prev" data-action="rail-prev" aria-label="Previous exhibits">${icons.chevronLeft}</button>
        <div class="rail-scroll" id="rail-scroll">
          ${filteredItems().map(railButton).join("")}
        </div>
        <button type="button" class="rail-arrow next" data-action="rail-next" aria-label="Next exhibits">${icons.chevronRight}</button>
      </section>
    </main>
    <footer class="footer" id="about">
      <span>Interactive white-model LOD gallery built for public preview.</span>
      <span aria-hidden="true">•</span>
      <a id="sources" href="https://github.com/Hitsuki-Ban/asset-postprocess-showcase#source-scope">Source scope</a>
      <span aria-hidden="true">•</span>
      <a href="https://opensource.org/license/mit">MIT License</a>
    </footer>
  `;

  bindEvents();
  three.container = document.getElementById("viewer-frame");
  three.status = document.getElementById("model-status");
  if (
    three.renderer &&
    three.container &&
    three.renderer.domElement.parentElement !== three.container
  ) {
    three.container.appendChild(three.renderer.domElement);
  }
}

function categoryButton(category) {
  const active = state.category === category ? "is-active" : "";
  return `
    <button type="button" class="filter-tab ${active}" role="tab" aria-selected="${state.category === category}" data-category="${escapeAttr(category)}">
      ${escapeHtml(category)}
    </button>
  `;
}

function detailsTemplate(item, selectedLod) {
  return `
    <aside class="details-panel" aria-label="Selected artifact details">
      <div class="details-title">
        <h2>${escapeHtml(item.title)}</h2>
        <div class="source-row">
          <span class="source-icon">${icons.cube}</span>
          <span>
            <strong>Source Family</strong>
            ${escapeHtml(item.source_family)}<br />
            ${escapeHtml(item.source_note)}
          </span>
        </div>
      </div>
      <div class="divider"></div>
      <section aria-label="LOD selection">
        <p class="panel-label">LOD</p>
        <div class="lod-tabs" role="tablist" aria-label="LOD levels">
          ${item.lods.map(lodButton).join("")}
        </div>
        <div class="lod-table" aria-label="LOD budgets and file sizes">
          ${item.lods.map((lod, index) => lodRow(lod, index)).join("")}
        </div>
      </section>
      <div class="divider"></div>
      <section aria-label="Render mode selection">
        <p class="panel-label">Render</p>
        <div class="render-mode-grid" role="radiogroup" aria-label="Render mode">
          ${renderModes.map(renderModeButton).join("")}
        </div>
      </section>
      <div class="divider"></div>
      <a class="download-link" href="${escapeAttr(selectedLod.url)}" download>
        ${icons.download}
        <span>Download ${escapeHtml(selectedLod.id)} GLB (${escapeHtml(selectedLod.size_label)})</span>
      </a>
    </aside>
  `;
}

function renderModeButton(mode) {
  const active = state.renderMode === mode.id ? "is-active" : "";
  return `
    <button type="button" class="render-mode-button ${active}" role="radio" aria-checked="${state.renderMode === mode.id}" data-render-mode="${escapeAttr(mode.id)}">
      <strong>${escapeHtml(mode.label)}</strong>
      <span>${escapeHtml(mode.note)}</span>
    </button>
  `;
}

function lodButton(lod, index) {
  const active = index === state.lodIndex ? "is-active" : "";
  return `
    <button type="button" class="lod-tab ${active}" role="tab" aria-selected="${index === state.lodIndex}" data-lod="${index}">
      ${escapeHtml(lod.id)}
    </button>
  `;
}

function lodRow(lod, index) {
  const active = index === state.lodIndex ? "is-active" : "";
  return `
    <div class="lod-row ${active}">
      <span><span class="lod-dot"></span>${escapeHtml(lod.id)}</span>
      <span>${escapeHtml(lod.budget.toLocaleString())}</span>
      <span>${escapeHtml(lod.size_label)}</span>
    </div>
  `;
}

function railButton(item) {
  const active = item.id === state.selectedId ? "is-active" : "";
  return `
    <button type="button" class="rail-button ${active}" data-select="${escapeAttr(item.id)}" aria-label="View ${escapeAttr(item.title)}">
      <img src="${escapeAttr(item.thumbnail)}" alt="${escapeAttr(item.title)} thumbnail" loading="lazy" />
      <strong>${escapeHtml(item.title)}</strong>
      <span>${escapeHtml(item.category)}</span>
    </button>
  `;
}

function emptyTemplate() {
  return `<aside class="details-panel">No artifacts available.</aside>`;
}

function bindEvents() {
  app.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", async () => {
      state.category = button.dataset.category;
      const items = filteredItems();
      if (items.length > 0 && !items.some((item) => item.id === state.selectedId)) {
        state.selectedId = items[0].id;
        state.lodIndex = 0;
      }
      render();
      resizeRenderer();
      await loadSelectedModel(true);
    });
  });

  app.querySelectorAll("[data-select]").forEach((button) => {
    button.addEventListener("click", async () => {
      state.selectedId = button.dataset.select;
      state.lodIndex = 0;
      render();
      resizeRenderer();
      await loadSelectedModel(true);
    });
  });

  app.querySelectorAll("[data-lod]").forEach((button) => {
    button.addEventListener("click", async () => {
      state.lodIndex = Number(button.dataset.lod);
      render();
      resizeRenderer();
      await loadSelectedModel(false);
    });
  });

  app.querySelectorAll("[data-render-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.renderMode = button.dataset.renderMode;
      applyRenderMode(state.activeObject);
      render();
      resizeRenderer();
      hideModelStatus();
    });
  });

  app.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      const action = button.dataset.action;
      if (action === "reset") {
        resetView();
      } else if (action === "rotate") {
        state.autoRotate = !state.autoRotate;
        render();
        resizeRenderer();
        await loadSelectedModel(false, true);
      } else if (action === "rail-prev" || action === "rail-next") {
        const rail = document.getElementById("rail-scroll");
        if (rail) {
          rail.scrollBy({ left: action === "rail-prev" ? -360 : 360, behavior: "smooth" });
        }
      }
    });
  });
}

function setupThree() {
  three.container = document.getElementById("viewer-frame");
  three.status = document.getElementById("model-status");
  three.scene = new THREE.Scene();
  three.scene.background = null;

  three.camera = new THREE.PerspectiveCamera(38, 1, 0.01, 100);
  three.camera.position.set(3.2, 2.2, 4.2);

  three.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  three.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  three.renderer.outputColorSpace = THREE.SRGBColorSpace;
  three.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  three.renderer.toneMappingExposure = 0.82;
  three.renderer.shadowMap.enabled = true;
  three.renderer.shadowMap.type = THREE.PCFShadowMap;
  three.container.appendChild(three.renderer.domElement);
  three.materials = createMaterials();

  three.controls = new OrbitControls(three.camera, three.renderer.domElement);
  three.controls.enableDamping = true;
  three.controls.dampingFactor = 0.07;
  three.controls.minDistance = 1.8;
  three.controls.maxDistance = 8;
  three.controls.enablePan = true;
  three.controls.target.set(0, 0.15, 0);

  const ambient = new THREE.HemisphereLight(0xffffff, 0xcdd3d8, 1.15);
  three.scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.25);
  keyLight.position.set(3.4, 4.8, 3.8);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 20;
  three.scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0xdfefff, 0.72);
  rimLight.position.set(-3, 2.6, -2.2);
  three.scene.add(rimLight);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(2.1, 96),
    new THREE.ShadowMaterial({ color: 0x8b929a, opacity: 0.18 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.04;
  floor.receiveShadow = true;
  three.scene.add(floor);

  resizeRenderer();
  window.addEventListener("resize", resizeRenderer);
}

async function loadSelectedModel(resetCamera = true, keepObject = false) {
  if (!three.scene || !three.loader) return;
  const item = getSelectedItem();
  const lod = item?.lods[state.lodIndex];
  if (!item || !lod) return;

  const token = ++state.modelToken;
  showModelStatus("Loading model...");

  if (keepObject && state.activeObject) {
    hideModelStatus();
    return;
  }

  try {
    const gltf = await three.loader.loadAsync(lod.url);
    if (token !== state.modelToken) return;
    if (state.activeObject) {
      three.scene.remove(state.activeObject);
      disposeObject(state.activeObject);
      state.activeObject = null;
    }

    const root = gltf.scene;
    prepareModel(root);
    centerAndScale(root);
    three.scene.add(root);
    state.activeObject = root;

    if (resetCamera) {
      resetView();
    }
    hideModelStatus();
  } catch (error) {
    console.error(error);
    showModelStatus("Model unavailable");
  }
}

function prepareModel(root) {
  root.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;
    if (node.geometry && !node.geometry.attributes.normal) {
      node.geometry.computeVertexNormals();
    }
  });
  applyRenderMode(root);
}

function createMaterials() {
  const solid = new THREE.MeshStandardMaterial({
    color: 0xd8d6d1,
    roughness: 0.66,
    metalness: 0.02,
    envMapIntensity: 0.35,
    side: THREE.DoubleSide,
  });

  const edgeClay = new THREE.MeshStandardMaterial({
    color: 0xe6e3dd,
    roughness: 0.7,
    metalness: 0,
    envMapIntensity: 0.22,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });

  return {
    solid,
    edgeClay,
    wire: new THREE.MeshBasicMaterial({
      color: 0x27343b,
      wireframe: true,
      transparent: true,
      opacity: 0.82,
      side: THREE.DoubleSide,
    }),
    normals: new THREE.MeshNormalMaterial({
      flatShading: false,
      side: THREE.DoubleSide,
    }),
    edges: new THREE.LineBasicMaterial({
      color: 0x20343b,
      transparent: true,
      opacity: 0.42,
      depthTest: true,
    }),
  };
}

function applyRenderMode(root) {
  if (!root || !three.materials) return;
  const mode = state.renderMode;
  root.traverse((node) => {
    if (!node.isMesh) return;
    const edgeOverlay = ensureEdgeOverlay(node);
    edgeOverlay.visible = mode === "edges";
    node.castShadow = mode !== "wire" && mode !== "normals";
    node.receiveShadow = mode !== "wire" && mode !== "normals";

    if (mode === "wire") {
      node.material = three.materials.wire;
    } else if (mode === "normals") {
      node.material = three.materials.normals;
    } else if (mode === "edges") {
      node.material = three.materials.edgeClay;
    } else {
      node.material = three.materials.solid;
    }
  });
}

function ensureEdgeOverlay(mesh) {
  if (mesh.userData.edgeOverlay) return mesh.userData.edgeOverlay;
  const geometry = new THREE.EdgesGeometry(mesh.geometry, 18);
  const line = new THREE.LineSegments(geometry, three.materials.edges);
  line.name = "edge-overlay";
  line.renderOrder = 2;
  line.visible = false;
  mesh.add(line);
  mesh.userData.edgeOverlay = line;
  return line;
}

function centerAndScale(root) {
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  root.position.sub(center);
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  root.scale.setScalar(2.5 / maxDim);

  const scaledBox = new THREE.Box3().setFromObject(root);
  root.position.y -= scaledBox.min.y + 1.02;
}

function resetView() {
  if (!three.camera || !three.controls) return;
  three.camera.position.set(3.2, 2.1, 4.2);
  three.controls.target.set(0, 0.05, 0);
  three.controls.update();
}

function animate() {
  three.animationId = requestAnimationFrame(animate);
  if (state.activeObject && state.autoRotate) {
    state.activeObject.rotation.y += 0.006;
  }
  three.controls?.update();
  if (three.renderer && three.scene && three.camera) {
    three.renderer.render(three.scene, three.camera);
  }
}

function resizeRenderer() {
  if (!three.renderer || !three.camera || !three.container) return;
  const { clientWidth, clientHeight } = three.container;
  if (clientWidth === 0 || clientHeight === 0) return;
  three.camera.aspect = clientWidth / clientHeight;
  three.camera.updateProjectionMatrix();
  three.renderer.setSize(clientWidth, clientHeight, false);
}

function showModelStatus(message) {
  if (!three.status) return;
  three.status.textContent = message;
  three.status.classList.add("is-visible");
}

function hideModelStatus() {
  if (!three.status) return;
  three.status.classList.remove("is-visible");
}

function disposeObject(object) {
  object.traverse((node) => {
    if (node.isMesh || node.isLineSegments) {
      node.geometry?.dispose?.();
    }
  });
}

function getSelectedItem() {
  return state.gallery.items.find((item) => item.id === state.selectedId) ?? state.gallery.items[0];
}

function filteredItems() {
  if (state.category === "All") return state.gallery.items;
  return state.gallery.items.filter((item) => item.category === state.category);
}

function currentRenderMode() {
  return renderModes.find((mode) => mode.id === state.renderMode) ?? renderModes[0];
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}
