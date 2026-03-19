import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, Button, Input, Modal, Badge } from '../components/ui';
import { teamsService, usersService } from '../firebase';
import { Team, User, LeagueType, LEAGUES } from '../types';
import { Plus, Edit2, Trash2, Search, ChevronDown, ChevronUp, Users } from 'lucide-react';

export const TeamsPage: React.FC = () => {
  const { userData } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [coaches, setCoaches] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'grouped'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [leagueSearch, setLeagueSearch] = useState('');
  const [showLeagueDropdown, setShowLeagueDropdown] = useState(false);
  const [formData, setFormData] = useState({ 
    name: '', 
    category: '', 
    logo: '',
    divisions: [] as LeagueType[]
  });

  useEffect(() => {
    const loadData = async () => {
      teamsService.subscribe(setTeams);
      setCoaches(await usersService.getByRole('coach'));
    };
    loadData();
  }, []);

  const canManage = userData?.role === 'admin' || userData?.role === 'coach';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const teamData = {
      name: formData.name,
      category: formData.category,
      logo: formData.logo,
      divisions: formData.divisions,
      coachId: userData?.role === 'coach' ? userData.id : '',
      createdAt: new Date()
    };

    if (editingTeam) {
      await teamsService.update(editingTeam.id, teamData);
    } else {
      await teamsService.create(teamData);
    }
    setIsModalOpen(false);
    setEditingTeam(null);
    setFormData({ name: '', category: '', logo: '', divisions: [] });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this team?')) {
      await teamsService.delete(id);
    }
  };

  const openEdit = (team: Team) => {
    setEditingTeam(team);
    setFormData({ 
      name: team.name, 
      category: team.category, 
      logo: team.logo || '',
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
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  };

  const filteredLeagues = LEAGUES.filter(l => 
    l.label.toLowerCase().includes(leagueSearch.toLowerCase())
  );

  const groupedTeams = teams.reduce((acc, team) => {
    const key = team.name;
    if (!acc[key]) acc[key] = [];
    acc[key].push(team);
    return acc;
  }, {} as Record<string, Team[]>);

  const filteredTeams = teams.filter(t => 
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Teams</h1>
        <div className="flex gap-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('all')}
              className={`px-3 py-1 rounded-md text-sm ${viewMode === 'all' ? 'bg-white shadow' : ''}`}
            >
              All Teams
            </button>
            <button
              onClick={() => setViewMode('grouped')}
              className={`px-3 py-1 rounded-md text-sm ${viewMode === 'grouped' ? 'bg-white shadow' : ''}`}
            >
              Group by Club
            </button>
          </div>
          {canManage && (
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Team
            </Button>
          )}
        </div>
      </div>

      <Card>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search teams or leagues..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {viewMode === 'all' ? (
          <div className="space-y-2">
            {filteredTeams.map(team => {
              const coach = coaches.find(c => c.id === team.coachId);
              return (
                <div key={team.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                  <div className="flex items-center gap-3">
                    {team.logo && (
                      <img src={team.logo} alt="" className="w-10 h-10 rounded-full object-cover" />
                    )}
                    <div>
                      <p className="font-medium">{team.name}</p>
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
                    <span className="text-sm text-gray-500">{coach?.name || '-'}</span>
                    {canManage && (
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(team)} className="p-1 hover:bg-gray-200 rounded">
                          <Edit2 className="w-4 h-4 text-blue-600" />
                        </button>
                        <button onClick={() => handleDelete(team.id)} className="p-1 hover:bg-gray-200 rounded">
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {filteredTeams.length === 0 && (
              <p className="text-center py-8 text-gray-500">No teams found</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(filteredGroupedTeams).map(([clubName, clubTeams]) => (
              <div key={clubName} className="border rounded-lg overflow-hidden">
                <div 
                  className="flex justify-between items-center p-4 bg-gray-100 cursor-pointer hover:bg-gray-200"
                  onClick={() => toggleExpand(clubName)}
                >
                  <div className="flex items-center gap-3">
                    {clubTeams[0].logo && (
                      <img src={clubTeams[0].logo} alt="" className="w-10 h-10 rounded-full object-cover" />
                    )}
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-gray-600" />
                      <span className="font-bold text-lg">{clubName}</span>
                      <Badge variant="info">{clubTeams.length} team{clubTeams.length > 1 ? 's' : ''}</Badge>
                    </div>
                  </div>
                  {expandedTeams.has(clubName) ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </div>
                {expandedTeams.has(clubName) && (
                  <div className="p-4 space-y-2">
                    {clubTeams.map(team => {
                      const coach = coaches.find(c => c.id === team.coachId);
                      return (
                        <div key={team.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{team.name}</span>
                            <div className="flex flex-wrap gap-1">
                              {team.divisions.map((div, idx) => (
                                <Badge key={idx} variant="info" className="text-xs">
                                  {div}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-500">{coach?.name || '-'}</span>
                            {canManage && (
                              <div className="flex gap-2">
                                <button onClick={() => openEdit(team)} className="p-1 hover:bg-gray-200 rounded">
                                  <Edit2 className="w-4 h-4 text-blue-600" />
                                </button>
                                <button onClick={() => handleDelete(team.id)} className="p-1 hover:bg-gray-200 rounded">
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
            {Object.keys(filteredGroupedTeams).length === 0 && (
              <p className="text-center py-8 text-gray-500">No teams found</p>
            )}
          </div>
        )}
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingTeam(null); setFormData({ name: '', category: '', logo: '', divisions: [] }); }} title={editingTeam ? 'Edit Team' : 'Add Team'}>
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
          <Input
            label="Logo URL (optional)"
            type="url"
            value={formData.logo}
            onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
          />
          
          <div className="relative">
            <label className="font-medium block mb-1">Leagues/Divisions</label>
            <div className="border rounded-lg overflow-hidden">
              <div 
                className="p-2 bg-gray-50 cursor-pointer flex justify-between items-center"
                onClick={() => setShowLeagueDropdown(!showLeagueDropdown)}
              >
                <span className="text-sm text-gray-600">
                  {formData.divisions.length > 0 
                    ? `${formData.divisions.length} selected` 
                    : 'Select leagues...'}
                </span>
                {showLeagueDropdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
              {showLeagueDropdown && (
                <div className="p-2 border-t">
                  <input
                    type="text"
                    placeholder="Search leagues..."
                    value={leagueSearch}
                    onChange={(e) => setLeagueSearch(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg mb-2 text-sm"
                  />
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {filteredLeagues.map(league => (
                      <label 
                        key={league.value} 
                        className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.divisions.includes(league.value)}
                          onChange={() => toggleDivision(league.value)}
                          className="rounded"
                        />
                        <span className="text-sm">{league.label}</span>
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

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => { setIsModalOpen(false); setEditingTeam(null); }} className="flex-1">
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
};
