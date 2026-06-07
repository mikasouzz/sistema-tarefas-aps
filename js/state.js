function getMondayOf(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export let AppState = {
  view: 'home',          // 'home' | 'free' | 'admin'
  freeTab:  'today',     // 'today' | 'schedule' | 'demands'
  adminTab: 'calendar',  // 'calendar' | 'team' | 'history' | 'bank'
  members: [],
  tasks: [],             // tarefas alocadas (member_id NOT NULL)
  isAdmin: false,
  selectedWeekStart: getMondayOf(new Date()),
  selectedMemberId: null,
};

export function setAppState(partial) {
  Object.assign(AppState, partial);
}
