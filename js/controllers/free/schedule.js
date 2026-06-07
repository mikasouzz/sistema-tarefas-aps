import { AppState, setAppState } from '../../state.js';

const DAY_NAMES  = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
const TYPE_LABEL = { operacional:'Operacional', analitica:'Analítica', estrategia:'Estratégia', treinamento:'Treinamento', reuniao:'Reunião' };
const SHIFT_BADGE = {
  manha: '<span class="text-amber-400 font-bold text-xs">M</span>',
  tarde: '<span class="text-indigo-400 font-bold text-xs">T</span>',
  livre: '<span class="text-teal-400  font-bold text-xs">L</span>',
};

function getWeekDays(monday) {
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
}
function toDateStr(d) {
  return d.toISOString().split('T')[0];
}
function fmtShort(d) {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export const ScheduleCtrl = {
  _container: null,

  init(container) {
    this._container = container;
    this._render();
  },

  _render() {
    const { members, tasks, selectedMemberId, selectedWeekStart } = AppState;
    const active  = members.filter(m => m.active);
    const selId   = selectedMemberId;
    const weekDays = getWeekDays(selectedWeekStart);

    this._container.innerHTML = `
      <div class="flex gap-4 h-[calc(100vh-130px)]">

        <!-- Member list -->
        <div class="w-44 shrink-0 bg-slate-800 border border-slate-700 rounded-xl overflow-y-auto">
          <div class="p-3 border-b border-slate-700">
            <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Equipe</p>
          </div>
          <div class="p-2 flex flex-col gap-1">
            ${active.length === 0
              ? '<p class="text-slate-500 text-sm p-2">Sem membros.</p>'
              : active.map(m => `
                <button onclick="ScheduleCtrl.selectMember('${m.id}')"
                  class="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors
                         ${selId === m.id ? 'bg-primary text-white' : 'text-slate-300 hover:bg-slate-700'}">
                  ${m.name}
                </button>`).join('')}
          </div>
        </div>

        <!-- Schedule area -->
        <div class="flex-1 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden flex flex-col">
          ${selId ? this._scheduleHTML(selId, weekDays, tasks) : `
            <div class="flex-1 flex items-center justify-center text-slate-500">
              <div class="text-center">
                <i class="fa-solid fa-hand-pointer text-4xl mb-3 block opacity-30"></i>
                <p>Selecione um membro para ver o cronograma.</p>
              </div>
            </div>`}
        </div>

      </div>`;
  },

  _scheduleHTML(memberId, weekDays, tasks) {
    const member = AppState.members.find(m => m.id === memberId);
    const weekStart = toDateStr(weekDays[0]);
    const weekEnd   = toDateStr(weekDays[4]);

    const memberTasks = tasks.filter(t =>
      t.member_id === memberId &&
      t.scheduled_date >= weekStart &&
      t.scheduled_date <= weekEnd
    );

    const cols = weekDays.map((day, i) => {
      const dateStr = toDateStr(day);
      const dayTasks = memberTasks
        .filter(t => t.scheduled_date === dateStr)
        .sort((a, b) => a.priority === 'principal' ? -1 : 1);

      return `
        <div class="flex flex-col gap-2 min-w-0">
          <div class="text-center pb-2 border-b border-slate-700">
            <p class="text-xs font-semibold text-slate-400">${DAY_NAMES[i]}</p>
            <p class="text-sm font-medium text-white mt-0.5">${fmtShort(day)}</p>
          </div>
          ${dayTasks.length === 0
            ? '<p class="text-slate-600 text-xs text-center py-2">—</p>'
            : dayTasks.map(t => this._miniCard(t)).join('')}
        </div>`;
    }).join('');

    return `
      <div class="p-4 border-b border-slate-700 flex items-center justify-between">
        <div>
          <p class="font-semibold text-white">${member?.name || ''}</p>
          <p class="text-slate-400 text-xs mt-0.5">Semana ${fmtShort(weekDays[0])} — ${fmtShort(weekDays[4])}</p>
        </div>
      </div>
      <div class="flex-1 overflow-auto p-4">
        <div class="grid gap-4" style="grid-template-columns: repeat(5,1fr); min-width:600px">
          ${cols}
        </div>
      </div>`;
  },

  _miniCard(t) {
    const done   = t.status === 'done';
    const hasTime = (t.type === 'treinamento' || t.type === 'reuniao') && t.event_time;
    return `
      <div class="bg-slate-700/60 border border-slate-600 rounded-lg p-2 text-xs ${done ? 'opacity-50' : ''}">
        <div class="flex items-start justify-between gap-1">
          <span class="text-slate-200 leading-tight ${done ? 'line-through text-slate-500' : ''}">${t.title}</span>
          ${SHIFT_BADGE[t.shift] || ''}
        </div>
        ${hasTime ? `
          <button onclick="ScheduleCtrl.showTime('${t.event_time}','${TYPE_LABEL[t.type]}')"
            class="mt-1 text-warning hover:text-amber-300 transition-colors" title="Ver horário">
            <i class="fa-solid fa-star"></i>
          </button>` : ''}
        ${done ? '<span class="mt-1 block text-accent"><i class="fa-solid fa-circle-check text-xs"></i> Concluída</span>' : ''}
      </div>`;
  },

  selectMember(id) {
    setAppState({ selectedMemberId: id });
    this._render();
  },

  showTime(time, label) {
    window.Toast.show(`${label} às ${time}`, 'warning', 5000);
  },
};
window.ScheduleCtrl = ScheduleCtrl;
