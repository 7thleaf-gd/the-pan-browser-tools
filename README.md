# THE PAN Browser Tools

**CREATE. PLAY. DISTORT.**

Free, installation-free creative browser tools from **7thleaf Records**. The public root remains **THE PAN IMAGE MACHINE v0**:

https://tools.thepan.xyz/

## Wave 0 Foundation

Wave 0 keeps the Image Machine design, processing, PNG export, privacy behavior, analytics, and public URL while establishing a small static foundation for future Image, Audio, Video, Poster, Zine, and Dub tools.

```text
assets/
  css/            design tokens, base styles, components, content pages
  js/             analytics, consent, Canvas utilities, shared page behavior
about/            project and privacy explanation
tools/            available/planned tool index
docs/             design, tool, analytics, and release contracts
scripts/          dependency-free site validation
```

There is no framework, package installation, build command, or external runtime dependency.

## Image Machine features

- File selection and drag-and-drop
- Live Canvas preview
- Pixelate, ordered dither, noise, RGB split, scanline, contrast, and brightness
- Random Distort and Reset
- PNG export and fullscreen preview
- Automatic scaling to a maximum 2048px side and 4 megapixels
- Desktop Studio Workspace and mobile sticky preview/action controls
- Keyboard-accessible interactions and user-facing errors

## Privacy and analytics

Creative files are processed locally and never uploaded. Image data, filenames, free input, and personal information are never sent to `dataLayer`. Declining optional analytics never limits the tools.

- GTM: `GTM-5W74796T`
- GA4 configured inside GTM: `G-5WHCJ6DCMF`
- Direct GA4 `gtag.js`: not used
- Advertising storage and personalization: always denied

See [docs/ANALYTICS.md](docs/ANALYTICS.md) for the Consent Mode and event contract.

## Local development

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000/`. Run the same dependency-free checks used by Pages:

```sh
python3 scripts/check-site.py
node --check app.js
node --check assets/js/analytics.js
node --check assets/js/consent.js
node --check assets/js/canvas-utils.js
node --check assets/js/site.js
```

## GitHub Pages

`.github/workflows/pages.yml` validates the site, uploads the repository as a Pages artifact, and deploys after pushes to `main`. Repository Pages source must remain **GitHub Actions**.

## Foundation documentation

- [Design system](docs/DESIGN_SYSTEM.md)
- [New tool template](docs/TOOL_TEMPLATE.md)
- [Analytics and Consent](docs/ANALYTICS.md)
- [Release checklist](docs/RELEASE_CHECKLIST.md)

---

THE PAN Browser Tools / **7thleaf Records**
