const app = document.getElementById("app");

const state = {
  manifest: null,
  selectedId: null,
  category: "All",
};

const statusClass = (status) => `status-chip status-${String(status || "unknown").toLowerCase()}`;

const formatPercent = (value) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "n/a";
  return `${Math.round(value * 100)}%`;
};

const formatCounts = (counts) => {
  if (!counts || Object.keys(counts).length === 0) return "none";
  return Object.entries(counts)
    .map(([key, value]) => `${value} ${key}`)
    .join(" / ");
};

const formatTargets = (targets) => {
  if (!targets || Object.keys(targets).length === 0) return "n/a";
  return Object.entries(targets)
    .map(([key, value]) => `${key} ${value}`)
    .join(" / ");
};

const safeItems = () => state.manifest?.items ?? [];

async function loadManifest() {
  const response = await fetch("./assets/manifest.json", { cache: "no-store" });
  if (!response.ok) throw new Error(`Manifest request failed: ${response.status}`);
  state.manifest = await response.json();
  state.selectedId = safeItems()[0]?.id ?? null;
  render();
}

function render() {
  const items = safeItems();
  const selected = items.find((item) => item.id === state.selectedId) ?? items[0] ?? null;
  const categories = ["All", ...Array.from(new Set(items.map((item) => item.category))).sort()];
  const filtered =
    state.category === "All" ? items : items.filter((item) => item.category === state.category);

  app.className = "page";
  app.innerHTML = `
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark" aria-hidden="true"></span>
        <div>
          <h1>${escapeHtml(state.manifest.title)}</h1>
          <span>${escapeHtml(state.manifest.generated_at_utc)}</span>
        </div>
      </div>
      <div class="topbar-metrics">
        ${metric("Evidence", state.manifest.summary.item_count)}
        ${metric("Pass", state.manifest.summary.status_counts.pass ?? 0)}
        ${metric("Warning", state.manifest.summary.status_counts.warning ?? 0)}
        ${metric("Fail", state.manifest.summary.status_counts.fail ?? 0)}
      </div>
    </header>
    ${selected ? selectedTemplate(selected) : emptyTemplate()}
    <nav class="toolbar" aria-label="Evidence filters">
      ${categories
        .map(
          (category) => `
            <button type="button" class="${state.category === category ? "is-active" : ""}" data-category="${escapeAttr(category)}">
              ${escapeHtml(category)}
            </button>
          `,
        )
        .join("")}
    </nav>
    <section class="gallery-grid" aria-label="Showcase evidence">
      ${filtered.map((item) => tileTemplate(item, selected?.id === item.id)).join("")}
    </section>
    ${selected ? packageSectionTemplate(selected) : ""}
  `;

  app.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      state.category = button.dataset.category;
      const visible = safeItems().filter(
        (item) => state.category === "All" || item.category === state.category,
      );
      if (visible.length > 0 && !visible.some((item) => item.id === state.selectedId)) {
        state.selectedId = visible[0].id;
      }
      render();
    });
  });
  app.querySelectorAll("[data-select]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedId = button.dataset.select;
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

function metric(label, value) {
  return `
    <div class="metric">
      <strong>${escapeHtml(String(value))}</strong>
      <span>${escapeHtml(label)}</span>
    </div>
  `;
}

function selectedTemplate(item) {
  return `
    <section class="hero">
      <div class="hero-media">
        <div class="hero-head">
          <div>
            <h2>${escapeHtml(item.title)}</h2>
            <p>${escapeHtml(item.summary_note || item.category)}</p>
          </div>
          <span class="${statusClass(item.status)}">${escapeHtml(item.status)}</span>
        </div>
        ${
          item.images.length
            ? `<div class="contact-grid">${item.images.slice(0, 3).map(imageTemplate).join("")}</div>`
            : `<div class="empty-frame">No staged visual evidence</div>`
        }
      </div>
      <aside class="fact-panel">
        <h3>Evidence Summary</h3>
        <div class="fact-grid">
          ${fact("Samples", item.benchmark.sample_count ?? "n/a")}
          ${fact("Packages", item.visual_qa.package_count ?? "n/a")}
          ${fact("Non-pass", formatPercent(item.benchmark.non_pass_rate))}
          ${fact("Routes", formatCounts(item.benchmark.selected_route_counts))}
          ${fact("LOD policy", formatCounts(item.benchmark.lod_policy_counts))}
          ${fact("Retry", formatCounts(item.benchmark.feature_risk_retry_counts))}
          ${fact("LOD max", formatTargets(item.benchmark.effective_lod_target_max))}
          ${fact("Benchmark", formatCounts(item.benchmark.status_counts))}
          ${fact("Visual QA", formatCounts(item.visual_qa.status_counts))}
          ${fact("Acceptance", item.acceptance.status)}
        </div>
        ${parametersTemplate(item.run_parameters)}
        <div class="link-stack">
          ${item.links.map((link) => `<a href="${escapeAttr(link.href)}">${escapeHtml(link.label)}</a>`).join("")}
        </div>
      </aside>
    </section>
  `;
}

function imageTemplate(image) {
  return `
    <figure class="contact-frame">
      <figcaption>${escapeHtml(image.label)}</figcaption>
      <img src="${escapeAttr(image.src)}" alt="${escapeAttr(image.label)}" loading="lazy" />
    </figure>
  `;
}

function fact(label, value) {
  return `
    <div class="fact-row">
      <span>${escapeHtml(label)}</span>
      <span>${escapeHtml(String(value))}</span>
    </div>
  `;
}

function parametersTemplate(parameters) {
  const entries = Object.entries(parameters ?? {}).slice(0, 8);
  if (!entries.length) return "";
  return `
    <div class="parameter-panel" aria-label="Run parameters">
      <h4>Run Parameters</h4>
      <dl>
        ${entries
          .map(
            ([key, value]) => `
              <div>
                <dt>${escapeHtml(key)}</dt>
                <dd>${escapeHtml(String(value))}</dd>
              </div>
            `,
          )
          .join("")}
      </dl>
    </div>
  `;
}

function tileTemplate(item, selected) {
  const preview = item.images[0];
  return `
    <button type="button" class="tile ${selected ? "is-selected" : ""}" data-select="${escapeAttr(item.id)}">
      <div class="tile-head">
        <div>
          <strong>${escapeHtml(item.title)}</strong>
          <small>${escapeHtml(item.category)}</small>
        </div>
        <span class="${statusClass(item.status)}">${escapeHtml(item.status)}</span>
      </div>
      <div class="tile-preview">
        ${
          preview
            ? `<img src="${escapeAttr(preview.src)}" alt="${escapeAttr(preview.label)}" loading="lazy" />`
            : `<div class="empty-frame">No preview</div>`
        }
      </div>
      <div class="tile-meta">
        <span class="pill">${escapeHtml(`${item.benchmark.sample_count ?? "n/a"} samples`)}</span>
        <span class="pill">${escapeHtml(formatPercent(item.benchmark.non_pass_rate))} non-pass</span>
        <span class="pill">${escapeHtml(formatCounts(item.benchmark.selected_route_counts))}</span>
      </div>
    </button>
  `;
}

function packageSectionTemplate(item) {
  if (!item.package_highlights.length) return "";
  return `
    <section class="package-section">
      <div class="section-head">
        <h2>Package Highlights</h2>
        <span>${escapeHtml(item.package_highlights.length)} staged packages</span>
      </div>
      <div class="package-grid">
        ${item.package_highlights.map(packageTemplate).join("")}
      </div>
    </section>
  `;
}

function packageTemplate(pkg) {
  const risks = [
    ...(pkg.feature_risk_blockers ?? []),
    ...(pkg.qa_errors ?? []),
    ...(pkg.qa_warnings ?? []),
  ].slice(0, 3);
  return `
    <article class="package-card">
      <header>
        <h3>${escapeHtml(pkg.asset_name)}</h3>
        <span class="${statusClass(pkg.status)}">${escapeHtml(pkg.status)}</span>
      </header>
      ${
        pkg.preview_images.length
          ? `<div class="preview-strip">${pkg.preview_images.map(imageTemplate).join("")}</div>`
          : ""
      }
      <div class="tile-meta">
        <span class="pill">${escapeHtml(pkg.route)}</span>
        <span class="pill">${escapeHtml(`${pkg.validation_errors ?? 0} glTF errors`)}</span>
        <span class="pill">${escapeHtml(pkg.source_provenance?.origin_type ?? "source")}</span>
      </div>
      ${
        risks.length
          ? `<ul class="risk-list">${risks.map((risk) => `<li>${escapeHtml(risk)}</li>`).join("")}</ul>`
          : ""
      }
    </article>
  `;
}

function emptyTemplate() {
  return `<main class="app-error">No showcase evidence items were staged.</main>`;
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

loadManifest().catch((error) => {
  app.className = "app-error";
  app.textContent = error instanceof Error ? error.message : "Showcase unavailable";
});
