import { getMondayOf } from './utils/date.js';

export let AppState = {
  view: 'home',          // 'home' | 'free' | 'admin'
  freeTab:  'today',     // 'today' | 'schedule' | 'demands'
  adminTab: 'dashboard', // 'dashboard' | 'calendar' | 'team' | 'history' | 'bank'
  members: [],
  tasks: [],             // tarefas alocadas (member_id NOT NULL)
  notices: [],
  absences: [],
  requests: [],
  insertRequests: [],
  gameScores: [],
  oneOnOnes: [],
  isAdmin: false,
  selectedWeekStart: getMondayOf(new Date()),
  selectedMemberId: null,
};

export function setAppState(partial) {
  Object.assign(AppState, partial);
}
