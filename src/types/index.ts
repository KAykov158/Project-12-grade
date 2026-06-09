export type UserRole = 'admin' | 'referee' | 'coach' | 'player';

export interface User {
  id: string;
  email: string;
  name: string;
  nickname?: string;
  photo?: string;
  role: UserRole;
  theme?: 'light' | 'dark';
  twoFactorEnabled?: boolean;
  createdAt: Date;
}

export interface Player {
  id: string;
  name: string;
  photo?: string;
  cardPhoto?: string;
  birthDate: Date;
  position?: string;
  jerseyNumber: number;
  teamId: string;
  createdAt: Date;
}

export type LeagueType = 
  | 'U14' | 'U15-B' | 'U15-A' | 'U17-B' | 'U17-A' 
  | 'B okrujna' | 'A okrujna'
  | 'Elite U14' | 'Elite U15' | 'Elite U16' | 'Elite U17' | 'Elite U18'
  | '3rd Professional' | '2nd Professional' | '1st Professional';

export const LEAGUES: { label: string; value: LeagueType }[] = [
  { label: 'U14', value: 'U14' },
  { label: 'U15-B', value: 'U15-B' },
  { label: 'U15-A', value: 'U15-A' },
  { label: 'U17-B', value: 'U17-B' },
  { label: 'U17-A', value: 'U17-A' },
  { label: 'B okrujna', value: 'B okrujna' },
  { label: 'A okrujna', value: 'A okrujna' },
  { label: 'Elite U14', value: 'Elite U14' },
  { label: 'Elite U15', value: 'Elite U15' },
  { label: 'Elite U16', value: 'Elite U16' },
  { label: 'Elite U17', value: 'Elite U17' },
  { label: 'Elite U18', value: 'Elite U18' },
  { label: '3rd Professional', value: '3rd Professional' },
  { label: '2nd Professional', value: '2nd Professional' },
  { label: '1st Professional', value: '1st Professional' },
];

export interface Team {
  id: string;
  name: string;
  logo?: string;
  coachId?: string;
  assistantCoaches: string[];
  category: string;
  divisions: LeagueType[];
  createdAt: Date;
}

export type RefereeStatus = 'pending' | 'accepted' | 'declined';

export interface RefereeAssignment {
  refereeId: string;
  refereeName: string;
  role: 'chief' | 'assistant1' | 'assistant2';
  status: RefereeStatus;
}

export interface GoalEvent {
  team: 'home' | 'away';
  minute: number;
  scorer: number;
}

export interface CardEvent {
  team: 'home' | 'away';
  minute: number;
  player: string;
}

export interface MatchResult {
  homeScore: number;
  awayScore: number;
  goals: GoalEvent[];
  yellowCards: CardEvent[];
  redCards: CardEvent[];
  description?: string;
}

export interface MatchLineup {
  submittedBy: string;
  starting: string[];
  substitutes: string[];
}

export interface Match {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeDivision: LeagueType;
  awayDivision: LeagueType;
  dateTime: Date;
  location: string;
  category: string;
  result?: MatchResult;
  comments?: string;
  referees: RefereeAssignment[];
  status: 'scheduled' | 'completed' | 'cancelled';
  createdAt: Date;
  lineup?: MatchLineup[];
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  matchId?: string;
  read: boolean;
  createdAt: Date;
}
