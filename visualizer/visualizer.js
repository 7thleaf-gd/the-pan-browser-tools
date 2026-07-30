'use strict';

(function signalVisualizer() {
  const pan = window.ThePan || {};
  const defaults = Object.freeze({
    rgbShift: 6,
    waveAmount: 9,
    feedbackAmount: 66,
    noiseAmount: 14,
    particleEnabled: true,
    particleAmount: 64,
    particleSize: 1.5,
    particleSpeed: 32,
    particleDrift: 54,
    particleGlow: 45,
    particleOpacity: 72,
    particleColor: 'lime',
    particleBlend: 'screen'
  });
  const compactDevice = window.matchMedia('(max-width: 800px)').matches || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
  const maxRenderWidth = compactDevice ? 960 : 1280;
  const maxPixels = compactDevice ? 960 * 540 : 1280 * 720;
  const targetFrameTime = 1000 / 30;
  const canvasCapture = HTMLCanvasElement.prototype.captureStream || HTMLCanvasElement.prototype.webkitCaptureStream;
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
    reset: document.querySelector('#resetButton'),
    record: document.querySelector('#recordButton'),
    download: document.querySelector('#downloadButton'),
    recordSupport: document.querySelector('#recordingSupport'),
    recordIndicator: document.querySelector('#recordingIndicator'),
    recordTime: document.querySelector('#recordingTime'),
    controls: [...document.querySelectorAll('.visualizer-controls input[type="range"]')],
    particleEnabled: document.querySelector('#particleEnabled'),
    particleState: document.querySelector('#particleState'),
    particleToggleText: document.querySelector('#particleToggleText'),
    particleColor: document.querySelector('#particleColor'),
    particleBlend: document.querySelector('#particleBlend')
  };
  const outputContext = el.canvas.getContext('2d', { alpha: false, desynchronized: true });
  const stage = document.createElement('canvas');
  const stageContext = stage.getContext('2d', { alpha: false });
  const warped = document.createElement('canvas');
  const warpedContext = warped.getContext('2d', { alpha: false });
  const redChannel = document.createElement('canvas');
  const redContext = redChannel.getContext('2d');
  const blueChannel = document.createElement('canvas');
  const blueContext = blueChannel.getContext('2d');
  const history = document.createElement('canvas');
  const historyContext = history.getContext('2d', { alpha: false });
  const state = {
    sourceReady: false,
    sourceKind: '',
    stream: null,
    objectUrl: '',
    animationFrame: 0,
    lastFrameTime: 0,
    hasHistory: false,
    pseudoFullscreen: false,
    recorder: null,
    recordingStream: null,
    recordingChunks: [],
    recordingStartedAt: 0,
    recordingTimer: 0,
    lastRecording: null,
    lastRecordingUrl: '',
    webmMime: '',
    lastParticleTime: 0,
    particles: []
  };

  if (pan.analytics) pan.analytics.configure('signal_visualizer', 'v0');

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
    state.hasHistory = false;
  }

  function dimensionsFor(width, height) {
    const safeWidth = Math.max(1, width || 1280);
    const safeHeight = Math.max(1, height || 720);
    const scale = Math.min(1, maxRenderWidth / safeWidth, Math.sqrt(maxPixels / (safeWidth * safeHeight)));
    return {
      width: Math.max(2, Math.round(safeWidth * scale)),
      height: Math.max(2, Math.round(safeHeight * scale))
    };
  }

  function sizeCanvases() {
    const size = dimensionsFor(el.video.videoWidth, el.video.videoHeight);
    for (const canvas of [el.canvas, stage, warped, redChannel, blueChannel, history]) {
      canvas.width = size.width;
      canvas.height = size.height;
    }
    outputContext.imageSmoothingEnabled = true;
    stageContext.imageSmoothingEnabled = true;
    warpedContext.imageSmoothingEnabled = true;
    historyContext.imageSmoothingEnabled = true;
    state.hasHistory = false;
  }

  function updateSourceUi(kind) {
    const label = kind === 'camera' ? '● CAMERA LIVE' : '● LOCAL VIDEO';
    state.sourceKind = kind;
    state.sourceReady = true;
    el.empty.hidden = true;
    el.sourceBadge.textContent = label;
    el.sourceBadge.classList.add('is-available');
    el.fullscreen.disabled = false;
    el.record.disabled = !state.webmMime;
    setStatus(kind === 'camera' ? 'CAMERA SIGNAL LOCKED.' : 'LOCAL VIDEO LOOPING / SIGNAL LOCKED.');
  }

  async function activateSource(kind) {
    await el.video.play();
    sizeCanvases();
    updateSourceUi(kind);
    startRendering();
  }

  function cameraErrorMessage(error) {
    if (!window.isSecureContext) return 'Camera access needs HTTPS or localhost.';
    if (error && ['NotAllowedError', 'PermissionDeniedError'].includes(error.name)) return 'Camera permission was denied. Allow camera access or load a local video.';
    if (error && ['NotFoundError', 'DevicesNotFoundError'].includes(error.name)) return 'No camera was found on this device.';
    if (error && ['NotReadableError', 'TrackStartError'].includes(error.name)) return 'The camera is already in use by another app.';
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
    setStatus('REQUESTING CAMERA PERMISSION…');
    stopSource();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
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

  function updateRange(control) {
    const minimum = Number(control.min || 0);
    const maximum = Number(control.max || 100);
    const value = Number(control.value);
    const fill = (value - minimum) / Math.max(1, maximum - minimum) * 100;
    control.style.setProperty('--fill', `${fill}%`);
    const output = control.closest('.control').querySelector('output');
    if (output) output.value = String(value);
  }

  function setting(id) {
    return Number(document.querySelector(`#${id}`).value);
  }

  function createParticles() {
    state.particles = Array.from({ length: 120 }, (_, index) => ({
      x: Math.random(),
      y: Math.random(),
      depth: .3 + Math.random() * .7,
      phase: Math.random() * Math.PI * 2,
      wobble: .55 + Math.random() * 1.5,
      shape: index % 13 === 0 ? 'star' : 'dot'
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
    const wave = setting('waveAmount');
    if (!wave) {
      warpedContext.drawImage(stage, 0, 0);
      return;
    }
    const stripHeight = Math.max(3, Math.round(height / 160));
    for (let y = 0; y < height; y += stripHeight) {
      const phase = y * 0.028 + time * 0.0023;
      const offset = Math.sin(phase) * wave + Math.sin(phase * .37) * wave * .36;
      warpedContext.drawImage(stage, 0, y, width, stripHeight, offset, y, width, stripHeight);
    }
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

  function drawNoise(width, height, amount) {
    if (!amount) return;
    const intensity = amount / 100;
    const specks = Math.round(20 + intensity * 330);
    outputContext.save();
    outputContext.globalCompositeOperation = 'screen';
    for (let index = 0; index < specks; index += 1) {
      const random = Math.random();
      outputContext.globalAlpha = .08 + random * intensity * .6;
      outputContext.fillStyle = random > .82 ? '#ff70d5' : random > .65 ? '#a8ff00' : '#f4efda';
      const size = random > .94 ? 3 : 1;
      outputContext.fillRect(Math.random() * width, Math.random() * height, size, size);
    }
    if (Math.random() < intensity * .38) {
      outputContext.globalAlpha = .12 + intensity * .16;
      outputContext.fillStyle = '#f4efda';
      outputContext.fillRect(0, Math.random() * height, width, 1 + Math.random() * 3);
    }
    outputContext.restore();
  }

  function particlePalette(name) {
    if (name === 'lime') return ['#a8ff00', '#efffc9', '#68d700'];
    if (name === 'purple') return ['#8a5cff', '#d1c2ff', '#b884ff'];
    if (name === 'pink') return ['#ff70d5', '#ffd0f1', '#ff3cab'];
    return ['#f4efda', '#ffffff', '#c9d8db'];
  }

  function drawParticles(width, height, time) {
    if (!el.particleEnabled.checked) return;
    const amount = Math.min(state.particles.length, Math.round(setting('particleAmount')));
    if (!amount) return;
    const speed = setting('particleSpeed') / 100;
    const drift = setting('particleDrift') / 100;
    const baseSize = setting('particleSize');
    const glow = setting('particleGlow') / 100;
    const opacity = setting('particleOpacity') / 100;
    const palette = particlePalette(el.particleColor.value);
    const delta = state.lastParticleTime ? Math.min(.05, (time - state.lastParticleTime) / 1000) : 0;
    state.lastParticleTime = time;
    outputContext.save();
    outputContext.globalCompositeOperation = el.particleBlend.value;
    for (let index = 0; index < amount; index += 1) {
      const particle = state.particles[index];
      particle.y -= delta * (.006 + speed * .075) * particle.depth;
      particle.x += Math.sin(time * (.00016 + speed * .00022) * particle.wobble + particle.phase) * delta * drift * .012;
      if (particle.y < -.04) {
        particle.y = 1.04;
        particle.x = Math.random();
      }
      if (particle.x < -.05) particle.x = 1.05;
      if (particle.x > 1.05) particle.x = -.05;
      const x = particle.x * width + Math.sin(time * .00035 * particle.wobble + particle.phase) * drift * width * .009;
      const y = particle.y * height;
      const radius = Math.max(.45, baseSize * (.45 + particle.depth * .8));
      const color = palette[index % palette.length];
      if (glow > 0) {
        outputContext.globalAlpha = opacity * glow * .17;
        outputContext.fillStyle = color;
        outputContext.beginPath();
        outputContext.arc(x, y, radius * (2.2 + glow * 2.8), 0, Math.PI * 2);
        outputContext.fill();
      }
      outputContext.globalAlpha = opacity * (.48 + particle.depth * .52);
      outputContext.fillStyle = color;
      if (particle.shape === 'star' && radius > 1) {
        outputContext.fillRect(x - radius * 2.2, y - radius * .32, radius * 4.4, radius * .64);
        outputContext.fillRect(x - radius * .32, y - radius * 2.2, radius * .64, radius * 4.4);
      } else {
        outputContext.beginPath();
        outputContext.arc(x, y, radius, 0, Math.PI * 2);
        outputContext.fill();
      }
    }
    outputContext.restore();
  }

  function renderFrame(time) {
    state.animationFrame = requestAnimationFrame(renderFrame);
    if (!state.sourceReady || el.video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
    if (time - state.lastFrameTime < targetFrameTime) return;
    state.lastFrameTime = time;
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
      const scale = 1 + feedback * .009;
      const historyWidth = width * scale;
      const historyHeight = height * scale;
      outputContext.globalAlpha = feedback * .9;
      outputContext.drawImage(history, (width - historyWidth) / 2 + Math.sin(time * .001) * feedback * 3, (height - historyHeight) / 2, historyWidth, historyHeight);
    }

    outputContext.globalAlpha = feedback ? .72 : 1;
    outputContext.drawImage(warped, 0, 0);
    const rgb = setting('rgbShift');
    if (rgb > 0) {
      tint(warped, redContext, '#ff174f');
      tint(warped, blueContext, '#00d9ff');
      outputContext.globalCompositeOperation = 'screen';
      outputContext.globalAlpha = .43;
      outputContext.drawImage(redChannel, -rgb, 0);
      outputContext.drawImage(blueChannel, rgb, 0);
    }
    drawNoise(width, height, setting('noiseAmount'));
    drawParticles(width, height, time);
    outputContext.restore();

    historyContext.globalCompositeOperation = 'source-over';
    historyContext.globalAlpha = 1;
    historyContext.drawImage(el.canvas, 0, 0);
    state.hasHistory = true;
  }

  function startRendering() {
    if (state.animationFrame) return;
    state.lastFrameTime = 0;
    state.animationFrame = requestAnimationFrame(renderFrame);
  }

  function resetEffects() {
    for (const [id, value] of Object.entries(defaults)) {
      const control = document.querySelector(`#${id}`);
      if (control.type === 'checkbox') {
        control.checked = value;
      } else {
        control.value = value;
      }
      if (control.type === 'range') updateRange(control);
    }
    updateParticleState();
    state.hasHistory = false;
    setStatus(state.sourceReady ? 'FX RESET / SIGNAL CLEANED.' : 'FX RESET / AWAITING SIGNAL.');
  }

  function updateParticleState() {
    const enabled = el.particleEnabled.checked;
    el.particleState.textContent = enabled ? 'ON' : 'OFF';
    el.particleToggleText.textContent = enabled ? 'ENABLED' : 'DISABLED';
  }

  function findWebmMime() {
    if (!window.MediaRecorder || !canvasCapture) return '';
    const candidates = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm'
    ];
    if (typeof MediaRecorder.isTypeSupported !== 'function') return 'video/webm';
    return candidates.find(type => MediaRecorder.isTypeSupported(type)) || '';
  }

  function updateRecorderSupport() {
    state.webmMime = findWebmMime();
    if (state.webmMime) {
      el.recordSupport.textContent = '● WEBM RECORDER READY / OUTPUT HAS NO AUDIO';
      el.recordSupport.className = 'recording-support is-supported';
      el.record.disabled = !state.sourceReady;
      return;
    }
    el.recordSupport.textContent = '○ WEBM RECORDING IS NOT AVAILABLE IN THIS BROWSER. LIVE EFFECTS AND FULLSCREEN STILL WORK.';
    el.recordSupport.className = 'recording-support is-unsupported';
    el.record.disabled = true;
  }

  function recordingFilename() {
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
    return `the-pan-visualizer-${date}-${time}.webm`;
  }

  function downloadLastRecording() {
    if (!state.lastRecording) return;
    if (state.lastRecordingUrl) URL.revokeObjectURL(state.lastRecordingUrl);
    state.lastRecordingUrl = URL.createObjectURL(state.lastRecording);
    const link = document.createElement('a');
    link.href = state.lastRecordingUrl;
    link.download = recordingFilename();
    document.body.append(link);
    link.click();
    link.remove();
    setStatus('WEBM DOWNLOAD REQUESTED / EVIDENCE RECOVERED.');
  }

  function updateRecordingClock() {
    const elapsed = Math.max(0, Math.floor((Date.now() - state.recordingStartedAt) / 1000));
    const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const seconds = String(elapsed % 60).padStart(2, '0');
    el.recordTime.textContent = `${minutes}:${seconds}`;
  }

  function finishRecording() {
    window.clearInterval(state.recordingTimer);
    state.recordingTimer = 0;
    el.recordIndicator.hidden = true;
    el.record.classList.remove('is-recording');
    el.record.innerHTML = 'RECORD WEBM<small>VIDEO ONLY / 30 FPS</small>';
    for (const track of state.recordingStream ? state.recordingStream.getTracks() : []) track.stop();
    state.recordingStream = null;
    const chunks = state.recordingChunks;
    state.recordingChunks = [];
    if (!chunks.length) {
      showError('The browser ended recording without video data.', 'recording_empty');
      setStatus('RECORDING FAILED / NO DATA.');
      return;
    }
    state.lastRecording = new Blob(chunks, { type: state.webmMime });
    state.recorder = null;
    el.download.hidden = false;
    setStatus('RECORDING COMPLETE / SAVING WEBM…');
    downloadLastRecording();
  }

  function startRecording() {
    clearError();
    if (!state.sourceReady || !state.webmMime || !canvasCapture) {
      showError('WebM recording is not available for this signal in this browser.', 'recording_unsupported');
      return;
    }
    try {
      state.recordingStream = canvasCapture.call(el.canvas, 30);
      state.recordingChunks = [];
      state.recorder = new MediaRecorder(state.recordingStream, {
        mimeType: state.webmMime,
        videoBitsPerSecond: 5_000_000
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
      el.record.textContent = 'STOP & SAVE';
      setStatus('RECORDING PROCESSED CANVAS / WEBM VIDEO.');
    } catch (_) {
      for (const track of state.recordingStream ? state.recordingStream.getTracks() : []) track.stop();
      state.recordingStream = null;
      state.recorder = null;
      showError('WebM recording could not start in this browser.', 'recording_failed');
      setStatus('RECORDER FAILED TO START.');
    }
  }

  function toggleRecording() {
    if (state.recorder && state.recorder.state === 'recording') {
      state.recorder.stop();
      el.record.disabled = true;
      window.setTimeout(() => { el.record.disabled = !state.sourceReady || !state.webmMime; }, 350);
      return;
    }
    startRecording();
  }

  function setPseudoFullscreen(active) {
    state.pseudoFullscreen = active;
    el.shell.classList.toggle('is-pseudo-fullscreen', active);
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

  function cleanup() {
    if (state.recorder && state.recorder.state !== 'inactive') state.recorder.stop();
    stopCamera();
    clearObjectUrl();
    if (state.lastRecordingUrl) URL.revokeObjectURL(state.lastRecordingUrl);
    cancelAnimationFrame(state.animationFrame);
  }

  for (const control of el.controls) {
    updateRange(control);
    control.addEventListener('input', () => {
      updateRange(control);
      if (control.id === 'feedbackAmount' && Number(control.value) === 0) state.hasHistory = false;
    });
  }
  el.camera.addEventListener('click', startCamera);
  el.input.addEventListener('change', () => loadVideo(el.input.files[0]));
  el.particleEnabled.addEventListener('change', updateParticleState);
  el.reset.addEventListener('click', resetEffects);
  el.record.addEventListener('click', toggleRecording);
  el.download.addEventListener('click', downloadLastRecording);
  el.fullscreen.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) {
      el.fullscreen.textContent = 'EXIT FULLSCREEN';
    } else if (!state.pseudoFullscreen) {
      el.fullscreen.textContent = 'FULLSCREEN';
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && state.pseudoFullscreen) setPseudoFullscreen(false);
  });
  window.addEventListener('beforeunload', cleanup);
  createParticles();
  updateParticleState();
  updateRecorderSupport();
}());
