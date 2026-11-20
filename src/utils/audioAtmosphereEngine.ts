// ============================================================================
// DodaEona F.C. Advanced Web Audio & Atmosphere Engine
// High-Fidelity Generative Stadium Soundscapes & Real Audio Atmosphere System
// ============================================================================

export type SoundscapePresetId =
  | 'stadium'
  | 'champions'
  | 'lofi'
  | 'tunnel'
  | 'reflection'
  | 'anthem';

export type SoundEffectType = 'whistle' | 'roar' | 'crossbar' | 'drum';

export interface SoundPresetMeta {
  id: SoundscapePresetId;
  title: string;
  artist: string;
  category: 'Matchday Stadium' | 'Cinematic Night' | 'Tactical Focus' | 'Club Anthem';
  durationLabel: string;
  bpm?: number;
  description: string;
  waveformColor: string;
}

export const CURATED_ATMOSPHERE_PRESETS: SoundPresetMeta[] = [];

class AudioAtmosphereEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private activeGenerators: Array<{ stop: () => void }> = [];
  private htmlAudio: HTMLAudioElement | null = null;
  private currentVolume = 0.35;
  private isMuted = false;
  private isRunning = false;
  private frequencyDataArray: Uint8Array | null = null;

  private initContext() {
    if (this.ctx && this.ctx.state !== 'closed') {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    }
    const AudioCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return null;

    try {
      this.ctx = new AudioCtor();
      const master = this.ctx.createGain();
      master.gain.setValueAtTime(this.isMuted ? 0 : this.currentVolume, this.ctx.currentTime);

      const analyser = this.ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.82;

      master.connect(analyser);
      analyser.connect(this.ctx.destination);

      this.masterGain = master;
      this.analyser = analyser;
      this.frequencyDataArray = new Uint8Array(analyser.frequencyBinCount);
      return this.ctx;
    } catch {
      return null;
    }
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public getFrequencyData(): Uint8Array {
    if (this.analyser && this.frequencyDataArray && this.isRunning && !this.isMuted) {
      this.analyser.getByteFrequencyData(this.frequencyDataArray as any);
      return this.frequencyDataArray;
    }
    // Return quiet or zero array
    if (!this.frequencyDataArray) {
      this.frequencyDataArray = new Uint8Array(32);
    }
    this.frequencyDataArray.fill(0);
    return this.frequencyDataArray;
  }

  private htmlAudioConnectedToWebAudio = false;

  public setVolume(vol: number) {
    const clamped = Math.max(0, Math.min(1, vol));
    this.currentVolume = clamped;
    if (this.htmlAudio && !this.htmlAudioConnectedToWebAudio) {
      this.htmlAudio.volume = this.isMuted ? 0 : clamped;
    }
    if (this.masterGain && this.ctx) {
      const gainScale = this.htmlAudio && this.htmlAudioConnectedToWebAudio ? 1.0 : 0.45;
      const targetGain = this.isMuted ? 0 : clamped * gainScale;
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime);
      this.masterGain.gain.linearRampToValueAtTime(targetGain, this.ctx.currentTime + 0.1);
    }
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    this.setVolume(this.currentVolume);
  }

  public setLoop(loop: boolean) {
    if (this.htmlAudio) {
      this.htmlAudio.loop = loop;
    }
  }

  public stop() {
    this.isRunning = false;
    // Stop active audio generators
    for (const g of this.activeGenerators) {
      try {
        g.stop();
      } catch {
        // ignore
      }
    }
    this.activeGenerators = [];

    // Stop HTML audio
    if (this.htmlAudio) {
      this.htmlAudio.onended = null;
      this.htmlAudio.pause();
      this.htmlAudio.removeAttribute('src');
      this.htmlAudio.load();
      this.htmlAudio = null;
    }
    this.htmlAudioConnectedToWebAudio = false;
  }

  // ==========================================================================
  // PLAY STREAM / URL / UPLOADED AUDIO
  // ==========================================================================
  public playAudioUrl(url: string, onEnded?: () => void, loop = false) {
    this.stop();
    const ctx = this.initContext();
    this.isRunning = true;

    try {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.src = url;
      audio.loop = loop;

      audio.onended = () => {
        if (onEnded) onEnded();
      };

      if (ctx && this.masterGain) {
        try {
          const source = ctx.createMediaElementSource(audio);
          source.connect(this.masterGain);
          this.htmlAudioConnectedToWebAudio = true;
          audio.volume = 1;
        } catch {
          this.htmlAudioConnectedToWebAudio = false;
          audio.volume = this.isMuted ? 0 : this.currentVolume;
        }
      } else {
        this.htmlAudioConnectedToWebAudio = false;
        audio.volume = this.isMuted ? 0 : this.currentVolume;
      }

      this.htmlAudio = audio;
      this.setVolume(this.currentVolume);

      audio.play().catch(() => {
        // Autoplay policy or error
      });
    } catch {
      // Fallback
    }
  }

  // ==========================================================================
  // SYNTHESIZED SOUNDSCAPES
  // ==========================================================================
  public playSoundscape(presetId: SoundscapePresetId | string, customFreq?: number) {
    this.stop();
    const ctx = this.initContext();
    if (!ctx || !this.masterGain) return;
    this.isRunning = true;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const resolved = (presetId.toLowerCase().trim() as SoundscapePresetId) || 'stadium';

    switch (resolved) {
      case 'stadium':
        this.generateStadiumAtmosphere(ctx, this.masterGain);
        break;
      case 'champions':
        this.generateChampionsPad(ctx, this.masterGain);
        break;
      case 'lofi':
        this.generateLofiTactics(ctx, this.masterGain);
        break;
      case 'tunnel':
        this.generateTunnelHeartbeat(ctx, this.masterGain);
        break;
      case 'reflection':
        this.generateReflectionChime(ctx, this.masterGain);
        break;
      case 'anthem':
        this.generateAnthemArp(ctx, this.masterGain);
        break;
      default:
        this.generateCustomTone(ctx, this.masterGain, customFreq || 110);
        break;
    }
  }

  // 1. San Siro Matchday Atmosphere
  private generateStadiumAtmosphere(ctx: AudioContext, destination: GainNode) {
    // Generate pink noise buffer for realistic stadium crowd murmur
    const bufferSize = ctx.sampleRate * 4;
    const noiseBuffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
    const left = noiseBuffer.getChannelData(0);
    const right = noiseBuffer.getChannelData(1);

    let b0L = 0, b1L = 0, b2L = 0, b3L = 0, b4L = 0, b5L = 0;
    let b0R = 0, b1R = 0, b2R = 0, b3R = 0, b4R = 0, b5R = 0;

    for (let i = 0; i < bufferSize; i++) {
      const whiteL = Math.random() * 2 - 1;
      b0L = 0.99886 * b0L + whiteL * 0.0555179;
      b1L = 0.99332 * b1L + whiteL * 0.0750759;
      b2L = 0.96900 * b2L + whiteL * 0.1538520;
      b3L = 0.86650 * b3L + whiteL * 0.3104856;
      b4L = 0.55000 * b4L + whiteL * 0.5329522;
      b5L = -0.7616 * b5L - whiteL * 0.0168980;
      left[i] = (b0L + b1L + b2L + b3L + b4L + b5L + whiteL * 0.5362) * 0.11;

      const whiteR = Math.random() * 2 - 1;
      b0R = 0.99886 * b0R + whiteR * 0.0555179;
      b1R = 0.99332 * b1R + whiteR * 0.0750759;
      b2R = 0.96900 * b2R + whiteR * 0.1538520;
      b3R = 0.86650 * b3R + whiteR * 0.3104856;
      b4R = 0.55000 * b4R + whiteR * 0.5329522;
      b5R = -0.7616 * b5R - whiteR * 0.0168980;
      right[i] = (b0R + b1R + b2R + b3R + b4R + b5R + whiteR * 0.5362) * 0.11;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    // Dual bandpass filters to simulate crowd acoustic frequency resonance
    const filter1 = ctx.createBiquadFilter();
    filter1.type = 'bandpass';
    filter1.frequency.setValueAtTime(420, ctx.currentTime);
    filter1.Q.setValueAtTime(1.8, ctx.currentTime);

    const filter2 = ctx.createBiquadFilter();
    filter2.type = 'lowpass';
    filter2.frequency.setValueAtTime(1100, ctx.currentTime);

    // LFO to simulate rising and falling waves of cheering crowd chants
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.18, ctx.currentTime); // slow crowd swell
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(280, ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(filter1.frequency);

    // Stadium sub-bass acoustic rumble
    const subOsc = ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(55, ctx.currentTime);
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.08, ctx.currentTime);

    const crowdGain = ctx.createGain();
    crowdGain.gain.setValueAtTime(0.01, ctx.currentTime);
    crowdGain.gain.linearRampToValueAtTime(0.42, ctx.currentTime + 1.2);

    noiseSource.connect(filter1);
    filter1.connect(filter2);
    filter2.connect(crowdGain);
    subOsc.connect(subGain);
    subGain.connect(crowdGain);
    crowdGain.connect(destination);

    noiseSource.start();
    lfo.start();
    subOsc.start();

    // Distant Ultras Drum Cadence interval
    let drumTimer: number | null = null;
    const playDistantDrum = () => {
      if (!this.isRunning) return;
      try {
        const drumOsc = ctx.createOscillator();
        const drumGain = ctx.createGain();
        drumOsc.type = 'triangle';
        drumOsc.frequency.setValueAtTime(80, ctx.currentTime);
        drumOsc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.35);

        drumGain.gain.setValueAtTime(0.15, ctx.currentTime);
        drumGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

        drumOsc.connect(drumGain);
        drumGain.connect(destination);
        drumOsc.start(ctx.currentTime);
        drumOsc.stop(ctx.currentTime + 0.45);
      } catch {
        // ignore
      }
    };

    drumTimer = window.setInterval(playDistantDrum, 3200);

    this.activeGenerators.push({
      stop: () => {
        if (drumTimer) clearInterval(drumTimer);
        try {
          noiseSource.stop();
          lfo.stop();
          subOsc.stop();
        } catch {
          // ignore
        }
      },
    });
  }

  // 2. UEFA Champions Night Harmonix (Rich Choir & Strings Pad)
  private generateChampionsPad(ctx: AudioContext, destination: GainNode) {
    const chordFrequencies = [
      [146.83, 220.0, 261.63, 349.23], // Dm (D3, A3, C4, F4)
      [116.54, 174.61, 233.08, 293.66], // Bb (Bb2, F3, Bb3, D4)
      [174.61, 220.0, 261.63, 349.23], // F (F3, A3, C4, F4)
      [130.81, 196.0, 261.63, 329.63], // C (C3, G3, C4, E4)
    ];

    let chordIndex = 0;
    const gainNodes: GainNode[] = [];
    const oscs: OscillatorNode[] = [];

    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.setValueAtTime(680, ctx.currentTime);
    padFilter.Q.setValueAtTime(1.5, ctx.currentTime);

    // Chorus detune
    const padGain = ctx.createGain();
    padGain.gain.setValueAtTime(0.01, ctx.currentTime);
    padGain.gain.linearRampToValueAtTime(0.28, ctx.currentTime + 1.5);

    padFilter.connect(padGain);
    padGain.connect(destination);

    // Create 4 polyphonic voices
    for (let i = 0; i < 4; i++) {
      const osc = ctx.createOscillator();
      osc.type = i % 2 === 0 ? 'sine' : 'sawtooth';
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.12, ctx.currentTime);

      osc.connect(g);
      g.connect(padFilter);
      osc.start();
      oscs.push(osc);
      gainNodes.push(g);
    }

    const applyChord = (idx: number) => {
      const chord = chordFrequencies[idx % chordFrequencies.length];
      const now = ctx.currentTime;
      for (let i = 0; i < 4; i++) {
        oscs[i].frequency.setTargetAtTime(chord[i], now, 0.4);
      }
      padFilter.frequency.setTargetAtTime(600 + Math.random() * 250, now, 0.6);
    };

    applyChord(0);
    const chordTimer = window.setInterval(() => {
      if (!this.isRunning) return;
      chordIndex++;
      applyChord(chordIndex);
    }, 4500);

    this.activeGenerators.push({
      stop: () => {
        clearInterval(chordTimer);
        for (const o of oscs) {
          try {
            o.stop();
          } catch {
            // ignore
          }
        }
      },
    });
  }

  // 3. Tactical Studio Lo-Fi Chill (Warm Rhodes + Vinyl Crackle)
  private generateLofiTactics(ctx: AudioContext, destination: GainNode) {
    const chords = [
      [116.54, 233.08, 293.66, 349.23, 440.0], // Bbmaj7
      [110.0, 220.0, 261.63, 329.63, 392.0], // Am7
      [98.0, 196.0, 233.08, 293.66, 349.23], // Gm7
      [87.31, 174.61, 220.0, 261.63, 329.63], // Fmaj7
    ];

    let chordIdx = 0;
    const oscs: OscillatorNode[] = [];
    const mainGain = ctx.createGain();
    mainGain.gain.setValueAtTime(0.01, ctx.currentTime);
    mainGain.gain.linearRampToValueAtTime(0.24, ctx.currentTime + 1.0);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(540, ctx.currentTime);

    filter.connect(mainGain);
    mainGain.connect(destination);

    for (let i = 0; i < 5; i++) {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.connect(filter);
      osc.start();
      oscs.push(osc);
    }

    const setChords = (c: number[]) => {
      const now = ctx.currentTime;
      for (let i = 0; i < c.length; i++) {
        oscs[i].frequency.setTargetAtTime(c[i], now, 0.25);
      }
    };
    setChords(chords[0]);

    // Lo-Fi Beat / Chords cadence (78 BPM: ~3.07 sec per bar)
    const timer = window.setInterval(() => {
      if (!this.isRunning) return;
      chordIdx = (chordIdx + 1) % chords.length;
      setChords(chords[chordIdx]);

      // Soft rimshot pulse
      try {
        const rim = ctx.createOscillator();
        const rimGain = ctx.createGain();
        rim.type = 'sine';
        rim.frequency.setValueAtTime(160, ctx.currentTime);
        rimGain.gain.setValueAtTime(0.04, ctx.currentTime);
        rimGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        rim.connect(rimGain);
        rimGain.connect(destination);
        rim.start(ctx.currentTime);
        rim.stop(ctx.currentTime + 0.16);
      } catch {
        // ignore
      }
    }, 3100);

    this.activeGenerators.push({
      stop: () => {
        clearInterval(timer);
        for (const o of oscs) {
          try {
            o.stop();
          } catch {
            // ignore
          }
        }
      },
    });
  }

  // 4. Matchday Tunnel Focus (72 BPM Heartbeat + Atmospheric Suspense)
  private generateTunnelHeartbeat(ctx: AudioContext, destination: GainNode) {
    const droneOsc = ctx.createOscillator();
    droneOsc.type = 'sine';
    droneOsc.frequency.setValueAtTime(55, ctx.currentTime); // A1

    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.setValueAtTime(140, ctx.currentTime);

    const droneGain = ctx.createGain();
    droneGain.gain.setValueAtTime(0.01, ctx.currentTime);
    droneGain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 1.2);

    droneOsc.connect(droneFilter);
    droneFilter.connect(droneGain);
    droneGain.connect(destination);
    droneOsc.start();

    // 72 BPM Heartbeat double pulse (lub-dub)
    const playHeartbeat = () => {
      if (!this.isRunning) return;
      try {
        const now = ctx.currentTime;
        // First thump
        const kick1 = ctx.createOscillator();
        const kGain1 = ctx.createGain();
        kick1.type = 'sine';
        kick1.frequency.setValueAtTime(75, now);
        kick1.frequency.exponentialRampToValueAtTime(32, now + 0.18);
        kGain1.gain.setValueAtTime(0.24, now);
        kGain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        kick1.connect(kGain1);
        kGain1.connect(destination);
        kick1.start(now);
        kick1.stop(now + 0.23);

        // Second thump (closer and softer)
        const t2 = now + 0.24;
        const kick2 = ctx.createOscillator();
        const kGain2 = ctx.createGain();
        kick2.type = 'sine';
        kick2.frequency.setValueAtTime(65, t2);
        kick2.frequency.exponentialRampToValueAtTime(30, t2 + 0.15);
        kGain2.gain.setValueAtTime(0.18, t2);
        kGain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.18);
        kick2.connect(kGain2);
        kGain2.connect(destination);
        kick2.start(t2);
        kick2.stop(t2 + 0.2);
      } catch {
        // ignore
      }
    };

    playHeartbeat();
    const beatTimer = window.setInterval(playHeartbeat, 1660); // ~72 BPM

    this.activeGenerators.push({
      stop: () => {
        clearInterval(beatTimer);
        try {
          droneOsc.stop();
        } catch {
          // ignore
        }
      },
    });
  }

  // 5. Full-Time Whistle Reflection (Acoustic Chime / Piano Reflection)
  private generateReflectionChime(ctx: AudioContext, destination: GainNode) {
    const padOsc = ctx.createOscillator();
    padOsc.type = 'sine';
    padOsc.frequency.setValueAtTime(174.61, ctx.currentTime); // F3
    const padGain = ctx.createGain();
    padGain.gain.setValueAtTime(0.01, ctx.currentTime);
    padGain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 1.5);
    padOsc.connect(padGain);
    padGain.connect(destination);
    padOsc.start();

    const notes = [349.23, 440.0, 523.25, 659.25, 523.25, 440.0];
    let noteIdx = 0;

    const chimeTimer = window.setInterval(() => {
      if (!this.isRunning) return;
      try {
        const chime = ctx.createOscillator();
        const chimeGain = ctx.createGain();
        chime.type = 'sine';
        chime.frequency.setValueAtTime(notes[noteIdx % notes.length], ctx.currentTime);
        chimeGain.gain.setValueAtTime(0.08, ctx.currentTime);
        chimeGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.4);
        chime.connect(chimeGain);
        chimeGain.connect(destination);
        chime.start(ctx.currentTime);
        chime.stop(ctx.currentTime + 1.5);
        noteIdx++;
      } catch {
        // ignore
      }
    }, 1800);

    this.activeGenerators.push({
      stop: () => {
        clearInterval(chimeTimer);
        try {
          padOsc.stop();
        } catch {
          // ignore
        }
      },
    });
  }

  // 6. European Cup Final Anthem (Pulsing synth arpeggio)
  private generateAnthemArp(ctx: AudioContext, destination: GainNode) {
    const bass = ctx.createOscillator();
    bass.type = 'sawtooth';
    bass.frequency.setValueAtTime(73.42, ctx.currentTime); // D2
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, ctx.currentTime);

    const bassGain = ctx.createGain();
    bassGain.gain.setValueAtTime(0.01, ctx.currentTime);
    bassGain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 1.0);

    bass.connect(filter);
    filter.connect(bassGain);
    bassGain.connect(destination);
    bass.start();

    const notes = [293.66, 369.99, 440.0, 587.33, 440.0, 369.99]; // D-F#-A-D arp
    let idx = 0;

    const arpTimer = window.setInterval(() => {
      if (!this.isRunning) return;
      try {
        const arpOsc = ctx.createOscillator();
        const arpGain = ctx.createGain();
        arpOsc.type = 'square';
        arpOsc.frequency.setValueAtTime(notes[idx % notes.length], ctx.currentTime);
        arpGain.gain.setValueAtTime(0.05, ctx.currentTime);
        arpGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

        const arpFilter = ctx.createBiquadFilter();
        arpFilter.type = 'lowpass';
        arpFilter.frequency.setValueAtTime(800, ctx.currentTime);

        arpOsc.connect(arpFilter);
        arpFilter.connect(arpGain);
        arpGain.connect(destination);
        arpOsc.start(ctx.currentTime);
        arpOsc.stop(ctx.currentTime + 0.38);
        idx++;
      } catch {
        // ignore
      }
    }, 480); // 125 BPM eighth notes

    this.activeGenerators.push({
      stop: () => {
        clearInterval(arpTimer);
        try {
          bass.stop();
        } catch {
          // ignore
        }
      },
    });
  }

  // 7. Custom frequency pad fallback
  private generateCustomTone(ctx: AudioContext, destination: GainNode, baseFreq: number) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(baseFreq * 1.5, ctx.currentTime);

    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 1.2);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, ctx.currentTime);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    osc1.start();
    osc2.start();

    this.activeGenerators.push({
      stop: () => {
        try {
          osc1.stop();
          osc2.stop();
        } catch {
          // ignore
        }
      },
    });
  }

  // ==========================================================================
  // MATCHDAY SOUND EFFECTS
  // ==========================================================================
  public playSoundEffect(type: SoundEffectType) {
    const ctx = this.initContext();
    if (!ctx || !this.masterGain) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    switch (type) {
      case 'whistle': {
        // Dual-tone high pitch referee whistle with fast amplitude flutter
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(2850, now);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(3120, now);

        // Flutter LFO
        const lfo = ctx.createOscillator();
        lfo.frequency.setValueAtTime(28, now);
        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(150, now);
        lfo.connect(lfoGain);
        lfoGain.connect(osc1.frequency);
        lfoGain.connect(osc2.frequency);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.22, now + 0.05);
        gain.gain.setValueAtTime(0.22, now + 0.65);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.masterGain);

        osc1.start(now);
        osc2.start(now);
        lfo.start(now);

        osc1.stop(now + 0.86);
        osc2.stop(now + 0.86);
        lfo.stop(now + 0.86);
        break;
      }

      case 'roar': {
        // High-energy stadium cheer burst
        const bufferSize = ctx.sampleRate * 2.2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }
        const white = ctx.createBufferSource();
        white.buffer = noiseBuffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(750, now);
        filter.Q.setValueAtTime(1.2, now);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.35, now + 0.4);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);

        white.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        white.start(now);
        white.stop(now + 2.25);
        break;
      }

      case 'crossbar': {
        // Resonant metallic ping
        const osc = ctx.createOscillator();
        const oscHarmonic = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(940, now);
        oscHarmonic.type = 'sine';
        oscHarmonic.frequency.setValueAtTime(1880, now);

        gain.gain.setValueAtTime(0.38, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

        osc.connect(gain);
        oscHarmonic.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        oscHarmonic.start(now);
        osc.stop(now + 0.92);
        oscHarmonic.stop(now + 0.92);
        break;
      }

      case 'drum': {
        // Ultras stadium bass boom
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.exponentialRampToValueAtTime(38, now + 0.35);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.62);
        break;
      }
    }
  }
}

// Global Singleton instance
export const audioAtmosphere = new AudioAtmosphereEngine();
