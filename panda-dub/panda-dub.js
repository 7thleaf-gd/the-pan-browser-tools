'use strict';

(function pandaDubApp(global) {
  const BPM = 74;
  const BARS = 4;
  const BEATS_PER_BAR = 4;
  const BEAT_SECONDS = 60 / BPM;
  const VERSION = 'v0';
  const TRACKS = ['drums', 'bass', 'chord', 'voice'];
  const INITIAL_STATE = Object.freeze({ drums: true, bass: true, chord: false, voice: false });
  const FILES = Object.freeze({
    drums: '../assets/panda-dub/drums.wav',
    bass: '../assets/panda-dub/bass.wav',
    chord: '../assets/panda-dub/chord.wav',
    voice: '../assets/panda-dub/voice.wav',
    'shot-01': '../assets/panda-dub/shot-01.wav',
    'shot-02': '../assets/panda-dub/shot-02.wav',
    'shot-03': '../assets/panda-dub/shot-03.wav'
  });
  const SHOT_WORDS = Object.freeze({ 'shot-01': 'PANDA DUB!', 'shot-02': 'PEW—W—W!', 'shot-03': 'KRSH!' });

  const elements = {};
  const trackState = { ...INITIAL_STATE };
  const pendingState = {};
  let audioContext = null;
  let audioBuffers = null;
  let loadPromise = null;
  let nodes = null;
  let sources = {};
  let timelineStart = 0;
  let playing = false;
  let loading = false;
  let selectedEchoTrack = 'drums';
  let division = 'quarter';
  let animationFrame = 0;
  let lastBeat = -1;
  let lastBurstTimer = 0;

  function cacheElements() {
    elements.scene = document.getElementById('dubScene');
    elements.play = document.getElementById('playStopButton');
    elements.reset = document.getElementById('resetButton');
    elements.status = document.getElementById('transportStatus');
    elements.lamp = document.getElementById('transportLamp');
    elements.beatCounter = document.getElementById('beatCounter');
    elements.filter = document.getElementById('filterControl');
    elements.filterValue = document.getElementById('filterValue');
    elements.filterShade = document.getElementById('filterShade');
    elements.feedback = document.getElementById('feedbackControl');
    elements.feedbackValue = document.getElementById('feedbackValue');
    elements.echoThrow = document.getElementById('echoThrow');
    elements.echoTargetLabel = document.getElementById('echoTargetLabel');
    elements.comicBurst = document.getElementById('comicBurst');
    elements.trackButtons = [...document.querySelectorAll('[data-track]')];
    elements.echoTargets = [...document.querySelectorAll('[data-echo-target]')];
    elements.divisionButtons = [...document.querySelectorAll('[data-division]')];
    elements.shotButtons = [...document.querySelectorAll('[data-shot]')];
  }

  function makeContext() {
    if (audioContext) return audioContext;
    const Context = global.AudioContext || global.webkitAudioContext;
    if (!Context) throw new Error('WEB_AUDIO_UNAVAILABLE');
    audioContext = new Context({ latencyHint: 'interactive' });
    return audioContext;
  }

  async function loadAudio() {
    if (audioBuffers) return audioBuffers;
    if (loadPromise) return loadPromise;
    const context = makeContext();
    loadPromise = Promise.all(Object.entries(FILES).map(async ([name, path]) => {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`AUDIO_LOAD_${name.toUpperCase()}`);
      const bytes = await response.arrayBuffer();
      return [name, await context.decodeAudioData(bytes)];
    })).then((entries) => {
      audioBuffers = Object.fromEntries(entries);
      const loopDurations = TRACKS.map((track) => audioBuffers[track].duration);
      if (Math.max(...loopDurations) - Math.min(...loopDurations) > 0.002) {
        throw new Error('LOOP_LENGTH_MISMATCH');
      }
      return audioBuffers;
    }).catch((error) => {
      loadPromise = null;
      throw error;
    });
    return loadPromise;
  }

  function buildGraph() {
    if (nodes) return;
    const context = makeContext();
    const masterBus = context.createGain();
    const masterFilter = context.createBiquadFilter();
    const compressor = context.createDynamicsCompressor();
    const analyser = context.createAnalyser();
    const delay = context.createDelay(2.5);
    const delayHighpass = context.createBiquadFilter();
    const delayLowpass = context.createBiquadFilter();
    const feedback = context.createGain();
    const delayReturn = context.createGain();
    const trackGains = {};
    const sends = {};

    masterBus.gain.value = 0.82;
    masterFilter.type = 'lowpass';
    masterFilter.frequency.value = 18000;
    masterFilter.Q.value = 0.7;
    compressor.threshold.value = -12;
    compressor.knee.value = 18;
    compressor.ratio.value = 8;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.22;
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.72;
    delayHighpass.type = 'highpass';
    delayHighpass.frequency.value = 190;
    delayLowpass.type = 'lowpass';
    delayLowpass.frequency.value = 4200;
    feedback.gain.value = 0.48;
    delayReturn.gain.value = 0.44;
    delay.delayTime.value = BEAT_SECONDS;

    masterBus.connect(masterFilter).connect(compressor).connect(analyser).connect(context.destination);
    delay.connect(delayHighpass).connect(delayLowpass);
    delayLowpass.connect(delayReturn).connect(masterBus);
    delayLowpass.connect(feedback).connect(delay);

    TRACKS.forEach((track) => {
      trackGains[track] = context.createGain();
      trackGains[track].gain.value = trackState[track] ? 1 : 0;
      trackGains[track].connect(masterBus);
      sends[track] = context.createGain();
      sends[track].gain.value = 0;
      sends[track].connect(delay);
    });
    nodes = { masterBus, masterFilter, compressor, analyser, delay, delayHighpass, delayLowpass, feedback, delayReturn, trackGains, sends };
  }

  function setStatus(message) {
    elements.status.textContent = message;
  }

  function updateTrackUI(track, state, pending = false) {
    const button = elements.trackButtons.find((item) => item.dataset.track === track);
    if (!button) return;
    button.setAttribute('aria-pressed', String(state));
    button.classList.toggle('is-queued', pending);
    const label = button.querySelector(`[data-state-for="${track}"]`);
    if (label) label.textContent = `${track === 'voice' ? 'VOICE' : track.toUpperCase()} / ${pending ? 'QUEUED' : state ? 'ON' : 'OFF'}`;
  }

  function updateAllTrackUI() {
    TRACKS.forEach((track) => updateTrackUI(track, trackState[track], Boolean(pendingState[track])));
  }

  function nextGridTime(gridBeats = 1) {
    if (!playing || !audioContext) return 0;
    const grid = BEAT_SECONDS * gridBeats;
    const elapsed = Math.max(0, audioContext.currentTime - timelineStart);
    return timelineStart + (Math.floor(elapsed / grid) + 1) * grid;
  }

  function selectEchoTrack(track) {
    selectedEchoTrack = track;
    elements.echoTargets.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.echoTarget === track)));
    elements.echoTargetLabel.textContent = `${track.toUpperCase()} → SPACE`;
  }

  function toggleTrack(track) {
    selectEchoTrack(track);
    const currentTarget = pendingState[track] ? pendingState[track].target : trackState[track];
    const target = !currentTarget;
    if (!playing || !nodes) {
      trackState[track] = target;
      delete pendingState[track];
      if (nodes) nodes.trackGains[track].gain.value = target ? 1 : 0;
      updateTrackUI(track, target, false);
      setStatus(`${track.toUpperCase()} ${target ? 'ARMED' : 'MUTED'} / PRESS PLAY`);
      return;
    }
    const at = nextGridTime(1);
    const parameter = nodes.trackGains[track].gain;
    const now = audioContext.currentTime;
    parameter.cancelScheduledValues(now);
    parameter.setValueAtTime(parameter.value, now);
    parameter.setValueAtTime(parameter.value, at);
    parameter.linearRampToValueAtTime(target ? 1 : 0, at + 0.012);
    pendingState[track] = { target, at };
    updateTrackUI(track, target, true);
    setStatus(`${track.toUpperCase()} ${target ? 'ON' : 'OFF'} / NEXT BEAT`);
  }

  function startSources() {
    const context = makeContext();
    buildGraph();
    sources = {};
    timelineStart = context.currentTime + 0.08;
    TRACKS.forEach((track) => {
      const source = context.createBufferSource();
      source.buffer = audioBuffers[track];
      source.loop = true;
      source.loopStart = 0;
      source.loopEnd = audioBuffers[track].duration;
      source.connect(nodes.trackGains[track]);
      source.connect(nodes.sends[track]);
      nodes.trackGains[track].gain.cancelScheduledValues(context.currentTime);
      nodes.trackGains[track].gain.setValueAtTime(trackState[track] ? 1 : 0, timelineStart);
      source.start(timelineStart, 0);
      sources[track] = source;
    });
    playing = true;
    lastBeat = -1;
    elements.play.classList.add('is-playing');
    elements.play.innerHTML = '<span aria-hidden="true">■</span><strong>STOP</strong>';
    elements.lamp.classList.add('is-live');
    setStatus('TRANSMISSION RUNNING');
  }

  function stopSources() {
    Object.values(sources).forEach((source) => {
      try { source.stop(); } catch (_) { /* Source may already be stopped. */ }
      source.disconnect();
    });
    sources = {};
    playing = false;
    Object.keys(pendingState).forEach((track) => delete pendingState[track]);
    elements.play.classList.remove('is-playing');
    elements.play.innerHTML = '<span aria-hidden="true">▶</span><strong>PLAY</strong>';
    elements.lamp.classList.remove('is-live');
    elements.beatCounter.textContent = 'BAR 1 / BEAT 1';
    updateAllTrackUI();
    setStatus('SIGNAL SLEEPING');
  }

  async function togglePlay() {
    if (loading) return;
    if (playing) {
      stopSources();
      return;
    }
    loading = true;
    elements.play.disabled = true;
    setStatus('LOADING COSMIC LOOPS…');
    try {
      const context = makeContext();
      await context.resume();
      await loadAudio();
      await context.resume();
      startSources();
    } catch (error) {
      console.error(error);
      setStatus(error.message === 'WEB_AUDIO_UNAVAILABLE' ? 'WEB AUDIO NOT SUPPORTED' : 'SIGNAL LOAD FAILED / RETRY');
    } finally {
      loading = false;
      elements.play.disabled = false;
    }
  }

  function throwEcho() {
    if (!playing || !nodes) {
      setStatus('PRESS PLAY BEFORE THROWING ECHO');
      return;
    }
    const parameter = nodes.sends[selectedEchoTrack].gain;
    const now = audioContext.currentTime;
    parameter.cancelScheduledValues(now);
    parameter.setValueAtTime(parameter.value, now);
    parameter.linearRampToValueAtTime(0.86, now + 0.018);
    parameter.setValueAtTime(0.86, now + BEAT_SECONDS * 0.20);
    parameter.exponentialRampToValueAtTime(0.0001, now + BEAT_SECONDS * 0.48);
    elements.echoThrow.classList.remove('is-throwing');
    void elements.echoThrow.offsetWidth;
    elements.echoThrow.classList.add('is-throwing');
    showBurst('ECHO—O—O!');
    setStatus(`${selectedEchoTrack.toUpperCase()} THROWN INTO SPACE`);
  }

  function setDelayDivision(value) {
    division = value;
    const beats = value === 'eighth' ? 0.5 : value === 'dotted' ? 0.75 : 1;
    elements.divisionButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.division === value)));
    if (nodes && audioContext) {
      nodes.delay.delayTime.cancelScheduledValues(audioContext.currentTime);
      nodes.delay.delayTime.linearRampToValueAtTime(BEAT_SECONDS * beats, audioContext.currentTime + 0.06);
    }
  }

  function setFeedback(rawValue) {
    const safe = Math.min(0.80, Math.max(0.15, Number(rawValue) / 100));
    elements.feedbackValue.textContent = `${Math.round(safe * 100)}%`;
    if (nodes && audioContext) nodes.feedback.gain.setTargetAtTime(safe, audioContext.currentTime, 0.025);
  }

  function setFilter(rawValue) {
    const normalized = Math.min(1, Math.max(0, Number(rawValue) / 100));
    const frequency = 260 * Math.pow(18000 / 260, normalized);
    const percent = Math.round(normalized * 100);
    elements.filter.style.setProperty('--fill', `${percent}%`);
    elements.filterValue.textContent = percent > 88 ? 'OPEN' : percent < 20 ? 'SUBMERGED' : `${Math.round(frequency)} HZ`;
    elements.scene.style.setProperty('--filter-darkness', String((1 - normalized) * 0.62));
    if (nodes && audioContext) nodes.masterFilter.frequency.setTargetAtTime(frequency, audioContext.currentTime, 0.035);
  }

  function showBurst(word) {
    clearTimeout(lastBurstTimer);
    elements.comicBurst.textContent = word;
    elements.comicBurst.classList.remove('is-visible');
    void elements.comicBurst.offsetWidth;
    elements.comicBurst.classList.add('is-visible');
    lastBurstTimer = global.setTimeout(() => elements.comicBurst.classList.remove('is-visible'), 760);
  }

  function playShot(name) {
    if (!playing || !audioBuffers || !nodes) {
      setStatus('PRESS PLAY TO ARM THE COSMIC BUTTONS');
      return;
    }
    const source = audioContext.createBufferSource();
    const gain = audioContext.createGain();
    source.buffer = audioBuffers[name];
    gain.gain.value = 0.72;
    source.connect(gain).connect(nodes.masterBus);
    gain.connect(nodes.delay);
    const at = nextGridTime(0.5);
    source.start(at);
    source.addEventListener('ended', () => { source.disconnect(); gain.disconnect(); }, { once: true });
    const visualDelay = Math.max(0, (at - audioContext.currentTime) * 1000);
    global.setTimeout(() => showBurst(SHOT_WORDS[name]), visualDelay);
    setStatus(`${name.toUpperCase()} / NEXT EIGHTH`);
  }

  function reset() {
    TRACKS.forEach((track) => {
      trackState[track] = INITIAL_STATE[track];
      delete pendingState[track];
      if (nodes && audioContext) {
        const parameter = nodes.trackGains[track].gain;
        parameter.cancelScheduledValues(audioContext.currentTime);
        parameter.setTargetAtTime(trackState[track] ? 1 : 0, audioContext.currentTime, 0.012);
        nodes.sends[track].gain.cancelScheduledValues(audioContext.currentTime);
        nodes.sends[track].gain.setTargetAtTime(0.0001, audioContext.currentTime, 0.01);
      }
    });
    elements.filter.value = 100;
    elements.feedback.value = 48;
    setFilter(100);
    setFeedback(48);
    setDelayDivision('quarter');
    selectEchoTrack('drums');
    updateAllTrackUI();
    setStatus(playing ? 'RESET / TRANSMISSION RUNNING' : 'RESET / SIGNAL SLEEPING');
  }

  function animate() {
    if (playing && audioContext && nodes && !document.hidden) {
      const elapsedBeats = Math.max(0, (audioContext.currentTime - timelineStart) / BEAT_SECONDS);
      const beatIndex = Math.floor(elapsedBeats);
      if (beatIndex !== lastBeat) {
        lastBeat = beatIndex;
        const beatInBar = (beatIndex % BEATS_PER_BAR) + 1;
        const bar = (Math.floor(beatIndex / BEATS_PER_BAR) % BARS) + 1;
        elements.beatCounter.textContent = `BAR ${bar} / BEAT ${beatInBar}`;
        TRACKS.forEach((track) => {
          const pending = pendingState[track];
          if (pending && audioContext.currentTime >= pending.at) {
            trackState[track] = pending.target;
            delete pendingState[track];
            updateTrackUI(track, trackState[track], false);
          }
        });
        elements.trackButtons.forEach((button) => {
          if (button.getAttribute('aria-pressed') !== 'true') return;
          button.classList.remove('is-beating');
          void button.offsetWidth;
          button.classList.add('is-beating');
        });
      }
      const bins = new Uint8Array(nodes.analyser.frequencyBinCount);
      nodes.analyser.getByteFrequencyData(bins);
      let total = 0;
      for (let index = 0; index < Math.min(28, bins.length); index += 1) total += bins[index];
      const energy = Math.min(1, total / (Math.min(28, bins.length) * 150));
      elements.scene.style.setProperty('--energy', energy.toFixed(3));
    }
    animationFrame = global.requestAnimationFrame(animate);
  }

  function bindEvents() {
    elements.play.addEventListener('click', togglePlay);
    elements.reset.addEventListener('click', reset);
    elements.trackButtons.forEach((button) => button.addEventListener('click', () => toggleTrack(button.dataset.track)));
    elements.echoTargets.forEach((button) => button.addEventListener('click', () => selectEchoTrack(button.dataset.echoTarget)));
    elements.echoThrow.addEventListener('click', throwEcho);
    elements.divisionButtons.forEach((button) => button.addEventListener('click', () => setDelayDivision(button.dataset.division)));
    elements.shotButtons.forEach((button) => button.addEventListener('click', () => playShot(button.dataset.shot)));
    elements.filter.addEventListener('input', () => setFilter(elements.filter.value));
    elements.feedback.addEventListener('input', () => setFeedback(elements.feedback.value));
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && playing && audioContext?.state === 'suspended') audioContext.resume().catch(() => {});
    });
    global.addEventListener('pagehide', () => {
      if (animationFrame) global.cancelAnimationFrame(animationFrame);
      if (playing) stopSources();
    });
  }

  function initialize() {
    cacheElements();
    global.ThePan?.analytics?.configure('panda_dub', VERSION);
    document.querySelectorAll('[data-current-year]').forEach((element) => { element.textContent = String(new Date().getFullYear()); });
    updateAllTrackUI();
    setFilter(elements.filter.value);
    setFeedback(elements.feedback.value);
    bindEvents();
    animate();
  }

  document.addEventListener('DOMContentLoaded', initialize, { once: true });
}(window));
