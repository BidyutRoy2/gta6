// Sound, synthesised live with WebAudio: no audio files, no network. An
// engine hum that follows the car's speed, a two-tone police siren, gunshots,
// a punch thud, a crash crunch and mission chimes. Everything is created on
// the first user gesture; until then the game is silent.
//
// The radio is three stations of procedural music: a step sequencer plays
// a fixed bass-and-melody pattern per station (see RADIO in config.js),
// scheduled a beat ahead of the audio clock. No samples, no randomness —
// the same station always plays the same tune.
import { RADIO } from './config.js';

// Melody lines as scale-degree indices (-1 = rest), one per station,
// 32 eighth-note steps each. Bass plays the root on the beat under them.
const MELODIES = [
  [0, -1, 2, -1, 4, -1, 2, -1, 5, -1, 4, -1, 2, -1, 1, -1, 0, -1, 2, -1, 4, -1, 5, -1, 4, 2, 1, -1, 0, -1, -1, -1],
  [4, -1, -1, 2, -1, 0, -1, -1, 1, -1, 2, -1, -1, 4, -1, -1, 5, -1, 4, 2, -1, 1, -1, -1, 0, -1, -1, -1, -1, -1, -1, -1],
  [0, -1, -1, -1, 2, -1, -1, -1, 4, -1, -1, -1, 2, -1, -1, -1, 1, -1, -1, -1, 2, -1, -1, -1, 0, -1, -1, -1, -1, -1, -1, -1],
];
export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenLfo = null;
  let muted = false;
  let started = false;
  // Radio sequencer state.
  let radioStation = -1;
  let radioStep = 0;
  let radioNextT = 0;

  function ensure() {
    if (started) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 700;
      sirenLfo = ctx.createOscillator();
      sirenLfo.type = 'square';
      sirenLfo.frequency.value = 0.9;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 260;
      sirenLfo.connect(lfoGain);
      lfoGain.connect(sirenOsc.frequency);
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
      sirenLfo.start();
      started = true;
    } catch {
      ctx = null;
    }
  }

  function noiseBurst(duration, volume, lowpass) {
    if (!ctx) return;
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    // Deterministic noise: a tiny LCG, so the sound never depends on Math.random.
    let s = 1234567;
    for (let i = 0; i < length; i += 1) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      data[i] = (s / 0x7fffffff * 2 - 1) * (1 - i / length);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start();
  }

  function tone(freq, duration, volume, type) {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  function radioNote(freq, at, duration, volume, type) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, at);
    gain.gain.exponentialRampToValueAtTime(0.001, at + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(at);
    osc.stop(at + duration);
  }

  return {
    ensure,
    get muted() { return muted; },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    /** speed01: 0 parked, 1 flat out. Call every frame while driving. */
    engine(speed01, driving) {
      if (!ctx || !engineGain) return;
      const target = driving ? 0.05 + speed01 * 0.11 : 0;
      engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.08);
      engineOsc.frequency.setTargetAtTime(52 + speed01 * 95, ctx.currentTime, 0.08);
    },
    siren(on) {
      if (!ctx || !sirenGain) return;
      sirenGain.gain.setTargetAtTime(on ? 0.045 : 0, ctx.currentTime, 0.15);
    },
    /**
     * The car radio. Call every frame with the tuned station index and
     * whether it should be audible (in a car, unmuted). Notes are
     * scheduled a quarter-second ahead of the audio clock; switching
     * station restarts that station's pattern from the top.
     */
    radio(stationIndex, on) {
      if (!ctx) return;
      if (!on) { radioStation = -1; return; }
      if (radioStation !== stationIndex) {
        radioStation = stationIndex;
        radioStep = 0;
        radioNextT = ctx.currentTime + 0.05;
      }
      const st = RADIO.stations[stationIndex];
      const melody = MELODIES[stationIndex % MELODIES.length];
      const stepDur = 60 / st.tempo / 2; // eighth notes
      while (radioNextT < ctx.currentTime + 0.25) {
        const step = radioStep % 32;
        // Bass: root on the beat, the fifth halfway through the bar.
        if (step % 4 === 0) {
          const semis = step === 16 ? 7 : 0;
          radioNote(st.root * Math.pow(2, semis / 12) / 2, radioNextT, stepDur * 1.8, 0.09, 'triangle');
        }
        const degree = melody[step];
        if (degree >= 0) {
          const semis = st.scale[degree % st.scale.length];
          radioNote(st.root * Math.pow(2, semis / 12), radioNextT, stepDur * 1.6, 0.055, st.wave);
        }
        radioStep += 1;
        radioNextT += stepDur;
      }
    },
    shot() { noiseBurst(0.12, 0.5, 2800); tone(160, 0.08, 0.25, 'square'); },
    thud() { noiseBurst(0.09, 0.35, 500); tone(90, 0.1, 0.3, 'sine'); },
    crash() { noiseBurst(0.25, 0.5, 900); },
    chime() { tone(660, 0.16, 0.25); setTimeout(() => tone(880, 0.28, 0.25), 130); },
    fail() { tone(220, 0.3, 0.25, 'sawtooth'); setTimeout(() => tone(165, 0.4, 0.25, 'sawtooth'), 160); },
    pickup() { tone(520, 0.1, 0.2); setTimeout(() => tone(780, 0.14, 0.2), 90); },
  };
}
