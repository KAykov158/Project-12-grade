import { 
  collection, doc, addDoc, updateDoc, deleteDoc, 
  getDocs, getDoc, query, where, orderBy, onSnapshot 
} from 'firebase/firestore';
import { db } from './config';
import { Team, Player, Match, User, Notification, RefereeAssignment } from '../types';

export const usersService = {
  create: async (userData: Omit<User, 'id'>) => {
    const docRef = await addDoc(collection(db, 'users'), userData);
    return docRef.id;
  },
  getById: async (id: string) => {
    const docSnap = await getDoc(doc(db, 'users', id));
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as User : null;
  },
  getByEmail: async (email: string) => {
    const q = query(collection(db, 'users'), where('email', '==', email));
    const snapshot = await getDocs(q);
    return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as User;
  },
  getByNickname: async (nickname: string) => {
    const q = query(collection(db, 'users'), where('nickname', '==', nickname));
    const snapshot = await getDocs(q);
    return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as User;
  },
  getByRole: async (role: string) => {
    const q = query(collection(db, 'users'), where('role', '==', role));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  },
  update: async (id: string, data: Partial<User>) => {
    await updateDoc(doc(db, 'users', id), data);
  },
  subscribe: (callback: (users: User[]) => void) => {
    return onSnapshot(collection(db, 'users'), snapshot => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
    });
  }
};

export const teamsService = {
  create: async (teamData: Omit<Team, 'id'>) => {
    const docRef = await addDoc(collection(db, 'teams'), teamData);
    return docRef.id;
  },
  getById: async (id: string) => {
    const docSnap = await getDoc(doc(db, 'teams', id));
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Team : null;
  },
  getAll: async () => {
    const snapshot = await getDocs(collection(db, 'teams'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
  },
  getByCoach: async (coachId: string) => {
    const q = query(collection(db, 'teams'), where('coachId', '==', coachId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
  },
  update: async (id: string, data: Partial<Team>) => {
    await updateDoc(doc(db, 'teams', id), data);
  },
  delete: async (id: string) => {
    await deleteDoc(doc(db, 'teams', id));
  },
  subscribe: (callback: (teams: Team[]) => void) => {
    return onSnapshot(collection(db, 'teams'), snapshot => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team)));
    });
  }
};

export const playersService = {
  create: async (playerData: Omit<Player, 'id'>) => {
    const docRef = await addDoc(collection(db, 'players'), playerData);
    return docRef.id;
  },
  getById: async (id: string) => {
    const docSnap = await getDoc(doc(db, 'players', id));
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Player : null;
  },
  getByTeam: async (teamId: string) => {
    const q = query(collection(db, 'players'), where('teamId', '==', teamId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Player));
  },
  update: async (id: string, data: Partial<Player>) => {
    await updateDoc(doc(db, 'players', id), data);
  },
  delete: async (id: string) => {
    await deleteDoc(doc(db, 'players', id));
  },
  subscribe: (teamId: string, callback: (players: Player[]) => void) => {
    const q = query(collection(db, 'players'), where('teamId', '==', teamId));
    return onSnapshot(q, snapshot => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Player)));
    });
  }
};

export const matchesService = {
  create: async (matchData: Omit<Match, 'id'>) => {
    const docRef = await addDoc(collection(db, 'matches'), matchData);
    return docRef.id;
  },
  getById: async (id: string) => {
    const docSnap = await getDoc(doc(db, 'matches', id));
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Match : null;
  },
  getAll: async () => {
    const q = query(collection(db, 'matches'), orderBy('dateTime', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));
  },
  getUpcoming: async () => {
    const q = query(
      collection(db, 'matches'), 
      where('status', '==', 'scheduled'),
      orderBy('dateTime', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));
  },
  getByReferee: async (refereeId: string) => {
    const snapshot = await getDocs(collection(db, 'matches'));
    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as Match))
      .filter(match => match.referees?.some((r: RefereeAssignment) => r.refereeId === refereeId));
  },
  update: async (id: string, data: Partial<Match>) => {
    await updateDoc(doc(db, 'matches', id), data);
  },
  updateRefereeStatus: async (matchId: string, refereeId: string, status: 'accepted' | 'declined') => {
    const match = await matchesService.getById(matchId);
    if (!match) return;
    const updatedReferees = match.referees.map((r: RefereeAssignment) => 
      r.refereeId === refereeId ? { ...r, status } : r
    );
    await matchesService.update(matchId, { referees: updatedReferees });
  },
  delete: async (id: string) => {
    await deleteDoc(doc(db, 'matches', id));
  },
  subscribe: (callback: (matches: Match[]) => void) => {
    const q = query(collection(db, 'matches'), orderBy('dateTime', 'desc'));
    return onSnapshot(q, snapshot => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match)));
    });
  }
};

export const notificationsService = {
  create: async (notificationData: Omit<Notification, 'id'>) => {
    const docRef = await addDoc(collection(db, 'notifications'), notificationData);
    return docRef.id;
  },
  getByUser: async (userId: string) => {
    const q = query(
      collection(db, 'notifications'), 
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
  },
  markAsRead: async (id: string) => {
    await updateDoc(doc(db, 'notifications', id), { read: true });
  },
  subscribe: (userId: string, callback: (notifications: Notification[]) => void) => {
    const q = query(
      collection(db, 'notifications'), 
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, snapshot => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification)));
    });
  }
};
