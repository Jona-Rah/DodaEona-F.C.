import assert from 'node:assert/strict';
import {
  buildTeamRadarProfile,
  pickDefaultComparisonPair,
  resolveRadarTeamColors,
} from './teamCompareMetrics';
import type { Team } from '../types/matchCentre';
import type { TeamAggregateStatistics } from '../types/teamStats';

function makeMockTeam(overrides: Partial<Team> = {}): Team {
  return {
    id: 'team-a',
    name: 'Test United',
    shortName: 'Test Utd',
    code: 'TST',
    type: 'club',
    team_type: 'club',
    country: 'England',
    league: 'Premier League',
    gender: 'men',
    overallRating: 86,
    attackRating: 88,
    midfieldRating: 85,
    defenceRating: 83,
    crestUrl: '',
    stadium: 'Test Arena',
    foundedYear: 1900,
    manager: 'Test Manager',
    playingStyle: 'High Press',
    primaryColor: '#DC052D',
    secondaryColor: '#FFFFFF',
    defaultFormation: '4-3-3',
    squad: [
      {
        id: 'p1',
        name: 'Striker',
        shortName: 'Striker',
        nationality: 'England',
        age: 25,
        position: 'ATT',
        positionDetail: 'ST',
        shirtNumber: 9,
        overallRating: 89,
        injuryStatus: 'fit',
        attributes: { pace: 88, shooting: 90, passing: 78, dribbling: 86, defending: 42, physical: 82 },
      },
      {
        id: 'p2',
        name: 'Midfielder',
        shortName: 'Midfielder',
        nationality: 'England',
        age: 26,
        position: 'MID',
        positionDetail: 'CM',
        shirtNumber: 8,
        overallRating: 86,
        injuryStatus: 'fit',
        attributes: { pace: 78, shooting: 79, passing: 89, dribbling: 86, defending: 77, physical: 80 },
      },
      {
        id: 'p3',
        name: 'Defender',
        shortName: 'Defender',
        nationality: 'England',
        age: 27,
        position: 'DEF',
        positionDetail: 'CB',
        shirtNumber: 4,
        overallRating: 84,
        injuryStatus: 'fit',
        attributes: { pace: 75, shooting: 50, passing: 76, dribbling: 70, defending: 87, physical: 86 },
      },
    ],
    ...overrides,
  };
}

const teamA = makeMockTeam({ id: 'team-a', name: 'Alpha FC', primaryColor: '#DC052D' });
const teamB = makeMockTeam({
  id: 'team-b',
  name: 'Beta FC',
  attackRating: 79,
  midfieldRating: 81,
  defenceRating: 78,
  overallRating: 80,
  primaryColor: '#D8052A', // Intentionally nearly identical red to test collision guard
  secondaryColor: '#F59E0B',
});

// 1. Baseline radar profile bounds & determinism
const baselineProfile = buildTeamRadarProfile(teamA, null);
assert.equal(baselineProfile.axes.attack.score, 88);
assert.equal(baselineProfile.axes.defense.score, 83);
assert.equal(baselineProfile.axes.midfield.score, 85);
assert.equal(baselineProfile.formSource, 'baseline');
assert.ok(baselineProfile.axes.form.score >= 38 && baselineProfile.axes.form.score <= 96);

// 2. Match form boosts on winning run vs drops on losing run
const winningStats = {
  team: { id: 'team-a' },
  combined: {
    matchesPlayed: 5,
    wins: 5,
    draws: 0,
    losses: 0,
    pointsPerMatch: 3,
    avgGoalsFor: 2.6,
    avgGoalsAgainst: 0.4,
    xgPerMatch: 2.2,
    cleanSheetPct: 60,
    avgPossession: 58,
    passAccuracyPct: 88,
    goalsFor: 13,
    goalsAgainst: 2,
    recentForm: Array.from({ length: 5 }, (_, idx) => ({
      matchId: `w-${idx}`,
      source: 'simulate' as const,
      competitionId: 'sim',
      competitionName: 'Friendly',
      date: '2026-11-10',
      venue: 'home' as const,
      opponentId: 'opp',
      opponentName: 'Opp FC',
      opponentCode: 'OPP',
      goalsFor: 3,
      goalsAgainst: 0,
      wentToExtraTime: false,
      result: 'W' as const,
    })),
  },
} as unknown as TeamAggregateStatistics;

const losingStats = {
  ...winningStats,
  combined: {
    ...winningStats.combined,
    wins: 0,
    losses: 5,
    pointsPerMatch: 0,
    recentForm: Array.from({ length: 5 }, (_, idx) => ({
      matchId: `l-${idx}`,
      source: 'simulate' as const,
      competitionId: 'sim',
      competitionName: 'Friendly',
      date: '2026-11-10',
      venue: 'away' as const,
      opponentId: 'opp',
      opponentName: 'Opp FC',
      opponentCode: 'OPP',
      goalsFor: 0,
      goalsAgainst: 3,
      wentToExtraTime: false,
      result: 'L' as const,
    })),
  },
} as unknown as TeamAggregateStatistics;

const hotProfile = buildTeamRadarProfile(teamA, winningStats);
const coldProfile = buildTeamRadarProfile(teamA, losingStats);
assert.equal(hotProfile.formSource, 'matches');
assert.ok(hotProfile.axes.form.score >= 90, `Expected hot form >= 90, got ${hotProfile.axes.form.score}`);
assert.ok(coldProfile.axes.form.score <= 30, `Expected cold form <= 30, got ${coldProfile.axes.form.score}`);

// 3. Color collision separation guarantees distinct polygons
const darkColors = resolveRadarTeamColors(teamA, teamB, false);
assert.notEqual(darkColors.colorA, darkColors.colorB);
const lightColors = resolveRadarTeamColors(teamA, teamB, true);
assert.notEqual(lightColors.colorA, lightColors.colorB);

// 4. Default pair always picks two distinct teams
const [pickedA, pickedB] = pickDefaultComparisonPair([teamA, teamB], 'team-a', 'team-a');
assert.ok(pickedA && pickedB);
assert.notEqual(pickedA.id, pickedB.id);

console.log('teamCompareMetrics tests passed:', {
  baselineForm: baselineProfile.axes.form.score,
  hotForm: hotProfile.axes.form.score,
  coldForm: coldProfile.axes.form.score,
  darkColors: [darkColors.colorA, darkColors.colorB],
});
