'use strict';

const MAX_DIMENSION = 2048;
const MAX_PIXELS = 4_000_000;
const CONSENT_KEY = 'thePanAnalyticsConsent';

const elements = {
  fileInput: document.querySelector('#fileInput'),
  browseButton: document.querySelector('#browseButton'),
  dropZone: document.querySelector('#dropZone'),
  emptyState: document.querySelector('#emptyState'),
  canvas: document.querySelector('#previewCanvas'),
  imageInfo: document.querySelector('#imageInfo'),
  error: document.querySelector('#errorMessage'),
  busy: document.querySelector('#busyIndicator'),
  controls: [...document.querySelectorAll('input[type="range"]')],
  random: document.querySelector('#randomButton'),
  reset: document.querySelector('#resetButton'),
  export: document.querySelector('#exportButton'),
  consentPanel: document.querySelector('#consentPanel'),
  acceptAnalytics: document.querySelector('#acceptAnalytics'),
  declineAnalytics: document.querySelector('#declineAnalytics'),
  privacySettings: document.querySelector('#privacySettings')
};

const ctx = elements.canvas.getContext('2d', { willReadFrequently: true });
const sourceCanvas = document.createElement('canvas');
const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
let imageLoaded = false;
let renderQueued = false;
let effectEventTimer = 0;

function track(event, parameters = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...parameters });
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
}

function values() {
  return Object.fromEntries(elements.controls.map(input => [input.id, Number(input.value)]));
}

function updateControl(input) {
  const output = document.querySelector(`output[for="${input.id}"]`);
  if (output) output.value = input.value;
  const percent = ((Number(input.value) - Number(input.min)) / (Number(input.max) - Number(input.min))) * 100;
  input.style.setProperty('--fill', `${percent}%`);
}

function scheduleRender() {
  if (!imageLoaded || renderQueued) return;
  renderQueued = true;
  setBusy(true);
  requestAnimationFrame(() => {
    renderQueued = false;
    try {
      render();
      clearError();
    } catch (error) {
      console.error(error);
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
    const temp = document.createElement('canvas');
    temp.width = smallWidth;
    temp.height = smallHeight;
    const tempCtx = temp.getContext('2d');
    tempCtx.drawImage(sourceCanvas, 0, 0, smallWidth, smallHeight);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(temp, 0, 0, smallWidth, smallHeight, 0, 0, width, height);
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

function fitDimensions(width, height) {
  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height), Math.sqrt(MAX_PIXELS / (width * height)));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)), scaled: scale < 1 };
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
  try {
    const bitmap = await createImageBitmap(file);
    const fitted = fitDimensions(bitmap.width, bitmap.height);
    sourceCanvas.width = elements.canvas.width = fitted.width;
    sourceCanvas.height = elements.canvas.height = fitted.height;
    sourceCtx.clearRect(0, 0, fitted.width, fitted.height);
    sourceCtx.drawImage(bitmap, 0, 0, fitted.width, fitted.height);
    bitmap.close();
    imageLoaded = true;
    elements.emptyState.hidden = true;
    elements.canvas.hidden = false;
    elements.export.disabled = false;
    elements.imageInfo.textContent = `${fitted.width} × ${fitted.height}${fitted.scaled ? ' / AUTO-SCALED' : ''}`;
    render();
    track('image_upload');
  } catch (error) {
    console.error(error);
    showError('This image could not be decoded. Try exporting it as PNG or JPEG first.', 'decode_failed');
  } finally {
    elements.fileInput.value = '';
    setBusy(false);
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

function exportPng() {
  if (!imageLoaded) return;
  try {
    elements.canvas.toBlob(blob => {
      if (!blob) {
        showError('PNG export failed. Please try again.', 'export_failed');
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'the-pan-image-machine.png';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      track('image_export');
    }, 'image/png');
  } catch (error) {
    console.error(error);
    showError('PNG export failed. Please try again.', 'export_failed');
  }
}

function setConsent(status) {
  try { localStorage.setItem(CONSENT_KEY, status); } catch (_) {}
  gtag('consent', 'update', {
    analytics_storage: status,
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied'
  });
  elements.consentPanel.hidden = true;
  elements.privacySettings.focus();
}

elements.fileInput.addEventListener('change', event => loadFile(event.target.files[0]));
elements.browseButton.addEventListener('click', event => {
  event.stopPropagation();
  elements.fileInput.click();
});
elements.dropZone.addEventListener('click', () => { if (!imageLoaded) elements.fileInput.click(); });
elements.dropZone.addEventListener('keydown', event => {
  if (!imageLoaded && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault();
    elements.fileInput.click();
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
elements.acceptAnalytics.addEventListener('click', () => setConsent('granted'));
elements.declineAnalytics.addEventListener('click', () => setConsent('denied'));
elements.privacySettings.addEventListener('click', () => {
  elements.consentPanel.hidden = false;
  elements.acceptAnalytics.focus();
});

document.querySelector('#year').textContent = new Date().getFullYear();
try {
  if (localStorage.getItem(CONSENT_KEY) === null) elements.consentPanel.hidden = false;
} catch (_) {
  elements.consentPanel.hidden = false;
}
