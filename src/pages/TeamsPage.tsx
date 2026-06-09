import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, Button, Input, Modal, Badge } from '../components/ui';
import { teamsService, usersService, playersService } from '../supabase';
import { Team, User, Player, LeagueType, LEAGUES } from '../types';
import {
  Plus, Edit2, Trash2, Search, ChevronDown, ChevronUp, Users,
  UserCircle, Check, X, Shield, Flag
} from 'lucide-react';

export const TeamsPage: React.FC = () => {
  const { userData } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [coaches, setCoaches] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [playersMap, setPlayersMap] = useState<Record<string, Player[]>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'grouped'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [leagueSearch, setLeagueSearch] = useState('');
  const [showLeagueDropdown, setShowLeagueDropdown] = useState(false);
  const [expandedTeamDetail, setExpandedTeamDetail] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    logo: '',
    coachId: '',
    divisions: [] as LeagueType[]
  });
  const [coachSearch, setCoachSearch] = useState('');
  const [showCoachDropdown, setShowCoachDropdown] = useState(false);

  // Player form state
  const [playerForm, setPlayerForm] = useState({ name: '', position: '', jerseyNumber: 0, birthDate: '', photo: '', cardPhoto: '' });
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [showPlayerForm, setShowPlayerForm] = useState(false);

  // Assistant coach state
  const [assistantSearch, setAssistantSearch] = useState('');
  const [showAssistantDropdown, setShowAssistantDropdown] = useState<string | null>(null);

  const isCoach = userData?.role === 'coach';
  const isAdmin = userData?.role === 'admin';

  // Coaches's team IDs
  const coachTeamIds = useMemo(() => {
    if (!isCoach || !userData) return new Set<string>();
    return new Set(teams.filter(t => t.coachId === userData.id).map(t => t.id));
  }, [teams, isCoach, userData]);

  useEffect(() => {
    const unsubTeams = teamsService.subscribe(setTeams);
    const unsubCoaches = usersService.subscribeByRole('coach', setCoaches);
    const unsubUsers = usersService.subscribe(setAllUsers);
    return () => {
      unsubTeams();
      unsubCoaches();
      unsubUsers();
    };
  }, []);

  // Load players for a team when expanded
  const loadPlayers = (teamId: string) => {
    if (!playersMap[teamId]) {
      playersService.getByTeam(teamId).then(players => {
        setPlayersMap(prev => ({ ...prev, [teamId]: players }));
      });
    }
    const unsub = playersService.subscribe(teamId, (players) => {
      setPlayersMap(prev => ({ ...prev, [teamId]: players }));
    });
    return unsub;
  };

  useEffect(() => {
    if (expandedTeamDetail) {
      const unsub = loadPlayers(expandedTeamDetail);
      return () => unsub();
    }
  }, [expandedTeamDetail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const teamData = {
      name: formData.name,
      category: formData.category,
      logo: formData.logo,
      divisions: formData.divisions,
      assistantCoaches: [],
      coachId: isAdmin ? (formData.coachId || undefined) : userData?.id,
      createdAt: new Date()
    };

    try {
      if (editingTeam) {
        await teamsService.update(editingTeam.id, teamData);
      } else {
        await teamsService.create(teamData);
      }
      setIsModalOpen(false);
      setEditingTeam(null);
      setFormData({ name: '', category: '', logo: '', coachId: '', divisions: [] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : typeof err === 'object' && err !== null ? JSON.stringify(err) : String(err);
      alert('Failed to save team: ' + msg);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this team?')) return;
    try {
      await teamsService.delete(id);
    } catch (err) {
      alert('Failed to delete team: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const openEdit = (team: Team) => {
    setEditingTeam(team);
    setFormData({
      name: team.name,
      category: team.category,
      logo: team.logo || '',
      coachId: team.coachId || '',
      divisions: team.divisions || []
    });
    setIsModalOpen(true);
  };

  const toggleDivision = (division: LeagueType) => {
    setFormData(prev => ({
      ...prev,
      divisions: prev.divisions.includes(division)
        ? prev.divisions.filter(d => d !== division)
        : [...prev.divisions, division]
    }));
  };

  const toggleExpand = (teamId: string) => {
    setExpandedTeams(prev => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  };

  const toggleDetail = (teamId: string) => {
    setExpandedTeamDetail(prev => prev === teamId ? null : teamId);
    setShowPlayerForm(false);
    setEditingPlayer(null);
    setShowAssistantDropdown(null);
  };

  const filteredLeagues = LEAGUES.filter(l =>
    l.label.toLowerCase().includes(leagueSearch.toLowerCase())
  );

  // Player CRUD
  const handlePlayerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expandedTeamDetail) return;
    try {
      const payload = {
        name: playerForm.name,
        position: playerForm.position,
        jerseyNumber: playerForm.jerseyNumber,
        birthDate: new Date(playerForm.birthDate),
        photo: playerForm.photo || undefined,
        cardPhoto: playerForm.cardPhoto || undefined,
      };
      if (editingPlayer) {
        await playersService.update(editingPlayer.id, payload);
      } else {
        await playersService.create({
          ...payload,
          teamId: expandedTeamDetail,
          createdAt: new Date()
        });
      }
      setShowPlayerForm(false);
      setEditingPlayer(null);
      setPlayerForm({ name: '', position: '', jerseyNumber: 0, birthDate: '', photo: '', cardPhoto: '' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : typeof err === 'object' && err !== null ? JSON.stringify(err) : String(err);
      alert('Failed to save player: ' + msg);
    }
  };

  const openPlayerEdit = (player: Player) => {
    setEditingPlayer(player);
    setPlayerForm({
      name: player.name,
      position: player.position || '',
      jerseyNumber: player.jerseyNumber,
      birthDate: player.birthDate instanceof Date
        ? player.birthDate.toISOString().split('T')[0]
        : new Date(player.birthDate).toISOString().split('T')[0],
      photo: player.photo || '',
      cardPhoto: player.cardPhoto || '',
    });
    setShowPlayerForm(true);
  };

  const handleDeletePlayer = async (id: string) => {
    if (!confirm('Remove this player?')) return;
    try {
      await playersService.delete(id);
    } catch (err) {
      alert('Failed to delete player: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  // Assistant coach CRUD
  const addAssistant = async (teamId: string, userId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;
    if (team.assistantCoaches.includes(userId)) return;
    try {
      await teamsService.update(teamId, {
        assistantCoaches: [...team.assistantCoaches, userId]
      });
      setShowAssistantDropdown(null);
    } catch {
      alert('Could not add assistant coach. Make sure the database has the assistant_coaches column: ALTER TABLE teams ADD COLUMN assistant_coaches JSONB DEFAULT \'[]\'::jsonb;');
    }
  };

  const removeAssistant = async (teamId: string, userId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;
    try {
      await teamsService.update(teamId, {
        assistantCoaches: team.assistantCoaches.filter(id => id !== userId)
      });
    } catch {
      alert('Could not update assistant coaches. Make sure the database has the assistant_coaches column: ALTER TABLE teams ADD COLUMN assistant_coaches JSONB DEFAULT \'[]\'::jsonb;');
    }
  };

  // Filter teams for display
  const displayTeams = isCoach
    ? teams.filter(t => coachTeamIds.has(t.id))
    : teams;

  const groupedTeams = displayTeams.reduce((acc, team) => {
    const key = team.name;
    if (!acc[key]) acc[key] = [];
    acc[key].push(team);
    return acc;
  }, {} as Record<string, Team[]>);

  const filteredTeams = displayTeams.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.divisions.some(d => d.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredGroupedTeams = Object.entries(groupedTeams).reduce((acc, [key, teamList]) => {
    const matchingTeams = teamList.filter(t =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.divisions.some(d => d.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    if (matchingTeams.length > 0) acc[key] = matchingTeams;
    return acc;
  }, {} as Record<string, Team[]>);

  // Check if user can manage a specific team
  const canManageTeam = (team: Team) =>
    isAdmin || (isCoach && team.coachId === userData?.id);

  const handleCoachAddPlayer = () => {
    const myTeams = teams.filter(t => coachTeamIds.has(t.id));
    const targetTeam = myTeams[0];
    if (targetTeam) {
      setExpandedTeamDetail(targetTeam.id);
      setEditingPlayer(null);
      setPlayerForm({ name: '', position: '', jerseyNumber: 0, birthDate: '', photo: '', cardPhoto: '' });
      setShowPlayerForm(true);
      setShowAssistantDropdown(null);
    } else {
      alert('You need to be assigned as a coach to a team before adding players.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-gray-100 flex items-center gap-2">
            <Flag className="w-6 h-6 text-emerald-600" />
            {isCoach ? 'My Team' : 'Teams'}
          </h1>
          {isCoach && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage your team — players, staff and settings
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {!isCoach && (
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('all')}
                className={`px-3 py-1 rounded-md text-sm transition-colors ${viewMode === 'all' ? 'bg-white dark:bg-gray-600 shadow dark:text-gray-100' : 'dark:text-gray-300'}`}
              >
                All Teams
              </button>
              <button
                onClick={() => setViewMode('grouped')}
                className={`px-3 py-1 rounded-md text-sm transition-colors ${viewMode === 'grouped' ? 'bg-white dark:bg-gray-600 shadow dark:text-gray-100' : 'dark:text-gray-300'}`}
              >
                Group by Club
              </button>
            </div>
          )}
          {isAdmin && (
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Team
            </Button>
          )}
          {isCoach && (
            <Button onClick={handleCoachAddPlayer}>
              <Plus className="w-4 h-4 mr-2" />
              Add Player
            </Button>
          )}
        </div>
      </div>

      <Card>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search teams or leagues..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
          />
        </div>

        {viewMode === 'grouped' && !isCoach ? (
          <div className="space-y-4">
            {Object.entries(filteredGroupedTeams).map(([clubName, clubTeams]) => (
              <div key={clubName} className="border rounded-lg overflow-hidden dark:border-gray-600">
                <div
                  className="flex justify-between items-center p-4 bg-gray-100 dark:bg-gray-700 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
                  onClick={() => toggleExpand(clubName)}
                >
                  <div className="flex items-center gap-3">
                    {clubTeams[0].logo && (
                      <img src={clubTeams[0].logo} alt="" className="w-10 h-10 rounded-full object-cover" />
                    )}
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                      <span className="font-bold text-lg dark:text-gray-100">{clubName}</span>
                      <Badge variant="info">{clubTeams.length} team{clubTeams.length > 1 ? 's' : ''}</Badge>
                    </div>
                  </div>
                  {expandedTeams.has(clubName) ? (
                    <ChevronUp className="w-5 h-5 dark:text-gray-300" />
                  ) : (
                    <ChevronDown className="w-5 h-5 dark:text-gray-300" />
                  )}
                </div>
                {expandedTeams.has(clubName) && (
                  <div className="p-4 space-y-2">
                    {clubTeams.map(team => renderTeamRow(team))}
                  </div>
                )}
              </div>
            ))}
            {Object.keys(filteredGroupedTeams).length === 0 && (
              <p className="text-center py-8 text-gray-500 dark:text-gray-400">No teams found</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTeams.map(team => renderTeamRow(team))}
            {filteredTeams.length === 0 && (
              <p className="text-center py-8 text-gray-500 dark:text-gray-400">No teams found</p>
            )}
          </div>
        )}
      </Card>

      {/* Team detail panel */}
      {expandedTeamDetail && (() => {
        const team = teams.find(t => t.id === expandedTeamDetail);
        if (!team) return null;
        const teamPlayers = playersMap[team.id] || [];
        const canEdit = canManageTeam(team);

        return (
          <Card className="border-t-4 border-t-emerald-500">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                {team.logo && <img src={team.logo} alt="" className="w-12 h-12 rounded-full object-cover" />}
                <div>
                  <h2 className="text-xl font-bold dark:text-gray-100">{team.name}</h2>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {team.divisions.map((div, idx) => (
                      <Badge key={idx} variant="info" className="text-xs">{div}</Badge>
                    ))}
                  </div>
                </div>
              </div>
              <button onClick={() => setExpandedTeamDetail(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Staff Section */}
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  Staff
                </h3>
                <div className="space-y-2">
                  {/* Head coach */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <UserCircle className="w-5 h-5 text-emerald-600" />
                      <div>
                        <p className="text-sm font-medium dark:text-gray-100">
                          {coaches.find(c => c.id === team.coachId)?.name || 'Head Coach'}
                        </p>
                        <p className="text-xs text-gray-400">Head Coach</p>
                      </div>
                    </div>
                    <Badge variant="success">Head</Badge>
                  </div>

                  {/* Assistant coaches */}
                  {team.assistantCoaches.map((acId) => {
                    const ac = allUsers.find(u => u.id === acId);
                    return (
                      <div key={acId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <UserCircle className="w-5 h-5 text-gray-400" />
                          <p className="text-sm dark:text-gray-100">{ac?.name || 'Unknown'}</p>
                        </div>
                        {canEdit && (
                          <button
                            onClick={() => removeAssistant(team.id, acId)}
                            className="text-red-400 hover:text-red-600 p-1"
                            title="Remove assistant"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {/* Add assistant coach */}
                  {canEdit && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowAssistantDropdown(showAssistantDropdown === team.id ? null : team.id)}
                        className="w-full flex items-center gap-2 px-3 py-2.5 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Add Assistant Coach
                      </button>
                      {showAssistantDropdown === team.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setShowAssistantDropdown(null)} />
                          <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden">
                            <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                              <input
                                type="text"
                                placeholder="Search coaches..."
                                value={assistantSearch}
                                onChange={(e) => setAssistantSearch(e.target.value)}
                                className="w-full px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                autoFocus
                              />
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                              {coaches
                                .filter(c => c.id !== team.coachId && !team.assistantCoaches.includes(c.id))
                                .filter(c => !assistantSearch || c.name.toLowerCase().includes(assistantSearch.toLowerCase()))
                                .map(coach => (
                                  <button
                                    key={coach.id}
                                    type="button"
                                    onClick={() => addAssistant(team.id, coach.id)}
                                    className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                  >
                                    <UserCircle className="w-5 h-5 text-gray-400" />
                                    {coach.name}
                                  </button>
                                ))}
                              {coaches.filter(c => c.id !== team.coachId && !team.assistantCoaches.includes(c.id)).length === 0 && (
                                <p className="px-4 py-3 text-sm text-gray-400">No available coaches.</p>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Players Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-600" />
                    Players ({teamPlayers.length})
                  </h3>
                  {canEdit && !showPlayerForm && (
                    <Button size="sm" onClick={() => { setEditingPlayer(null); setPlayerForm({ name: '', position: '', jerseyNumber: 0, birthDate: '', photo: '', cardPhoto: '' }); setShowPlayerForm(true); }}>
                      <Plus className="w-4 h-4 mr-1" /> Add Player
                    </Button>
                  )}
                </div>

                {showPlayerForm && (
                  <form onSubmit={handlePlayerSubmit} className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl space-y-3 border border-gray-200 dark:border-gray-600">
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Full Name"
                        value={playerForm.name}
                        onChange={(e) => setPlayerForm({ ...playerForm, name: e.target.value })}
                        placeholder="Player name"
                        required
                      />
                      <Input
                        label="Jersey #"
                        type="number"
                        value={playerForm.jerseyNumber || ''}
                        onChange={(e) => setPlayerForm({ ...playerForm, jerseyNumber: parseInt(e.target.value) || 0 })}
                        required
                      />
                      <Input
                        label="Position"
                        value={playerForm.position}
                        onChange={(e) => setPlayerForm({ ...playerForm, position: e.target.value })}
                        placeholder="e.g. Forward, GK"
                      />
                      <Input
                        label="Birth Date"
                        type="date"
                        value={playerForm.birthDate}
                        onChange={(e) => setPlayerForm({ ...playerForm, birthDate: e.target.value })}
                        required
                      />
                      <div className="col-span-2 space-y-2">
                        <label className="font-medium text-sm dark:text-gray-200">Profile Photo</label>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full overflow-hidden border shrink-0 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                            {playerForm.photo ? (
                              <img src={playerForm.photo} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs text-gray-400">PFP</span>
                            )}
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => setPlayerForm({ ...playerForm, photo: reader.result as string });
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="flex-1 text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50"
                          />
                          {playerForm.photo && (
                            <button type="button" onClick={() => setPlayerForm({ ...playerForm, photo: '' })} className="text-red-500 text-sm hover:underline shrink-0 w-16 text-right">Remove</button>
                          )}
                        </div>
                      </div>
                      <div className="col-span-2 space-y-2">
                        <label className="font-medium text-sm dark:text-gray-200">Card Photo</label>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded overflow-hidden border shrink-0 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                            {playerForm.cardPhoto ? (
                              <img src={playerForm.cardPhoto} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs text-gray-400">Card</span>
                            )}
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => setPlayerForm({ ...playerForm, cardPhoto: reader.result as string });
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="flex-1 text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50"
                          />
                          {playerForm.cardPhoto && (
                            <button type="button" onClick={() => setPlayerForm({ ...playerForm, cardPhoto: '' })} className="text-red-500 text-sm hover:underline shrink-0 w-16 text-right">Remove</button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button type="submit" size="sm">
                        {editingPlayer ? 'Update' : 'Add'} Player
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => { setShowPlayerForm(false); setEditingPlayer(null); }}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}

                {teamPlayers.length > 0 ? (
                  <div className="space-y-1.5">
                    {teamPlayers.map(player => (
                      <div key={player.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                            {player.photo ? (
                              <img src={player.photo} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                                {player.jerseyNumber}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium dark:text-gray-100">{player.name}</p>
                            <p className="text-xs text-gray-400">
                              {[player.position, player.birthDate ? new Date(player.birthDate).toLocaleDateString() : ''].filter(Boolean).join(' · ')}
                            </p>
                          </div>
                          {player.cardPhoto && (
                            <img src={player.cardPhoto} alt="card" className="w-10 h-7 object-cover border rounded opacity-60 hover:opacity-100 transition-opacity" title="Card photo" />
                          )}
                        </div>
                        {canEdit && (
                          <div className="flex gap-1">
                            <button onClick={() => openPlayerEdit(player)} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
                              <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                            </button>
                            <button onClick={() => handleDeletePlayer(player.id)} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
                    No players yet. {canEdit && 'Click "Add Player" to build your squad.'}
                  </p>
                )}
              </div>
            </div>
          </Card>
        );
      })()}

      {/* Create/Edit Team Modal */}
      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingTeam(null); setFormData({ name: '', category: '', logo: '', coachId: '', divisions: [] }); }} title={editingTeam ? 'Edit Team' : 'Add Team'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Team/Club Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Spartak, Partizan, Vojvodina"
            required
          />
          <Input
            label="Category/Description"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            placeholder="e.g., Youth Academy, Senior Team"
          />
          <div>
            <label className="font-medium block mb-1 dark:text-gray-100">Logo</label>
            <div className="flex items-center gap-3">
              {formData.logo && (
                <img src={formData.logo} alt="" className="w-12 h-12 rounded-full object-cover border shrink-0" />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setFormData({ ...formData, logo: reader.result as string });
                    reader.readAsDataURL(file);
                  }
                }}
                className="flex-1 text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50"
              />
              {formData.logo && (
                <button type="button" onClick={() => setFormData({ ...formData, logo: '' })} className="text-red-500 text-sm hover:underline shrink-0">Remove</button>
              )}
            </div>
          </div>

          <div className="relative">
            <label className="font-medium block mb-1 dark:text-gray-100">Leagues/Divisions</label>
            <div className="border rounded-lg overflow-hidden dark:border-gray-600">
              <div
                className="p-2 bg-gray-50 dark:bg-gray-700 cursor-pointer flex justify-between items-center"
                onClick={() => setShowLeagueDropdown(!showLeagueDropdown)}
              >
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {formData.divisions.length > 0
                    ? `${formData.divisions.length} selected`
                    : 'Select leagues...'}
                </span>
                {showLeagueDropdown ? <ChevronUp className="w-4 h-4 dark:text-gray-300" /> : <ChevronDown className="w-4 h-4 dark:text-gray-300" />}
              </div>
              {showLeagueDropdown && (
                <div className="p-2 border-t">
                  <input
                    type="text"
                    placeholder="Search leagues..."
                    value={leagueSearch}
                    onChange={(e) => setLeagueSearch(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg mb-2 text-sm dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                  />
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {filteredLeagues.map(league => (
                      <label
                        key={league.value}
                        className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-600 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.divisions.includes(league.value)}
                          onChange={() => toggleDivision(league.value)}
                          className="rounded"
                        />
                        <span className="text-sm dark:text-gray-200">{league.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {formData.divisions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {formData.divisions.map(div => (
                  <Badge key={div} variant="info" className="text-xs cursor-pointer" onClick={() => toggleDivision(div)}>
                    {div} ✕
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {isAdmin && (
            <div className="relative">
              <label className="font-medium block mb-1 dark:text-gray-100">Coach</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCoachDropdown(!showCoachDropdown)}
                  className="w-full flex items-center gap-2 px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 text-left"
                >
                  <UserCircle className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className={formData.coachId ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}>
                    {formData.coachId
                      ? coaches.find(c => c.id === formData.coachId)?.name || 'Unknown coach'
                      : 'Select a coach...'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400 ml-auto shrink-0" />
                </button>
                {showCoachDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowCoachDropdown(false)} />
                    <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden">
                      <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                        <input
                          type="text"
                          placeholder="Search coaches..."
                          value={coachSearch}
                          onChange={(e) => setCoachSearch(e.target.value)}
                          className="w-full px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {coaches.filter(c => !coachSearch || c.name.toLowerCase().includes(coachSearch.toLowerCase())).map(coach => (
                          <button
                            key={coach.id}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, coachId: coach.id });
                              setShowCoachDropdown(false);
                              setCoachSearch('');
                            }}
                            className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 ${
                              formData.coachId === coach.id
                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                          >
                            <UserCircle className="w-5 h-5 text-gray-400" />
                            <span className="flex-1">{coach.name}</span>
                            {formData.coachId === coach.id && <Check className="w-4 h-4 text-blue-600" />}
                          </button>
                        ))}
                        {coaches.length === 0 && (
                          <p className="px-4 py-3 text-sm text-gray-400">No coaches registered yet.</p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => { setIsModalOpen(false); setEditingTeam(null); setFormData({ name: '', category: '', logo: '', coachId: '', divisions: [] }); }} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              {editingTeam ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );

  function renderTeamRow(team: Team) {
    const coach = coaches.find(c => c.id === team.coachId);
    const isDetailOpen = expandedTeamDetail === team.id;
    const canEdit = canManageTeam(team);

    return (
      <React.Fragment key={team.id}>
        <div
          className={`flex justify-between items-center p-3 rounded-lg cursor-pointer transition-colors ${
            isDetailOpen
              ? 'bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-400'
              : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          onClick={() => toggleDetail(team.id)}
        >
          <div className="flex items-center gap-3">
            {team.logo && (
              <img src={team.logo} alt="" className="w-10 h-10 rounded-full object-cover" />
            )}
            <div>
              <p className="font-medium dark:text-gray-100">{team.name}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {team.divisions.map((div, idx) => (
                  <Badge key={idx} variant="info" className="text-xs">
                    {div}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 dark:text-gray-400">{coach?.name || '-'}</span>
            <div className="flex items-center gap-1">
              {(playersMap[team.id]?.length ?? 0) > 0 && (
                <span className="text-xs text-gray-400 mr-1">{playersMap[team.id].length} players</span>
              )}
              {canEdit && (
                <button onClick={(e) => { e.stopPropagation(); openEdit(team); }} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
                  <Edit2 className="w-4 h-4 text-blue-600" />
                </button>
              )}
              {isAdmin && (
                <button onClick={(e) => { e.stopPropagation(); handleDelete(team.id); }} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              )}
            </div>
          </div>
        </div>
      </React.Fragment>
    );
  }
};
