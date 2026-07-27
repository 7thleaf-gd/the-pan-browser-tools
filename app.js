'use strict';

(function imageMachine() {
  const MAX_DIMENSION = 2048;
  const MAX_PIXELS = 4_000_000;
  const FX_STATE_KEY = 'thePanFxBankState';
  const FLOATING_CORNER_KEY = 'thePanFloatingPreviewCorner';
  const EFFECT_DEFINITIONS = Object.freeze({
    pixelate: { group: 'basic', defaultValue: 0 },
    contrast: { group: 'basic', defaultValue: 100 },
    brightness: { group: 'basic', defaultValue: 100 },
    noise: { group: 'analog', defaultValue: 0 },
    scanline: { group: 'analog', defaultValue: 0 },
    rgbSplit: { group: 'analog', defaultValue: 0 },
    dither: { group: 'print', defaultValue: 0 }
  });
  const PLANNED_EFFECTS = Object.freeze([
    'Grain', 'Blur', 'Sharpen', 'Bloom', 'JPEG Artifact', 'Halftone', 'Threshold', 'Edge'
  ]);
  const PREVIEW_MODES = ['original', 'current', 'compare'];
  const pan = window.ThePan || {};

  const elements = {
    fileInput: document.querySelector('#fileInput'),
    browseButton: document.querySelector('#browseButton'),
    dropZone: document.querySelector('#dropZone'),
    emptyState: document.querySelector('#emptyState'),
    canvas: document.querySelector('#previewCanvas'),
    fullscreenCanvas: document.querySelector('#fullscreenCanvas'),
    fullscreenDialog: document.querySelector('#fullscreenPreview'),
    fullscreenButton: document.querySelector('#fullscreenButton'),
    closeFullscreen: document.querySelector('#closeFullscreen'),
    floating: document.querySelector('#floatingPreview'),
    floatingCanvas: document.querySelector('#floatingCanvas'),
    floatingCanvasButton: document.querySelector('#floatingCanvasButton'),
    floatingMode: document.querySelector('#floatingMode'),
    floatingPrevious: document.querySelector('#floatingPrevious'),
    floatingNext: document.querySelector('#floatingNext'),
    floatingMinimize: document.querySelector('#floatingMinimize'),
    floatingClose: document.querySelector('#floatingClose'),
    floatingDragHandle: document.querySelector('#floatingDragHandle'),
    imageInfo: document.querySelector('#imageInfo'),
    error: document.querySelector('#errorMessage'),
    busy: document.querySelector('#busyIndicator'),
    controls: [...document.querySelectorAll('input[type="range"]')],
    fxGroups: [...document.querySelectorAll('[data-fx-group]')],
    fxCounts: [...document.querySelectorAll('[data-fx-count]')],
    fxResets: [...document.querySelectorAll('[data-reset-group]')],
    random: document.querySelector('#randomButton'),
    reset: document.querySelector('#resetButton'),
    export: document.querySelector('#exportButton')
  };

  if (!pan.canvas || !pan.canvas.isSupported()) {
    elements.error.textContent = 'This browser does not support the Canvas features required by THE PAN IMAGE MACHINE.';
    elements.error.hidden = false;
    elements.dropZone.setAttribute('aria-disabled', 'true');
    elements.controls.forEach(control => { control.disabled = true; });
    elements.random.disabled = true;
    return;
  }

  pan.analytics.configure('image_machine', 'v0');
  const ctx = elements.canvas.getContext('2d', { willReadFrequently: true });
  const sourceCanvas = pan.canvas.getTemporaryCanvas('image-machine-source', 1, 1);
  const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  let imageLoaded = false;
  let renderQueued = false;
  let sourceRevision = 0;
  let lastRenderKey = '';
  let effectEventTimer = 0;
  let fullscreenReturnFocus = null;
  let largePreviewVisible = true;
  let floatingDismissed = false;
  let floatingUpdateQueued = false;
  let floatingModeIndex = 1;
  let floatingSwipeStartX = null;
  let suppressFullscreenUntil = 0;
  let floatingDrag = null;

  function track(event, parameters) {
    pan.analytics.track(event, parameters);
  }

  function showError(message, errorType = 'processing_error') {
    elements.error.textContent = message;
    elements.error.hidden = false;
    track('tool_error', { error_type: errorType });
  }

  function clearError() {
    elements.error.hidden = true;
    elements.error.textContent = '';
  }

  function setBusy(isBusy) {
    elements.busy.hidden = !isBusy;
    elements.dropZone.setAttribute('aria-busy', String(isBusy));
  }

  function values() {
    return Object.fromEntries(elements.controls.map(input => [input.id, Number(input.value)]));
  }

  function defaultValue(id) {
    return EFFECT_DEFINITIONS[id].defaultValue;
  }

  function updateFxCounts() {
    const current = values();
    elements.fxCounts.forEach(counter => {
      const group = counter.dataset.fxCount;
      const active = Object.entries(EFFECT_DEFINITIONS)
        .filter(([, definition]) => definition.group === group)
        .filter(([id, definition]) => current[id] !== definition.defaultValue).length;
      counter.textContent = `${active} ACTIVE`;
    });
  }

  function saveFxGroupState() {
    const state = Object.fromEntries(elements.fxGroups.map(group => [group.dataset.fxGroup, group.open]));
    try { localStorage.setItem(FX_STATE_KEY, JSON.stringify(state)); } catch (_) {}
  }

  function restoreFxGroupState() {
    try {
      const state = JSON.parse(localStorage.getItem(FX_STATE_KEY));
      if (!state || typeof state !== 'object') return;
      elements.fxGroups.forEach(group => {
        const saved = state[group.dataset.fxGroup];
        if (typeof saved === 'boolean') group.open = saved;
      });
    } catch (_) {}
  }

  function renderKey() {
    return `${sourceRevision}:${elements.controls.map(input => input.value).join(':')}`;
  }

  function updateControl(input) {
    const output = document.querySelector(`output[for="${input.id}"]`);
    if (output) output.value = input.value;
    const percent = ((Number(input.value) - Number(input.min)) / (Number(input.max) - Number(input.min))) * 100;
    input.style.setProperty('--fill', `${percent}%`);
  }

  function scheduleRender(force = false) {
    if (!imageLoaded || renderQueued) return;
    const key = renderKey();
    if (!force && key === lastRenderKey) return;
    renderQueued = true;
    setBusy(true);
    requestAnimationFrame(() => {
      renderQueued = false;
      try {
        render();
        lastRenderKey = renderKey();
        clearError();
      } catch (_) {
        showError('The signal could not be processed. Try a smaller image or reset the controls.', 'render_failed');
      } finally {
        setBusy(false);
      }
    });
  }

  function render() {
    const { pixelate, dither, noise, rgbSplit, scanline, contrast, brightness } = values();
    const width = sourceCanvas.width;
    const height = sourceCanvas.height;
    ctx.clearRect(0, 0, width, height);

    if (pixelate > 1) {
      const smallWidth = Math.max(1, Math.round(width / pixelate));
      const smallHeight = Math.max(1, Math.round(height / pixelate));
      const pixelCanvas = pan.canvas.getTemporaryCanvas('image-machine-pixel', smallWidth, smallHeight);
      const pixelCtx = pixelCanvas.getContext('2d');
      pixelCtx.clearRect(0, 0, smallWidth, smallHeight);
      pixelCtx.drawImage(sourceCanvas, 0, 0, smallWidth, smallHeight);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(pixelCanvas, 0, 0, smallWidth, smallHeight, 0, 0, width, height);
      ctx.imageSmoothingEnabled = true;
    } else {
      ctx.drawImage(sourceCanvas, 0, 0);
    }

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const original = rgbSplit > 0 ? new Uint8ClampedArray(data) : null;
    const contrastFactor = contrast / 100;
    const brightnessFactor = brightness / 100;
    const bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
    const ditherMix = dither / 100;
    const noiseAmount = noise * 1.28;
    const split = Math.round(rgbSplit);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        for (let channel = 0; channel < 3; channel++) {
          let value = (data[index + channel] - 128) * contrastFactor + 128;
          value *= brightnessFactor;
          if (noiseAmount) value += (Math.random() - 0.5) * noiseAmount;
          if (ditherMix) {
            const threshold = (bayer[y & 3][x & 3] / 16 - 0.5) * 96;
            const quantized = value + threshold < 128 ? 0 : 255;
            value = value * (1 - ditherMix) + quantized * ditherMix;
          }
          data[index + channel] = value;
        }

        if (split && original) {
          const leftX = Math.max(0, x - split);
          const rightX = Math.min(width - 1, x + split);
          data[index] = original[(y * width + leftX) * 4];
          data[index + 2] = original[(y * width + rightX) * 4 + 2];
        }

        if (scanline && y % 4 < 2) {
          const multiplier = 1 - (scanline / 100) * 0.58;
          data[index] *= multiplier;
          data[index + 1] *= multiplier;
          data[index + 2] *= multiplier;
        }
      }
    }
    ctx.putImageData(imageData, 0, 0);
    scheduleFloatingUpdate();
  }

  function drawContained(targetCtx, source, clipSide) {
    const width = targetCtx.canvas.width;
    const height = targetCtx.canvas.height;
    const scale = Math.min(width / source.width, height / source.height);
    const drawWidth = source.width * scale;
    const drawHeight = source.height * scale;
    const x = (width - drawWidth) / 2;
    const y = (height - drawHeight) / 2;
    targetCtx.save();
    if (clipSide === 'left') {
      targetCtx.beginPath();
      targetCtx.rect(0, 0, width / 2, height);
      targetCtx.clip();
    } else if (clipSide === 'right') {
      targetCtx.beginPath();
      targetCtx.rect(width / 2, 0, width / 2, height);
      targetCtx.clip();
    }
    targetCtx.drawImage(source, x, y, drawWidth, drawHeight);
    targetCtx.restore();
  }

  function updateFloatingPreview() {
    floatingUpdateQueued = false;
    if (!imageLoaded || elements.floating.hidden) return;
    const floatingCtx = elements.floatingCanvas.getContext('2d');
    floatingCtx.fillStyle = '#050505';
    floatingCtx.fillRect(0, 0, elements.floatingCanvas.width, elements.floatingCanvas.height);
    const mode = PREVIEW_MODES[floatingModeIndex];
    if (mode === 'original') drawContained(floatingCtx, sourceCanvas);
    else if (mode === 'current') drawContained(floatingCtx, elements.canvas);
    else {
      drawContained(floatingCtx, sourceCanvas, 'left');
      drawContained(floatingCtx, elements.canvas, 'right');
    }
    elements.floating.dataset.mode = mode;
    elements.floatingMode.textContent = mode.toUpperCase();
  }

  function scheduleFloatingUpdate() {
    if (floatingUpdateQueued) return;
    floatingUpdateQueued = true;
    requestAnimationFrame(updateFloatingPreview);
  }

  function updateFloatingVisibility() {
    const shouldShow = imageLoaded && !largePreviewVisible && !floatingDismissed;
    elements.floating.hidden = !shouldShow;
    if (shouldShow) scheduleFloatingUpdate();
  }

  function changeFloatingMode(direction) {
    floatingModeIndex = (floatingModeIndex + direction + PREVIEW_MODES.length) % PREVIEW_MODES.length;
    scheduleFloatingUpdate();
  }

  function resetGroup(groupName) {
    elements.controls.forEach(input => {
      if (EFFECT_DEFINITIONS[input.id].group !== groupName) return;
      input.value = defaultValue(input.id);
      updateControl(input);
    });
    updateFxCounts();
    scheduleRender();
  }

  async function loadFile(file) {
    clearError();
    if (!file || !file.type.startsWith('image/')) {
      showError('Please choose a PNG, JPEG, WEBP, or GIF image.', 'unsupported_file');
      return;
    }
    if (file.size > 40 * 1024 * 1024) {
      showError('This file is too large. Please choose an image under 40 MB.', 'file_too_large');
      return;
    }

    setBusy(true);
    let renderWillClearBusy = false;
    try {
      const decoded = await pan.canvas.decodeImage(file);
      const fitted = pan.canvas.fitDimensions(decoded.width, decoded.height, MAX_DIMENSION, MAX_PIXELS);
      sourceCanvas.width = elements.canvas.width = fitted.width;
      sourceCanvas.height = elements.canvas.height = fitted.height;
      sourceCtx.clearRect(0, 0, fitted.width, fitted.height);
      sourceCtx.drawImage(decoded.source, 0, 0, fitted.width, fitted.height);
      decoded.release();
      sourceRevision += 1;
      imageLoaded = true;
      floatingDismissed = false;
      elements.emptyState.hidden = true;
      elements.canvas.hidden = false;
      elements.fullscreenButton.hidden = false;
      elements.export.disabled = false;
      elements.imageInfo.textContent = `${fitted.width} × ${fitted.height}${fitted.scaled ? ' / AUTO-SCALED' : ''}`;
      lastRenderKey = '';
      renderWillClearBusy = true;
      scheduleRender(true);
      updateFloatingVisibility();
      track('image_upload');
    } catch (_) {
      showError('This image could not be decoded. Try exporting it as PNG or JPEG first.', 'decode_failed');
    } finally {
      elements.fileInput.value = '';
      if (!renderWillClearBusy) setBusy(false);
    }
  }

  function resetControls(shouldTrack = true) {
    elements.controls.forEach(input => {
      input.value = defaultValue(input.id);
      updateControl(input);
    });
    updateFxCounts();
    scheduleRender();
    if (shouldTrack) track('reset_tool');
  }

  function randomize() {
    const ranges = {
      pixelate: [2, 24], dither: [0, 75], noise: [4, 48], rgbSplit: [0, 20],
      scanline: [0, 70], contrast: [75, 170], brightness: [70, 125]
    };
    elements.controls.forEach(input => {
      const [min, max] = ranges[input.id];
      input.value = Math.round(min + Math.random() * (max - min));
      updateControl(input);
    });
    updateFxCounts();
    scheduleRender();
    track('random_distort');
  }

  async function exportPng() {
    if (!imageLoaded) return;
    try {
      await pan.canvas.exportPng(elements.canvas, 'the-pan-image-machine.png');
      track('image_export');
    } catch (_) {
      showError('PNG export failed. Please try again.', 'export_failed');
    }
  }

  function openFullscreen() {
    if (!imageLoaded) return;
    fullscreenReturnFocus = document.activeElement;
    elements.fullscreenCanvas.width = elements.canvas.width;
    elements.fullscreenCanvas.height = elements.canvas.height;
    elements.fullscreenCanvas.getContext('2d').drawImage(elements.canvas, 0, 0);
    elements.fullscreenDialog.hidden = false;
    document.body.setAttribute('data-fullscreen-open', 'true');
    elements.closeFullscreen.focus();
  }

  function closeFullscreen() {
    if (elements.fullscreenDialog.hidden) return;
    elements.fullscreenDialog.hidden = true;
    document.body.removeAttribute('data-fullscreen-open');
    if (fullscreenReturnFocus) fullscreenReturnFocus.focus();
  }

  function restoreFloatingCorner() {
    try {
      const corner = localStorage.getItem(FLOATING_CORNER_KEY);
      if (['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(corner)) {
        elements.floating.dataset.corner = corner;
      }
    } catch (_) {}
  }

  function setFloatingMinimized(minimized) {
    elements.floating.classList.toggle('is-minimized', minimized);
    elements.floatingMinimize.textContent = minimized ? '□' : '_';
    elements.floatingMinimize.setAttribute('aria-label', minimized ? 'Restore floating preview' : 'Minimize floating preview');
  }

  function closeFloating() {
    floatingDismissed = true;
    elements.floating.hidden = true;
  }

  function finishFloatingDrag(event) {
    if (!floatingDrag) return;
    const corner = `${event.clientY < window.innerHeight / 2 ? 'top' : 'bottom'}-${event.clientX < window.innerWidth / 2 ? 'left' : 'right'}`;
    elements.floating.style.removeProperty('left');
    elements.floating.style.removeProperty('top');
    elements.floating.style.removeProperty('right');
    elements.floating.style.removeProperty('bottom');
    elements.floating.dataset.corner = corner;
    try { localStorage.setItem(FLOATING_CORNER_KEY, corner); } catch (_) {}
    floatingDrag = null;
  }

  elements.fileInput.addEventListener('change', event => loadFile(event.target.files[0]));
  elements.browseButton.addEventListener('click', event => {
    event.stopPropagation();
    elements.fileInput.click();
  });
  elements.dropZone.addEventListener('click', () => {
    if (imageLoaded) openFullscreen();
    else elements.fileInput.click();
  });
  elements.dropZone.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (imageLoaded) openFullscreen();
      else elements.fileInput.click();
    }
  });
  ['dragenter', 'dragover'].forEach(type => elements.dropZone.addEventListener(type, event => {
    event.preventDefault();
    elements.dropZone.classList.add('dragover');
  }));
  ['dragleave', 'drop'].forEach(type => elements.dropZone.addEventListener(type, event => {
    event.preventDefault();
    elements.dropZone.classList.remove('dragover');
  }));
  elements.dropZone.addEventListener('drop', event => loadFile(event.dataTransfer.files[0]));

  elements.controls.forEach(input => {
    updateControl(input);
    input.addEventListener('input', () => {
      updateControl(input);
      updateFxCounts();
      scheduleRender();
      clearTimeout(effectEventTimer);
      effectEventTimer = setTimeout(() => track('effect_used', { effect_name: input.dataset.effect }), 400);
    });
  });
  restoreFxGroupState();
  updateFxCounts();
  document.querySelector('[data-planned-effects]').textContent = PLANNED_EFFECTS.join(' · ').toUpperCase();
  elements.fxGroups.forEach(group => group.addEventListener('toggle', saveFxGroupState));
  elements.fxResets.forEach(button => button.addEventListener('click', () => resetGroup(button.dataset.resetGroup)));
  elements.random.addEventListener('click', randomize);
  elements.reset.addEventListener('click', () => resetControls(true));
  elements.export.addEventListener('click', exportPng);
  elements.fullscreenButton.addEventListener('click', event => { event.stopPropagation(); openFullscreen(); });
  elements.closeFullscreen.addEventListener('click', closeFullscreen);
  elements.fullscreenDialog.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeFullscreen();
    } else if (event.key === 'Tab') {
      event.preventDefault();
      elements.closeFullscreen.focus();
    }
  });

  restoreFloatingCorner();
  elements.floatingPrevious.addEventListener('click', () => changeFloatingMode(-1));
  elements.floatingNext.addEventListener('click', () => changeFloatingMode(1));
  elements.floatingMinimize.addEventListener('click', () => setFloatingMinimized(!elements.floating.classList.contains('is-minimized')));
  elements.floatingClose.addEventListener('click', closeFloating);
  elements.floatingCanvasButton.addEventListener('click', () => {
    if (Date.now() < suppressFullscreenUntil) return;
    openFullscreen();
  });
  elements.floatingCanvasButton.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      changeFloatingMode(event.key === 'ArrowLeft' ? -1 : 1);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeFloating();
    }
  });
  elements.floatingCanvasButton.addEventListener('pointerdown', event => {
    floatingSwipeStartX = event.clientX;
  });
  elements.floatingCanvasButton.addEventListener('pointerup', event => {
    if (floatingSwipeStartX === null) return;
    const distance = event.clientX - floatingSwipeStartX;
    floatingSwipeStartX = null;
    if (Math.abs(distance) < 40) return;
    suppressFullscreenUntil = Date.now() + 400;
    changeFloatingMode(distance > 0 ? -1 : 1);
  });
  elements.floatingDragHandle.addEventListener('pointerdown', event => {
    if (window.matchMedia('(max-width: 800px)').matches || event.target.closest('button')) return;
    const rect = elements.floating.getBoundingClientRect();
    floatingDrag = { offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top };
    elements.floatingDragHandle.setPointerCapture(event.pointerId);
  });
  elements.floatingDragHandle.addEventListener('pointermove', event => {
    if (!floatingDrag) return;
    const maxLeft = window.innerWidth - elements.floating.offsetWidth;
    const maxTop = window.innerHeight - elements.floating.offsetHeight;
    elements.floating.style.left = `${Math.max(0, Math.min(maxLeft, event.clientX - floatingDrag.offsetX))}px`;
    elements.floating.style.top = `${Math.max(0, Math.min(maxTop, event.clientY - floatingDrag.offsetY))}px`;
    elements.floating.style.right = 'auto';
    elements.floating.style.bottom = 'auto';
  });
  elements.floatingDragHandle.addEventListener('pointerup', finishFloatingDrag);
  elements.floatingDragHandle.addEventListener('pointercancel', finishFloatingDrag);
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || elements.floating.hidden) return;
    if (event.target.closest('#consentPanel, #fullscreenPreview')) return;
    closeFloating();
  });

  if ('IntersectionObserver' in window) {
    const workspaceObserver = new IntersectionObserver(entries => {
      document.body.setAttribute('data-workspace-active', String(entries[0].isIntersecting));
    }, { threshold: 0.05 });
    workspaceObserver.observe(document.querySelector('#machine'));
    const previewObserver = new IntersectionObserver(entries => {
      largePreviewVisible = entries[0].intersectionRatio >= 0.15;
      if (largePreviewVisible) floatingDismissed = false;
      updateFloatingVisibility();
    }, { threshold: [0, 0.15, 1] });
    previewObserver.observe(document.querySelector('.screen-panel'));
  } else {
    document.body.setAttribute('data-workspace-active', 'true');
    largePreviewVisible = false;
  }

  document.querySelector('#year').textContent = new Date().getFullYear();
}());
