const MAX_MASTER_GAIN = 0.24;
const DEFAULT_MASTER_GAIN = 0.156;
const SCHEDULE_INTERVAL_MS = 120;
const SCHEDULE_AHEAD_SECONDS = 0.36;

const WORLD_ALIASES = Object.freeze({
  hindi: 'hindi',
  india: 'hindi',
  japanese: 'japanese',
  japan: 'japanese',
  spanish: 'spanish',
  mexico: 'spanish',
});

export const SOUND_DESIGN = Object.freeze({
  hindi: Object.freeze({
    title: 'Monsoon Courtyard',
    layers: Object.freeze(['tanpura-style drone', 'santoor-inspired plucks', 'soft hand-drum pulse', 'hill birds']),
  }),
  japanese: Object.freeze({
    title: 'Sakura Footpath',
    layers: Object.freeze(['koto-inspired plucks', 'breath-flute tones', 'temple bell', 'bamboo wind']),
  }),
  spanish: Object.freeze({
    title: 'Valle Evening',
    layers: Object.freeze(['nylon-guitar arpeggio', 'soft marimba', 'hand shaker', 'warm valley air']),
  }),
});

const PALETTES = Object.freeze({
  hindi: {
    stepSeconds: 0.5,
    root: 146.83,
    scale: [1, 9 / 8, 4 / 3, 3 / 2, 5 / 3, 2],
    pattern: [0, 3, 2, 4, 1, 3, 5, 2, 0, 4, 3, 1],
  },
  japanese: {
    stepSeconds: 0.58,
    root: 293.66,
    scale: [1, 9 / 8, 4 / 3, 3 / 2, 5 / 3, 2],
    pattern: [0, -1, 2, -1, 4, 3, -1, 1, 5, -1, 3, -1],
  },
  spanish: {
    stepSeconds: 0.36,
    root: 164.81,
    scale: [1, 5 / 4, 3 / 2, 2, 5 / 2, 3],
    pattern: [0, 2, 3, 4, 2, 1, 3, 5, 4, 2, 1, 3],
  },
});

function audioContextConstructor() {
  return globalThis.AudioContext || globalThis.webkitAudioContext || null;
}

function normalizeWorldId(worldId) {
  return WORLD_ALIASES[String(worldId || '').toLowerCase()] || null;
}

function clampMasterGain(value) {
  const numericValue = Number.isFinite(value) ? value : DEFAULT_MASTER_GAIN;
  return Math.min(MAX_MASTER_GAIN, Math.max(0, numericValue));
}

/**
 * Quiet, wordless procedural ambience for the Speakworld language worlds.
 *
 * Calling start() before a user gesture queues the requested world. Audio is
 * created only after a pointer, touch, or keyboard gesture unlocks Web Audio.
 */
export class CountryAmbience {
  constructor({ volume = DEFAULT_MASTER_GAIN } = {}) {
    this.current = null;
    this.muted = false;
    this.ducked = false;

    this._volume = clampMasterGain(volume);
    this._context = null;
    this._master = null;
    this._limiter = null;
    this._musicBus = null;
    this._sfxBus = null;
    this._environmentBus = null;
    this._noiseBuffer = null;
    this._timer = null;
    this._step = 0;
    this._nextStepTime = 0;
    this._gestureAccepted = false;
    this._gestureHandler = null;
    this._sources = new Set();
    this._motion = null;
    this._lastCueTimes = new Map();
    this._disposed = false;
  }

  get state() {
    return Object.freeze({
      current: this.current,
      soundtrack: SOUND_DESIGN[this.current]?.title ?? '',
      muted: this.muted,
      ducked: this.ducked,
      volume: this._volume,
      playing: Boolean(this._timer && this._context?.state === 'running'),
      motion: this._motion?.mode ?? null,
      activeVoices: this._sources.size + (this._motion ? 1 : 0),
    });
  }

  /**
   * Select and start a world palette. Returns false when the world is unknown,
   * Web Audio is unavailable, or playback is waiting for a user gesture.
   */
  start(worldId) {
    if (this._disposed) return false;

    const normalizedWorld = normalizeWorldId(worldId);
    if (!normalizedWorld) return false;

    const worldChanged = normalizedWorld !== this.current;
    this.current = normalizedWorld;
    if (worldChanged) this._resetSequence();

    if (!audioContextConstructor()) return false;

    if (this._gestureAccepted || this._hasUserActivation()) {
      this._gestureAccepted = true;
      this._removeGestureListeners();
      return this._activate();
    }

    this._addGestureListeners();
    return false;
  }

  setMuted(value) {
    this.muted = Boolean(value);
    this._applyMasterGain();
    return this.muted;
  }

  toggleMuted() {
    return this.setMuted(!this.muted);
  }

  setDucked(value) {
    this.ducked = Boolean(value);
    this._applyMixGain();
    return this.ducked;
  }

  playCue(type) {
    const context = this._context;
    const palette = PALETTES[this.current];
    if (this.muted || !context || context.state !== 'running' || !palette) return false;
    const now = context.currentTime + 0.018;
    const repeatWindow = ['footstep', 'run_step', 'bicycle_roll'].includes(type) ? 0.09 : 0.025;
    if (now - (this._lastCueTimes.get(type) ?? -Infinity) < repeatWindow) return false;
    this._lastCueTimes.set(type, now);

    if (type === 'mission_start') {
      this._pluck(palette.root * palette.scale[0] * 2, now, 0.22, 0.16, 2600, 'sfx');
      this._pluck(palette.root * palette.scale[2] * 2, now + 0.11, 0.28, 0.13, 2900, 'sfx');
      return true;
    }
    if (type === 'mission_complete') {
      [0, 2, 4].forEach((scaleIndex, index) => {
        this._bell(palette.root * palette.scale[scaleIndex] * 2, now + index * 0.11, 0.52, 0.12, 'sfx');
      });
      return true;
    }
    if (type === 'travel') {
      this._tone(palette.root, now, 0.34, 0.16, 'triangle', 0.014, 'sfx');
      this._pluck(palette.root * palette.scale[3], now + 0.09, 0.34, 0.12, 2200, 'sfx');
      return true;
    }
    if (type === 'interact') {
      this._pluck(palette.root * palette.scale[1] * 2, now, 0.16, 0.11, 2600, 'sfx');
      return true;
    }
    if (type === 'ui_open' || type === 'ui_close') {
      const direction = type === 'ui_open' ? [0, 2] : [2, 0];
      direction.forEach((index, offset) => this._tone(
        palette.root * palette.scale[index] * 2,
        now + offset * 0.055,
        0.12,
        0.075,
        'sine',
        0.006,
        'sfx',
      ));
      return true;
    }
    if (type === 'jump') {
      this._noiseVoice(now, 0.10, 0.12, 'lowpass', 520, 0.7, 0.005, 'sfx');
      this._tone(150, now, 0.16, 0.055, 'sine', 0.008, 'sfx');
      return true;
    }
    if (type === 'land') {
      this._noiseVoice(now, 0.12, 0.16, 'lowpass', 390, 0.7, 0.004, 'sfx');
      this._tone(82, now, 0.10, 0.07, 'sine', 0.004, 'sfx');
      return true;
    }
    if (type === 'footstep' || type === 'run_step') {
      const running = type === 'run_step';
      this._noiseVoice(now, running ? 0.095 : 0.075, running ? 0.12 : 0.075, 'bandpass', 310, 0.9, 0.003, 'sfx');
      this._tone(running ? 92 : 78, now, 0.07, running ? 0.052 : 0.034, 'sine', 0.003, 'sfx');
      return true;
    }
    if (type === 'bicycle_roll') {
      this._noiseVoice(now, 0.045, 0.055, 'highpass', 3100, 0.6, 0.002, 'sfx');
      return true;
    }
    if (type === 'vehicle_start') {
      this._tone(74, now, 0.34, 0.13, 'sawtooth', 0.025, 'sfx');
      this._tone(118, now + 0.08, 0.26, 0.07, 'triangle', 0.018, 'sfx');
      return true;
    }
    if (type === 'vehicle_stop') {
      this._tone(104, now, 0.20, 0.08, 'triangle', 0.008, 'sfx');
      this._noiseVoice(now + 0.05, 0.12, 0.07, 'lowpass', 650, 0.5, 0.003, 'sfx');
      return true;
    }
    if (type === 'bicycle_mount') {
      this._bell(palette.root * 3, now, 0.32, 0.09, 'sfx');
      return true;
    }
    if (type === 'transit_board') {
      [0, 3].forEach((index, offset) => this._bell(
        palette.root * palette.scale[index] * 2,
        now + offset * 0.12,
        0.55,
        0.095,
        'sfx',
      ));
      this._noiseVoice(now + 0.04, 0.34, 0.055, 'lowpass', 560, 0.5, 0.03, 'sfx');
      return true;
    }
    if (type === 'transit_stop') {
      this._bell(palette.root * 2, now, 0.65, 0.075, 'sfx');
      return true;
    }
    if (type === 'temple_bell') {
      this._bell(palette.root * 2, now, 2.4, 0.20, 'sfx');
      this._bell(palette.root * 3.01, now + 0.025, 1.8, 0.075, 'sfx');
      return true;
    }
    return false;
  }

  updateMotion(mode, speed = 0) {
    const context = this._context;
    if (!context || context.state !== 'running') return false;
    const normalizedMode = mode === 'scooter' || mode === 'train' ? mode : null;
    const currentMotionMode = this._motion?.mode ?? null;
    if (normalizedMode !== currentMotionMode) this._replaceMotionVoice(normalizedMode);
    if (!this._motion) return false;
    const absoluteSpeed = Math.abs(Number(speed) || 0);
    const now = context.currentTime;
    const frequency = this._motion.mode === 'scooter'
      ? 62 + Math.min(150, absoluteSpeed * 6.8)
      : 42 + Math.min(65, absoluteSpeed * 1.6);
    const level = this.muted ? 0.0001 : Math.min(0.10, 0.018 + absoluteSpeed * 0.0032);
    this._motion.oscillator.frequency.setTargetAtTime(frequency, now, 0.08);
    this._motion.gain.gain.setTargetAtTime(level, now, 0.10);
    return true;
  }

  dispose() {
    if (this._disposed) return;
    this._disposed = true;
    this._removeGestureListeners();
    this._stopTimer();

    for (const source of this._sources) {
      try {
        source.stop();
        source.disconnect();
      } catch {
        // A source may already have ended between iteration and cleanup.
      }
    }
    this._sources.clear();
    this._replaceMotionVoice(null);

    try {
      this._master?.disconnect();
      this._limiter?.disconnect();
    } catch {
      // Disconnection is best-effort during teardown.
    }

    const context = this._context;
    if (context && context.state !== 'closed') {
      Promise.resolve(context.close()).catch(() => {});
    }

    this._context = null;
    this._master = null;
    this._limiter = null;
    this._musicBus = null;
    this._sfxBus = null;
    this._environmentBus = null;
    this._noiseBuffer = null;
    this.current = null;
  }

  _hasUserActivation() {
    const activation = globalThis.navigator?.userActivation;
    return Boolean(activation?.isActive || activation?.hasBeenActive);
  }

  _addGestureListeners() {
    if (this._gestureHandler || typeof globalThis.addEventListener !== 'function') return;

    this._gestureHandler = () => {
      this._gestureAccepted = true;
      this._removeGestureListeners();
      this._activate();
    };

    globalThis.addEventListener('pointerdown', this._gestureHandler, { capture: true, once: true });
    globalThis.addEventListener('touchend', this._gestureHandler, { capture: true, once: true });
    globalThis.addEventListener('keydown', this._gestureHandler, { capture: true, once: true });
  }

  _removeGestureListeners() {
    if (!this._gestureHandler || typeof globalThis.removeEventListener !== 'function') return;
    globalThis.removeEventListener('pointerdown', this._gestureHandler, true);
    globalThis.removeEventListener('touchend', this._gestureHandler, true);
    globalThis.removeEventListener('keydown', this._gestureHandler, true);
    this._gestureHandler = null;
  }

  _activate() {
    if (this._disposed || !this.current) return false;

    try {
      if (!this._context) {
        const AudioContextClass = audioContextConstructor();
        if (!AudioContextClass) return false;
        this._context = new AudioContextClass();
        this._master = this._context.createGain();
        this._limiter = this._context.createDynamicsCompressor();
        this._musicBus = this._context.createGain();
        this._sfxBus = this._context.createGain();
        this._environmentBus = this._context.createGain();
        this._master.gain.value = this.muted ? 0 : this._volume;
        this._limiter.threshold.value = -8;
        this._limiter.knee.value = 8;
        this._limiter.ratio.value = 12;
        this._limiter.attack.value = 0.003;
        this._limiter.release.value = 0.18;
        this._musicBus.gain.value = this.ducked ? 0.10 : 0.96;
        this._sfxBus.gain.value = 1.0;
        this._environmentBus.gain.value = this.ducked ? 0.08 : 0.56;
        this._musicBus.connect(this._master);
        this._sfxBus.connect(this._master);
        this._environmentBus.connect(this._master);
        this._master.connect(this._limiter);
        this._limiter.connect(this._context.destination);
      }

      if (this._context.state === 'running') {
        this._startTimer();
        return true;
      }

      Promise.resolve(this._context.resume())
        .then(() => {
          if (!this._disposed && this._context?.state === 'running') this._startTimer();
        })
        .catch(() => {
          // Some browsers require a fresh gesture after a failed resume.
          this._gestureAccepted = false;
          this._addGestureListeners();
        });
      return false;
    } catch {
      // Web Audio can be present yet blocked by browser/device policy.
      return false;
    }
  }

  _startTimer() {
    if (this._timer || !this._context || this._context.state !== 'running') return;
    this._nextStepTime = Math.max(this._nextStepTime, this._context.currentTime + 0.04);
    this._scheduleAhead();
    this._timer = globalThis.setInterval(() => this._scheduleAhead(), SCHEDULE_INTERVAL_MS);
  }

  _stopTimer() {
    if (!this._timer) return;
    globalThis.clearInterval(this._timer);
    this._timer = null;
  }

  _resetSequence() {
    this._step = Math.floor(Math.random() * 4);
    this._nextStepTime = this._context?.currentTime + 0.06 || 0;
  }

  _scheduleAhead() {
    const context = this._context;
    const palette = PALETTES[this.current];
    if (!context || !palette || context.state !== 'running') return;

    const horizon = context.currentTime + SCHEDULE_AHEAD_SECONDS;
    let safety = 0;
    while (this._nextStepTime < horizon && safety < 12) {
      this._scheduleStep(this.current, palette, this._step, this._nextStepTime);
      this._nextStepTime += palette.stepSeconds;
      this._step += 1;
      safety += 1;
    }
  }

  _scheduleStep(world, palette, step, time) {
    const patternIndex = step % palette.pattern.length;
    const scaleIndex = palette.pattern[patternIndex];

    if (world === 'hindi') {
      if (step % 12 === 0) {
        this._tone(palette.root / 2, time, 4.6, 0.105, 'sine', 0.45);
        this._tone(palette.root * 0.75, time + 0.04, 4.1, 0.045, 'triangle', 0.65);
      }
      this._pluck(palette.root * palette.scale[scaleIndex], time, 0.54, 0.115, 2100);
      if (step % 4 === 0) this._handDrum(time + 0.02, step % 8 === 0 ? 0.075 : 0.045);
      if (step % 6 === 4) this._bell(palette.root * 4, time + 0.12, 1.2, 0.045);
      if (step % 24 === 17) this._bird(time + 0.18, palette.root * 5, 'environment');
      return;
    }

    if (world === 'japanese') {
      if (step % 8 === 0) this._wind(time, 2.9, 0.035, 'environment');
      if (scaleIndex >= 0) {
        const octave = step % 12 === 8 ? 2 : 1;
        this._pluck(palette.root * palette.scale[scaleIndex] * octave, time, 0.82, 0.075, 3200);
      }
      if (step % 16 === 6) this._tone(palette.root * 0.5, time, 2.6, 0.034, 'sine', 0.44);
      if (step % 32 === 23) this._bell(palette.root, time, 2.8, 0.038);
      if (step % 24 === 13) this._bird(time + 0.12, palette.root * 3, 'environment');
      return;
    }

    if (world === 'spanish') {
      const chordShift = Math.floor(step / palette.pattern.length) % 2 === 0 ? 1 : 9 / 8;
      this._guitar(palette.root * palette.scale[scaleIndex] * chordShift, time, 0.68, 0.095);
      if (step % 2 === 0) this._shaker(time + 0.09, 0.052, 0.055);
      if (step % 4 === 2) this._marimba(palette.root * palette.scale[(scaleIndex + 2) % palette.scale.length], time + 0.06, 0.065);
      if (step % 12 === 0) this._guitar(palette.root / 2, time, 1.45, 0.08);
      if (step % 28 === 19) this._wind(time, 2.5, 0.018, 'environment');
    }
  }

  _outputBus(name = 'music') {
    if (name === 'sfx') return this._sfxBus ?? this._master;
    if (name === 'environment') return this._environmentBus ?? this._master;
    return this._musicBus ?? this._master;
  }

  _tone(frequency, time, duration, level, type = 'sine', attack = 0.015, bus = 'music') {
    const context = this._context;
    if (!context || !this._master) return;

    try {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, time);
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(level, time + Math.min(attack, duration * 0.45));
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      oscillator.connect(gain);
      gain.connect(this._outputBus(bus));
      this._startTrackedSource(oscillator, time, time + duration + 0.04);
    } catch {
      // Ignore individual voices if a context is interrupted mid-schedule.
    }
  }

  _pluck(frequency, time, duration, level, cutoff, bus = 'music') {
    const context = this._context;
    if (!context || !this._master) return;

    try {
      const oscillator = context.createOscillator();
      const filter = context.createBiquadFilter();
      const gain = context.createGain();
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(frequency, time);
      oscillator.detune.setValueAtTime((Math.random() - 0.5) * 5, time);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(cutoff, time);
      filter.frequency.exponentialRampToValueAtTime(420, time + duration);
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(level, time + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      oscillator.connect(filter);
      filter.connect(gain);
      gain.connect(this._outputBus(bus));
      this._startTrackedSource(oscillator, time, time + duration + 0.03);
    } catch {
      // Ignore individual voices if a context is interrupted mid-schedule.
    }
  }

  _bell(frequency, time, duration, level, bus = 'music') {
    this._tone(frequency, time, duration, level, 'sine', 0.006, bus);
    this._tone(frequency * 2.01, time, duration * 0.7, level * 0.32, 'sine', 0.004, bus);
  }

  _guitar(frequency, time, duration, level, bus = 'music') {
    this._pluck(frequency, time, duration, level, 1850, bus);
    this._tone(frequency * 2, time + 0.004, duration * 0.48, level * 0.18, 'sine', 0.008, bus);
  }

  _marimba(frequency, time, level, bus = 'music') {
    this._tone(frequency, time, 0.42, level, 'sine', 0.004, bus);
    this._tone(frequency * 3.98, time, 0.18, level * 0.18, 'sine', 0.003, bus);
  }

  _handDrum(time, level, bus = 'music') {
    this._tone(96, time, 0.13, level, 'sine', 0.003, bus);
    this._noiseVoice(time, 0.075, level * 0.55, 'bandpass', 420, 0.85, 0.002, bus);
  }

  _bird(time, frequency, bus = 'environment') {
    this._tone(frequency, time, 0.13, 0.026, 'sine', 0.008, bus);
    this._tone(frequency * 1.18, time + 0.10, 0.16, 0.022, 'sine', 0.006, bus);
  }

  _wind(time, duration, level, bus = 'environment') {
    this._noiseVoice(time, duration, level, 'bandpass', 1050, 0.65, duration * 0.38, bus);
  }

  _shaker(time, duration, level, bus = 'music') {
    this._noiseVoice(time, duration, level, 'highpass', 5200, 0.8, 0.006, bus);
  }

  _noiseVoice(time, duration, level, filterType, frequency, q, attack, bus = 'music') {
    const context = this._context;
    if (!context || !this._master) return;

    try {
      const source = context.createBufferSource();
      const filter = context.createBiquadFilter();
      const gain = context.createGain();
      const buffer = this._getNoiseBuffer();
      if (!buffer) return;

      source.buffer = buffer;
      filter.type = filterType;
      filter.frequency.setValueAtTime(frequency, time);
      filter.Q.setValueAtTime(q, time);
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(level, time + Math.min(attack, duration * 0.45));
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this._outputBus(bus));

      const maxOffset = Math.max(0, buffer.duration - duration - 0.02);
      source.start(time, Math.random() * maxOffset, duration);
      source.stop(time + duration + 0.02);
      this._trackSource(source);
    } catch {
      // Ignore individual voices if a context is interrupted mid-schedule.
    }
  }

  _getNoiseBuffer() {
    if (this._noiseBuffer || !this._context) return this._noiseBuffer;

    const frameCount = Math.ceil(this._context.sampleRate * 3.2);
    const buffer = this._context.createBuffer(1, frameCount, this._context.sampleRate);
    const channel = buffer.getChannelData(0);
    let previous = 0;
    for (let index = 0; index < frameCount; index += 1) {
      const white = Math.random() * 2 - 1;
      previous = previous * 0.18 + white * 0.82;
      channel[index] = previous;
    }
    this._noiseBuffer = buffer;
    return buffer;
  }

  _startTrackedSource(source, startTime, stopTime) {
    source.start(startTime);
    source.stop(stopTime);
    this._trackSource(source);
  }

  _replaceMotionVoice(mode) {
    if (this._motion) {
      const previous = this._motion;
      this._motion = null;
      try {
        const now = this._context?.currentTime ?? 0;
        previous.gain.gain.cancelScheduledValues(now);
        previous.gain.gain.setValueAtTime(Math.max(0.0001, previous.gain.gain.value), now);
        previous.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
        previous.oscillator.stop(now + 0.10);
      } catch {
        try { previous.oscillator.stop(); } catch { /* already stopped */ }
      }
    }
    if (!mode || !this._context || !this._sfxBus) return;
    try {
      const now = this._context.currentTime;
      const oscillator = this._context.createOscillator();
      const filter = this._context.createBiquadFilter();
      const gain = this._context.createGain();
      oscillator.type = mode === 'scooter' ? 'sawtooth' : 'triangle';
      oscillator.frequency.value = mode === 'scooter' ? 62 : 42;
      filter.type = 'lowpass';
      filter.frequency.value = mode === 'scooter' ? 520 : 260;
      gain.gain.value = 0.0001;
      oscillator.connect(filter);
      filter.connect(gain);
      gain.connect(this._sfxBus);
      oscillator.start(now);
      this._motion = { mode, oscillator, filter, gain };
    } catch {
      this._motion = null;
    }
  }

  _trackSource(source) {
    this._sources.add(source);
    source.addEventListener('ended', () => {
      this._sources.delete(source);
      try {
        source.disconnect();
      } catch {
        // The source may already have been disconnected by dispose().
      }
    }, { once: true });
  }

  _applyMasterGain() {
    if (!this._master || !this._context || this._context.state === 'closed') return;
    const now = this._context.currentTime;
    const target = this.muted ? 0 : this._volume;
    try {
      this._master.gain.cancelScheduledValues(now);
      this._master.gain.setValueAtTime(this._master.gain.value, now);
      this._master.gain.linearRampToValueAtTime(target, now + 0.08);
    } catch {
      this._master.gain.value = target;
    }
  }

  _applyMixGain() {
    if (!this._context || this._context.state === 'closed') return;
    const now = this._context.currentTime;
    const musicTarget = this.ducked ? 0.10 : 0.96;
    const environmentTarget = this.ducked ? 0.08 : 0.56;
    for (const [bus, target] of [[this._musicBus, musicTarget], [this._environmentBus, environmentTarget]]) {
      if (!bus) continue;
      try {
        bus.gain.cancelScheduledValues(now);
        bus.gain.setValueAtTime(bus.gain.value, now);
        bus.gain.linearRampToValueAtTime(target, now + 0.22);
      } catch {
        bus.gain.value = target;
      }
    }
  }
}

export default CountryAmbience;
