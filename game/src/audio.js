// Midnight Vault — small WebAudio sounds, generated in code.
//
// No sound files: every effect is an oscillator blip, so the game stays
// self-contained. Sounds only start after the player's first key press,
// which is when browsers allow audio.

let ctx = null;
let muted = false;

export function setMuted(value) {
  muted = value;
}

export function isMuted() {
  return muted;
}

function ensureContext() {
  if (!ctx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    ctx = new AudioContext();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function blip(freq, duration, type, volume, when = 0) {
  if (muted) return;
  const audio = ensureContext();
  if (!audio) return;
  const start = audio.currentTime + when;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(gain).connect(audio.destination);
  osc.start(start);
  osc.stop(start + duration);
}

export function playPickup() {
  blip(660, 0.12, 'sine', 0.18);
  blip(990, 0.18, 'sine', 0.18, 0.09);
}

export function playCoin() {
  blip(1320, 0.07, 'triangle', 0.14);
  blip(1760, 0.09, 'triangle', 0.12, 0.06);
}

export function playSmoke() {
  blip(220, 0.35, 'sawtooth', 0.08);
}

export function playJammer() {
  blip(440, 0.1, 'square', 0.08);
  blip(330, 0.14, 'square', 0.08, 0.08);
}

export function playCaught() {
  blip(392, 0.18, 'sawtooth', 0.16);
  blip(311, 0.18, 'sawtooth', 0.16, 0.16);
  blip(233, 0.4, 'sawtooth', 0.16, 0.32);
}

export function playClear() {
  blip(523, 0.12, 'sine', 0.16);
  blip(659, 0.12, 'sine', 0.16, 0.1);
  blip(784, 0.24, 'sine', 0.16, 0.2);
}

export function playAlert() {
  blip(880, 0.09, 'square', 0.06);
}
