import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, Button, Input, Modal, Select, Badge } from '../components/ui';
import { matchesService, teamsService, usersService, notificationsService, playersService } from '../supabase';
import { Match, Team, User, RefereeAssignment, LeagueType, GoalEvent, CardEvent, Player } from '../types';
import { Plus, Check, X, MapPin, Calendar as CalendarIcon, UserCircle, Trash2, Edit2, Users } from 'lucide-react';

export const MatchesPage: React.FC = () => {
  const { userData } = useAuth();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [referees, setReferees] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'completed'>('all');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [reportMatch, setReportMatch] = useState<Match | null>(null);
  const [reportForm, setReportForm] = useState({
    homeScore: 0,
    awayScore: 0,
    goals: [] as GoalEvent[],
    yellowCards: [] as CardEvent[],
    redCards: [] as CardEvent[],
    description: '',
  });
  const [formData, setFormData] = useState({
    homeTeamId: '',
    awayTeamId: '',
    homeDivision: '' as LeagueType | '',
    awayDivision: '' as LeagueType | '',
    dateTime: '',
    location: '',
    category: ''
  });
  const [lineupMatch, setLineupMatch] = useState<Match | null>(null);
  const [lineupTeamPlayers, setLineupTeamPlayers] = useState<Player[]>([]);
  const [lineupStarting, setLineupStarting] = useState<string[]>([]);
  const [lineupSubstitutes, setLineupSubstitutes] = useState<string[]>([]);
  const [playerNames, setPlayerNames] = useState<Record<string, string>>({});
  const [viewingLineup, setViewingLineup] = useState(false);

  useEffect(() => {
    const unsubMatches = matchesService.subscribe(setMatches);
    const unsubTeams = teamsService.subscribe(setTeams);
    const unsubReferees = usersService.subscribeByRole('referee', setReferees);
    return () => {
      unsubMatches();
      unsubTeams();
      unsubReferees();
    };
  }, []);

  useEffect(() => {
    if (highlightId) {
      setFilter('all');
      setTimeout(() => {
        document.getElementById(`match-${highlightId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [matches, highlightId]);

  const canManage = userData?.role === 'admin';
  const coachTeamIds = userData?.role === 'coach'
    ? teams.filter(t => t.coachId === userData.id).map(t => t.id)
    : [];

  const filteredMatches = matches
    .filter(m => {
      if (filter !== 'all' && m.status !== filter) return false;
      if (userData?.role === 'coach') {
        return coachTeamIds.includes(m.homeTeamId) || coachTeamIds.includes(m.awayTeamId);
      }
      if (userData?.role === 'referee') {
        return m.referees?.some(r => r.refereeId === userData.id);
      }
      return true;
    })
    .sort((a, b) => {
      if (a.status === 'scheduled' && b.status !== 'scheduled') return -1;
      if (a.status !== 'scheduled' && b.status === 'scheduled') return 1;
      return new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime();
    });

  const selectedHomeTeam = teams.find(t => t.id === formData.homeTeamId);
  const selectedAwayTeam = teams.find(t => t.id === formData.awayTeamId);

  const notifyCoaches = async (homeTeamId: string, awayTeamId: string, matchId: string, homeTeamName: string, awayTeamName: string, title = 'New Match Scheduled', message?: string) => {
    const homeTeam = teams.find(t => t.id === homeTeamId);
    const awayTeam = teams.find(t => t.id === awayTeamId);
    const coachIds = new Set<string>();
    if (homeTeam?.coachId) coachIds.add(homeTeam.coachId);
    if (awayTeam?.coachId) coachIds.add(awayTeam.coachId);
    homeTeam?.assistantCoaches?.forEach(c => coachIds.add(c));
    awayTeam?.assistantCoaches?.forEach(c => coachIds.add(c));
    const msg = message || `Your team has a new match: ${homeTeamName} vs ${awayTeamName}`;
    await Promise.all(Array.from(coachIds).map(userId =>
      notificationsService.create({
        userId,
        matchId,
        title,
        message: msg,
        read: false,
        createdAt: new Date()
      }).catch(() => {})
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.homeDivision || !formData.awayDivision) {
      alert('Please select both home and away divisions');
      return;
    }
    try {
      const newMatchId = await matchesService.create({
        homeTeamId: formData.homeTeamId,
        awayTeamId: formData.awayTeamId,
        homeTeamName: selectedHomeTeam?.name || '',
        awayTeamName: selectedAwayTeam?.name || '',
        homeDivision: formData.homeDivision,
        awayDivision: formData.awayDivision,
        dateTime: new Date(formData.dateTime),
        location: formData.location,
        category: formData.category,
        referees: [],
        status: 'scheduled',
        createdAt: new Date()
      });
      await notifyCoaches(formData.homeTeamId, formData.awayTeamId, newMatchId, selectedHomeTeam?.name || '', selectedAwayTeam?.name || '');
    } catch (err) {
      alert('Failed to create match: ' + (err instanceof Error ? err.message : 'Unknown error'));
      return;
    }
    setIsModalOpen(false);
    setFormData({ homeTeamId: '', awayTeamId: '', homeDivision: '', awayDivision: '', dateTime: '', location: '', category: '' });
  };

  const assignReferee = async (matchId: string, refereeId: string, role: 'chief' | 'assistant1' | 'assistant2') => {
    const referee = referees.find(r => r.id === refereeId);
    if (!referee) return;

    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    const newAssignment: RefereeAssignment = {
      refereeId,
      refereeName: referee.name,
      role,
      status: 'pending'
    };

    const updatedReferees = [...(match.referees || []), newAssignment];
    try {
      await matchesService.update(matchId, { referees: updatedReferees });
    } catch (err) {
      alert('Failed to assign referee: ' + (err instanceof Error ? err.message : JSON.stringify(err)));
      return;
    }
    try {
      await notificationsService.create({
        userId: refereeId,
        matchId,
        title: 'New Match Assignment',
        message: `You have been assigned as ${role} for ${match.homeTeamName} vs ${match.awayTeamName}`,
        read: false,
        createdAt: new Date()
      });
    } catch (err) {
      console.error('Failed to send notification:', err);
    }
    await notifyCoaches(match.homeTeamId, match.awayTeamId, match.id, match.homeTeamName, match.awayTeamName, 'Match Update', `A referee has been assigned to ${match.homeTeamName} vs ${match.awayTeamName}`);
  };

  const removeReferee = async (matchId: string, refereeId: string) => {
    if (!confirm('Remove this referee from the match?')) return;
    
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    const updatedReferees = match.referees.filter(r => r.refereeId !== refereeId);
    try {
      await matchesService.update(matchId, { referees: updatedReferees });
      const removed = match.referees.find(r => r.refereeId === refereeId);
      if (removed) {
        await notificationsService.create({
          userId: refereeId,
          matchId,
          title: 'Removed from Match',
          message: `You have been removed from ${match.homeTeamName} vs ${match.awayTeamName}.`,
          read: false,
          createdAt: new Date(),
        }).catch(() => {});
      }
    } catch (err) {
      alert('Failed to remove referee: ' + (err instanceof Error ? err.message : JSON.stringify(err)));
    }
  };

  const changeRefereeRole = async (matchId: string, refereeId: string, newRole: 'chief' | 'assistant1' | 'assistant2') => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    const updatedReferees = match.referees.map(r => 
      r.refereeId === refereeId ? { ...r, role: newRole } : r
    );
    try {
      await matchesService.update(matchId, { referees: updatedReferees });
      await notificationsService.create({
        userId: refereeId,
        matchId,
        title: 'Role Changed',
        message: `Your role for ${match.homeTeamName} vs ${match.awayTeamName} has been changed to ${newRole}.`,
        read: false,
        createdAt: new Date(),
      }).catch(() => {});
    } catch (err) {
      alert('Failed to change referee role: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const respondToMatch = async (matchId: string, status: 'accepted' | 'declined') => {
    try {
      await matchesService.updateRefereeStatus(matchId, userData!.id, status);
      const match = matches.find(m => m.id === matchId);
      if (match) {
        const me = referees.find(r => r.id === userData!.id);
        const label = status === 'accepted' ? 'accepted' : 'declined';
        await notifyCoaches(
          match.homeTeamId, match.awayTeamId, match.id,
          match.homeTeamName, match.awayTeamName,
          'Referee Response',
          `${me?.name || 'A referee'} has ${label} the assignment for ${match.homeTeamName} vs ${match.awayTeamName}.`
        );
        notificationsService.getByUser(userData!.id).then(all => {
          const n = all.find(n => n.matchId === matchId && !n.read);
          if (n) notificationsService.markAsRead(n.id);
        }).catch(() => {});
      }
    } catch (err) {
      alert('Failed to respond: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const availableReferees = (match: Match) => {
    return referees.filter(r => !match.referees?.some(mr => mr.refereeId === r.id));
  };

  const openReport = (match: Match) => {
    const goals = match.result?.goals ?? [];
    setReportForm({
      homeScore: goals.filter(g => g.team === 'home').length,
      awayScore: goals.filter(g => g.team === 'away').length,
      goals,
      yellowCards: match.result?.yellowCards ?? [],
      redCards: match.result?.redCards ?? [],
      description: match.result?.description ?? '',
    });
    setReportMatch(match);
  };

  const addGoal = () => {
    setReportForm(f => {
      const homeCount = f.goals.filter(g => g.team === 'home').length;
      const awayCount = f.goals.filter(g => g.team === 'away').length;
      const team = homeCount <= awayCount ? 'home' : 'away';
      const newGoals = [...f.goals, { team, minute: 0, scorer: 0 }];
      return {
        ...f,
        goals: newGoals,
        homeScore: team === 'home' ? homeCount + 1 : homeCount,
        awayScore: team === 'away' ? awayCount + 1 : awayCount,
      };
    });
  };

  const updateGoal = (i: number, field: keyof GoalEvent, value: string | number) => {
    setReportForm(f => {
      const goals = [...f.goals];
      (goals[i] as any)[field] = value;
      return {
        ...f,
        goals,
        homeScore: goals.filter(g => g.team === 'home').length,
        awayScore: goals.filter(g => g.team === 'away').length,
      };
    });
  };

  const removeGoal = (i: number) => {
    setReportForm(f => {
      const goals = f.goals.filter((_, idx) => idx !== i);
      return {
        ...f,
        goals,
        homeScore: goals.filter(g => g.team === 'home').length,
        awayScore: goals.filter(g => g.team === 'away').length,
      };
    });
  };

  const addCard = (type: 'yellow' | 'red') => {
    const key = type === 'yellow' ? 'yellowCards' : 'redCards';
    setReportForm(f => ({ ...f, [key]: [...f[key], { team: 'home', minute: 0, player: '' }] }));
  };

  const updateCard = (type: 'yellow' | 'red', i: number, field: keyof CardEvent, value: string | number) => {
    const key = type === 'yellow' ? 'yellowCards' : 'redCards';
    setReportForm(f => {
      const cards = [...f[key]];
      (cards[i] as any)[field] = value;
      return { ...f, [key]: cards };
    });
  };

  const removeCard = (type: 'yellow' | 'red', i: number) => {
    const key = type === 'yellow' ? 'yellowCards' : 'redCards';
    setReportForm(f => ({ ...f, [key]: f[key].filter((_, idx) => idx !== i) }));
  };

  const submitReport = async () => {
    if (!reportMatch) return;
    try {
      await matchesService.update(reportMatch.id, {
        result: {
          homeScore: reportForm.homeScore,
          awayScore: reportForm.awayScore,
          goals: reportForm.goals,
          yellowCards: reportForm.yellowCards,
          redCards: reportForm.redCards,
          description: reportForm.description || undefined,
        },
      });
      await notifyCoaches(reportMatch.homeTeamId, reportMatch.awayTeamId, reportMatch.id, reportMatch.homeTeamName, reportMatch.awayTeamName);
      setReportMatch(null);
    } catch (err) {
      alert('Failed to save report: ' + (err instanceof Error ? err.message : JSON.stringify(err)));
    }
  };

  const markCompleted = async (match: Match) => {
    try {
      await matchesService.update(match.id, { status: 'completed' });
      await notifyCoaches(match.homeTeamId, match.awayTeamId, match.id, match.homeTeamName, match.awayTeamName, 'Match Completed', `${match.homeTeamName} vs ${match.awayTeamName} has been marked as completed`);
    } catch (err) {
      alert('Failed to mark match as completed: ' + (err instanceof Error ? err.message : JSON.stringify(err)));
    }
  };

  const getMaxAgeForDivision = (division: string): number | null => {
    const matchNum = division.match(/U(\d+)/);
    if (matchNum) return parseInt(matchNum[1]);
    if (division.includes('Professional')) return null;
    return null;
  };

  const getMinAgeForDivision = (division: string): number | null => {
    if (division.includes('Professional')) return 18;
    return null;
  };

  const filterPlayersByDivision = (players: Player[], division: string): Player[] => {
    const maxAge = getMaxAgeForDivision(division);
    const minAge = getMinAgeForDivision(division);
    const now = new Date();
    return players.filter(p => {
      const age = now.getFullYear() - new Date(p.birthDate).getFullYear();
      if (maxAge !== null && age > maxAge) return false;
      if (minAge !== null && age < minAge) return false;
      return true;
    });
  };

  const openLineup = async (match: Match) => {
    setLineupMatch(match);
    const myTeamId = coachTeamIds.find(id => id === match.homeTeamId || id === match.awayTeamId);
    if (!myTeamId) return;
    const players = await playersService.getByTeam(myTeamId);
    const division = myTeamId === match.homeTeamId ? match.homeDivision : match.awayDivision;
    setLineupTeamPlayers(filterPlayersByDivision(players, division));
    const existing = match.lineup?.find(l => l.submittedBy === userData?.id);
    setLineupStarting(existing?.starting || []);
    setLineupSubstitutes(existing?.substitutes || []);
  };

  const submitLineup = async () => {
    if (!lineupMatch || !userData) return;
    try {
      await matchesService.submitLineup(lineupMatch.id, lineupStarting, lineupSubstitutes, userData.id);
      setLineupMatch(null);
      setLineupStarting([]);
      setLineupSubstitutes([]);
      setLineupTeamPlayers([]);
    } catch (err) {
      alert('Failed to submit lineup: ' + (err instanceof Error ? err.message : JSON.stringify(err)));
    }
  };

  const toggleStarting = (playerId: string) => {
    setLineupStarting(prev =>
      prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]
    );
    setLineupSubstitutes(prev => prev.filter(id => id !== playerId));
  };

  const toggleSubstitute = (playerId: string) => {
    setLineupSubstitutes(prev =>
      prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]
    );
    setLineupStarting(prev => prev.filter(id => id !== playerId));
  };

  const openLineupView = async (match: Match) => {
    setViewingLineup(true);
    setLineupMatch(match);
    const teamIds = [match.homeTeamId, match.awayTeamId].filter(Boolean);
    const results = await Promise.all(teamIds.map(id => playersService.getByTeam(id)));
    const map: Record<string, string> = {};
    for (const list of results) {
      for (const p of list) map[p.id] = p.name;
    }
    setPlayerNames(prev => ({ ...prev, ...map }));
  };

  useEffect(() => {
    const teamIds = new Set<string>();
    for (const m of matches) {
      if (m.lineup?.length) {
        if (m.homeTeamId) teamIds.add(m.homeTeamId);
        if (m.awayTeamId) teamIds.add(m.awayTeamId);
      }
    }
    if (teamIds.size === 0) return;
    Promise.all([...teamIds].map(id => playersService.getByTeam(id))).then(results => {
      const map: Record<string, string> = {};
      for (const list of results) {
        for (const p of list) map[p.id] = p.name;
      }
      setPlayerNames(map);
    });
  }, [matches]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Matches</h1>
        {canManage && (
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Match
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        {(['all', 'scheduled', 'completed'] as const).map(f => (
          <Button
            key={f}
            variant={filter === f ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      <div className="grid gap-4">
        {filteredMatches.map(match => {
          const myAssignment = match.referees?.find(r => r.refereeId === userData?.id);
          const canRespond = userData?.role === 'referee' && myAssignment?.status === 'pending';

          return (
            <div key={match.id} id={`match-${match.id}`}>
            <Card className={`space-y-3 ${match.id === highlightId ? 'ring-2 ring-blue-500' : ''}`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold">
                    {match.homeTeamName} vs {match.awayTeamName}
                  </h3>
                  <div className="flex items-center gap-4 text-gray-500 dark:text-gray-400 text-sm mt-1">
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="w-4 h-4" />
                      {new Date(match.dateTime).toLocaleDateString()} {new Date(match.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {match.location}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="info">{match.homeDivision}</Badge>
                    <Badge variant="info">{match.awayDivision}</Badge>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={match.status === 'scheduled' ? 'info' : match.status === 'completed' ? 'success' : 'danger'}>
                    {match.status}
                  </Badge>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{match.category}</p>
                  {(canManage || (userData?.role === 'referee' && match.referees?.some(r => r.refereeId === userData.id))) && match.status === 'scheduled' && (
                    <button
                      onClick={() => markCompleted(match)}
                      className="text-xs text-blue-600 hover:underline mt-2 block"
                    >
                      Mark as Completed
                    </button>
                  )}
                  {(canManage || (userData?.role === 'referee' && match.referees?.some(r => r.refereeId === userData.id))) && match.status === 'completed' && (
                    <button
                      onClick={() => openReport(match)}
                      className="text-xs text-blue-600 hover:underline mt-2 block"
                    >
                      {match.result ? 'Edit Report' : 'Submit Report'}
                    </button>
                  )}
                  {userData?.role === 'referee' && match.lineup && match.lineup.length > 0 && (
                    <button
                      onClick={() => openLineupView(match)}
                      className="text-xs text-blue-600 hover:underline mt-2 block"
                    >
                      View Lineup
                    </button>
                  )}
                </div>
              </div>

              {match.result && (
                <div>
                  <div
                    className={`bg-gray-100 dark:bg-gray-700 p-3 rounded-lg ${match.result.goals.length > 0 || match.result.yellowCards.length > 0 || match.result.redCards.length > 0 || match.result.description ? 'cursor-pointer' : ''}`}
                    onClick={() => {
                      if (match.result && (match.result.goals.length > 0 || match.result.yellowCards.length > 0 || match.result.redCards.length > 0 || match.result.description)) {
                        setExpandedReport(expandedReport === match.id ? null : match.id);
                      }
                    }}
                  >
                    <div className="text-center">
                      <span className="text-2xl font-bold dark:text-gray-100">
                        {match.result.homeScore} - {match.result.awayScore}
                      </span>
                      {(match.result.goals.length > 0 || match.result.yellowCards.length > 0 || match.result.redCards.length > 0 || match.result.description) && (
                        <span className="text-xs text-gray-400 ml-2">
                          {expandedReport === match.id ? '▲' : '▼'}
                        </span>
                      )}
                    </div>
                  </div>

                  {expandedReport === match.id && (
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg mt-1 space-y-2">

                  {match.result.goals.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Goals</p>
                      <div className="space-y-0.5">
                        {match.result.goals.map((g, i) => (
                          <p key={i} className="text-sm dark:text-gray-200">
                            <span className="font-medium">
                              {g.team === 'home' ? match.homeTeamName : match.awayTeamName}
                            </span>{' '}
                            {g.scorer} ({g.minute}&apos;)
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {match.result.yellowCards.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                        Yellow Cards <span className="text-yellow-500">&#9632;</span>
                      </p>
                      <div className="space-y-0.5">
                        {match.result.yellowCards.map((c, i) => (
                          <p key={i} className="text-sm dark:text-gray-200">
                            <span className="font-medium">
                              {c.team === 'home' ? match.homeTeamName : match.awayTeamName}
                            </span>{' '}
                            {c.player} ({c.minute}&apos;)
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {match.result.redCards.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                        Red Cards <span className="text-red-500">&#9632;</span>
                      </p>
                      <div className="space-y-0.5">
                        {match.result.redCards.map((c, i) => (
                          <p key={i} className="text-sm dark:text-gray-200">
                            <span className="font-medium">
                              {c.team === 'home' ? match.homeTeamName : match.awayTeamName}
                            </span>{' '}
                            {c.player} ({c.minute}&apos;)
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {match.result.description && (
                    <div className="pt-2 border-t dark:border-gray-600">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Notes</p>
                      <p className="text-sm dark:text-gray-200 whitespace-pre-wrap">{match.result.description}</p>
                    </div>
                  )}

                    </div>
                  )}
                </div>
              )}

              <div>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Referees:</p>
                  {canManage && match.status === 'scheduled' && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setSelectedMatch(selectedMatch?.id === match.id ? null : match)}
                    >
                      <Edit2 className="w-3 h-3 mr-1" />
                      {selectedMatch?.id === match.id ? 'Done' : 'Manage'}
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {match.referees?.length > 0 ? (
                    match.referees.map((r) => (
                      <div key={r.refereeId} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 px-3 py-1 rounded-full">
                        <span className="dark:text-gray-100">{r.refereeName}</span>
                        <Badge variant={
                          r.role === 'chief' ? 'info' : 
                          r.role === 'assistant1' ? 'warning' : 'success'
                        }>
                          {r.role === 'chief' ? 'Main' : `Asst ${r.role.slice(-1)}`}
                        </Badge>
                        {r.status !== 'pending' && (
                          <Badge variant={r.status === 'accepted' ? 'success' : 'danger'}>
                            {r.status}
                          </Badge>
                        )}
                        {canManage && match.status === 'scheduled' && selectedMatch?.id === match.id && (
                          <div className="flex items-center gap-1 ml-2 border-l dark:border-gray-600 pl-2">
                            <select
                              value={r.role}
                              onChange={(e) => changeRefereeRole(match.id, r.refereeId, e.target.value as any)}
                              className="text-xs border rounded px-1 py-0.5 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                            >
                              <option value="chief">Chief</option>
                              <option value="assistant1">Asst 1</option>
                              <option value="assistant2">Asst 2</option>
                            </select>
                            <button
                              onClick={() => removeReferee(match.id, r.refereeId)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500 text-sm">No referees assigned</span>
                  )}
                </div>
              </div>

              {match.lineup && match.lineup.length > 0 && (
                <div className="border-t dark:border-gray-600 pt-3 mt-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Team Lineups</p>
                    {userData?.role === 'coach' && match.status === 'scheduled' && coachTeamIds.some(id => id === match.homeTeamId || id === match.awayTeamId) && (
                      <Button size="sm" variant="outline" onClick={() => openLineup(match)}>
                        <Users className="w-3 h-3 mr-1" />
                        {match.lineup?.some(l => l.submittedBy === userData?.id) ? 'Edit Lineup' : 'Submit Lineup'}
                      </Button>
                    )}
                  </div>
                  {match.lineup.map((l, i) => {
                    const homeCoach = teams.find(t => t.id === match.homeTeamId)?.coachId;
                    const teamName = l.submittedBy === homeCoach ? match.homeTeamName : match.awayTeamName;
                    const isMine = l.submittedBy === userData?.id;
                    if (!isMine && userData?.role === 'coach') return null;
                    const starting = l.starting || [];
                    const substitutes = l.substitutes || [];
                    return (
                      <div key={i} className="text-sm space-y-1 mb-3">
                        <p className="font-medium dark:text-gray-200">{teamName}{isMine ? ' (Your team)' : ''}</p>
                        <div className="ml-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Starting XI:</p>
                          {starting.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {starting.map(pid => (
                                <span key={pid} className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 px-2 py-0.5 rounded text-xs">
                                  {playerNames[pid] || pid.slice(0, 8)}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 italic">None selected</p>
                          )}
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Substitutes:</p>
                          {substitutes.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {substitutes.map(pid => (
                                <span key={pid} className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-2 py-0.5 rounded text-xs">
                                  {playerNames[pid] || pid.slice(0, 8)}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 italic">None</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {userData?.role === 'coach' && match.status === 'scheduled' && coachTeamIds.some(id => id === match.homeTeamId || id === match.awayTeamId) && !match.lineup?.some(l => l.submittedBy === userData?.id) && (
                <div className="border-t dark:border-gray-600 pt-3 mt-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Team Lineup</p>
                    <Button size="sm" variant="outline" onClick={() => openLineup(match)}>
                      <Users className="w-3 h-3 mr-1" />
                      Submit Lineup
                    </Button>
                  </div>
                </div>
              )}

              {canRespond && (
                <div className="flex gap-2 pt-2 border-t dark:border-gray-600">
                  <Button size="sm" onClick={() => respondToMatch(match.id, 'accepted')}>
                    <Check className="w-4 h-4 mr-1" /> Accept
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => respondToMatch(match.id, 'declined')}>
                    <X className="w-4 h-4 mr-1" /> Decline
                  </Button>
                </div>
              )}

              {canManage && match.status === 'scheduled' && selectedMatch?.id === match.id && (
                <div className="border-t dark:border-gray-600 pt-3 mt-3 bg-gray-50 dark:bg-gray-700 -mx-6 px-6 py-4 rounded-b-xl">
                  <p className="text-sm font-medium mb-2 dark:text-gray-100">Add Referee:</p>
                  {availableReferees(match).length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {availableReferees(match).map(ref => (
                        <div key={ref.id} className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg border dark:border-gray-600">
                          <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center overflow-hidden">
                            {ref.photo ? (
                              <img src={ref.photo} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <UserCircle className="w-5 h-5 text-purple-400" />
                            )}
                          </div>
                          <span className="text-sm font-medium dark:text-gray-100">{ref.name}</span>
                          <div className="flex gap-1">
                            {!match.referees?.some(mr => mr.role === 'chief') && (
                              <Button size="sm" variant="outline" onClick={() => assignReferee(match.id, ref.id, 'chief')}>
                                Chief
                              </Button>
                            )}
                            {!match.referees?.some(mr => mr.role === 'assistant1') && (
                              <Button size="sm" variant="outline" onClick={() => assignReferee(match.id, ref.id, 'assistant1')}>
                                Asst 1
                              </Button>
                            )}
                            {!match.referees?.some(mr => mr.role === 'assistant2') && (
                              <Button size="sm" variant="outline" onClick={() => assignReferee(match.id, ref.id, 'assistant2')}>
                                Asst 2
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">All referees are assigned to this match</p>
                  )}
                </div>
              )}
            </Card>
            </div>
          );
        })}
        {filteredMatches.length === 0 && (
          <Card><p className="text-center text-gray-500 dark:text-gray-400 py-8">No matches found</p></Card>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Match">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Home Team"
            value={formData.homeTeamId}
            onChange={(e) => setFormData({ ...formData, homeTeamId: e.target.value, homeDivision: '' })}
            options={[
              { value: '', label: 'Select home team' },
              ...teams.map(t => ({ value: t.id, label: t.name }))
            ]}
          />
          {selectedHomeTeam && (
            <div>
              <label className="font-medium text-sm dark:text-gray-200">Home Division</label>
              <select
                value={formData.homeDivision}
                onChange={(e) => setFormData({ ...formData, homeDivision: e.target.value as LeagueType })}
                className="w-full border rounded-lg px-3 py-2 mt-1 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                required
              >
                <option value="">Select division</option>
                {selectedHomeTeam.divisions.map(div => (
                  <option key={div} value={div}>{div}</option>
                ))}
              </select>
            </div>
          )}
          <Select
            label="Away Team"
            value={formData.awayTeamId}
            onChange={(e) => setFormData({ ...formData, awayTeamId: e.target.value, awayDivision: '' })}
            options={[
              { value: '', label: 'Select away team' },
              ...teams.filter(t => t.id !== formData.homeTeamId).map(t => ({ value: t.id, label: t.name }))
            ]}
          />
          {selectedAwayTeam && (
            <div>
              <label className="font-medium text-sm">Away Division</label>
              <select
                value={formData.awayDivision}
                onChange={(e) => setFormData({ ...formData, awayDivision: e.target.value as LeagueType })}
                className="w-full border rounded-lg px-3 py-2 mt-1 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                required
              >
                <option value="">Select division</option>
                {selectedAwayTeam.divisions.map(div => (
                  <option key={div} value={div}>{div}</option>
                ))}
              </select>
            </div>
          )}
          <Input
            label="Date & Time"
            type="datetime-local"
            value={formData.dateTime}
            onChange={(e) => setFormData({ ...formData, dateTime: e.target.value })}
            required
          />
          <Input
            label="Location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            required
          />
          <Input
            label="Category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            placeholder="e.g., League Match, Cup, Friendly"
            required
          />
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">Create</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!reportMatch} onClose={() => setReportMatch(null)} title="Match Report">
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="font-medium text-sm dark:text-gray-200">{reportMatch?.homeTeamName} Score</label>
              <input
                type="number" min="0" readOnly
                value={reportForm.homeScore}
                className="w-full border rounded-lg px-3 py-2 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"
              />
            </div>
            <div className="flex-1">
              <label className="font-medium text-sm dark:text-gray-200">{reportMatch?.awayTeamName} Score</label>
              <input
                type="number" min="0" readOnly
                value={reportForm.awayScore}
                className="w-full border rounded-lg px-3 py-2 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-medium text-sm dark:text-gray-200">Goals</label>
              <button onClick={addGoal} className="text-xs text-blue-600 hover:underline">+ Add Goal</button>
            </div>
            <div className="space-y-2">
              {reportForm.goals.map((g, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select
                    value={g.team}
                    onChange={e => updateGoal(i, 'team', e.target.value)}
                    className="border rounded px-2 py-1 text-sm dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                  >
                    <option value="home">{reportMatch?.homeTeamName}</option>
                    <option value="away">{reportMatch?.awayTeamName}</option>
                  </select>
                  <input
                    type="number" min="0" placeholder="Jersey #"
                    value={g.scorer || ''}
                    onChange={e => updateGoal(i, 'scorer', parseInt(e.target.value) || 0)}
                    onFocus={e => e.target.select()}
                    className="flex-1 border rounded px-2 py-1 text-sm dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                  />
                  <input
                    type="number" min="0" placeholder="Minute"
                    value={g.minute || ''}
                    onChange={e => updateGoal(i, 'minute', parseInt(e.target.value) || 0)}
                    onFocus={e => e.target.select()}
                    className="w-16 border rounded px-2 py-1 text-sm dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                  />
                  <button onClick={() => removeGoal(i)} className="text-red-500 text-sm">&times;</button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-medium text-sm dark:text-gray-200">Yellow Cards</label>
              <button onClick={() => addCard('yellow')} className="text-xs text-blue-600 hover:underline">+ Add Yellow Card</button>
            </div>
            <div className="space-y-2">
              {reportForm.yellowCards.map((c, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select
                    value={c.team}
                    onChange={e => updateCard('yellow', i, 'team', e.target.value)}
                    className="border rounded px-2 py-1 text-sm dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                  >
                    <option value="home">{reportMatch?.homeTeamName}</option>
                    <option value="away">{reportMatch?.awayTeamName}</option>
                  </select>
                  <input
                    type="text" placeholder="Player"
                    value={c.player}
                    onChange={e => updateCard('yellow', i, 'player', e.target.value)}
                    className="flex-1 border rounded px-2 py-1 text-sm dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                  />
                  <input
                    type="number" min="0" placeholder="Minute"
                    value={c.minute || ''}
                    onChange={e => updateCard('yellow', i, 'minute', parseInt(e.target.value) || 0)}
                    onFocus={e => e.target.select()}
                    className="w-16 border rounded px-2 py-1 text-sm dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                  />
                  <button onClick={() => removeCard('yellow', i)} className="text-red-500 text-sm">&times;</button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-medium text-sm dark:text-gray-200">Red Cards</label>
              <button onClick={() => addCard('red')} className="text-xs text-blue-600 hover:underline">+ Add Red Card</button>
            </div>
            <div className="space-y-2">
              {reportForm.redCards.map((c, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select
                    value={c.team}
                    onChange={e => updateCard('red', i, 'team', e.target.value)}
                    className="border rounded px-2 py-1 text-sm dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                  >
                    <option value="home">{reportMatch?.homeTeamName}</option>
                    <option value="away">{reportMatch?.awayTeamName}</option>
                  </select>
                  <input
                    type="text" placeholder="Player"
                    value={c.player}
                    onChange={e => updateCard('red', i, 'player', e.target.value)}
                    className="flex-1 border rounded px-2 py-1 text-sm dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                  />
                  <input
                    type="number" min="0" placeholder="Minute"
                    value={c.minute || ''}
                    onChange={e => updateCard('red', i, 'minute', parseInt(e.target.value) || 0)}
                    onFocus={e => e.target.select()}
                    className="w-16 border rounded px-2 py-1 text-sm dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                  />
                  <button onClick={() => removeCard('red', i)} className="text-red-500 text-sm">&times;</button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="font-medium text-sm dark:text-gray-200">Notes</label>
            <textarea
              value={reportForm.description}
              onChange={e => setReportForm(f => ({ ...f, description: e.target.value }))}
              placeholder="e.g. Away team broke the referee's changing room window..."
              rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setReportMatch(null)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={submitReport} className="flex-1">Save Report</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!lineupMatch} onClose={() => { setLineupMatch(null); setLineupStarting([]); setLineupSubstitutes([]); setLineupTeamPlayers([]); setViewingLineup(false); }} title={viewingLineup ? "Match Lineups" : "Submit Lineup"}>
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {lineupMatch?.homeTeamName} vs {lineupMatch?.awayTeamName}
          </p>

          {viewingLineup ? (
            <div className="space-y-4">
              {lineupMatch?.lineup?.map((l, i) => {
                const homeCoach = teams.find(t => t.id === lineupMatch.homeTeamId)?.coachId;
                const teamName = l.submittedBy === homeCoach ? lineupMatch.homeTeamName : lineupMatch.awayTeamName;
                const starting = l.starting || [];
                const substitutes = l.substitutes || [];
                return (
                  <div key={i}>
                    <p className="font-medium text-sm dark:text-gray-200 mb-1">{teamName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Starting XI:</p>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {starting.map(pid => (
                        <span key={pid} className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 px-2 py-0.5 rounded text-xs">
                          {playerNames[pid] || pid.slice(0, 8)}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Substitutes:</p>
                    <div className="flex flex-wrap gap-1">
                      {substitutes.map(pid => (
                        <span key={pid} className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-2 py-0.5 rounded text-xs">
                          {playerNames[pid] || pid.slice(0, 8)}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
              <Button type="button" variant="outline" onClick={() => { setLineupMatch(null); setViewingLineup(false); setLineupStarting([]); setLineupSubstitutes([]); setLineupTeamPlayers([]); }} className="w-full">
                Close
              </Button>
            </div>
          ) : (
            <>

          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Starting XI ({lineupStarting.length})</p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {lineupTeamPlayers.map(p => (
                <label key={p.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${lineupStarting.includes(p.id) ? 'bg-green-50 dark:bg-green-900/20' : lineupSubstitutes.includes(p.id) ? 'opacity-50' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                  <input
                    type="checkbox"
                    checked={lineupStarting.includes(p.id)}
                    onChange={() => toggleStarting(p.id)}
                    className="rounded"
                  />
                  <div>
                    <p className="text-sm font-medium dark:text-gray-100">{p.name}</p>
                    <p className="text-xs text-gray-500">#{p.jerseyNumber} - {p.position || 'No position'}</p>
                  </div>
                  {lineupSubstitutes.includes(p.id) && <span className="text-xs text-gray-400 ml-auto">Substitute</span>}
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Substitutes ({lineupSubstitutes.length})</p>
            <div className="space-y-1 max-h-36 overflow-y-auto">
              {lineupTeamPlayers.filter(p => !lineupStarting.includes(p.id)).map(p => (
                <label key={p.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${lineupSubstitutes.includes(p.id) ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                  <input
                    type="checkbox"
                    checked={lineupSubstitutes.includes(p.id)}
                    onChange={() => toggleSubstitute(p.id)}
                    className="rounded"
                  />
                  <div>
                    <p className="text-sm font-medium dark:text-gray-100">{p.name}</p>
                    <p className="text-xs text-gray-500">#{p.jerseyNumber} - {p.position || 'No position'}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {lineupTeamPlayers.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No players match this division's age requirements</p>
          )}

          <p className="text-xs text-gray-400">{lineupStarting.length + lineupSubstitutes.length} total players selected</p>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => { setLineupMatch(null); setLineupStarting([]); setLineupSubstitutes([]); setLineupTeamPlayers([]); }} className="flex-1">
              Cancel
            </Button>
            <Button onClick={submitLineup} disabled={lineupStarting.length === 0} className="flex-1">
              Save Lineup
            </Button>
          </div>
            </>
          )}
    </div>
      </Modal>
    </div>
  );
};
