'use strict';

(function tapeMachine() {
  const pan = window.ThePan || {};
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const OfflineAudioContextClass = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const IS_IOS_WEBKIT = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const LONG_AUDIO_SECONDS = 180;
  const MOBILE_RECOMMENDED_SECONDS = 300;
  const MAX_DURATION = 600;
  const RECOMMENDED_FILE_SIZE = 50 * 1024 * 1024;
  const MAX_FILE_SIZE = 100 * 1024 * 1024;
  const BANK_STORAGE_KEY = 'thePanTapeBankState';
  const SHARE_TEXT = 'Damaged with THE PAN TAPE MACHINE.\nhttps://tools.thepan.xyz/tape/\n#7thleaftools';
  const DEFAULTS = Object.freeze({
    saturation: 0, wowRate: 0.35, wowDepth: 0, flutterRate: 7, flutterDepth: 0,
    noiseAmount: 0, dropoutAmount: 0, dropoutFrequency: 0,
    bitDepth: 16, sampleReduction: 1, lowPass: 20000
  });
  const EFFECTS = Object.freeze({
    saturation: { bank: 'tape', defaultValue: 0 },
    wowRate: { bank: 'tape', defaultValue: 0.35, dependsOn: 'wowDepth' },
    wowDepth: { bank: 'tape', defaultValue: 0 },
    flutterRate: { bank: 'tape', defaultValue: 7, dependsOn: 'flutterDepth' },
    flutterDepth: { bank: 'tape', defaultValue: 0 },
    noiseAmount: { bank: 'damage', defaultValue: 0 },
    dropoutAmount: { bank: 'damage', defaultValue: 0 },
    dropoutFrequency: { bank: 'damage', defaultValue: 0 },
    bitDepth: { bank: 'damage', defaultValue: 16 },
    sampleReduction: { bank: 'damage', defaultValue: 1 },
    lowPass: { bank: 'tone', defaultValue: 20000 }
  });
  const preset = values => Object.freeze({ ...DEFAULTS, ...values });
  const PRESETS = Object.freeze({
    'DEAD CASSETTE': preset({ saturation: 58, wowDepth: 42, wowRate: 0.26, flutterDepth: 24, noiseAmount: 42, dropoutAmount: 46, dropoutFrequency: 36, lowPass: 5200 }),
    'BROKEN WALKMAN': preset({ saturation: 34, wowDepth: 62, wowRate: 0.48, flutterDepth: 48, flutterRate: 9.5, dropoutAmount: 28, dropoutFrequency: 52, lowPass: 8200 }),
    'DREAM TAPE': preset({ saturation: 28, wowDepth: 30, wowRate: 0.20, flutterDepth: 12, noiseAmount: 20, lowPass: 10500 }),
    'MELTED DEMO': preset({ saturation: 68, wowDepth: 76, wowRate: 0.16, flutterDepth: 18, dropoutAmount: 36, dropoutFrequency: 22, lowPass: 4100 }),
    'CHEAP PORTABLE': preset({ saturation: 40, wowDepth: 22, flutterDepth: 30, noiseAmount: 35, bitDepth: 12, sampleReduction: 2, lowPass: 7200 }),
    'UNDERWATER RADIO': preset({ saturation: 20, wowDepth: 18, noiseAmount: 26, lowPass: 1700, dropoutAmount: 14, dropoutFrequency: 18 }),
    'LOST VOICEMAIL': preset({ saturation: 46, wowDepth: 38, wowRate: 0.31, noiseAmount: 32, dropoutAmount: 52, dropoutFrequency: 28, bitDepth: 10, sampleReduction: 3, lowPass: 3300 }),
    '8-BIT TAPE': preset({ saturation: 32, wowDepth: 16, flutterDepth: 22, bitDepth: 6, sampleReduction: 10, noiseAmount: 18, lowPass: 6900 })
  });
  const state = window.ThePan.tapeState = {
    settings: { ...DEFAULTS }, activePreset: 'NONE', playbackMode: 'damaged',
    dropoutSeed: 712337, playing: false, position: 0, exporting: false,
    outputRoute: 'native-webaudio'
  };
  const el = {
    input: document.querySelector('#audioInput'), browse: document.querySelector('#audioBrowseButton'),
    screenCaptureOutput: document.querySelector('#screenCaptureOutput'),
    drop: document.querySelector('#audioDropZone'), empty: document.querySelector('#audioEmptyState'),
    canvas: document.querySelector('#waveformCanvas'), playhead: document.querySelector('#playhead'),
    info: document.querySelector('#audioInfo'), warning: document.querySelector('#audioWarning'),
    error: document.querySelector('#audioError'),
    current: document.querySelector('#currentTime'), total: document.querySelector('#totalTime'),
    status: document.querySelector('#transportStatus'), play: document.querySelector('#playButton'),
    pause: document.querySelector('#pauseButton'), stop: document.querySelector('#stopButton'),
    modes: document.querySelector('#modeButtons'), controls: [...document.querySelectorAll('[data-tape-effect]')],
    banks: [...document.querySelectorAll('[data-tape-bank]')], bankCounts: [...document.querySelectorAll('[data-tape-count]')],
    bankResets: [...document.querySelectorAll('[data-reset-tape-bank]')],
    presets: document.querySelector('#tapePresetButtons'), activePreset: document.querySelector('#tapeActivePreset'),
    surprise: document.querySelector('#tapeSurprise'), reset: document.querySelector('#tapeReset'),
    export: document.querySelector('#tapeExport'), sharePanel: document.querySelector('#tapeSharePanel'),
    shareStatus: document.querySelector('#tapeShareStatus'), share: document.querySelector('#tapeShare'),
    credit: document.querySelector('#tapeCreditCopy'), downloadAgain: document.querySelector('#tapeDownloadAgain'),
    shareClose: document.querySelector('#tapeShareClose')
  };
  let audioContext = null;
  let screenCaptureDestination = null;
  let pendingOutputActivation = null;
  let audioBuffer = null;
  let originalPeaks = null;
  let activeGraph = null;
  let startTime = 0;
  let startOffset = 0;
  let animationFrame = 0;
  let rebuildTimer = 0;
  let generation = 0;
  let lastFamily = '';
  let lastWavBlob = null;
  let shareReturnFocus = null;
  let seeking = false;

  const track = (event, parameters) => pan.analytics.track(event, parameters);
  pan.analytics.configure('tape_machine', 'v0');

  function slug(value) { return value.toLowerCase().replaceAll(' ', '_').replaceAll('-', '_'); }
  function showError(message, errorType) {
    el.error.textContent = message;
    el.error.hidden = false;
    track('tool_error', { error_type: errorType });
  }
  function clearError() { el.error.hidden = true; el.error.textContent = ''; }
  function setWarning(messages = []) {
    el.warning.textContent = messages.join(' ');
    el.warning.hidden = messages.length === 0;
  }
  function setStatus(message) { el.status.textContent = message; }
  function setBusy(busy) { el.drop.setAttribute('aria-busy', String(busy)); }
  function formatTime(seconds) {
    const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
    const minutes = Math.floor(safe / 60);
    const remainder = safe - minutes * 60;
    return `${String(minutes).padStart(2, '0')}:${remainder.toFixed(1).padStart(4, '0')}`;
  }
  function currentPosition() {
    if (!state.playing || !audioContext) return state.position;
    return Math.min(audioBuffer.duration, startOffset + Math.max(0, audioContext.currentTime - startTime));
  }
  function configureAudioSession() {
    if (!IS_IOS_WEBKIT || !navigator.audioSession) return;
    try { navigator.audioSession.type = 'playback'; } catch (_) {}
  }
  async function ensureContext() {
    if (!AudioContextClass) throw new Error('audio_context_unsupported');
    configureAudioSession();
    if (!audioContext) audioContext = new AudioContextClass({ latencyHint: 'interactive' });
    if (!['running', 'closed'].includes(audioContext.state)) await audioContext.resume();
    return audioContext;
  }
  async function realtimeOutput(context) {
    if (
      !IS_IOS_WEBKIT ||
      !el.screenCaptureOutput ||
      typeof context.createMediaStreamDestination !== 'function' ||
      !('srcObject' in el.screenCaptureOutput)
    ) {
      state.outputRoute = 'native-webaudio';
      return context.destination;
    }
    if (!screenCaptureDestination) {
      screenCaptureDestination = context.createMediaStreamDestination();
      el.screenCaptureOutput.srcObject = screenCaptureDestination.stream;
    }
    try {
      el.screenCaptureOutput.muted = false;
      el.screenCaptureOutput.volume = 1;
      await el.screenCaptureOutput.play();
      state.outputRoute = 'ios-media-element';
      return screenCaptureDestination;
    } catch (_) {
      state.outputRoute = 'native-webaudio-fallback';
      return context.destination;
    }
  }
  function saturationCurve(amount) {
    const samples = 2048;
    const curve = new Float32Array(samples);
    const drive = 1 + amount / 12;
    const normalization = Math.tanh(drive);
    for (let index = 0; index < samples; index += 1) {
      const x = index * 2 / (samples - 1) - 1;
      curve[index] = Math.tanh(x * drive) / normalization * (1 - amount / 850);
    }
    return curve;
  }
  function dropoutEvents(duration) {
    const amount = state.settings.dropoutAmount / 100;
    const frequency = state.settings.dropoutFrequency / 100;
    if (!amount || !frequency) return [];
    const random = pan.audio.seededRandom(state.dropoutSeed);
    const events = [];
    let time = 0.8 + random() * 1.2;
    const meanInterval = 9 - frequency * 7.5;
    while (time < duration) {
      events.push({ time, length: 0.035 + random() * (0.12 + amount * 0.09), floor: Math.max(0.22, 1 - amount * (0.48 + random() * 0.28)) });
      time += Math.max(0.5, meanInterval * (0.55 + random() * 1.1));
    }
    return events;
  }
  function createNoiseBuffer(context) {
    const seconds = 4;
    const length = Math.round(context.sampleRate * seconds);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const output = buffer.getChannelData(0);
    const random = pan.audio.seededRandom(state.dropoutSeed ^ 0x91A2B3);
    let previous = 0;
    for (let index = 0; index < length; index += 1) {
      const white = random() * 2 - 1;
      previous = previous * 0.42 + white * 0.58;
      output[index] = previous * 0.7;
    }
    return buffer;
  }
  function createBitCrusher(context) {
    if (!context.createScriptProcessor || (state.settings.bitDepth === 16 && state.settings.sampleReduction === 1)) return null;
    const node = context.createScriptProcessor(1024, 2, 2);
    const phase = [0, 0];
    const held = [0, 0];
    node.onaudioprocess = event => {
      const channels = Math.min(event.inputBuffer.numberOfChannels, event.outputBuffer.numberOfChannels);
      const step = 2 ** (state.settings.bitDepth - 1);
      const reduction = Math.max(1, state.settings.sampleReduction);
      for (let channel = 0; channel < channels; channel += 1) {
        const input = event.inputBuffer.getChannelData(channel);
        const output = event.outputBuffer.getChannelData(channel);
        for (let index = 0; index < input.length; index += 1) {
          if (phase[channel] % reduction === 0) held[channel] = Math.round(input[index] * step) / step;
          output[index] = held[channel];
          phase[channel] += 1;
        }
      }
    };
    return node;
  }
  function buildGraph(context, source, offset, exportOnly = false, outputNode = context.destination) {
    const now = context.currentTime || 0;
    const dry = context.createGain();
    const wet = context.createGain();
    const saturation = context.createWaveShaper();
    const wowDelay = context.createDelay(0.08);
    const flutterDelay = context.createDelay(0.03);
    const filter = context.createBiquadFilter();
    const dropout = context.createGain();
    const limiter = context.createDynamicsCompressor();
    const master = context.createGain();
    saturation.curve = saturationCurve(state.settings.saturation);
    saturation.oversample = '2x';
    wowDelay.delayTime.value = 0.018;
    flutterDelay.delayTime.value = 0.006;
    filter.type = 'lowpass';
    filter.frequency.value = Math.min(state.settings.lowPass, context.sampleRate * 0.46);
    filter.Q.value = 0.55;
    dropout.gain.value = 1;
    limiter.threshold.value = -7;
    limiter.knee.value = 5;
    limiter.ratio.value = 18;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.11;
    master.gain.value = 0.86;
    const damaged = exportOnly || state.playbackMode === 'damaged';
    dry.gain.value = exportOnly ? 0 : (damaged ? 0 : 1);
    wet.gain.value = damaged ? 1 : 0;
    source.connect(dry);
    source.connect(saturation);
    saturation.connect(wowDelay);
    wowDelay.connect(flutterDelay);
    flutterDelay.connect(filter);
    const crusher = exportOnly ? null : createBitCrusher(context);
    if (crusher) { filter.connect(crusher); crusher.connect(dropout); } else filter.connect(dropout);
    dropout.connect(wet);
    dry.connect(limiter);
    wet.connect(limiter);
    limiter.connect(master);
    master.connect(outputNode);
    const wowOsc = context.createOscillator();
    const wowGain = context.createGain();
    wowOsc.frequency.value = state.settings.wowRate;
    wowGain.gain.value = state.settings.wowDepth / 100 * 0.009;
    wowOsc.connect(wowGain); wowGain.connect(wowDelay.delayTime); wowOsc.start(now);
    const flutterOsc = context.createOscillator();
    const flutterGain = context.createGain();
    flutterOsc.frequency.value = state.settings.flutterRate;
    flutterGain.gain.value = state.settings.flutterDepth / 100 * 0.0018;
    flutterOsc.connect(flutterGain); flutterGain.connect(flutterDelay.delayTime); flutterOsc.start(now);
    const noise = context.createBufferSource();
    const noiseGain = context.createGain();
    noise.buffer = createNoiseBuffer(context);
    noise.loop = true;
    noiseGain.gain.value = state.settings.noiseAmount / 100 * 0.075;
    noise.connect(noiseGain); noiseGain.connect(wet);
    noise.start(now, offset % noise.buffer.duration);
    for (const event of dropoutEvents(audioBuffer.duration)) {
      if (event.time + event.length < offset) continue;
      const when = now + Math.max(0, event.time - offset);
      dropout.gain.setValueAtTime(1, when);
      dropout.gain.linearRampToValueAtTime(event.floor, when + 0.012);
      dropout.gain.setValueAtTime(event.floor, when + event.length);
      dropout.gain.linearRampToValueAtTime(1, when + event.length + 0.025);
    }
    return {
      source, dry, wet, nodes: [saturation, wowDelay, flutterDelay, filter, crusher, dropout, limiter, master, wowOsc, wowGain, flutterOsc, flutterGain, noise, noiseGain].filter(Boolean),
      setMode(mode) {
        if (exportOnly) return;
        const time = context.currentTime;
        dry.gain.cancelScheduledValues(time); wet.gain.cancelScheduledValues(time);
        dry.gain.setValueAtTime(dry.gain.value, time); wet.gain.setValueAtTime(wet.gain.value, time);
        dry.gain.linearRampToValueAtTime(mode === 'original' ? 1 : 0, time + 0.035);
        wet.gain.linearRampToValueAtTime(mode === 'damaged' ? 1 : 0, time + 0.035);
      },
      cleanup() {
        try { source.stop(); } catch (_) {}
        try { noise.stop(); } catch (_) {}
        try { wowOsc.stop(); flutterOsc.stop(); } catch (_) {}
        try { source.disconnect(); dry.disconnect(); wet.disconnect(); } catch (_) {}
        for (const node of this.nodes) { try { node.disconnect(); } catch (_) {} }
      }
    };
  }
  function stopActiveGraph() {
    generation += 1;
    if (activeGraph) activeGraph.cleanup();
    activeGraph = null;
    state.playing = false;
    cancelAnimationFrame(animationFrame);
  }
  async function startPlayback(offset = state.position) {
    if (!audioBuffer) return;
    clearError();
    try {
      const context = await ensureContext();
      const outputNode = pendingOutputActivation
        ? await pendingOutputActivation
        : await realtimeOutput(context);
      pendingOutputActivation = null;
      stopActiveGraph();
      const token = generation;
      const safeOffset = Math.max(0, Math.min(offset, Math.max(0, audioBuffer.duration - 0.01)));
      const source = context.createBufferSource();
      source.buffer = audioBuffer;
      activeGraph = buildGraph(context, source, safeOffset, false, outputNode);
      startOffset = safeOffset;
      startTime = context.currentTime;
      state.position = safeOffset;
      state.playing = true;
      source.onended = () => {
        if (token !== generation || !state.playing) return;
        state.playing = false;
        state.position = 0;
        const completedGraph = activeGraph;
        activeGraph = null;
        if (completedGraph) completedGraph.cleanup();
        setStatus('TAPE ENDED. READY TO REWIND.');
        updateTransport();
        drawWaveform();
      };
      source.start(0, safeOffset);
      setStatus(`PLAYING ${state.playbackMode.toUpperCase()} TAPE.`);
      track('audio_play', { playback_mode: state.playbackMode });
      updateTransport();
      animate();
    } catch (_) {
      pendingOutputActivation = null;
      showError('Audio could not start. Tap Play again or check browser audio permissions.', 'audio_context_failed');
    }
  }
  function pausePlayback() {
    if (!state.playing) return;
    state.position = currentPosition();
    stopActiveGraph();
    setStatus('TAPE PAUSED.');
    track('audio_pause', { playback_mode: state.playbackMode });
    updateTransport();
  }
  function stopPlayback() {
    stopActiveGraph();
    state.position = 0;
    setStatus('TAPE STOPPED / REWOUND.');
    updateTransport();
    drawWaveform();
  }
  function seekTo(position, shouldTrack = true) {
    if (!audioBuffer) return;
    const next = Math.max(0, Math.min(audioBuffer.duration, position));
    const wasPlaying = state.playing;
    stopActiveGraph();
    state.position = next >= audioBuffer.duration ? 0 : next;
    if (wasPlaying) startPlayback(state.position);
    else updateTransport();
    drawWaveform();
    if (shouldTrack) track('audio_seek');
  }
  function scheduleGraphRebuild() {
    clearTimeout(rebuildTimer);
    if (!state.playing) return;
    rebuildTimer = setTimeout(() => {
      const position = currentPosition();
      startPlayback(position);
    }, 70);
  }
  function setPlaybackMode(mode) {
    if (!['original', 'damaged'].includes(mode) || state.playbackMode === mode) return;
    state.playbackMode = mode;
    el.modes.querySelectorAll('button').forEach(button => button.classList.toggle('is-active', button.dataset.playbackMode === mode));
    if (activeGraph) activeGraph.setMode(mode);
    setStatus(`${mode.toUpperCase()} MONITOR SELECTED.`);
    drawWaveform();
    track('audio_mode_change', { playback_mode: mode });
  }
  function updateTransport() {
    const ready = Boolean(audioBuffer);
    el.play.disabled = !ready || state.playing;
    el.pause.disabled = !ready || !state.playing;
    el.stop.disabled = !ready;
    el.export.disabled = !ready || state.exporting;
    el.current.textContent = formatTime(currentPosition());
    el.total.textContent = formatTime(ready ? audioBuffer.duration : 0);
  }
  function damagedPeaks() {
    if (!originalPeaks) return null;
    const output = new Float32Array(originalPeaks.length);
    const random = pan.audio.seededRandom(state.dropoutSeed);
    const saturation = state.settings.saturation / 100;
    const noise = state.settings.noiseAmount / 100 * 0.12;
    const dropout = state.settings.dropoutAmount / 100;
    const frequency = state.settings.dropoutFrequency / 100;
    for (let index = 0; index < originalPeaks.length; index += 1) {
      let value = Math.tanh(originalPeaks[index] * (1 + saturation * 2.2));
      value = Math.min(1, value + noise * (0.5 + random()));
      if (random() < frequency * 0.035) value *= Math.max(0.25, 1 - dropout * 0.72);
      output[index] = value;
    }
    return output;
  }
  function drawWaveform() {
    if (!originalPeaks) return;
    const context = el.canvas.getContext('2d');
    const width = el.canvas.width;
    const height = el.canvas.height;
    const center = height / 2;
    const peaks = state.playbackMode === 'original' ? originalPeaks : damagedPeaks();
    context.fillStyle = '#050505'; context.fillRect(0, 0, width, height);
    context.strokeStyle = '#262920'; context.lineWidth = 1;
    for (let line = 1; line < 8; line += 1) { context.beginPath(); context.moveTo(0, line * height / 8); context.lineTo(width, line * height / 8); context.stroke(); }
    context.fillStyle = state.playbackMode === 'original' ? '#d9dcd2' : '#a8ff00';
    const step = width / peaks.length;
    for (let index = 0; index < peaks.length; index += 1) {
      const amplitude = Math.max(1, peaks[index] * center * 0.88);
      context.fillRect(index * step, center - amplitude, Math.max(1, step - 1), amplitude * 2);
    }
    updatePlayhead();
  }
  function updatePlayhead() {
    if (!audioBuffer) return;
    const ratio = Math.max(0, Math.min(1, currentPosition() / audioBuffer.duration));
    el.playhead.style.left =
      `calc(var(--tape-wave-inset) + (100% - (var(--tape-wave-inset) * 2)) * ${ratio})`;
    el.canvas.setAttribute('aria-valuenow', Math.round(ratio * 100));
    el.current.textContent = formatTime(currentPosition());
  }
  function animate() {
    cancelAnimationFrame(animationFrame);
    if (!state.playing) return;
    updatePlayhead();
    animationFrame = requestAnimationFrame(animate);
  }
  function syncControls() {
    for (const input of el.controls) {
      input.value = state.settings[input.id];
      const output = document.querySelector(`output[for="${input.id}"]`);
      if (output) output.value = input.value;
      input.style.setProperty('--fill', `${(Number(input.value) - Number(input.min)) / (Number(input.max) - Number(input.min)) * 100}%`);
    }
    el.activePreset.textContent = state.activePreset;
    el.presets.querySelectorAll('button').forEach(button => button.classList.toggle('is-active', button.dataset.preset === state.activePreset));
    updateBankCounts();
    drawWaveform();
  }
  function effectActive(id, definition) {
    if (definition.dependsOn) return state.settings[definition.dependsOn] !== DEFAULTS[definition.dependsOn];
    return state.settings[id] !== definition.defaultValue;
  }
  function updateBankCounts() {
    for (const counter of el.bankCounts) {
      const bank = counter.dataset.tapeCount;
      const active = Object.entries(EFFECTS).filter(([, definition]) => definition.bank === bank).filter(([id, definition]) => effectActive(id, definition)).length;
      counter.textContent = `${active} ACTIVE`;
    }
  }
  function applySettings(next, presetName = 'CUSTOM') {
    state.settings = { ...state.settings, ...next };
    state.activePreset = presetName;
    syncControls();
    scheduleGraphRebuild();
  }
  function applyPreset(name) {
    applySettings(PRESETS[name], name);
    track('tape_preset_used', { preset_name: slug(name) });
  }
  function surprise() {
    const names = Object.keys(PRESETS).filter(name => name !== lastFamily);
    let best = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const name = names[Math.floor(Math.random() * names.length)];
      const base = PRESETS[name];
      const settings = {};
      let delta = 0;
      for (const [id, value] of Object.entries(base)) {
        const input = document.querySelector(`#${id}`);
        if (!input || value === DEFAULTS[id]) { settings[id] = value; continue; }
        const jittered = value * (0.84 + Math.random() * 0.32);
        settings[id] = Math.max(Number(input.min), Math.min(Number(input.max), Number(input.step) < 1 ? Number(jittered.toFixed(2)) : Math.round(jittered)));
        delta += Math.abs(settings[id] - state.settings[id]);
      }
      if (!best || delta > best.delta) best = { name, settings, delta };
    }
    lastFamily = best.name;
    state.dropoutSeed = Math.floor(Math.random() * 0x7fffffff) || 1;
    applySettings(best.settings, `SURPRISE / ${best.name}`);
    track('tape_surprise', { preset_name: slug(best.name) });
  }
  function resetAll() {
    applySettings(DEFAULTS, 'NONE');
    state.dropoutSeed = 712337;
    setStatus('ALL TAPE DAMAGE RESET.');
    track('reset_tool');
  }
  function resetBank(bank) {
    const next = {};
    for (const [id, definition] of Object.entries(EFFECTS)) if (definition.bank === bank) next[id] = definition.defaultValue;
    applySettings(next);
  }
  function createPresetButtons() {
    for (const name of Object.keys(PRESETS)) {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = name; button.dataset.preset = name;
      button.addEventListener('click', () => applyPreset(name));
      el.presets.append(button);
    }
  }
  function restoreBankState() {
    try {
      const saved = JSON.parse(localStorage.getItem(BANK_STORAGE_KEY));
      if (saved) el.banks.forEach(bank => { if (typeof saved[bank.dataset.tapeBank] === 'boolean') bank.open = saved[bank.dataset.tapeBank]; });
    } catch (_) {}
  }
  function saveBankState() {
    try { localStorage.setItem(BANK_STORAGE_KEY, JSON.stringify(Object.fromEntries(el.banks.map(bank => [bank.dataset.tapeBank, bank.open])))); } catch (_) {}
  }
  async function loadAudio(file) {
    clearError(); setWarning();
    if (!file || file.size === 0) return showError('This audio file is empty.', 'empty_file');
    if (file.size > MAX_FILE_SIZE) return showError('This file is over the 100 MB limit. Choose a smaller audio file.', 'file_too_large');
    const extension = file.name.split('.').pop().toLowerCase();
    if (!['wav', 'mp3', 'm4a'].includes(extension) && !file.type.startsWith('audio/')) return showError('Choose a WAV, MP3, or browser-decodable M4A file.', 'unsupported_file');
    const warnings = [];
    if (file.size > RECOMMENDED_FILE_SIZE) warnings.push('OVER 50 MB: decoding may use substantial memory.');
    setWarning(warnings);
    setBusy(true); setStatus('DECODING TAPE…');
    try {
      const context = await ensureContext();
      const bytes = await file.arrayBuffer();
      if (!bytes.byteLength) throw new Error('empty');
      const decoded = await context.decodeAudioData(bytes.slice(0));
      if (!decoded.duration || !decoded.length) throw new Error('empty');
      if (decoded.duration > MAX_DURATION + 0.01) {
        setWarning();
        showError('This tape is over the 10 minute limit. Trim it and try again.', 'duration_exceeded');
        setStatus('TAPE REJECTED / OVER 10 MINUTES.');
        return;
      }
      if (decoded.duration > LONG_AUDIO_SECONDS) warnings.push('LONG TAPE: processing and WAV export will take more time and memory.');
      if (decoded.duration > MOBILE_RECOMMENDED_SECONDS && matchMedia('(max-width: 900px), (pointer: coarse)').matches) {
        warnings.push('MOBILE NOTICE: 5 minutes or less is recommended.');
      }
      setWarning(warnings);
      stopActiveGraph();
      audioBuffer = decoded;
      lastWavBlob = null;
      originalPeaks = pan.audio.extractPeaks(decoded, 900);
      state.position = 0;
      state.dropoutSeed = 712337;
      el.empty.hidden = true; el.canvas.hidden = false; el.playhead.hidden = false;
      el.info.textContent = `${decoded.numberOfChannels === 1 ? 'MONO' : 'STEREO'} / ${Math.round(decoded.sampleRate / 1000)} KHZ / ${formatTime(decoded.duration)}`;
      setStatus('TAPE LOADED. PRESS PLAY.');
      updateTransport(); drawWaveform();
      track('audio_upload');
    } catch (error) {
      const possibleMemoryFailure = file.size > RECOMMENDED_FILE_SIZE ||
        error instanceof RangeError || /memory|alloc/i.test(String(error && error.message));
      showError(
        possibleMemoryFailure
          ? 'Not enough browser memory to decode this audio. Close other tabs or choose a shorter file.'
          : 'This audio could not be decoded in this browser. Try WAV or MP3.',
        possibleMemoryFailure ? 'decode_memory_failed' : 'decode_failed'
      );
      setStatus('DECODE FAILED.');
    } finally {
      setBusy(false); el.input.value = '';
    }
  }
  function bitCrushedBuffer(context) {
    if (state.settings.bitDepth === 16 && state.settings.sampleReduction === 1) return audioBuffer;
    const output = context.createBuffer(audioBuffer.numberOfChannels, audioBuffer.length, audioBuffer.sampleRate);
    const step = 2 ** (state.settings.bitDepth - 1);
    const reduction = Math.max(1, state.settings.sampleReduction);
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel += 1) {
      const input = audioBuffer.getChannelData(channel);
      const target = output.getChannelData(channel);
      let held = 0;
      for (let index = 0; index < input.length; index += 1) {
        if (index % reduction === 0) held = Math.round(input[index] * step) / step;
        target[index] = held;
      }
    }
    return output;
  }
  function downloadBlob(blob) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = 'the-pan-tape-machine.wav'; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
  }
  async function exportWav() {
    if (!audioBuffer || state.exporting || !OfflineAudioContextClass) return;
    state.exporting = true; el.export.disabled = true; el.export.textContent = 'RENDERING TAPE…';
    el.export.setAttribute('aria-busy', 'true'); setStatus('RENDERING DAMAGED WAV…');
    try {
      const offline = new OfflineAudioContextClass(audioBuffer.numberOfChannels, audioBuffer.length, audioBuffer.sampleRate);
      const source = offline.createBufferSource();
      source.buffer = bitCrushedBuffer(offline);
      const graph = buildGraph(offline, source, 0, true);
      source.start(0);
      const rendered = await offline.startRendering();
      lastWavBlob = pan.audio.encodeWav(rendered);
      graph.cleanup();
      downloadBlob(lastWavBlob);
      shareReturnFocus = el.export;
      el.shareStatus.textContent = 'DAMAGED WAV SAVED.';
      el.sharePanel.hidden = false; document.body.dataset.tapeDialogOpen = 'true'; el.share.focus();
      setStatus('TAPE RECOVERED / WAV READY.');
      track('audio_export');
    } catch (_) {
      showError('WAV export failed. Close other tabs, then try again.', 'export_failed');
      setStatus('EXPORT FAILED / READY TO RETRY.');
      track('audio_export_error', { error_type: 'export_failed' });
    } finally {
      state.exporting = false; el.export.disabled = false; el.export.textContent = 'EXPORT DAMAGED WAV'; el.export.removeAttribute('aria-busy');
    }
  }
  function closeShare() {
    el.sharePanel.hidden = true; document.body.removeAttribute('data-tape-dialog-open');
    if (shareReturnFocus) shareReturnFocus.focus();
  }
  async function copyCredit() {
    try { await navigator.clipboard.writeText(SHARE_TEXT); el.shareStatus.textContent = 'CREDIT COPIED.'; track('tape_credit_copy'); }
    catch (_) { el.shareStatus.textContent = `COPY THIS CREDIT: ${SHARE_TEXT}`; }
  }
  async function shareTape() {
    if (!lastWavBlob) return;
    const file = new File([lastWavBlob], 'the-pan-tape-machine.wav', { type: 'audio/wav' });
    try {
      if (navigator.share) {
        const data = navigator.canShare && navigator.canShare({ files: [file] }) ? { files: [file], text: SHARE_TEXT } : { text: SHARE_TEXT, url: 'https://tools.thepan.xyz/tape/' };
        await navigator.share(data); el.shareStatus.textContent = 'TAPE SHARED.'; track('tape_share');
      } else { await copyCredit(); el.shareStatus.textContent = 'SHARE UNAVAILABLE. CREDIT COPIED.'; track('tape_share'); }
    } catch (error) {
      if (error.name === 'AbortError') el.shareStatus.textContent = 'SHARE CANCELLED.';
      else { await copyCredit(); el.shareStatus.textContent = 'SHARE FAILED. CREDIT COPIED.'; }
    }
  }
  function seekFromPointer(event) {
    const rect = el.canvas.getBoundingClientRect();
    seekTo((event.clientX - rect.left) / rect.width * audioBuffer.duration, event.type === 'pointerup');
  }

  createPresetButtons(); restoreBankState(); syncControls(); updateTransport();
  el.input.addEventListener('change', event => loadAudio(event.target.files[0]));
  el.drop.addEventListener('click', () => { if (!audioBuffer) el.input.click(); });
  el.drop.addEventListener('keydown', event => {
    if (!audioBuffer && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); el.input.click(); }
  });
  ['dragenter', 'dragover'].forEach(type => el.drop.addEventListener(type, event => { event.preventDefault(); el.drop.classList.add('dragover'); }));
  ['dragleave', 'drop'].forEach(type => el.drop.addEventListener(type, event => { event.preventDefault(); el.drop.classList.remove('dragover'); }));
  el.drop.addEventListener('drop', event => loadAudio(event.dataTransfer.files[0]));
  el.play.addEventListener('click', () => {
    if (IS_IOS_WEBKIT && audioContext) pendingOutputActivation = realtimeOutput(audioContext);
    startPlayback();
  });
  el.pause.addEventListener('click', pausePlayback);
  el.stop.addEventListener('click', stopPlayback);
  el.modes.addEventListener('click', event => { const button = event.target.closest('[data-playback-mode]'); if (button) setPlaybackMode(button.dataset.playbackMode); });
  el.controls.forEach(input => input.addEventListener('input', () => {
    state.settings[input.id] = Number(input.value); state.activePreset = 'CUSTOM';
    syncControls(); scheduleGraphRebuild();
    clearTimeout(input.analyticsTimer);
    input.analyticsTimer = setTimeout(() => track('tape_effect_used', { effect_name: input.dataset.tapeEffect }), 400);
  }));
  el.banks.forEach(bank => bank.addEventListener('toggle', saveBankState));
  el.bankResets.forEach(button => button.addEventListener('click', () => resetBank(button.dataset.resetTapeBank)));
  el.surprise.addEventListener('click', surprise);
  el.reset.addEventListener('click', resetAll);
  el.export.addEventListener('click', exportWav);
  el.canvas.addEventListener('pointerdown', event => { if (!audioBuffer) return; seeking = true; el.canvas.setPointerCapture(event.pointerId); seekFromPointer(event); });
  el.canvas.addEventListener('pointermove', event => { if (seeking) seekFromPointer(event); });
  el.canvas.addEventListener('pointerup', event => { if (!seeking) return; seeking = false; seekFromPointer(event); });
  el.canvas.addEventListener('keydown', event => {
    if (!audioBuffer || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? audioBuffer.duration : currentPosition() + (event.key === 'ArrowLeft' ? -2 : 2);
    seekTo(next);
  });
  el.share.addEventListener('click', shareTape);
  el.credit.addEventListener('click', copyCredit);
  el.downloadAgain.addEventListener('click', () => { if (lastWavBlob) downloadBlob(lastWavBlob); });
  el.shareClose.addEventListener('click', closeShare);
  el.sharePanel.addEventListener('keydown', event => {
    const focusable = [...el.sharePanel.querySelectorAll('button:not([disabled])')];
    if (event.key === 'Escape') { event.preventDefault(); closeShare(); }
    else if (event.key === 'Tab' && focusable.length) {
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      const entry = entries[0];
      document.body.dataset.tapeActive = String(entry.isIntersecting && entry.boundingClientRect.bottom > Math.min(innerHeight * .45, 360));
    }, { threshold: [0, .05, .2] }).observe(el.drop.closest('.tape-machine'));
  } else document.body.dataset.tapeActive = 'true';
  window.addEventListener('resize', drawWaveform);
  window.addEventListener('pagehide', () => {
    stopActiveGraph();
    if (el.screenCaptureOutput) {
      el.screenCaptureOutput.pause();
      el.screenCaptureOutput.srcObject = null;
    }
    if (screenCaptureDestination) {
      screenCaptureDestination.stream.getTracks().forEach(track => track.stop());
      screenCaptureDestination = null;
    }
    if (audioContext && audioContext.state !== 'closed') audioContext.close();
    audioBuffer = null;
    originalPeaks = null;
  });
  document.querySelectorAll('[data-current-year]').forEach(node => { node.textContent = new Date().getFullYear(); });
}());
