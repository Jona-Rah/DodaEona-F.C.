/**
 * Authentic referee whistle and matchday stadium audio synthesized via Web Audio API.
 * Zero external audio dependencies required, guaranteed instant playback.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playWhistle(type: 'kickoff' | 'halftime' | 'fulltime' | 'goal'): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  const createWhistleBlast = (startTime: number, duration: number, freq = 2850) => {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    // Dual-tone high pitch referee whistle
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, startTime);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq + 320, startTime);

    // Whistle air envelope
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.18, startTime + 0.02);
    gain.gain.setValueAtTime(0.18, startTime + duration - 0.04);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(startTime + duration);
    osc2.stop(startTime + duration);
  };

  if (type === 'kickoff') {
    // Single sharp whistle blast (0.45s)
    createWhistleBlast(now, 0.45);
  } else if (type === 'halftime') {
    // Two short whistle blasts
    createWhistleBlast(now, 0.28);
    createWhistleBlast(now + 0.38, 0.45);
  } else if (type === 'fulltime') {
    // Three whistle blasts (short, short, long final whistle)
    createWhistleBlast(now, 0.25);
    createWhistleBlast(now + 0.35, 0.25);
    createWhistleBlast(now + 0.70, 0.85);
  } else if (type === 'goal') {
    // Euphoric goal horn chord
    const freqs = [220, 277.18, 329.63, 440]; // A major chord
    freqs.forEach((f) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.25);
    });
  }
}
