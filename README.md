# Asset Postprocess Gallery

Public GitHub Pages demo for selected Asset Postprocess white LOD outputs.

This repository intentionally ships a compact static gallery:

- local vendored Three.js runtime;
- eight curated public-sample artifacts;
- LOD0, LOD1, and LOD2 GLB files for each artifact;
- small WebP thumbnails for the exhibit rail.

Unselected runtime materials, raw logs, private benchmark manifests, and AI-generated stress assets are not published here. Google Scanned Objects samples are also excluded from this public page pending a separate redistribution review.

## Local Preview

```bash
python -m http.server 8770 --bind 127.0.0.1
```

Then open <http://127.0.0.1:8770/>.

## Source Scope

The selected public demo set uses Poly Haven and Smithsonian Open Access sample paths already tracked in the source project governance notes. This repository is a demo surface, not a complete benchmark dataset.
