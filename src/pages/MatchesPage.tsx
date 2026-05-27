import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, Button, Input, Modal, Select, Badge } from '../components/ui';
import { matchesService, teamsService, usersService, notificationsService } from '../supabase';
import { Match, Team, User, RefereeAssignment, LeagueType } from '../types';
import { Plus, Check, X, MapPin, Calendar as CalendarIcon, UserCircle, Trash2, Edit2 } from 'lucide-react';

export const MatchesPage: React.FC = () => {
  const { userData } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [referees, setReferees] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'completed'>('all');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [formData, setFormData] = useState({
    homeTeamId: '',
    awayTeamId: '',
    homeDivision: '' as LeagueType | '',
    awayDivision: '' as LeagueType | '',
    dateTime: '',
    location: '',
    category: ''
  });

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

  const canManage = userData?.role === 'admin';
  const filteredMatches = matches.filter(m => filter === 'all' || m.status === filter);

  const selectedHomeTeam = teams.find(t => t.id === formData.homeTeamId);
  const selectedAwayTeam = teams.find(t => t.id === formData.awayTeamId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.homeDivision || !formData.awayDivision) {
      alert('Please select both home and away divisions');
      return;
    }
    try {
      await matchesService.create({
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
        title: 'New Match Assignment',
        message: `You have been assigned as ${role} for ${match.homeTeamName} vs ${match.awayTeamName}`,
        read: false,
        createdAt: new Date()
      });
    } catch (err) {
      console.error('Failed to send notification:', err);
    }
  };

  const removeReferee = async (matchId: string, refereeId: string) => {
    if (!confirm('Remove this referee from the match?')) return;
    
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    const updatedReferees = match.referees.filter(r => r.refereeId !== refereeId);
    try {
      await matchesService.update(matchId, { referees: updatedReferees });
    } catch (err) {
      alert('Failed to remove referee: ' + (err instanceof Error ? err.message : 'Unknown error'));
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
    } catch (err) {
      alert('Failed to change referee role: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const respondToMatch = async (matchId: string, status: 'accepted' | 'declined') => {
    try {
      await matchesService.updateRefereeStatus(matchId, userData!.id, status);
    } catch (err) {
      alert('Failed to respond: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const availableReferees = (match: Match) => {
    return referees.filter(r => !match.referees?.some(mr => mr.refereeId === r.id));
  };

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
            <Card key={match.id} className="space-y-3">
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
                  <Badge variant={match.status === 'scheduled' ? 'info' : 'success'}>
                    {match.status}
                  </Badge>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{match.category}</p>
                </div>
              </div>

              {match.result && (
                <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg text-center">
                  <span className="text-2xl font-bold dark:text-gray-100">
                    {match.result.homeScore} - {match.result.awayScore}
                  </span>
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
    </div>
  );
};
