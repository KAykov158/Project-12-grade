import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, Badge } from '../components/ui';
import { matchesService, teamsService, usersService } from '../firebase';
import { Match, Team, User } from '../types';
import { Calendar, Users, Trophy, ClipboardList, ChevronRight, UserCircle } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { userData } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [referees, setReferees] = useState<User[]>([]);
  const [stats, setStats] = useState({ upcoming: 0, completed: 0, pendingReferee: 0 });
  const [showReferees, setShowReferees] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const allMatches = await matchesService.getAll();
      setMatches(allMatches);
      setTeams(await teamsService.getAll());
      setReferees(await usersService.getByRole('referee'));

      const upcoming = allMatches.filter(m => m.status === 'scheduled').length;
      const completed = allMatches.filter(m => m.status === 'completed').length;
      const pendingReferee = userData?.role === 'referee' 
        ? allMatches.filter(m => 
            m.status === 'scheduled' && 
            m.referees?.some(r => r.refereeId === userData.id && r.status === 'pending')
          ).length
        : 0;

      setStats({ upcoming, completed, pendingReferee });
    };
    loadData();
  }, [userData]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          Welcome back, {userData?.nickname || userData?.name}
        </h1>
        <Badge variant={userData?.role === 'admin' ? 'danger' : 'info'}>
          {userData?.role?.toUpperCase()}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="flex items-center gap-4 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => window.location.href = '/matches'}>
          <div className="p-3 bg-blue-100 rounded-lg">
            <Calendar className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="text-2xl font-bold">{stats.upcoming}</p>
            <p className="text-gray-500 text-sm">Upcoming Matches</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </Card>

        <Card className="flex items-center gap-4">
          <div className="p-3 bg-green-100 rounded-lg">
            <Trophy className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{stats.completed}</p>
            <p className="text-gray-500 text-sm">Completed</p>
          </div>
        </Card>

        <Card 
          className="flex items-center gap-4 cursor-pointer hover:shadow-lg transition-shadow" 
          onClick={() => setShowReferees(!showReferees)}
        >
          <div className="p-3 bg-purple-100 rounded-lg">
            <Users className="w-6 h-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <p className="text-2xl font-bold">{referees.length}</p>
            <p className="text-gray-500 text-sm">Referees</p>
          </div>
          <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${showReferees ? 'rotate-90' : ''}`} />
        </Card>

        <Card className="flex items-center gap-4" onClick={() => window.location.href = '/teams'} style={{cursor: 'pointer'}}>
          <div className="p-3 bg-orange-100 rounded-lg">
            <ClipboardList className="w-6 h-6 text-orange-600" />
          </div>
          <div className="flex-1">
            <p className="text-2xl font-bold">{teams.length}</p>
            <p className="text-gray-500 text-sm">Teams</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </Card>
      </div>

      {showReferees && (
        <Card>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Available Referees
          </h2>
          {referees.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {referees.map(referee => (
                <div key={referee.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center overflow-hidden">
                    {referee.photo ? (
                      <img src={referee.photo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <UserCircle className="w-8 h-8 text-purple-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{referee.name}</p>
                    <p className="text-sm text-gray-500">{referee.nickname || 'No nickname'}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No referees available</p>
          )}
        </Card>
      )}

      {userData?.role === 'referee' && stats.pendingReferee > 0 && (
        <Card className="bg-yellow-50 border border-yellow-200">
          <h3 className="font-semibold text-yellow-800 mb-2">
            Pending Assignments ({stats.pendingReferee})
          </h3>
          <p className="text-yellow-700 text-sm">
            You have matches waiting for your confirmation.
          </p>
        </Card>
      )}

      <Card>
        <h2 className="text-lg font-semibold mb-4">Recent Matches</h2>
        <div className="space-y-3">
          {matches.slice(0, 5).map(match => (
            <div key={match.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">{match.homeTeamName} vs {match.awayTeamName}</p>
                <p className="text-sm text-gray-500">
                  {new Date(match.dateTime).toLocaleDateString()} - {match.location}
                </p>
              </div>
              <Badge variant={match.status === 'scheduled' ? 'info' : 'success'}>
                {match.status}
              </Badge>
            </div>
          ))}
          {matches.length === 0 && (
            <p className="text-gray-500 text-center py-4">No matches yet</p>
          )}
        </div>
      </Card>
    </div>
  );
};
