import { getMondayOf } from './utils/date.js';

export let AppState = {
  view: 'home',          // 'home' | 'free' | 'admin'
  freeTab:  'today',     // 'today' | 'schedule' | 'demands'
  adminTab: 'calendar',  // 'calendar' | 'team' | 'history' | 'bank'
  members: [],
  tasks: [],             // tarefas alocadas (member_id NOT NULL)
  notices: [],
  absences: [],
  isAdmin: false,
  selectedWeekStart: getMondayOf(new Date()),
  selectedMemberId: null,
};

export function setAppState(partial) {
  Object.assign(AppState, partial);
}
