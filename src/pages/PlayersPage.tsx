import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, Button, Input, Modal, Table, Th, Td, Select } from '../components/ui';
import { playersService, teamsService } from '../firebase';
import { Player, Team } from '../types';
import { Plus, Edit2, Trash2, User } from 'lucide-react';

export const PlayersPage: React.FC = () => {
  const { userData } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    birthDate: '',
    position: '',
    jerseyNumber: 0,
    teamId: '',
    photo: ''
  });

  useEffect(() => {
    teamsService.subscribe(setTeams);
  }, []);

  useEffect(() => {
    if (selectedTeam) {
      return playersService.subscribe(selectedTeam, setPlayers);
    } else {
      setPlayers([]);
    }
  }, [selectedTeam]);

  const canManage = userData?.role === 'admin' || userData?.role === 'coach';
  const userTeams = userData?.role === 'coach' 
    ? teams.filter(t => t.coachId === userData.id)
    : teams;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const playerData = {
      ...formData,
      birthDate: new Date(formData.birthDate),
      createdAt: new Date()
    };

    if (editingPlayer) {
      await playersService.update(editingPlayer.id, playerData);
    } else {
      await playersService.create(playerData);
    }
    setIsModalOpen(false);
    setEditingPlayer(null);
    setFormData({ name: '', birthDate: '', position: '', jerseyNumber: 0, teamId: selectedTeam, photo: '' });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this player?')) {
      await playersService.delete(id);
    }
  };

  const openEdit = (player: Player) => {
    setEditingPlayer(player);
    setFormData({
      name: player.name,
      birthDate: player.birthDate instanceof Date 
        ? player.birthDate.toISOString().split('T')[0] 
        : new Date(player.birthDate).toISOString().split('T')[0],
      position: player.position || '',
      jerseyNumber: player.jerseyNumber,
      teamId: player.teamId,
      photo: player.photo || ''
    });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Players</h1>
        {canManage && (
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Player
          </Button>
        )}
      </div>

      <Card>
        <div className="mb-4">
          <Select
            label="Filter by Team"
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            options={[
              { value: '', label: 'All Teams' },
              ...userTeams.map(t => ({ value: t.id, label: t.name }))
            ]}
          />
        </div>

        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Jersey #</Th>
              <Th>Position</Th>
              <Th>Birth Date</Th>
              {canManage && <Th>Actions</Th>}
            </tr>
          </thead>
          <tbody>
            {players.map(player => (
              <tr key={player.id}>
                <Td>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      {player.photo ? (
                        <img src={player.photo} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <User className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <span className="font-medium">{player.name}</span>
                  </div>
                </Td>
                <Td className="font-bold">#{player.jerseyNumber}</Td>
                <Td>{player.position || '-'}</Td>
                <Td>{new Date(player.birthDate).toLocaleDateString()}</Td>
                {canManage && (
                  <Td>
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(player)} className="p-1 hover:bg-gray-100 rounded">
                        <Edit2 className="w-4 h-4 text-blue-600" />
                      </button>
                      <button onClick={() => handleDelete(player.id)} className="p-1 hover:bg-gray-100 rounded">
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </Td>
                )}
              </tr>
            ))}
          </tbody>
        </Table>
        {players.length === 0 && (
          <p className="text-center py-8 text-gray-500">
            {selectedTeam ? 'No players in this team' : 'Select a team to view players'}
          </p>
        )}
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingPlayer(null); }} title={editingPlayer ? 'Edit Player' : 'Add Player'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input
            label="Jersey Number"
            type="number"
            value={formData.jerseyNumber}
            onChange={(e) => setFormData({ ...formData, jerseyNumber: parseInt(e.target.value) })}
            required
          />
          <Input
            label="Position"
            value={formData.position}
            onChange={(e) => setFormData({ ...formData, position: e.target.value })}
            placeholder="e.g., Forward, Midfielder"
          />
          <Input
            label="Birth Date"
            type="date"
            value={formData.birthDate}
            onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
            required
          />
          <Input
            label="Photo URL (optional)"
            type="url"
            value={formData.photo}
            onChange={(e) => setFormData({ ...formData, photo: e.target.value })}
          />
          <Select
            label="Team"
            value={formData.teamId}
            onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
            options={userTeams.map(t => ({ value: t.id, label: t.name }))}
          />
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => { setIsModalOpen(false); setEditingPlayer(null); }} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              {editingPlayer ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
