// Web Audio API Sound Synthesizer for Photobooth FX

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Mechanical camera shutter click sound synthesis (realistic two-stage click)
 */
export function playShutterSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // 1. Initial click (shutter release)
  const clickOsc = ctx.createOscillator();
  const clickGain = ctx.createGain();
  clickOsc.type = 'triangle';
  clickOsc.frequency.setValueAtTime(900, now);
  clickOsc.frequency.exponentialRampToValueAtTime(120, now + 0.04);

  clickGain.gain.setValueAtTime(0.4, now);
  clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

  clickOsc.connect(clickGain);
  clickGain.connect(ctx.destination);

  clickOsc.start(now);
  clickOsc.stop(now + 0.05);

  // 2. Mechanical noise burst (mirror movement)
  const bufferSize = ctx.sampleRate * 0.07;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1400, now + 0.02);
  filter.Q.setValueAtTime(1.5, now + 0.02);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.35, now + 0.02);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(ctx.destination);

  noise.start(now + 0.02);
  noise.stop(now + 0.09);

  // 3. Second click (shutter curtain closing)
  const secondClickOsc = ctx.createOscillator();
  const secondClickGain = ctx.createGain();
  secondClickOsc.type = 'sine';
  secondClickOsc.frequency.setValueAtTime(600, now + 0.07);
  secondClickOsc.frequency.exponentialRampToValueAtTime(80, now + 0.12);

  secondClickGain.gain.setValueAtTime(0.3, now + 0.07);
  secondClickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

  secondClickOsc.connect(secondClickGain);
  secondClickGain.connect(ctx.destination);

  secondClickOsc.start(now + 0.07);
  secondClickOsc.stop(now + 0.13);
}

/**
 * Countdown timer beep
 */
export function playBeepSound(frequency = 880, duration = 0.08, isFinal = false): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = isFinal ? 'triangle' : 'sine';
  osc.frequency.setValueAtTime(isFinal ? 1320 : frequency, now);

  gain.gain.setValueAtTime(0.25, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration);
}

/**
 * Success chime for session completion
 */
export function playSuccessChime(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
  const now = ctx.currentTime;

  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + idx * 0.08);

    gain.gain.setValueAtTime(0.18, now + idx * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + idx * 0.08);
    osc.stop(now + idx * 0.08 + 0.35);
  });
}
