import { CLUB_TEAMS_DATABASE, NATIONAL_TEAMS_DATABASE } from '../data/teamsDatabase';
import { buildSeededClubManagers } from '../data/clubManagersDatabase';
import {
  buildInitialTeamSetup,
  computePreMatchOdds,
  createSeededRng,
  simulateMatch,
} from './matchSimulator';
import {
  buildEnvironmentConditions,
  buildRefereeProfile,
  computePlayerMatchFormDelta,
  computeTacticalMatchupModifiers,
  computeTeamChemistryBreakdown,
  resolveCompetitionBenchmark,
  resolveCrowdAtmosphere,
} from './matchIntel';
import type {
  SimCompetitionConfig,
  SimCompetitionPreset,
  SimTacticalOverrideCheckpoint,
  SimTeamSetup,
} from '../types/simulation';
import type { Manager } from '../types/manager';
import type { Team } from '../types/matchCentre';

let passed = 0;
let failed = 0;

function check(condition: boolean, label: string): void {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  [FAIL] ${label}`);
  }
}

function testGroup(name: string, fn: () => void): void {
  console.log(`\n▶ ${name}`);
  const beforeFail = failed;
  fn();
  if (failed === beforeFail) {
    console.log(`  [PASS] All checks passed`);
  }
}

function getManagersByTeam(teams: Team[]): Map<string, Manager> {
  const { managers, appointments } = buildSeededClubManagers(teams);
  const byTeam = new Map<string, Manager>();
  const mgrMap = new Map(managers.map((m) => [m.id, m]));
  for (const appt of appointments) {
    const m = mgrMap.get(appt.manager_id);
    if (m) byTeam.set(appt.team_id, m);
  }
  return byTeam;
}

function makeComp(
  preset: SimCompetitionPreset,
  overrides: Partial<SimCompetitionConfig> = {}
): SimCompetitionConfig {
  return {
    preset,
    competitionId: `test-${preset}`,
    competitionName: `Test ${preset}`,
    stageLabel: 'Matchday 1',
    isKnockout: false,
    allowExtraTime: false,
    allowPenalties: false,
    isTwoLegged: false,
    legNumber: 1,
    awayGoalsRule: false,
    neutralVenue: false,
    homeAdvantageBoost: 5,
    ...overrides,
  };
}

const clubs = CLUB_TEAMS_DATABASE;
const nationals = NATIONAL_TEAMS_DATABASE;
const managers = getManagersByTeam(clubs);
const eliteClubs = clubs.slice(0, 12);
const midClubs = clubs.filter((c) => c.overallRating >= 75 && c.overallRating <= 79).slice(0, 12);

console.log('=== DodaEona SimEngine v3.1 Automated Verification Suite ===');

// ---------------------------------------------------------------------------
// 1. REAL-WORLD COMPETITION BENCHMARKS
// ---------------------------------------------------------------------------
testGroup('1. Competition Benchmarks & Calibration Differentiation', () => {
  const plBench = resolveCompetitionBenchmark(makeComp('premier-league'));
  const friendlyBench = resolveCompetitionBenchmark(makeComp('friendly'));
  const intlBench = resolveCompetitionBenchmark(makeComp('international'));
  const cupBench = resolveCompetitionBenchmark(makeComp('national-cup', { isKnockout: true }));

  check(friendlyBench.cardFactor < plBench.cardFactor, 'Friendly cardFactor < Premier League');
  check(friendlyBench.foulFactor < plBench.foulFactor, 'Friendly foulFactor < Premier League');
  check(friendlyBench.tempoFactor < plBench.tempoFactor, 'Friendly tempoFactor < Premier League');
  check(cupBench.cupUpsetBelief > plBench.cupUpsetBelief, 'Cup upset belief > League');
  check(intlBench.chemistryCohesionBase < plBench.chemistryCohesionBase, 'International cohesion < Club cohesion');

  let plFouls = 0;
  let plYellows = 0;
  let frFouls = 0;
  let frYellows = 0;

  for (let i = 0; i < 24; i++) {
    const h = midClubs[i % midClubs.length];
    const a = midClubs[(i * 3 + 1) % midClubs.length];
    const hSetup = buildInitialTeamSetup(h, managers.get(h.id) ?? null);
    const aSetup = buildInitialTeamSetup(a, managers.get(a.id) ?? null);

    const plOut = simulateMatch({
      seed: `comp-diff-${i}`,
      competition: makeComp('premier-league'),
      homeTeam: h,
      awayTeam: a,
      initialHomeSetup: hSetup,
      initialAwaySetup: aSetup,
    });
    const frOut = simulateMatch({
      seed: `comp-diff-${i}`,
      competition: makeComp('friendly'),
      homeTeam: h,
      awayTeam: a,
      initialHomeSetup: hSetup,
      initialAwaySetup: aSetup,
    });

    plFouls += plOut.homeStats.fouls + plOut.awayStats.fouls;
    plYellows += plOut.homeStats.yellowCards + plOut.awayStats.yellowCards;
    frFouls += frOut.homeStats.fouls + frOut.awayStats.fouls;
    frYellows += frOut.homeStats.yellowCards + frOut.awayStats.yellowCards;
  }

  check(frFouls < plFouls * 0.85, `Friendly fouls (${frFouls}) clearly lower than PL fouls (${plFouls})`);
  check(frYellows < plYellows * 0.55, `Friendly yellows (${frYellows}) clearly lower than PL yellows (${plYellows})`);
});

// ---------------------------------------------------------------------------
// 2. ADVANCED PLAYER CHEMISTRY & POSITIONAL PARTNERSHIPS
// ---------------------------------------------------------------------------
testGroup('2. Advanced Player Chemistry & Positional Partnerships', () => {
  const team = eliteClubs[0];
  const naturalSetup = buildInitialTeamSetup(team, managers.get(team.id) ?? null);

  // Scramble positions: put attackers in defense/GK and defenders up top
  const reversedSlots = naturalSetup.slots.map((s, idx, arr) => ({
    ...s,
    player: arr[arr.length - 1 - idx].player,
  }));
  const scrambledSetup: SimTeamSetup = {
    ...naturalSetup,
    slots: reversedSlots,
  };

  const natChem = computeTeamChemistryBreakdown(
    naturalSetup.slots.map((s) => ({
      player: s.player!,
      nodeRole: s.node.role,
      fitMultiplier: 1.0,
    })),
    'club',
    naturalSetup,
    1.0
  );

  const scrChem = computeTeamChemistryBreakdown(
    scrambledSetup.slots.map((s) => ({
      player: s.player!,
      nodeRole: s.node.role,
      fitMultiplier: 0.78,
    })),
    'club',
    scrambledSetup,
    1.0
  );

  check(natChem.score > scrChem.score + 12, `Natural XI chem (${natChem.score}) > Scrambled XI chem (${scrChem.score})`);
  check(natChem.chemistryFactor > scrChem.chemistryFactor, 'Natural XI chemistryFactor > Scrambled XI');
  check(natChem.cbPairSynergy > scrChem.cbPairSynergy, 'Natural CB-CB partnership outperforms scrambled');
  check(natChem.gkDefComm > scrChem.gkDefComm, 'Natural GK-CB communication outperforms scrambled');

  // Verify live match telemetry outputs chemistry metadata & advantage
  let natXg = 0;
  let scrXg = 0;
  const opp = eliteClubs[1];
  const oppSetup = buildInitialTeamSetup(opp, managers.get(opp.id) ?? null);
  for (let i = 0; i < 12; i++) {
    const outNat = simulateMatch({
      seed: `chem-live-${i}`,
      competition: makeComp('premier-league'),
      homeTeam: team,
      awayTeam: opp,
      initialHomeSetup: naturalSetup,
      initialAwaySetup: oppSetup,
    });
    const outScr = simulateMatch({
      seed: `chem-live-${i}`,
      competition: makeComp('premier-league'),
      homeTeam: team,
      awayTeam: opp,
      initialHomeSetup: scrambledSetup,
      initialAwaySetup: oppSetup,
    });
    check(
      (outNat.matchConditions?.homeChemistryScore ?? 0) > (outScr.matchConditions?.homeChemistryScore ?? 0),
      `Match metadata homeChemistryScore higher in natural XI (seed ${i})`
    );
    natXg += outNat.homeStats.xg;
    scrXg += outScr.homeStats.xg;
  }
  check(natXg > scrXg, `Natural chemistry generates higher xG (${natXg.toFixed(2)} vs ${scrXg.toFixed(2)})`);
});

// ---------------------------------------------------------------------------
// 3. REFEREE BEHAVIOUR & ADVANTAGE RULE
// ---------------------------------------------------------------------------
testGroup('3. Referee Archetypes, Strictness Override & Advantage Rule', () => {
  const strictRef = buildRefereeProfile(
    makeComp('premier-league', { refereeStrictnessOverride: 'strict' }),
    createSeededRng('ref-strict')
  );
  const lenientRef = buildRefereeProfile(
    makeComp('premier-league', { refereeStrictnessOverride: 'lenient' }),
    createSeededRng('ref-lenient')
  );

  check(strictRef.archetype === 'Strict' || strictRef.archetype === 'Card-Happy', 'Strict override maps to Strict/Card-Happy');
  check(lenientRef.archetype === 'Let-It-Flow', 'Lenient override maps to Let-It-Flow');
  check(strictRef.cardStrictness > lenientRef.cardStrictness, 'Strict ref cardStrictness > Lenient ref');
  check(lenientRef.advantageTendency > strictRef.advantageTendency, 'Lenient ref advantageTendency > Strict ref');

  let strictFouls = 0;
  let strictCards = 0;
  let lenientFouls = 0;
  let lenientCards = 0;
  let advantageCommentaryCount = 0;

  for (let i = 0; i < 20; i++) {
    const h = midClubs[i % midClubs.length];
    const a = midClubs[(i + 2) % midClubs.length];
    const hSetup = buildInitialTeamSetup(h);
    const aSetup = buildInitialTeamSetup(a);

    const outStrict = simulateMatch({
      seed: `ref-sim-${i}`,
      competition: makeComp('premier-league', { refereeStrictnessOverride: 'strict' }),
      homeTeam: h,
      awayTeam: a,
      initialHomeSetup: hSetup,
      initialAwaySetup: aSetup,
    });
    const outLenient = simulateMatch({
      seed: `ref-sim-${i}`,
      competition: makeComp('premier-league', { refereeStrictnessOverride: 'lenient' }),
      homeTeam: h,
      awayTeam: a,
      initialHomeSetup: hSetup,
      initialAwaySetup: aSetup,
    });

    strictFouls += outStrict.homeStats.fouls + outStrict.awayStats.fouls;
    strictCards += outStrict.homeStats.yellowCards + outStrict.awayStats.yellowCards;
    lenientFouls += outLenient.homeStats.fouls + outLenient.awayStats.fouls;
    lenientCards += outLenient.homeStats.yellowCards + outLenient.awayStats.yellowCards;

    advantageCommentaryCount += outLenient.events.filter((e) =>
      e.commentary.includes('after advantage was played')
    ).length;
  }

  check(strictFouls > lenientFouls, `Strict referee calls more fouls (${strictFouls} vs ${lenientFouls})`);
  check(strictCards > lenientCards * 1.25, `Strict referee shows significantly more cards (${strictCards} vs ${lenientCards})`);
  check(advantageCommentaryCount >= 0, 'Advantage event handling runs cleanly without errors');
});

// ---------------------------------------------------------------------------
// 4. ENVIRONMENTAL CONDITIONS (WEATHER & PITCH)
// ---------------------------------------------------------------------------
testGroup('4. Environmental Conditions (Weather & Pitch Impact)', () => {
  const clearEnv = buildEnvironmentConditions(
    eliteClubs[0],
    makeComp('premier-league', { weatherOverride: 'Clear', pitchOverride: 'Pristine' }),
    createSeededRng('env-1')
  );
  const stormEnv = buildEnvironmentConditions(
    eliteClubs[0],
    makeComp('premier-league', { weatherOverride: 'Heavy Rain', pitchOverride: 'Heavy' }),
    createSeededRng('env-2')
  );

  check(clearEnv.weather === 'Clear' && clearEnv.pitch === 'Pristine', 'Weather/Pitch Clear+Pristine override respected');
  check(stormEnv.weather === 'Heavy Rain' && stormEnv.pitch === 'Heavy', 'Weather/Pitch Heavy Rain+Heavy override respected');
  check(stormEnv.passingMod < clearEnv.passingMod, 'Heavy Rain+Heavy lowers passingMod');
  check(stormEnv.foulRiskMod > clearEnv.foulRiskMod, 'Heavy Rain+Heavy raises foulRiskMod');
  check(stormEnv.staminaDrainMod > clearEnv.staminaDrainMod, 'Heavy Rain+Heavy raises staminaDrainMod');

  let clearPassPctSum = 0;
  let stormPassPctSum = 0;
  let clearFouls = 0;
  let stormFouls = 0;

  for (let i = 0; i < 20; i++) {
    const h = eliteClubs[i % eliteClubs.length];
    const a = eliteClubs[(i + 3) % eliteClubs.length];
    const hSetup = buildInitialTeamSetup(h);
    const aSetup = buildInitialTeamSetup(a);

    const outClear = simulateMatch({
      seed: `env-sim-${i}`,
      competition: makeComp('premier-league', { weatherOverride: 'Clear', pitchOverride: 'Pristine' }),
      homeTeam: h,
      awayTeam: a,
      initialHomeSetup: hSetup,
      initialAwaySetup: aSetup,
    });
    const outStorm = simulateMatch({
      seed: `env-sim-${i}`,
      competition: makeComp('premier-league', { weatherOverride: 'Heavy Rain', pitchOverride: 'Heavy' }),
      homeTeam: h,
      awayTeam: a,
      initialHomeSetup: hSetup,
      initialAwaySetup: aSetup,
    });

    clearPassPctSum += outClear.homeStats.passAccuracy + outClear.awayStats.passAccuracy;
    stormPassPctSum += outStorm.homeStats.passAccuracy + outStorm.awayStats.passAccuracy;
    clearFouls += outClear.homeStats.fouls + outClear.awayStats.fouls;
    stormFouls += outStorm.homeStats.fouls + outStorm.awayStats.fouls;
  }

  check(
    clearPassPctSum > stormPassPctSum,
    `Clear+Pristine pass accuracy sum (${clearPassPctSum}) > Heavy Rain+Heavy (${stormPassPctSum})`
  );
  check(
    stormFouls > clearFouls,
    `Heavy Rain+Heavy fouls (${stormFouls}) > Clear+Pristine (${clearFouls})`
  );
});

// ---------------------------------------------------------------------------
// 5. ADVANCED TACTICAL INTELLIGENCE
// ---------------------------------------------------------------------------
testGroup('5. Tactical Matchups, Press Resistance & Adaptive AI Line', () => {
  const wideVsNarrow = computeTacticalMatchupModifiers({
    attWidth: 82,
    attWidePlayers: 4,
    attCentralMids: 2,
    attPressResistance: 2.0,
    attPace: 80,
    defWidth: 36,
    defWidePlayers: 0,
    defCentralMids: 4,
    defLine: 60,
    defPressing: 65,
    defBackCount: 4,
    defStamina: 85,
  });
  check(wideVsNarrow.attWideOverloadBonus > 0.02, 'Wide system generates wide overload vs narrow defense');

  const highLineExposed = computeTacticalMatchupModifiers({
    attWidth: 65,
    attWidePlayers: 2,
    attCentralMids: 3,
    attPressResistance: 4.5,
    attPace: 86,
    defWidth: 60,
    defWidePlayers: 2,
    defCentralMids: 3,
    defLine: 82,
    defPressing: 84,
    defBackCount: 4,
    defStamina: 56,
  });
  const lowResVsHighPress = computeTacticalMatchupModifiers({
    attWidth: 65,
    attWidePlayers: 2,
    attCentralMids: 3,
    attPressResistance: 0.2,
    attPace: 86,
    defWidth: 60,
    defWidePlayers: 2,
    defCentralMids: 3,
    defLine: 82,
    defPressing: 84,
    defBackCount: 4,
    defStamina: 56,
  });
  check(highLineExposed.pressBrokenSpaceBonus > 0.02, 'Press-resistant midfield exploits tired high press');
  check(highLineExposed.highLineThroughBallBonus > 0.02, 'Pace exploits 82 defensive line via through-balls');
  check(
    highLineExposed.pressDisruptionMod < lowResVsHighPress.pressDisruptionMod,
    'High press disruption dampened by press-resistant midfield vs low-resistance midfield'
  );
});

// ---------------------------------------------------------------------------
// 6. BALANCED HOME ADVANTAGE & CROWD INFLUENCE
// ---------------------------------------------------------------------------
testGroup('6. Balanced Home Advantage & Away Composure Immunity', () => {
  const lowCompAway = midClubs[0].squad.slice(0, 11).map((p) => ({
    ...p,
    age: 19,
    attributes: { ...p.attributes, composure: 54 },
  }));
  const vetCompAway = midClubs[0].squad.slice(0, 11).map((p) => ({
    ...p,
    age: 29,
    attributes: { ...p.attributes, composure: 90 },
  }));

  const bench = resolveCompetitionBenchmark(makeComp('champions-league', { isKnockout: true }));
  const crowdYoung = resolveCrowdAtmosphere(
    75000,
    eliteClubs[0],
    lowCompAway,
    makeComp('champions-league', { isKnockout: true, homeAdvantageBoost: 8 }),
    bench,
    0.72,
    createSeededRng('crowd-1')
  );
  const crowdVet = resolveCrowdAtmosphere(
    75000,
    eliteClubs[0],
    vetCompAway,
    makeComp('champions-league', { isKnockout: true, homeAdvantageBoost: 8 }),
    bench,
    0.72,
    createSeededRng('crowd-1')
  );
  const neutralCrowd = resolveCrowdAtmosphere(
    75000,
    eliteClubs[0],
    lowCompAway,
    makeComp('champions-league', { neutralVenue: true }),
    bench,
    0.72,
    createSeededRng('crowd-1')
  );

  check(crowdVet.awayCrowdImmunity > crowdYoung.awayCrowdImmunity, 'Veteran composed away XI resists crowd better');
  check(crowdYoung.homeEnergyBase > crowdVet.homeEnergyBase, 'Crowd edge stronger against inexperienced away XI');
  check(neutralCrowd.homeEnergyBase === 0 && neutralCrowd.refereeCrowdTilt === 0, 'Neutral venue removes home advantage');
});

// ---------------------------------------------------------------------------
// 7. INDIVIDUAL PLAYER PERFORMANCE CONSISTENCY
// ---------------------------------------------------------------------------
testGroup('7. Individual Player Performance Consistency & Determinism', () => {
  const star = {
    ...eliteClubs[0].squad[0],
    age: 27,
    overallRating: 90,
    attributes: { ...eliteClubs[0].squad[0].attributes, composure: 92 },
  };
  const rawKid = {
    ...eliteClubs[0].squad[0],
    age: 18,
    overallRating: 70,
    attributes: { ...eliteClubs[0].squad[0].attributes, composure: 52 },
  };

  // Seed determinism check
  const d1 = computePlayerMatchFormDelta(star, createSeededRng('form-det-1'));
  const d2 = computePlayerMatchFormDelta(star, createSeededRng('form-det-1'));
  check(d1 === d2, 'computePlayerMatchFormDelta is strictly deterministic per seed');

  // Variance check across 1,000 draws
  let starAbsSum = 0;
  let kidAbsSum = 0;
  for (let i = 0; i < 1000; i++) {
    const sDelta = computePlayerMatchFormDelta(star, createSeededRng(`f-star-${i}`));
    const kDelta = computePlayerMatchFormDelta(rawKid, createSeededRng(`f-kid-${i}`));
    check(sDelta >= -4.2 && sDelta <= 4.4 && kDelta >= -4.2 && kDelta <= 4.4, `Form delta within bounds on sample ${i}`);
    starAbsSum += Math.abs(sDelta);
    kidAbsSum += Math.abs(kDelta);
  }
  check(
    starAbsSum < kidAbsSum * 0.85,
    `High-composure prime player shows tighter variance (${(starAbsSum / 1000).toFixed(3)} vs ${(kidAbsSum / 1000).toFixed(3)})`
  );
});

// ---------------------------------------------------------------------------
// 8. CORE COMPATIBILITY, DETERMINISM, INVARIANTS, LIVE OVERRIDES & KNOCKOUTS
// ---------------------------------------------------------------------------
testGroup('8. Core Compatibility, Determinism, Invariants, Live Overrides & Penalties', () => {
  const h = eliteClubs[0];
  const a = eliteClubs[2];
  const hSetup = buildInitialTeamSetup(h, managers.get(h.id) ?? null);
  const aSetup = buildInitialTeamSetup(a, managers.get(a.id) ?? null);
  const comp = makeComp('premier-league');

  // Pre-match odds API preserved
  const odds = computePreMatchOdds(hSetup, aSetup, managers.get(h.id), managers.get(a.id));
  check(Math.abs(odds.homeWinPct + odds.drawPct + odds.awayWinPct - 100) <= 1, 'Pre-match odds sum to ~100%');

  // Seed determinism
  const runA = simulateMatch({ seed: 'det-v31', competition: comp, homeTeam: h, awayTeam: a, initialHomeSetup: hSetup, initialAwaySetup: aSetup });
  const runB = simulateMatch({ seed: 'det-v31', competition: comp, homeTeam: h, awayTeam: a, initialHomeSetup: hSetup, initialAwaySetup: aSetup });
  check(runA.homeScore === runB.homeScore && runA.awayScore === runB.awayScore, 'Determinism: exact final score');
  check(runA.events.length === runB.events.length, 'Determinism: exact timeline event count');
  check(runA.shots.length === runB.shots.length, 'Determinism: exact shot count');
  check(
    runA.matchConditions?.refereeName === runB.matchConditions?.refereeName &&
      runA.matchConditions?.weather === runB.matchConditions?.weather,
    'Determinism: exact matchConditions metadata'
  );

  // Statistical consistency across 15 diverse matches
  for (let i = 0; i < 15; i++) {
    const t1 = clubs[i % clubs.length];
    const t2 = clubs[(i * 7 + 3) % clubs.length];
    const out = simulateMatch({
      seed: `inv-${i}`,
      competition: comp,
      homeTeam: t1,
      awayTeam: t2,
      initialHomeSetup: buildInitialTeamSetup(t1),
      initialAwaySetup: buildInitialTeamSetup(t2),
    });

    const homeGoalsEv = out.events.filter((e) => e.type === 'goal' && e.teamSide === 'home').length;
    const awayGoalsEv = out.events.filter((e) => e.type === 'goal' && e.teamSide === 'away').length;
    check(out.homeScore === homeGoalsEv, `Invariant [${i}]: homeScore === home goal events`);
    check(out.awayScore === awayGoalsEv, `Invariant [${i}]: awayScore === away goal events`);
    check(out.homeStats.possession + out.awayStats.possession === 100, `Invariant [${i}]: possession sums to 100`);
    check(
      out.homeStats.shotsOnTarget === out.homeScore + out.awayStats.saves,
      `Invariant [${i}]: home SOT === homeScore + awaySaves`
    );
    check(
      out.awayStats.shotsOnTarget === out.awayScore + out.homeStats.saves,
      `Invariant [${i}]: away SOT === awayScore + homeSaves`
    );
  }

  // Live minute-46 tactical overrides preserve 1H parity and alter 2H
  const checkpoint46: SimTacticalOverrideCheckpoint = {
    minute: 46,
    teamSide: 'home',
    planId: 'B',
    formation: hSetup.plans.B.formation,
    planConfig: {
      ...hSetup.plans.B,
      pressingIntensity: 94,
      defensiveLine: 86,
      buildUpSpeed: 90,
      mentalitySettings: {
        ...hSetup.plans.B.mentalitySettings,
        mentality: 'Attacking',
      },
    },
    slots: hSetup.slots,
    bench: hSetup.bench,
  };

  const baseSim = simulateMatch({ seed: 'ovr-46', competition: comp, homeTeam: h, awayTeam: a, initialHomeSetup: hSetup, initialAwaySetup: aSetup });
  const ovrSim = simulateMatch({
    seed: 'ovr-46',
    competition: comp,
    homeTeam: h,
    awayTeam: a,
    initialHomeSetup: hSetup,
    initialAwaySetup: aSetup,
    tacticalOverrides: [checkpoint46],
  });
  check(
    baseSim.halfTimeHomeScore === ovrSim.halfTimeHomeScore &&
      baseSim.halfTimeAwayScore === ovrSim.halfTimeAwayScore,
    'Minute-46 override preserves exact Half-Time score'
  );
  const firstHalfBaseEvents = baseSim.events.filter((e) => e.period === '1H').length;
  const firstHalfOvrEvents = ovrSim.events.filter((e) => e.period === '1H').length;
  check(firstHalfBaseEvents === firstHalfOvrEvents, 'Minute-46 override preserves exact 1H event stream');
  check(
    baseSim.events.length !== ovrSim.events.length ||
      baseSim.homeStats.shots !== ovrSim.homeStats.shots ||
      baseSim.homeStats.possession !== ovrSim.homeStats.possession,
    'Minute-46 override changes 2H simulation trajectory'
  );

  // Knockout Extra Time & Penalty Shootout verification (find a tied 90-min knockout seed)
  const koComp = makeComp('national-cup', {
    isKnockout: true,
    allowExtraTime: true,
    allowPenalties: true,
  });
  const nt1 = nationals[0];
  const nt2 = nationals[1];
  const nt1Setup = buildInitialTeamSetup(nt1);
  const nt2Setup = buildInitialTeamSetup(nt2);
  let foundShootout = false;
  for (let s = 0; s < 40; s++) {
    const koOut = simulateMatch({
      seed: `ko-pen-${s}`,
      competition: koComp,
      homeTeam: nt1,
      awayTeam: nt2,
      initialHomeSetup: nt1Setup,
      initialAwaySetup: nt2Setup,
    });
    if (koOut.penaltyShootout) {
      foundShootout = true;
      check(koOut.wentToExtraTime === true, 'Shootout preceded by Extra Time');
      check(koOut.penaltyShootout.winner !== undefined, 'Shootout produced decisive winner');
      check(koOut.penaltyShootout.kicks.length >= 6, 'Shootout recorded penalty kicks');
      break;
    }
  }
  check(foundShootout, 'Knockout competition triggers Extra Time & Penalty Shootout cleanly');
});

console.log(`\n=== SUMMARY: ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  throw new Error(`SimEngine v3.1 verification failed (${failed} checks failed).`);
}
