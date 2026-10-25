import { db } from '../../db.js';
import { AppState, setAppState } from '../../state.js';
import { getMondayOf, toDateStr, todayStr, fmtShort, weekInputVal } from '../../utils/date.js';

const DAY_NAMES  = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
const TYPE_LABEL = { operacional:'Operacional', analitica:'Analítica', estrategia:'Estratégia', treinamento:'Treinamento', reuniao:'Reunião', suporte:'Suporte' };
const SHIFT_BADGE = {
  manha: '<span class="inline-flex items-center gap-1 px-1 py-px rounded font-medium bg-amber-400/20 text-amber-400"><i class="fa-solid fa-sun text-xs"></i>Manhã</span>',
  tarde: '<span class="inline-flex items-center gap-1 px-1 py-px rounded font-medium bg-orange-400/20 text-orange-400"><i class="fa-solid fa-cloud-sun text-xs"></i>Tarde</span>',
  dia_todo: '<span class="inline-flex items-center gap-1 px-1 py-px rounded font-medium bg-fuchsia-400/20 text-fuchsia-400"><i class="fa-solid fa-calendar-day text-xs"></i>Dia todo</span>',
  livre: '<span class="inline-flex items-center gap-1 px-1 py-px rounded font-medium bg-teal-400/20 text-teal-400"><i class="fa-solid fa-clock text-xs"></i>Livre</span>',
};
const EVENT_COLOR_OPTS = [
  { v: 'rosa',    l: 'Rosa'    },
  { v: 'azul',    l: 'Azul'    },
  { v: 'amarelo', l: 'Amarelo' },
  { v: 'cinza',   l: 'Cinza'   },
];

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
  _viewMode: 'individual',
  _selectedDay: null,

  async init(container) {
    this._container = container;
    await window.App.loadWeekTasks(this._weekStart);
    this._render();
  },

  _render() {
    const { members, tasks } = AppState;
    const active    = members.filter(m => m.active);
    const weekDays  = getWeekDays(this._weekStart);
    const weekStart = toDateStr(weekDays[0]);
    const weekEnd   = toDateStr(weekDays[4]);
    const { selectedMemberId } = AppState;
    const isTodos   = this._viewMode === 'todos';

    if (isTodos && (!this._selectedDay || this._selectedDay < weekStart || this._selectedDay > weekEnd)) {
      const today = todayStr();
      this._selectedDay = (today >= weekStart && today <= weekEnd) ? today : weekStart;
    }

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

          <div class="flex items-center gap-3">
            <!-- View switch -->
            <div class="flex items-center gap-2">
              <span class="text-sm ${!isTodos ? 'text-white font-medium' : 'text-slate-500'}">Individual</span>
              <button onclick="ScheduleCtrl.toggleViewMode()"
                class="relative w-11 h-6 rounded-full transition-colors ${isTodos ? 'bg-primary' : 'bg-slate-600'}"
                title="Alternar visualização">
                <span class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isTodos ? 'translate-x-5' : ''}"></span>
              </button>
              <span class="text-sm ${isTodos ? 'text-white font-medium' : 'text-slate-500'}">Todos</span>
            </div>

            <button onclick="ScheduleCtrl.openInsertModal()"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm transition-colors">
              <i class="fa-solid fa-plus text-xs"></i>
              Nova tarefa
            </button>

            <button onclick="ScheduleCtrl.refresh()" id="schedule-refresh-btn"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-white text-sm transition-colors">
              <i class="fa-solid fa-rotate-right text-xs ${this._refreshing ? 'fa-spin' : ''}"></i>
              Atualizar
            </button>
          </div>
        </div>

        <!-- Main split view -->
        <div class="flex gap-4 flex-1 min-h-0">

          ${isTodos
            ? `<!-- Day list -->
          <div class="w-44 shrink-0 bg-slate-800 border border-slate-700 rounded-xl overflow-y-auto">
            <div class="p-3 border-b border-slate-700">
              <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Dias</p>
            </div>
            <div class="p-2 flex flex-col gap-1">
              ${weekDays.map((day, i) => {
                const dateStr = toDateStr(day);
                const isToday = dateStr === todayStr();
                return `
                  <button onclick="ScheduleCtrl.selectDay('${dateStr}')"
                    class="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between
                           ${this._selectedDay === dateStr ? 'bg-primary text-white' : 'text-slate-300 hover:bg-slate-700'}">
                    <span>${DAY_NAMES[i]} <span class="opacity-70">${fmtShort(day)}</span></span>
                    ${isToday ? '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>' : ''}
                  </button>`;
              }).join('')}
            </div>
          </div>`
            : `<!-- Member list -->
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
          </div>`}

          <!-- Schedule panel -->
          <div class="flex-1 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden flex flex-col min-w-0">
            ${isTodos
              ? this._allMembersHTML(this._selectedDay, active, tasks, weekDays)
              : selectedMemberId
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

  _allMembersHTML(dateStr, members, tasks, weekDays) {
    const dayIdx = weekDays.findIndex(d => toDateStr(d) === dateStr);
    const dayLabel = dayIdx >= 0 ? `${DAY_NAMES[dayIdx]} · ${fmtShort(weekDays[dayIdx])}` : fmtShort(new Date(dateStr));
    const ABSENCE_LABEL = { manha: 'Manhã', tarde: 'Tarde', dia_todo: 'Dia todo' };
    const SHIFT_ORDER = { manha: 0, dia_todo: 0.5, tarde: 1, livre: 2 };

    const cols = members.length === 0
      ? '<p class="text-slate-500 text-sm p-2">Sem membros.</p>'
      : members.map(m => {
          const absence  = AppState.absences?.find(a => a.member_id === m.id && a.date === dateStr);
          const absDay   = absence?.shift === 'dia_todo';
          const onVacation = m.on_vacation && m.vacation_start && m.vacation_end
            && dateStr >= m.vacation_start && dateStr <= m.vacation_end;
          const dayTasks = tasks
            .filter(t => t.member_id === m.id && t.scheduled_date === dateStr)
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
                <p class="text-sm font-medium text-white truncate" title="${m.name}">${m.name}</p>
              </div>
              ${onVacation ? `
                <div class="flex items-center justify-center gap-1 bg-amber-900/20 border border-amber-700/40 rounded-lg px-2 py-1.5">
                  <i class="fa-solid fa-umbrella-beach text-amber-400 text-[10px]"></i>
                  <span class="text-[10px] font-semibold text-amber-400 uppercase tracking-wide">Férias</span>
                </div>` : ''}
              ${!onVacation && absence ? `
                <div class="flex items-center justify-center gap-1 bg-rose-900/20 border border-rose-700/40 rounded-lg px-2 py-1.5">
                  <i class="fa-solid fa-user-slash text-rose-400 text-[10px]"></i>
                  <span class="text-[10px] font-semibold text-rose-400 uppercase tracking-wide">Ausente · ${ABSENCE_LABEL[absence.shift]}</span>
                </div>` : ''}
              ${onVacation || absDay
                ? '<p class="text-slate-600 text-xs text-center py-1">—</p>'
                : dayTasks.length === 0
                  ? '<p class="text-slate-600 text-xs text-center py-2">—</p>'
                  : dayTasks.map(t => this._miniCard(t)).join('')}
            </div>`;
        }).join('');

    return `
      <div class="p-4 border-b border-slate-700 shrink-0">
        <p class="font-semibold text-white">${dayLabel}</p>
        <p class="text-slate-400 text-xs mt-0.5">Cronograma de toda a equipe neste dia</p>
      </div>
      <div class="flex-1 overflow-auto p-4">
        <div class="grid gap-4" style="grid-template-columns:repeat(${Math.max(members.length, 1)},minmax(160px,1fr));min-width:${Math.max(members.length, 1) * 160}px">
          ${cols}
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

    const ABSENCE_LABEL = { manha: 'Manhã', tarde: 'Tarde', dia_todo: 'Dia todo' };

    const cols = weekDays.map((day, i) => {
      const dateStr  = toDateStr(day);
      const isToday  = dateStr === today;
      const absence  = AppState.absences?.find(a => a.member_id === memberId && a.date === dateStr);
      const absDay   = absence?.shift === 'dia_todo';
      const onVacation = member.on_vacation && member.vacation_start && member.vacation_end
        && dateStr >= member.vacation_start && dateStr <= member.vacation_end;
      const SHIFT_ORDER = { manha: 0, dia_todo: 0.5, tarde: 1, livre: 2 };
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
          ${onVacation ? `
            <div class="flex items-center justify-center gap-1 bg-amber-900/20 border border-amber-700/40 rounded-lg px-2 py-1.5">
              <i class="fa-solid fa-umbrella-beach text-amber-400 text-[10px]"></i>
              <span class="text-[10px] font-semibold text-amber-400 uppercase tracking-wide">Férias</span>
            </div>` : ''}
          ${!onVacation && absence ? `
            <div class="flex items-center justify-center gap-1 bg-rose-900/20 border border-rose-700/40 rounded-lg px-2 py-1.5">
              <i class="fa-solid fa-user-slash text-rose-400 text-[10px]"></i>
              <span class="text-[10px] font-semibold text-rose-400 uppercase tracking-wide">Ausente · ${ABSENCE_LABEL[absence.shift]}</span>
            </div>` : ''}
          ${onVacation || absDay
            ? '<p class="text-slate-600 text-xs text-center py-1">—</p>'
            : dayTasks.length === 0
              ? '<p class="text-slate-600 text-xs text-center py-2">—</p>'
              : dayTasks.map(t => this._miniCard(t)).join('')}
        </div>`;
    }).join('');

    return `
      <div class="p-4 border-b border-slate-700 shrink-0 flex items-center justify-between">
        <div>
          <div class="flex items-center gap-2">
            <p class="font-semibold text-white">${member?.name || ''}</p>
            ${member.on_vacation && member.vacation_start && member.vacation_end
              && member.vacation_end >= weekStart && member.vacation_start <= weekEnd ? `
              <span class="text-xs px-2 py-0.5 rounded-full bg-amber-900/40 border border-amber-700 text-amber-300 flex items-center gap-1">
                <i class="fa-solid fa-umbrella-beach text-[10px]"></i> Férias
              </span>` : ''}
          </div>
          <p class="text-slate-400 text-xs mt-0.5">
            ${fmtShort(weekDays[0])} — ${fmtShort(weekDays[4])} ·
            ${memberTasks.length} tarefa${memberTasks.length !== 1 ? 's' : ''}
          </p>
        </div>
        ${memberTasks.some(t => t.status !== 'done') ? `
          <button onclick="ScheduleCtrl.completeAllForMember('${memberId}')"
            class="py-1.5 px-3 flex items-center justify-center gap-1.5 text-xs font-medium bg-accent/10 hover:bg-accent/20 border border-accent/30 text-accent rounded-lg transition-colors shrink-0">
            <i class="fa-solid fa-check-double text-[10px]"></i> Concluir todas
          </button>` : ''}
      </div>
      <div class="flex-1 overflow-auto p-4">
        <div class="grid gap-4" style="grid-template-columns:repeat(5,1fr);min-width:500px">
          ${cols}
        </div>
      </div>`;
  },

  _miniCard(t) {
    const done        = t.status === 'done';
    const hasTime     = (t.type === 'treinamento' || t.type === 'reuniao') && t.event_time;
    const isPrincipal = t.priority === 'principal';
    return `
      <div class="group relative bg-slate-700/60 border border-slate-600 rounded-lg p-2 text-xs
                  ${done ? 'opacity-50' : ''} ${isPrincipal ? 'border-l-2 border-l-violet-500' : ''}">
        <div class="flex items-start justify-between gap-1">
          <span class="text-slate-200 leading-tight ${done ? 'line-through text-slate-500' : ''}">${t.title}</span>
          <div class="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            ${!done ? `
              <button onclick="ScheduleCtrl.handleRequest('${t.id}')" title="Remover tarefa"
                class="text-sm transition-colors text-rose-500/70 hover:text-rose-400">
                <i class="fa-solid fa-circle-xmark"></i>
              </button>` : ''}
            <button onclick="ScheduleCtrl.toggleStatus('${t.id}','${t.status}')" title="${done ? 'Reabrir' : 'Concluir'}"
              class="text-sm transition-colors ${done ? 'text-accent hover:text-slate-500' : 'text-slate-600 hover:text-accent'}">
              <i class="fa-solid fa-circle-check"></i>
            </button>
          </div>
        </div>
        <div class="mt-1">
          <span class="inline-block px-1 py-px rounded font-medium ${isPrincipal ? 'bg-violet-900/60 text-violet-300' : 'bg-slate-600/60 text-slate-400'}">
            ${isPrincipal ? 'Principal' : 'Secundária'}
          </span>
          ${SHIFT_BADGE[t.shift] || ''}
        </div>
        ${hasTime ? `
          <button onclick="ScheduleCtrl.showTime('${t.event_time}','${TYPE_LABEL[t.type]}')"
            class="mt-1 text-warning hover:text-amber-300 transition-colors" title="Ver horário">
            <i class="fa-solid fa-star"></i>
          </button>` : ''}
      </div>`;
  },

  async toggleStatus(id, current) {
    const next = current === 'done' ? 'pending' : 'done';
    const { error } = await db.from('tb_aps_tasks').update({ status: next }).eq('id', id);
    if (error) { window.Toast.show('Erro ao atualizar.', 'error'); return; }
    setAppState({
      tasks: AppState.tasks.map(t => t.id === id ? { ...t, status: next } : t),
    });
    this._render();
    window.Toast.show(next === 'done' ? 'Tarefa concluída!' : 'Tarefa reaberta.', next === 'done' ? 'success' : 'info');
  },

  async completeAllForMember(memberId) {
    const pendingIds = AppState.tasks
      .filter(t => t.member_id === memberId && t.status !== 'done')
      .map(t => t.id);
    if (pendingIds.length === 0) return;

    const { error } = await db.from('tb_aps_tasks').update({ status: 'done' }).in('id', pendingIds);
    if (error) { window.Toast.show('Erro ao atualizar.', 'error'); return; }

    setAppState({
      tasks: AppState.tasks.map(t => pendingIds.includes(t.id) ? { ...t, status: 'done' } : t),
    });
    this._render();
    window.Toast.show('Tarefas concluídas!', 'success');
  },

  handleRequest(taskId) {
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
            <h3 class="text-lg font-bold text-white">Remover tarefa</h3>
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
              <textarea id="req-justification" required rows="4" maxlength="140"
                oninput="document.getElementById('req-char-count').textContent = 140 - this.value.length"
                placeholder="Descreva o motivo pelo qual a tarefa não pôde ser realizada…"
                class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white placeholder-slate-500
                       focus:outline-none focus:border-primary transition-colors resize-none text-sm"></textarea>
              <p class="text-xs text-slate-500 text-right mt-1"><span id="req-char-count">140</span> caracteres restantes</p>
            </div>
            <div class="flex gap-3">
              <button type="button" onclick="ScheduleCtrl._closeReqModal()"
                class="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
                Cancelar
              </button>
              <button type="submit"
                class="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
                Remover tarefa
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

    const { error: delErr } = await db.from('tb_aps_tasks').delete().eq('id', taskId);
    if (delErr) { window.Toast.show('Erro ao remover tarefa.', 'error'); return; }

    setAppState({
      tasks: AppState.tasks.filter(t => t.id !== taskId),
      requests: [...AppState.requests, {
        id, task_id: taskId, task_title: taskTitle,
        member_name: memberName, justification,
        created_at: new Date().toISOString(),
      }],
    });
    this._closeReqModal();
    this._render();
    window.Toast.show('Tarefa removida.', 'info');
  },

  selectMember(id) {
    setAppState({ selectedMemberId: id });
    this._render();
  },

  toggleViewMode() {
    this._viewMode = this._viewMode === 'individual' ? 'todos' : 'individual';
    this._render();
  },

  selectDay(dateStr) {
    this._selectedDay = dateStr;
    this._render();
  },

  async shiftWeek(delta) {
    const d = new Date(this._weekStart);
    d.setDate(d.getDate() + delta * 7);
    this._weekStart = d;
    await window.App.loadWeekTasks(d);
    this._render();
  },

  async goToday() {
    this._weekStart = getMondayOf(new Date());
    await window.App.loadWeekTasks(this._weekStart);
    this._render();
  },

  async setWeek(val) {
    const [year, week] = val.split('-W').map(Number);
    const jan4 = new Date(year, 0, 4);
    const mon  = new Date(jan4);
    mon.setDate(jan4.getDate() - (jan4.getDay() || 7) + 1 + (week - 1) * 7);
    mon.setHours(0, 0, 0, 0);
    this._weekStart = mon;
    await window.App.loadWeekTasks(mon);
    this._render();
  },

  async refresh() {
    if (this._refreshing) return;
    this._refreshing = true;
    const btn = document.getElementById('schedule-refresh-btn');
    if (btn) btn.innerHTML = '<i class="fa-solid fa-rotate-right fa-spin text-xs"></i> Atualizando…';
    await Promise.all([
      window.App.loadAuxData(),
      window.App.loadWeekTasks(this._weekStart),
    ]);
    this._refreshing = false;
    this._render();
    window.Toast.show('Dados atualizados.', 'success');
  },

  showTime(time, label) {
    window.Toast.show(`${label} às ${time}`, 'warning', 5000);
  },

  openInsertModal() {
    const active = AppState.members.filter(m => m.active);
    const defaultMemberId = this._viewMode === 'individual' ? (AppState.selectedMemberId || '') : '';
    const today = new Date().toISOString().slice(0, 10);
    document.getElementById('modal-container').innerHTML = `
      <div class="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4"
           onclick="ScheduleCtrl._insertBackdrop(event)">
        <div class="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]"
             onclick="event.stopPropagation()">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-bold text-white">Nova tarefa</h3>
            <button onclick="ScheduleCtrl._closeInsertModal()"
              class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <form onsubmit="ScheduleCtrl._submitInsertRequest(event)">
            <div class="mb-3">
              <label class="block text-sm text-slate-400 mb-1.5">Membro <span class="text-rose-400">*</span></label>
              <select id="ins-member" required
                class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white
                       focus:outline-none focus:border-primary transition-colors text-sm">
                <option value="">—</option>
                ${active.map(m => `<option value="${m.id}" ${m.id === defaultMemberId ? 'selected' : ''}>${m.name}</option>`).join('')}
              </select>
            </div>
            <div class="mb-3">
              <label class="block text-sm text-slate-400 mb-1.5">Título <span class="text-rose-400">*</span></label>
              <input id="ins-title" type="text" required maxlength="120"
                placeholder="Nome da tarefa…"
                class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white placeholder-slate-500
                       focus:outline-none focus:border-primary transition-colors text-sm">
            </div>
            <div class="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label class="block text-sm text-slate-400 mb-1.5">Tipo</label>
                <select id="ins-type" onchange="ScheduleCtrl._toggleInsertEventTime()"
                  class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white
                         focus:outline-none focus:border-primary transition-colors text-sm">
                  <option value="">—</option>
                  <option value="operacional">Operacional</option>
                  <option value="analitica">Analítica</option>
                  <option value="estrategia">Estratégia</option>
                  <option value="treinamento">Treinamento</option>
                  <option value="reuniao">Reunião</option>
                  <option value="suporte">Suporte</option>
                </select>
              </div>
              <div>
                <label class="block text-sm text-slate-400 mb-1.5">Turno</label>
                <select id="ins-shift"
                  class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white
                         focus:outline-none focus:border-primary transition-colors text-sm">
                  <option value="">—</option>
                  <option value="manha">Manhã</option>
                  <option value="tarde">Tarde</option>
                  <option value="dia_todo">Dia todo</option>
                  <option value="livre">Livre</option>
                </select>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label class="block text-sm text-slate-400 mb-1.5">Prioridade</label>
                <select id="ins-priority"
                  class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white
                         focus:outline-none focus:border-primary transition-colors text-sm">
                  <option value="">—</option>
                  <option value="principal">Principal</option>
                  <option value="secundaria">Secundária</option>
                </select>
              </div>
              <div>
                <label class="block text-sm text-slate-400 mb-1.5">Data</label>
                <input id="ins-date" type="date" min="${today}"
                  class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white
                         focus:outline-none focus:border-primary transition-colors text-sm">
              </div>
            </div>
            <div id="ins-time-wrap" class="mb-3 hidden">
              <label class="block text-sm text-slate-400 mb-1.5">Horário do evento</label>
              <input id="ins-time" type="time"
                class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white
                       focus:outline-none focus:border-primary transition-colors text-sm">
            </div>
            <div id="ins-color-wrap" class="mb-3 hidden">
              <label class="block text-sm text-slate-400 mb-1.5">Cor na agenda</label>
              <select id="ins-color"
                class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white
                       focus:outline-none focus:border-primary transition-colors text-sm">
                ${EVENT_COLOR_OPTS.map(o => `<option value="${o.v}">${o.l}</option>`).join('')}
              </select>
            </div>
            <div class="mb-4">
              <label class="block text-sm text-slate-400 mb-1.5">Justificativa</label>
              <textarea id="ins-justification" rows="3" maxlength="200"
                placeholder="Por que esta tarefa precisa ser adicionada…"
                class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white placeholder-slate-500
                       focus:outline-none focus:border-primary transition-colors resize-none text-sm"></textarea>
            </div>
            <div class="flex gap-3">
              <button type="button" onclick="ScheduleCtrl._closeInsertModal()"
                class="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
                Cancelar
              </button>
              <button type="submit"
                class="flex-1 bg-primary hover:bg-primary/90 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
                Adicionar tarefa
              </button>
            </div>
          </form>
        </div>
      </div>`;
    setTimeout(() => document.getElementById('ins-title')?.focus(), 50);
  },

  _closeInsertModal() {
    document.getElementById('modal-container').innerHTML = '';
  },

  _insertBackdrop(e) {
    if (e.target === e.currentTarget) this._closeInsertModal();
  },

  _toggleInsertEventTime() {
    const type  = document.getElementById('ins-type')?.value;
    const wrap  = document.getElementById('ins-time-wrap');
    const cwrap = document.getElementById('ins-color-wrap');
    const needs = ['treinamento', 'reuniao'].includes(type);
    if (wrap)  wrap.classList.toggle('hidden', !needs);
    if (cwrap) cwrap.classList.toggle('hidden', !needs);
  },

  async _submitInsertRequest(e) {
    e.preventDefault();
    const memberId    = document.getElementById('ins-member').value;
    const member       = AppState.members.find(m => m.id === memberId);
    const memberName   = member?.name || '—';
    const title        = document.getElementById('ins-title').value.trim();
    const type         = document.getElementById('ins-type').value || null;
    const shift        = document.getElementById('ins-shift').value || null;
    const priority     = document.getElementById('ins-priority').value || null;
    const scheduled_date = document.getElementById('ins-date').value || null;
    const showTime     = ['treinamento', 'reuniao'].includes(type);
    const event_time   = showTime ? (document.getElementById('ins-time').value || null) : null;
    const event_color  = showTime ? (document.getElementById('ins-color').value || null) : null;
    const justification = document.getElementById('ins-justification').value.trim() || null;
    const id           = window.App.generateId();
    const taskId       = window.App.generateId();

    const taskPayload = {
      id: taskId, member_id: memberId, title, type, shift, priority,
      scheduled_date, event_time, event_color, status: 'pending',
    };
    const { error: taskErr } = await db.from('tb_aps_tasks').insert(taskPayload);
    if (taskErr) { window.Toast.show('Erro ao criar tarefa.', 'error'); return; }

    const { error } = await db.from('tb_aps_task_insert_requests').insert({
      id, member_id: memberId, member_name: memberName,
      title, type, shift, priority, scheduled_date, event_time, event_color, justification,
      status: 'accepted',
    });
    if (error) { window.Toast.show('Erro ao registrar notificação.', 'error'); }

    const weekStart = toDateStr(getWeekDays(this._weekStart)[0]);
    const weekEnd    = toDateStr(getWeekDays(this._weekStart)[4]);
    const inCurrentWeek = scheduled_date && scheduled_date >= weekStart && scheduled_date <= weekEnd;

    setAppState({
      tasks: inCurrentWeek
        ? [...AppState.tasks, { ...taskPayload, tb_aps_members: { name: memberName } }]
        : AppState.tasks,
      insertRequests: [...AppState.insertRequests, {
        id, member_id: memberId, member_name: memberName,
        title, type, shift, priority, scheduled_date, event_time, event_color, justification,
        status: 'accepted', created_at: new Date().toISOString(),
      }],
    });

    this._closeInsertModal();
    this._render();
    window.Toast.show('Tarefa adicionada.', 'success');
  },
};
window.ScheduleCtrl = ScheduleCtrl;
