export type GeminiBroadcastVoice = 'Fenrir' | 'Puck' | 'Charon' | 'Orus';
export type GeminiBroadcastVoiceChoice = 'Auto' | GeminiBroadcastVoice;

export const GEMINI_VOICE_OPTIONS: Array<{
  id: GeminiBroadcastVoice;
  label: string;
  role: string;
  category: 'commentary' | 'analysis';
}> = [
  {
    id: 'Charon',
    label: 'Charon',
    role: 'Lead Play-by-Play Commentator',
    category: 'analysis',
  },
  {
    id: 'Orus',
    label: 'Orus',
    role: 'Co-Commentator & Tactical Analyst',
    category: 'analysis',
  },
  {
    id: 'Fenrir',
    label: 'Fenrir',
    role: 'Solo Dynamic Match Commentary',
    category: 'commentary',
  },
  {
    id: 'Puck',
    label: 'Puck',
    role: 'Solo Lively Match Commentary',
    category: 'commentary',
  },
];

export function resolveVoiceForBroadcastStage(
  choice: GeminiBroadcastVoiceChoice | string | undefined,
  stage: string | undefined,
  _seedHint = ''
): GeminiBroadcastVoice {
  if (choice === 'Fenrir' || choice === 'Puck' || choice === 'Charon' || choice === 'Orus') {
    return choice;
  }
  if (stage === 'tactical') {
    return 'Orus';
  }
  return 'Charon';
}

export type MatchBroadcastType =
  | 'live-event'
  | 'half-time'
  | 'end-of-90'
  | 'et-interval'
  | 'penalties-intro'
  | 'penalty-kick'
  | 'full-time';

export type BroadcastEmotion =
  | 'normal'
  | 'attack'
  | 'goal'
  | 'miss'
  | 'save'
  | 'red-card'
  | 'tactical'
  | 'late-tension'
  | 'verdict';

export interface BroadcastAudioSegment {
  speaker: GeminiBroadcastVoice;
  text: string;
  emotion: BroadcastEmotion;
  pauseAfterMs?: number;
}

export interface LiveBroadcastEventPayload {
  id?: string;
  type: string;
  minute: number;
  addedMinute?: number;
  teamSide?: 'home' | 'away';
  playerName?: string;
  assistPlayerName?: string;
  secondaryPlayerName?: string;
  isPenalty?: boolean;
  commentary?: string;
  isLateClose?: boolean;
}

export interface MatchTeamBroadcastStats {
  possession?: number;
  shots?: number;
  shotsOnTarget?: number;
  xg?: number;
  xgot?: number | null;
  openPlayXg?: number | null;
  setPieceXg?: number | null;
  bigChances?: number;
  bigChancesMissed?: number;
  touchesInBox?: number;
  corners?: number;
  offsides?: number;
  fouls?: number;
  yellowCards?: number;
  redCards?: number;
  saves?: number;
  passesAttempted?: number;
  passesCompleted?: number;
  passAccuracy?: number;
  throughPasses?: number;
  throughPassesCompleted?: number;
  blocks?: number;
  duelsWon?: number;
  duelsTotal?: number;
  tacklesWon?: number;
  tacklesTotal?: number;
  interceptions?: number;
  clearances?: number;
  possessionLost?: number;
  runningDistanceKm?: number | null;
  sprintingDistanceKm?: number | null;
  attackingZones?: {
    left: number;
    central: number;
    right: number;
  };
  buildMethods?: {
    patient: number;
    throughBall: number;
    crossSetPiece: number;
    counter: number;
  };
}

export interface MatchPlayerBroadcastStats {
  playerId: string;
  name: string;
  shirtNumber: number;
  teamSide: 'home' | 'away';
  position: string;
  roleSlot: string;
  started: boolean;
  subbedInMinute: number | null;
  subbedOutMinute: number | null;
  minutesPlayed: number;
  rating: number;
  isMotm?: boolean;
  goals: number;
  assists: number;
  shots: number;
  shotsOnTarget: number;
  xg: number;
  bigChancesMissed?: number;
  keyPasses: number;
  passesCompleted: number;
  passesAttempted: number;
  throughPasses?: number;
  throughPassesCompleted?: number;
  blocks?: number;
  tackles: number;
  interceptions: number;
  clearances?: number;
  foulsCommitted?: number;
  possessionLost?: number;
  saves: number;
  yellowCards: number;
  redCards: number;
  staminaRemaining?: number;
}

export interface MatchShotBroadcastEntry {
  minute: number;
  addedMinute?: number;
  teamSide: 'home' | 'away';
  playerName: string;
  assistPlayerName?: string;
  outcome: 'goal' | 'saved' | 'blocked' | 'off-target' | 'woodwork';
  xg: number;
  situation: string;
  buildMethod: string;
  channel: string;
  isBigChance: boolean;
  bodyPart: string;
}

export interface MatchPenaltyKickBroadcastEntry {
  kickNumber: number;
  round: number;
  teamSide: 'home' | 'away';
  takerName: string;
  keeperName: string;
  keeperDive: 'left' | 'center' | 'right';
  outcome: 'scored' | 'saved' | 'post' | 'missed';
  missDetail?: string;
}

export interface MatchTimelineHighlight {
  minute: number;
  addedMinute?: number;
  period?: string;
  type: string;
  teamSide?: 'home' | 'away';
  playerName?: string;
  assistPlayerName?: string;
  secondaryPlayerName?: string;
  isPenalty?: boolean;
  headline?: string;
  commentary?: string;
  situation?: string;
}

export interface MatchBroadcastDossier {
  matchId?: string;
  stateVersion?: string;
  halfTimeScore?: { home: number; away: number };
  aggregateScore?: { home: number; away: number };
  preMatchContext?: {
    homeRating?: number;
    awayRating?: number;
    homeWinPct?: number;
    drawPct?: number;
    awayWinPct?: number;
    favouriteSide?: 'home' | 'away' | 'even';
  };
  matchConditions?: {
    weather?: string;
    pitch?: string;
    temperatureC?: number;
    stadiumName?: string;
    stadiumCapacity?: number;
    crowdAttendance?: number;
    crowdIntensity?: number;
    refereeName?: string;
    refereeArchetype?: string;
    refereeStrictness?: number;
    homeChemistryScore?: number;
    awayChemistryScore?: number;
    chemistrySummaryHome?: string;
    chemistrySummaryAway?: string;
  };
  tactics?: {
    homeFormation?: string;
    awayFormation?: string;
    homeManager?: string;
    awayManager?: string;
    homePlayingStyle?: string;
    awayPlayingStyle?: string;
    homePressing?: number;
    awayPressing?: number;
    homeDefensiveLine?: number;
    awayDefensiveLine?: number;
    homeTacticalSummary?: string;
    awayTacticalSummary?: string;
    tacticalChanges?: Array<{
      minute: number;
      teamSide: 'home' | 'away';
      description: string;
    }>;
  };
  statsAvailable?: boolean;
  stats?: {
    home: MatchTeamBroadcastStats;
    away: MatchTeamBroadcastStats;
  };
  timelineHighlights?: MatchTimelineHighlight[];
  shotsLog?: MatchShotBroadcastEntry[];
  playerStats?: MatchPlayerBroadcastStats[];
  penaltyShootoutKicks?: MatchPenaltyKickBroadcastEntry[];
  substitutions?: Array<{
    minute: number;
    teamSide: 'home' | 'away';
    playerIn: string;
    playerOut: string;
  }>;
  keyPerformers?: Array<{
    teamSide: 'home' | 'away';
    name: string;
    role?: string;
    rating?: number;
    goals?: number;
    assists?: number;
    saves?: number;
    isMotm?: boolean;
  }>;
  momentumSummary?: string;
  goalBuildBreakdown?: {
    homeCounterGoals?: number;
    awayCounterGoals?: number;
    homeSetPieceGoals?: number;
    awaySetPieceGoals?: number;
  };
}

export interface HalftimeBroadcastRequest {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  competitionName?: string;
  stageLabel?: string;
  venueName?: string;
  stoppageMinutes?: number;
  firstHalfGoals?: Array<{
    playerName: string;
    minute: number;
    addedMinute?: number;
    teamSide: 'home' | 'away';
    isPenalty?: boolean;
  }>;
  possessionHome?: number;
  voiceName?: GeminiBroadcastVoiceChoice;
  voiceChoice?: GeminiBroadcastVoiceChoice;
}

export interface MatchBroadcastRequest extends HalftimeBroadcastRequest {
  announcementType?: MatchBroadcastType;
  wentToExtraTime?: boolean;
  dossier?: MatchBroadcastDossier;
  liveEvent?: LiveBroadcastEventPayload;
  penaltyShootout?: {
    homeScore: number;
    awayScore: number;
    winner?: 'home' | 'away' | null;
  };
  penaltyKick?: {
    kickNumber: number;
    round: number;
    suddenDeath?: boolean;
    teamSide: 'home' | 'away';
    takerName: string;
    keeperName?: string;
    outcome: 'scored' | 'saved' | 'post' | 'missed';
    homePenScore: number;
    awayPenScore: number;
    isDecisiveWinner?: boolean;
  };
}

export interface HalftimeBroadcastResponse {
  audioBase64: string;
  mimeType: 'audio/wav';
  speechFallback?: boolean;
  script: string;
  segments?: BroadcastAudioSegment[];
  voiceName: GeminiBroadcastVoice;
  model: string;
  announcementType?: MatchBroadcastType;
  storyline?: string;
  cached?: boolean;
}

const halftimeAudioCache = new Map<string, HalftimeBroadcastResponse>();
const halftimeInFlight = new Map<string, Promise<HalftimeBroadcastResponse>>();

function buildRequestKey(req: MatchBroadcastRequest): string {
  const goalsKey = (req.firstHalfGoals || [])
    .map((g) => `${g.teamSide}:${g.playerName}:${g.minute}+${g.addedMinute || 0}:${g.isPenalty ? 'p' : ''}`)
    .join('|');
  const kickKey = req.penaltyKick
    ? `${req.penaltyKick.kickNumber}:${req.penaltyKick.teamSide}:${req.penaltyKick.takerName}:${req.penaltyKick.outcome}:${req.penaltyKick.homePenScore}-${req.penaltyKick.awayPenScore}`
    : '';
  const liveEventKey = req.liveEvent
    ? `${req.liveEvent.id || req.liveEvent.type}:${req.liveEvent.minute}+${req.liveEvent.addedMinute || 0}:${req.liveEvent.teamSide || ''}:${req.liveEvent.playerName || ''}`
    : '';
  const penKey = req.penaltyShootout
    ? `${req.penaltyShootout.homeScore}-${req.penaltyShootout.awayScore}:${req.penaltyShootout.winner || ''}`
    : '';
  const d = req.dossier;
  const dossierKey = d
    ? [
        d.matchId || '',
        d.stateVersion || '',
        d.stats ? `${d.stats.home.possession ?? ''}-${d.stats.home.shots ?? ''}-${d.stats.away.shots ?? ''}-${d.stats.home.xg ?? ''}-${d.stats.away.xg ?? ''}` : '',
        d.tactics ? `${d.tactics.homeFormation || ''}-${d.tactics.awayFormation || ''}-${d.tactics.tacticalChanges?.length || 0}` : '',
        d.timelineHighlights?.length ?? 0,
        d.substitutions?.length ?? 0,
      ].join('/')
    : '';

  return [
    req.dossier?.matchId || `${req.homeTeam}-vs-${req.awayTeam}`,
    req.dossier?.stateVersion || '',
    req.announcementType || 'half-time',
    req.voiceChoice || req.voiceName || 'Auto',
    resolveVoiceForBroadcastStage(req.voiceName, req.announcementType || 'half-time', req.homeTeam),
    req.homeTeam,
    req.awayTeam,
    req.homeScore,
    req.awayScore,
    req.wentToExtraTime ? 'et' : '90',
    req.competitionName || '',
    req.venueName || '',
    liveEventKey,
    goalsKey,
    penKey,
    kickKey,
    dossierKey,
  ].join('::');
}

export async function fetchMatchBroadcastAudio(
  req: MatchBroadcastRequest
): Promise<HalftimeBroadcastResponse> {
  const key = buildRequestKey(req);
  const cached = halftimeAudioCache.get(key);
  if (cached) return cached;

  const existing = halftimeInFlight.get(key);
  if (existing) return existing;

  const endpoint =
    !req.announcementType || req.announcementType === 'half-time'
      ? '/api/gemini/halftime-announce'
      : '/api/gemini/match-announce';

  const promise = (async () => {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });

    const data = (await res.json().catch(() => ({}))) as Partial<HalftimeBroadcastResponse> & {
      error?: string;
    };

    if (!res.ok || (!data.audioBase64 && !(data.speechFallback && data.script))) {
      throw new Error(data.error || `Broadcast audio failed (HTTP ${res.status}).`);
    }

    const result: HalftimeBroadcastResponse = {
      audioBase64: data.audioBase64 || '',
      mimeType: 'audio/wav',
      speechFallback: Boolean(data.speechFallback || !data.audioBase64),
      script: data.script || `${req.homeTeam} ${req.homeScore} - ${req.awayScore} ${req.awayTeam}`,
      segments: Array.isArray(data.segments) ? data.segments : undefined,
      voiceName:
        (data.voiceName as GeminiBroadcastVoice) ||
        resolveVoiceForBroadcastStage(req.voiceName, req.announcementType || 'half-time', req.homeTeam),
      model: data.model || 'gemini-3.8-flash-lite-tts',
      announcementType: data.announcementType || req.announcementType || 'half-time',
      storyline: data.storyline,
      cached: Boolean(data.cached),
    };

    if (halftimeAudioCache.size >= 100) {
      const oldest = halftimeAudioCache.keys().next().value;
      if (oldest) halftimeAudioCache.delete(oldest);
    }
    halftimeAudioCache.set(key, result);
    return result;
  })();

  halftimeInFlight.set(key, promise);
  try {
    return await promise;
  } finally {
    halftimeInFlight.delete(key);
  }
}

export async function fetchHalftimeBroadcastAudio(
  req: HalftimeBroadcastRequest
): Promise<HalftimeBroadcastResponse> {
  return fetchMatchBroadcastAudio({ ...req, announcementType: 'half-time' });
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = window.atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function cleanTextForSpeech(text: string): string {
  return (text || '')
    .replace(/<(?:breath|gasp|laugh|sigh|chuckle)>/gi, ' ')
    .replace(/\|([^|]{1,24})\|/g, (_, inner: string) => {
      const c = inner.trim();
      if (!c) return ' ';
      return /[.!?…,:;]$/.test(c) ? c : `${c},`;
    })
    .replace(/\bF\.C\.\b/gi, 'FC')
    .replace(/\bS\.S\.\b/gi, 'SS')
    .replace(/\bA\.C\.\b/gi, 'AC')
    .replace(/\s+([,.!?;:])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseFallbackSegmentsFromScript(
  script: string,
  defaultSpeaker: GeminiBroadcastVoice = 'Charon'
): BroadcastAudioSegment[] {
  const lines = String(script || '')
    .split(/\r?\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const segments: BroadcastAudioSegment[] = [];
  let activeSpeaker: GeminiBroadcastVoice = defaultSpeaker;

  for (const line of lines) {
    const speakerMatch = line.match(/^(Charon|Orus|Fenrir|Puck)\s*:\s*(.+)$/i);
    if (speakerMatch) {
      const rawSpeaker = speakerMatch[1].toLowerCase();
      activeSpeaker =
        rawSpeaker === 'orus'
          ? 'Orus'
          : rawSpeaker === 'fenrir'
          ? 'Fenrir'
          : rawSpeaker === 'puck'
          ? 'Puck'
          : 'Charon';
      const cleaned = cleanTextForSpeech(speakerMatch[2]);
      if (cleaned) {
        segments.push({
          speaker: activeSpeaker,
          text: cleaned,
          emotion: 'normal',
          pauseAfterMs: 120,
        });
      }
    } else {
      const cleaned = cleanTextForSpeech(line);
      if (cleaned) {
        segments.push({
          speaker: activeSpeaker,
          text: cleaned,
          emotion: 'normal',
          pauseAfterMs: 120,
        });
      }
    }
  }

  return segments;
}

class GeminiHalftimeAudioPlayer {
  private ctx: AudioContext | null = null;
  private activeSource: AudioBufferSourceNode | null = null;
  private activeHtmlAudio: HTMLAudioElement | null = null;
  private playbackToken = 0;
  private playing = false;
  private idleWaiters = new Set<() => void>();

  private notifyIdle() {
    this.playing = false;
    for (const resolve of this.idleWaiters) {
      resolve();
    }
    this.idleWaiters.clear();
  }

  public isPlaying(): boolean {
    return this.playing;
  }

  public waitForIdle(timeoutMs = 16000): Promise<void> {
    if (!this.playing) return Promise.resolve();
    return new Promise<void>((resolve) => {
      let timer: number | null = null;
      const done = () => {
        if (timer !== null) window.clearTimeout(timer);
        this.idleWaiters.delete(done);
        resolve();
      };
      this.idleWaiters.add(done);
      timer = window.setTimeout(done, timeoutMs);
    });
  }

  public unlock(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtor) {
        this.ctx = new AudioCtor();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private activeSpeechTimer: number | null = null;

  public stop(): void {
    this.playbackToken += 1;
    if (this.activeSpeechTimer !== null) {
      window.clearTimeout(this.activeSpeechTimer);
      this.activeSpeechTimer = null;
    }
    if (this.activeUtterance) {
      try {
        this.activeUtterance.onend = null;
        this.activeUtterance.onerror = null;
      } catch {
        // Ignore
      }
      this.activeUtterance = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }
    if (this.activeSource) {
      try {
        this.activeSource.onended = null;
        this.activeSource.stop();
        this.activeSource.disconnect();
      } catch {
        // Ignore already-stopped nodes
      }
      this.activeSource = null;
    }
    if (this.activeHtmlAudio) {
      try {
        this.activeHtmlAudio.onended = null;
        this.activeHtmlAudio.onerror = null;
        this.activeHtmlAudio.pause();
        this.activeHtmlAudio.removeAttribute('src');
      } catch {
        // Ignore
      }
      this.activeHtmlAudio = null;
    }
    this.notifyIdle();
  }

  private pickDistinctDuoVoices(voices: SpeechSynthesisVoice[]): Record<
    GeminiBroadcastVoice,
    { voice: SpeechSynthesisVoice | null; basePitch: number; baseRate: number }
  > {
    const enVoices = voices.filter(
      (v) =>
        v.lang &&
        v.lang.toLowerCase().startsWith('en') &&
        !/espeak|whisper|zarvox|boing|albert|bad news|bells|bubbles|cellos/i.test(v.name)
    );
    const fallbackEn = voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith('en'));
    const pool = enVoices.length > 0 ? enVoices : fallbackEn.length > 0 ? fallbackEn : voices;

    const findBest = (
      preferredNames: string[],
      excludeUris: Set<string>,
      preferNatural = true
    ): SpeechSynthesisVoice | null => {
      for (const target of preferredNames) {
        const match = pool.find(
          (v) =>
            !excludeUris.has(v.voiceURI) &&
            v.name.toLowerCase().includes(target.toLowerCase())
        );
        if (match) return match;
      }
      if (preferNatural) {
        const natural = pool.find(
          (v) => !excludeUris.has(v.voiceURI) && /natural|neural|google|microsoft|uk|gb/i.test(v.name)
        );
        if (natural) return natural;
      }
      return pool.find((v) => !excludeUris.has(v.voiceURI)) || pool[0] || null;
    };

    const usedPrimary = new Set<string>();
    const charonVoice = findBest(
      ['Google UK English Male', 'Daniel', 'Arthur', 'George', 'Oliver', 'Brian', 'David', 'Guy'],
      usedPrimary
    );
    if (charonVoice && pool.length >= 2) {
      usedPrimary.add(charonVoice.voiceURI);
    }

    const orusVoice = findBest(
      ['Ryan', 'George', 'Christopher', 'Guy', 'Alex', 'Google US English', 'Mark', 'Oliver', 'Liam'],
      usedPrimary
    );

    const usedSolo = new Set<string>();
    const fenrirVoice = findBest(
      ['Google UK English Male', 'Oliver', 'Guy', 'Christopher', 'Alex', 'Daniel'],
      usedSolo
    );
    if (fenrirVoice && pool.length >= 2) {
      usedSolo.add(fenrirVoice.voiceURI);
    }
    const puckVoice = findBest(
      ['Ryan', 'George', 'Google US English', 'Jenny', 'Sonia', 'Liam', 'Alex'],
      usedSolo
    );

    return {
      Charon: { voice: charonVoice, basePitch: 0.78, baseRate: 0.96 },
      Orus: { voice: orusVoice, basePitch: 1.14, baseRate: 1.05 },
      Fenrir: { voice: fenrirVoice, basePitch: 0.86, baseRate: 1.04 },
      Puck: { voice: puckVoice, basePitch: 1.15, baseRate: 1.08 },
    };
  }

  private applyEmotionToSpeechParams(
    basePitch: number,
    baseRate: number,
    emotion: BroadcastEmotion
  ): { pitch: number; rate: number } {
    let dp = 0;
    let dr = 0;
    switch (emotion) {
      case 'goal':
        dp = 0.06;
        dr = 0.05;
        break;
      case 'red-card':
        dp = -0.04;
        dr = -0.04;
        break;
      case 'save':
      case 'attack':
      case 'miss':
        dp = 0.03;
        dr = 0.03;
        break;
      case 'late-tension':
        dp = 0.02;
        dr = 0.02;
        break;
      case 'tactical':
        dp = -0.02;
        dr = -0.03;
        break;
      case 'verdict':
        dp = -0.02;
        dr = -0.02;
        break;
      default:
        break;
    }
    return {
      pitch: Math.max(0.66, Math.min(1.42, Number((basePitch + dp).toFixed(2)))),
      rate: Math.max(0.84, Math.min(1.24, Number((baseRate + dr).toFixed(2)))),
    };
  }

  private async loadSpeechVoices(): Promise<SpeechSynthesisVoice[]> {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
    const synth = window.speechSynthesis;
    let voices = synth.getVoices();
    if (voices.length === 0) {
      voices = await new Promise<SpeechSynthesisVoice[]>((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          synth.removeEventListener?.('voiceschanged', finish);
          resolve(synth.getVoices());
        };
        synth.addEventListener?.('voiceschanged', finish);
        window.setTimeout(finish, 320);
      });
    }
    return voices;
  }

  public async speakSegmentsFallback(
    rawSegments: BroadcastAudioSegment[],
    callbacks?: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (message: string) => void;
    }
  ): Promise<void> {
    this.stop();
    const token = this.playbackToken;

    const segments = rawSegments
      .map((s) => ({
        ...s,
        text: cleanTextForSpeech(
          s.text.replace(/^(Charon|Orus|Fenrir|Puck)\s*:\s*/i, '')
        ),
      }))
      .filter((s) => Boolean(s.text));

    if (segments.length === 0) {
      this.notifyIdle();
      callbacks?.onEnd?.();
      return;
    }

    const totalWords = segments.reduce(
      (sum, s) => sum + s.text.split(/\s+/).filter(Boolean).length,
      0
    );

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      await new Promise<void>((resolve) => {
        this.playing = true;
        callbacks?.onStart?.();
        const durationMs = Math.min(6000, Math.max(1600, totalWords * 190));
        this.activeSpeechTimer = window.setTimeout(() => {
          this.activeSpeechTimer = null;
          if (token === this.playbackToken) {
            this.notifyIdle();
            callbacks?.onEnd?.();
          }
          resolve();
        }, durationMs);
      });
      return;
    }

    const voices = await this.loadSpeechVoices();
    if (token !== this.playbackToken) return;

    const synth = window.speechSynthesis;
    const profiles = this.pickDistinctDuoVoices(voices);
    try {
      synth.cancel();
    } catch {
      // Ignore
    }

    this.playing = true;
    callbacks?.onStart?.();

    for (let i = 0; i < segments.length; i++) {
      if (token !== this.playbackToken) return;
      const seg = segments[i];
      const speakerProfile = profiles[seg.speaker] || profiles.Charon;
      const { pitch, rate } = this.applyEmotionToSpeechParams(
        speakerProfile.basePitch,
        speakerProfile.baseRate,
        seg.emotion || 'normal'
      );
      const segWords = seg.text.split(/\s+/).filter(Boolean).length;

      await new Promise<void>((resolve) => {
        if (token !== this.playbackToken) {
          resolve();
          return;
        }
        const utterance = new SpeechSynthesisUtterance(seg.text);
        if (speakerProfile.voice) utterance.voice = speakerProfile.voice;
        utterance.lang = speakerProfile.voice?.lang || 'en-GB';
        utterance.pitch = pitch;
        utterance.rate = rate;
        utterance.volume = seg.speaker === 'Charon' ? 1.0 : 0.96;

        let settled = false;
        const finishSegment = () => {
          if (settled) return;
          settled = true;
          if (this.activeSpeechTimer !== null) {
            window.clearTimeout(this.activeSpeechTimer);
            this.activeSpeechTimer = null;
          }
          this.activeUtterance = null;
          resolve();
        };

        const safetyMs = Math.max(3200, segWords * 540 + 2000);
        this.activeSpeechTimer = window.setTimeout(finishSegment, safetyMs);
        utterance.onend = finishSegment;
        utterance.onerror = finishSegment;
        this.activeUtterance = utterance;

        try {
          synth.speak(utterance);
        } catch {
          finishSegment();
        }
      });

      if (token !== this.playbackToken) return;

      const pauseMs = seg.pauseAfterMs ?? 110;
      if (i < segments.length - 1 && pauseMs > 0) {
        await new Promise<void>((resolve) => {
          this.activeSpeechTimer = window.setTimeout(() => {
            this.activeSpeechTimer = null;
            resolve();
          }, Math.min(240, Math.max(55, pauseMs)));
        });
      }
    }

    if (token === this.playbackToken) {
      this.notifyIdle();
      callbacks?.onEnd?.();
    }
  }

  public async speakScriptFallback(
    script: string,
    voiceName: GeminiBroadcastVoice = 'Charon',
    callbacks?: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (message: string) => void;
    }
  ): Promise<void> {
    const parsedSegments = parseFallbackSegmentsFromScript(script, voiceName);
    await this.speakSegmentsFallback(parsedSegments, callbacks);
  }

  public async playBroadcastResponse(
    res: HalftimeBroadcastResponse,
    callbacks?: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (message: string) => void;
    }
  ): Promise<void> {
    if (res.audioBase64 && !res.speechFallback) {
      let decodedOk = true;
      await this.playWavBase64(res.audioBase64, {
        onStart: callbacks?.onStart,
        onEnd: callbacks?.onEnd,
        onError: () => {
          decodedOk = false;
        },
      });
      if (decodedOk) return;
    }
    if (Array.isArray(res.segments) && res.segments.length > 0) {
      await this.speakSegmentsFallback(res.segments, callbacks);
      return;
    }
    await this.speakScriptFallback(res.script, res.voiceName, callbacks);
  }

  public async playWavBase64(
    audioBase64: string,
    callbacks?: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (message: string) => void;
    }
  ): Promise<void> {
    this.stop();
    const token = this.playbackToken;
    this.unlock();

    if (this.ctx) {
      try {
        if (this.ctx.state === 'suspended') {
          await this.ctx.resume();
        }
        const wavBytes = base64ToUint8Array(audioBase64);
        const arrayBuf = wavBytes.buffer.slice(
          wavBytes.byteOffset,
          wavBytes.byteOffset + wavBytes.byteLength
        ) as ArrayBuffer;
        const audioBuffer = await this.ctx.decodeAudioData(arrayBuf);
        if (token !== this.playbackToken) return;

        await new Promise<void>((resolve) => {
          const source = this.ctx!.createBufferSource();
          const gain = this.ctx!.createGain();
          gain.gain.setValueAtTime(1.0, this.ctx!.currentTime);
          source.buffer = audioBuffer;
          source.connect(gain);
          gain.connect(this.ctx!.destination);

          const safetyMs = Math.max(4000, Math.ceil((audioBuffer.duration + 1.5) * 1000));
          const safetyTimer = window.setTimeout(() => {
            if (token === this.playbackToken) {
              this.activeSource = null;
              this.notifyIdle();
              callbacks?.onEnd?.();
            }
            resolve();
          }, safetyMs);

          source.onended = () => {
            window.clearTimeout(safetyTimer);
            if (token === this.playbackToken) {
              this.activeSource = null;
              this.notifyIdle();
              callbacks?.onEnd?.();
            }
            resolve();
          };

          this.activeSource = source;
          this.playing = true;
          callbacks?.onStart?.();
          source.start(0);
        });
        return;
      } catch {
        // Fall through to HTMLAudioElement fallback
      }
    }

    try {
      if (token !== this.playbackToken) return;
      await new Promise<void>((resolve) => {
        const audio = new Audio(`data:audio/wav;base64,${audioBase64}`);
        this.activeHtmlAudio = audio;
        const safetyTimer = window.setTimeout(() => {
          if (token === this.playbackToken) {
            this.activeHtmlAudio = null;
            this.notifyIdle();
            callbacks?.onEnd?.();
          }
          resolve();
        }, 18000);

        audio.onended = () => {
          window.clearTimeout(safetyTimer);
          if (token === this.playbackToken) {
            this.activeHtmlAudio = null;
            this.notifyIdle();
            callbacks?.onEnd?.();
          }
          resolve();
        };
        audio.onerror = () => {
          window.clearTimeout(safetyTimer);
          if (token === this.playbackToken) {
            this.activeHtmlAudio = null;
            this.notifyIdle();
            callbacks?.onError?.('Unable to decode match WAV audio.');
          }
          resolve();
        };
        this.playing = true;
        callbacks?.onStart?.();
        audio.play().catch((err) => {
          window.clearTimeout(safetyTimer);
          if (token === this.playbackToken) {
            this.activeHtmlAudio = null;
            this.notifyIdle();
            callbacks?.onError?.(
              err instanceof Error
                ? err.message
                : 'Browser blocked automatic audio playback. Tap Announce to play.'
            );
          }
          resolve();
        });
      });
    } catch (err) {
      if (token === this.playbackToken) {
        this.notifyIdle();
        callbacks?.onError?.(
          err instanceof Error
            ? err.message
            : 'Browser blocked automatic audio playback. Tap Announce to play.'
        );
      }
    }
  }
}

export const geminiHalftimeAudio = new GeminiHalftimeAudioPlayer();

export type LiveSessionStatus = 'idle' | 'connecting' | 'live' | 'error';

export interface LiveMatchContext {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  phase?: string;
  minute?: number;
  competitionName?: string;
  stageLabel?: string;
  venueName?: string;
  possessionHome?: number;
  shotsHome?: number;
  shotsAway?: number;
  xgHome?: number;
  xgAway?: number;
  homeFormation?: string;
  awayFormation?: string;
  scorersSummary?: string;
  dossier?: MatchBroadcastDossier;
  wentToExtraTime?: boolean;
  penaltyShootout?: {
    homeScore: number;
    awayScore: number;
    winner?: 'home' | 'away' | null;
  };
}

export interface LiveVoiceClientCallbacks {
  onStatusChange?: (status: LiveSessionStatus) => void;
  onInputTranscript?: (text: string) => void;
  onOutputTranscript?: (text: string) => void;
  onTurnComplete?: () => void;
  onSpeakingChange?: (speaking: boolean) => void;
  onError?: (error: string) => void;
}

export class GeminiLiveVoiceClient {
  private ws: WebSocket | null = null;
  private outputCtx: AudioContext | null = null;
  private scheduledSources = new Set<AudioBufferSourceNode>();
  private nextStartTime = 0;
  private disposed = false;
  private fallbackMode = false;
  private lastMatchContext: LiveMatchContext | null = null;
  private lastVoiceName: GeminiBroadcastVoice = 'Charon';
  private connectTimeoutId: number | null = null;
  private callbacks: LiveVoiceClientCallbacks;

  constructor(callbacks: LiveVoiceClientCallbacks) {
    this.callbacks = callbacks;
  }

  public updateMatchContext(matchContext: LiveMatchContext): void {
    this.lastMatchContext = matchContext;
  }

  public async connect(options: {
    matchContext: LiveMatchContext;
    voiceName?: GeminiBroadcastVoiceChoice;
    promptOpening?: boolean;
  }): Promise<void> {
    this.disconnect();
    this.disposed = false;
    this.fallbackMode = false;
    this.lastMatchContext = options.matchContext;
    this.lastVoiceName = resolveVoiceForBroadcastStage(
      options.voiceName,
      options.matchContext.phase || 'half-time',
      `${options.matchContext.homeTeam}:${options.matchContext.awayTeam}`
    );
    this.callbacks.onStatusChange?.('connecting');

    const activateRestStudioMode = async (runOpeningTurn: boolean) => {
      if (this.disposed || this.fallbackMode) return;
      this.fallbackMode = true;
      if (this.connectTimeoutId !== null) {
        window.clearTimeout(this.connectTimeoutId);
        this.connectTimeoutId = null;
      }
      if (this.ws) {
        try {
          this.ws.onopen = null;
          this.ws.onmessage = null;
          this.ws.onerror = null;
          this.ws.onclose = null;
          this.ws.close();
        } catch {
          // Ignore
        }
        this.ws = null;
      }
      this.callbacks.onStatusChange?.('live');
      if (runOpeningTurn) {
        await this.executeRestPunditTurn('', true);
      }
    };

    const AudioCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) {
      await activateRestStudioMode(options.promptOpening ?? true);
      return;
    }

    this.outputCtx = new AudioCtor({ sampleRate: 24000 });
    if (this.outputCtx.state === 'suspended') {
      await this.outputCtx.resume().catch(() => {});
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${wsProtocol}//${window.location.host}/api/gemini/live`);
    this.ws = ws;
    let liveReady = false;

    this.connectTimeoutId = window.setTimeout(() => {
      if (!this.disposed && !liveReady && !this.fallbackMode) {
        void activateRestStudioMode(options.promptOpening ?? true);
      }
    }, 4500);

    ws.onopen = () => {
      if (this.disposed || this.fallbackMode) return;
      ws.send(
        JSON.stringify({
          type: 'init',
          matchContext: options.matchContext,
          voiceName: this.lastVoiceName,
          promptOpening: options.promptOpening ?? true,
        })
      );
    };

    ws.onmessage = (event) => {
      if (this.disposed || this.fallbackMode) return;
      try {
        const msg = JSON.parse(String(event.data || '{}')) as {
          type?: string;
          audio?: string;
          text?: string;
          error?: string;
        };

        if (msg.type === 'ready') {
          liveReady = true;
          if (this.connectTimeoutId !== null) {
            window.clearTimeout(this.connectTimeoutId);
            this.connectTimeoutId = null;
          }
          this.callbacks.onStatusChange?.('live');
        } else if (msg.type === 'fallback' || msg.type === 'error') {
          void activateRestStudioMode(!liveReady && (options.promptOpening ?? true));
        } else if (msg.type === 'audio' && msg.audio) {
          this.enqueueOutputPcm(msg.audio);
        } else if (msg.type === 'outputTranscript' && msg.text) {
          this.callbacks.onOutputTranscript?.(msg.text);
        } else if (msg.type === 'interrupted') {
          this.clearOutputQueue();
        } else if (msg.type === 'turnComplete') {
          this.callbacks.onTurnComplete?.();
        } else if (msg.type === 'closed') {
          if (!liveReady) {
            void activateRestStudioMode(options.promptOpening ?? true);
          } else {
            this.disconnect();
          }
        }
      } catch {
        // Ignore malformed server frame
      }
    };

    ws.onerror = () => {
      if (!this.disposed && !this.fallbackMode) {
        void activateRestStudioMode(!liveReady && (options.promptOpening ?? true));
      }
    };

    ws.onclose = () => {
      if (!this.disposed && !this.fallbackMode) {
        if (!liveReady) {
          void activateRestStudioMode(options.promptOpening ?? true);
        } else {
          this.disconnect();
        }
      }
    };
  }

  private async executeRestPunditTurn(
    prompt: string,
    isOpening: boolean,
    conversationHistory?: Array<{ role: 'user' | 'pundit'; text: string }>
  ): Promise<void> {
    if (this.disposed || !this.lastMatchContext) return;
    try {
      const res = await fetch('/api/gemini/live-pundit-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchContext: this.lastMatchContext,
          voiceName: this.lastVoiceName,
          userPrompt: prompt,
          isOpening,
          conversationHistory,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        script?: string;
        audioBase64?: string;
        speechFallback?: boolean;
        voiceName?: GeminiBroadcastVoice;
        model?: string;
      };
      if (this.disposed || !data.script) return;
      this.callbacks.onOutputTranscript?.(data.script);
      await geminiHalftimeAudio.playBroadcastResponse(
        {
          audioBase64: data.audioBase64 || '',
          mimeType: 'audio/wav',
          speechFallback: Boolean(data.speechFallback || !data.audioBase64),
          script: data.script,
          voiceName: (data.voiceName as GeminiBroadcastVoice) || this.lastVoiceName,
          model: data.model || 'broadcast-voice-engine',
        },
        {
          onStart: () => {
            if (!this.disposed) this.callbacks.onSpeakingChange?.(true);
          },
          onEnd: () => {
            if (!this.disposed) {
              this.callbacks.onSpeakingChange?.(false);
              this.callbacks.onTurnComplete?.();
            }
          },
          onError: () => {
            if (!this.disposed) {
              this.callbacks.onSpeakingChange?.(false);
              this.callbacks.onTurnComplete?.();
            }
          },
        }
      );
    } catch {
      if (!this.disposed) {
        this.callbacks.onSpeakingChange?.(false);
        this.callbacks.onTurnComplete?.();
      }
    }
  }

  public sendText(
    text: string,
    conversationHistory?: Array<{ role: 'user' | 'pundit'; text: string }>
  ): void {
    const clean = text.trim();
    if (!clean || this.disposed) return;
    if (this.fallbackMode) {
      void this.executeRestPunditTurn(clean, false, conversationHistory);
      return;
    }
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.fallbackMode = true;
      void this.executeRestPunditTurn(clean, false, conversationHistory);
      return;
    }
    this.clearOutputQueue();
    this.ws.send(JSON.stringify({ text: clean }));
  }

  private enqueueOutputPcm(base64Pcm: string): void {
    if (!this.outputCtx || this.disposed) return;
    if (this.outputCtx.state === 'suspended') {
      void this.outputCtx.resume().catch(() => {});
    }

    const bytes = base64ToUint8Array(base64Pcm);
    const sampleCount = Math.floor(bytes.byteLength / 2);
    if (sampleCount <= 0) return;

    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const audioBuffer = this.outputCtx.createBuffer(1, sampleCount, 24000);
    const channelData = audioBuffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
      channelData[i] = view.getInt16(i * 2, true) / 32768;
    }

    const now = this.outputCtx.currentTime;
    const startAt = Math.max(now + 0.015, this.nextStartTime);
    this.nextStartTime = startAt + audioBuffer.duration;

    const source = this.outputCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.outputCtx.destination);
    this.scheduledSources.add(source);
    this.callbacks.onSpeakingChange?.(true);

    source.onended = () => {
      this.scheduledSources.delete(source);
      if (this.scheduledSources.size === 0) {
        this.callbacks.onSpeakingChange?.(false);
      }
    };

    source.start(startAt);
  }

  private clearOutputQueue(): void {
    for (const src of this.scheduledSources) {
      try {
        src.onended = null;
        src.stop();
        src.disconnect();
      } catch {
        // Ignore
      }
    }
    this.scheduledSources.clear();
    this.nextStartTime = 0;
    this.callbacks.onSpeakingChange?.(false);
  }

  public disconnect(): void {
    this.disposed = true;
    if (this.connectTimeoutId !== null) {
      window.clearTimeout(this.connectTimeoutId);
      this.connectTimeoutId = null;
    }
    if (this.fallbackMode) {
      geminiHalftimeAudio.stop();
    }
    this.fallbackMode = false;
    this.clearOutputQueue();

    if (this.outputCtx) {
      void this.outputCtx.close().catch(() => {});
      this.outputCtx = null;
    }
    if (this.ws) {
      try {
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'close' }));
        }
        this.ws.close();
      } catch {
        // Ignore
      }
      this.ws = null;
    }

    this.callbacks.onSpeakingChange?.(false);
    this.callbacks.onStatusChange?.('idle');
  }
}
