'use strict';

(function imageMachine() {
  const MAX_DIMENSION = 2048;
  const MAX_PIXELS = 4_000_000;
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
    imageInfo: document.querySelector('#imageInfo'),
    error: document.querySelector('#errorMessage'),
    busy: document.querySelector('#busyIndicator'),
    controls: [...document.querySelectorAll('input[type="range"]')],
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
      elements.emptyState.hidden = true;
      elements.canvas.hidden = false;
      elements.fullscreenButton.hidden = false;
      elements.export.disabled = false;
      elements.imageInfo.textContent = `${fitted.width} × ${fitted.height}${fitted.scaled ? ' / AUTO-SCALED' : ''}`;
      lastRenderKey = '';
      renderWillClearBusy = true;
      scheduleRender(true);
      track('image_upload');
    } catch (_) {
      showError('This image could not be decoded. Try exporting it as PNG or JPEG first.', 'decode_failed');
    } finally {
      elements.fileInput.value = '';
      if (!renderWillClearBusy) setBusy(false);
    }
  }

  function resetControls(shouldTrack = true) {
    const defaults = { pixelate: 0, dither: 0, noise: 0, rgbSplit: 0, scanline: 0, contrast: 100, brightness: 100 };
    elements.controls.forEach(input => {
      input.value = defaults[input.id];
      updateControl(input);
    });
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
    elements.closeFullscreen.focus();
  }

  function closeFullscreen() {
    if (elements.fullscreenDialog.hidden) return;
    elements.fullscreenDialog.hidden = true;
    if (fullscreenReturnFocus) fullscreenReturnFocus.focus();
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
      scheduleRender();
      clearTimeout(effectEventTimer);
      effectEventTimer = setTimeout(() => track('effect_used', { effect_name: input.dataset.effect }), 400);
    });
  });
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

  if ('IntersectionObserver' in window) {
    const workspaceObserver = new IntersectionObserver(entries => {
      document.body.setAttribute('data-workspace-active', String(entries[0].isIntersecting));
    }, { threshold: 0.05 });
    workspaceObserver.observe(document.querySelector('#machine'));
  } else {
    document.body.setAttribute('data-workspace-active', 'true');
  }

  document.querySelector('#year').textContent = new Date().getFullYear();
}());
