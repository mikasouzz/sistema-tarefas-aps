import { db } from '../../db.js';
import { AppState, setAppState } from '../../state.js';
import { getMondayOf, toDateStr, todayStr, fmtShort, weekInputVal } from '../../utils/date.js';

const DAY_NAMES  = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
const TYPE_OPTS  = [
  { v:'operacional',  l:'Operacional' },
  { v:'analitica',    l:'Analítica' },
  { v:'estrategia',   l:'Estratégia' },
  { v:'treinamento',  l:'Treinamento' },
  { v:'reuniao',      l:'Reunião' },
  { v:'suporte',      l:'Suporte' },
];
const TYPE_DOT = {
  operacional: 'bg-blue-500',
  analitica:   'bg-violet-500',
  estrategia:  'bg-amber-500',
  treinamento: 'bg-emerald-500',
  reuniao:     'bg-rose-500',
  suporte:     'bg-cyan-500',
};
const TYPE_LABEL  = Object.fromEntries(TYPE_OPTS.map(o => [o.v, o.l]));
const SHIFT_ORDER  = { manha: 0, tarde: 1, livre: 2 };
const SHIFT_HEADER = {
  manha: '<div class="flex items-center gap-1 mt-1.5 first:mt-0 mb-0.5"><i class="fa-solid fa-sun text-amber-400 text-[9px]"></i><span class="text-[9px] font-semibold text-amber-400 uppercase tracking-wide">Manhã</span></div>',
  tarde: '<div class="flex items-center gap-1 mt-1.5 mb-0.5"><i class="fa-solid fa-cloud-sun text-orange-400 text-[9px]"></i><span class="text-[9px] font-semibold text-orange-400 uppercase tracking-wide">Tarde</span></div>',
  livre: '<div class="flex items-center gap-1 mt-1.5 mb-0.5"><i class="fa-solid fa-clock text-teal-400 text-[9px]"></i><span class="text-[9px] font-semibold text-teal-400 uppercase tracking-wide">Livre</span></div>',
};

export const CalendarCtrl = {
  _container: null,
  _cellMemberId: null,
  _cellDate: null,
  _demands: [],
  _selectedDemandId: null,
  _editGroup: false,
  _editGroupId: null,

  init(container) {
    this._container = container;
    this._render();
  },

  _weekDays() {
    const mon = AppState.selectedWeekStart;
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(mon);
      d.setDate(d.getDate() + i);
      return d;
    });
  },

  _render() {
    const { members, tasks, selectedWeekStart } = AppState;
    const active    = members.filter(m => m.active);
    const weekDays  = this._weekDays();
    const weekStart = toDateStr(weekDays[0]);
    const weekEnd   = toDateStr(weekDays[4]);
    const weekTasks = tasks.filter(t => t.scheduled_date >= weekStart && t.scheduled_date <= weekEnd);

    this._container.innerHTML = `
      <div class="flex-1 flex flex-col min-h-0">
      <div class="flex items-center justify-between mb-6 flex-wrap gap-3 shrink-0">
        <h2 class="text-xl font-semibold text-white">Cronograma</h2>
        <div class="flex items-center gap-2">
          <button onclick="CalendarCtrl.shiftWeek(-1)"
            class="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors">
            <i class="fa-solid fa-chevron-left text-xs"></i>
          </button>
          <input type="week" value="${weekInputVal(selectedWeekStart)}"
            onchange="CalendarCtrl.setWeek(this.value)"
            class="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white
                   focus:outline-none focus:border-primary transition-colors">
          <button onclick="CalendarCtrl.shiftWeek(1)"
            class="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors">
            <i class="fa-solid fa-chevron-right text-xs"></i>
          </button>
          <button onclick="CalendarCtrl.goToday()"
            class="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm transition-colors">
            Hoje
          </button>
          <button onclick="CalendarCtrl.exportWeek()"
            class="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm transition-colors flex items-center gap-1.5">
            <i class="fa-solid fa-file-arrow-down text-xs"></i>Exportar
          </button>
        </div>
      </div>

      <div class="flex-1 min-h-0 bg-slate-800 border border-slate-700 rounded-xl overflow-auto">
        <div class="cal-grid">

          <div class="px-4 py-3 border-b border-r border-slate-700 bg-slate-800 sticky top-0 left-0 z-20">
            <span class="text-xs text-slate-500 font-semibold uppercase tracking-wider">Membro</span>
          </div>

          ${weekDays.map((d, i) => {
            const isToday = toDateStr(d) === todayStr();
            return `
              <div class="px-3 py-3 border-b border-l border-slate-700 text-center bg-slate-800 sticky top-0 z-10">
                <p class="text-xs font-semibold ${isToday ? 'text-primary' : 'text-slate-400'}">${DAY_NAMES[i]}</p>
                <p class="text-sm font-medium ${isToday ? 'text-primary' : 'text-white'} mt-0.5">${fmtShort(d)}</p>
              </div>`;
          }).join('')}

          ${active.length === 0
            ? `<div class="col-span-6 py-12 text-center text-slate-500 text-sm">Nenhum membro ativo.</div>`
            : active.map(m => `
                <div class="px-4 py-3 border-t border-r border-slate-700 bg-slate-800/60 sticky left-0 z-10 flex items-center gap-2">
                  <span class="text-sm font-medium ${m.on_vacation ? 'text-slate-400' : 'text-white'} truncate">${m.name}</span>
                  ${m.on_vacation ? '<i class="fa-solid fa-umbrella-beach text-amber-400 text-xs shrink-0" title="De férias"></i>' : ''}
                </div>
                ${weekDays.map(d => {
                  const dateStr  = toDateStr(d);
                  const vacDay   = m.on_vacation && (
                    !m.vacation_start || !m.vacation_end
                      ? true
                      : dateStr >= m.vacation_start && dateStr <= m.vacation_end
                  );
                  const dayTasks = weekTasks
                    .filter(t => t.member_id === m.id && t.scheduled_date === dateStr)
                    .sort((a, b) => {
                      const sd = (SHIFT_ORDER[a.shift] ?? 99) - (SHIFT_ORDER[b.shift] ?? 99);
                      if (sd !== 0) return sd;
                      if (a.priority === 'principal' && b.priority !== 'principal') return -1;
                      if (a.priority !== 'principal' && b.priority === 'principal') return  1;
                      return 0;
                    });
                  const absence  = AppState.absences.find(a => a.member_id === m.id && a.date === dateStr);
                  const absDay   = absence?.shift === 'dia_todo';
                  const absBanner = absence && !absDay
                    ? `<div class="flex items-center gap-1 mb-1.5">
                         <i class="fa-solid fa-user-slash text-rose-500 text-[9px]"></i>
                         <span class="text-[9px] font-semibold text-rose-500 uppercase tracking-wide">Ausente ${absence.shift === 'manha' ? 'manhã' : 'tarde'}</span>
                       </div>`
                    : '';
                  if (vacDay) return `
                    <div class="border-t border-l border-slate-700 p-2 min-h-[80px] relative bg-amber-900/10 cursor-not-allowed">
                      <div class="absolute inset-0 flex items-center justify-center">
                        <i class="fa-solid fa-umbrella-beach text-amber-800/60 text-base"></i>
                      </div>
                    </div>`;
                  if (absDay) return `
                    <div onclick="CalendarCtrl.openCell('${m.id}','${dateStr}')"
                      class="border-t border-l border-slate-700 p-2 min-h-[80px] relative bg-rose-900/10 cursor-pointer hover:bg-rose-900/15 transition-colors">
                      <div class="absolute inset-0 flex flex-col items-center justify-center gap-1 pointer-events-none">
                        <i class="fa-solid fa-user-slash text-rose-800/60 text-base"></i>
                        <span class="text-[9px] text-rose-700/70 font-semibold uppercase tracking-wide">Ausente</span>
                      </div>
                    </div>`;
                  return `
                    <div onclick="CalendarCtrl.openCell('${m.id}','${dateStr}')"
                      class="border-t border-l border-slate-700 p-2 min-h-[80px] cursor-pointer hover:bg-slate-700/40 transition-colors group relative">
                      ${absBanner}
                      ${dayTasks.length === 0
                        ? `<div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                             <i class="fa-solid fa-plus text-slate-500"></i>
                           </div>`
                        : dayTasks.map((t, idx) => `
                            ${t.shift !== (dayTasks[idx - 1]?.shift) ? (SHIFT_HEADER[t.shift] || '') : ''}
                            <div class="flex items-center gap-1.5 mb-1 group/task ${t.status === 'done' ? 'opacity-40' : ''}">
                              <button onclick="event.stopPropagation(); CalendarCtrl.toggleStatus('${t.id}','${t.status}')"
                                class="shrink-0 transition-colors ${t.status === 'done' ? 'text-accent' : 'text-slate-600 hover:text-accent'}">
                                <i class="fa-solid ${t.status === 'done' ? 'fa-circle-check' : 'fa-circle'} text-[10px]"></i>
                              </button>
                              <span class="text-xs text-slate-300 truncate ${t.status === 'done' ? 'line-through' : ''}">
                                ${t.demand_id ? '<i class="fa-solid fa-link text-[8px] text-slate-500 mr-0.5"></i>' : ''}${t.title}
                              </span>
                            </div>`).join('')}
                    </div>`;
                }).join('')}
              `).join('')}
        </div>
      </div>
      </div>`;
  },

  async toggleAbsence(memberId, dateStr, clickedShift) {
    const existing = AppState.absences.find(a => a.member_id === memberId && a.date === dateStr);

    let newShift = null;
    if (!existing) {
      newShift = clickedShift;
    } else if (existing.shift === 'dia_todo') {
      newShift = clickedShift === 'manha' ? 'tarde' : 'manha';
    } else if (existing.shift === clickedShift) {
      newShift = null; // desligar
    } else {
      newShift = 'dia_todo'; // ligar o outro turno também
    }

    if (existing && newShift === null) {
      const { error } = await db.from('tb_aps_absences').delete().eq('id', existing.id);
      if (error) { window.Toast.show('Erro ao remover ausência.', 'error'); return; }
      setAppState({ absences: AppState.absences.filter(a => a.id !== existing.id) });
    } else if (existing) {
      const { error } = await db.from('tb_aps_absences').update({ shift: newShift }).eq('id', existing.id);
      if (error) { window.Toast.show('Erro ao atualizar ausência.', 'error'); return; }
      existing.shift = newShift;
    } else {
      const id = window.App.generateId();
      const { error } = await db.from('tb_aps_absences').insert({ id, member_id: memberId, date: dateStr, shift: newShift });
      if (error) { window.Toast.show('Erro ao registrar ausência.', 'error'); return; }
      AppState.absences.push({ id, member_id: memberId, date: dateStr, shift: newShift });
    }

    this._render();
    if (document.getElementById('cal-modal-body')) this._renderModalList();
  },

  async toggleStatus(id, current) {
    const next = current === 'done' ? 'pending' : 'done';
    const { error } = await db.from('tb_aps_tasks').update({ status: next }).eq('id', id);
    if (error) { window.Toast.show('Erro ao atualizar.', 'error'); return; }
    const task = AppState.tasks.find(t => t.id === id);
    if (task) task.status = next;
    this._render();
    if (document.getElementById('cal-modal-body')) this._renderModalList();
  },

  async completeAll() {
    const pendingIds = AppState.tasks
      .filter(t => t.member_id === this._cellMemberId && t.scheduled_date === this._cellDate && t.status !== 'done')
      .map(t => t.id);
    if (pendingIds.length === 0) return;

    const { error } = await db.from('tb_aps_tasks').update({ status: 'done' }).in('id', pendingIds);
    if (error) { window.Toast.show('Erro ao atualizar.', 'error'); return; }

    pendingIds.forEach(id => {
      const task = AppState.tasks.find(t => t.id === id);
      if (task) task.status = 'done';
    });
    this._render();
    if (document.getElementById('cal-modal-body')) this._renderModalList();
    window.Toast.show('Tarefas concluídas!', 'success');
  },

  shiftWeek(delta) {
    const d = new Date(AppState.selectedWeekStart);
    d.setDate(d.getDate() + delta * 7);
    setAppState({ selectedWeekStart: d });
    this._render();
  },

  goToday() {
    setAppState({ selectedWeekStart: getMondayOf(new Date()) });
    this._render();
  },

  setWeek(val) {
    const [year, week] = val.split('-W').map(Number);
    const jan4 = new Date(year, 0, 4);
    const mon  = new Date(jan4);
    mon.setDate(jan4.getDate() - (jan4.getDay() || 7) + 1 + (week - 1) * 7);
    mon.setHours(0, 0, 0, 0);
    setAppState({ selectedWeekStart: mon });
    this._render();
  },

  // ── Modal ──────────────────────────────────────────────────────────────────

  async openCell(memberId, dateStr) {
    const member = AppState.members.find(m => m.id === memberId);
    if (member?.on_vacation && (
      !member.vacation_start || !member.vacation_end
        ? true
        : dateStr >= member.vacation_start && dateStr <= member.vacation_end
    )) return;

    this._cellMemberId     = memberId;
    this._cellDate         = dateStr;
    this._selectedDemandId = null;

    const [y, mo, d] = dateStr.split('-');
    const dayName = DAY_NAMES[new Date(dateStr + 'T12:00:00').getDay() - 1] || '';

    const { data: demands } = await db
      .from('tb_aps_tasks')
      .select('id, title, demand_category, priority')
      .is('member_id', null)
      .order('demand_category')
      .order('updated_at', { ascending: false });
    this._demands = demands || [];

    document.getElementById('modal-container').innerHTML = `
      <div class="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4"
           onclick="CalendarCtrl._backdropClick(event)">
        <div class="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col"
             onclick="event.stopPropagation()">
          <div class="flex items-start justify-between p-5 border-b border-slate-700 shrink-0">
            <div>
              <h3 class="font-bold text-white">${member?.name}</h3>
              <p class="text-slate-400 text-sm">${dayName}, ${d}/${mo}/${y}</p>
            </div>
            <button onclick="CalendarCtrl.closeCell()"
              class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div id="cal-modal-body" class="overflow-y-auto flex-1"></div>
        </div>
      </div>`;

    this._renderModalList();
  },

  _renderModalList() {
    const body = document.getElementById('cal-modal-body');
    if (!body) return;
    const existing = AppState.tasks.filter(t =>
      t.member_id === this._cellMemberId && t.scheduled_date === this._cellDate
    );
    const absence  = AppState.absences.find(a => a.member_id === this._cellMemberId && a.date === this._cellDate);
    const absManha = absence?.shift === 'manha' || absence?.shift === 'dia_todo';
    const absTarde = absence?.shift === 'tarde' || absence?.shift === 'dia_todo';
    const mid = this._cellMemberId;
    const dt  = this._cellDate;

    body.innerHTML = `
      <div class="p-5 flex flex-col gap-2">
        ${existing.length === 0
          ? `<p class="text-slate-500 text-sm text-center py-6">Nenhuma tarefa neste dia.</p>`
          : `${existing.some(t => t.status !== 'done') ? `
          <button onclick="CalendarCtrl.completeAll()"
            class="w-full flex items-center justify-center gap-2 mb-1 bg-accent/10 hover:bg-accent/20 border border-accent/30
                   text-accent rounded-lg py-2 text-sm font-medium transition-colors">
            <i class="fa-solid fa-check-double text-xs"></i>Concluir todas
          </button>` : ''}` + existing.map(t => {
              const taskReq = AppState.requests?.find(r => r.task_id === t.id);
              return `
              <div class="flex items-center gap-2 bg-slate-700/60 border ${taskReq ? 'border-rose-700/50' : 'border-slate-600'} rounded-lg px-3 py-2.5 ${taskReq ? 'opacity-60' : ''}">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    ${t.demand_id ? '<i class="fa-solid fa-link text-slate-500 text-xs"></i>' : ''}
                    <p class="text-sm text-white truncate ${t.status === 'done' ? 'line-through opacity-50' : ''}">${t.title}</p>
                    ${taskReq ? '<span class="text-xs text-rose-400 flex items-center gap-1"><i class="fa-solid fa-circle-xmark text-[10px]"></i>Remoção solicitada</span>' : ''}
                  </div>
                  <p class="text-xs text-slate-400 mt-0.5">${TYPE_LABEL[t.type] || ''} · ${t.priority === 'principal' ? 'Principal' : 'Secundária'}</p>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                  <button onclick="CalendarCtrl.toggleStatus('${t.id}','${t.status}')"
                    class="w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${t.status === 'done' ? 'text-accent hover:text-slate-400 hover:bg-slate-600' : 'text-slate-400 hover:text-accent hover:bg-slate-600'}">
                    <i class="fa-solid ${t.status === 'done' ? 'fa-circle-check' : 'fa-circle'} text-sm"></i>
                  </button>
                  <button onclick="CalendarCtrl.openEditForm('${t.id}')"
                    class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-600 transition-colors">
                    <i class="fa-solid fa-pen text-xs"></i>
                  </button>
                  <button onclick="CalendarCtrl.deleteTask('${t.id}')"
                    class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-danger hover:bg-slate-600 transition-colors">
                    <i class="fa-solid fa-trash text-xs"></i>
                  </button>
                </div>
              </div>`;
            }).join('')}

        <button onclick="CalendarCtrl.openAddForm()"
          class="w-full flex items-center justify-center gap-2 mt-2 border border-dashed border-slate-600
                 hover:border-primary text-slate-400 hover:text-primary rounded-lg py-2.5 text-sm transition-colors">
          <i class="fa-solid fa-plus text-xs"></i>Adicionar tarefa
        </button>

        <div class="border-t border-slate-700 pt-3 mt-1">
          <p class="text-xs text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <i class="fa-solid fa-user-slash"></i> Ausência
          </p>
          <div class="flex gap-2">
            <button onclick="CalendarCtrl.toggleAbsence('${mid}','${dt}','manha')"
              class="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium border transition-colors
                     ${absManha ? 'bg-rose-900/40 border-rose-700 text-rose-300' : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:border-rose-700 hover:text-rose-400'}">
              <i class="fa-solid fa-sun text-xs"></i> Manhã
            </button>
            <button onclick="CalendarCtrl.toggleAbsence('${mid}','${dt}','tarde')"
              class="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium border transition-colors
                     ${absTarde ? 'bg-rose-900/40 border-rose-700 text-rose-300' : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:border-rose-700 hover:text-rose-400'}">
              <i class="fa-solid fa-cloud-sun text-xs"></i> Tarde
            </button>
          </div>
          ${absManha && absTarde ? `
            <p class="text-xs text-rose-400 text-center mt-1.5 flex items-center justify-center gap-1">
              <i class="fa-solid fa-circle-xmark"></i> Ausente o dia todo
            </p>` : ''}
        </div>
      </div>`;
  },

  openAddForm() {
    this._selectedDemandId = null;
    this._renderModalForm(null);
  },

  openEditForm(taskId) {
    const task = AppState.tasks.find(t => t.id === taskId);
    if (!task) return;
    if (task.group_id) {
      this._showGroupEditConfirm(taskId, task.group_id);
      return;
    }
    this._renderModalForm(taskId, false);
  },

  _showGroupEditConfirm(taskId, groupId) {
    document.getElementById('cal-delete-confirm')?.remove();
    document.getElementById('cal-edit-confirm')?.remove();
    const body = document.getElementById('cal-modal-body');
    if (!body) return;
    const groupCount = AppState.tasks.filter(t => t.group_id === groupId).length;
    const el = document.createElement('div');
    el.id = 'cal-edit-confirm';
    el.className = 'mx-5 mt-4 mb-1 bg-slate-900 border border-violet-700/50 rounded-xl p-4 flex flex-col gap-3';
    el.innerHTML = `
      <div class="flex items-start gap-2">
        <i class="fa-solid fa-pen text-violet-400 mt-0.5 shrink-0 text-sm"></i>
        <div>
          <p class="text-sm text-white font-medium">Este evento faz parte de um grupo</p>
          <p class="text-xs text-slate-400 mt-0.5">${groupCount} tarefa${groupCount !== 1 ? 's' : ''} vinculada${groupCount !== 1 ? 's' : ''} pelo mesmo evento.</p>
        </div>
      </div>
      <div class="flex flex-col gap-2">
        <button onclick="CalendarCtrl._renderModalForm('${taskId}', false)"
          class="w-full px-3 py-2 rounded-lg text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors text-left flex items-center gap-2">
          <i class="fa-solid fa-user text-slate-400 text-xs"></i>Editar só para este membro
        </button>
        <button onclick="CalendarCtrl._renderModalForm('${taskId}', true)"
          class="w-full px-3 py-2 rounded-lg text-sm bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 border border-violet-700/50 transition-colors text-left flex items-center gap-2">
          <i class="fa-solid fa-users text-xs"></i>Editar para todos do grupo (${groupCount})
        </button>
        <button onclick="document.getElementById('cal-edit-confirm')?.remove()"
          class="w-full px-3 py-1.5 rounded-lg text-sm text-slate-500 hover:text-slate-300 transition-colors">
          Cancelar
        </button>
      </div>`;
    body.prepend(el);
  },

  backToList() {
    this._selectedDemandId = null;
    this._renderModalList();
  },

  _renderModalForm(taskId, editGroup = false) {
    const task   = taskId ? AppState.tasks.find(t => t.id === taskId) : null;
    const isEdit = !!task;
    this._editGroup   = isEdit ? editGroup : false;
    this._editGroupId = isEdit && editGroup ? task.group_id : null;
    const body   = document.getElementById('cal-modal-body');
    if (!body) return;

    const title = isEdit
      ? (editGroup
          ? `Editar tarefa <span class="text-xs font-normal text-violet-400 ml-1"><i class="fa-solid fa-users text-[10px]"></i> todos do grupo</span>`
          : 'Editar tarefa')
      : 'Nova tarefa';

    body.innerHTML = `
      <div class="flex items-center gap-3 px-5 py-3 border-b border-slate-700">
        <button onclick="CalendarCtrl.backToList()"
          class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
          <i class="fa-solid fa-arrow-left text-xs"></i>
        </button>
        <p class="text-sm font-semibold text-white">${title}</p>
      </div>
      <div class="p-5">
        ${isEdit ? this._editFormHTML(task) : this._addFormHTML()}
      </div>`;

    if (!isEdit) setTimeout(() => document.getElementById('cal-title')?.focus(), 50);
  },

  _addFormHTML() {
    return `
      <div class="flex bg-slate-700/50 border border-slate-600 rounded-lg p-0.5 mb-4">
        <button id="tab-btn-free" onclick="CalendarCtrl.setTab('free')"
          class="flex-1 py-1.5 rounded-md text-sm font-medium transition-colors bg-slate-600 text-white">
          Tarefa livre
        </button>
        <button id="tab-btn-bank" onclick="CalendarCtrl.setTab('bank')"
          class="flex-1 py-1.5 rounded-md text-sm font-medium transition-colors text-slate-400 hover:text-white">
          Do banco
        </button>
      </div>

      <div id="tab-content-free">
        <form onsubmit="CalendarCtrl.addTask(event)" class="flex flex-col gap-3">
          <input id="cal-title" type="text" required placeholder="Título da tarefa"
            class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white placeholder-slate-500
                   text-sm focus:outline-none focus:border-primary transition-colors">
          ${this._taskFormFields()}
          <button type="submit"
            class="bg-primary hover:bg-violet-600 text-white text-sm font-medium py-2.5 rounded-lg transition-colors mt-1">
            <i class="fa-solid fa-plus mr-1.5"></i>Adicionar tarefa
          </button>
        </form>
      </div>

      <div id="tab-content-bank" class="hidden flex flex-col gap-3">
        ${this._demandListHTML()}
        <div id="bank-assign-form" class="hidden flex flex-col gap-3">
          <div class="flex items-center gap-2 bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2">
            <i class="fa-solid fa-link text-slate-400 text-xs"></i>
            <span class="text-xs text-slate-400">Atribuindo:</span>
            <span id="bank-selected-title" class="text-sm text-white font-medium truncate"></span>
          </div>
          <form onsubmit="CalendarCtrl.addTaskFromBank(event)" class="flex flex-col gap-3">
            ${this._taskFormFields('bank')}
            <button type="submit"
              class="bg-primary hover:bg-violet-600 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
              <i class="fa-solid fa-link mr-1.5"></i>Atribuir demanda
            </button>
          </form>
        </div>
      </div>`;
  },

  _editFormHTML(task) {
    return `
      <form onsubmit="CalendarCtrl.updateTask(event,'${task.id}')" class="flex flex-col gap-3">
        <input id="cal-title" type="text" required value="${task.title.replace(/"/g, '&quot;')}"
          class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white
                 text-sm focus:outline-none focus:border-primary transition-colors">
        ${this._taskFormFields('', task)}
        <button type="submit"
          class="bg-primary hover:bg-violet-600 text-white text-sm font-medium py-2.5 rounded-lg transition-colors mt-1">
          <i class="fa-solid fa-floppy-disk mr-1.5"></i>Salvar alterações
        </button>
      </form>`;
  },

  _taskFormFields(prefix = '', task = null) {
    const pid        = prefix ? `${prefix}-` : '';
    const needTime   = task?.type === 'treinamento' || task?.type === 'reuniao';
    const isNew      = !task;
    const activeMembers = isNew ? AppState.members.filter(m => m.active) : [];
    return `
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs text-slate-400 mb-1">Prioridade</label>
          <select id="${pid}cal-priority"
            class="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-2 text-white text-sm
                   focus:outline-none focus:border-primary transition-colors">
            <option value="principal"  ${task?.priority === 'principal'  ? 'selected' : ''}>Principal</option>
            <option value="secundaria" ${task?.priority === 'secundaria' ? 'selected' : ''}>Secundária</option>
          </select>
        </div>
        <div>
          <label class="block text-xs text-slate-400 mb-1">Turno</label>
          <select id="${pid}cal-shift"
            class="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-2 text-white text-sm
                   focus:outline-none focus:border-primary transition-colors">
            <option value="manha" ${task?.shift === 'manha' ? 'selected' : ''}>Manhã</option>
            <option value="tarde" ${task?.shift === 'tarde' ? 'selected' : ''}>Tarde</option>
            <option value="livre" ${task?.shift === 'livre' ? 'selected' : ''}>Livre</option>
          </select>
        </div>
      </div>
      <div>
        <label class="block text-xs text-slate-400 mb-1">Tipo de demanda</label>
        <select id="${pid}cal-type" onchange="CalendarCtrl.onTypeChange('${pid}')"
          class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm
                 focus:outline-none focus:border-primary transition-colors">
          ${TYPE_OPTS.map(o => `<option value="${o.v}" ${task?.type === o.v ? 'selected' : ''}>${o.l}</option>`).join('')}
        </select>
      </div>
      <div id="${pid}cal-time-wrap" class="${needTime ? '' : 'hidden'}">
        <label class="block text-xs text-slate-400 mb-1">Horário <span class="text-danger">*</span></label>
        <input id="${pid}cal-time" type="time" value="${task?.event_time || ''}"
          class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm
                 focus:outline-none focus:border-primary transition-colors"
          ${needTime ? 'required' : ''}>
      </div>
      ${isNew ? `
      <div id="${pid}cal-members-wrap" class="hidden">
        <div class="flex items-center justify-between mb-1.5">
          <label class="text-xs text-slate-400">Participantes</label>
          <div class="flex gap-2">
            <button type="button" onclick="CalendarCtrl.toggleAllMembers('${pid}', true)"
              class="text-[10px] text-primary hover:text-violet-300 transition-colors">Selecionar todos</button>
            <span class="text-slate-600 text-[10px]">|</span>
            <button type="button" onclick="CalendarCtrl.toggleAllMembers('${pid}', false)"
              class="text-[10px] text-slate-400 hover:text-slate-200 transition-colors">Desmarcar todos</button>
          </div>
        </div>
        <div class="flex flex-col gap-0.5 max-h-36 overflow-y-auto bg-slate-700/50 border border-slate-600 rounded-lg p-1.5">
          ${activeMembers.map(m => `
            <label class="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-600/50 cursor-pointer select-none
                          ${m.id === this._cellMemberId ? 'opacity-60 cursor-default' : ''}">
              <input type="checkbox" value="${m.id}"
                ${m.id === this._cellMemberId ? 'checked disabled' : ''}
                class="accent-primary shrink-0">
              <span class="text-sm text-slate-300 truncate">${m.name}</span>
              ${m.id === this._cellMemberId ? '<span class="text-[10px] text-slate-500 ml-auto shrink-0">este membro</span>' : ''}
            </label>`).join('')}
        </div>
      </div>` : ''}`;
  },

  _demandSection(label, icon, color, items) {
    if (items.length === 0) return '';
    const sorted = [...items].sort((a, b) => {
      if (a.priority === b.priority) return 0;
      return a.priority === 'principal' ? -1 : 1;
    });
    return `
      <div class="mb-2">
        <p class="text-xs text-slate-500 mb-1.5 flex items-center gap-1.5">
          <i class="fa-solid ${icon} ${color}"></i>${label}
        </p>
        <div class="flex flex-col gap-1">
          ${sorted.map(d => {
            const isHigh = d.priority === 'principal';
            return `
            <button type="button" data-demand-id="${d.id}" onclick="CalendarCtrl.selectDemand('${d.id}')"
              class="text-left px-3 py-2 rounded-lg text-sm transition-colors border
                     ${isHigh ? 'text-white' : 'text-slate-300'} border-slate-600 hover:border-primary hover:text-white hover:bg-slate-700/50">
              <span class="flex items-center gap-2">
                ${isHigh ? '<i class="fa-solid fa-star text-amber-400 text-[10px] shrink-0"></i>' : '<i class="fa-regular fa-star text-slate-600 text-[10px] shrink-0"></i>'}
                <span class="truncate">${d.title}</span>
              </span>
            </button>`;
          }).join('')}
        </div>
      </div>`;
  },

  _demandListHTML() {
    const { _demands } = this;
    if (_demands.length === 0) {
      return `<p class="text-slate-500 text-sm text-center py-4">Nenhuma demanda cadastrada no banco.</p>`;
    }
    const reprimidas = _demands.filter(d => d.demand_category === 'reprimida');
    const estudos    = _demands.filter(d => d.demand_category === 'estudo');

    return `
      <input type="text" placeholder="Filtrar demandas…" oninput="CalendarCtrl.filterDemands(this.value)"
        class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm
               placeholder-slate-500 focus:outline-none focus:border-primary transition-colors mb-2">
      <div id="demand-list" class="max-h-48 overflow-y-auto pr-1">
        ${this._demandSection('Demandas Reprimidas', 'fa-triangle-exclamation', 'text-rose-400', reprimidas)}
        ${this._demandSection('Temas de Estudo', 'fa-book-open', 'text-blue-400', estudos)}
      </div>`;
  },

  filterDemands(value) {
    const q        = value.trim().toLowerCase();
    const filtered = q ? this._demands.filter(d => d.title.toLowerCase().includes(q)) : this._demands;
    const reprimidas = filtered.filter(d => d.demand_category === 'reprimida');
    const estudos    = filtered.filter(d => d.demand_category === 'estudo');
    const list = document.getElementById('demand-list');
    if (list) list.innerHTML =
      (this._demandSection('Demandas Reprimidas', 'fa-triangle-exclamation', 'text-rose-400', reprimidas) +
       this._demandSection('Temas de Estudo', 'fa-book-open', 'text-blue-400', estudos)) ||
      `<p class="text-slate-500 text-sm text-center py-3">Nenhum resultado.</p>`;
  },

  setTab(tab) {
    const isFree = tab === 'free';
    document.getElementById('tab-btn-free').className =
      `flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${isFree ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`;
    document.getElementById('tab-btn-bank').className =
      `flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${!isFree ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`;
    document.getElementById('tab-content-free').classList.toggle('hidden', !isFree);
    document.getElementById('tab-content-bank').classList.toggle('hidden', isFree);
  },

  selectDemand(id) {
    this._selectedDemandId = id;
    const demand = this._demands.find(d => d.id === id);
    document.querySelectorAll('[data-demand-id]').forEach(btn => {
      const sel = btn.dataset.demandId === id;
      btn.classList.toggle('border-primary',  sel);
      btn.classList.toggle('bg-primary/20',   sel);
      btn.classList.toggle('text-white',      sel);
      btn.classList.toggle('border-slate-600', !sel);
    });
    const form = document.getElementById('bank-assign-form');
    form.classList.remove('hidden');
    document.getElementById('bank-selected-title').textContent = demand?.title || '';
    if (demand?.priority) {
      const sel = document.getElementById('bank-cal-priority');
      if (sel) sel.value = demand.priority;
    }
  },

  onTypeChange(prefix = '') {
    const type  = document.getElementById(`${prefix}cal-type`)?.value;
    const wrap  = document.getElementById(`${prefix}cal-time-wrap`);
    const input = document.getElementById(`${prefix}cal-time`);
    const needs = type === 'treinamento' || type === 'reuniao';
    wrap?.classList.toggle('hidden', !needs);
    if (input) input.required = needs;
    document.getElementById(`${prefix}cal-members-wrap`)?.classList.toggle('hidden', !needs);
  },

  closeCell() {
    document.getElementById('modal-container').innerHTML = '';
    this._cellMemberId     = null;
    this._cellDate         = null;
    this._selectedDemandId = null;
    this._demands          = [];
  },

  _backdropClick(e) {
    if (e.target === e.currentTarget) this.closeCell();
  },

  _getFormValues(prefix = '') {
    const pid = prefix ? `${prefix}-` : '';
    const type     = document.getElementById(`${pid}cal-type`)?.value;
    const timeWrap = document.getElementById(`${pid}cal-time-wrap`);
    const time     = !timeWrap?.classList.contains('hidden')
      ? document.getElementById(`${pid}cal-time`)?.value
      : null;
    const membersWrap = document.getElementById(`${pid}cal-members-wrap`);
    let memberIds = [this._cellMemberId];
    if (membersWrap && !membersWrap.classList.contains('hidden')) {
      const checked = membersWrap.querySelectorAll('input[type="checkbox"]:checked');
      memberIds = [...new Set([this._cellMemberId, ...Array.from(checked).map(cb => cb.value)])];
    }
    return {
      priority: document.getElementById(`${pid}cal-priority`)?.value,
      shift:    document.getElementById(`${pid}cal-shift`)?.value,
      type,
      time,
      memberIds,
    };
  },

  async addTask(e) {
    e.preventDefault();
    const title = document.getElementById('cal-title').value.trim();
    const { priority, shift, type, time, memberIds } = this._getFormValues();
    if ((type === 'treinamento' || type === 'reuniao') && !time) {
      window.Toast.show('Informe o horário para esse tipo de demanda.', 'warning'); return;
    }
    await this._saveTask({ title, priority, shift, type, time, demandId: null, memberIds });
  },

  async addTaskFromBank(e) {
    e.preventDefault();
    if (!this._selectedDemandId) {
      window.Toast.show('Selecione uma demanda do banco.', 'warning'); return;
    }
    const demand = this._demands.find(d => d.id === this._selectedDemandId);
    const { priority, shift, type, time, memberIds } = this._getFormValues('bank');
    if ((type === 'treinamento' || type === 'reuniao') && !time) {
      window.Toast.show('Informe o horário para esse tipo de demanda.', 'warning'); return;
    }
    await this._saveTask({ title: demand.title, priority, shift, type, time, demandId: this._selectedDemandId, memberIds });
  },

  async _saveTask({ title, priority, shift, type, time, demandId, memberIds }) {
    memberIds = memberIds?.length ? memberIds : [this._cellMemberId];
    const grupoId = memberIds.length > 1 ? window.App.generateId() : null;

    const rows = memberIds.map(mid => ({
      id:             window.App.generateId(),
      title,
      member_id:      mid,
      scheduled_date: this._cellDate,
      priority,
      shift,
      type,
      event_time:     time || null,
      demand_id:      demandId || null,
      group_id:       grupoId,
      status:         'pending',
    }));

    const { error } = await db.from('tb_aps_tasks').insert(rows);
    if (error) { window.Toast.show('Erro ao salvar tarefa.', 'error'); return; }

    const { data } = await db.from('tb_aps_tasks')
      .select('*, tb_aps_members(name, role)')
      .not('member_id', 'is', null)
      .order('scheduled_date');
    setAppState({ tasks: data || [] });

    this._render();
    this._renderModalList();
    window.Toast.show(rows.length > 1 ? `Evento criado para ${rows.length} membros.` : 'Tarefa adicionada.', 'success');
  },

  async updateTask(e, taskId) {
    e.preventDefault();
    const title = document.getElementById('cal-title').value.trim();
    const { priority, shift, type, time } = this._getFormValues();
    if ((type === 'treinamento' || type === 'reuniao') && !time) {
      window.Toast.show('Informe o horário para esse tipo de demanda.', 'warning'); return;
    }
    const patch = { title, priority, shift, type, event_time: time || null };
    const query = this._editGroup && this._editGroupId
      ? db.from('tb_aps_tasks').update(patch).eq('group_id', this._editGroupId)
      : db.from('tb_aps_tasks').update(patch).eq('id', taskId);
    const { error } = await query;
    if (error) { window.Toast.show('Erro ao salvar.', 'error'); return; }

    setAppState({
      tasks: AppState.tasks.map(t =>
        (this._editGroup && this._editGroupId ? t.group_id === this._editGroupId : t.id === taskId)
          ? { ...t, ...patch }
          : t
      ),
    });
    this._render();
    const msg = this._editGroup ? 'Evento atualizado para todos do grupo.' : 'Tarefa atualizada.';
    window.Toast.show(msg, 'success');
    this._renderModalList();
  },

  deleteTask(taskId) {
    const task = AppState.tasks.find(t => t.id === taskId);
    if (task?.group_id) {
      this._showGroupDeleteConfirm(taskId, task.group_id);
      return;
    }
    this._doDeleteSingle(taskId);
  },

  _showGroupDeleteConfirm(taskId, grupoId) {
    document.getElementById('cal-delete-confirm')?.remove();
    const body = document.getElementById('cal-modal-body');
    if (!body) return;
    const groupCount = AppState.tasks.filter(t => t.group_id === grupoId).length;
    const confirm = document.createElement('div');
    confirm.id = 'cal-delete-confirm';
    confirm.className = 'mx-5 mt-4 mb-1 bg-slate-900 border border-rose-700/50 rounded-xl p-4 flex flex-col gap-3';
    confirm.innerHTML = `
      <div class="flex items-start gap-2">
        <i class="fa-solid fa-triangle-exclamation text-rose-400 mt-0.5 shrink-0 text-sm"></i>
        <div>
          <p class="text-sm text-white font-medium">Este evento faz parte de um grupo</p>
          <p class="text-xs text-slate-400 mt-0.5">${groupCount} tarefa${groupCount !== 1 ? 's' : ''} vinculada${groupCount !== 1 ? 's' : ''} pelo mesmo evento.</p>
        </div>
      </div>
      <div class="flex flex-col gap-2">
        <button onclick="CalendarCtrl._doDeleteSingle('${taskId}')"
          class="w-full px-3 py-2 rounded-lg text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors text-left flex items-center gap-2">
          <i class="fa-solid fa-user text-slate-400 text-xs"></i>Excluir só para este membro
        </button>
        <button onclick="CalendarCtrl._doDeleteGroup('${grupoId}')"
          class="w-full px-3 py-2 rounded-lg text-sm bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-700/50 transition-colors text-left flex items-center gap-2">
          <i class="fa-solid fa-users text-xs"></i>Excluir para todos do grupo (${groupCount})
        </button>
        <button onclick="document.getElementById('cal-delete-confirm')?.remove()"
          class="w-full px-3 py-1.5 rounded-lg text-sm text-slate-500 hover:text-slate-300 transition-colors">
          Cancelar
        </button>
      </div>`;
    body.prepend(confirm);
  },

  async _doDeleteSingle(taskId) {
    const { error } = await db.from('tb_aps_tasks').delete().eq('id', taskId);
    if (error) { window.Toast.show('Erro ao excluir.', 'error'); return; }
    setAppState({ tasks: AppState.tasks.filter(t => t.id !== taskId) });
    this._render();
    this._renderModalList();
    window.Toast.show('Tarefa removida.', 'info');
  },

  async _doDeleteGroup(grupoId) {
    const { error } = await db.from('tb_aps_tasks').delete().eq('group_id', grupoId);
    if (error) { window.Toast.show('Erro ao excluir.', 'error'); return; }
    setAppState({ tasks: AppState.tasks.filter(t => t.group_id !== grupoId) });
    this._render();
    this._renderModalList();
    window.Toast.show('Evento removido para todos do grupo.', 'info');
  },

  exportWeek() {
    const weekDays  = this._weekDays();
    const weekStart = toDateStr(weekDays[0]);
    const weekEnd   = toDateStr(weekDays[4]);
    const active    = AppState.members.filter(m => m.active);
    const weekTasks = AppState.tasks.filter(t =>
      t.scheduled_date >= weekStart && t.scheduled_date <= weekEnd
    );
    const win = window.open('', '_blank');
    win.document.write(this._printHTML(weekDays, active, weekTasks));
    win.document.close();
    win.focus();
  },

  _printHTML(weekDays, members, tasks) {
    const fmt = d => { const [,m,day] = toDateStr(d).split('-'); return `${day}/${m}`; };
    const fmtFull = d => { const [y,m,day] = toDateStr(d).split('-'); return `${day}/${m}/${y}`; };
    const DAY_LABEL = ['Seg','Ter','Qua','Qui','Sex'];
    const SHIFTS    = ['manha','tarde','livre'];
    const SHIFT_LABEL = { manha: 'Manhã', tarde: 'Tarde', livre: 'Livre' };
    const TYPE_ABBR = { operacional:'Oper.', analitica:'Analít.', estrategia:'Estrat.', treinamento:'Treino', reuniao:'Reunião', suporte:'Suporte' };
    const TYPE_CLS  = { operacional:'op', analitica:'an', estrategia:'es', treinamento:'tr', reuniao:'re', suporte:'su' };

    const today = toDateStr(new Date());

    const cell = (memberId, day) => {
      const dateStr   = toDateStr(day);
      const dayTasks  = tasks.filter(t => t.member_id === memberId && t.scheduled_date === dateStr);
      if (dayTasks.length === 0) return `<td><span class="empty">—</span></td>`;
      const rows = SHIFTS.flatMap(shift => {
        const st = dayTasks.filter(t => t.shift === shift);
        if (st.length === 0) return [];
        return [
          `<p class="shift-lbl">${SHIFT_LABEL[shift]}</p>`,
          ...st.map(t => {
            const cls = TYPE_CLS[t.type] || 'op';
            const done = t.status === 'done';
            const bold = t.priority === 'principal';
            return `<div class="task">
              <span class="badge ${cls}">${TYPE_ABBR[t.type] || t.type}</span>
              <span class="ttl${done ? ' done' : ''}${bold ? ' bold' : ''}">${t.title}</span>
            </div>`;
          }),
        ];
      });
      return `<td>${rows.join('')}</td>`;
    };

    const rows = members.map(m => `
      <tr>
        <td class="member">${m.name}</td>
        ${weekDays.map(d => cell(m.id, d)).join('')}
      </tr>`).join('');

    const headers = weekDays.map((d, i) => {
      const isToday = toDateStr(d) === today;
      return `<th${isToday ? ' class="today"' : ''}>${DAY_LABEL[i]}<br>${fmt(d)}</th>`;
    }).join('');

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Cronograma ${fmt(weekDays[0])} – ${fmt(weekDays[4])}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,sans-serif;font-size:11px;color:#1e293b;background:#fff;padding:20px}
@page{size:A4 landscape;margin:1cm}
h1{font-size:15px;font-weight:700;color:#0f172a}
.sub{font-size:10px;color:#64748b;margin:3px 0 14px}
table{width:100%;border-collapse:collapse;table-layout:fixed}
th,td{border:1px solid #e2e8f0;padding:5px 6px;vertical-align:top}
th{background:#f8fafc;font-weight:600;text-align:center;color:#475569;font-size:10px;line-height:1.4}
th.today{background:#ede9fe;color:#6d28d9}
td.member{font-weight:600;color:#1e293b;background:#f8fafc;width:90px;vertical-align:middle}
.shift-lbl{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8;margin:5px 0 2px}
.shift-lbl:first-child{margin-top:0}
.task{display:flex;align-items:flex-start;gap:3px;margin-bottom:3px}
.badge{font-size:8px;padding:1px 3px;border-radius:3px;white-space:nowrap;flex-shrink:0;margin-top:1px;font-weight:600}
.ttl{font-size:10px;color:#334155;line-height:1.3}
.ttl.done{text-decoration:line-through;opacity:.45}
.ttl.bold{font-weight:600;color:#0f172a}
.op{background:#dbeafe;color:#1d4ed8}
.an{background:#ede9fe;color:#6d28d9}
.es{background:#fef3c7;color:#92400e}
.tr{background:#d1fae5;color:#065f46}
.re{background:#fce7f3;color:#9d174d}
.su{background:#cffafe;color:#0e7490}
.empty{color:#cbd5e1;font-size:10px}
footer{margin-top:10px;font-size:9px;color:#94a3b8}
button{margin-bottom:14px;padding:6px 14px;background:#6d28d9;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px}
@media print{button{display:none}}
</style>
</head>
<body>
<button onclick="window.print()">Imprimir / Salvar PDF</button>
<h1>Cronograma da Equipe</h1>
<p class="sub">Semana de ${fmt(weekDays[0])} a ${fmt(weekDays[4])} &nbsp;·&nbsp; Gerado em ${fmtFull(new Date())}</p>
<table>
  <thead><tr><th>Membro</th>${headers}</tr></thead>
  <tbody>${rows}</tbody>
</table>
<footer>Sistema de Tarefas APS</footer>
</body>
</html>`;
  },

  toggleAllMembers(pid, select) {
    const wrap = document.getElementById(`${pid}cal-members-wrap`);
    if (!wrap) return;
    wrap.querySelectorAll('input[type="checkbox"]:not([disabled])').forEach(cb => {
      cb.checked = select;
    });
  },
};
window.CalendarCtrl = CalendarCtrl;
