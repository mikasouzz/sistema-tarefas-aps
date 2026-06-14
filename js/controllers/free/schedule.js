import { db } from '../../db.js';
import { AppState, setAppState } from '../../state.js';
import { getMondayOf, toDateStr, todayStr, fmtShort, weekInputVal } from '../../utils/date.js';

const DAY_NAMES  = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
const TYPE_LABEL = { operacional:'Operacional', analitica:'Analítica', estrategia:'Estratégia', treinamento:'Treinamento', reuniao:'Reunião' };
const SHIFT_BADGE = {
  manha: '<span class="inline-flex items-center gap-1 px-1 py-px rounded font-medium bg-amber-400/20 text-amber-400"><i class="fa-solid fa-sun text-xs"></i>Manhã</span>',
  tarde: '<span class="inline-flex items-center gap-1 px-1 py-px rounded font-medium bg-orange-400/20 text-orange-400"><i class="fa-solid fa-cloud-sun text-xs"></i>Tarde</span>',
  livre: '<span class="inline-flex items-center gap-1 px-1 py-px rounded font-medium bg-teal-400/20 text-teal-400"><i class="fa-solid fa-clock text-xs"></i>Livre</span>',
};

function getWeekDays(monday) {
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
}

export const ScheduleCtrl = {
  _container: null,
  _weekStart: getMondayOf(new Date()),
  _refreshing: false,

  init(container) {
    this._container = container;
    this._render();
  },

  _render() {
    const { members, tasks } = AppState;
    const active    = members.filter(m => m.active);
    const weekDays  = getWeekDays(this._weekStart);
    const weekStart = toDateStr(weekDays[0]);
    const weekEnd   = toDateStr(weekDays[4]);
    const { selectedMemberId } = AppState;

    this._container.innerHTML = `
      <div class="flex gap-4 flex-col h-full">

        <!-- Week nav bar (mesmo padrão do calendário admin) -->
        <div class="flex items-center justify-between gap-3 flex-wrap shrink-0">
          <div class="flex items-center gap-2">
            <button onclick="ScheduleCtrl.shiftWeek(-1)"
              class="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors">
              <i class="fa-solid fa-chevron-left text-xs"></i>
            </button>
            <input type="week" value="${weekInputVal(this._weekStart)}"
              onchange="ScheduleCtrl.setWeek(this.value)"
              class="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white
                     focus:outline-none focus:border-primary transition-colors">
            <button onclick="ScheduleCtrl.shiftWeek(1)"
              class="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors">
              <i class="fa-solid fa-chevron-right text-xs"></i>
            </button>
            <button onclick="ScheduleCtrl.goToday()"
              class="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm transition-colors">
              Hoje
            </button>
          </div>

          <button onclick="ScheduleCtrl.refresh()" id="schedule-refresh-btn"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-white text-sm transition-colors">
            <i class="fa-solid fa-rotate-right text-xs ${this._refreshing ? 'fa-spin' : ''}"></i>
            Atualizar
          </button>
        </div>

        <!-- Main split view -->
        <div class="flex gap-4 flex-1 min-h-0">

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
                             ${selectedMemberId === m.id ? 'bg-primary text-white' : 'text-slate-300 hover:bg-slate-700'}">
                      ${m.name}
                    </button>`).join('')}
            </div>
          </div>

          <!-- Schedule panel -->
          <div class="flex-1 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden flex flex-col min-w-0">
            ${selectedMemberId
              ? this._scheduleHTML(selectedMemberId, weekDays, tasks, weekStart, weekEnd)
              : `<div class="flex-1 flex items-center justify-center text-slate-500">
                  <div class="text-center">
                    <i class="fa-solid fa-hand-pointer text-4xl mb-3 block opacity-30"></i>
                    <p>Selecione um membro para ver o cronograma.</p>
                  </div>
                </div>`}
          </div>

        </div>
      </div>`;
  },

  _scheduleHTML(memberId, weekDays, tasks, weekStart, weekEnd) {
    const member = AppState.members.find(m => m.id === memberId);
    const memberTasks = tasks.filter(t =>
      t.member_id === memberId &&
      t.scheduled_date >= weekStart &&
      t.scheduled_date <= weekEnd
    );
    const today = todayStr();

    const cols = weekDays.map((day, i) => {
      const dateStr  = toDateStr(day);
      const isToday  = dateStr === today;
      const SHIFT_ORDER = { manha: 0, tarde: 1, livre: 2 };
      const dayTasks = memberTasks
        .filter(t => t.scheduled_date === dateStr)
        .sort((a, b) => {
          const shiftDiff = (SHIFT_ORDER[a.shift] ?? 99) - (SHIFT_ORDER[b.shift] ?? 99);
          if (shiftDiff !== 0) return shiftDiff;
          if (a.priority === 'principal' && b.priority !== 'principal') return -1;
          if (a.priority !== 'principal' && b.priority === 'principal') return  1;
          return 0;
        });

      return `
        <div class="flex flex-col gap-2 min-w-0">
          <div class="text-center pb-2 border-b border-slate-700">
            <p class="text-xs font-semibold ${isToday ? 'text-primary' : 'text-slate-400'}">${DAY_NAMES[i]}</p>
            <p class="text-sm font-medium ${isToday ? 'text-primary' : 'text-white'} mt-0.5">${fmtShort(day)}</p>
          </div>
          ${dayTasks.length === 0
            ? '<p class="text-slate-600 text-xs text-center py-2">—</p>'
            : dayTasks.map(t => this._miniCard(t)).join('')}
        </div>`;
    }).join('');

    return `
      <div class="p-4 border-b border-slate-700 shrink-0 flex items-center justify-between">
        <div>
          <p class="font-semibold text-white">${member?.name || ''}</p>
          <p class="text-slate-400 text-xs mt-0.5">
            ${fmtShort(weekDays[0])} — ${fmtShort(weekDays[4])} ·
            ${memberTasks.length} tarefa${memberTasks.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
      <div class="flex-1 overflow-auto p-4">
        <div class="grid gap-4" style="grid-template-columns:repeat(5,1fr);min-width:500px">
          ${cols}
        </div>
      </div>`;
  },

  _miniCard(t) {
    const done        = t.status === 'done';
    const req         = AppState.requests?.find(r => r.task_id === t.id);
    const hasTime     = (t.type === 'treinamento' || t.type === 'reuniao') && t.event_time;
    const isPrincipal = t.priority === 'principal';
    return `
      <div class="bg-slate-700/60 border border-slate-600 rounded-lg p-2 text-xs
                  ${done || req ? 'opacity-50' : ''} ${isPrincipal ? 'border-l-2 border-l-violet-500' : ''}">
        <div class="flex items-start justify-between gap-1">
          <span class="text-slate-200 leading-tight ${done ? 'line-through text-slate-500' : ''}">${t.title}</span>
          ${SHIFT_BADGE[t.shift] || ''}
        </div>
        <div class="mt-1">
          <span class="inline-block px-1 py-px rounded font-medium ${isPrincipal ? 'bg-violet-900/60 text-violet-300' : 'bg-slate-600/60 text-slate-400'}">
            ${isPrincipal ? 'Principal' : 'Secundária'}
          </span>
        </div>
        ${hasTime ? `
          <button onclick="ScheduleCtrl.showTime('${t.event_time}','${TYPE_LABEL[t.type]}')"
            class="mt-1 text-warning hover:text-amber-300 transition-colors" title="Ver horário">
            <i class="fa-solid fa-star"></i>
          </button>` : ''}
        ${done ? '<span class="mt-1 block text-accent"><i class="fa-solid fa-circle-check text-xs"></i> Concluída</span>' : ''}
        <div class="border-t border-slate-600/50 mt-2 pt-1.5 flex justify-end">
          ${req
            ? `<span class="text-rose-400 flex items-center gap-0.5">
                 <i class="fa-solid fa-circle-xmark text-[9px]"></i> Aguardando supervisão
               </span>`
            : `<button onclick="ScheduleCtrl.handleRequest('${t.id}')"
                 class="text-slate-500 hover:text-rose-400 flex items-center gap-0.5 transition-colors">
                 <i class="fa-solid fa-circle-xmark text-[9px]"></i> Solicitar remoção
               </button>`}
        </div>
      </div>`;
  },

  handleRequest(taskId) {
    if (AppState.requests?.find(r => r.task_id === taskId)) {
      window.Toast.show('Já existe uma solicitação pendente para esta tarefa.', 'info', 4000);
      return;
    }
    const task = AppState.tasks.find(t => t.id === taskId);
    if (task) this._openRequestModal(task);
  },

  _openRequestModal(task) {
    const memberName = AppState.members.find(m => m.id === task.member_id)?.name || '—';
    document.getElementById('modal-container').innerHTML = `
      <div class="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4"
           onclick="ScheduleCtrl._reqBackdrop(event)">
        <div class="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl"
             onclick="event.stopPropagation()">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-bold text-white">Solicitar remoção</h3>
            <button onclick="ScheduleCtrl._closeReqModal()"
              class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div class="bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 mb-4">
            <p class="text-xs text-slate-500 mb-0.5">Tarefa</p>
            <p class="text-sm text-white font-medium">${task.title}</p>
          </div>
          <form onsubmit="ScheduleCtrl._submitRequest(event,'${task.id}','${memberName}','${task.title.replace(/'/g, '&#39;')}')">
            <div class="mb-4">
              <label class="block text-sm text-slate-400 mb-1.5">Justificativa</label>
              <textarea id="req-justification" required rows="4"
                placeholder="Descreva o motivo pelo qual a tarefa não pôde ser realizada…"
                class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white placeholder-slate-500
                       focus:outline-none focus:border-primary transition-colors resize-none text-sm"></textarea>
            </div>
            <div class="flex gap-3">
              <button type="button" onclick="ScheduleCtrl._closeReqModal()"
                class="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
                Cancelar
              </button>
              <button type="submit"
                class="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
                Enviar solicitação
              </button>
            </div>
          </form>
        </div>
      </div>`;
    setTimeout(() => document.getElementById('req-justification')?.focus(), 50);
  },

  _closeReqModal() { document.getElementById('modal-container').innerHTML = ''; },
  _reqBackdrop(e)  { if (e.target === e.currentTarget) this._closeReqModal(); },

  async _submitRequest(e, taskId, memberName, taskTitle) {
    e.preventDefault();
    const justification = document.getElementById('req-justification').value.trim();
    const id            = window.App.generateId();

    const { error } = await db.from('tb_aps_task_requests').insert({
      id, task_id: taskId, task_title: taskTitle, member_name: memberName, justification,
    });
    if (error) { window.Toast.show('Erro ao enviar solicitação.', 'error'); return; }

    setAppState({
      requests: [...AppState.requests, {
        id, task_id: taskId, task_title: taskTitle,
        member_name: memberName, justification,
        created_at: new Date().toISOString(),
      }],
    });
    this._closeReqModal();
    this._render();
    window.Toast.show('Solicitação enviada para a supervisão.', 'success');
  },

  selectMember(id) {
    setAppState({ selectedMemberId: id });
    this._render();
  },

  shiftWeek(delta) {
    const d = new Date(this._weekStart);
    d.setDate(d.getDate() + delta * 7);
    this._weekStart = d;
    this._render();
  },

  goToday() {
    this._weekStart = getMondayOf(new Date());
    this._render();
  },

  setWeek(val) {
    const [year, week] = val.split('-W').map(Number);
    const jan4 = new Date(year, 0, 4);
    const mon  = new Date(jan4);
    mon.setDate(jan4.getDate() - (jan4.getDay() || 7) + 1 + (week - 1) * 7);
    mon.setHours(0, 0, 0, 0);
    this._weekStart = mon;
    this._render();
  },

  async refresh() {
    if (this._refreshing) return;
    this._refreshing = true;
    const btn = document.getElementById('schedule-refresh-btn');
    if (btn) btn.innerHTML = '<i class="fa-solid fa-rotate-right fa-spin text-xs"></i> Atualizando…';
    await window.App.loadData();
    this._refreshing = false;
    this._render();
    window.Toast.show('Dados atualizados.', 'success');
  },

  showTime(time, label) {
    window.Toast.show(`${label} às ${time}`, 'warning', 5000);
  },
};
window.ScheduleCtrl = ScheduleCtrl;
