import React, { useEffect, useState, useMemo } from 'react';
import { teamsService, matchesService } from '../supabase';
import { Team, Match, LeagueType, LEAGUES } from '../types';
import { Trophy, TrendingUp, TrendingDown, Minus, Medal, Search, ChevronDown } from 'lucide-react';

interface TeamStanding {
  teamId: string;
  teamName: string;
  logo?: string;
  mp: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
}

function computeStandings(leagueTeams: Team[], matches: Match[]): TeamStanding[] {
  const map = new Map<string, TeamStanding>();

  for (const team of leagueTeams) {
    map.set(team.id, { teamId: team.id, teamName: team.name, logo: team.logo, mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 });
  }

  for (const match of matches) {
    if (match.status !== 'completed' || !match.result) continue;

    const home = map.get(match.homeTeamId);
    const away = map.get(match.awayTeamId);
    if (!home && !away) continue;

    const hs = match.result.homeScore;
    const as = match.result.awayScore;

    if (home) {
      home.mp++;
      home.gf += hs; home.ga += as;
      if (hs > as) { home.w++; home.pts += 3; }
      else if (hs < as) { home.l++; }
      else { home.d++; home.pts += 1; }
    }
    if (away) {
      away.mp++;
      away.gf += as; away.ga += hs;
      if (as > hs) { away.w++; away.pts += 3; }
      else if (as < hs) { away.l++; }
      else { away.d++; away.pts += 1; }
    }
  }

  const sorted = Array.from(map.values());
  sorted.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    const gdA = a.gf - a.ga;
    const gdB = b.gf - b.ga;
    if (gdB !== gdA) return gdB - gdA;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.teamName.localeCompare(b.teamName);
  });

  return sorted;
}

const medalColors = ['text-yellow-500', 'text-gray-400', 'text-amber-600'];

export const ScoreboardPage: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<LeagueType | ''>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showLeagueDropdown, setShowLeagueDropdown] = useState(false);
  const [leagueSearch, setLeagueSearch] = useState('');

  useEffect(() => {
    const unsubTeams = teamsService.subscribe(setTeams);
    const unsubMatches = matchesService.subscribe(setAllMatches);
    return () => {
      unsubTeams();
      unsubMatches();
    };
  }, []);

  // Find all leagues from teams' divisions (plus any from completed matches)
  const availableLeagues = useMemo(() => {
    const leagues = new Set<LeagueType>();
    for (const t of teams) {
      for (const d of t.divisions) {
        leagues.add(d);
      }
    }
    for (const m of allMatches) {
      if (m.status === 'completed') {
        if (m.homeDivision) leagues.add(m.homeDivision);
        if (m.awayDivision) leagues.add(m.awayDivision);
      }
    }
    return LEAGUES.filter(l => leagues.has(l.value));
  }, [teams, allMatches]);

  const filteredLeagues = useMemo(() => {
    if (!leagueSearch) return availableLeagues;
    const term = leagueSearch.toLowerCase();
    return availableLeagues.filter(l => l.label.toLowerCase().includes(term));
  }, [availableLeagues, leagueSearch]);

  // Auto-select first league
  useEffect(() => {
    if (!selectedLeague && availableLeagues.length > 0) {
      setSelectedLeague(availableLeagues[0].value);
      setShowLeagueDropdown(false);
    }
  }, [availableLeagues, selectedLeague]);

  const leagueTeams = useMemo(() => {
    if (!selectedLeague) return [];
    return teams.filter(t => t.divisions.includes(selectedLeague));
  }, [teams, selectedLeague]);

  const filteredMatches = useMemo(() => {
    if (!selectedLeague) return [];
    return allMatches.filter(m =>
      m.status === 'completed' &&
      (m.homeDivision === selectedLeague || m.awayDivision === selectedLeague)
    );
  }, [allMatches, selectedLeague]);

  const standings = useMemo(() => {
    return computeStandings(leagueTeams, filteredMatches);
  }, [leagueTeams, filteredMatches]);

  const searchedStandings = useMemo(() => {
    if (!searchTerm) return standings;
    const term = searchTerm.toLowerCase();
    return standings.filter(s => s.teamName.toLowerCase().includes(term));
  }, [standings, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-gray-100 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            Scoreboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            League standings computed from completed match results
          </p>
        </div>
      </div>

      {/* League dropdown with search */}
      <div className="relative max-w-xs">
        <button
          type="button"
          onClick={() => setShowLeagueDropdown(!showLeagueDropdown)}
          className="w-full flex items-center justify-between pl-4 pr-10 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-gray-100 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300 cursor-pointer relative"
        >
          <span>{selectedLeague ? LEAGUES.find(l => l.value === selectedLeague)?.label : 'Select a league...'}</span>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </button>

        {showLeagueDropdown && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowLeagueDropdown(false)} />
            <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg overflow-hidden">
              <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                <input
                  type="text"
                  placeholder="Search leagues..."
                  value={leagueSearch}
                  onChange={(e) => setLeagueSearch(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                />
              </div>
              <div className="max-h-60 overflow-y-auto">
                {filteredLeagues.length > 0 ? (
                  filteredLeagues.map((league) => (
                    <button
                      key={league.value}
                      onClick={() => {
                        setSelectedLeague(league.value);
                        setShowLeagueDropdown(false);
                        setLeagueSearch('');
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        selectedLeague === league.value
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 font-medium'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {league.label}
                    </button>
                  ))
                ) : (
                  <p className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500">No leagues match your search.</p>
                )}
              </div>
            </div>
          </>
        )}

        {availableLeagues.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500 italic mt-2">
            No teams or matches yet — create teams with league assignments to see the scoreboard.
          </p>
        )}
      </div>

      {selectedLeague && (
        <>
          {/* Search */}
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search team..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Standings table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Team</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">MP</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">W</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">D</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">L</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">GF</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">GA</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">GD</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {searchedStandings.map((team, idx) => (
                    <tr
                      key={team.teamId}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                        idx < 3 ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''
                      }`}
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-center w-7 h-7">
                          {idx < 3 ? (
                            <Medal className={`w-5 h-5 ${medalColors[idx]}`} />
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400 font-medium">{idx + 1}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          {team.logo ? (
                            <img src={team.logo} alt="" className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                              <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                {team.teamName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {team.teamName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center font-medium text-gray-700 dark:text-gray-300">{team.mp}</td>
                      <td className="px-4 py-3.5 text-center font-medium text-emerald-600 dark:text-emerald-400">{team.w}</td>
                      <td className="px-4 py-3.5 text-center font-medium text-amber-500">{team.d}</td>
                      <td className="px-4 py-3.5 text-center font-medium text-red-500">{team.l}</td>
                      <td className="px-4 py-3.5 text-center text-gray-700 dark:text-gray-300">{team.gf}</td>
                      <td className="px-4 py-3.5 text-center text-gray-700 dark:text-gray-300">{team.ga}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`inline-flex items-center gap-0.5 font-medium ${
                          team.gd > 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : team.gd < 0
                            ? 'text-red-500'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {team.gd > 0 ? '+' : ''}{team.gd}
                          {team.gd > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : team.gd < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-bold text-base">
                          {team.pts}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {searchedStandings.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">
                        {searchTerm ? 'No teams match your search.' : 'No standings data for this league yet.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary bar */}
          {searchedStandings.length > 0 && (
            <div className="flex items-center gap-6 text-xs text-gray-400 dark:text-gray-500 px-1">
              <span>MP = Matches Played</span>
              <span>W = Wins</span>
              <span>D = Draws</span>
              <span>L = Losses</span>
              <span>GF = Goals For</span>
              <span>GA = Goals Against</span>
              <span>GD = Goal Difference</span>
              <span className="font-semibold text-gray-600 dark:text-gray-300">Pts = Points</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};
