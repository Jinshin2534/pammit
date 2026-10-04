import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type AppRole = 'owner' | 'worker';
export type ScheduleWorkType = 'prune' | 'irrigate' | 'fertilize' | 'thinning' | 'harvest' | 'spray' | 'mow' | 'other';

export type AppSession = {
  role: AppRole;
  userName: string;
  avatarId?: string;
};

export type AppUser = { id: string; name: string; role: AppRole; avatarId?: string; gender?: string; workerType?: string; weeklyHours?: string };
export type AppFarm = { id: string; name: string; location?: string };
export type JournalEntry = { date: string; note: string };

export type AppSchedule = {
  id: string;
  date: string;
  start: string;
  end: string;
  work: string;
  workType: ScheduleWorkType;
  place: string;
  members: string[];
  note?: string;
};

type ScheduleInput = Omit<AppSchedule, 'id'> & { id?: string };

type AppStateValue = {
  session: AppSession;
  schedules: AppSchedule[];
  users: AppUser[];
  farms: AppFarm[];
  journalEntries: JournalEntry[];
  setSession: (session: AppSession) => void;
  updateCurrentProfile: (profile: { name: string; avatarId: string }) => void;
  addUser: (user: Omit<AppUser, 'id'>) => void;
  updateUser: (id: string, user: Partial<Omit<AppUser, 'id' | 'role'>>) => void;
  deleteUser: (id: string) => void;
  addFarm: (farm: Omit<AppFarm, 'id'>) => void;
  updateFarm: (id: string, farm: Omit<AppFarm, 'id'>) => void;
  deleteFarm: (id: string) => void;
  saveJournal: (entry: JournalEntry) => void;
  schedulesForDate: (date: string) => AppSchedule[];
  saveSchedule: (schedule: ScheduleInput) => AppSchedule;
};

const SESSION_KEY = 'pammit.session.v1';
const SCHEDULES_KEY = 'pammit.schedules.v1';
const USERS_KEY = 'pammit.users.v1';
const FARMS_KEY = 'pammit.farms.v1';
const JOURNALS_KEY = 'pammit.journals.v1';
const defaultSession: AppSession = { role: 'worker', userName: '近未来 すだち子' };
const defaultSchedules: AppSchedule[] = [
  { id: 'default-1', date: '2026-10-10', start: '08:00', end: '11:30', work: '収穫', workType: 'harvest', place: 'すだち農園', members: ['野﨑'] },
  { id: 'default-2', date: '2026-10-10', start: '13:00', end: '14:30', work: '防除', workType: 'spray', place: 'すだち農園', members: ['長谷川', '野﨑'] },
];
const defaultUsers: AppUser[] = [
  { id: 'owner-1', name: '石上', role: 'owner' },
  { id: 'worker-1', name: '長谷川', role: 'worker' },
  { id: 'worker-2', name: '野﨑', role: 'worker' },
  { id: 'worker-3', name: '永田', role: 'worker' },
  { id: 'worker-4', name: '大久保', role: 'worker' },
];
const defaultFarms: AppFarm[] = [
  { id: 'farm-1', name: 'すだち農園' },
  { id: 'farm-2', name: '一番ハウス' },
  { id: 'farm-3', name: '三番ハウス' },
];
const defaultJournals: JournalEntry[] = [{ date: '2026-10-10', note: '午後から風が強くなった' }];

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: PropsWithChildren) {
  const [session, setSessionState] = useState(defaultSession);
  const [schedules, setSchedules] = useState(defaultSchedules);
  const [users, setUsers] = useState(defaultUsers);
  const [farms, setFarms] = useState(defaultFarms);
  const [journalEntries, setJournalEntries] = useState(defaultJournals);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(SESSION_KEY), AsyncStorage.getItem(SCHEDULES_KEY), AsyncStorage.getItem(USERS_KEY), AsyncStorage.getItem(FARMS_KEY), AsyncStorage.getItem(JOURNALS_KEY)])
      .then(([storedSession, storedSchedules, storedUsers, storedFarms, storedJournals]) => {
        if (storedSession) setSessionState(JSON.parse(storedSession) as AppSession);
        if (storedSchedules) setSchedules(JSON.parse(storedSchedules) as AppSchedule[]);
        if (storedUsers) setUsers(JSON.parse(storedUsers) as AppUser[]);
        if (storedFarms) setFarms(JSON.parse(storedFarms) as AppFarm[]);
        if (storedJournals) setJournalEntries(JSON.parse(storedJournals) as JournalEntry[]);
      })
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (hydrated) void AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }, [hydrated, session]);

  useEffect(() => {
    if (hydrated) void AsyncStorage.setItem(SCHEDULES_KEY, JSON.stringify(schedules));
  }, [hydrated, schedules]);

  useEffect(() => { if (hydrated) void AsyncStorage.setItem(USERS_KEY, JSON.stringify(users)); }, [hydrated, users]);
  useEffect(() => { if (hydrated) void AsyncStorage.setItem(FARMS_KEY, JSON.stringify(farms)); }, [farms, hydrated]);
  useEffect(() => { if (hydrated) void AsyncStorage.setItem(JOURNALS_KEY, JSON.stringify(journalEntries)); }, [hydrated, journalEntries]);

  const setSession = useCallback((next: AppSession) => {
    const profile = users.find((user) => user.role === next.role && user.name === next.userName);
    setSessionState({ ...next, avatarId: profile?.avatarId });
  }, [users]);
  const updateCurrentProfile = useCallback(({ name, avatarId }: { name: string; avatarId: string }) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    setUsers((items) => items.map((item) => item.role === session.role && item.name === session.userName ? { ...item, name: cleanName, avatarId } : item));
    setSessionState({ ...session, userName: cleanName, avatarId });
  }, [session]);
  const addUser = useCallback((input: Omit<AppUser, 'id'>) => {
    const name = input.name.trim();
    if (!name) return;
    setUsers((items) => items.some((item) => item.role === input.role && item.name === name) ? items : [...items, { ...input, name, id: `${input.role}-${Date.now()}` }]);
  }, []);
  const updateUser = useCallback((id: string, input: Partial<Omit<AppUser, 'id' | 'role'>>) => {
    setUsers((items) => items.map((item) => item.id === id ? { ...item, ...input, name: input.name?.trim() || item.name } : item));
  }, []);
  const deleteUser = useCallback((id: string) => setUsers((items) => items.filter((item) => item.id !== id)), []);
  const addFarm = useCallback((input: Omit<AppFarm, 'id'>) => {
    const name = input.name.trim();
    if (!name) return;
    setFarms((items) => items.some((item) => item.name === name) ? items : [...items, { ...input, name, id: `farm-${Date.now()}` }]);
  }, []);
  const updateFarm = useCallback((id: string, input: Omit<AppFarm, 'id'>) => {
    const name = input.name.trim();
    if (!name) return;
    setFarms((items) => items.map((item) => item.id === id ? { ...input, id, name } : item));
  }, []);
  const deleteFarm = useCallback((id: string) => setFarms((items) => items.filter((item) => item.id !== id)), []);
  const saveJournal = useCallback((entry: JournalEntry) => {
    setJournalEntries((items) => items.some((item) => item.date === entry.date)
      ? items.map((item) => item.date === entry.date ? entry : item)
      : [...items, entry]);
  }, []);

  const schedulesForDate = useCallback((date: string) => (
    schedules.filter((schedule) => schedule.date === date).sort((a, b) => a.start.localeCompare(b.start))
  ), [schedules]);

  const saveSchedule = useCallback((input: ScheduleInput) => {
    const saved: AppSchedule = { ...input, id: input.id ?? `schedule-${Date.now()}` };
    setSchedules((current) => {
      const index = current.findIndex((schedule) => schedule.id === saved.id);
      if (index < 0) return [...current, saved];
      return current.map((schedule) => schedule.id === saved.id ? saved : schedule);
    });
    return saved;
  }, []);

  const value = useMemo(() => ({ session, schedules, users, farms, journalEntries, setSession, updateCurrentProfile, addUser, updateUser, deleteUser, addFarm, updateFarm, deleteFarm, saveJournal, schedulesForDate, saveSchedule }), [addFarm, addUser, deleteFarm, deleteUser, farms, journalEntries, saveJournal, saveSchedule, schedules, schedulesForDate, session, setSession, updateCurrentProfile, updateFarm, updateUser, users]);
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const value = useContext(AppStateContext);
  if (!value) throw new Error('useAppState must be used inside AppStateProvider');
  return value;
}
