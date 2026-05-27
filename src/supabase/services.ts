import { supabase } from './client';
import { Team, Player, Match, User, Notification, RefereeAssignment } from '../types';

function subscribeToTable<T>(
  table: string,
  callback: (data: T[]) => void,
  filter?: { column: string; value: string },
  mapper?: (row: any) => T
): () => void {
  let channel: ReturnType<typeof supabase.channel>;

  const load = async () => {
    try {
      let query = supabase.from(table).select('*');
      if (filter) {
        query = query.eq(filter.column, filter.value);
      }
      const { data } = await query;
      if (data) {
        const mapped = mapper ? data.map(mapper) : (data as T[]);
        callback(mapped);
      }
    } catch (err) {
      console.error(`subscribeToTable(${table}) error:`, err);
    }
  };

  load();

  const filterStr = filter ? `${filter.column}=eq.${filter.value}` : undefined;
  const channelName = filter ? `${table}-${filter.column}-${filter.value}` : `${table}-all`;

  channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table, filter: filterStr },
      () => { load(); }
    )
    .subscribe();

  return () => { channel.unsubscribe(); };
}

function subscribeToDoc<T>(
  table: string,
  id: string,
  callback: (data: T | null) => void,
  mapper?: (row: any) => T
): () => void {
  let channel: ReturnType<typeof supabase.channel>;

  const load = async () => {
    try {
      const { data } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
      if (data) callback(mapper ? mapper(data) : (data as T));
    } catch (err) {
      console.error(`subscribeToDoc(${table}, ${id}) error:`, err);
    }
  };

  load();

  channel = supabase
    .channel(`${table}-doc-${id}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table, filter: `id=eq.${id}` },
      () => { load(); }
    )
    .subscribe();

  return () => { channel.unsubscribe(); };
}

export const usersService = {
  create: async (userData: User) => {
    const { error } = await supabase.from('profiles').upsert(mapUserToDb(userData), { onConflict: 'id' });
    if (error) throw error;
  },
  getById: async (id: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
    return data ? mapProfileToUser(data) : null;
  },
  getByEmail: async (email: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('email', email).maybeSingle();
    return data ? mapProfileToUser(data) : null;
  },
  getByNickname: async (nickname: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('nickname', nickname).maybeSingle();
    return data ? mapProfileToUser(data) : null;
  },
  getByRole: async (role: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('role', role);
    return (data || []).map(mapProfileToUser);
  },
  update: async (id: string, data: Partial<User>) => {
    const { error } = await supabase.from('profiles').update(mapUserToDb(data)).eq('id', id);
    if (error) throw error;
  },
  subscribe: (callback: (users: User[]) => void) => {
    return subscribeToTable<User>('profiles', callback, undefined, mapProfileToUser);
  },
  subscribeByRole: (role: string, callback: (users: User[]) => void) => {
    return subscribeToTable<User>('profiles', callback, { column: 'role', value: role }, mapProfileToUser);
  },
  subscribeById: (id: string, callback: (user: User | null) => void) => {
    return subscribeToDoc<User>('profiles', id, callback, mapProfileToUser);
  }
};

export const teamsService = {
  create: async (teamData: Omit<Team, 'id'>) => {
    const { data, error } = await supabase.from('teams').insert(mapTeamToDb(teamData)).select().single();
    if (error) throw error;
    return data.id;
  },
  getById: async (id: string) => {
    const { data } = await supabase.from('teams').select('*').eq('id', id).maybeSingle();
    return data ? mapDbToTeam(data) : null;
  },
  getAll: async () => {
    const { data } = await supabase.from('teams').select('*');
    return (data || []).map(mapDbToTeam);
  },
  getByCoach: async (coachId: string) => {
    const { data } = await supabase.from('teams').select('*').eq('coach_id', coachId);
    return (data || []).map(mapDbToTeam);
  },
  update: async (id: string, data: Partial<Team>) => {
    const { error } = await supabase.from('teams').update(mapTeamToDb(data)).eq('id', id);
    if (error) throw error;
  },
  delete: async (id: string) => {
    const { error } = await supabase.from('teams').delete().eq('id', id);
    if (error) throw error;
  },
  subscribe: (callback: (teams: Team[]) => void) => {
    return subscribeToTable<Team>('teams', callback, undefined, mapDbToTeam);
  }
};

export const playersService = {
  create: async (playerData: Omit<Player, 'id'>) => {
    const { data, error } = await supabase.from('players').insert(mapPlayerToDb(playerData)).select().single();
    if (error) throw error;
    return data.id;
  },
  getById: async (id: string) => {
    const { data } = await supabase.from('players').select('*').eq('id', id).maybeSingle();
    return data ? mapDbToPlayer(data) : null;
  },
  getByTeam: async (teamId: string) => {
    const { data } = await supabase.from('players').select('*').eq('team_id', teamId);
    return (data || []).map(mapDbToPlayer);
  },
  update: async (id: string, data: Partial<Player>) => {
    const { error } = await supabase.from('players').update(mapPlayerToDb(data)).eq('id', id);
    if (error) throw error;
  },
  delete: async (id: string) => {
    const { error } = await supabase.from('players').delete().eq('id', id);
    if (error) throw error;
  },
  subscribe: (teamId: string, callback: (players: Player[]) => void) => {
    return subscribeToTable<Player>('players', callback, { column: 'team_id', value: teamId }, mapDbToPlayer);
  }
};

export const matchesService = {
  create: async (matchData: Omit<Match, 'id'>) => {
    const { data, error } = await supabase.from('matches').insert(mapMatchToDb(matchData)).select().single();
    if (error) throw error;
    return data.id;
  },
  getById: async (id: string) => {
    const { data } = await supabase.from('matches').select('*').eq('id', id).maybeSingle();
    return data ? mapDbToMatch(data) : null;
  },
  getAll: async () => {
    const { data } = await supabase.from('matches').select('*').order('date_time', { ascending: false });
    return (data || []).map(mapDbToMatch);
  },
  getUpcoming: async () => {
    const { data } = await supabase
      .from('matches')
      .select('*')
      .eq('status', 'scheduled')
      .order('date_time', { ascending: true });
    return (data || []).map(mapDbToMatch);
  },
  getByReferee: async (refereeId: string) => {
    const { data } = await supabase.from('matches').select('*');
    return (data || [])
      .map(mapDbToMatch)
      .filter(match => match.referees?.some((r: RefereeAssignment) => r.refereeId === refereeId));
  },
  update: async (id: string, data: Partial<Match>) => {
    const { error } = await supabase.from('matches').update(mapMatchToDb(data)).eq('id', id);
    if (error) throw error;
  },
  updateRefereeStatus: async (matchId: string, refereeId: string, status: 'accepted' | 'declined') => {
    const { data: matchData } = await supabase.from('matches').select('referees').eq('id', matchId).maybeSingle();
    if (!matchData) return;
    const raw = matchData.referees;
    const referees: RefereeAssignment[] = typeof raw === 'string' ? JSON.parse(raw) : (raw || []);
    const updatedReferees = referees.map(r =>
      r.refereeId === refereeId ? { ...r, status } : r
    );
    await matchesService.update(matchId, { referees: updatedReferees });
  },
  delete: async (id: string) => {
    const { error } = await supabase.from('matches').delete().eq('id', id);
    if (error) throw error;
  },
  subscribe: (callback: (matches: Match[]) => void) => {
    return subscribeToTable<Match>('matches', callback, undefined, mapDbToMatch);
  }
};

export const notificationsService = {
  create: async (notificationData: Omit<Notification, 'id'>) => {
    const { error } = await supabase.from('notifications').insert(mapNotificationToDb(notificationData));
    if (error) throw error;
  },
  getByUser: async (userId: string) => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return (data || []).map(mapDbToNotification);
  },
  markAsRead: async (id: string) => {
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
    if (error) throw error;
  },
  subscribe: (userId: string, callback: (notifications: Notification[]) => void) => {
    return subscribeToTable<Notification>('notifications', callback, { column: 'user_id', value: userId }, mapDbToNotification);
  }
};

function mapProfileToUser(data: any): User {
  return {
    id: data.id,
    email: data.email,
    name: data.name,
    nickname: data.nickname || undefined,
    photo: data.photo || undefined,
    role: data.role,
    createdAt: new Date(data.created_at)
  };
}

function mapUserToDb(data: Partial<User>): any {
  const db: any = {};
  if (data.id !== undefined) db.id = data.id;
  if (data.email !== undefined) db.email = data.email;
  if (data.name !== undefined) db.name = data.name;
  if (data.nickname !== undefined) db.nickname = data.nickname || '';
  if (data.photo !== undefined) db.photo = data.photo || '';
  if (data.role !== undefined) db.role = data.role;
  if ('createdAt' in data && data.createdAt !== undefined) db.created_at = data.createdAt instanceof Date ? data.createdAt.toISOString() : data.createdAt;
  return db;
}

function mapTeamToDb(data: Partial<Team> | Omit<Team, 'id'>): any {
  const db: any = {};
  if (data.name !== undefined) db.name = data.name;
  if (data.logo !== undefined) db.logo = data.logo || '';
  if (data.category !== undefined) db.category = data.category;
  if (data.divisions !== undefined) db.divisions = JSON.stringify(data.divisions);
  if ('coachId' in data && data.coachId) db.coach_id = data.coachId;
  if ('createdAt' in data && data.createdAt !== undefined) db.created_at = data.createdAt.toISOString();
  return db;
}

function mapDbToTeam(data: any): Team {
  return {
    id: data.id,
    name: data.name,
    logo: data.logo || undefined,
    coachId: data.coach_id || undefined,
    category: data.category || '',
    divisions: typeof data.divisions === 'string' ? JSON.parse(data.divisions) : (data.divisions || []),
    createdAt: new Date(data.created_at)
  };
}

function mapPlayerToDb(data: Partial<Player> | Omit<Player, 'id'>): any {
  const db: any = {};
  if (data.name !== undefined) db.name = data.name;
  if (data.photo !== undefined) db.photo = data.photo || '';
  if (data.position !== undefined) db.position = data.position || '';
  if (data.jerseyNumber !== undefined) db.jersey_number = data.jerseyNumber;
  if ('birthDate' in data && data.birthDate !== undefined) db.birth_date = data.birthDate instanceof Date ? data.birthDate.toISOString().split('T')[0] : data.birthDate;
  if ('teamId' in data && data.teamId !== undefined) db.team_id = data.teamId;
  if ('createdAt' in data && data.createdAt !== undefined) db.created_at = data.createdAt.toISOString();
  return db;
}

function mapDbToPlayer(data: any): Player {
  return {
    id: data.id,
    name: data.name,
    photo: data.photo || undefined,
    birthDate: new Date(data.birth_date),
    position: data.position || undefined,
    jerseyNumber: data.jersey_number,
    teamId: data.team_id,
    createdAt: new Date(data.created_at)
  };
}

function mapMatchToDb(data: Partial<Match> | Omit<Match, 'id'>): any {
  const db: any = {};
  if (data.homeTeamId !== undefined) db.home_team_id = data.homeTeamId;
  if (data.awayTeamId !== undefined) db.away_team_id = data.awayTeamId;
  if (data.homeTeamName !== undefined) db.home_team_name = data.homeTeamName;
  if (data.awayTeamName !== undefined) db.away_team_name = data.awayTeamName;
  if (data.homeDivision !== undefined) db.home_division = data.homeDivision;
  if (data.awayDivision !== undefined) db.away_division = data.awayDivision;
  if (data.location !== undefined) db.location = data.location;
  if (data.category !== undefined) db.category = data.category;
  if (data.comments !== undefined) db.comments = data.comments;
  if (data.status !== undefined) db.status = data.status;
  if (data.referees !== undefined) db.referees = JSON.stringify(data.referees);
  if (data.result !== undefined) db.result = data.result ? JSON.stringify(data.result) : null;
  if ('dateTime' in data && data.dateTime !== undefined) db.date_time = data.dateTime instanceof Date ? data.dateTime.toISOString() : data.dateTime;
  if ('createdAt' in data && data.createdAt !== undefined) db.created_at = data.createdAt.toISOString();
  return db;
}

function mapDbToMatch(data: any): Match {
  return {
    id: data.id,
    homeTeamId: data.home_team_id || '',
    awayTeamId: data.away_team_id || '',
    homeTeamName: data.home_team_name,
    awayTeamName: data.away_team_name,
    homeDivision: data.home_division,
    awayDivision: data.away_division,
    dateTime: new Date(data.date_time),
    location: data.location,
    category: data.category || '',
    result: data.result ? (typeof data.result === 'string' ? JSON.parse(data.result) : data.result) : undefined,
    comments: data.comments || undefined,
    referees: typeof data.referees === 'string' ? JSON.parse(data.referees) : (data.referees || []),
    status: data.status,
    createdAt: new Date(data.created_at)
  };
}

function mapNotificationToDb(data: Omit<Notification, 'id'>): any {
  return {
    user_id: data.userId,
    title: data.title,
    message: data.message,
    read: data.read,
    created_at: data.createdAt instanceof Date ? data.createdAt.toISOString() : data.createdAt
  };
}

function mapDbToNotification(data: any): Notification {
  return {
    id: data.id,
    userId: data.user_id,
    title: data.title,
    message: data.message,
    read: data.read,
    createdAt: new Date(data.created_at)
  };
}
