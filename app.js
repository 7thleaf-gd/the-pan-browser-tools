'use strict';

(function imageMachine() {
  const pan = window.ThePan || {};
  const MAX_DIMENSION = 2048;
  const MAX_PIXELS = 4_000_000;
  const FX_STATE_KEY = 'thePanFxBankState';
  const FLOATING_CORNER_KEY = 'thePanFloatingPreviewCorner';
  const CREDIT = 'Made something strange with THE PAN Browser Tools.\nhttps://tools.thepan.xyz/\n#7thleaftools';
  const MODES = ['original', 'current', 'compare'];
  const EFFECTS = Object.freeze({
    pixelate: { group: 'basic', defaultValue: 0 }, blur: { group: 'basic', defaultValue: 0 },
    contrast: { group: 'basic', defaultValue: 100 }, brightness: { group: 'basic', defaultValue: 100 },
    wave: { group: 'warp', defaultValue: 0 }, melt: { group: 'warp', defaultValue: 0 },
    horizontalTear: { group: 'warp', defaultValue: 0 },
    rgbSplit: { group: 'signal', defaultValue: 0 }, scanline: { group: 'signal', defaultValue: 0 },
    blockDamage: { group: 'signal', defaultValue: 0 },
    grain: { group: 'texture', defaultValue: 0 }, noise: { group: 'texture', defaultValue: 0 },
    dither: { group: 'print', defaultValue: 0 }, halftone: { group: 'print', defaultValue: 0 },
    threshold: { group: 'print', defaultValue: 0 }
  });
  const defaults = () => Object.fromEntries(Object.entries(EFFECTS).map(([id, definition]) => [id, definition.defaultValue]));
  const preset = values => Object.freeze({ ...defaults(), ...values });
  const PRESETS = Object.freeze({
    'BROKEN VHS': preset({ horizontalTear: 54, rgbSplit: 14, noise: 18, scanline: 34, blockDamage: 16, contrast: 122 }),
    'CRT MONITOR': preset({ pixelate: 3, scanline: 72, rgbSplit: 4, contrast: 136, brightness: 91 }),
    'LIQUID SIGNAL': preset({ wave: 57, melt: 34, blur: 2, rgbSplit: 8, brightness: 106 }),
    'DREAM TAPE': preset({ wave: 18, blur: 5, grain: 24, brightness: 113, contrast: 82, rgbSplit: 5 }),
    'MELTED PHOTO': preset({ melt: 72, wave: 24, blur: 2, contrast: 112, brightness: 96 }),
    'CASSETTE DAMAGE': preset({ horizontalTear: 72, blockDamage: 30, noise: 26, rgbSplit: 11, contrast: 133 }),
    'ANALOG TV': preset({ scanline: 63, grain: 23, noise: 17, rgbSplit: 7, contrast: 119 }),
    'DIRTY SIGNAL': preset({ grain: 46, noise: 37, blockDamage: 19, contrast: 144, brightness: 88 }),
    'CHEAP XEROX': preset({ threshold: 62, dither: 40, grain: 32, contrast: 176, brightness: 104 }),
    'PUNK FLYER': preset({ threshold: 81, halftone: 57, dither: 25, pixelate: 2, contrast: 185 })
  });
  const SURPRISE_FAMILIES = Object.freeze({
    VHS: 'BROKEN VHS', CRT: 'CRT MONITOR', LIQUID: 'LIQUID SIGNAL', DREAM: 'DREAM TAPE',
    MELT: 'MELTED PHOTO', 'CASSETTE DAMAGE': 'CASSETTE DAMAGE', 'ANALOG TV': 'ANALOG TV',
    NOISE: 'DIRTY SIGNAL', XEROX: 'CHEAP XEROX', 'PUNK FLYER': 'PUNK FLYER'
  });
  const state = window.ThePan.state = {
    effects: defaults(), activePreset: 'NONE', compareMode: 'current', comparePosition: 50,
    gallery: [], renderState: { queued: false, sourceRevision: 0, lastKey: '' }
  };
  const el = {
    file: document.querySelector('#fileInput'), browse: document.querySelector('#browseButton'),
    drop: document.querySelector('#dropZone'), empty: document.querySelector('#emptyState'),
    canvas: document.querySelector('#previewCanvas'), original: document.querySelector('#originalPreviewCanvas'),
    compare: document.querySelector('#compareHandle'), previewModes: document.querySelector('#previewModes'),
    modeControls: [...document.querySelectorAll('[data-preview-mode]')],
    fullscreen: document.querySelector('#fullscreenPreview'), fullscreenCanvas: document.querySelector('#fullscreenCanvas'),
    fullscreenOriginal: document.querySelector('#fullscreenOriginalCanvas'), fullscreenCompare: document.querySelector('#fullscreenCompareHandle'),
    fullscreenButton: document.querySelector('#fullscreenButton'), closeFullscreen: document.querySelector('#closeFullscreen'),
    floating: document.querySelector('#floatingPreview'), floatingCanvas: document.querySelector('#floatingCanvas'),
    floatingCanvasButton: document.querySelector('#floatingCanvasButton'), floatingMode: document.querySelector('#floatingMode'),
    floatingPrevious: document.querySelector('#floatingPrevious'), floatingNext: document.querySelector('#floatingNext'),
    floatingMinimize: document.querySelector('#floatingMinimize'), floatingClose: document.querySelector('#floatingClose'),
    floatingDragHandle: document.querySelector('#floatingDragHandle'), floatingDivider: document.querySelector('#compareDivider'),
    imageInfo: document.querySelector('#imageInfo'), error: document.querySelector('#errorMessage'),
    busy: document.querySelector('#busyIndicator'), controls: [...document.querySelectorAll('[data-effect]')],
    groups: [...document.querySelectorAll('[data-fx-group]')], counts: [...document.querySelectorAll('[data-fx-count]')],
    groupResets: [...document.querySelectorAll('[data-reset-group]')], presets: document.querySelector('#presetButtons'),
    activePreset: document.querySelector('#activePreset'), surprise: document.querySelector('#randomButton'),
    reset: document.querySelector('#resetButton'), export: document.querySelector('#exportButton'),
    gallery: document.querySelector('#galleryGrid'), clearGallery: document.querySelector('#clearGallery'),
    viewer: document.querySelector('#galleryViewer'), galleryLarge: document.querySelector('#galleryLargeImage'),
    galleryCompare: document.querySelector('#galleryCompare'), galleryCurrent: document.querySelector('#galleryCurrentCanvas'),
    galleryCompareView: document.querySelector('#galleryCompareView'), galleryCompareHandle: document.querySelector('#galleryCompareHandle'),
    galleryRestore: document.querySelector('#galleryRestore'), galleryFavorite: document.querySelector('#galleryFavorite'),
    galleryExport: document.querySelector('#galleryExport'), galleryDelete: document.querySelector('#galleryDelete'),
    galleryClose: document.querySelector('#galleryViewerClose'), artifact: document.querySelector('#artifactPanel'),
    share: document.querySelector('#shareArtifact'), copy: document.querySelector('#copyCredit'),
    downloadAgain: document.querySelector('#downloadAgain'), closeArtifact: document.querySelector('#closeArtifact'),
    shareStatus: document.querySelector('#shareStatus')
  };

  if (!pan.canvas || !pan.canvas.isSupported()) {
    el.error.textContent = 'This browser does not support the Canvas features required by THE PAN IMAGE MACHINE.';
    el.error.hidden = false;
    return;
  }

  pan.analytics.configure('image_machine', 'v0');
  const track = (event, parameters) => pan.analytics.track(event, parameters);
  const ctx = el.canvas.getContext('2d', { willReadFrequently: true });
  const source = pan.canvas.getTemporaryCanvas('image-machine-source', 1, 1);
  const sourceCtx = source.getContext('2d', { willReadFrequently: true });
  let loaded = false;
  let effectEventTimer = 0;
  let lastFamily = '';
  let floatingDismissed = false;
  let largePreviewVisible = true;
  let floatingUpdateQueued = false;
  let floatingDrag = null;
  let swipeStart = null;
  let fullscreenReturnFocus = null;
  let artifactReturnFocus = null;
  let viewerReturnFocus = null;
  let selectedGalleryId = null;
  let galleryDirty = false;
  let lastExportBlob = null;

  function showError(message, errorType = 'processing_error') {
    el.error.textContent = message;
    el.error.hidden = false;
    track('tool_error', { error_type: errorType });
  }
  function clearError() { el.error.hidden = true; el.error.textContent = ''; }
  function setBusy(value) {
    el.busy.hidden = !value;
    el.drop.setAttribute('aria-busy', String(value));
    state.renderState.busy = value;
  }
  function updateControl(input) {
    const output = document.querySelector(`output[for="${input.id}"]`);
    input.value = state.effects[input.id];
    if (output) output.value = input.value;
    input.style.setProperty('--fill', `${((input.value - input.min) / (input.max - input.min)) * 100}%`);
  }
  function syncControls() {
    el.controls.forEach(updateControl);
    el.activePreset.textContent = state.activePreset;
    el.presets.querySelectorAll('button').forEach(button => button.classList.toggle('is-active', button.dataset.preset === state.activePreset));
    el.counts.forEach(counter => {
      const active = Object.entries(EFFECTS).filter(([, definition]) => definition.group === counter.dataset.fxCount)
        .filter(([id, definition]) => state.effects[id] !== definition.defaultValue).length;
      counter.textContent = `${active} ACTIVE`;
    });
  }
  function setEffects(next, sourceName, activePreset = 'CUSTOM') {
    state.effects = { ...state.effects, ...next };
    state.activePreset = activePreset;
    syncControls();
    scheduleRender();
    if (sourceName === 'reset') track('reset_tool');
  }
  function renderKey() { return `${state.renderState.sourceRevision}:${Object.values(state.effects).join(':')}`; }
  function scheduleRender(force = false) {
    if (!loaded || state.renderState.queued) return;
    const key = renderKey();
    if (!force && key === state.renderState.lastKey) return;
    state.renderState.queued = true;
    setBusy(true);
    requestAnimationFrame(() => {
      state.renderState.queued = false;
      try {
        render();
        state.renderState.lastKey = renderKey();
        clearError();
      } catch (_) {
        showError('The signal could not be processed. Try a smaller image or reset the controls.', 'render_failed');
      } finally { setBusy(false); }
    });
  }
  function drawSpatial(input, output, effect, amount) {
    const outCtx = output.getContext('2d');
    const width = input.width;
    const height = input.height;
    outCtx.clearRect(0, 0, width, height);
    if (!amount) { outCtx.drawImage(input, 0, 0); return; }
    if (effect === 'wave') {
      const amplitude = amount * width / 1400;
      for (let y = 0; y < height; y += 2) outCtx.drawImage(input, 0, y, width, 2, Math.sin(y / 18) * amplitude, y, width, 2);
    } else if (effect === 'melt') {
      const strip = Math.max(6, Math.round(width / 80));
      for (let x = 0; x < width; x += strip) {
        const shift = Math.max(0, (Math.sin(x * .041) + Math.sin(x * .013 + 2)) * amount * height / 520);
        outCtx.drawImage(input, x, 0, strip, height, x, shift, strip, height);
      }
    } else {
      const band = Math.max(4, Math.round(height / 50));
      for (let y = 0; y < height; y += band) {
        const shift = Math.sin(y * 12.9898) > .65 ? Math.sin(y * 3.17) * amount * width / 420 : 0;
        outCtx.drawImage(input, 0, y, width, band, shift, y, width, band);
      }
    }
  }
  function render() {
    const e = state.effects;
    const width = source.width;
    const height = source.height;
    const a = pan.canvas.getTemporaryCanvas('image-machine-work-a', width, height);
    const b = pan.canvas.getTemporaryCanvas('image-machine-work-b', width, height);
    const aCtx = a.getContext('2d');
    aCtx.clearRect(0, 0, width, height);
    if (e.pixelate > 1) {
      const sw = Math.max(1, Math.round(width / e.pixelate));
      const sh = Math.max(1, Math.round(height / e.pixelate));
      const small = pan.canvas.getTemporaryCanvas('image-machine-pixel', sw, sh);
      const smallCtx = small.getContext('2d');
      smallCtx.clearRect(0, 0, sw, sh);
      smallCtx.drawImage(source, 0, 0, sw, sh);
      aCtx.imageSmoothingEnabled = false;
      aCtx.drawImage(small, 0, 0, sw, sh, 0, 0, width, height);
      aCtx.imageSmoothingEnabled = true;
    } else aCtx.drawImage(source, 0, 0);
    let current = a;
    let next = b;
    [['wave', e.wave], ['melt', e.melt], ['tear', e.horizontalTear]].forEach(([name, amount]) => {
      if (!amount) return;
      drawSpatial(current, next, name, amount);
      [current, next] = [next, current];
    });
    ctx.clearRect(0, 0, width, height);
    ctx.filter = e.blur ? `blur(${e.blur}px)` : 'none';
    ctx.drawImage(current, 0, 0);
    ctx.filter = 'none';
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const rgb = e.rgbSplit ? new Uint8ClampedArray(data) : null;
    const bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
    const contrast = e.contrast / 100;
    const brightness = e.brightness / 100;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const monoGrain = e.grain ? (Math.random() - .5) * e.grain * 1.4 : 0;
        for (let channel = 0; channel < 3; channel++) {
          let value = ((data[i + channel] - 128) * contrast + 128) * brightness;
          value += monoGrain + (e.noise ? (Math.random() - .5) * e.noise * 1.3 : 0);
          if (e.threshold) {
            const cut = 128 + (50 - e.threshold) * .8;
            const hard = value < cut ? 0 : 255;
            value = value * (1 - e.threshold / 100) + hard * (e.threshold / 100);
          }
          if (e.dither) {
            const hard = value + (bayer[y & 3][x & 3] / 16 - .5) * 100 < 128 ? 0 : 255;
            value = value * (1 - e.dither / 100) + hard * e.dither / 100;
          }
          if (e.halftone && ((x % 8) - 4) ** 2 + ((y % 8) - 4) ** 2 > 7 + (100 - e.halftone) / 5) {
            value *= 1 - e.halftone / 100;
          }
          if (e.blockDamage && ((Math.floor(x / 36) * 17 + Math.floor(y / 24) * 31) % 101) < e.blockDamage / 3) {
            value = Math.round(value / 48) * 48;
          }
          data[i + channel] = value;
        }
        if (rgb) {
          const split = Math.round(e.rgbSplit);
          data[i] = rgb[(y * width + Math.max(0, x - split)) * 4];
          data[i + 2] = rgb[(y * width + Math.min(width - 1, x + split)) * 4 + 2];
        }
        if (e.scanline && y % 4 < 2) {
          const multiplier = 1 - e.scanline / 172;
          data[i] *= multiplier; data[i + 1] *= multiplier; data[i + 2] *= multiplier;
        }
      }
    }
    ctx.putImageData(imageData, 0, 0);
    updateCompareVisuals();
    scheduleFloatingUpdate();
  }
  function drawContained(targetCtx, image, start = 0, end = 1) {
    const width = targetCtx.canvas.width;
    const height = targetCtx.canvas.height;
    const scale = Math.min(width / image.width, height / image.height);
    const dw = image.width * scale;
    const dh = image.height * scale;
    targetCtx.save();
    targetCtx.beginPath();
    targetCtx.rect(width * start, 0, width * (end - start), height);
    targetCtx.clip();
    targetCtx.drawImage(image, (width - dw) / 2, (height - dh) / 2, dw, dh);
    targetCtx.restore();
  }
  function setCompareMode(mode, shouldTrack = true) {
    if (!MODES.includes(mode)) return;
    state.compareMode = mode;
    el.modeControls.forEach(button => button.classList.toggle('is-active', button.dataset.previewMode === mode));
    updateCompareVisuals();
    scheduleFloatingUpdate();
    if (shouldTrack) track('compare_used', { compare_mode: mode });
  }
  function updateCompareVisuals() {
    if (!loaded) return;
    const originalVisible = state.compareMode !== 'current';
    el.original.hidden = !originalVisible;
    el.original.style.clipPath = state.compareMode === 'compare' ? `inset(0 ${100 - state.comparePosition}% 0 0)` : '';
    el.compare.hidden = state.compareMode !== 'compare';
    el.compare.style.left = `${state.comparePosition}%`;
    el.compare.setAttribute('aria-valuenow', state.comparePosition);
    if (!el.fullscreen.hidden) {
      el.fullscreenOriginal.hidden = !originalVisible;
      el.fullscreenOriginal.style.clipPath = state.compareMode === 'compare' ? `inset(0 ${100 - state.comparePosition}% 0 0)` : '';
      el.fullscreenCompare.hidden = state.compareMode !== 'compare';
      el.fullscreenCompare.style.left = `${state.comparePosition}%`;
      el.fullscreenCompare.setAttribute('aria-valuenow', state.comparePosition);
    }
    if (!el.galleryCurrent.hidden) {
      el.galleryCurrent.style.clipPath = `inset(0 0 0 ${state.comparePosition}%)`;
      el.galleryCompareHandle.style.left = `${state.comparePosition}%`;
      el.galleryCompareHandle.setAttribute('aria-valuenow', state.comparePosition);
    }
  }
  function setComparePosition(position) {
    state.comparePosition = Math.max(0, Math.min(100, Math.round(position)));
    updateCompareVisuals();
    scheduleFloatingUpdate();
  }
  function bindCompareHandle(handle, container) {
    const move = event => {
      const rect = container.getBoundingClientRect();
      setComparePosition((event.clientX - rect.left) / rect.width * 100);
    };
    handle.addEventListener('pointerdown', event => { handle.setPointerCapture(event.pointerId); move(event); });
    handle.addEventListener('pointermove', event => { if (handle.hasPointerCapture(event.pointerId)) move(event); });
    handle.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      setComparePosition(event.key === 'Home' ? 0 : event.key === 'End' ? 100 : state.comparePosition + (event.key === 'ArrowLeft' ? -2 : 2));
    });
  }
  async function loadFile(file) {
    clearError();
    if (!file || !file.type.startsWith('image/')) return showError('Please choose a PNG, JPEG, WEBP, or GIF image.', 'unsupported_file');
    if (file.size > 40 * 1024 * 1024) return showError('This file is too large. Please choose an image under 40 MB.', 'file_too_large');
    setBusy(true);
    try {
      const decoded = await pan.canvas.decodeImage(file);
      const fitted = pan.canvas.fitDimensions(decoded.width, decoded.height, MAX_DIMENSION, MAX_PIXELS);
      [source, el.canvas, el.original].forEach(canvas => { canvas.width = fitted.width; canvas.height = fitted.height; });
      sourceCtx.clearRect(0, 0, fitted.width, fitted.height);
      sourceCtx.drawImage(decoded.source, 0, 0, fitted.width, fitted.height);
      el.original.getContext('2d').drawImage(source, 0, 0);
      decoded.release();
      state.renderState.sourceRevision += 1;
      state.renderState.lastKey = '';
      loaded = true;
      floatingDismissed = false;
      el.empty.hidden = true; el.canvas.hidden = false; el.fullscreenButton.hidden = false;
      el.previewModes.hidden = false; el.export.disabled = false;
      el.imageInfo.textContent = `${fitted.width} × ${fitted.height}${fitted.scaled ? ' / AUTO-SCALED' : ''}`;
      scheduleRender(true);
      updateFloatingVisibility();
      track('image_upload');
    } catch (_) { showError('This image could not be decoded. Try exporting it as PNG or JPEG first.', 'decode_failed'); setBusy(false); }
    finally { el.file.value = ''; }
  }
  function applyPreset(name, shouldTrack = true) {
    setEffects(PRESETS[name], 'preset', name);
    if (shouldTrack) track('preset_used', { preset_name: name.toLowerCase().replaceAll(' ', '_') });
  }
  function surprise() {
    const families = Object.keys(SURPRISE_FAMILIES).filter(name => name !== lastFamily);
    let best = null;
    for (let index = 0; index < 5; index++) {
      const family = families[Math.floor(Math.random() * families.length)];
      const base = PRESETS[SURPRISE_FAMILIES[family]];
      const candidate = Object.fromEntries(Object.entries(base).map(([id, value]) => {
        if (value === EFFECTS[id].defaultValue) return [id, value];
        const input = document.querySelector(`#${id}`);
        return [id, Math.max(Number(input.min), Math.min(Number(input.max), Math.round(value * (.82 + Math.random() * .36))))];
      }));
      const delta = Object.keys(EFFECTS).reduce((sum, id) => sum + Math.abs(candidate[id] - state.effects[id]), 0);
      if (!best || delta > best.delta) best = { family, candidate, delta };
    }
    lastFamily = best.family;
    setEffects(best.candidate, 'surprise', `SURPRISE / ${best.family}`);
    track('surprise_me', { preset_family: best.family.toLowerCase().replaceAll(' ', '_') });
  }
  function createPresetButtons() {
    Object.keys(PRESETS).forEach(name => {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = name; button.dataset.preset = name;
      button.addEventListener('click', () => applyPreset(name));
      el.presets.append(button);
    });
  }
  function saveGroupState() {
    try { localStorage.setItem(FX_STATE_KEY, JSON.stringify(Object.fromEntries(el.groups.map(group => [group.dataset.fxGroup, group.open])))); } catch (_) {}
  }
  function restoreGroupState() {
    try {
      const saved = JSON.parse(localStorage.getItem(FX_STATE_KEY));
      if (saved) el.groups.forEach(group => { if (typeof saved[group.dataset.fxGroup] === 'boolean') group.open = saved[group.dataset.fxGroup]; });
    } catch (_) {}
  }
  function canvasBlob(canvas) {
    return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG failed')), 'image/png'));
  }
  function download(blob, name = 'the-pan-image-machine.png') {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = name; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function addGallery(blob) {
    const thumb = pan.canvas.getTemporaryCanvas('image-machine-gallery-thumb', 1, 1);
    const scale = Math.min(1, 320 / Math.max(el.canvas.width, el.canvas.height));
    thumb.width = Math.max(1, Math.round(el.canvas.width * scale)); thumb.height = Math.max(1, Math.round(el.canvas.height * scale));
    thumb.getContext('2d').drawImage(el.canvas, 0, 0, thumb.width, thumb.height);
    const thumbBlob = await canvasBlob(thumb);
    const item = { id: `${Date.now()}-${Math.random()}`, blob, url: URL.createObjectURL(blob), thumbUrl: URL.createObjectURL(thumbBlob), effects: { ...state.effects }, preset: state.activePreset, favorite: false };
    if (state.gallery.length === 8) {
      const removed = state.gallery.shift();
      URL.revokeObjectURL(removed.url); URL.revokeObjectURL(removed.thumbUrl);
    }
    state.gallery.push(item);
    renderGallery();
    track('gallery_add');
  }
  function renderGallery() {
    el.gallery.replaceChildren();
    el.clearGallery.disabled = state.gallery.length === 0;
    if (!state.gallery.length) {
      const empty = document.createElement('p'); empty.className = 'gallery-empty'; empty.textContent = 'EXPORT A SIGNAL TO START THE SESSION GALLERY.'; el.gallery.append(empty); return;
    }
    state.gallery.forEach((item, index) => {
      const button = document.createElement('button'); button.type = 'button'; button.className = `gallery-card${item.favorite ? ' is-favorite' : ''}`;
      button.dataset.galleryId = item.id;
      button.setAttribute('aria-label', `Open session artwork ${index + 1}${item.favorite ? ', favorite' : ''}`);
      const image = document.createElement('img'); image.src = item.thumbUrl; image.alt = '';
      const label = document.createElement('span'); label.textContent = `${String(index + 1).padStart(2, '0')} / ${item.preset}`;
      button.append(image, label); button.addEventListener('click', () => openGallery(item.id)); el.gallery.append(button);
    });
  }
  function openGallery(id) {
    const item = state.gallery.find(entry => entry.id === id); if (!item) return;
    viewerReturnFocus = document.activeElement;
    galleryDirty = false;
    selectedGalleryId = id; el.galleryLarge.src = item.url; el.galleryFavorite.textContent = item.favorite ? 'UNFAVORITE' : 'FAVORITE';
    el.galleryCurrent.hidden = true; el.galleryCompareHandle.hidden = true; el.galleryCompareView.classList.remove('is-comparing'); el.galleryCompare.textContent = 'COMPARE CURRENT';
    el.viewer.hidden = false; document.body.dataset.artifactOpen = 'true'; el.galleryClose.focus(); track('gallery_select');
  }
  function closeOverlay(dialog) {
    dialog.hidden = true;
    if (el.artifact.hidden && el.viewer.hidden) document.body.removeAttribute('data-artifact-open');
    let returnFocus = dialog === el.artifact ? artifactReturnFocus : viewerReturnFocus;
    if (dialog === el.viewer && galleryDirty) {
      renderGallery();
      galleryDirty = false;
      returnFocus = el.gallery.querySelector(`[data-gallery-id="${selectedGalleryId}"]`) || el.clearGallery;
    }
    if (returnFocus && returnFocus.isConnected) returnFocus.focus();
    else if (!el.clearGallery.disabled) el.clearGallery.focus();
    else el.export.focus();
  }
  async function exportPng() {
    if (!loaded) return;
    try {
      lastExportBlob = await canvasBlob(el.canvas);
      download(lastExportBlob);
      await addGallery(lastExportBlob);
      el.shareStatus.textContent = 'PNG SAVED. KEEP THE SIGNAL MOVING.';
      artifactReturnFocus = document.activeElement;
      el.artifact.hidden = false; document.body.dataset.artifactOpen = 'true'; el.share.focus();
      track('image_export'); track('share_open');
    } catch (_) { showError('PNG export failed. Please try again.', 'export_failed'); }
  }
  async function copyCredit() {
    try { await navigator.clipboard.writeText(CREDIT); el.shareStatus.textContent = 'CREDIT COPIED.'; track('credit_copy'); }
    catch (_) { el.shareStatus.textContent = 'COPY FAILED. SELECT AND COPY: ' + CREDIT; }
  }
  async function shareArtifact() {
    if (!lastExportBlob) return;
    const file = new File([lastExportBlob], 'the-pan-image-machine.png', { type: 'image/png' });
    try {
      if (navigator.share) {
        const data = navigator.canShare && navigator.canShare({ files: [file] }) ? { files: [file], text: CREDIT } : { text: CREDIT, url: 'https://tools.thepan.xyz/' };
        await navigator.share(data); el.shareStatus.textContent = 'SIGNAL SHARED.'; track('share_success');
      } else { await copyCredit(); el.shareStatus.textContent = 'SHARING IS NOT AVAILABLE. CREDIT COPIED.'; track('share_fallback'); }
    } catch (error) {
      if (error.name === 'AbortError') { el.shareStatus.textContent = 'SHARE CANCELLED.'; track('share_cancel'); }
      else { await copyCredit(); el.shareStatus.textContent = 'SHARE FAILED. CREDIT COPIED.'; track('share_fallback'); }
    }
  }
  function openFullscreen() {
    if (!loaded) return;
    fullscreenReturnFocus = document.activeElement;
    [el.fullscreenCanvas, el.fullscreenOriginal].forEach(canvas => { canvas.width = el.canvas.width; canvas.height = el.canvas.height; });
    el.fullscreenCanvas.getContext('2d').drawImage(el.canvas, 0, 0);
    el.fullscreenOriginal.getContext('2d').drawImage(source, 0, 0);
    el.fullscreen.hidden = false; document.body.dataset.fullscreenOpen = 'true'; updateCompareVisuals(); el.closeFullscreen.focus();
  }
  function closeFullscreen() {
    if (el.fullscreen.hidden) return;
    el.fullscreen.hidden = true; document.body.removeAttribute('data-fullscreen-open');
    if (fullscreenReturnFocus) fullscreenReturnFocus.focus();
  }
  function scheduleFloatingUpdate() {
    if (floatingUpdateQueued) return;
    floatingUpdateQueued = true; requestAnimationFrame(updateFloating);
  }
  function updateFloating() {
    floatingUpdateQueued = false; if (!loaded || el.floating.hidden) return;
    const floatingCtx = el.floatingCanvas.getContext('2d');
    floatingCtx.fillStyle = '#050505'; floatingCtx.fillRect(0, 0, el.floatingCanvas.width, el.floatingCanvas.height);
    const split = state.comparePosition / 100;
    if (state.compareMode === 'original') drawContained(floatingCtx, source);
    else if (state.compareMode === 'current') drawContained(floatingCtx, el.canvas);
    else { drawContained(floatingCtx, source, 0, split); drawContained(floatingCtx, el.canvas, split, 1); }
    el.floating.dataset.mode = state.compareMode; el.floatingMode.textContent = state.compareMode.toUpperCase();
    el.floatingDivider.style.left = `${state.comparePosition}%`;
  }
  function updateFloatingVisibility() {
    el.floating.hidden = !(loaded && !largePreviewVisible && !floatingDismissed);
    if (!el.floating.hidden) scheduleFloatingUpdate();
  }
  function changeMode(direction) { setCompareMode(MODES[(MODES.indexOf(state.compareMode) + direction + MODES.length) % MODES.length]); }
  function restoreFloatingCorner() {
    try { const corner = localStorage.getItem(FLOATING_CORNER_KEY); if (/^(top|bottom)-(left|right)$/.test(corner)) el.floating.dataset.corner = corner; } catch (_) {}
  }
  function finishFloatingDrag(event) {
    if (!floatingDrag) return;
    const corner = `${event.clientY < innerHeight / 2 ? 'top' : 'bottom'}-${event.clientX < innerWidth / 2 ? 'left' : 'right'}`;
    ['left', 'top', 'right', 'bottom'].forEach(property => el.floating.style.removeProperty(property));
    el.floating.dataset.corner = corner; try { localStorage.setItem(FLOATING_CORNER_KEY, corner); } catch (_) {} floatingDrag = null;
  }

  createPresetButtons(); restoreGroupState(); restoreFloatingCorner(); syncControls(); renderGallery();
  el.file.addEventListener('change', event => loadFile(event.target.files[0]));
  el.browse.addEventListener('click', event => { event.stopPropagation(); el.file.click(); });
  el.drop.addEventListener('click', () => loaded ? openFullscreen() : el.file.click());
  el.drop.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); loaded ? openFullscreen() : el.file.click(); } });
  ['dragenter', 'dragover'].forEach(type => el.drop.addEventListener(type, event => { event.preventDefault(); el.drop.classList.add('dragover'); }));
  ['dragleave', 'drop'].forEach(type => el.drop.addEventListener(type, event => { event.preventDefault(); el.drop.classList.remove('dragover'); }));
  el.drop.addEventListener('drop', event => loadFile(event.dataTransfer.files[0]));
  el.controls.forEach(input => input.addEventListener('input', () => {
    state.effects[input.id] = Number(input.value); state.activePreset = 'CUSTOM'; syncControls(); scheduleRender();
    clearTimeout(effectEventTimer); effectEventTimer = setTimeout(() => track('effect_used', { effect_name: input.dataset.effect }), 400);
  }));
  el.groups.forEach(group => group.addEventListener('toggle', saveGroupState));
  el.groupResets.forEach(button => button.addEventListener('click', () => {
    const next = {}; Object.entries(EFFECTS).forEach(([id, definition]) => { if (definition.group === button.dataset.resetGroup) next[id] = definition.defaultValue; });
    setEffects(next, 'section-reset');
  }));
  el.surprise.addEventListener('click', surprise);
  el.reset.addEventListener('click', () => setEffects(defaults(), 'reset', 'NONE'));
  el.export.addEventListener('click', exportPng);
  document.querySelectorAll('.preview-modes').forEach(container => container.addEventListener('click', event => {
    const button = event.target.closest('[data-preview-mode]');
    if (button) {
      event.stopPropagation();
      setCompareMode(button.dataset.previewMode);
    }
  }));
  bindCompareHandle(el.compare, el.drop); bindCompareHandle(el.fullscreenCompare, el.fullscreen); bindCompareHandle(el.galleryCompareHandle, el.galleryCompareView);
  el.fullscreenButton.addEventListener('click', event => { event.stopPropagation(); openFullscreen(); });
  el.closeFullscreen.addEventListener('click', closeFullscreen);
  el.share.addEventListener('click', shareArtifact); el.copy.addEventListener('click', copyCredit);
  el.downloadAgain.addEventListener('click', () => { if (lastExportBlob) download(lastExportBlob); });
  el.closeArtifact.addEventListener('click', () => closeOverlay(el.artifact));
  el.clearGallery.addEventListener('click', () => {
    state.gallery.forEach(item => { URL.revokeObjectURL(item.url); URL.revokeObjectURL(item.thumbUrl); });
    state.gallery = []; renderGallery(); track('gallery_clear');
  });
  el.galleryClose.addEventListener('click', () => closeOverlay(el.viewer));
  el.galleryRestore.addEventListener('click', () => {
    const item = state.gallery.find(entry => entry.id === selectedGalleryId); if (!item) return;
    setEffects(item.effects, 'gallery-restore', item.preset); closeOverlay(el.viewer); track('gallery_restore');
  });
  el.galleryFavorite.addEventListener('click', () => {
    state.gallery.forEach(item => { item.favorite = item.id === selectedGalleryId ? !item.favorite : false; });
    const selected = state.gallery.find(item => item.id === selectedGalleryId);
    el.galleryFavorite.textContent = selected && selected.favorite ? 'UNFAVORITE' : 'FAVORITE';
    galleryDirty = true; track('gallery_favorite');
  });
  el.galleryCompare.addEventListener('click', () => {
    const comparing = el.galleryCurrent.hidden;
    if (comparing) {
      el.galleryCurrent.width = el.canvas.width; el.galleryCurrent.height = el.canvas.height;
      el.galleryCurrent.getContext('2d').drawImage(el.canvas, 0, 0);
    }
    el.galleryCurrent.hidden = !comparing;
    el.galleryCompareHandle.hidden = !comparing;
    el.galleryCompareView.classList.toggle('is-comparing', comparing);
    updateCompareVisuals();
    el.galleryCompare.textContent = comparing ? 'CLOSE COMPARE' : 'COMPARE CURRENT';
    track('compare_used', { compare_mode: comparing ? 'gallery' : 'current' });
  });
  el.galleryExport.addEventListener('click', () => { const item = state.gallery.find(entry => entry.id === selectedGalleryId); if (item) download(item.blob); });
  el.galleryDelete.addEventListener('click', () => {
    const index = state.gallery.findIndex(entry => entry.id === selectedGalleryId); if (index < 0) return;
    const [item] = state.gallery.splice(index, 1); URL.revokeObjectURL(item.url); URL.revokeObjectURL(item.thumbUrl);
    galleryDirty = true; closeOverlay(el.viewer); track('gallery_delete');
  });
  el.floatingPrevious.addEventListener('click', () => changeMode(-1)); el.floatingNext.addEventListener('click', () => changeMode(1));
  el.floatingMinimize.addEventListener('click', () => {
    const minimized = !el.floating.classList.contains('is-minimized'); el.floating.classList.toggle('is-minimized', minimized);
    el.floatingMinimize.textContent = minimized ? '□' : '_'; el.floatingMinimize.setAttribute('aria-label', minimized ? 'Restore floating preview' : 'Minimize floating preview');
  });
  el.floatingClose.addEventListener('click', () => { floatingDismissed = true; el.floating.hidden = true; });
  el.floatingCanvasButton.addEventListener('click', openFullscreen);
  el.floatingCanvasButton.addEventListener('pointerdown', event => { swipeStart = event.clientX; });
  el.floatingCanvasButton.addEventListener('pointerup', event => { const distance = event.clientX - swipeStart; swipeStart = null; if (Math.abs(distance) > 40) changeMode(distance > 0 ? -1 : 1); });
  el.floatingDragHandle.addEventListener('pointerdown', event => {
    if (matchMedia('(max-width: 800px)').matches || event.target.closest('button')) return;
    const rect = el.floating.getBoundingClientRect(); floatingDrag = { x: event.clientX - rect.left, y: event.clientY - rect.top }; el.floatingDragHandle.setPointerCapture(event.pointerId);
  });
  el.floatingDragHandle.addEventListener('pointermove', event => {
    if (!floatingDrag) return;
    el.floating.style.left = `${Math.max(0, Math.min(innerWidth - el.floating.offsetWidth, event.clientX - floatingDrag.x))}px`;
    el.floating.style.top = `${Math.max(0, Math.min(innerHeight - el.floating.offsetHeight, event.clientY - floatingDrag.y))}px`;
    el.floating.style.right = 'auto'; el.floating.style.bottom = 'auto';
  });
  el.floatingDragHandle.addEventListener('pointerup', finishFloatingDrag); el.floatingDragHandle.addEventListener('pointercancel', finishFloatingDrag);
  document.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.target.closest('#consentPanel')) return;
    const activeDialog = [el.viewer, el.artifact, el.fullscreen].find(dialog => !dialog.hidden);
    if (event.key === 'Tab' && activeDialog) {
      const focusable = [...activeDialog.querySelectorAll('button:not([disabled]), [tabindex="0"]')].filter(node => !node.hidden);
      if (!focusable.length) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      return;
    }
    if (event.key !== 'Escape') return;
    if (!el.viewer.hidden) closeOverlay(el.viewer); else if (!el.artifact.hidden) closeOverlay(el.artifact);
    else if (!el.fullscreen.hidden) closeFullscreen(); else if (!el.floating.hidden) { floatingDismissed = true; el.floating.hidden = true; }
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      const entry = entries[0];
      const clearsPageContent = entry.boundingClientRect.bottom > Math.min(innerHeight * .45, 360);
      document.body.dataset.workspaceActive = String(entry.isIntersecting && clearsPageContent);
    }, { threshold: [0, .05, .2] }).observe(document.querySelector('#machine'));
    new IntersectionObserver(entries => { largePreviewVisible = entries[0].intersectionRatio >= .15; if (largePreviewVisible) floatingDismissed = false; updateFloatingVisibility(); }, { threshold: [0, .15, 1] }).observe(document.querySelector('.screen-panel'));
  } else { document.body.dataset.workspaceActive = 'true'; largePreviewVisible = false; }
  document.querySelector('#year').textContent = new Date().getFullYear();
}());
