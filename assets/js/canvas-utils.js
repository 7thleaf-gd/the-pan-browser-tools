'use strict';

(function canvasUtilsModule(global) {
  const root = global.ThePan = global.ThePan || {};
  const temporaryCanvases = new Map();

  function isSupported() {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext && canvas.getContext('2d') && canvas.toBlob);
  }

  function fitDimensions(width, height, maxDimension = 2048, maxPixels = 4_000_000) {
    const scale = Math.min(1, maxDimension / Math.max(width, height), Math.sqrt(maxPixels / (width * height)));
    return {
      width: Math.max(1, Math.round(width * scale)),
      height: Math.max(1, Math.round(height * scale)),
      scaled: scale < 1
    };
  }

  function decodeWithImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
        source: image,
        release: () => URL.revokeObjectURL(url)
      });
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('decode_failed'));
      };
      image.src = url;
    });
  }

  async function decodeImage(file) {
    if (typeof global.createImageBitmap === 'function') {
      try {
        const bitmap = await global.createImageBitmap(file);
        return {
          width: bitmap.width,
          height: bitmap.height,
          source: bitmap,
          release: () => bitmap.close()
        };
      } catch (_) {
        return decodeWithImage(file);
      }
    }
    return decodeWithImage(file);
  }

  function getTemporaryCanvas(key, width, height) {
    let canvas = temporaryCanvases.get(key);
    if (!canvas) {
      canvas = document.createElement('canvas');
      temporaryCanvases.set(key, canvas);
    }
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    return canvas;
  }

  function exportPng(canvas, filename = 'the-pan-export.png') {
    return new Promise((resolve, reject) => {
      try {
        canvas.toBlob(blob => {
          if (!blob) {
            reject(new Error('export_failed'));
            return;
          }
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          link.click();
          global.setTimeout(() => URL.revokeObjectURL(url), 1000);
          resolve();
        }, 'image/png');
      } catch (error) {
        reject(error);
      }
    });
  }

  root.canvas = Object.freeze({ isSupported, fitDimensions, decodeImage, getTemporaryCanvas, exportPng });
}(window));
