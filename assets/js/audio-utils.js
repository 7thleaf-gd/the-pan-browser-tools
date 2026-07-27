'use strict';

(function audioUtilities(global) {
  const root = global.ThePan = global.ThePan || {};

  function seededRandom(seed) {
    let state = seed >>> 0 || 1;
    return function random() {
      state += 0x6D2B79F5;
      let value = state;
      value = Math.imul(value ^ value >>> 15, value | 1);
      value ^= value + Math.imul(value ^ value >>> 7, value | 61);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
  }

  function extractPeaks(buffer, count) {
    const length = Math.max(1, Math.min(count, buffer.length));
    const step = buffer.length / length;
    const peaks = new Float32Array(length);
    for (let index = 0; index < length; index += 1) {
      const start = Math.floor(index * step);
      const end = Math.max(start + 1, Math.floor((index + 1) * step));
      let peak = 0;
      for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
        const data = buffer.getChannelData(channel);
        const stride = Math.max(1, Math.floor((end - start) / 48));
        for (let sample = start; sample < end; sample += stride) peak = Math.max(peak, Math.abs(data[sample] || 0));
      }
      peaks[index] = peak;
    }
    return peaks;
  }

  function encodeWav(buffer) {
    const channels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const frames = buffer.length;
    const bytesPerSample = 2;
    const blockAlign = channels * bytesPerSample;
    const dataSize = frames * blockAlign;
    const output = new ArrayBuffer(44 + dataSize);
    const view = new DataView(output);
    const writeText = (offset, text) => {
      for (let index = 0; index < text.length; index += 1) view.setUint8(offset + index, text.charCodeAt(index));
    };
    writeText(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeText(8, 'WAVE');
    writeText(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    writeText(36, 'data');
    view.setUint32(40, dataSize, true);
    const channelData = Array.from({ length: channels }, (_, channel) => buffer.getChannelData(channel));
    let offset = 44;
    for (let frame = 0; frame < frames; frame += 1) {
      for (let channel = 0; channel < channels; channel += 1) {
        const sample = Math.max(-1, Math.min(1, channelData[channel][frame]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
        offset += 2;
      }
    }
    return new Blob([output], { type: 'audio/wav' });
  }

  root.audio = Object.freeze({ seededRandom, extractPeaks, encodeWav });
}(window));
