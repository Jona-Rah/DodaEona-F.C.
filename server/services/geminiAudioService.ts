import crypto from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { GoogleGenAI, LiveServerMessage, Modality, ThinkingLevel, Type } from '@google/genai';
import { WebSocket, WebSocketServer } from 'ws';

export type GeminiBroadcastVoice = 'Fenrir' | 'Puck' | 'Charon' | 'Orus';

const COMMENTARY_VOICES: readonly GeminiBroadcastVoice[] = ['Fenrir', 'Puck'];
const ANALYSIS_VOICES: readonly GeminiBroadcastVoice[] = ['Charon', 'Orus'];

const ALLOWED_VOICES = new Set<GeminiBroadcastVoice>([
  'Fenrir',
  'Puck',
  'Charon',
  'Orus',
]);

function isHighEnergyCommentaryStage(type?: string): boolean {
  return (
    type === 'penalty-kick' ||
    type === 'penalties-intro' ||
    type === 'end-of-90' ||
    type === 'et-interval' ||
    type === 'live-event' ||
    type === 'penalties' ||
    type === 'first-half' ||
    type === 'second-half' ||
    type === 'extra-time-1' ||
    type === 'extra-time-2'
  );
}

export function selectDefaultVoiceForStage(
  stage?: string,
  _seedInput = ''
): GeminiBroadcastVoice {
  if (stage === 'tactical') return 'Orus';
  return 'Charon';
}

export function normalizeBroadcastVoice(
  raw: unknown,
  stageOrFallback: string = 'Charon',
  seedInput = ''
): GeminiBroadcastVoice {
  const val = String(raw || '').trim() as GeminiBroadcastVoice;
  if (ALLOWED_VOICES.has(val)) return val;
  if (ALLOWED_VOICES.has(stageOrFallback as GeminiBroadcastVoice)) {
    return stageOrFallback as GeminiBroadcastVoice;
  }
  return selectDefaultVoiceForStage(stageOrFallback, seedInput);
}

export class GeminiServiceError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = 'GeminiServiceError';
    this.statusCode = statusCode;
  }
}

const QUOTA_COOLDOWN_MS = 90_000;
let textQuotaCooldownUntil = 0;
let liteTtsCooldownUntil = 0;
let flashTtsCooldownUntil = 0;
let ttsQueueTail: Promise<void> = Promise.resolve();
let lastTtsDispatchAt = 0;
const TTS_MIN_GAP_MS = 90;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new GeminiServiceError(`${label} timed out after ${timeoutMs}ms`, 504));
    }, timeoutMs);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

function hasValidGeminiApiKey(): boolean {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  return Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY');
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new GeminiServiceError(
      'Gemini API key is missing. Please add a valid GEMINI_API_KEY in Settings > Secrets.',
      503
    );
  }
  return new GoogleGenAI({
    apiKey,
    apiVersion: 'v1beta',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function mapGeminiApiError(err: unknown): GeminiServiceError {
  if (err instanceof GeminiServiceError) return err;
  const anyErr = err as { status?: number; code?: string | number; message?: string };
  const rawMsg = String(anyErr?.message || err || 'Unknown Gemini API error');
  const status = typeof anyErr?.status === 'number' ? anyErr.status : 500;

  if (/PERMISSION_DENIED|API_KEY_INVALID|API key not valid/i.test(rawMsg) || status === 403) {
    return new GeminiServiceError(
      'Gemini API key is invalid or lacks permission. Please verify GEMINI_API_KEY in Settings > Secrets.',
      403
    );
  }
  if (/RESOURCE_EXHAUSTED|quota|rate limit/i.test(rawMsg) || status === 429) {
    return new GeminiServiceError(
      'Gemini API quota limit reached. Please try again shortly or check your quota in Settings > Secrets.',
      429
    );
  }
  if (/NOT_FOUND/i.test(rawMsg) || status === 404) {
    return new GeminiServiceError(
      `Requested Gemini model is unavailable: ${rawMsg}`,
      404
    );
  }
  return new GeminiServiceError(rawMsg, status >= 400 && status < 600 ? status : 502);
}

function isQuotaOrUnavailableError(err: unknown): boolean {
  const mapped = mapGeminiApiError(err);
  return (
    mapped.statusCode === 429 ||
    mapped.statusCode === 503 ||
    mapped.statusCode === 403 ||
    mapped.statusCode === 404
  );
}

function enqueueTtsRequest<T>(fn: () => Promise<T>): Promise<T> {
  const task = ttsQueueTail.then(async () => {
    const elapsed = Date.now() - lastTtsDispatchAt;
    if (elapsed < TTS_MIN_GAP_MS) {
      await new Promise((r) => setTimeout(r, TTS_MIN_GAP_MS - elapsed));
    }
    lastTtsDispatchAt = Date.now();
    return fn();
  });
  ttsQueueTail = task.then(
    () => undefined,
    () => undefined
  );
  return task;
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 1): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const mapped = mapGeminiApiError(err);
      if (
        mapped.statusCode === 400 ||
        mapped.statusCode === 401 ||
        mapped.statusCode === 403 ||
        mapped.statusCode === 404 ||
        mapped.statusCode === 429 ||
        mapped.statusCode === 503
      ) {
        throw mapped;
      }
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 350 * Math.pow(2, attempt)));
      }
    }
  }
  throw mapGeminiApiError(lastErr);
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

export interface HalftimeAnnouncePayload {
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
  voiceName?: string;
  voiceChoice?: string;
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

export interface MatchAnnouncePayload extends HalftimeAnnouncePayload {
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

export interface HalftimeAnnounceResult {
  audioBase64: string;
  mimeType: 'audio/wav';
  speechFallback?: boolean;
  script: string;
  segments?: BroadcastAudioSegment[];
  voiceName: GeminiBroadcastVoice;
  model: string;
  announcementType: MatchBroadcastType;
  storyline?: string;
  cached: boolean;
}

const halftimeCache = new Map<
  string,
  { expiresAt: number; result: Omit<HalftimeAnnounceResult, 'cached'> }
>();
const inFlightBroadcasts = new Map<string, Promise<Omit<HalftimeAnnounceResult, 'cached'>>>();
const CACHE_TTL_MS = 20 * 60 * 1000;
const FALLBACK_CACHE_TTL_MS = 45 * 1000;
const CACHE_MAX_ENTRIES = 160;

interface DetectedStoryline {
  id: string;
  priority: number;
  headline: string;
  toneCue: string;
}

interface MatchStorylineReport {
  primary: DetectedStoryline;
  secondary: DetectedStoryline[];
  trajectoryText: string;
  moodLabel: string;
}

function formatMinuteLabel(minute: number, addedMinute?: number): string {
  return addedMinute && addedMinute > 0 ? `${minute}+${addedMinute}'` : `${minute}'`;
}

function analyzeMatchStorylines(
  payload: MatchAnnouncePayload,
  type: MatchBroadcastType
): MatchStorylineReport {
  const homeTeam = payload.homeTeam.trim();
  const awayTeam = payload.awayTeam.trim();
  const homeScore = Math.max(0, Math.floor(Number(payload.homeScore) || 0));
  const awayScore = Math.max(0, Math.floor(Number(payload.awayScore) || 0));
  const dossier = payload.dossier;
  const highlights = Array.isArray(dossier?.timelineHighlights) ? dossier!.timelineHighlights : [];
  const rawGoals: MatchTimelineHighlight[] =
    highlights.filter((e) => e.type === 'goal' || e.type === 'own-goal').length > 0
      ? highlights.filter((e) => e.type === 'goal' || e.type === 'own-goal')
      : (payload.firstHalfGoals || []).map((g) => ({
          minute: g.minute,
          addedMinute: g.addedMinute,
          type: 'goal',
          teamSide: g.teamSide,
          playerName: g.playerName,
          isPenalty: g.isPenalty,
        }));

  const sortedGoals = [...rawGoals].sort(
    (a, b) => a.minute + (a.addedMinute || 0) * 0.01 - (b.minute + (b.addedMinute || 0) * 0.01)
  );

  // Track exact chronological score evolution
  let runH = 0;
  let runA = 0;
  let maxHomeDeficit = 0;
  let maxAwayDeficit = 0;
  const trajectoryParts: string[] = [];
  let lateWinnerSide: 'home' | 'away' | null = null;
  let lateWinnerDetail = '';
  let lateEqDetail = '';

  for (const g of sortedGoals) {
    const prevDiff = runH - runA;
    if (g.teamSide === 'home') runH += 1;
    else runA += 1;
    const nextDiff = runH - runA;

    maxHomeDeficit = Math.max(maxHomeDeficit, runA - runH);
    maxAwayDeficit = Math.max(maxAwayDeficit, runH - runA);

    const minLbl = formatMinuteLabel(g.minute, g.addedMinute);
    const scorer = g.playerName || 'Scorer';
    trajectoryParts.push(`${scorer} (${minLbl}) -> ${runH}-${runA}`);

    const isLate90 = g.minute >= 88 && g.minute <= 90;
    const isLateET = g.minute >= 118;
    if ((isLate90 || isLateET) && prevDiff === 0 && nextDiff !== 0) {
      lateWinnerSide = nextDiff > 0 ? 'home' : 'away';
      lateWinnerDetail = `${scorer} struck at ${minLbl} to put ${
        g.teamSide === 'home' ? homeTeam : awayTeam
      } ahead late`;
    } else if ((isLate90 || isLateET) && prevDiff !== 0 && nextDiff === 0) {
      lateEqDetail = `${scorer} rescued a level score at ${minLbl}`;
    }
  }

  const signals: DetectedStoryline[] = [];
  const leadingSide: 'home' | 'away' | 'draw' =
    homeScore > awayScore ? 'home' : awayScore > homeScore ? 'away' : 'draw';
  const leaderName = leadingSide === 'home' ? homeTeam : leadingSide === 'away' ? awayTeam : '';
  const trailerName = leadingSide === 'home' ? awayTeam : leadingSide === 'away' ? homeTeam : '';
  const margin = Math.abs(homeScore - awayScore);
  const totalGoals = homeScore + awayScore;

  // 1. Penalty shootout drama at Full-Time
  if (type === 'full-time' && payload.penaltyShootout?.winner) {
    const ps = payload.penaltyShootout;
    const penWinner = ps.winner === 'home' ? homeTeam : awayTeam;
    signals.push({
      id: 'penalty_shootout_victory',
      priority: 100,
      headline: `${penWinner} prevailed ${ps.homeScore}-${ps.awayScore} in a nerve-shredding penalty shootout after a ${homeScore}-${awayScore} stalemate`,
      toneCue: 'Electrifying, triumphant, high drama after spot-kick tension',
    });
  }

  // 2. Last-minute winner / equaliser
  const lastGoal = sortedGoals[sortedGoals.length - 1];
  if (
    lastGoal &&
    lateWinnerSide &&
    lateWinnerSide === leadingSide &&
    (type === 'full-time' || type === 'end-of-90' || type === 'penalties-intro')
  ) {
    signals.push({
      id: 'last_minute_winner',
      priority: 98,
      headline: `Late drama: ${lateWinnerDetail}`,
      toneCue: 'Breathless, dramatic, explosive football storytelling',
    });
  } else if (lateEqDetail && leadingSide === 'draw') {
    signals.push({
      id: 'last_minute_equaliser',
      priority: 95,
      headline: `Dramatic late salvage: ${lateEqDetail}`,
      toneCue: 'Suspenseful and energetic after a stoppage-time rescue',
    });
  }

  // 3. Dramatic Comeback (especially trailing by 2+ goals, or losing at HT and winning at FT)
  const htH = dossier?.halfTimeScore?.home;
  const htA = dossier?.halfTimeScore?.away;
  const wonAfterTrailing2 =
    (leadingSide === 'home' && maxHomeDeficit >= 2) ||
    (leadingSide === 'away' && maxAwayDeficit >= 2);
  const drewAfterTrailing2 =
    leadingSide === 'draw' && (maxHomeDeficit >= 2 || maxAwayDeficit >= 2);
  const flippedHtDeficit =
    type !== 'half-time' &&
    typeof htH === 'number' &&
    typeof htA === 'number' &&
    ((htH < htA && homeScore >= awayScore) || (htA < htH && awayScore >= homeScore));

  if (wonAfterTrailing2) {
    signals.push({
      id: 'extraordinary_comeback',
      priority: 97,
      headline: `Extraordinary comeback: ${leaderName} fought back from at least two goals down to take the lead/victory`,
      toneCue: 'Awestruck, passionate, highlighting unbelievable resilience',
    });
  } else if (drewAfterTrailing2 || flippedHtDeficit) {
    signals.push({
      id: 'dramatic_comeback',
      priority: 91,
      headline:
        flippedHtDeficit && leaderName
          ? `Second-half turnaround: ${leaderName} trailed ${htH}-${htA} at the break before flipping the tie`
          : `Resilient fightback from two goals down to pull level at ${homeScore}-${awayScore}`,
      toneCue: 'Energetic, admiring mental resilience and momentum shift',
    });
  }

  // 4. Stoppage-time blitz (2+ stoppage goals in a period)
  const stoppageGoals = sortedGoals.filter((g) => (g.addedMinute || 0) > 0);
  if (stoppageGoals.length >= 2) {
    signals.push({
      id: 'stoppage_time_blitz',
      priority: 90,
      headline: `Stoppage-time frenzy with ${stoppageGoals.length} added-time goals transforming the scoreboard right before the whistle`,
      toneCue: 'Urgent, astonished by added-time chaos',
    });
  }

  // 5. Shock underdog lead or win
  const pre = dossier?.preMatchContext;
  if (pre && leadingSide !== 'draw') {
    const winPct = leadingSide === 'home' ? pre.homeWinPct : pre.awayWinPct;
    const ratingGap =
      typeof pre.homeRating === 'number' && typeof pre.awayRating === 'number'
        ? leadingSide === 'home'
          ? pre.awayRating - pre.homeRating
          : pre.homeRating - pre.awayRating
        : 0;
    const isUpset =
      (pre.favouriteSide && pre.favouriteSide !== 'even' && pre.favouriteSide !== leadingSide && (winPct ?? 50) <= 30) ||
      ratingGap >= 5;
    if (isUpset) {
      signals.push({
        id: 'shock_upset',
        priority: 92,
        headline: `Major upset brewing/completed: underdogs ${leaderName} hold a ${homeScore}-${awayScore} edge over heavily favoured ${trailerName}`,
        toneCue: 'Surprised, thrilled, captivated by an against-the-odds upset',
      });
    }
  }

  // 6. Tactical / statistical dominance OR against-the-run-of-play
  const st = dossier?.statsAvailable && dossier?.stats ? dossier.stats : null;
  if (st) {
    const hPoss = st.home.possession ?? 50;
    const aPoss = st.away.possession ?? 50;
    const hShots = st.home.shots ?? 0;
    const aShots = st.away.shots ?? 0;
    const hXg = st.home.xg ?? 0;
    const aXg = st.away.xg ?? 0;
    const hSaves = st.home.saves ?? 0;
    const aSaves = st.away.saves ?? 0;
    const combinedMissed = (st.home.bigChancesMissed ?? 0) + (st.away.bigChancesMissed ?? 0);

    if (leadingSide !== 'draw') {
      const leadPoss = leadingSide === 'home' ? hPoss : aPoss;
      const leadShots = leadingSide === 'home' ? hShots : aShots;
      const trailShots = leadingSide === 'home' ? aShots : hShots;
      const leadXg = leadingSide === 'home' ? hXg : aXg;
      const trailXg = leadingSide === 'home' ? aXg : hXg;
      const leadSaves = leadingSide === 'home' ? hSaves : aSaves;

      if (margin >= 2 && (leadPoss >= 57 || leadShots >= trailShots + 5 || leadXg >= trailXg + 0.8)) {
        signals.push({
          id: 'dominant_performance',
          priority: 87,
          headline: `Total authority: ${leaderName} command ${leadPoss}% possession, ${leadShots} shots (${leadXg.toFixed(
            2
          )} xG) and a ${margin}-goal cushion`,
          toneCue: 'Confident, authoritative, praising tactical control and clinical cutting edge',
        });
      } else if (leadPoss <= 43 && (trailShots >= leadShots + 4 || trailXg >= leadXg + 0.45)) {
        signals.push({
          id: 'against_the_run_of_play',
          priority: 89,
          headline: `Defensive resilience & counter-punching: ${leaderName} lead despite only ${leadPoss}% possession while ${trailerName} racked up ${trailShots} shots (${trailXg.toFixed(
            2
          )} xG)${leadSaves >= 4 ? ` and ${leadSaves} goalkeeper saves` : ''}`,
          toneCue: 'Analytical, admiring disciplined defending, goalkeeper heroics and ruthless counters',
        });
      }
    } else if (homeScore === 0 && awayScore === 0 && (hXg + aXg >= 1.6 || hSaves + aSaves >= 7 || combinedMissed >= 3)) {
      signals.push({
        id: 'goalkeeping_stalemate',
        priority: 86,
        headline: `Action-packed goalless battle: ${(hShots + aShots)} total shots and ${(hXg + aXg).toFixed(
          2
        )} combined xG thwarted by ${(hSaves + aSaves)} saves and profligate finishing`,
        toneCue: 'Engaging, amazed how it remains 0-0 given all the chances and saves',
      });
    } else if (hSaves + aSaves >= 10) {
      signals.push({
        id: 'goalkeeping_heroics',
        priority: 82,
        headline: `Goalkeeping showcase with ${hSaves + aSaves} saves between the sticks keeping the tie razor-tight`,
        toneCue: 'Appreciative, highlighting standout shot-stopping',
      });
    }
  }

  // 7. Red card turning point
  const redCards = highlights.filter((e) => e.type === 'red' || e.type === 'second-yellow');
  if (redCards.length > 0) {
    const firstRed = redCards[0];
    const team = firstRed.teamSide === 'home' ? homeTeam : awayTeam;
    signals.push({
      id: 'red_card_impact',
      priority: 85,
      headline: `Dismissal for ${firstRed.playerName || team} (${formatMinuteLabel(
        firstRed.minute,
        firstRed.addedMinute
      )}) reshaped the numerical balance`,
      toneCue: 'Sharp, analytical about playing with ten men',
    });
  }

  // 8. Penalty missed/saved in normal play
  const missedPens = highlights.filter((e) => e.type === 'penalty-missed');
  if (missedPens.length > 0) {
    const mp = missedPens[0];
    signals.push({
      id: 'missed_penalty',
      priority: 83,
      headline: `Pivotal spot-kick miss/save involving ${mp.playerName || 'the penalty taker'} at ${formatMinuteLabel(
        mp.minute,
        mp.addedMinute
      )}`,
      toneCue: 'Dramatic focus on a costly moment from twelve yards',
    });
  }

  // 9. Quickfire consecutive goals
  for (let i = 1; i < sortedGoals.length; i++) {
    const prevG = sortedGoals[i - 1];
    const currG = sortedGoals[i];
    if (currG.minute - prevG.minute <= 4 && currG.minute - prevG.minute >= 0) {
      signals.push({
        id: 'quickfire_double',
        priority: 80,
        headline: `Quickfire burst with two goals inside ${Math.max(1, currG.minute - prevG.minute)} minutes (${prevG.minute}' & ${currG.minute}')`,
        toneCue: 'Fast-paced and lively after back-to-back strikes',
      });
      break;
    }
  }

  // 10. Immediate kickoff / restart strike
  const fastStrike = sortedGoals.find(
    (g) => (g.minute >= 1 && g.minute <= 4) || (g.minute >= 46 && g.minute <= 49) || (g.minute >= 91 && g.minute <= 94)
  );
  if (fastStrike) {
    signals.push({
      id: 'immediate_restart_goal',
      priority: 76,
      headline: `Lightning start: ${fastStrike.playerName || 'Scorer'} struck immediately at ${formatMinuteLabel(
        fastStrike.minute,
        fastStrike.addedMinute
      )}`,
      toneCue: 'Crisp, pointing out early concentration lapses',
    });
  }

  // 11. Super-sub impact
  const subs = dossier?.substitutions || [];
  const subScorers = subs.filter((s) =>
    sortedGoals.some((g) => g.playerName === s.playerIn && g.minute >= s.minute) ||
    sortedGoals.some((g) => g.assistPlayerName === s.playerIn && g.minute >= s.minute)
  );
  if (subScorers.length > 0) {
    signals.push({
      id: 'super_sub_impact',
      priority: 84,
      headline: `Inspired substitution: ${subScorers[0].playerIn} came off the bench at ${subScorers[0].minute}' and directly influenced the scoring`,
      toneCue: 'Tactically insightful, crediting the manager bench impact',
    });
  }

  // 12. High-scoring thriller
  if ((type === 'half-time' && totalGoals >= 3) || (type !== 'half-time' && totalGoals >= 5)) {
    signals.push({
      id: 'high_scoring_thriller',
      priority: 81,
      headline: `End-to-end goal fest featuring ${totalGoals} goals in an open attacking spectacle`,
      toneCue: 'Vibrant, breathless, high-energy broadcast commentary',
    });
  }

  // 13. Tactical adjustment impact
  if ((dossier?.tactics?.tacticalChanges?.length || 0) > 0 && type !== 'half-time') {
    const tc = dossier!.tactics!.tacticalChanges![0];
    signals.push({
      id: 'tactical_adjustment',
      priority: 75,
      headline: `${tc.teamSide === 'home' ? homeTeam : awayTeam} altered their tactical setup at ${tc.minute}' (${tc.description})`,
      toneCue: 'Intelligent, analytical focus on managerial chess',
    });
  }

  // 14. Extra time battle
  if (payload.wentToExtraTime && (type === 'full-time' || type === 'et-interval' || type === 'penalties-intro')) {
    signals.push({
      id: 'extra_time_battle',
      priority: 79,
      headline: `Gruelling 120-minute endurance test pushed deep into extra time`,
      toneCue: 'Dramatic appreciation of stamina and late nerve',
    });
  }

  signals.sort((a, b) => b.priority - a.priority);

  const fallbackPrimary: DetectedStoryline =
    leadingSide === 'draw'
      ? {
          id: 'tight_stalemate',
          priority: 50,
          headline: `Finely balanced contest at ${homeScore}-${awayScore} between ${homeTeam} and ${awayTeam}`,
          toneCue: type === 'half-time' ? 'Measured, analytical halftime assessment' : 'Reflective full-time summary',
        }
      : {
          id: 'competitive_edge',
          priority: 55,
          headline: `${leaderName} hold a ${homeScore}-${awayScore} advantage in a competitive duel with ${trailerName}`,
          toneCue:
            type === 'half-time'
              ? 'Engaging, analytical halftime report looking ahead to the second half'
              : 'Authoritative, conclusive post-match broadcast verdict',
        };

  const primary = signals[0] || fallbackPrimary;
  const secondary = signals.slice(1, 3);

  const moodLabel =
    primary.id.includes('last_minute') || primary.id.includes('comeback') || primary.id.includes('penalty_shootout')
      ? 'Dramatic & Electrified'
      : primary.id === 'shock_upset'
      ? 'Surprised & Thrilled'
      : primary.id === 'dominant_performance'
      ? 'Commanding & Authoritative'
      : primary.id === 'against_the_run_of_play' || primary.id === 'tactical_adjustment' || primary.id === 'red_card_impact'
      ? 'Tactical & Analytical'
      : type === 'full-time'
      ? 'Emotional & Conclusive'
      : 'Sharp & Engaging';

  return {
    primary,
    secondary,
    trajectoryText: trajectoryParts.length > 0 ? trajectoryParts.join(' | ') : 'No goals scored in open play',
    moodLabel,
  };
}

function stripTtsTagsForDisplay(text: string): string {
  let out = String(text || '')
    .replace(/<(?:breath|gasp|laugh|sigh|chuckle)>/gi, ' ')
    .replace(/\|([^|]{1,20})\|/g, (_, inner: string) => {
      const clean = inner.trim();
      if (!clean) return ' ';
      return /[.!?…,:;]$/.test(clean) ? `${clean}` : `${clean},`;
    })
    .replace(/[*_`#]/g, '')
    .replace(/\s+([,.!?;:])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  out = out.replace(
    /(^|[!?]\s+|:\s+|[a-z]{2,}\.\s+)([a-z])/g,
    (_, prefix: string, ch: string) => `${prefix}${ch.toUpperCase()}`
  );
  return out;
}

interface BroadcastTurnPlan {
  speaker: GeminiBroadcastVoice;
  ttsText: string;
  cleanText: string;
  emotion: BroadcastEmotion;
  pauseAfterMs: number;
  style: string;
}

function getDuoSpeakersForStage(
  _type: MatchBroadcastType
): [GeminiBroadcastVoice, GeminiBroadcastVoice] {
  // Maintain stable commentator identities across the entire match:
  // Charon = Main play-by-play & studio lead, Orus = Expressive co-commentator & tactician
  return ['Charon', 'Orus'];
}

function shouldUseDuoBanter(
  payload: MatchAnnouncePayload,
  type: MatchBroadcastType
): boolean {
  if (type === 'penalty-kick') return false;
  const choice = String(payload.voiceChoice || '').trim();
  if (choice === 'Auto') return true;
  if (!choice) {
    const rawVoice = String(payload.voiceName || '').trim();
    return !rawVoice || rawVoice === 'Auto';
  }
  return false;
}

const VOICE_CORE_IDENTITY: Record<GeminiBroadcastVoice, string> = {
  Charon:
    'Deep, confident, authoritative male British football play-by-play commentator — measured resonance, crisp diction, clear match presence',
  Orus:
    'Noticeably lighter, warm, expressive male football co-commentator — conversational cadence, observant and analytical with natural human rhythm',
  Fenrir:
    'Resonant, urgent male football broadcaster — incisive play-by-play pacing with stadium presence',
  Puck:
    'Lively, bright, conversational football co-commentator — quick timing and sharp match reading',
};

const EMOTION_DIRECTION: Record<BroadcastEmotion, { charon: string; orus: string }> = {
  normal: {
    charon: 'controlled, assured conversational broadcast pace, never rushing',
    orus: 'relaxed, intelligent co-commentator tone with natural pauses',
  },
  attack: {
    charon: 'building anticipation, brisker pace as the move develops',
    orus: 'alert, leaning forward as space opens up',
  },
  goal: {
    charon: 'immediate, thrilling goal call with real vocal punch and stadium weight — no cartoonish yelling',
    orus: 'warm, genuinely delighted reaction with natural emphasis and crisp clarity',
  },
  miss: {
    charon: 'surprised lift turning into rueful disappointment as the chance slips past',
    orus: 'wry, slightly incredulous sigh and thoughtful observation',
  },
  save: {
    charon: 'brisk, impressed burst crediting sharp goalkeeping',
    orus: 'appreciative, nodding respect for the goalkeeper’s timing',
  },
  'red-card': {
    charon: 'serious, weighty, sober delivery marking a major disciplinary turning point',
    orus: 'firm, candid, analytical reaction weighing the tactical damage',
  },
  tactical: {
    charon: 'calm, poised studio anchor keeping the discussion moving',
    orus: 'calm, insightful, thoughtful tactical analyst speaking naturally',
  },
  'late-tension': {
    charon: 'taut, focused urgency in the closing minutes with fine margins on the line',
    orus: 'quietly intense, noticing fatigue and nerve on the touchline',
  },
  verdict: {
    charon: 'composed, balanced full-time broadcaster summing up the outcome with weight',
    orus: 'honest, reflective co-commentator offering a grounded final judgement',
  },
};

function selectTurnTtsStyle(
  voiceName: GeminiBroadcastVoice,
  emotion: BroadcastEmotion
): string {
  const base = VOICE_CORE_IDENTITY[voiceName];
  const dir =
    voiceName === 'Charon' || voiceName === 'Fenrir'
      ? EMOTION_DIRECTION[emotion].charon
      : EMOTION_DIRECTION[emotion].orus;
  return `${base}. Emotional delivery: ${dir}. Speak naturally like a real TV football broadcaster, never robotic or trailer-like.`;
}

function selectBroadcastTtsStyle(
  type: MatchBroadcastType,
  voiceName: GeminiBroadcastVoice,
  story: MatchStorylineReport
): string {
  const emotion: BroadcastEmotion =
    type === 'penalty-kick'
      ? 'late-tension'
      : type === 'full-time'
      ? 'verdict'
      : type === 'half-time'
      ? 'tactical'
      : 'attack';
  return `${selectTurnTtsStyle(voiceName, emotion)} (${story.moodLabel})`;
}

function inferDefaultEmotionForStage(
  type: MatchBroadcastType,
  liveEventType?: string,
  scoreDiff = 0
): BroadcastEmotion {
  if (type === 'live-event') {
    if (liveEventType === 'goal' || liveEventType === 'own-goal') return 'goal';
    if (liveEventType === 'red' || liveEventType === 'second-yellow') return 'red-card';
    if (
      liveEventType === 'penalty-missed' ||
      liveEventType === 'woodwork' ||
      liveEventType === 'big-chance-missed'
    ) {
      return 'miss';
    }
    if (liveEventType === 'shot-saved') return 'save';
    if (liveEventType === 'tactical-change' || liveEventType === 'sub') return 'tactical';
    if (liveEventType === 'late-tension') return 'late-tension';
    return 'attack';
  }
  if (type === 'penalty-kick') return 'late-tension';
  if (type === 'penalties-intro' || type === 'end-of-90' || type === 'et-interval') {
    return scoreDiff === 0 ? 'late-tension' : 'verdict';
  }
  if (type === 'full-time') return 'verdict';
  return 'tactical';
}

function assembleTurnsResult(
  turns: Array<{ speaker: GeminiBroadcastVoice; text: string; emotion: BroadcastEmotion; pauseAfterMs?: number }>,
  singleSpeakerOverride?: GeminiBroadcastVoice
): {
  displayScript: string;
  ttsScript: string;
  turns: BroadcastTurnPlan[];
  segments: BroadcastAudioSegment[];
} {
  const normalizedTurns: BroadcastTurnPlan[] = turns
    .map((t, idx) => {
      const speaker = singleSpeakerOverride || t.speaker;
      const rawText = String(t.text || '')
        .replace(/[*_`#]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      const cleanText = stripTtsTagsForDisplay(rawText);
      const isLast = idx === turns.length - 1;
      const pauseAfterMs = isLast
        ? 0
        : typeof t.pauseAfterMs === 'number'
        ? Math.max(70, Math.min(260, Math.round(t.pauseAfterMs)))
        : t.emotion === 'goal' || t.emotion === 'save'
        ? 95
        : 145;
      return {
        speaker,
        ttsText: cleanText,
        cleanText,
        emotion: t.emotion,
        pauseAfterMs,
        style: selectTurnTtsStyle(speaker, t.emotion),
      };
    })
    .filter((t) => t.cleanText.length > 0);

  const uniqueSpeakers = new Set(normalizedTurns.map((t) => t.speaker));
  const showNames = uniqueSpeakers.size > 1;
  const displayScript = showNames
    ? normalizedTurns.map((t) => `${t.speaker}: ${t.cleanText}`).join('\n')
    : normalizedTurns.map((t) => t.cleanText).join(' ');

  return {
    displayScript,
    ttsScript: normalizedTurns.map((t) => t.cleanText).join(' '),
    turns: normalizedTurns,
    segments: normalizedTurns.map((t) => ({
      speaker: t.speaker,
      text: t.cleanText,
      emotion: t.emotion,
      pauseAfterMs: t.pauseAfterMs,
    })),
  };
}

function buildFallbackStorylineScript(
  payload: MatchAnnouncePayload,
  type: MatchBroadcastType,
  story: MatchStorylineReport,
  duoPair?: [GeminiBroadcastVoice, GeminiBroadcastVoice],
  soloVoice?: GeminiBroadcastVoice
): {
  displayScript: string;
  ttsScript: string;
  turns: BroadcastTurnPlan[];
  segments: BroadcastAudioSegment[];
} {
  const homeTeam = payload.homeTeam.trim();
  const awayTeam = payload.awayTeam.trim();
  const homeScore = Math.max(0, Math.floor(Number(payload.homeScore) || 0));
  const awayScore = Math.max(0, Math.floor(Number(payload.awayScore) || 0));
  const comp = payload.competitionName?.trim();
  const venue = payload.venueName?.trim();
  const d = payload.dossier;
  const lead = duoPair ? duoPair[0] : soloVoice || 'Charon';
  const co = duoPair ? duoPair[1] : soloVoice || 'Orus';
  const allowDuo = Boolean(duoPair);

  const variantSeed = parseInt(
    computeStableHash(
      `${d?.matchId || homeTeam}::${d?.stateVersion || ''}::${type}::${payload.liveEvent?.id || ''}::${
        payload.penaltyKick?.kickNumber ?? 0
      }::${homeScore}-${awayScore}`
    ).slice(0, 6),
    16
  );

  const formatSpokenMinuteOrdinal = (minute: number, added?: number): string => {
    if (added && added > 0) {
      return `${minute} plus ${added} minutes`;
    }
    const mod100 = minute % 100;
    const suffix =
      mod100 >= 11 && mod100 <= 13
        ? 'th'
        : minute % 10 === 1
        ? 'st'
        : minute % 10 === 2
        ? 'nd'
        : minute % 10 === 3
        ? 'rd'
        : 'th';
    return `the ${minute}${suffix} minute`;
  };

  // Live in-match commentary (goals, cards, saves, misses, subs, tactical shifts, late tension)
  if (type === 'live-event' && payload.liveEvent) {
    const ev = payload.liveEvent;
    const spokenMin = formatSpokenMinuteOrdinal(ev.minute, ev.addedMinute);
    const evTeam = ev.teamSide === 'away' ? awayTeam : homeTeam;
    const oppTeam = ev.teamSide === 'away' ? homeTeam : awayTeam;
    const player = ev.playerName || evTeam;
    const scoreLine = `${homeTeam} ${homeScore}, ${awayTeam} ${awayScore}.`;
    const isCloseLate = ev.minute >= 80 && Math.abs(homeScore - awayScore) <= 1;

    if (ev.type === 'goal' || ev.type === 'own-goal') {
      const assistBit = ev.assistPlayerName
        ? `, set up by ${ev.assistPlayerName}`
        : '';
      const goalCalls = [
        `Goal for ${evTeam}! ${player} finishes it in ${spokenMin}${assistBit}. ${scoreLine}`,
        `${player} scores for ${evTeam} in ${spokenMin}! Composed finish${assistBit}, and it's ${scoreLine}`,
        `Into the net! ${player} strikes for ${evTeam} in ${spokenMin}. ${scoreLine}`,
      ];
      const turns: Array<{ speaker: GeminiBroadcastVoice; text: string; emotion: BroadcastEmotion; pauseAfterMs?: number }> = [
        {
          speaker: lead,
          text: goalCalls[variantSeed % goalCalls.length],
          emotion: 'goal',
          pauseAfterMs: 95,
        },
      ];
      // Do not force both commentators on every goal — Orus reacts naturally on ~60% or big equalizers/late strikes
      if (allowDuo && (variantSeed % 5 !== 0 || isCloseLate || homeScore === awayScore)) {
        const coReactions =
          homeScore === awayScore
            ? [
                `Right back on level terms, and you felt that coming with the way ${evTeam} pushed up.`,
                `A timely equaliser from ${player}. ${oppTeam} switched off at the back post for a split second.`,
              ]
            : isCloseLate
            ? [
                `So decisive at this stage of the game. Now ${oppTeam} have no choice but to throw bodies forward.`,
                `Composure when it mattered most from ${player}. That changes the entire complexion of these final minutes.`,
              ]
            : [
                `Sharp movement in the build-up, and ${player} gave the goalkeeper very little chance from there.`,
                `Clinical finish. ${oppTeam} left too much space between the lines and got punished.`,
              ];
        turns.push({
          speaker: co,
          text: coReactions[variantSeed % coReactions.length],
          emotion: 'goal',
        });
      }
      return assembleTurnsResult(turns, soloVoice);
    }

    if (ev.type === 'red' || ev.type === 'second-yellow') {
      const redCall = `Trouble in ${spokenMin} — ${player} sees red for ${evTeam}. They're down to ten men.`;
      const turns: Array<{ speaker: GeminiBroadcastVoice; text: string; emotion: BroadcastEmotion; pauseAfterMs?: number }> = [
        { speaker: lead, text: redCall, emotion: 'red-card', pauseAfterMs: 140 },
      ];
      if (allowDuo) {
        turns.push({
          speaker: co,
          text: `It's a poor challenge to make with so much left in this match. The manager has to reshuffle the back four immediately.`,
          emotion: 'red-card',
        });
      }
      return assembleTurnsResult(turns, soloVoice);
    }

    if (ev.type === 'penalty-missed' || ev.type === 'woodwork' || ev.type === 'big-chance-missed') {
      const missCall =
        ev.type === 'penalty-missed'
          ? `Missed from twelve yards in ${spokenMin}! ${player} fails to convert for ${evTeam}, and ${scoreLine} stays intact.`
          : ev.type === 'woodwork'
          ? `Off the woodwork in ${spokenMin}. ${player} came agonisingly close for ${evTeam}.`
          : `Big opening in ${spokenMin} for ${evTeam}, and ${player} puts it wide. That was a real sight of goal.`;
      const turns: Array<{ speaker: GeminiBroadcastVoice; text: string; emotion: BroadcastEmotion; pauseAfterMs?: number }> = [
        { speaker: lead, text: missCall, emotion: 'miss', pauseAfterMs: 120 },
      ];
      if (allowDuo && variantSeed % 2 === 0) {
        turns.push({
          speaker: co,
          text: `He'll be thinking about that one. Chances of that quality don't come around often against ${oppTeam}.`,
          emotion: 'miss',
        });
      }
      return assembleTurnsResult(turns, soloVoice);
    }

    if (ev.type === 'shot-saved') {
      const keeper = ev.secondaryPlayerName || 'The goalkeeper';
      return assembleTurnsResult(
        [
          {
            speaker: lead,
            text: `Fine save in ${spokenMin} — ${keeper} gets across cleanly to keep ${player} out.`,
            emotion: 'save',
          },
        ],
        soloVoice
      );
    }

    if (ev.type === 'tactical-change' || ev.type === 'sub') {
      const tacticalLine =
        ev.type === 'sub' && ev.secondaryPlayerName
          ? `Change for ${evTeam} in ${spokenMin}: ${ev.playerName} comes on in place of ${ev.secondaryPlayerName} to freshen up the shape.`
          : `Tactical adjustment from ${evTeam} in ${spokenMin}${
              ev.commentary ? `: ${ev.commentary}` : ' as they look to alter the balance in midfield.'
            }`;
      return assembleTurnsResult(
        [{ speaker: allowDuo ? co : lead, text: tacticalLine, emotion: 'tactical' }],
        soloVoice
      );
    }

    if (ev.type === 'late-tension') {
      const turns: Array<{ speaker: GeminiBroadcastVoice; text: string; emotion: BroadcastEmotion; pauseAfterMs?: number }> = [
        {
          speaker: lead,
          text: `Into ${spokenMin}, and ${
            homeScore === awayScore ? 'a single goal would settle this' : 'just one goal separates them'
          }. ${scoreLine}`,
          emotion: 'late-tension',
          pauseAfterMs: 130,
        },
      ];
      if (allowDuo) {
        turns.push({
          speaker: co,
          text: `Legs are getting heavy now. It comes down to concentration and whoever keeps their composure on the ball.`,
          emotion: 'late-tension',
        });
      }
      return assembleTurnsResult(turns, soloVoice);
    }
  }

  if (type === 'penalty-kick') {
    const kick = payload.penaltyKick;
    if (!kick) {
      return assembleTurnsResult(
        [
          {
            speaker: lead,
            text: `Penalty shootout standings: ${homeTeam} ${payload.penaltyShootout?.homeScore ?? 0}, ${awayTeam} ${
              payload.penaltyShootout?.awayScore ?? 0
            }.`,
            emotion: 'late-tension',
          },
        ],
        soloVoice
      );
    }
    const kickingTeam = kick.teamSide === 'home' ? homeTeam : awayTeam;
    const prefix = kick.suddenDeath
      ? [`Sudden death for ${kickingTeam}.`, `Round ${kick.round}, sudden death for ${kickingTeam}.`][variantSeed % 2]
      : [`Round ${kick.round} for ${kickingTeam}.`, `${kick.takerName} steps forward for ${kickingTeam}.`][
          variantSeed % 2
        ];

    const outcomeLine =
      kick.outcome === 'scored'
        ? [
            `${kick.takerName} sends it firmly into the corner and scores.`,
            `Cleanly struck by ${kick.takerName}, no chance for the keeper.`,
          ][variantSeed % 2]
        : kick.outcome === 'saved'
        ? [
            `Saved! ${kick.keeperName || 'The goalkeeper'} reads ${kick.takerName} and pushes it away.`,
            `${kick.keeperName || 'The keeper'} dives the right way and keeps out ${kick.takerName}'s spot kick.`,
          ][variantSeed % 2]
        : kick.outcome === 'post'
        ? `Off the frame of the goal! ${kick.takerName} hits the post.`
        : `Wide of the target. ${kick.takerName} misses from twelve yards.`;

    const tally = kick.isDecisiveWinner
      ? `${kick.homePenScore > kick.awayPenScore ? homeTeam : awayTeam} win the shootout ${kick.homePenScore} to ${
          kick.awayPenScore
        }.`
      : kick.homePenScore === kick.awayPenScore
      ? `All square at ${kick.homePenScore} apiece.`
      : `${homeTeam} ${kick.homePenScore}, ${awayTeam} ${kick.awayPenScore}.`;

    return assembleTurnsResult(
      [
        {
          speaker: lead,
          text: `${prefix} ${outcomeLine} ${tally}`,
          emotion: kick.outcome === 'saved' ? 'save' : kick.outcome === 'scored' ? 'goal' : 'miss',
        },
      ],
      soloVoice
    );
  }

  const scorersList = (payload.firstHalfGoals || []).slice(0, 3);
  const st = d?.statsAvailable && d.stats ? d.stats : null;
  const poss = st?.home.possession ?? 50;
  const hShots = st?.home.shots ?? 0;
  const aShots = st?.away.shots ?? 0;
  const motm = d?.keyPerformers?.find((p) => p.isMotm) || d?.keyPerformers?.[0];
  const redCard = (d?.timelineHighlights || []).find(
    (e) => e.type === 'red' || e.type === 'second-yellow'
  );
  const leadSide = homeScore > awayScore ? homeTeam : awayScore > homeScore ? awayTeam : null;
  const trailSide = homeScore > awayScore ? awayTeam : awayScore > homeScore ? homeTeam : null;

  if (type === 'end-of-90') {
    const t1 = `Ninety minutes played${venue ? ` at ${venue}` : ''}, and nothing separates ${homeTeam} and ${awayTeam} at ${homeScore}-${awayScore}. We're heading into extra time.`;
    if (!allowDuo) {
      return assembleTurnsResult([{ speaker: lead, text: t1, emotion: 'late-tension' }], soloVoice);
    }
    const t2 = `Both sides have had spells on top, Charon, though tiredness in midfield is starting to show. Substitutions are going to be vital over these next thirty minutes.`;
    return assembleTurnsResult(
      [
        { speaker: lead, text: t1, emotion: 'late-tension', pauseAfterMs: 140 },
        { speaker: co, text: t2, emotion: 'tactical' },
      ],
      soloVoice
    );
  }

  if (type === 'et-interval') {
    const t1 = `That's the halfway mark in extra time — ${homeTeam} ${homeScore}, ${awayTeam} ${awayScore}.`;
    if (!allowDuo) {
      return assembleTurnsResult([{ speaker: lead, text: t1, emotion: 'late-tension' }], soloVoice);
    }
    const t2 =
      homeScore === awayScore
        ? `Fifteen minutes left to find a winner before penalties. Neither defence wants to take an unnecessary risk here.`
        : `${leadSide} have the narrow edge, so ${trailSide} need to push players forward now.`;
    return assembleTurnsResult(
      [
        { speaker: lead, text: t1, emotion: 'late-tension', pauseAfterMs: 135 },
        { speaker: co, text: t2, emotion: 'tactical' },
      ],
      soloVoice
    );
  }

  if (type === 'penalties-intro') {
    const t1 = `Still level at ${homeScore}-${awayScore}${
      payload.wentToExtraTime ? ' after extra time' : ''
    }. A penalty shootout will decide ${homeTeam} versus ${awayTeam}.`;
    if (!allowDuo) {
      return assembleTurnsResult([{ speaker: lead, text: t1, emotion: 'late-tension' }], soloVoice);
    }
    const t2 = `It's pure composure now. Whichever goalkeeper picks the right moment to hold his ground could swing it.`;
    return assembleTurnsResult(
      [
        { speaker: lead, text: t1, emotion: 'late-tension', pauseAfterMs: 145 },
        { speaker: co, text: t2, emotion: 'tactical' },
      ],
      soloVoice
    );
  }

  if (type === 'half-time') {
    const leadScore = Math.max(homeScore, awayScore);
    const trailScore = Math.min(homeScore, awayScore);
    const scoreSummary =
      homeScore === awayScore
        ? `${homeTeam} and ${awayTeam} go in level at ${homeScore} apiece`
        : trailScore === 0
        ? `${leadSide} lead ${trailSide} by ${leadScore} goal${leadScore === 1 ? '' : 's'} to nil`
        : `${leadSide} lead ${trailSide} ${leadScore}-${trailScore}`;
    const goalMention =
      scorersList.length > 0
        ? `, with ${scorersList[scorersList.length - 1].playerName} finding the net in ${formatSpokenMinuteOrdinal(
            scorersList[scorersList.length - 1].minute,
            scorersList[scorersList.length - 1].addedMinute
          )}`
        : '';

    const htLead = `And that's half-time${venue ? ` at ${venue}` : ''}${comp ? ` in the ${comp}` : ''}. ${scoreSummary}${goalMention}.`;
    if (!allowDuo) {
      return assembleTurnsResult([{ speaker: lead, text: htLead, emotion: 'tactical' }], soloVoice);
    }

    const obs = st
      ? poss >= 57
        ? `${homeTeam} have seen more of the ball, though ${awayTeam} have stayed organized and looked dangerous when breaking forward.`
        : poss <= 43
        ? `${awayTeam} have controlled the tempo for long stretches, creating ${aShots} efforts to ${homeTeam}'s ${hShots}.`
        : `Neither side has managed to pull clear in midfield so far, and both benches have clear tactical adjustments to consider.`
      : `There isn't much between them tactically, and the first ten minutes after the break could decide how this opens up.`;

    const redObs = redCard
      ? ` Playing down a man after ${redCard.playerName || 'that dismissal'} forces a complete rethink in shape.`
      : '';

    const turns: Array<{ speaker: GeminiBroadcastVoice; text: string; emotion: BroadcastEmotion; pauseAfterMs?: number }> = [
      { speaker: lead, text: htLead, emotion: 'tactical', pauseAfterMs: 150 },
      { speaker: co, text: `${obs}${redObs}`, emotion: 'tactical', pauseAfterMs: 125 },
    ];
    if (variantSeed % 2 === 0) {
      turns.push({
        speaker: lead,
        text: `Agreed. Plenty still to play for in the second forty-five.`,
        emotion: 'normal',
      });
    }
    return assembleTurnsResult(turns, soloVoice);
  }

  // Full-time
  const penWinner =
    payload.penaltyShootout?.winner === 'home'
      ? homeTeam
      : payload.penaltyShootout?.winner === 'away'
      ? awayTeam
      : null;

  const ftLeadScore = Math.max(homeScore, awayScore);
  const ftTrailScore = Math.min(homeScore, awayScore);
  const ftLead = penWinner
    ? `Full-time${venue ? ` at ${venue}` : ''}, and ${penWinner} edge the penalty shootout ${Math.max(
        payload.penaltyShootout!.homeScore,
        payload.penaltyShootout!.awayScore
      )}-${Math.min(
        payload.penaltyShootout!.homeScore,
        payload.penaltyShootout!.awayScore
      )} after a ${homeScore}-${awayScore} draw.`
    : leadSide
    ? `And there goes the final whistle${venue ? ` at ${venue}` : ''}. ${leadSide} take the win against ${trailSide}, finishing ${ftLeadScore}-${ftTrailScore}${
        payload.wentToExtraTime ? ' after extra time' : ''
      }.`
    : `Full-time${venue ? ` at ${venue}` : ''}, and it finishes all square at ${homeScore}-${awayScore} between ${homeTeam} and ${awayTeam}.`;

  if (!allowDuo) {
    return assembleTurnsResult([{ speaker: lead, text: ftLead, emotion: 'verdict' }], soloVoice);
  }

  const standout = motm
    ? `${motm.name} stood out all match for his composure and decision-making.`
    : scorersList.length > 0
    ? `${scorersList[scorersList.length - 1].playerName}'s finish proved decisive in the end.`
    : `Defensively both teams stayed disciplined when the pressure rose.`;

  const ftAnalyst = leadSide
    ? `Over the course of the match, ${leadSide} handled the key moments better. ${standout}`
    : `Neither side quite did enough to force the breakthrough, and a draw feels like a fair reflection. ${standout}`;

  return assembleTurnsResult(
    [
      { speaker: lead, text: ftLead, emotion: 'verdict', pauseAfterMs: 165 },
      { speaker: co, text: ftAnalyst, emotion: 'verdict' },
    ],
    soloVoice
  );
}

const OPENING_ANGLE_VARIATIONS = [
  'Open cleanly on the exact football development that mattered most in this sequence.',
  'Lead with the spatial or tactical contrast between the two teams before mentioning the scoreboard.',
  'Focus directly on how the players and goalkeeper handled the decisive pressure moment.',
  'Highlight the shift in momentum or midfield control rather than repeating scoreboard numbers.',
];

function computeStableHash(input: string): string {
  return crypto.createHash('sha1').update(input).digest('hex');
}

async function generateDynamicBroadcastScript(
  ai: GoogleGenAI,
  payload: MatchAnnouncePayload,
  type: MatchBroadcastType,
  voiceName: GeminiBroadcastVoice,
  story: MatchStorylineReport,
  duoPair?: [GeminiBroadcastVoice, GeminiBroadcastVoice]
): Promise<{
  displayScript: string;
  ttsScript: string;
  primaryStoryline: string;
  deliveryTone: string;
  turns: BroadcastTurnPlan[];
  segments: BroadcastAudioSegment[];
}> {
  const hashNum = parseInt(
    computeStableHash(
      `${payload.dossier?.matchId || payload.homeTeam}::${payload.dossier?.stateVersion || ''}::${type}::${
        payload.liveEvent?.id || ''
      }::${payload.penaltyKick?.kickNumber ?? 0}`
    ).slice(0, 6),
    16
  );
  const openingAngle =
    OPENING_ANGLE_VARIATIONS[hashNum % OPENING_ANGLE_VARIATIONS.length];

  const isDuo = Boolean(duoPair);
  const [sp1, sp2] = duoPair || [voiceName, voiceName];
  const defaultEmotion = inferDefaultEmotionForStage(
    type,
    payload.liveEvent?.type,
    Math.abs((payload.homeScore || 0) - (payload.awayScore || 0))
  );

  const dossierFacts = {
    broadcastStage: type,
    commentators: isDuo
      ? {
          playByPlay: `${sp1} (deep, confident lead broadcaster)`,
          analyst: `${sp2} (lighter, conversational co-commentator & tactician)`,
        }
      : { solo: voiceName },
    fixture: `${payload.homeTeam} (Home) vs ${payload.awayTeam} (Away)`,
    currentScore: `${payload.homeTeam} ${payload.homeScore} - ${payload.awayScore} ${payload.awayTeam}`,
    competition: payload.competitionName || null,
    stage: payload.stageLabel || null,
    venue: payload.venueName || null,
    stoppageMinutes: payload.stoppageMinutes ?? null,
    wentToExtraTime: Boolean(payload.wentToExtraTime),
    liveEvent: payload.liveEvent || null,
    halfTimeScore: payload.dossier?.halfTimeScore || null,
    aggregateScore: payload.dossier?.aggregateScore || null,
    tactics: payload.dossier?.tactics || null,
    statsAvailable: Boolean(payload.dossier?.statsAvailable),
    teamStatistics: payload.dossier?.statsAvailable
      ? payload.dossier?.stats
      : 'Not tracked for this mode (DO NOT invent possession, shots, or xG figures)',
    goalProgression: story.trajectoryText,
    goalsSummary: payload.firstHalfGoals || [],
    timelineHighlights: (payload.dossier?.timelineHighlights || []).slice(-14),
    substitutions: payload.dossier?.substitutions || [],
    keyPerformers: payload.dossier?.keyPerformers || [],
    momentumSummary: payload.dossier?.momentumSummary || null,
    penaltyShootout: payload.penaltyShootout || null,
    currentPenaltyKick: payload.penaltyKick || null,
    detectedStoryline: story.primary.headline,
  };

  let stageRules = '';
  if (type === 'live-event') {
    const ev = payload.liveEvent;
    if (ev?.type === 'tactical-change' || ev?.type === 'sub') {
      stageRules = `Write a calm, concise single-turn tactical update by ${isDuo ? sp2 : voiceName} (14-24 words) noting this ${ev.type} accurately.`;
    } else if (ev?.type === 'shot-saved') {
      stageRules = `Write a brisk single-turn save call by ${sp1} (12-20 words) praising the goalkeeper naturally.`;
    } else {
      stageRules = isDuo
        ? `Write a concise, realistic live football call on this ${ev?.type || 'incident'}. ${sp1} delivers the primary call (12-22 words). Include a short reply from ${sp2} (10-18 words) ONLY if it adds genuine tactical/emotional value — leave turn2Text empty on straightforward routine incidents.`
        : `Write a crisp, natural live football call (14-24 words) reacting directly to this ${ev?.type || 'incident'}.`;
    }
  } else if (type === 'half-time') {
    stageRules = isDuo
      ? `Write realistic, grounded HALF-TIME TV commentary between ${sp1} and ${sp2} (~45-68 words across 2 or optional brief 3rd closing remark). Sound like calm, knowledgeable human broadcasters — state the break cleanly, highlight ONE tactical pattern without reading a list of numbers, and note what might shift in the second half.`
      : 'Write grounded, conversational HALF-TIME football commentary (40-56 words). Natural tone, no hyped clichés.';
  } else if (type === 'full-time') {
    stageRules = isDuo
      ? `Write authentic FULL-TIME TV commentary between ${sp1} and ${sp2} (~48-70 words across 2 turns). Sum up the final whistle calmly or decisively to fit the result, credit standout performers honestly, and evaluate the balance of play.`
      : 'Write an assured, balanced FULL-TIME football verdict (42-60 words) fitting the outcome.';
  } else if (type === 'end-of-90') {
    stageRules = isDuo
      ? `Write a natural 2-turn end-of-90 exchange between ${sp1} and ${sp2} (~34-48 words) noting ninety minutes couldn't separate them and what extra time demands.`
      : 'Write a 26-36 word end-of-90 transition into extra time.';
  } else if (type === 'et-interval') {
    stageRules = isDuo
      ? `Write a tight 2-turn extra-time interval exchange between ${sp1} and ${sp2} (~30-44 words) focusing on fatigue and the last 15 minutes.`
      : 'Write a 24-34 word extra-time interval update.';
  } else if (type === 'penalties-intro') {
    stageRules = isDuo
      ? `Write a tense, composed 2-turn shootout intro between ${sp1} and ${sp2} (~30-44 words).`
      : 'Write a composed, tense 24-34 word penalty shootout introduction.';
  } else {
    stageRules =
      'Write a crisp, tense 14-22 word penalty-kick call: round context, taker, outcome, and shootout scoreline.';
  }

  const systemInstruction = [
    'You write dialogue for two realistic television football broadcasters: Charon (main play-by-play, confident and authoritative) and Orus (co-commentator, conversational, analytical, observant).',
    'AUTHENTICITY RULES (STRICT):',
    '1. Sound like real British/international TV football broadcasters watching a real match — conversational, intelligent, natural pacing, controlled enthusiasm.',
    '2. STRICTLY FORBIDDEN words & clichés: "electric", "unbelievable", "what a match", "Hang on a second", "are you seeing the pace", "pure chaos", "ice in the veins", "daylight robbery", "you couldn’t write this", "don’t blink", "catch your breath", "Thank you for staying with...".',
    '3. AVOID excessive exclamation marks! Use at most ONE exclamation mark in an entire broadcast, reserved strictly for an actual goal or decisive save/winner.',
    '4. Do NOT mechanically read out statistics that viewers already see on the scoreboard. Mention a stat ONLY to explain WHY a team leads or struggles.',
    '5. Vary sentence length and openings. Include short natural responses or slight tactical disagreements where appropriate. Never include speaker labels ("Charon:") inside the text fields.',
    '6. GROUNDING: Use ONLY facts in MATCH_DOSSIER JSON. Never invent a player, manager, assist, event, card, or statistic. If statsAvailable is false, do NOT mention possession, shots, or xG.',
    `7. Focus angle: ${openingAngle}`,
  ].join('\n');

  const validEmotions = 'normal | attack | goal | miss | save | red-card | tactical | late-tension | verdict';

  const schemaProperties = isDuo
    ? {
        primaryStoryline: {
          type: Type.STRING,
          description: 'Concise 4-8 word football summary.',
        },
        turn1Speaker: {
          type: Type.STRING,
          description: `Speaker for Turn 1 (${sp1} or ${sp2}).`,
        },
        turn1Text: {
          type: Type.STRING,
          description: 'Spoken text for Turn 1 without speaker name prefix, markdown, or XML tags.',
        },
        turn1Emotion: {
          type: Type.STRING,
          description: `One of: ${validEmotions}`,
        },
        turn2Speaker: {
          type: Type.STRING,
          description: `Optional speaker for Turn 2 (${sp2} or ${sp1}). Leave empty if a single turn is more natural.`,
        },
        turn2Text: {
          type: Type.STRING,
          description: 'Optional spoken response for Turn 2 without speaker prefix. Leave empty if only 1 speaker speaks.',
        },
        turn2Emotion: {
          type: Type.STRING,
          description: `One of: ${validEmotions}`,
        },
        turn3Text: {
          type: Type.STRING,
          description: `Optional brief 4-12 word follow-up from ${sp1} wrapping up the exchange when natural.`,
        },
      }
    : {
        primaryStoryline: {
          type: Type.STRING,
          description: 'Concise 4-8 word football summary.',
        },
        emotion: {
          type: Type.STRING,
          description: `One of: ${validEmotions}`,
        },
        script: {
          type: Type.STRING,
          description: 'Natural, spoken football broadcast commentary with zero markdown or speaker prefixes.',
        },
      };

  const runScriptCall = async (modelName: string, thinkingLevel: ThinkingLevel) => {
    return withTimeout(
      withRetry(async () => {
        return ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `${stageRules}\n\nMATCH_DOSSIER:\n${JSON.stringify(dossierFacts)}`,
                },
              ],
            },
          ],
          config: {
            systemInstruction,
            thinkingConfig: { thinkingLevel },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: schemaProperties,
              required: isDuo
                ? ['primaryStoryline', 'turn1Speaker', 'turn1Text', 'turn1Emotion']
                : ['primaryStoryline', 'emotion', 'script'],
            },
          },
        });
      }),
      type === 'live-event' || type === 'penalty-kick' ? 6500 : 8800,
      `Broadcast script (${modelName})`
    );
  };

  let response;
  try {
    response = await runScriptCall('gemini-4-hydrogen', ThinkingLevel.LOW);
  } catch (err) {
    if (!isQuotaOrUnavailableError(err)) throw err;
    response = await runScriptCall('gemini-3.1-flash-lite', ThinkingLevel.MINIMAL);
  }

  const rawText = (response.text || '').trim();
  const parsed = JSON.parse(rawText) as {
    primaryStoryline?: string;
    emotion?: string;
    script?: string;
    turn1Speaker?: string;
    turn1Text?: string;
    turn1Emotion?: string;
    turn2Speaker?: string;
    turn2Text?: string;
    turn2Emotion?: string;
    turn3Text?: string;
  };

  const sanitizeEmotion = (raw?: string): BroadcastEmotion => {
    const val = String(raw || '').trim() as BroadcastEmotion;
    return val in EMOTION_DIRECTION.normal ||
      val === 'normal' ||
      val === 'attack' ||
      val === 'goal' ||
      val === 'miss' ||
      val === 'save' ||
      val === 'red-card' ||
      val === 'tactical' ||
      val === 'late-tension' ||
      val === 'verdict'
      ? val
      : defaultEmotion;
  };

  const sanitizeSpeaker = (raw: string | undefined, fallback: GeminiBroadcastVoice): GeminiBroadcastVoice => {
    const clean = String(raw || '').trim();
    if (clean === 'Charon' || clean === 'Orus' || clean === 'Fenrir' || clean === 'Puck') {
      return clean;
    }
    return fallback;
  };

  const stripPrefix = (txt?: string) =>
    String(txt || '')
      .replace(/^(Charon|Orus|Fenrir|Puck)\s*:\s*/i, '')
      .trim();

  if (isDuo && parsed.turn1Text) {
    const t1Spk = sanitizeSpeaker(parsed.turn1Speaker, sp1);
    const t1Txt = stripPrefix(parsed.turn1Text);
    const t1Emo = sanitizeEmotion(parsed.turn1Emotion);
    const assembledInputs: Array<{
      speaker: GeminiBroadcastVoice;
      text: string;
      emotion: BroadcastEmotion;
      pauseAfterMs?: number;
    }> = [{ speaker: t1Spk, text: t1Txt, emotion: t1Emo, pauseAfterMs: t1Emo === 'goal' ? 95 : 140 }];

    const t2Txt = stripPrefix(parsed.turn2Text);
    if (t2Txt.length >= 6) {
      const t2Spk = sanitizeSpeaker(parsed.turn2Speaker, t1Spk === sp1 ? sp2 : sp1);
      const t2Emo = sanitizeEmotion(parsed.turn2Emotion);
      assembledInputs.push({
        speaker: t2Spk,
        text: t2Txt,
        emotion: t2Emo,
        pauseAfterMs: 120,
      });

      const t3Txt = stripPrefix(parsed.turn3Text);
      if (t3Txt.length >= 6) {
        assembledInputs.push({
          speaker: t1Spk,
          text: t3Txt,
          emotion: t1Emo === 'goal' ? 'normal' : t2Emo,
        });
      }
    }

    const built = assembleTurnsResult(assembledInputs);
    if (built.turns.length > 0 && built.displayScript.length >= 10) {
      return {
        ...built,
        primaryStoryline: String(parsed.primaryStoryline || story.primary.id).trim(),
        deliveryTone: story.moodLabel,
      };
    }
  }

  const soloText = stripPrefix(parsed.script || parsed.turn1Text);
  const builtSolo = assembleTurnsResult(
    [
      {
        speaker: voiceName,
        text: soloText,
        emotion: sanitizeEmotion(parsed.emotion || parsed.turn1Emotion),
      },
    ],
    voiceName
  );

  if (!builtSolo.displayScript || builtSolo.displayScript.length < 10) {
    throw new Error('Generated broadcast script was empty.');
  }

  return {
    ...builtSolo,
    primaryStoryline: String(parsed.primaryStoryline || story.primary.id).trim(),
    deliveryTone: story.moodLabel,
  };
}

export function buildHalftimeBroadcastScript(payload: HalftimeAnnouncePayload): string {
  const story = analyzeMatchStorylines(payload, 'half-time');
  return buildFallbackStorylineScript(payload, 'half-time', story, ['Charon', 'Orus']).displayScript;
}

export function buildMatchBroadcastScript(payload: MatchAnnouncePayload): {
  type: MatchBroadcastType;
  script: string;
  segments: BroadcastAudioSegment[];
  style: string;
} {
  const type: MatchBroadcastType = payload.announcementType || 'half-time';
  const useDuo = shouldUseDuoBanter(payload, type);
  const duoPair = useDuo ? getDuoSpeakersForStage(type) : undefined;
  const voice = duoPair
    ? duoPair[0]
    : normalizeBroadcastVoice(
        payload.voiceName,
        type,
        `${payload.homeTeam}:${payload.awayTeam}:${payload.penaltyKick?.kickNumber ?? 0}`
      );
  const story = analyzeMatchStorylines(payload, type);
  const fallback = buildFallbackStorylineScript(
    payload,
    type,
    story,
    duoPair,
    duoPair ? undefined : voice
  );
  return {
    type,
    script: fallback.displayScript,
    segments: fallback.segments,
    style: selectBroadcastTtsStyle(type, voice, story),
  };
}

// ============================================================================
// DSP PCM / WAV Audio Assembly (24kHz 16-bit Mono)
// Guarantees separate commentator voices, silence trimming, volume leveling,
// anti-click boundary fades, and seamless conversational transitions.
// ============================================================================

function parseWavPcm24k(base64Wav: string): { sampleRate: number; samples: Int16Array } | null {
  try {
    const buf = Buffer.from(base64Wav, 'base64');
    if (buf.length < 44 || buf.toString('ascii', 0, 4) !== 'RIFF') {
      return null;
    }
    let offset = 12;
    let sampleRate = 24000;
    let dataOffset = -1;
    let dataSize = 0;

    while (offset + 8 <= buf.length) {
      const chunkId = buf.toString('ascii', offset, offset + 4);
      const chunkSize = buf.readUInt32LE(offset + 4);
      if (chunkId === 'fmt ' && offset + 24 <= buf.length) {
        sampleRate = buf.readUInt32LE(offset + 12) || 24000;
      } else if (chunkId === 'data') {
        dataOffset = offset + 8;
        dataSize = Math.min(chunkSize, buf.length - dataOffset);
        break;
      }
      offset += 8 + chunkSize + (chunkSize % 2);
    }

    if (dataOffset < 0 || dataSize < 4) {
      return null;
    }

    const numSamples = Math.floor(dataSize / 2);
    const samples = new Int16Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
      samples[i] = buf.readInt16LE(dataOffset + i * 2);
    }
    return { sampleRate, samples };
  } catch {
    return null;
  }
}

function trimSilenceAndFade(samples: Int16Array, sampleRate = 24000): Int16Array {
  if (samples.length === 0) return samples;
  const startThreshold = 165;
  const endThreshold = 145;
  const leadPad = Math.round(sampleRate * 0.014); // 14ms soft breath lead-in
  const tailPad = Math.round(sampleRate * 0.022); // 22ms natural tail

  let first = 0;
  while (first < samples.length && Math.abs(samples[first]) < startThreshold) {
    first++;
  }
  if (first >= samples.length) {
    return samples.slice(0, Math.min(samples.length, Math.round(sampleRate * 0.05)));
  }

  let last = samples.length - 1;
  while (last > first && Math.abs(samples[last]) < endThreshold) {
    last--;
  }

  const startIdx = Math.max(0, first - leadPad);
  const endIdx = Math.min(samples.length, last + 1 + tailPad);
  const sliced = new Int16Array(samples.slice(startIdx, endIdx));

  // Smooth 6ms raised-cosine fade-in & fade-out to prevent pops or abrupt cuts
  const fadeSamples = Math.min(Math.floor(sliced.length / 4), Math.round(sampleRate * 0.006));
  for (let i = 0; i < fadeSamples; i++) {
    const t = i / Math.max(1, fadeSamples);
    const gain = 0.5 - 0.5 * Math.cos(Math.PI * t);
    sliced[i] = Math.round(sliced[i] * gain);
    const tailIdx = sliced.length - 1 - i;
    sliced[tailIdx] = Math.round(sliced[tailIdx] * gain);
  }
  return sliced;
}

function normalizeRmsLoudness(samples: Int16Array, targetRms = 4300): Int16Array {
  if (samples.length === 0) return samples;
  let sumSq = 0;
  let voicedCount = 0;
  for (let i = 0; i < samples.length; i++) {
    const abs = Math.abs(samples[i]);
    if (abs >= 140) {
      sumSq += samples[i] * samples[i];
      voicedCount++;
    }
  }
  if (voicedCount < 40) return samples;
  const rms = Math.sqrt(sumSq / voicedCount);
  if (rms < 1) return samples;

  const gain = Math.max(0.55, Math.min(2.05, targetRms / rms));
  const out = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    let val = samples[i] * gain;
    if (val > 29000) {
      val = 29000 + Math.tanh((val - 29000) / 3500) * 3200;
    } else if (val < -29000) {
      val = -29000 - Math.tanh((-val - 29000) / 3500) * 3200;
    }
    out[i] = Math.max(-32767, Math.min(32767, Math.round(val)));
  }
  return out;
}

function resampleSubtlePitchContrast(samples: Int16Array, rateFactor: number): Int16Array {
  if (Math.abs(rateFactor - 1) < 0.005 || samples.length < 16) {
    return samples;
  }
  const outLen = Math.max(16, Math.floor(samples.length / rateFactor));
  const out = new Int16Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const srcPos = i * rateFactor;
    const idx = Math.floor(srcPos);
    const frac = srcPos - idx;
    const s0 = samples[Math.min(samples.length - 1, idx)];
    const s1 = samples[Math.min(samples.length - 1, idx + 1)];
    out[i] = Math.round(s0 + (s1 - s0) * frac);
  }
  return out;
}

function stitchPcmClipsToWavBase64(
  clips: Array<{ samples: Int16Array; pauseAfterMs: number }>,
  sampleRate = 24000
): string {
  let totalSamples = 0;
  const gapBuffers: Int16Array[] = [];
  for (let i = 0; i < clips.length; i++) {
    totalSamples += clips[i].samples.length;
    if (i < clips.length - 1 && clips[i].pauseAfterMs > 0) {
      const gapCount = Math.round((clips[i].pauseAfterMs * sampleRate) / 1000);
      const gap = new Int16Array(gapCount);
      gapBuffers.push(gap);
      totalSamples += gapCount;
    } else {
      gapBuffers.push(new Int16Array(0));
    }
  }

  const dataByteLen = totalSamples * 2;
  const wavBuf = Buffer.alloc(44 + dataByteLen);
  wavBuf.write('RIFF', 0, 'ascii');
  wavBuf.writeUInt32LE(36 + dataByteLen, 4);
  wavBuf.write('WAVE', 8, 'ascii');
  wavBuf.write('fmt ', 12, 'ascii');
  wavBuf.writeUInt32LE(16, 16); // PCM chunk size
  wavBuf.writeUInt16LE(1, 20); // PCM format
  wavBuf.writeUInt16LE(1, 22); // Mono
  wavBuf.writeUInt32LE(sampleRate, 24);
  wavBuf.writeUInt32LE(sampleRate * 2, 28); // Byte rate
  wavBuf.writeUInt16LE(2, 32); // Block align
  wavBuf.writeUInt16LE(16, 34); // Bits per sample
  wavBuf.write('data', 36, 'ascii');
  wavBuf.writeUInt32LE(dataByteLen, 40);

  let writeOffset = 44;
  for (let i = 0; i < clips.length; i++) {
    const clipSamples = clips[i].samples;
    for (let j = 0; j < clipSamples.length; j++) {
      wavBuf.writeInt16LE(clipSamples[j], writeOffset);
      writeOffset += 2;
    }
    const gap = gapBuffers[i];
    if (gap.length > 0) {
      writeOffset += gap.length * 2; // Already zero-initialized by Buffer.alloc
    }
  }
  return wavBuf.toString('base64');
}

async function synthesizeTurnAudioWithVoice(
  ai: GoogleGenAI,
  turn: BroadcastTurnPlan,
  preferLiteFirst: boolean
): Promise<{ audioBase64: string; model: string } | null> {
  const now = Date.now();
  if (now < liteTtsCooldownUntil && now < flashTtsCooldownUntil) {
    return null;
  }

  const attemptModel = async (ttsModel: string) => {
    const response = await enqueueTtsRequest(() =>
      withTimeout(
        ai.models.generateContent({
          model: ttsModel,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: turn.ttsText,
                  speechMetadata: { style: turn.style },
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: turn.speaker },
              },
            },
          },
        }),
        ttsModel === 'gemini-3.8-flash-tts' ? 10_500 : 8_800,
        `TTS synthesis (${ttsModel}:${turn.speaker})`
      )
    );
    const parts = response.candidates?.[0]?.content?.parts ?? [];
    const audioPart = parts.find((p) => Boolean(p.inlineData?.data));
    const audioBase64 = audioPart?.inlineData?.data;
    if (!audioBase64) {
      throw new GeminiServiceError('Gemini TTS returned no audio data.', 502);
    }
    return { audioBase64, model: ttsModel };
  };

  const order: Array<{ model: string; isLite: boolean }> = preferLiteFirst
    ? [
        { model: 'gemini-3.8-flash-lite-tts', isLite: true },
        { model: 'gemini-3.8-flash-tts', isLite: false },
      ]
    : [
        { model: 'gemini-3.8-flash-tts', isLite: false },
        { model: 'gemini-3.8-flash-lite-tts', isLite: true },
      ];

  for (const item of order) {
    const cooldownUntil = item.isLite ? liteTtsCooldownUntil : flashTtsCooldownUntil;
    if (Date.now() < cooldownUntil) continue;
    try {
      return await attemptModel(item.model);
    } catch (err) {
      if (isQuotaOrUnavailableError(err)) {
        if (item.isLite) {
          liteTtsCooldownUntil = Date.now() + QUOTA_COOLDOWN_MS;
        } else {
          flashTtsCooldownUntil = Date.now() + QUOTA_COOLDOWN_MS;
        }
      }
    }
  }
  return null;
}

async function synthesizeTtsSafely(
  ai: GoogleGenAI,
  turns: BroadcastTurnPlan[],
  type: MatchBroadcastType
): Promise<{ audioBase64: string; model: string } | null> {
  if (turns.length === 0) return null;
  const preferLiteFirst = type === 'live-event' || type === 'penalty-kick';
  const uniqueSpeakers = new Set(turns.map((t) => t.speaker));
  const isDuoContext = uniqueSpeakers.size > 1;

  // Separate per-commentator voice generation guarantees each speaker uses their exact own
  // prebuiltVoiceConfig & vocal style — never one voice reading two different commentator names.
  const perTurnResults = await Promise.all(
    turns.map(async (turn, idx) => {
      if (idx > 0) {
        await new Promise((r) => setTimeout(r, idx * 95));
      }
      return synthesizeTurnAudioWithVoice(ai, turn, preferLiteFirst);
    })
  );

  if (perTurnResults.some((r) => !r || !r.audioBase64)) {
    return null;
  }

  const validResults = perTurnResults as Array<{ audioBase64: string; model: string }>;
  const modelsUsed = new Set(validResults.map((r) => r.model));
  const modelLabel =
    modelsUsed.size === 1 ? validResults[0].model : 'gemini-3.8-tts-studio';

  // If 1 turn and no stitching needed, still normalize & trim leading/trailing dead air
  const processedClips: Array<{ samples: Int16Array; pauseAfterMs: number }> = [];
  let sampleRate = 24000;

  for (let i = 0; i < validResults.length; i++) {
    const parsed = parseWavPcm24k(validResults[i].audioBase64);
    if (!parsed) {
      // If single turn wasn't standard WAV (unexpected), pass raw audio if single turn
      if (validResults.length === 1) {
        return validResults[0];
      }
      return null;
    }
    sampleRate = parsed.sampleRate;
    let proc = trimSilenceAndFade(parsed.samples, sampleRate);
    if (isDuoContext) {
      // Subtle natural human timbre separation so Charon remains deeper & Orus remains brighter/brisker
      const spk = turns[i].speaker;
      const contrastRatio =
        spk === 'Charon' ? 0.982 : spk === 'Orus' ? 1.038 : spk === 'Fenrir' ? 0.985 : 1.035;
      proc = resampleSubtlePitchContrast(proc, contrastRatio);
    }
    proc = normalizeRmsLoudness(proc, 4300);
    processedClips.push({
      samples: proc,
      pauseAfterMs: turns[i].pauseAfterMs,
    });
  }

  const stitchedBase64 = stitchPcmClipsToWavBase64(processedClips, sampleRate);
  return {
    audioBase64: stitchedBase64,
    model: modelLabel,
  };
}

export async function generateMatchBroadcastAudio(
  payload: MatchAnnouncePayload
): Promise<HalftimeAnnounceResult> {
  const homeTeam = String(payload.homeTeam || '').trim();
  const awayTeam = String(payload.awayTeam || '').trim();
  if (!homeTeam || !awayTeam) {
    throw new GeminiServiceError('Both homeTeam and awayTeam names are required.', 400);
  }

  const type: MatchBroadcastType = payload.announcementType || 'half-time';
  const useDuo = shouldUseDuoBanter(payload, type);
  const duoPair = useDuo ? getDuoSpeakersForStage(type) : undefined;
  const voiceName = duoPair
    ? duoPair[0]
    : normalizeBroadcastVoice(
        payload.voiceName,
        type,
        `${payload.dossier?.matchId || `${homeTeam}:${awayTeam}`}:${payload.penaltyKick?.kickNumber ?? ''}`
      );

  // Strict per-match + per-stage + per-state cache key so one match never bleeds into another
  const matchCacheKey = computeStableHash(
    JSON.stringify({
      matchId: payload.dossier?.matchId || `${homeTeam}::${awayTeam}::${payload.competitionName || ''}`,
      stateVersion: payload.dossier?.stateVersion || '',
      type,
      voiceMode: useDuo ? `duo:${duoPair?.join('+')}` : `solo:${voiceName}`,
      homeTeam,
      awayTeam,
      homeScore: payload.homeScore,
      awayScore: payload.awayScore,
      wentToExtraTime: Boolean(payload.wentToExtraTime),
      firstHalfGoals: payload.firstHalfGoals || [],
      liveEvent: payload.liveEvent || null,
      penaltyShootout: payload.penaltyShootout || null,
      penaltyKick: payload.penaltyKick || null,
      dossierStats: payload.dossier?.stats || null,
      tactics: payload.dossier?.tactics || null,
      highlightsCount: payload.dossier?.timelineHighlights?.length || 0,
    })
  );

  const now = Date.now();
  const hit = halftimeCache.get(matchCacheKey);
  if (hit && hit.expiresAt > now) {
    return { ...hit.result, cached: true };
  }

  const existingPromise = inFlightBroadcasts.get(matchCacheKey);
  if (existingPromise) {
    const shared = await existingPromise;
    return { ...shared, cached: true };
  }

  const generationPromise = (async (): Promise<Omit<HalftimeAnnounceResult, 'cached'>> => {
    const story = analyzeMatchStorylines(payload, type);

    let displayScript = '';
    let turns: BroadcastTurnPlan[] = [];
    let segments: BroadcastAudioSegment[] = [];
    let primaryStoryline = story.primary.id;
    const keyReady = hasValidGeminiApiKey();
    const ai = keyReady ? getGeminiClient() : null;

    if (ai && Date.now() >= textQuotaCooldownUntil) {
      try {
        const dynamic = await generateDynamicBroadcastScript(
          ai,
          payload,
          type,
          voiceName,
          story,
          duoPair
        );
        displayScript = dynamic.displayScript;
        turns = dynamic.turns;
        segments = dynamic.segments;
        primaryStoryline = dynamic.primaryStoryline;
      } catch (err) {
        if (isQuotaOrUnavailableError(err)) {
          textQuotaCooldownUntil = Date.now() + QUOTA_COOLDOWN_MS;
        }
        const fb = buildFallbackStorylineScript(
          payload,
          type,
          story,
          duoPair,
          duoPair ? undefined : voiceName
        );
        displayScript = fb.displayScript;
        turns = fb.turns;
        segments = fb.segments;
      }
    } else {
      const fb = buildFallbackStorylineScript(
        payload,
        type,
        story,
        duoPair,
        duoPair ? undefined : voiceName
      );
      displayScript = fb.displayScript;
      turns = fb.turns;
      segments = fb.segments;
    }

    const ttsResult = ai ? await synthesizeTtsSafely(ai, turns, type) : null;

    const entry: Omit<HalftimeAnnounceResult, 'cached'> = ttsResult
      ? {
          audioBase64: ttsResult.audioBase64,
          mimeType: 'audio/wav',
          speechFallback: false,
          script: displayScript,
          segments,
          voiceName,
          model: ttsResult.model,
          announcementType: type,
          storyline: primaryStoryline,
        }
      : {
          audioBase64: '',
          mimeType: 'audio/wav',
          speechFallback: true,
          script: displayScript,
          segments,
          voiceName,
          model: 'broadcast-voice-engine',
          announcementType: type,
          storyline: primaryStoryline,
        };

    if (halftimeCache.size >= CACHE_MAX_ENTRIES) {
      const oldestKey = halftimeCache.keys().next().value;
      if (oldestKey) halftimeCache.delete(oldestKey);
    }
    halftimeCache.set(matchCacheKey, {
      expiresAt: Date.now() + (entry.speechFallback ? FALLBACK_CACHE_TTL_MS : CACHE_TTL_MS),
      result: entry,
    });

    return entry;
  })();

  inFlightBroadcasts.set(matchCacheKey, generationPromise);
  try {
    const result = await generationPromise;
    return { ...result, cached: false };
  } finally {
    inFlightBroadcasts.delete(matchCacheKey);
  }
}

export async function generateHalftimeBroadcastAudio(
  payload: HalftimeAnnouncePayload
): Promise<HalftimeAnnounceResult> {
  return generateMatchBroadcastAudio({ ...payload, announcementType: 'half-time' });
}

export interface LiveMatchContextPayload {
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

function formatPlayerTelemetryLine(p: MatchPlayerBroadcastStats): string {
  const passPct =
    p.passesAttempted > 0 ? Math.round((p.passesCompleted / p.passesAttempted) * 100) : 0;
  const subTag = p.started
    ? p.subbedOutMinute !== null
      ? `Starter, off ${p.subbedOutMinute}'`
      : 'Starter, full'
    : `Sub on ${p.subbedInMinute ?? '?'}'`;
  const badges = [
    p.isMotm ? 'MOTM' : '',
    p.goals > 0 ? `${p.goals}G` : '',
    p.assists > 0 ? `${p.assists}A` : '',
    p.yellowCards > 0 ? `${p.yellowCards}YC` : '',
    p.redCards > 0 ? 'RC' : '',
  ]
    .filter(Boolean)
    .join(',');

  return [
    `#${p.shirtNumber} ${p.name} (${p.roleSlot || p.position}, ${p.minutesPlayed}' [${subTag}])`,
    `Rating ${p.rating.toFixed(1)}${badges ? ` [${badges}]` : ''}`,
    `Shots ${p.shots} (${p.shotsOnTarget} on target, ${p.xg.toFixed(2)} xG${(p.bigChancesMissed || 0) > 0 ? `, ${p.bigChancesMissed} big chance missed` : ''})`,
    `Passes ${p.passesCompleted}/${p.passesAttempted} (${passPct}%), KeyPass ${p.keyPasses}, ThroughPass ${p.throughPassesCompleted ?? 0}/${p.throughPasses ?? 0}`,
    `Def: Blk ${p.blocks ?? 0}, Tkl ${p.tackles}, Int ${p.interceptions}, Clr ${p.clearances ?? 0}, Fls ${p.foulsCommitted ?? 0}`,
    `LostBall ${p.possessionLost ?? 0}`,
    p.saves > 0 ? `Saves ${p.saves}` : '',
    typeof p.staminaRemaining === 'number' ? `Stamina ${p.staminaRemaining}%` : '',
  ]
    .filter(Boolean)
    .join(' | ');
}

function buildLivePunditSystemInstruction(
  ctx?: LiveMatchContextPayload,
  voiceName: GeminiBroadcastVoice = 'Charon'
): string {
  const personaGuide: Record<GeminiBroadcastVoice, string> = {
    Charon:
      'You are Charon — a sharp, deeply observant, authoritative male British football pundit and lead broadcaster.',
    Orus:
      'You are Orus — an expressive, tactically razor-sharp male football analyst who breaks down player numbers, turnovers, through balls, and tactical battles conversationally.',
    Fenrir:
      'You are Fenrir — an assured, energetic lead football commentator who connects what happened on the pitch with exact match data.',
    Puck:
      'You are Puck — a perceptive football co-commentator spotting key performers, mistakes, blocks, and pressing patterns.',
  };

  if (!ctx?.homeTeam || !ctx?.awayTeam) {
    return (
      `${personaGuide[voiceName]} ` +
      'Speak like a real human football analyst — insightful, specific, conversational, 2 to 4 clear sentences.'
    );
  }

  const lines = [
    personaGuide[voiceName],
    'You are on air in the DodaEona F.C. AI Pundit Studio with the COMPLETE official match report, full team & player data sheet, shot-by-shot log, and incident timeline.',
    'BROADCASTER & ANALYST RULES:',
    '- Answer ANY question about the match, tactics, scoreline, momentum, referee, or ANY individual player (match ratings, goals, assists, shots, blocks, passes, through passes, tackles, interceptions, clearances, saves, cards, fouls, and times they lost the ball / possessionLost) using the exact facts below.',
    '- When asked about specific players or detailed stats, cite their EXACT figures directly and insightfully — never guess or invent numbers not in the dossier.',
    '- Speak naturally like a top football analyst (no scripted hype, no clichés like "electric" or "unbelievable", natural contractions). Give 2 to 4 crisp spoken sentences by default, or 4 to 6 well-paced sentences when breaking down multiple players or detailed stat requests.',
    '',
    '=== MATCH HEADER ===',
    `Fixture: ${ctx.homeTeam} vs ${ctx.awayTeam}`,
    `Score: ${ctx.homeTeam} ${ctx.homeScore} - ${ctx.awayScore} ${ctx.awayTeam}${
      ctx.wentToExtraTime ? ' (After Extra Time)' : ''
    }`,
  ];

  if (ctx.phase) lines.push(`Match Stage / Minute: ${ctx.phase} (${ctx.minute ?? 45}')`);
  if (ctx.competitionName) {
    lines.push(`Competition: ${ctx.competitionName}${ctx.stageLabel ? ` (${ctx.stageLabel})` : ''}`);
  }
  if (ctx.venueName) lines.push(`Stadium: ${ctx.venueName}`);
  if (ctx.scorersSummary) lines.push(`Goalscorers: ${ctx.scorersSummary}`);

  const d = ctx.dossier;
  if (d) {
    const story = analyzeMatchStorylines(
      {
        homeTeam: ctx.homeTeam,
        awayTeam: ctx.awayTeam,
        homeScore: ctx.homeScore,
        awayScore: ctx.awayScore,
        wentToExtraTime: ctx.wentToExtraTime,
        penaltyShootout: ctx.penaltyShootout,
        dossier: d,
      },
      ctx.phase === 'full-time' ? 'full-time' : 'half-time'
    );
    lines.push(`Primary Match Narrative: ${story.primary.headline}`);

    if (d.halfTimeScore) {
      lines.push(`Half-Time Score: ${ctx.homeTeam} ${d.halfTimeScore.home} - ${d.halfTimeScore.away} ${ctx.awayTeam}`);
    }
    if (d.aggregateScore) {
      lines.push(`Aggregate Score: ${ctx.homeTeam} ${d.aggregateScore.home} - ${d.aggregateScore.away} ${ctx.awayTeam}`);
    }
    if (d.preMatchContext) {
      lines.push(
        `Pre-Match Context: Ratings ${ctx.homeTeam} ${d.preMatchContext.homeRating ?? '?'} vs ${d.preMatchContext.awayRating ?? '?'} ${ctx.awayTeam}` +
          (typeof d.preMatchContext.homeWinPct === 'number'
            ? ` | Odds: Home ${d.preMatchContext.homeWinPct}%, Draw ${d.preMatchContext.drawPct}%, Away ${d.preMatchContext.awayWinPct}%`
            : '')
      );
    }
    if (d.matchConditions) {
      const mc = d.matchConditions;
      lines.push(
        `Conditions & Official: Weather ${mc.weather || 'Clear'} (${mc.temperatureC ?? 18}°C), Pitch ${mc.pitch || 'Good'}, Crowd ${mc.crowdAttendance ?? 'N/A'} (${mc.crowdIntensity ?? 70}% intensity), Referee ${mc.refereeName || 'Official'} (${mc.refereeArchetype || 'Balanced'}, strictness ${mc.refereeStrictness ?? 'N/A'}), Chemistry Home ${mc.homeChemistryScore ?? 'N/A'} / Away ${mc.awayChemistryScore ?? 'N/A'}`
      );
    }

    if (d.tactics) {
      lines.push(
        '',
        '=== TACTICS & MANAGERS ===',
        `${ctx.homeTeam}: Formation ${d.tactics.homeFormation || ctx.homeFormation || '?'} | Manager: ${d.tactics.homeManager || 'N/A'} | Style: ${d.tactics.homePlayingStyle || 'N/A'} | Pressing ${d.tactics.homePressing ?? '?'}, Def Line ${d.tactics.homeDefensiveLine ?? '?'} | ${d.tactics.homeTacticalSummary || ''}`,
        `${ctx.awayTeam}: Formation ${d.tactics.awayFormation || ctx.awayFormation || '?'} | Manager: ${d.tactics.awayManager || 'N/A'} | Style: ${d.tactics.awayPlayingStyle || 'N/A'} | Pressing ${d.tactics.awayPressing ?? '?'}, Def Line ${d.tactics.awayDefensiveLine ?? '?'} | ${d.tactics.awayTacticalSummary || ''}`
      );
      if (d.tactics.tacticalChanges?.length) {
        lines.push(
          `In-Match Tactical Shifts: ${d.tactics.tacticalChanges
            .map((t) => `${t.minute}' (${t.teamSide === 'home' ? ctx.homeTeam : ctx.awayTeam}): ${t.description}`)
            .join('; ')}`
        );
      }
    }

    if (d.stats) {
      const h = d.stats.home;
      const a = d.stats.away;
      lines.push(
        '',
        '=== COMPLETE TEAM MATCH STATS ===',
        `Possession: ${ctx.homeTeam} ${h.possession ?? ctx.possessionHome ?? 50}% vs ${a.possession ?? (100 - (ctx.possessionHome ?? 50))}% ${ctx.awayTeam}`,
        `Shots (On Target): ${h.shots ?? 0} (${h.shotsOnTarget ?? 0}) vs ${a.shots ?? 0} (${a.shotsOnTarget ?? 0})`,
        `xG / xGOT: ${(h.xg ?? 0).toFixed(2)} (${(h.openPlayXg ?? 0).toFixed(2)} open-play, ${(h.setPieceXg ?? 0).toFixed(2)} set-piece, xGOT ${(h.xgot ?? 0).toFixed(2)}) vs ${(a.xg ?? 0).toFixed(2)} (${(a.openPlayXg ?? 0).toFixed(2)} open-play, ${(a.setPieceXg ?? 0).toFixed(2)} set-piece, xGOT ${(a.xgot ?? 0).toFixed(2)})`,
        `Big Chances (Missed): ${h.bigChances ?? 0} (${h.bigChancesMissed ?? 0}) vs ${a.bigChances ?? 0} (${a.bigChancesMissed ?? 0}) | Touches in Box: ${h.touchesInBox ?? 0} vs ${a.touchesInBox ?? 0}`,
        `Passes: ${h.passesCompleted ?? 0}/${h.passesAttempted ?? 0} (${h.passAccuracy ?? 0}%) vs ${a.passesCompleted ?? 0}/${a.passesAttempted ?? 0} (${a.passAccuracy ?? 0}%)`,
        `Through Passes (Completed/Attempted): ${h.throughPassesCompleted ?? 0}/${h.throughPasses ?? 0} vs ${a.throughPassesCompleted ?? 0}/${a.throughPasses ?? 0}`,
        `Defending — Blocks: ${h.blocks ?? 0} vs ${a.blocks ?? 0} | Tackles Won/Total: ${h.tacklesWon ?? 0}/${h.tacklesTotal ?? 0} vs ${a.tacklesWon ?? 0}/${a.tacklesTotal ?? 0} | Interceptions: ${h.interceptions ?? 0} vs ${a.interceptions ?? 0} | Clearances: ${h.clearances ?? 0} vs ${a.clearances ?? 0}`,
        `Times Lost the Ball (Possession Lost): ${h.possessionLost ?? 0} vs ${a.possessionLost ?? 0}`,
        `Duels Won/Total: ${h.duelsWon ?? 0}/${h.duelsTotal ?? 0} vs ${a.duelsWon ?? 0}/${a.duelsTotal ?? 0} | Saves: ${h.saves ?? 0} vs ${a.saves ?? 0}`,
        `Set Pieces & Discipline — Corners: ${h.corners ?? 0} vs ${a.corners ?? 0} | Offsides: ${h.offsides ?? 0} vs ${a.offsides ?? 0} | Fouls: ${h.fouls ?? 0} vs ${a.fouls ?? 0} | YC: ${h.yellowCards ?? 0} vs ${a.yellowCards ?? 0} | RC: ${h.redCards ?? 0} vs ${a.redCards ?? 0}`,
        h.attackingZones && a.attackingZones
          ? `Attacking Zones: ${ctx.homeTeam} L${h.attackingZones.left}%/C${h.attackingZones.central}%/R${h.attackingZones.right}% vs ${ctx.awayTeam} L${a.attackingZones.left}%/C${a.attackingZones.central}%/R${a.attackingZones.right}%`
          : '',
        h.buildMethods && a.buildMethods
          ? `Build Methods: ${ctx.homeTeam} Patient ${h.buildMethods.patient}%, Through-Ball ${h.buildMethods.throughBall}%, Cross/SP ${h.buildMethods.crossSetPiece}%, Counter ${h.buildMethods.counter}% vs ${ctx.awayTeam} Patient ${a.buildMethods.patient}%, Through-Ball ${a.buildMethods.throughBall}%, Cross/SP ${a.buildMethods.crossSetPiece}%, Counter ${a.buildMethods.counter}%`
          : ''
      );
    }

    if (d.playerStats?.length) {
      const players = d.playerStats;
      const byRatingDesc = [...players].sort((a, b) => b.rating - a.rating);
      const byRatingAsc = [...players].sort((a, b) => a.rating - b.rating);
      const byShots = [...players].filter((p) => p.shots > 0).sort((a, b) => b.shots - a.shots || b.xg - a.xg);
      const byThrough = [...players]
        .filter((p) => (p.throughPasses ?? 0) > 0)
        .sort((a, b) => (b.throughPassesCompleted ?? 0) - (a.throughPassesCompleted ?? 0) || (b.throughPasses ?? 0) - (a.throughPasses ?? 0));
      const byBlocks = [...players]
        .filter((p) => (p.blocks ?? 0) > 0 || p.tackles > 0)
        .sort((a, b) => (b.blocks ?? 0) * 3 + b.tackles - ((a.blocks ?? 0) * 3 + a.tackles));
      const byLost = [...players]
        .filter((p) => (p.possessionLost ?? 0) > 0)
        .sort((a, b) => (b.possessionLost ?? 0) - (a.possessionLost ?? 0));

      lines.push(
        '',
        '=== QUICK STATISTICAL LEADERS ===',
        `Top Rated: ${byRatingDesc.slice(0, 4).map((p) => `${p.name} (${p.rating.toFixed(1)}${p.isMotm ? ' MOTM' : ''})`).join(', ')}`,
        `Lowest Rated / Quietest: ${byRatingAsc.slice(0, 3).map((p) => `${p.name} (${p.rating.toFixed(1)})`).join(', ')}`,
        byShots.length ? `Most Shots: ${byShots.slice(0, 4).map((p) => `${p.name} (${p.shots} shots, ${p.goals}G, ${p.xg.toFixed(2)} xG)`).join(', ')}` : '',
        byThrough.length ? `Through-Pass Leaders: ${byThrough.slice(0, 4).map((p) => `${p.name} (${p.throughPassesCompleted ?? 0}/${p.throughPasses ?? 0})`).join(', ')}` : '',
        byBlocks.length ? `Shot Blocks & Tackles Leaders: ${byBlocks.slice(0, 4).map((p) => `${p.name} (${p.blocks ?? 0} blk, ${p.tackles} tkl, ${p.interceptions} int)`).join(', ')}` : '',
        byLost.length ? `Most Times Lost the Ball: ${byLost.slice(0, 4).map((p) => `${p.name} (${p.possessionLost} lost)`).join(', ')}` : ''
      );

      const homePlayers = players
        .filter((p) => p.teamSide === 'home')
        .sort((a, b) => Number(b.started) - Number(a.started) || b.minutesPlayed - a.minutesPlayed);
      const awayPlayers = players
        .filter((p) => p.teamSide === 'away')
        .sort((a, b) => Number(b.started) - Number(a.started) || b.minutesPlayed - a.minutesPlayed);

      lines.push(
        '',
        `=== ALL ${ctx.homeTeam.toUpperCase()} PLAYERS ===`,
        ...homePlayers.map(formatPlayerTelemetryLine),
        '',
        `=== ALL ${ctx.awayTeam.toUpperCase()} PLAYERS ===`,
        ...awayPlayers.map(formatPlayerTelemetryLine)
      );
    } else if (d.keyPerformers?.length) {
      lines.push(
        `Key Performers: ${d.keyPerformers
          .map(
            (p) =>
              `${p.name}${p.isMotm ? ' [MOTM]' : ''}${
                typeof p.rating === 'number' ? ` (${p.rating.toFixed(1)})` : ''
              }`
          )
          .join(', ')}`
      );
    }

    if (d.momentumSummary) lines.push('', `Momentum Timeline: ${d.momentumSummary}`);

    if (d.substitutions?.length) {
      lines.push(
        `Substitutions: ${d.substitutions
          .map((s) => `${s.minute}' (${s.teamSide === 'home' ? ctx.homeTeam : ctx.awayTeam}) IN: ${s.playerIn} / OUT: ${s.playerOut}`)
          .join('; ')}`
      );
    }

    if (d.timelineHighlights?.length) {
      lines.push(
        '',
        '=== CHRONOLOGICAL MATCH EVENTS ===',
        ...d.timelineHighlights.map((e) => {
          const teamLabel = e.teamSide === 'home' ? ctx.homeTeam : e.teamSide === 'away' ? ctx.awayTeam : '';
          return `${formatMinuteLabel(e.minute, e.addedMinute)} [${e.type.toUpperCase()}${teamLabel ? ` · ${teamLabel}` : ''}]: ${
            e.commentary || e.headline || e.playerName || ''
          }`;
        })
      );
    }

    if (d.shotsLog?.length) {
      lines.push(
        '',
        '=== COMPLETE SHOT-BY-SHOT LOG ===',
        ...d.shotsLog.map(
          (s) =>
            `${formatMinuteLabel(s.minute, s.addedMinute)} (${s.teamSide === 'home' ? ctx.homeTeam : ctx.awayTeam}) ${s.playerName} -> ${s.outcome.toUpperCase()} (${s.xg.toFixed(2)} xG, ${s.situation}/${s.buildMethod}, ${s.channel} channel${s.assistPlayerName ? `, assisted by ${s.assistPlayerName}` : ''}${s.isBigChance ? ', BIG CHANCE' : ''})`
        )
      );
    }

    if (ctx.penaltyShootout) {
      lines.push(
        '',
        `=== PENALTY SHOOTOUT (${ctx.homeTeam} ${ctx.penaltyShootout.homeScore} - ${ctx.penaltyShootout.awayScore} ${ctx.awayTeam}) ===`
      );
      if (d.penaltyShootoutKicks?.length) {
        d.penaltyShootoutKicks.forEach((k) => {
          const teamLabel = k.teamSide === 'home' ? ctx.homeTeam : ctx.awayTeam;
          lines.push(
            `Kick #${k.kickNumber} (R${k.round} ${teamLabel}): ${k.takerName} vs ${k.keeperName} -> ${k.outcome.toUpperCase()}${k.missDetail ? ` (${k.missDetail})` : ''} [GK dived ${k.keeperDive}]`
          );
        });
      }
    }
  }

  return lines.filter((l) => l !== undefined).join('\n');
}

function findMatchingPlayersInPrompt(
  promptLower: string,
  players: MatchPlayerBroadcastStats[]
): MatchPlayerBroadcastStats[] {
  const tokens = promptLower
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3);
  return players.filter((p) => {
    const full = p.name.toLowerCase();
    if (promptLower.includes(full)) return true;
    const parts = full.split(/\s+/).filter((part) => part.length >= 3);
    return parts.some((part) => tokens.includes(part));
  });
}

function buildFallbackLivePunditAnswer(
  ctx: LiveMatchContextPayload,
  prompt: string,
  isOpening: boolean
): string {
  const stageType: MatchBroadcastType =
    ctx.phase === 'full-time'
      ? 'full-time'
      : ctx.phase === 'penalties' || ctx.phase === 'penalties-intro'
      ? 'penalties-intro'
      : 'half-time';
  const story = analyzeMatchStorylines(
    {
      homeTeam: ctx.homeTeam,
      awayTeam: ctx.awayTeam,
      homeScore: ctx.homeScore,
      awayScore: ctx.awayScore,
      competitionName: ctx.competitionName,
      stageLabel: ctx.stageLabel,
      venueName: ctx.venueName,
      wentToExtraTime: ctx.wentToExtraTime,
      penaltyShootout: ctx.penaltyShootout,
      dossier: ctx.dossier,
    },
    stageType
  );

  if (isOpening) {
    return `${ctx.homeTeam} ${ctx.homeScore}, ${ctx.awayTeam} ${ctx.awayScore}${
      ctx.venueName ? ` at ${ctx.venueName}` : ''
    }. ${story.primary.headline}. What's stood out to you most tactically so far?`;
  }

  const lower = prompt.toLowerCase();
  const players = ctx.dossier?.playerStats || [];
  const mentionedPlayers = findMatchingPlayersInPrompt(lower, players);

  if (mentionedPlayers.length > 0) {
    const p = mentionedPlayers[0];
    const teamLabel = p.teamSide === 'home' ? ctx.homeTeam : ctx.awayTeam;
    const passPct =
      p.passesAttempted > 0 ? Math.round((p.passesCompleted / p.passesAttempted) * 100) : 0;
    return `${p.name} (${teamLabel}, ${p.minutesPlayed} mins) posted a ${p.rating.toFixed(1)} rating with ${p.goals} goal${p.goals === 1 ? '' : 's'}, ${p.assists} assist${p.assists === 1 ? '' : 's'}, ${p.shots} shot${p.shots === 1 ? '' : 's'} (${p.xg.toFixed(2)} xG), and ${p.passesCompleted} of ${p.passesAttempted} passes (${passPct}%) including ${p.throughPassesCompleted ?? 0} of ${p.throughPasses ?? 0} through balls. Defensively he made ${p.blocks ?? 0} block${(p.blocks ?? 0) === 1 ? '' : 's'}, ${p.tackles} tackle${p.tackles === 1 ? '' : 's'}, and ${p.interceptions} interception${p.interceptions === 1 ? '' : 's'}, while losing the ball ${p.possessionLost ?? 0} time${(p.possessionLost ?? 0) === 1 ? '' : 's'}.`;
  }

  if (lower.includes('lost') || lower.includes('turnover') || lower.includes('give') || lower.includes('possession lost')) {
    const mostLost = [...players].sort((a, b) => (b.possessionLost ?? 0) - (a.possessionLost ?? 0))[0];
    if (mostLost && (mostLost.possessionLost ?? 0) > 0) {
      const secondLost = [...players].sort((a, b) => (b.possessionLost ?? 0) - (a.possessionLost ?? 0))[1];
      return `${mostLost.name} lost the ball most often (${mostLost.possessionLost} times)${
        secondLost ? `, followed closely by ${secondLost.name} (${secondLost.possessionLost ?? 0} turnovers)` : ''
      }, with ${ctx.homeTeam} losing possession ${ctx.dossier?.stats?.home?.possessionLost ?? 0} times overall to ${ctx.awayTeam}'s ${ctx.dossier?.stats?.away?.possessionLost ?? 0}.`;
    }
  }

  if (lower.includes('block') || lower.includes('through') || lower.includes('pass')) {
    const topThrough = [...players].sort((a, b) => (b.throughPassesCompleted ?? 0) - (a.throughPassesCompleted ?? 0))[0];
    const topBlock = [...players].sort((a, b) => (b.blocks ?? 0) - (a.blocks ?? 0))[0];
    if (topThrough || topBlock) {
      return `${ctx.homeTeam} completed ${ctx.dossier?.stats?.home?.passesCompleted ?? 0}/${ctx.dossier?.stats?.home?.passesAttempted ?? 0} passes (${ctx.dossier?.stats?.home?.passAccuracy ?? 0}%) and ${ctx.dossier?.stats?.home?.throughPassesCompleted ?? 0}/${ctx.dossier?.stats?.home?.throughPasses ?? 0} through balls, while ${ctx.awayTeam} hit ${ctx.dossier?.stats?.away?.passAccuracy ?? 0}% accuracy. ${topThrough ? `${topThrough.name} led line-breaking passes (${topThrough.throughPassesCompleted ?? 0}/${topThrough.throughPasses ?? 0} through balls)` : ''}${topBlock && (topBlock.blocks ?? 0) > 0 ? `, and ${topBlock.name} led shot blocks with ${topBlock.blocks}` : ''}.`;
    }
  }

  if (lower.includes('tactic') || lower.includes('adjust') || lower.includes('board')) {
    const formations =
      ctx.homeFormation && ctx.awayFormation
        ? `With ${ctx.homeTeam} in ${ctx.homeFormation} against ${ctx.awayTeam}'s ${ctx.awayFormation}, `
        : '';
    return `${formations}${ctx.dossier?.tactics?.homeTacticalSummary || story.primary.headline}. Finding cleaner angles into the wide half-spaces would really help stretch their back line.`;
  }

  if (lower.includes('stand') || lower.includes('player') || lower.includes('rating') || lower.includes('perform') || lower.includes('worst')) {
    if (lower.includes('worst') || lower.includes('quiet') || lower.includes('struggl')) {
      const lowest = [...players].sort((a, b) => a.rating - b.rating)[0];
      if (lowest) {
        return `${lowest.name} had the toughest outing on a ${lowest.rating.toFixed(1)} rating over ${lowest.minutesPlayed} minutes, finishing with ${lowest.passesCompleted}/${lowest.passesAttempted} passes and losing the ball ${lowest.possessionLost ?? 0} times.`;
      }
    }
    const top = [...players].sort((a, b) => b.rating - a.rating)[0] || ctx.dossier?.keyPerformers?.[0];
    if (top) {
      return `${top.name}${typeof top.rating === 'number' ? ` (${top.rating.toFixed(1)} rating)` : ''} set the tone out there — contributing directly in the decisive phases while keeping his team's structure sharp.`;
    }
  }

  if (lower.includes('goalkeeper') || lower.includes('penalt') || lower.includes('shootout')) {
    return `At ${ctx.homeScore}-${ctx.awayScore}, it's all about composure for both keepers. Staying upright as long as possible forces the taker to make the first move.`;
  }

  if (lower.includes('control') || lower.includes('dominat') || lower.includes('possession') || lower.includes('truth')) {
    if (typeof ctx.possessionHome === 'number' && typeof ctx.shotsHome === 'number' && typeof ctx.shotsAway === 'number') {
      return `${ctx.homeTeam} have kept more of the ball at ${ctx.possessionHome}% and carved out ${ctx.shotsHome} shots to ${ctx.awayTeam}'s ${ctx.shotsAway}, though taking those openings cleanly is what settles games like this.`;
    }
  }

  return `${story.primary.headline}. With ${ctx.homeTeam} ${ctx.homeScore} and ${ctx.awayTeam} ${ctx.awayScore}${
    ctx.scorersSummary ? `, and goals from ${ctx.scorersSummary}` : ''
  }, the next tactical spell in midfield will tell us plenty.`;
}

export async function generateLivePunditTurn(payload: {
  matchContext: LiveMatchContextPayload;
  voiceName?: string;
  userPrompt?: string;
  isOpening?: boolean;
  conversationHistory?: Array<{ role: 'user' | 'pundit'; text: string }>;
}): Promise<{
  script: string;
  audioBase64: string;
  mimeType: 'audio/wav';
  speechFallback: boolean;
  voiceName: GeminiBroadcastVoice;
  model: string;
}> {
  const ctx = payload.matchContext;
  if (!ctx?.homeTeam || !ctx?.awayTeam) {
    throw new GeminiServiceError('matchContext with homeTeam and awayTeam is required.', 400);
  }
  const voiceName = normalizeBroadcastVoice(
    payload.voiceName,
    ctx.phase === 'full-time' || ctx.phase === 'half-time' ? 'Orus' : 'Charon',
    `${ctx.homeTeam}:${ctx.awayTeam}`
  );
  const prompt =
    (payload.userPrompt || '').trim() ||
    `Give a natural, grounded 2-sentence commentary take on ${ctx.homeTeam} ${ctx.homeScore}-${ctx.awayScore} ${ctx.awayTeam}.`;
  const systemInstruction = buildLivePunditSystemInstruction(ctx, voiceName);

  const historyTurns = Array.isArray(payload.conversationHistory)
    ? payload.conversationHistory
        .filter((m) => m && (m.role === 'user' || m.role === 'pundit') && String(m.text || '').trim())
        .slice(-8)
        .map((m) => ({
          role: m.role === 'user' ? ('user' as const) : ('model' as const),
          parts: [{ text: String(m.text).trim() }],
        }))
    : [];
  const conversationContents = [
    ...historyTurns,
    { role: 'user' as const, parts: [{ text: prompt }] },
  ];

  let rawScript = '';
  const ai = hasValidGeminiApiKey() ? getGeminiClient() : null;

  if (ai && Date.now() >= textQuotaCooldownUntil) {
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: conversationContents,
          config: {
            systemInstruction,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        }),
        10500,
        'Live studio pundit (gemini-4-hydrogen)'
      );
      rawScript = String(response.text || '')
        .replace(/[*_`#]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    } catch (err) {
      if (isQuotaOrUnavailableError(err)) {
        try {
          const fallbackResp = await withTimeout(
            ai.models.generateContent({
              model: 'gemini-3.1-flash-lite',
              contents: conversationContents,
              config: {
                systemInstruction,
                thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
              },
            }),
            8000,
            'Live studio pundit (gemini-3.1-flash-lite)'
          );
          rawScript = String(fallbackResp.text || '')
            .replace(/[*_`#]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        } catch (err2) {
          if (isQuotaOrUnavailableError(err2)) {
            textQuotaCooldownUntil = Date.now() + QUOTA_COOLDOWN_MS;
          }
        }
      }
    }
  }

  if (!rawScript) {
    rawScript = buildFallbackLivePunditAnswer(ctx, prompt, Boolean(payload.isOpening));
  }

  const displayScript = stripTtsTagsForDisplay(rawScript);
  const turnPlan: BroadcastTurnPlan = {
    speaker: voiceName,
    ttsText: displayScript,
    cleanText: displayScript,
    emotion: 'tactical',
    pauseAfterMs: 0,
    style: selectTurnTtsStyle(voiceName, 'tactical'),
  };

  const ttsResult = ai
    ? await synthesizeTurnAudioWithVoice(ai, turnPlan, false)
    : null;

  return ttsResult
    ? {
        script: displayScript,
        audioBase64: ttsResult.audioBase64,
        mimeType: 'audio/wav',
        speechFallback: false,
        voiceName,
        model: ttsResult.model,
      }
    : {
        script: displayScript,
        audioBase64: '',
        mimeType: 'audio/wav',
        speechFallback: true,
        voiceName,
        model: 'broadcast-voice-engine',
      };
}

let liveQuotaCooldownUntil = 0;

export function attachGeminiLiveWebSocket(server: {
  on: (event: string, listener: (...args: any[]) => void) => void;
}) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    try {
      const reqUrl = request.url || '/';
      const parsed = new URL(reqUrl, 'http://localhost');
      if (parsed.pathname !== '/api/gemini/live') {
        return;
      }
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } catch {
      socket.destroy();
    }
  });

  wss.on('connection', (clientWs: WebSocket) => {
    let sessionPromise: Promise<Awaited<ReturnType<GoogleGenAI['live']['connect']>>> | null = null;
    let activeSession: Awaited<ReturnType<GoogleGenAI['live']['connect']>> | null = null;
    let isClosed = false;

    const safeSend = (payload: Record<string, unknown>) => {
      if (isClosed || clientWs.readyState !== WebSocket.OPEN) return;
      try {
        clientWs.send(JSON.stringify(payload));
      } catch {
        // Ignore broken pipe on closing client
      }
    };

    const cleanupSession = () => {
      if (activeSession) {
        try {
          activeSession.close();
        } catch {
          // Ignore close errors
        }
        activeSession = null;
      }
      sessionPromise = null;
    };

    const connectGeminiLive = (
      matchContext?: LiveMatchContextPayload,
      voiceRaw?: unknown,
      promptOpening?: boolean
    ) => {
      if (sessionPromise) return sessionPromise;

      if (!hasValidGeminiApiKey() || Date.now() < liveQuotaCooldownUntil) {
        safeSend({ type: 'fallback', reason: 'Using studio voice engine.' });
        return null;
      }

      let ai: GoogleGenAI;
      try {
        ai = getGeminiClient();
      } catch (err) {
        const mapped = mapGeminiApiError(err);
        safeSend({ type: 'fallback', reason: mapped.message });
        return null;
      }

      const voiceName = normalizeBroadcastVoice(
        voiceRaw,
        matchContext?.phase === 'half-time' || matchContext?.phase === 'full-time' ? 'Orus' : 'Charon',
        matchContext ? `${matchContext.homeTeam}:${matchContext.awayTeam}` : ''
      );
      const systemInstruction = buildLivePunditSystemInstruction(matchContext, voiceName);

      sessionPromise = ai.live
        .connect({
          model: 'gemini-3.8-live',
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName },
              },
            },
            outputAudioTranscription: {},
            systemInstruction,
          },
          callbacks: {
            onopen: () => {
              safeSend({ type: 'ready', model: 'gemini-3.8-live', voiceName });
            },
            onmessage: (message: LiveServerMessage) => {
              if (isClosed) return;
              const content = message.serverContent;
              if (content?.outputTranscription?.text) {
                safeSend({
                  type: 'outputTranscript',
                  text: content.outputTranscription.text,
                });
              }
              for (const part of content?.modelTurn?.parts ?? []) {
                if (part.inlineData?.data) {
                  safeSend({
                    type: 'audio',
                    audio: part.inlineData.data,
                  });
                }
              }
              if (content?.interrupted) {
                safeSend({ type: 'interrupted' });
              }
              if (content?.turnComplete) {
                safeSend({ type: 'turnComplete' });
              }
            },
            onerror: (errEvent: unknown) => {
              const mapped = mapGeminiApiError(errEvent);
              if (isQuotaOrUnavailableError(errEvent)) {
                liveQuotaCooldownUntil = Date.now() + QUOTA_COOLDOWN_MS;
              }
              safeSend({ type: 'fallback', reason: mapped.message });
            },
            onclose: () => {
              if (!isClosed) {
                safeSend({ type: 'closed' });
              }
            },
          },
        })
        .then((session) => {
          if (isClosed) {
            try {
              session.close();
            } catch {
              // Ignore
            }
            return session;
          }
          activeSession = session;
          if (promptOpening && matchContext?.homeTeam && matchContext?.awayTeam) {
            session.sendRealtimeInput({
              text: `Give a calm, natural 2-sentence studio observation on ${matchContext.homeTeam} ${matchContext.homeScore}-${matchContext.awayScore} ${matchContext.awayTeam} — sound like a real football co-commentator on air and ask one brief tactical question back.`,
            });
          }
          return session;
        })
        .catch((err) => {
          const mapped = mapGeminiApiError(err);
          if (isQuotaOrUnavailableError(err)) {
            liveQuotaCooldownUntil = Date.now() + QUOTA_COOLDOWN_MS;
          }
          safeSend({ type: 'fallback', reason: mapped.message });
          sessionPromise = null;
          return null as unknown as Awaited<ReturnType<GoogleGenAI['live']['connect']>>;
        });

      return sessionPromise;
    };

    clientWs.on('message', (rawData) => {
      if (isClosed) return;
      try {
        const msg = JSON.parse(rawData.toString()) as {
          type?: string;
          audio?: string;
          text?: string;
          voiceName?: string;
          promptOpening?: boolean;
          matchContext?: LiveMatchContextPayload;
        };

        if (msg.type === 'init') {
          void connectGeminiLive(msg.matchContext, msg.voiceName, Boolean(msg.promptOpening));
          return;
        }

        if (msg.type === 'close') {
          cleanupSession();
          return;
        }

        if (!sessionPromise) {
          void connectGeminiLive(msg.matchContext, msg.voiceName, false);
        }

        const currentPromise = sessionPromise;
        if (!currentPromise) return;

        if (typeof msg.text === 'string' && msg.text.trim().length > 0) {
          const cleanText = msg.text.trim();
          void currentPromise
            .then((session) => {
              if (!isClosed) {
                session.sendRealtimeInput({ text: cleanText });
              }
            })
            .catch(() => {});
        }
      } catch {
        safeSend({ type: 'error', error: 'Invalid WebSocket message payload.' });
      }
    });

    clientWs.on('close', () => {
      isClosed = true;
      cleanupSession();
    });

    clientWs.on('error', () => {
      isClosed = true;
      cleanupSession();
    });
  });

  return wss;
}
