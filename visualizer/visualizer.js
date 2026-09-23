'use strict';

(function liveVisualizer() {
  const pan = window.ThePan || {};
  const isCompact = window.matchMedia('(max-width: 800px)').matches
    || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvasCapture = HTMLCanvasElement.prototype.captureStream
    || HTMLCanvasElement.prototype.webkitCaptureStream;
  const maxRenderWidth = 1280;
  const maxPixels = 1280 * 720;
  const targetFrameTime = 1000 / 30;
  const conversionLimitSeconds = 30;
  const assetVersion = '20260730.7';

  const defaults = Object.freeze({
    rgbShift: 0,
    waveAmount: 0,
    feedbackAmount: 0,
    noiseAmount: 0,
    scanlineAmount: 0,
    glowAmount: 0,
    trackingAmount: 0,
    blockGlitch: 0,
    particleEnabled: false,
    particleAmount: 0,
    particleSize: 0,
    particleSpeed: 0,
    particleDrift: 0,
    particleGlow: 0,
    particleOpacity: 0,
    particleDepth: 0,
    particleColor: 'white',
    particleBlend: 'screen',
    particleBodyEnabled: false,
    bodyAmount: 0,
    bodySize: 0,
    bodyDepth: 0,
    bodySpread: 0,
    bodyDissolve: 0,
    bodyAttract: 0,
    bodyRebuild: 0,
    bodyMotion: 0,
    bodyEdge: 0,
    bodyDetail: 'auto',
    bodyColor: 'source',
    bodySubjectOnly: false
  });

  function makePreset(label, overrides = {}) {
    return Object.freeze({ ...defaults, label, particleFlow: 'float', ...overrides });
  }

  const presets = Object.freeze({
    clean: makePreset('NO EFFECT'),
    badTracking: makePreset('BAD TRACKING', {
      rgbShift: 26, waveAmount: 34, feedbackAmount: 12, noiseAmount: 36,
      scanlineAmount: 71, trackingAmount: 86, blockGlitch: 35
    }),
    vhsNight: makePreset('VHS NIGHT', {
      rgbShift: 18, waveAmount: 18, feedbackAmount: 34, noiseAmount: 29,
      scanlineAmount: 63, glowAmount: 7, trackingAmount: 54, blockGlitch: 12
    }),
    datamoshGhost: makePreset('DATAMOSH GHOST', {
      rgbShift: 13, waveAmount: 17, feedbackAmount: 88, noiseAmount: 7,
      scanlineAmount: 9, glowAmount: 8, trackingAmount: 20, blockGlitch: 68
    }),
    brokenCrt: makePreset('BROKEN CRT', {
      rgbShift: 39, waveAmount: 29, feedbackAmount: 57, noiseAmount: 53,
      scanlineAmount: 94, glowAmount: 12, trackingAmount: 69, blockGlitch: 43
    }),
    chromaBleed: makePreset('CHROMA BLEED', {
      rgbShift: 79, waveAmount: 7, feedbackAmount: 22, noiseAmount: 6,
      scanlineAmount: 24, glowAmount: 16, trackingAmount: 14, blockGlitch: 19
    }),
    tapeDropout: makePreset('TAPE DROPOUT', {
      rgbShift: 14, waveAmount: 23, feedbackAmount: 41, noiseAmount: 44,
      scanlineAmount: 58, trackingAmount: 77, blockGlitch: 61
    }),
    deadChannel: makePreset('DEAD CHANNEL', {
      rgbShift: 91, waveAmount: 83, feedbackAmount: 72, noiseAmount: 92,
      scanlineAmount: 81, glowAmount: 5, trackingAmount: 94, blockGlitch: 96
    }),
    bodyTransmission: makePreset('BODY TRANSMISSION', {
      rgbShift: 9, waveAmount: 7, feedbackAmount: 14, noiseAmount: 5,
      scanlineAmount: 12, glowAmount: 16, trackingAmount: 0, blockGlitch: 0,
      particleBodyEnabled: true, bodyAmount: 82, bodySize: 1.5, bodyDepth: 48,
      bodySpread: 12, bodyDissolve: 3, bodyAttract: 10, bodyRebuild: 86,
      bodyMotion: 48, bodyEdge: 82, bodyDetail: 'mid', bodyColor: 'source',
      bodySubjectOnly: false
    })
  });

  const el = {
    camera: document.querySelector('#cameraButton'),
    input: document.querySelector('#videoInput'),
    video: document.querySelector('#sourceVideo'),
    canvas: document.querySelector('#visualizerCanvas'),
    monitor: document.querySelector('#monitor'),
    shell: document.querySelector('#monitorShell'),
    empty: document.querySelector('#emptyState'),
    sourceBadge: document.querySelector('#sourceBadge'),
    status: document.querySelector('#visualizerStatus'),
    error: document.querySelector('#visualizerError'),
    fullscreen: document.querySelector('#fullscreenButton'),
    videoTransport: document.querySelector('#videoTransport'),
    videoPlayPause: document.querySelector('#videoPlayPause'),
    videoSeek: document.querySelector('#videoSeek'),
    videoCurrentTime: document.querySelector('#videoCurrentTime'),
    videoDuration: document.querySelector('#videoDuration'),
    sticky: document.querySelector('#stickyToggle'),
    returnPreview: document.querySelector('#returnPreviewButton'),
    pointerReticle: document.querySelector('#pointerReticle'),
    activePreset: document.querySelector('#activePreset'),
    presetButtons: [...document.querySelectorAll('[data-preset]')],
    reset: document.querySelector('#resetButton'),
    record: document.querySelector('#recordButton'),
    recordSupport: document.querySelector('#recordingSupport'),
    recordIndicator: document.querySelector('#recordingIndicator'),
    recordTime: document.querySelector('#recordingTime'),
    controls: [...document.querySelectorAll('.visualizer-controls input[type="range"]')],
    allSettingInputs: [...document.querySelectorAll('.visualizer-controls input, .visualizer-controls select')],
    particleEnabled: document.querySelector('#particleEnabled'),
    particleState: document.querySelector('#particleState'),
    particleToggleText: document.querySelector('#particleToggleText'),
    particleColor: document.querySelector('#particleColor'),
    particleBlend: document.querySelector('#particleBlend'),
    particleBodyEnabled: document.querySelector('#particleBodyEnabled'),
    particleBodyState: document.querySelector('#particleBodyState'),
    particleBodyToggleText: document.querySelector('#particleBodyToggleText'),
    bodyDetail: document.querySelector('#bodyDetail'),
    bodyColor: document.querySelector('#bodyColor'),
    bodySubjectOnly: document.querySelector('#bodySubjectOnly'),
    bodyPerformance: document.querySelector('#bodyPerformance'),
    exportPanel: document.querySelector('#exportPanel'),
    closeExport: document.querySelector('#closeExportButton'),
    recordingSummary: document.querySelector('#recordingSummary'),
    saveWebm: document.querySelector('#saveWebmButton'),
    saveMp4: document.querySelector('#saveMp4Button'),
    conversionPanel: document.querySelector('#conversionPanel'),
    conversionLabel: document.querySelector('#conversionLabel'),
    conversionPercent: document.querySelector('#conversionPercent'),
    conversionProgress: document.querySelector('#conversionProgress'),
    conversionWarning: document.querySelector('#conversionWarning'),
    cancelConversion: document.querySelector('#cancelConversionButton')
  };

  const outputContext = el.canvas.getContext('2d', { alpha: false, desynchronized: true });
  const stage = document.createElement('canvas');
  const stageContext = stage.getContext('2d', { alpha: false, willReadFrequently: true });
  const warped = document.createElement('canvas');
  const warpedContext = warped.getContext('2d', { alpha: false });
  const redChannel = document.createElement('canvas');
  const redContext = redChannel.getContext('2d');
  const cyanChannel = document.createElement('canvas');
  const cyanContext = cyanChannel.getContext('2d');
  const history = document.createElement('canvas');
  const historyContext = history.getContext('2d', { alpha: false });
  const bodySample = document.createElement('canvas');
  const bodySampleContext = bodySample.getContext('2d', { willReadFrequently: true });

  const state = {
    sourceReady: false,
    sourceKind: '',
    scrubbingVideo: false,
    stream: null,
    objectUrl: '',
    animationFrame: 0,
    lastFrameTime: 0,
    lastParticleTime: 0,
    hasHistory: false,
    pseudoFullscreen: false,
    stickyEnabled: true,
    activePreset: 'clean',
    particleFlow: 'float',
    particles: [],
    bodyDynamics: [],
    previousBodyLuma: null,
    pointer: { x: .5, y: .5, targetX: .5, targetY: .5, active: false },
    recorderProfile: null,
    recorder: null,
    recordingStream: null,
    recordingAudio: null,
    recordingChunks: [],
    recordingStartedAt: 0,
    recordingDuration: 0,
    recordingTimer: 0,
    lastRecording: null,
    lastRecordingUrl: '',
    lastRecordingExtension: '',
    ffmpeg: null,
    converting: false,
    conversionCancelled: false,
    fpsWindowStarted: 0,
    fpsFrameCount: 0,
    currentFps: 30,
    adaptiveBodyDetail: isCompact ? 'low' : 'mid',
    stableFpsWindows: 0,
    bodyEmergencyStep: 1,
    bodyFastFrames: 0,
    bodyRenderCost: 0
  };

  if (pan.analytics) pan.analytics.configure('live_visualizer', 'v1');

  function trackError(errorType) {
    if (pan.analytics) pan.analytics.track('tool_error', { error_type: errorType });
  }

  function setStatus(message) {
    el.status.textContent = message;
  }

  function showError(message, errorType) {
    el.error.textContent = message;
    el.error.hidden = false;
    trackError(errorType);
  }

  function clearError() {
    el.error.hidden = true;
    el.error.textContent = '';
  }

  function setting(id) {
    const control = document.querySelector(`#${id}`);
    return control ? Number(control.value) : 0;
  }

  function setControl(id, value) {
    const control = document.querySelector(`#${id}`);
    if (!control) return;
    if (control.type === 'checkbox') control.checked = Boolean(value);
    else control.value = String(value);
    if (control.type === 'range') updateRange(control);
  }

  function updateRange(control) {
    const minimum = Number(control.min || 0);
    const maximum = Number(control.max || 100);
    const value = Number(control.value);
    const fill = (value - minimum) / Math.max(1, maximum - minimum) * 100;
    control.style.setProperty('--fill', `${fill}%`);
    const output = control.closest('.control')?.querySelector('output');
    if (output) output.value = String(value);
  }

  function updateModeLabels() {
    const particleOn = el.particleEnabled.checked;
    el.particleState.textContent = particleOn ? 'ON' : 'OFF';
    el.particleToggleText.textContent = particleOn ? 'ENABLED' : 'DISABLED';
    const bodyOn = el.particleBodyEnabled.checked;
    el.particleBodyState.textContent = bodyOn ? 'ON' : 'OFF';
    el.particleBodyToggleText.textContent = bodyOn ? 'ENABLED' : 'DISABLED';
  }

  function markCustom() {
    state.activePreset = 'custom';
    el.activePreset.textContent = 'CUSTOM SIGNAL';
    for (const button of el.presetButtons) button.classList.remove('is-active');
    updateModeLabels();
  }

  function applyPreset(name, announce = true) {
    const preset = presets[name] || presets.clean;
    for (const key of Object.keys(defaults)) {
      if (!(key in preset)) continue;
      setControl(key, preset[key]);
    }
    state.particleFlow = preset.particleFlow || 'float';
    state.activePreset = name;
    state.hasHistory = false;
    state.previousBodyLuma = null;
    state.adaptiveBodyDetail = isCompact ? 'low' : 'mid';
    state.stableFpsWindows = 0;
    state.bodyEmergencyStep = 1;
    state.bodyFastFrames = 0;
    el.bodyPerformance.textContent = `${preset.bodyDetail.toUpperCase()} DETAIL / ${activeBodyDetail().toUpperCase()} / MEASURING FPS…`;
    updateModeLabels();
    el.activePreset.textContent = preset.label;
    for (const button of el.presetButtons) {
      button.classList.toggle('is-active', button.dataset.preset === name);
    }
    updatePointerUi();
    if (announce) {
      setStatus(state.sourceReady
        ? `${preset.label} / SIGNAL APPLIED.`
        : `${preset.label} / AWAITING SIGNAL.`);
    }
  }

  function noEffect() {
    applyPreset('clean');
  }

  function allEffectsOff() {
    return setting('rgbShift') === 0
      && setting('waveAmount') === 0
      && setting('feedbackAmount') === 0
      && setting('noiseAmount') === 0
      && setting('scanlineAmount') === 0
      && setting('glowAmount') === 0
      && setting('trackingAmount') === 0
      && setting('blockGlitch') === 0
      && !el.particleEnabled.checked
      && !el.particleBodyEnabled.checked;
  }

  function updatePointerUi() {
    const follows = setting('waveAmount') > 0
      || setting('glowAmount') > 0
      || (el.particleEnabled.checked && setting('particleAmount') > 0)
      || (el.particleBodyEnabled.checked && setting('bodyAttract') > 0);
    el.monitor.classList.toggle('has-pointer-fx', follows);
  }

  function stopCamera() {
    if (!state.stream) return;
    for (const track of state.stream.getTracks()) track.stop();
    state.stream = null;
  }

  function clearObjectUrl() {
    if (!state.objectUrl) return;
    URL.revokeObjectURL(state.objectUrl);
    state.objectUrl = '';
  }

  function stopSource() {
    stopCamera();
    clearObjectUrl();
    el.video.pause();
    el.video.srcObject = null;
    el.video.removeAttribute('src');
    el.video.load();
    state.sourceReady = false;
    state.sourceKind = '';
    state.scrubbingVideo = false;
    state.hasHistory = false;
    state.previousBodyLuma = null;
    updateVideoTransport(true);
  }

  function formatMediaTime(seconds) {
    const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const remainder = safeSeconds % 60;
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  }

  function updateVideoTransport(reset = false) {
    const isLocalVideo = state.sourceKind === 'video' && state.sourceReady;
    el.videoTransport.hidden = !isLocalVideo;
    if (!isLocalVideo || reset) {
      el.videoSeek.value = '0';
      el.videoSeek.max = '1';
      el.videoSeek.disabled = true;
      el.videoSeek.style.setProperty('--seek-fill', '0%');
      el.videoCurrentTime.value = '00:00';
      el.videoDuration.textContent = '00:00';
      el.videoPlayPause.textContent = 'PAUSE';
      el.videoPlayPause.setAttribute('aria-label', 'Pause local video');
      return;
    }

    const duration = el.video.duration;
    const hasDuration = Number.isFinite(duration) && duration > 0;
    const currentTime = hasDuration ? Math.min(el.video.currentTime || 0, duration) : 0;
    el.videoSeek.disabled = !hasDuration;
    el.videoSeek.max = hasDuration ? String(duration) : '1';
    if (!state.scrubbingVideo) el.videoSeek.value = String(currentTime);
    const seekValue = Number(el.videoSeek.value) || 0;
    const fill = hasDuration ? Math.min(100, Math.max(0, seekValue / duration * 100)) : 0;
    el.videoSeek.style.setProperty('--seek-fill', `${fill}%`);
    el.videoCurrentTime.value = formatMediaTime(seekValue);
    el.videoDuration.textContent = formatMediaTime(duration);
    const isPaused = el.video.paused;
    el.videoPlayPause.textContent = isPaused ? 'PLAY' : 'PAUSE';
    el.videoPlayPause.setAttribute('aria-label', `${isPaused ? 'Play' : 'Pause'} local video`);
  }

  function seekLocalVideo() {
    if (state.sourceKind !== 'video' || !Number.isFinite(el.video.duration)) return;
    const target = Math.min(el.video.duration, Math.max(0, Number(el.videoSeek.value) || 0));
    el.video.currentTime = target;
    state.hasHistory = false;
    state.previousBodyLuma = null;
    updateVideoTransport();
  }

  async function toggleLocalVideoPlayback() {
    if (state.sourceKind !== 'video') return;
    clearError();
    if (el.video.paused) {
      try {
        await el.video.play();
      } catch (_) {
        showError('This video could not resume. Tap the video control again.', 'video_resume_failed');
      }
    } else {
      el.video.pause();
    }
    updateVideoTransport();
  }

  function dimensionsFor(width, height) {
    const safeWidth = Math.max(2, width || 1280);
    const safeHeight = Math.max(2, height || 720);
    const scale = Math.min(1, maxRenderWidth / safeWidth, Math.sqrt(maxPixels / (safeWidth * safeHeight)));
    return {
      width: Math.max(2, Math.round(safeWidth * scale / 2) * 2),
      height: Math.max(2, Math.round(safeHeight * scale / 2) * 2)
    };
  }

  function sizeCanvases() {
    const size = dimensionsFor(el.video.videoWidth, el.video.videoHeight);
    for (const canvas of [el.canvas, stage, warped, redChannel, cyanChannel, history]) {
      canvas.width = size.width;
      canvas.height = size.height;
    }
    const sampleWidth = isCompact ? 96 : 104;
    bodySample.width = sampleWidth;
    bodySample.height = Math.max(40, Math.round(sampleWidth * size.height / size.width));
    for (const context of [outputContext, stageContext, warpedContext, historyContext]) {
      context.imageSmoothingEnabled = true;
    }
    el.shell.style.setProperty('--preview-aspect', `${size.width} / ${size.height}`);
    state.hasHistory = false;
    state.previousBodyLuma = null;
    state.bodyDynamics = [];
  }

  function updateSourceUi(kind) {
    state.sourceKind = kind;
    state.sourceReady = true;
    el.empty.hidden = true;
    el.sourceBadge.textContent = kind === 'camera' ? '● CAMERA LIVE' : '● LOCAL VIDEO';
    el.sourceBadge.classList.add('is-available');
    el.fullscreen.disabled = false;
    el.record.disabled = !state.recorderProfile;
    updateVideoTransport();
    setStatus(allEffectsOff()
      ? 'NO EFFECT / ORIGINAL SIGNAL.'
      : `${el.activePreset.textContent} / SIGNAL LOCKED.`);
  }

  async function activateSource(kind) {
    await el.video.play();
    sizeCanvases();
    updateSourceUi(kind);
    startRendering();
  }

  function cameraErrorMessage(error) {
    if (!window.isSecureContext) return 'Camera access needs HTTPS or localhost.';
    if (error && ['NotAllowedError', 'PermissionDeniedError'].includes(error.name)) {
      return 'Camera permission was denied. Allow access or load a local video.';
    }
    if (error && ['NotFoundError', 'DevicesNotFoundError'].includes(error.name)) {
      return 'No camera was found on this device.';
    }
    if (error && ['NotReadableError', 'TrackStartError'].includes(error.name)) {
      return 'The camera is already in use by another app.';
    }
    return 'The camera could not start. Check browser permissions or load a local video.';
  }

  async function startCamera() {
    clearError();
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      showError('This browser does not expose camera access. Load a local video instead.', 'camera_unsupported');
      return;
    }
    el.camera.disabled = true;
    el.monitor.setAttribute('aria-busy', 'true');
    setStatus('REQUESTING 720P CAMERA / 30 FPS…');
    stopSource();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280, max: 1280 },
          height: { ideal: 720, max: 720 },
          frameRate: { ideal: 30, max: 30 }
        }
      });
      state.stream = stream;
      el.video.loop = false;
      el.video.srcObject = stream;
      await activateSource('camera');
    } catch (error) {
      stopSource();
      showError(cameraErrorMessage(error), 'camera_failed');
      setStatus('CAMERA SIGNAL NOT AVAILABLE.');
    } finally {
      el.camera.disabled = false;
      el.monitor.setAttribute('aria-busy', 'false');
    }
  }

  async function loadVideo(file) {
    if (!file) return;
    clearError();
    if (!file.type.startsWith('video/')) {
      showError('Choose a video file supported by this browser.', 'video_type_invalid');
      el.input.value = '';
      return;
    }
    el.monitor.setAttribute('aria-busy', 'true');
    setStatus('DECODING LOCAL VIDEO…');
    stopSource();
    try {
      state.objectUrl = URL.createObjectURL(file);
      el.video.loop = true;
      el.video.src = state.objectUrl;
      await activateSource('video');
    } catch (_) {
      stopSource();
      showError('This video could not be played. Try MP4, WebM, or another browser-supported file.', 'video_decode_failed');
      setStatus('LOCAL VIDEO SIGNAL FAILED.');
    } finally {
      el.input.value = '';
      el.monitor.setAttribute('aria-busy', 'false');
    }
  }

  function createParticles() {
    const total = isCompact ? 140 : 180;
    state.particles = Array.from({ length: total }, (_, index) => ({
      x: Math.random(),
      y: Math.random(),
      vx: 0,
      vy: 0,
      depth: .15 + Math.random() * .85,
      phase: Math.random() * Math.PI * 2,
      wobble: .55 + Math.random() * 1.5,
      shape: index % 17 === 0 ? 'star' : 'dot'
    }));
  }

  function drawWarpedFrame(time) {
    const width = stage.width;
    const height = stage.height;
    stageContext.globalCompositeOperation = 'source-over';
    stageContext.globalAlpha = 1;
    stageContext.setTransform(1, 0, 0, 1, 0, 0);
    stageContext.drawImage(el.video, 0, 0, width, height);
    warpedContext.clearRect(0, 0, width, height);
    const strength = setting('waveAmount') / 100;
    if (!strength) {
      warpedContext.drawImage(stage, 0, 0);
      return;
    }
    const stripHeight = Math.max(2, Math.round(height / (isCompact ? 110 : 170)));
    const maxShift = .35 + Math.pow(strength, 1.35) * width * .075;
    const centerY = state.pointer.y * height;
    for (let y = 0; y < height; y += stripHeight) {
      const distance = Math.abs(y - centerY) / height;
      const focus = .32 + Math.max(0, 1 - distance * 2.2) * .68;
      const phase = y * (.024 + strength * .018) + time * (.0015 + strength * .0036);
      let offset = (Math.sin(phase) + Math.sin(phase * .31) * .43) * maxShift * focus;
      if (strength > .58 && Math.sin(y * .071 + time * .008) > .91) {
        offset += Math.sin(time * .019 + y) * maxShift * 1.8;
      }
      warpedContext.drawImage(stage, 0, y, width, stripHeight, offset, y, width, stripHeight);
    }
  }

  function drawTrackedBase(width, height, time, alpha) {
    const strength = setting('trackingAmount') / 100;
    outputContext.save();
    outputContext.globalAlpha = alpha;
    if (!strength) {
      outputContext.drawImage(warped, 0, 0);
      outputContext.restore();
      return;
    }
    const horizontalJitter = Math.sin(time * .0091) * strength * width * .006;
    const slowRoll = strength > .58
      ? ((time * (.018 + strength * .035)) % height) * strength * .34
      : Math.sin(time * .0014) * height * strength * .008;
    const roll = Math.round(slowRoll);
    outputContext.drawImage(warped, horizontalJitter, roll, width, height);
    if (roll > 0) outputContext.drawImage(warped, horizontalJitter, roll - height, width, height);
    if (roll < 0) outputContext.drawImage(warped, horizontalJitter, roll + height, width, height);

    const bands = 1 + Math.round(strength * 7);
    for (let index = 0; index < bands; index += 1) {
      const phase = time * (.0037 + index * .00031) + index * 17.31;
      const y = Math.floor((Math.sin(phase) * .5 + .5) * height);
      const bandHeight = Math.max(2, Math.round(2 + strength * height * (.008 + (index % 3) * .006)));
      const shift = Math.sin(phase * 2.7) * strength * width * (.015 + (index % 4) * .012);
      outputContext.globalAlpha = alpha * (.42 + strength * .55);
      outputContext.drawImage(warped, 0, y, width, bandHeight, shift, y, width, bandHeight);
    }
    if (strength > .35) {
      const headY = Math.floor((time * (.04 + strength * .11)) % (height + 60)) - 30;
      const gradient = outputContext.createLinearGradient(0, headY - 24, 0, headY + 24);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(.5, `rgba(0,0,0,${strength * .52})`);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      outputContext.globalAlpha = 1;
      outputContext.fillStyle = gradient;
      outputContext.fillRect(0, headY - 24, width, 48);
    }
    outputContext.restore();
  }

  function drawBlockGlitch(width, height, time) {
    const strength = setting('blockGlitch') / 100;
    if (!strength) return;
    const burst = Math.sin(time * .0127) * .5 + .5;
    if (burst < .78 - strength * .64) return;
    const blocks = 1 + Math.round(strength * (isCompact ? 10 : 16));
    outputContext.save();
    for (let index = 0; index < blocks; index += 1) {
      const seed = Math.abs(Math.sin(time * .00091 + index * 78.233));
      const sourceX = Math.floor(seed * width * .72);
      const sourceY = Math.floor(Math.abs(Math.sin(time * .0017 + index * 19.7)) * height);
      const blockWidth = Math.max(12, Math.floor(width * (.04 + strength * (.05 + (index % 4) * .028))));
      const blockHeight = Math.max(2, Math.floor(height * (.006 + strength * (.009 + (index % 3) * .013))));
      const shift = Math.sin(time * .0043 + index * 4.2) * width * strength * .16;
      outputContext.globalAlpha = .28 + strength * .7;
      outputContext.drawImage(
        warped,
        sourceX, sourceY, Math.min(blockWidth, width - sourceX), Math.min(blockHeight, height - sourceY),
        sourceX + shift, sourceY, Math.min(blockWidth, width - sourceX), Math.min(blockHeight, height - sourceY)
      );
    }
    outputContext.globalCompositeOperation = 'screen';
    outputContext.globalAlpha = strength * .16;
    outputContext.fillStyle = strength > .68 ? '#42e9dc' : '#f4efda';
    outputContext.fillRect(0, Math.floor(burst * height), width, Math.max(1, strength * 4));
    outputContext.restore();
  }

  function tint(source, context, color) {
    context.clearRect(0, 0, source.width, source.height);
    context.globalCompositeOperation = 'source-over';
    context.globalAlpha = 1;
    context.drawImage(source, 0, 0);
    context.globalCompositeOperation = 'source-atop';
    context.fillStyle = color;
    context.fillRect(0, 0, source.width, source.height);
    context.globalCompositeOperation = 'source-over';
  }

  function drawRgb(width, time) {
    const strength = setting('rgbShift') / 100;
    if (!strength) return;
    const offset = .3 + Math.pow(strength, 1.4) * width * .045;
    const vertical = Math.sin(time * .0017) * offset * .24;
    tint(warped, redContext, '#ff174f');
    tint(warped, cyanContext, '#00e9ff');
    outputContext.save();
    outputContext.globalCompositeOperation = 'screen';
    outputContext.globalAlpha = .08 + strength * .4;
    outputContext.drawImage(redChannel, -offset, vertical);
    outputContext.drawImage(cyanChannel, offset, -vertical);
    if (strength > .5) {
      outputContext.globalAlpha = strength * .23;
      const tearY = (time * .19) % el.canvas.height;
      const tearHeight = Math.max(2, el.canvas.height * .018 * strength);
      outputContext.drawImage(redChannel, 0, tearY, width, tearHeight, offset * 2.4, tearY, width, tearHeight);
    }
    outputContext.restore();
  }

  function drawNoise(width, height, amount, time) {
    if (!amount) return;
    const strength = amount / 100;
    const specks = Math.round(8 + strength * (isCompact ? 260 : 460));
    outputContext.save();
    outputContext.globalCompositeOperation = 'screen';
    for (let index = 0; index < specks; index += 1) {
      const random = Math.random();
      outputContext.globalAlpha = .025 + strength * random * .48;
      outputContext.fillStyle = random > .9 ? '#ff70d5' : random > .75 ? '#a8ff00' : '#f4efda';
      const size = random > .97 ? 2 + strength * 3 : 1;
      outputContext.fillRect(Math.random() * width, Math.random() * height, size, size);
    }
    if (strength > .34 && Math.sin(time * .0097) > 1 - strength * .26) {
      const y = Math.random() * height;
      outputContext.globalAlpha = .08 + strength * .25;
      outputContext.fillStyle = '#f4efda';
      outputContext.fillRect(0, y, width, 1 + strength * 6);
    }
    outputContext.restore();
  }

  function drawCrt(width, height, amount) {
    if (!amount) return;
    const strength = amount / 100;
    outputContext.save();
    outputContext.globalCompositeOperation = 'multiply';
    outputContext.globalAlpha = .05 + strength * .34;
    outputContext.fillStyle = '#000';
    const gap = strength > .62 ? 3 : 4;
    for (let y = 1; y < height; y += gap) outputContext.fillRect(0, y, width, 1);
    const vignette = outputContext.createRadialGradient(
      width * .5, height * .48, Math.min(width, height) * .14,
      width * .5, height * .5, Math.max(width, height) * .68
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, `rgba(0,0,0,${.2 + strength * .72})`);
    outputContext.globalAlpha = 1;
    outputContext.fillStyle = vignette;
    outputContext.fillRect(0, 0, width, height);
    outputContext.restore();
  }

  function drawPointerGlow(width, height, amount) {
    if (!amount) return;
    const strength = amount / 100;
    const x = state.pointer.x * width;
    const y = state.pointer.y * height;
    const radius = Math.min(width, height) * (.11 + strength * .48);
    const gradient = outputContext.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(168,255,0,${.09 + strength * .23})`);
    gradient.addColorStop(.35, `rgba(66,233,220,${strength * .13})`);
    gradient.addColorStop(1, 'rgba(138,92,255,0)');
    outputContext.save();
    outputContext.globalCompositeOperation = 'screen';
    outputContext.fillStyle = gradient;
    outputContext.fillRect(0, 0, width, height);
    outputContext.restore();
  }

  function particlePalette(name) {
    if (name === 'lime') return ['#a8ff00', '#efffc9', '#68d700'];
    if (name === 'purple') return ['#8a5cff', '#d1c2ff', '#b884ff'];
    if (name === 'pink') return ['#ff70d5', '#ffd0f1', '#ff3cab'];
    return ['#f4efda', '#ffffff', '#c9d8db'];
  }

  function sampleVideoColor(x, y) {
    const px = Math.max(0, Math.min(stage.width - 1, Math.round(x * stage.width)));
    const py = Math.max(0, Math.min(stage.height - 1, Math.round(y * stage.height)));
    try {
      const pixel = stageContext.getImageData(px, py, 1, 1).data;
      return `rgb(${pixel[0]},${pixel[1]},${pixel[2]})`;
    } catch (_) {
      return '#f4efda';
    }
  }

  function drawParticles(width, height, time, delta) {
    if (!el.particleEnabled.checked) return;
    const amount = Math.min(state.particles.length, Math.round(setting('particleAmount')));
    if (!amount) return;
    const speed = setting('particleSpeed') / 100;
    const drift = setting('particleDrift') / 100;
    const baseSize = setting('particleSize');
    const glow = setting('particleGlow') / 100;
    const opacity = setting('particleOpacity') / 100;
    const depthAmount = setting('particleDepth') / 100;
    const palette = particlePalette(el.particleColor.value);
    const pointerX = state.pointer.x;
    const pointerY = state.pointer.y;
    outputContext.save();
    outputContext.globalCompositeOperation = el.particleBlend.value;
    for (let index = 0; index < amount; index += 1) {
      const particle = state.particles[index];
      const depth = .35 + particle.depth * (.25 + depthAmount * .75);
      const swirl = Math.sin(time * (.00018 + speed * .00032) * particle.wobble + particle.phase);
      particle.vx += swirl * drift * .000018;
      particle.vy -= (.0008 + speed * .006) * depth;
      if (state.pointer.active) {
        const dx = pointerX - particle.x;
        const dy = pointerY - particle.y;
        const distance = Math.max(.03, Math.sqrt(dx * dx + dy * dy));
        const pull = (state.particleFlow === 'beam' ? .009 : .0026) * depthAmount / distance;
        particle.vx += dx * pull * delta;
        particle.vy += dy * pull * delta;
      }
      if (state.particleFlow === 'flicker') {
        particle.vx += (Math.random() - .5) * speed * .0007;
        particle.vy += (Math.random() - .5) * speed * .0006;
      }
      particle.vx *= .965;
      particle.vy *= .965;
      particle.x += particle.vx * delta * 60;
      particle.y += particle.vy * delta * 60;
      if (particle.y < -.07) particle.y = 1.07;
      if (particle.y > 1.07) particle.y = -.07;
      if (particle.x < -.07) particle.x = 1.07;
      if (particle.x > 1.07) particle.x = -.07;
      const parallax = (particle.depth - .5) * depthAmount;
      const x = particle.x * width + (state.pointer.x - .5) * parallax * width * .06;
      const y = particle.y * height + (state.pointer.y - .5) * parallax * height * .06;
      const radius = Math.max(.35, baseSize * (.35 + particle.depth * (1 + depthAmount)));
      const color = el.particleColor.value === 'source'
        ? sampleVideoColor(particle.x, particle.y)
        : palette[index % palette.length];
      if (glow > 0) {
        outputContext.globalAlpha = opacity * glow * .16;
        outputContext.fillStyle = color;
        outputContext.beginPath();
        outputContext.arc(x, y, radius * (2 + glow * 3.5), 0, Math.PI * 2);
        outputContext.fill();
      }
      outputContext.globalAlpha = opacity * (.38 + particle.depth * .62);
      outputContext.fillStyle = color;
      if (particle.shape === 'star' && radius > 1) {
        outputContext.fillRect(x - radius * 2.2, y - radius * .3, radius * 4.4, radius * .6);
        outputContext.fillRect(x - radius * .3, y - radius * 2.2, radius * .6, radius * 4.4);
      } else {
        outputContext.beginPath();
        outputContext.arc(x, y, radius, 0, Math.PI * 2);
        outputContext.fill();
      }
    }
    outputContext.restore();
  }

  function bodyTint(name) {
    if (name === 'lime') return [168, 255, 0];
    if (name === 'purple') return [138, 92, 255];
    if (name === 'pink') return [255, 112, 213];
    if (name === 'white') return [244, 239, 218];
    return null;
  }

  function activeBodyDetail() {
    const selected = el.bodyDetail.value;
    return selected === 'auto' ? state.adaptiveBodyDetail : selected;
  }

  function bodyDetailStep() {
    const detail = activeBodyDetail();
    let requestedStep = 2;
    if (detail === 'high') requestedStep = 1;
    if (detail === 'low') requestedStep = 3;
    return Math.max(requestedStep, state.bodyEmergencyStep);
  }

  function updatePerformance(time) {
    if (!state.fpsWindowStarted) state.fpsWindowStarted = time;
    state.fpsFrameCount += 1;
    const elapsed = time - state.fpsWindowStarted;
    if (elapsed < 1000) return;
    state.currentFps = Math.round(state.fpsFrameCount * 1000 / elapsed);
    state.fpsFrameCount = 0;
    state.fpsWindowStarted = time;
    if (el.bodyDetail.value === 'auto' && el.particleBodyEnabled.checked) {
      if (state.currentFps < 22) {
        state.adaptiveBodyDetail = 'low';
        state.stableFpsWindows = 0;
      } else if (isCompact) {
        state.stableFpsWindows += 1;
        if (state.currentFps >= 28 && state.stableFpsWindows >= 3) {
          state.adaptiveBodyDetail = 'mid';
        }
      } else if (state.currentFps < 27) {
        state.adaptiveBodyDetail = 'mid';
        state.stableFpsWindows = 0;
      } else {
        state.stableFpsWindows += 1;
        if (state.stableFpsWindows >= 3) state.adaptiveBodyDetail = 'high';
      }
    }
    const selected = el.bodyDetail.value.toUpperCase();
    const active = activeBodyDetail().toUpperCase();
    const safety = state.bodyEmergencyStep > 1 ? ` / LOAD SAFE ×${state.bodyEmergencyStep}` : '';
    el.bodyPerformance.textContent = `${selected} DETAIL / ${active} / ${state.currentFps} FPS${safety}`;
    el.bodyPerformance.classList.toggle('is-throttled', el.bodyDetail.value === 'auto' && active === 'LOW');
  }

  function drawParticleBody(width, height, time, delta) {
    if (!el.particleBodyEnabled.checked || setting('bodyAmount') <= 0) return;
    const renderStarted = performance.now();
    const amount = setting('bodyAmount') / 100;
    const baseSize = setting('bodySize');
    const depthStrength = setting('bodyDepth') / 100;
    const spread = setting('bodySpread') / 100;
    const dissolve = setting('bodyDissolve') / 100;
    const attract = setting('bodyAttract') / 100;
    const rebuild = .04 + setting('bodyRebuild') / 100 * .23;
    const motionReaction = setting('bodyMotion') / 100;
    const edgeEmphasis = setting('bodyEdge') / 100;
    const subjectOnly = el.bodySubjectOnly.checked;
    const step = bodyDetailStep();
    const detail = activeBodyDetail();
    const mobileHighCap = isCompact && detail === 'high' ? .64 : 1;
    bodySampleContext.drawImage(warped, 0, 0, bodySample.width, bodySample.height);
    const frame = bodySampleContext.getImageData(0, 0, bodySample.width, bodySample.height);
    const pixels = frame.data;
    const luma = new Float32Array(bodySample.width * bodySample.height);
    let edgeLuma = 0;
    let edgeCount = 0;
    for (let y = 0; y < bodySample.height; y += 1) {
      for (let x = 0; x < bodySample.width; x += 1) {
        const index = y * bodySample.width + x;
        const offset = index * 4;
        luma[index] = pixels[offset] * .2126 + pixels[offset + 1] * .7152 + pixels[offset + 2] * .0722;
        if (x < 3 || y < 3 || x >= bodySample.width - 3 || y >= bodySample.height - 3) {
          edgeLuma += luma[index];
          edgeCount += 1;
        }
      }
    }
    const background = edgeLuma / Math.max(1, edgeCount);
    outputContext.save();
    outputContext.globalCompositeOperation = 'screen';
    const tint = bodyTint(el.bodyColor.value);
    let dynamicsIndex = 0;
    for (let sy = 0; sy < bodySample.height; sy += step) {
      for (let sx = 0; sx < bodySample.width; sx += step) {
        const sampleIndex = sy * bodySample.width + sx;
        const pixelOffset = sampleIndex * 4;
        const normalizedX = sx / bodySample.width;
        const normalizedY = sy / bodySample.height;
        const centerDistance = Math.hypot(normalizedX - .5, normalizedY - .5);
        const left = luma[sy * bodySample.width + Math.max(0, sx - 1)];
        const right = luma[sy * bodySample.width + Math.min(bodySample.width - 1, sx + 1)];
        const up = luma[Math.max(0, sy - 1) * bodySample.width + sx];
        const down = luma[Math.min(bodySample.height - 1, sy + 1) * bodySample.width + sx];
        const edge = Math.min(100, Math.abs(right - left) + Math.abs(down - up));
        const foregroundScore = Math.abs(luma[sampleIndex] - background)
          + Math.max(0, .62 - centerDistance) * 36
          + edge * edgeEmphasis * .72;
        if (subjectOnly && foregroundScore < 19 + (1 - edgeEmphasis) * 9) continue;
        const stableNoise = ((sampleIndex * 9301 + 49297) % 233280) / 233280;
        const keepChance = Math.min(mobileHighCap, amount * (.82 + edgeEmphasis * Math.min(1, edge / 32) * .28));
        if (stableNoise > keepChance) continue;
        if (stableNoise < dissolve * .72) continue;
        let particle = state.bodyDynamics[dynamicsIndex];
        if (!particle) {
          particle = {
            x: normalizedX, y: normalizedY, z: stableNoise - .5,
            vx: 0, vy: 0, phase: stableNoise * Math.PI * 2
          };
          state.bodyDynamics[dynamicsIndex] = particle;
        }
        dynamicsIndex += 1;
        const previous = state.previousBodyLuma ? state.previousBodyLuma[sampleIndex] : luma[sampleIndex];
        const motion = Math.min(1, Math.abs(luma[sampleIndex] - previous) / 48) * motionReaction;
        const randomAngle = particle.phase + time * .0007;
        particle.vx += Math.cos(randomAngle) * (spread * .003 + motion * .022);
        particle.vy += Math.sin(randomAngle) * (spread * .003 + motion * .022);
        if (state.pointer.active && attract > 0) {
          particle.vx += (state.pointer.x - particle.x) * attract * .012;
          particle.vy += (state.pointer.y - particle.y) * attract * .012;
        }
        particle.vx += (normalizedX - particle.x) * rebuild;
        particle.vy += (normalizedY - particle.y) * rebuild;
        particle.vx *= .82;
        particle.vy *= .82;
        particle.x += particle.vx * Math.min(1.6, delta * 60);
        particle.y += particle.vy * Math.min(1.6, delta * 60);
        particle.z = Math.sin(time * .0012 + particle.phase) * depthStrength * .5 + motion * depthStrength;
        const perspective = 1 + particle.z * .42;
        const x = (particle.x - .5) * perspective * width + width * .5;
        const y = (particle.y - .5) * perspective * height + height * .5;
        const radius = Math.max(.38, baseSize * (1 + particle.z * .85) * (1 + edgeEmphasis * Math.min(1, edge / 70) * .22));
        const color = tint || [pixels[pixelOffset], pixels[pixelOffset + 1], pixels[pixelOffset + 2]];
        outputContext.globalAlpha = Math.min(1, .34 + amount * .62 + edgeEmphasis * Math.min(1, edge / 80) * .14) * (1 - dissolve * .35);
        outputContext.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
        if (depthStrength > .35 && detail === 'low' && dynamicsIndex < 90) {
          outputContext.shadowColor = outputContext.fillStyle;
          outputContext.shadowBlur = radius * depthStrength * 2.8;
        }
        if (radius <= 1.15 || detail !== 'low') {
          const diameter = Math.max(1, radius * 1.65);
          outputContext.fillRect(x - diameter / 2, y - diameter / 2, diameter, diameter);
        } else {
          outputContext.beginPath();
          outputContext.arc(x, y, radius, 0, Math.PI * 2);
          outputContext.fill();
        }
        outputContext.shadowBlur = 0;
      }
    }
    state.bodyDynamics.length = dynamicsIndex;
    state.previousBodyLuma = luma;
    outputContext.restore();
    state.bodyRenderCost = performance.now() - renderStarted;
    if (state.bodyRenderCost > 22) {
      state.bodyEmergencyStep = Math.min(4, Math.max(state.bodyEmergencyStep + 1, step + 1));
      state.bodyFastFrames = 0;
    } else if (state.bodyRenderCost < 11) {
      state.bodyFastFrames += 1;
      if (state.bodyFastFrames > 90 && state.bodyEmergencyStep > 1) {
        state.bodyEmergencyStep -= 1;
        state.bodyFastFrames = 0;
      }
    } else {
      state.bodyFastFrames = 0;
    }
  }

  function renderFrame(time) {
    state.animationFrame = requestAnimationFrame(renderFrame);
    if (!state.sourceReady || el.video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
    if (time - state.lastFrameTime < targetFrameTime) return;
    const delta = state.lastParticleTime ? Math.min(.05, (time - state.lastParticleTime) / 1000) : 0;
    state.lastParticleTime = time;
    state.lastFrameTime = time;
    updatePerformance(time);
    state.pointer.x += (state.pointer.targetX - state.pointer.x) * .16;
    state.pointer.y += (state.pointer.targetY - state.pointer.y) * .16;
    const width = el.canvas.width;
    const height = el.canvas.height;
    drawWarpedFrame(time);
    outputContext.save();
    outputContext.setTransform(1, 0, 0, 1, 0, 0);
    outputContext.globalCompositeOperation = 'source-over';
    outputContext.globalAlpha = 1;
    outputContext.fillStyle = '#000';
    outputContext.fillRect(0, 0, width, height);

    const feedback = setting('feedbackAmount') / 100;
    if (state.hasHistory && feedback > 0) {
      const scale = 1 + Math.pow(feedback, 1.4) * .035;
      const historyWidth = width * scale;
      const historyHeight = height * scale;
      const focusX = (state.pointer.x - .5) * feedback * width * .026;
      const focusY = (state.pointer.y - .5) * feedback * height * .026;
      outputContext.globalAlpha = .07 + feedback * .86;
      outputContext.drawImage(
        history,
        (width - historyWidth) / 2 + focusX + Math.sin(time * .0013) * feedback * 3,
        (height - historyHeight) / 2 + focusY,
        historyWidth,
        historyHeight
      );
    }

    const bodyEnabled = el.particleBodyEnabled.checked && setting('bodyAmount') > 0;
    const baseAlpha = bodyEnabled ? .08 + (1 - setting('bodyAmount') / 100) * .28 : (feedback ? .72 : 1);
    drawTrackedBase(width, height, time, baseAlpha);
    outputContext.globalAlpha = 1;
    drawBlockGlitch(width, height, time);
    drawRgb(width, time);
    drawPointerGlow(width, height, setting('glowAmount'));
    drawNoise(width, height, setting('noiseAmount'), time);
    drawParticleBody(width, height, time, delta);
    drawParticles(width, height, time, delta);
    drawCrt(width, height, setting('scanlineAmount'));
    outputContext.restore();

    historyContext.globalCompositeOperation = 'source-over';
    historyContext.globalAlpha = 1;
    historyContext.drawImage(el.canvas, 0, 0);
    state.hasHistory = !allEffectsOff();
  }

  function startRendering() {
    if (state.animationFrame) return;
    state.lastFrameTime = 0;
    state.lastParticleTime = 0;
    state.animationFrame = requestAnimationFrame(renderFrame);
  }

  function updatePointer(event) {
    const rect = el.monitor.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    state.pointer.targetX = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    state.pointer.targetY = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    state.pointer.active = true;
    el.pointerReticle.style.left = `${state.pointer.targetX * 100}%`;
    el.pointerReticle.style.top = `${state.pointer.targetY * 100}%`;
  }

  function findWebmProfile() {
    if (!window.MediaRecorder || !canvasCapture) return null;
    const supports = type => typeof MediaRecorder.isTypeSupported !== 'function'
      ? type === 'video/webm'
      : MediaRecorder.isTypeSupported(type);
    const webmCandidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm'
    ];
    const webmMime = webmCandidates.find(supports);
    return webmMime ? { mime: webmMime, extension: 'webm', directMp4: false } : null;
  }

  function findRecorderProfile() {
    if (!window.MediaRecorder || !canvasCapture) return null;
    const supports = type => typeof MediaRecorder.isTypeSupported !== 'function'
      ? false
      : MediaRecorder.isTypeSupported(type);
    const mp4Candidates = [
      'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
      'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
      'video/mp4;codecs=h264,aac',
      'video/mp4'
    ];
    const mp4Mime = mp4Candidates.find(supports);
    if (mp4Mime) return { mime: mp4Mime, extension: 'mp4', directMp4: true };
    return findWebmProfile();
  }

  function updateRecorderSupport() {
    state.recorderProfile = findRecorderProfile();
    if (!state.recorderProfile) {
      el.recordSupport.textContent = '○ LOCAL RECORDING IS NOT AVAILABLE. LIVE EFFECTS AND FULLSCREEN STILL WORK.';
      el.recordSupport.className = 'recording-support is-unsupported';
      el.record.disabled = true;
      return;
    }
    if (state.recorderProfile.directMp4) {
      el.recordSupport.textContent = '● DIRECT MP4 READY / H.264 + AAC REQUESTED / 720P 30 FPS';
    } else {
      el.recordSupport.textContent = '● WEBM READY / OPTIONAL LOCAL MP4 CONVERSION UP TO 30 SEC';
    }
    el.recordSupport.className = 'recording-support is-supported';
    el.record.disabled = !state.sourceReady;
  }

  function timestampFilename(extension) {
    const now = new Date();
    const date = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0')
    ].join('');
    const time = [
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0')
    ].join('');
    return `the-pan-visualizer-${date}-${time}.${extension}`;
  }

  function downloadBlob(blob, extension) {
    if (state.lastRecordingUrl) URL.revokeObjectURL(state.lastRecordingUrl);
    state.lastRecordingUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = state.lastRecordingUrl;
    link.download = timestampFilename(extension);
    document.body.append(link);
    link.click();
    link.remove();
  }

  async function createSilentAudioTrack() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    const context = new AudioContextClass();
    await context.resume();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const destination = context.createMediaStreamDestination();
    gain.gain.value = 0;
    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start();
    return {
      context,
      oscillator,
      track: destination.stream.getAudioTracks()[0]
    };
  }

  async function createRecordingStream() {
    const stream = canvasCapture.call(el.canvas, 30);
    try {
      state.recordingAudio = await createSilentAudioTrack();
      if (state.recordingAudio?.track) stream.addTrack(state.recordingAudio.track);
    } catch (_) {
      state.recordingAudio = null;
    }
    return stream;
  }

  function stopRecordingResources() {
    for (const track of state.recordingStream ? state.recordingStream.getTracks() : []) track.stop();
    state.recordingStream = null;
    if (state.recordingAudio) {
      try { state.recordingAudio.oscillator.stop(); } catch (_) {}
      state.recordingAudio.context.close().catch(() => {});
      state.recordingAudio = null;
    }
  }

  function updateRecordingClock() {
    const elapsed = Math.max(0, Math.floor((Date.now() - state.recordingStartedAt) / 1000));
    const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const seconds = String(elapsed % 60).padStart(2, '0');
    el.recordTime.textContent = `${minutes}:${seconds}`;
  }

  function openExportPanel() {
    const duration = state.recordingDuration.toFixed(1);
    const sizeMb = (state.lastRecording.size / 1024 / 1024).toFixed(1);
    const direct = state.lastRecordingExtension === 'mp4';
    el.recordingSummary.textContent = `${duration} SEC / ${sizeMb} MB / ${direct ? 'DIRECT MP4' : 'ORIGINAL WEBM'}`;
    el.saveWebm.disabled = direct;
    el.saveWebm.innerHTML = direct
      ? 'WEBM保存不可<small>DIRECT MP4 WAS RECORDED</small>'
      : 'WEBM保存<small>ORIGINAL RECORDING</small>';
    el.saveMp4.innerHTML = direct
      ? 'MP4保存<small>H.264 / AAC REQUESTED</small>'
      : 'MP4変換して保存<small>H.264 VIDEO / AAC AUDIO</small>';
    el.conversionPanel.hidden = true;
    el.conversionWarning.textContent = direct
      ? 'This browser recorded MP4 directly. No conversion or server processing is needed.'
      : state.recordingDuration > conversionLimitSeconds
        ? 'MP4 conversion is limited to 30 seconds. Save the original WebM for this longer recording.'
        : 'MP4 conversion runs entirely on this device. If memory runs low, save the original WebM.';
    el.saveMp4.disabled = !direct && state.recordingDuration > conversionLimitSeconds;
    el.exportPanel.hidden = false;
    document.body.style.overflow = 'hidden';
    el.saveMp4.focus();
  }

  function closeExportPanel() {
    if (state.converting) return;
    el.exportPanel.hidden = true;
    document.body.style.overflow = '';
    el.record.focus();
  }

  function finishRecording() {
    window.clearInterval(state.recordingTimer);
    state.recordingTimer = 0;
    state.recordingDuration = Math.max(.1, (Date.now() - state.recordingStartedAt) / 1000);
    el.recordIndicator.hidden = true;
    el.record.classList.remove('is-recording');
    el.record.innerHTML = 'RECORD<small>MP4 FIRST / WEBM FALLBACK</small>';
    stopRecordingResources();
    const chunks = state.recordingChunks;
    state.recordingChunks = [];
    const profile = state.recorderProfile;
    state.recorder = null;
    el.record.disabled = !state.sourceReady || !profile;
    if (!chunks.length || !profile) {
      showError('The browser ended recording without media data.', 'recording_empty');
      setStatus('RECORDING FAILED / NO DATA.');
      return;
    }
    state.lastRecording = new Blob(chunks, { type: profile.mime });
    state.lastRecordingExtension = profile.extension;
    setStatus(`RECORDING COMPLETE / ${profile.extension.toUpperCase()} READY.`);
    openExportPanel();
  }

  async function startRecording(profileOverride = null) {
    clearError();
    const profile = profileOverride || state.recorderProfile;
    if (!state.sourceReady || !profile || !canvasCapture) {
      showError('Local recording is not available for this signal in this browser.', 'recording_unsupported');
      return;
    }
    try {
      state.recordingStream = await createRecordingStream();
      state.recordingChunks = [];
      state.recorder = new MediaRecorder(state.recordingStream, {
        mimeType: profile.mime,
        videoBitsPerSecond: 4_000_000,
        audioBitsPerSecond: 96_000
      });
      state.recorder.addEventListener('dataavailable', event => {
        if (event.data && event.data.size) state.recordingChunks.push(event.data);
      });
      state.recorder.addEventListener('stop', finishRecording, { once: true });
      state.recorder.addEventListener('error', () => {
        showError('The browser recorder stopped unexpectedly.', 'recording_failed');
        if (state.recorder && state.recorder.state !== 'inactive') state.recorder.stop();
      });
      state.recorder.start(250);
      state.recordingStartedAt = Date.now();
      updateRecordingClock();
      state.recordingTimer = window.setInterval(updateRecordingClock, 500);
      el.recordIndicator.hidden = false;
      el.record.classList.add('is-recording');
      el.record.textContent = 'STOP RECORDING';
      setStatus(`RECORDING 720P / 30 FPS / ${profile.extension.toUpperCase()} LOCAL.`);
    } catch (_) {
      stopRecordingResources();
      state.recorder = null;
      const webmFallback = profile.directMp4 ? findWebmProfile() : null;
      if (webmFallback) {
        state.recorderProfile = webmFallback;
        el.recordSupport.textContent = '● DIRECT MP4 FAILED / WEBM FALLBACK READY / LOCAL MP4 CONVERSION UP TO 30 SEC';
        setStatus('DIRECT MP4 COULD NOT START / SWITCHING TO WEBM…');
        await startRecording(webmFallback);
        return;
      }
      showError('Recording could not start in this browser.', 'recording_failed');
      setStatus('RECORDER FAILED TO START.');
    }
  }

  function toggleRecording() {
    if (state.recorder && state.recorder.state === 'recording') {
      el.record.disabled = true;
      state.recorder.stop();
      return;
    }
    startRecording();
  }

  function updateConversionProgress(percent, label) {
    const safePercent = Math.max(0, Math.min(100, Math.round(percent)));
    el.conversionProgress.value = safePercent;
    el.conversionProgress.textContent = `${safePercent}%`;
    el.conversionPercent.textContent = `${safePercent}%`;
    if (label) el.conversionLabel.textContent = label;
  }

  async function loadConverter() {
    if (state.ffmpeg) return state.ffmpeg;
    if (!window.FFmpegWASM || !window.FFmpegWASM.FFmpeg) {
      throw new Error('Local converter wrapper is unavailable.');
    }
    updateConversionProgress(2, 'LOADING LOCAL CONVERTER / ABOUT 31 MB…');
    const ffmpeg = new window.FFmpegWASM.FFmpeg();
    state.ffmpeg = ffmpeg;
    ffmpeg.on('progress', ({ progress }) => {
      if (Number.isFinite(progress)) updateConversionProgress(10 + progress * 87, 'TRANSCODING H.264 + AAC…');
    });
    const base = new URL('../assets/vendor/ffmpeg/', document.baseURI);
    try {
      await ffmpeg.load({
        coreURL: new URL(`ffmpeg-core.js?v=${assetVersion}`, base).href,
        wasmURL: new URL(`ffmpeg-core.wasm?v=${assetVersion}`, base).href
      });
    } catch (error) {
      if (state.ffmpeg === ffmpeg) state.ffmpeg = null;
      throw error;
    }
    return ffmpeg;
  }

  async function convertToMp4() {
    if (!state.lastRecording) return;
    if (state.lastRecordingExtension === 'mp4') {
      downloadBlob(state.lastRecording, 'mp4');
      setStatus('DIRECT MP4 DOWNLOAD REQUESTED.');
      return;
    }
    if (state.recordingDuration > conversionLimitSeconds) {
      el.conversionWarning.textContent = 'This recording is over 30 seconds. MP4 conversion is disabled; save the original WebM.';
      return;
    }
    if (state.converting) return;
    state.converting = true;
    state.conversionCancelled = false;
    el.conversionPanel.hidden = false;
    el.saveMp4.disabled = true;
    el.saveWebm.disabled = true;
    el.closeExport.disabled = true;
    updateConversionProgress(0, 'PREPARING LOCAL CONVERTER…');
    const inputName = 'the-pan-input.webm';
    const outputName = 'the-pan-output.mp4';
    let ffmpeg;
    try {
      ffmpeg = await loadConverter();
      if (state.conversionCancelled) return;
      updateConversionProgress(8, 'COPYING RECORDING INTO LOCAL MEMORY…');
      const bytes = new Uint8Array(await state.lastRecording.arrayBuffer());
      await ffmpeg.writeFile(inputName, bytes);
      if (state.conversionCancelled) return;
      const duration = Math.min(conversionLimitSeconds, Math.max(.1, state.recordingDuration)).toFixed(3);
      const result = await ffmpeg.exec([
        '-y',
        '-i', inputName,
        '-f', 'lavfi',
        '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
        '-t', duration,
        '-map', '0:v:0',
        '-map', '1:a:0',
        '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-crf', '25',
        '-pix_fmt', 'yuv420p',
        '-profile:v', 'baseline',
        '-level', '3.1',
        '-c:a', 'aac',
        '-b:a', '96k',
        '-shortest',
        '-movflags', '+faststart',
        outputName
      ]);
      if (state.conversionCancelled) return;
      if (result !== 0) throw new Error(`Local converter exited with code ${result}.`);
      updateConversionProgress(98, 'FINALIZING MP4…');
      const output = await ffmpeg.readFile(outputName);
      const mp4 = new Blob([output.buffer], { type: 'video/mp4' });
      updateConversionProgress(100, 'MP4 READY / DOWNLOAD STARTED.');
      downloadBlob(mp4, 'mp4');
      setStatus('LOCAL MP4 CONVERSION COMPLETE / H.264 + AAC.');
      el.conversionWarning.textContent = 'MP4 conversion completed entirely in this browser. No media was uploaded.';
    } catch (error) {
      if (!state.conversionCancelled) {
        el.conversionWarning.textContent = 'MP4 conversion failed or memory ran low. Save the original WebM and try a shorter recording.';
        showError('MP4 conversion failed. Your original WebM recording is still available.', 'mp4_conversion_failed');
        setStatus('MP4 CONVERSION FAILED / WEBM REMAINS SAFE.');
      }
    } finally {
      if (ffmpeg && !state.conversionCancelled) {
        try { await ffmpeg.deleteFile(inputName); } catch (_) {}
        try { await ffmpeg.deleteFile(outputName); } catch (_) {}
      }
      state.converting = false;
      el.saveMp4.disabled = state.recordingDuration > conversionLimitSeconds;
      el.saveWebm.disabled = state.lastRecordingExtension === 'mp4';
      el.closeExport.disabled = false;
    }
  }

  function cancelConversion() {
    if (!state.converting) return;
    state.conversionCancelled = true;
    if (state.ffmpeg) {
      try { state.ffmpeg.terminate(); } catch (_) {}
      state.ffmpeg = null;
    }
    state.converting = false;
    el.saveMp4.disabled = state.recordingDuration > conversionLimitSeconds;
    el.saveWebm.disabled = false;
    el.closeExport.disabled = false;
    updateConversionProgress(0, 'CONVERSION CANCELLED.');
    el.conversionWarning.textContent = 'Conversion cancelled. Your original WebM is still ready to save.';
    setStatus('MP4 CONVERSION CANCELLED / WEBM REMAINS SAFE.');
  }

  function saveOriginal() {
    if (!state.lastRecording || state.lastRecordingExtension !== 'webm') return;
    downloadBlob(state.lastRecording, 'webm');
    setStatus('ORIGINAL WEBM DOWNLOAD REQUESTED.');
  }

  function setPseudoFullscreen(active) {
    state.pseudoFullscreen = active;
    el.shell.classList.toggle('is-pseudo-fullscreen', active);
    el.shell.classList.toggle('is-fullscreen-active', active);
    document.body.classList.toggle('is-pseudo-fullscreen', active);
    el.fullscreen.textContent = active ? 'EXIT FULLSCREEN' : 'FULLSCREEN';
  }

  async function toggleFullscreen() {
    clearError();
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    if (state.pseudoFullscreen) {
      setPseudoFullscreen(false);
      return;
    }
    if (typeof el.shell.requestFullscreen === 'function') {
      try {
        await el.shell.requestFullscreen();
        return;
      } catch (_) {
        setPseudoFullscreen(true);
        return;
      }
    }
    setPseudoFullscreen(true);
  }

  function toggleSticky() {
    state.stickyEnabled = !state.stickyEnabled;
    el.shell.classList.toggle('is-sticky-enabled', state.stickyEnabled);
    el.sticky.setAttribute('aria-pressed', String(state.stickyEnabled));
    el.sticky.textContent = `STICKY: ${state.stickyEnabled ? 'ON' : 'OFF'}`;
  }

  function returnPreviewToTop() {
    el.shell.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
  }

  function cleanup() {
    if (state.recorder && state.recorder.state !== 'inactive') state.recorder.stop();
    if (state.ffmpeg) {
      try { state.ffmpeg.terminate(); } catch (_) {}
    }
    stopCamera();
    clearObjectUrl();
    stopRecordingResources();
    if (state.lastRecordingUrl) URL.revokeObjectURL(state.lastRecordingUrl);
    cancelAnimationFrame(state.animationFrame);
  }

  for (const control of el.controls) updateRange(control);
  for (const control of el.allSettingInputs) {
    const eventName = control.type === 'range' ? 'input' : 'change';
    control.addEventListener(eventName, () => {
      if (control.type === 'range') updateRange(control);
      if (control.id === 'feedbackAmount' && Number(control.value) === 0) state.hasHistory = false;
      if (control.id.startsWith('body')) state.previousBodyLuma = null;
      if (control.id === 'bodyDetail') {
        state.adaptiveBodyDetail = isCompact ? 'low' : 'mid';
        state.stableFpsWindows = 0;
        state.bodyEmergencyStep = 1;
        state.bodyFastFrames = 0;
        el.bodyPerformance.textContent = `${control.value.toUpperCase()} DETAIL / ${activeBodyDetail().toUpperCase()} / ${state.currentFps} FPS`;
      }
      markCustom();
      updatePointerUi();
    });
  }
  for (const button of el.presetButtons) {
    button.addEventListener('click', () => applyPreset(button.dataset.preset));
  }
  el.camera.addEventListener('click', startCamera);
  el.input.addEventListener('change', () => loadVideo(el.input.files[0]));
  el.videoPlayPause.addEventListener('click', toggleLocalVideoPlayback);
  el.videoSeek.addEventListener('pointerdown', () => { state.scrubbingVideo = true; });
  el.videoSeek.addEventListener('touchstart', () => { state.scrubbingVideo = true; }, { passive: true });
  el.videoSeek.addEventListener('input', seekLocalVideo);
  el.videoSeek.addEventListener('change', () => {
    state.scrubbingVideo = false;
    seekLocalVideo();
  });
  for (const eventName of ['loadedmetadata', 'durationchange', 'timeupdate', 'seeked', 'play', 'pause', 'ended']) {
    el.video.addEventListener(eventName, () => updateVideoTransport());
  }
  el.reset.addEventListener('click', noEffect);
  el.record.addEventListener('click', toggleRecording);
  el.fullscreen.addEventListener('click', toggleFullscreen);
  el.sticky.addEventListener('click', toggleSticky);
  el.returnPreview.addEventListener('click', returnPreviewToTop);
  el.monitor.addEventListener('pointerdown', updatePointer);
  el.monitor.addEventListener('pointermove', updatePointer, { passive: true });
  el.monitor.addEventListener('touchmove', event => {
    if (event.touches[0]) updatePointer(event.touches[0]);
  }, { passive: true });
  el.closeExport.addEventListener('click', closeExportPanel);
  el.saveWebm.addEventListener('click', saveOriginal);
  el.saveMp4.addEventListener('click', convertToMp4);
  el.cancelConversion.addEventListener('click', cancelConversion);
  el.exportPanel.addEventListener('click', event => {
    if (event.target === el.exportPanel) closeExportPanel();
  });
  document.addEventListener('fullscreenchange', () => {
    const active = Boolean(document.fullscreenElement);
    el.shell.classList.toggle('is-fullscreen-active', active);
    if (active) el.fullscreen.textContent = 'EXIT FULLSCREEN';
    else if (!state.pseudoFullscreen) el.fullscreen.textContent = 'FULLSCREEN';
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (state.pseudoFullscreen) setPseudoFullscreen(false);
    else if (!el.exportPanel.hidden && !state.converting) closeExportPanel();
  });
  window.addEventListener('beforeunload', cleanup);

  createParticles();
  updateModeLabels();
  updatePointerUi();
  updateRecorderSupport();
  applyPreset('clean', false);
}());
