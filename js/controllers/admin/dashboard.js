import { AppState } from '../../state.js';
import { todayStr, toDateStr } from '../../utils/date.js';

function fmtDate(str) {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}

function fmtShort(str) {
  if (!str) return '';
  const [, m, d] = str.split('-');
  return `${d}/${m}`;
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

const TYPE_LABEL  = { reuniao: 'Reunião', treinamento: 'Treinamento' };
const DAY_NAMES   = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const AdminDashCtrl = {
  _container: null,

  init(container) {
    this._container = container;
    this._render();
  },

  _render() {
    const today      = todayStr();
    const dayOfWeek  = new Date(today + 'T12:00:00').getDay();
    const isWeekday  = dayOfWeek >= 1 && dayOfWeek <= 5;
    const in7days    = addDays(today, 7);

    const { members, tasks, absences, requests } = AppState;
    const active = members.filter(m => m.active);

    // Progresso do dia
    const todayTasks = tasks.filter(t => t.scheduled_date === today);
    const doneTasks  = todayTasks.filter(t => t.status === 'done');
    const progress   = todayTasks.length > 0 ? Math.round((doneTasks.length / todayTasks.length) * 100) : 0;

    // Ausentes hoje
    const absentToday = absences.filter(a => a.date === today);

    // Sem tarefas hoje (só seg-sex, exclui férias e ausentes dia todo)
    const vacIds       = active.filter(m => m.on_vacation && m.vacation_start && m.vacation_end
                           && today >= m.vacation_start && today <= m.vacation_end).map(m => m.id);
    const absentAllDay = absentToday.filter(a => a.shift === 'dia_todo').map(a => a.member_id);
    const withTasks    = new Set(todayTasks.map(t => t.member_id));
    const noTasksToday = isWeekday
      ? active.filter(m => !withTasks.has(m.id) && !vacIds.includes(m.id) && !absentAllDay.includes(m.id))
      : [];

    // Férias
    const onVacation = members.filter(m => m.on_vacation);
    const vacActive  = onVacation.filter(m => !m.vacation_end || m.vacation_end >= today);
    const vacExpired = onVacation.filter(m => m.vacation_end && m.vacation_end < today);

    // Tarefas pendentes de dias anteriores
    const overdue = tasks.filter(t => t.scheduled_date < today && t.status === 'pending');
    const overdueByMember = {};
    overdue.forEach(t => {
      if (!overdueByMember[t.member_id])
        overdueByMember[t.member_id] = { name: t.tb_aps_members?.name || '—', tasks: [] };
      overdueByMember[t.member_id].tasks.push(t);
    });

    // Próximas reuniões e treinamentos (7 dias)
    const upcoming = tasks
      .filter(t => (t.type === 'reuniao' || t.type === 'treinamento')
        && t.scheduled_date >= today && t.scheduled_date <= in7days)
      .sort((a, b) => {
        if (a.scheduled_date !== b.scheduled_date) return a.scheduled_date.localeCompare(b.scheduled_date);
        return (a.event_time || '00:00').localeCompare(b.event_time || '00:00');
      });

    this._container.innerHTML = `
      <div class="flex-1 flex flex-col min-h-0">
        <div class="mb-6 shrink-0 flex items-center justify-between">
          <div>
            <h2 class="text-xl font-semibold text-white">Visão Geral</h2>
            <p class="text-slate-400 text-sm mt-1">${DAY_NAMES[dayOfWeek]}, ${fmtDate(today)}</p>
          </div>
          <button onclick="AdminDashCtrl._render()"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-white text-sm transition-colors">
            <i class="fa-solid fa-rotate-right text-xs"></i> Atualizar
          </button>
        </div>

        <div class="flex-1 min-h-0 overflow-y-auto">
          <div class="flex flex-col gap-4 pb-4">
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
              ${this._cardProgress(todayTasks, doneTasks, progress, isWeekday)}
              ${this._cardNoTasks(noTasksToday, isWeekday)}
              ${this._cardRequests(requests)}
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
              ${this._cardAbsent(absentToday, active)}
              ${this._cardVacation(vacActive, vacExpired)}
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
              ${this._cardOverdue(overdueByMember)}
              ${this._cardUpcoming(upcoming)}
            </div>
          </div>
        </div>
      </div>`;
  },

  _card(icon, iconColor, title, badge, content) {
    return `
      <div class="bg-slate-800 border border-slate-700 rounded-xl p-5 flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <i class="fa-solid ${icon} ${iconColor}"></i>
            <h3 class="font-semibold text-white text-sm">${title}</h3>
          </div>
          ${badge ? `<span class="text-xs px-2 py-0.5 rounded-full ${badge.cls}">${badge.label}</span>` : ''}
        </div>
        ${content}
      </div>`;
  },

  _empty(msg) {
    return `<p class="text-slate-500 text-sm flex items-center gap-1.5">
              <i class="fa-solid fa-circle-check text-emerald-500/50"></i>${msg}
            </p>`;
  },

  _cardProgress(todayTasks, doneTasks, progress, isWeekday) {
    const content = !isWeekday
      ? `<p class="text-slate-500 text-sm">Final de semana — sem tarefas programadas.</p>`
      : todayTasks.length === 0
        ? `<p class="text-slate-500 text-sm">Nenhuma tarefa programada para hoje.</p>`
        : `<div>
             <div class="flex justify-between text-xs text-slate-400 mb-1.5">
               <span>${doneTasks.length} concluída${doneTasks.length !== 1 ? 's' : ''} de ${todayTasks.length}</span>
               <span>${progress}%</span>
             </div>
             <div class="w-full bg-slate-700 rounded-full h-2">
               <div class="bg-accent rounded-full h-2 transition-all" style="width:${progress}%"></div>
             </div>
           </div>`;
    const badge = todayTasks.length > 0
      ? { cls: progress === 100
            ? 'bg-emerald-900/40 border border-emerald-700 text-emerald-300'
            : 'bg-slate-700 text-slate-400',
          label: `${progress}%` }
      : null;
    return this._card('fa-gauge', 'text-primary', 'Progresso do Dia', badge, content);
  },

  _cardRequests(requests) {
    const content = requests.length === 0
      ? this._empty('Nenhuma solicitação pendente.')
      : `<div class="flex items-center justify-between">
           <div>
             <p class="text-2xl font-bold text-white">${requests.length}</p>
             <p class="text-slate-400 text-xs mt-0.5">solicitaç${requests.length !== 1 ? 'ões' : 'ão'} aguardando resposta</p>
           </div>
           <button onclick="App.navigate('admin','requests')"
             class="text-xs px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors">
             Ver solicitações
           </button>
         </div>`;
    return this._card('fa-inbox', 'text-rose-400', 'Solicitações', null, content);
  },

  _cardAbsent(absentToday, active) {
    const SHIFT_LABEL = { manha: 'Manhã', tarde: 'Tarde', dia_todo: 'Dia todo' };
    const rows = absentToday.map(a => {
      const m = active.find(m => m.id === a.member_id);
      return m ? `
        <div class="flex items-center justify-between py-1.5 border-b border-slate-700/50 last:border-0">
          <span class="text-sm text-slate-300">${m.name}</span>
          <span class="text-xs text-rose-400">${SHIFT_LABEL[a.shift]}</span>
        </div>` : '';
    }).join('');
    const content = absentToday.length === 0
      ? this._empty('Ninguém ausente hoje.')
      : `<div>${rows}</div>`;
    const badge = absentToday.length > 0
      ? { cls: 'bg-rose-900/40 border border-rose-700 text-rose-300', label: absentToday.length }
      : null;
    return this._card('fa-user-slash', 'text-rose-400', 'Ausentes Hoje', badge, content);
  },

  _cardNoTasks(noTasksToday, isWeekday) {
    const content = !isWeekday
      ? `<p class="text-slate-500 text-sm">Final de semana.</p>`
      : noTasksToday.length === 0
        ? this._empty('Todos têm tarefas hoje.')
        : `<div>${noTasksToday.map(m => `
             <div class="py-1.5 border-b border-slate-700/50 last:border-0">
               <span class="text-sm text-slate-300">${m.name}</span>
             </div>`).join('')}</div>`;
    const badge = isWeekday && noTasksToday.length > 0
      ? { cls: 'bg-amber-900/40 border border-amber-700 text-amber-300', label: noTasksToday.length }
      : null;
    return this._card('fa-calendar-xmark', 'text-amber-400', 'Sem Tarefas Hoje', badge, content);
  },

  _cardVacation(vacActive, vacExpired) {
    const rows = [
      ...vacActive.map(m => `
        <div class="flex items-center justify-between py-1.5 border-b border-slate-700/50 last:border-0">
          <span class="text-sm text-slate-300">${m.name}</span>
          <span class="text-xs text-amber-400">
            ${m.vacation_start && m.vacation_end ? `${fmtShort(m.vacation_start)}–${fmtShort(m.vacation_end)}` : '—'}
          </span>
        </div>`),
      ...vacExpired.map(m => `
        <div class="flex items-center justify-between py-1.5 border-b border-slate-700/50 last:border-0">
          <span class="text-sm text-slate-300">${m.name}</span>
          <span class="text-xs text-orange-400 flex items-center gap-1">
            <i class="fa-solid fa-triangle-exclamation text-[10px]"></i>
            Encerradas ${m.vacation_end ? fmtShort(m.vacation_end) : ''}
          </span>
        </div>`),
    ].join('');
    const total = vacActive.length + vacExpired.length;
    const content = total === 0
      ? this._empty('Ninguém de férias.')
      : `<div>${rows}</div>`;
    const badge = total > 0
      ? { cls: vacExpired.length > 0
            ? 'bg-orange-900/40 border border-orange-600 text-orange-300'
            : 'bg-amber-900/40 border border-amber-700 text-amber-300',
          label: total }
      : null;
    return this._card('fa-umbrella-beach', 'text-amber-400', 'Férias', badge, content);
  },

  _cardOverdue(overdueByMember) {
    const entries = Object.values(overdueByMember);
    const total   = entries.reduce((s, e) => s + e.tasks.length, 0);
    const content = entries.length === 0
      ? this._empty('Nenhuma tarefa em atraso.')
      : `<div class="flex flex-col gap-3">
           ${entries.map(e => `
             <div>
               <p class="text-xs font-semibold text-slate-400 mb-1">
                 ${e.name} <span class="text-slate-600">(${e.tasks.length})</span>
               </p>
               ${e.tasks.map(t => `
                 <div class="flex items-center gap-1.5 py-0.5">
                   <i class="fa-solid fa-circle text-[5px] text-slate-600 shrink-0"></i>
                   <span class="text-xs text-slate-300 truncate">${t.title}</span>
                   <span class="text-[10px] text-slate-500 shrink-0 ml-auto">${fmtShort(t.scheduled_date)}</span>
                 </div>`).join('')}
             </div>`).join('')}
         </div>`;
    const badge = total > 0
      ? { cls: 'bg-rose-900/40 border border-rose-700 text-rose-300', label: total }
      : null;
    return this._card('fa-circle-exclamation', 'text-rose-400', 'Pendentes de Dias Anteriores', badge, content);
  },

  _cardUpcoming(upcoming) {
    const content = upcoming.length === 0
      ? this._empty('Nenhuma reunião ou treinamento nos próximos 7 dias.')
      : `<div class="flex flex-col">
           ${upcoming.map(t => `
             <div class="flex items-center gap-3 py-2 border-b border-slate-700/50 last:border-0">
               <div class="shrink-0 text-center w-10">
                 <p class="text-xs font-bold text-primary">${fmtShort(t.scheduled_date)}</p>
                 ${t.event_time ? `<p class="text-[10px] text-slate-500">${t.event_time}</p>` : ''}
               </div>
               <div class="flex-1 min-w-0">
                 <p class="text-sm text-slate-200 truncate">${t.title}</p>
                 <p class="text-[10px] text-slate-500">${t.tb_aps_members?.name || '—'}</p>
               </div>
               <span class="shrink-0 text-[10px] px-1.5 py-0.5 rounded font-medium
                            ${t.type === 'reuniao' ? 'bg-violet-900/40 text-violet-300' : 'bg-teal-900/40 text-teal-300'}">
                 ${TYPE_LABEL[t.type]}
               </span>
             </div>`).join('')}
         </div>`;
    const badge = upcoming.length > 0
      ? { cls: 'bg-slate-700 text-slate-400', label: upcoming.length }
      : null;
    return this._card('fa-calendar-star', 'text-primary', 'Próximas Reuniões e Treinamentos', badge, content);
  },
};
window.AdminDashCtrl = AdminDashCtrl;
