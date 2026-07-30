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
tape/             THE PAN TAPE MACHINE static audio tool
visualizer/       THE PAN SIGNAL VISUALIZER local camera/video tool
tools/            available/planned tool index
docs/             design, tool, analytics, and release contracts
scripts/          dependency-free site validation
```

There is no framework, package installation, build command, or external runtime dependency.

## Image Machine features

- File selection and drag-and-drop
- Live Canvas preview
- Fifteen live Canvas effects across Basic, Warp, Signal, Texture, and Print banks
- Ten designed presets, Surprise Me controlled randomization, per-bank reset, and Reset All
- Original/current/split compare with a keyboard- and pointer-adjustable boundary
- PNG export, native share fallback, fullscreen preview, and an eight-item in-memory session gallery
- Automatic scaling to a maximum 2048px side and 4 megapixels
- Desktop Studio Workspace and mobile sticky preview/action controls
- Keyboard-accessible interactions and user-facing errors
- Versioned static asset URLs so new releases replace stale mobile caches

Playground session images and effect snapshots exist only in memory. They are cleared on reload and are never written to `localStorage`; only interface preferences such as open FX banks and floating-monitor position are stored.

## Tape Machine features

- WAV, MP3, and browser-decodable M4A input up to 10 minutes and 100 MB
- A performance/memory notice above 3 minutes; 5 minutes or less recommended on mobile; 50 MB or less recommended
- Lightweight Canvas waveform with playhead, pointer/touch seeking, and keyboard seeking
- Original/Damaged monitoring with short Web Audio crossfades
- Tape Saturation, Wow, Flutter, Tape Noise, Dropout, Bit Crush, and Low Pass controls
- Eight designed tape presets, controlled Surprise Me, section resets, and Reset All
- OfflineAudioContext rendering and a local 16-bit PCM WAV encoder
- Native share support with fixed-text copy fallback

Audio, filenames, exact duration, file size, MIME type, and effect values are never sent to analytics or stored persistently.

## Signal Visualizer features

- Web camera or browser-supported local video input
- Real-time Canvas RGB shift, wave distortion, feedback trail, noise, and particle overlay
- Particle amount, size, speed, drift, glow, opacity, color, and blend controls
- Native fullscreen with a mobile pseudo-fullscreen fallback
- Processed Canvas recording and local WebM download where the browser exposes a WebM `MediaRecorder`
- 960×540 mobile / 1280×720 desktop processing caps and a 30 fps target

Camera frames, local video, filenames, recordings, and effect values are never uploaded or sent to analytics.

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
node --check assets/js/audio-utils.js
node --check assets/js/site.js
node --check tape/tape.js
node --check visualizer/visualizer.js
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
