import { db } from '../../db.js';
import { AppState } from '../../state.js';
import { getMondayOf, toDateStr, todayStr, fmtShort, weekInputVal } from '../../utils/date.js';
import { TYPE_OPTS, EVENT_COLOR_OPTS } from './calendar.js';

const DAY_NAMES  = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
const TYPE_LABEL = { treinamento: 'Treinamento', reuniao: 'Reunião' };
const EVENT_COLOR_CARD_BG = {
  rosa:    'bg-pink-900/40 border-pink-700/70',
  azul:    'bg-blue-900/40 border-blue-700/70',
  amarelo: 'bg-yellow-500/30 border-yellow-400/70',
  cinza:   'bg-zinc-400/30 border-zinc-300/60',
};
const EVENT_COLOR_LEGEND = [
  { v: 'rosa',    l: 'Treinamento',    dot: 'bg-pink-500' },
  { v: 'azul',    l: 'Reunião',    dot: 'bg-blue-500' },
  { v: 'amarelo', l: 'Reserva', dot: 'bg-yellow-500' },
  { v: 'cinza',   l: 'Simulação ',   dot: 'bg-zinc-400' },
];
const SHIFTS = ['manha', 'tarde'];
const SHIFT_LABEL = { manha: 'Manhã', tarde: 'Tarde' };
const PLAN_LABEL = { quinzenal: 'Quinzenal', semanal: 'Semanal', mensal: 'Mensal' };
const PLAN_COLOR = {
  mensal:    'bg-violet-900/40 border-violet-700 text-violet-300',
  quinzenal: 'bg-blue-900/40 border-blue-700 text-blue-300',
  semanal:   'bg-orange-900/40 border-orange-700 text-orange-300',
};

function getWeekDays(monday) {
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
}

export const AgendaCtrl = {
  _container: null,
  _weekStart: getMondayOf(new Date()),

  async init(container) {
    this._container = container;
    await window.App.loadWeekTasks(this._weekStart);
    this._render();
  },

  _render() {
    const weekDays  = getWeekDays(this._weekStart);
    const weekStart = toDateStr(weekDays[0]);
    const weekEnd   = toDateStr(weekDays[4]);
    const today     = todayStr();

    const active = AppState.members.filter(m => m.active);

    const events = AppState.tasks.filter(t =>
      (t.type === 'treinamento' || t.type === 'reuniao') &&
      t.scheduled_date >= weekStart &&
      t.scheduled_date <= weekEnd
    );

    const totalEvents = events.length;

    this._container.innerHTML = `
      <div class="flex-1 flex flex-col min-h-0">

        <div class="flex items-center justify-between mb-5 flex-wrap gap-3 shrink-0">
          <div>
            <h2 class="text-xl font-semibold text-white">Agenda</h2>
            <p class="text-slate-400 text-sm mt-1">
              ${totalEvents === 0
                ? 'Nenhum evento nesta semana.'
                : `${totalEvents} evento${totalEvents !== 1 ? 's' : ''} na semana`}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="AgendaCtrl.shiftWeek(-1)"
              class="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors">
              <i class="fa-solid fa-chevron-left text-xs"></i>
            </button>
            <input type="week" value="${weekInputVal(this._weekStart)}"
              onchange="AgendaCtrl.setWeek(this.value)"
              class="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white
                     focus:outline-none focus:border-primary transition-colors">
            <button onclick="AgendaCtrl.shiftWeek(1)"
              class="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors">
              <i class="fa-solid fa-chevron-right text-xs"></i>
            </button>
            <button onclick="AgendaCtrl.goToday()"
              class="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm transition-colors">
              Hoje
            </button>
            ${AppState.view === 'admin' ? `
              <button onclick="AgendaCtrl.openCreateEventModal()"
                class="flex items-center gap-2 bg-primary hover:bg-violet-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                <i class="fa-solid fa-plus"></i> Novo evento
              </button>` : ''}
            ${AppState.view === 'free' ? `
              <button onclick="AgendaCtrl.openOneOnOneModal()"
                class="flex items-center gap-2 bg-primary hover:bg-violet-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                <i class="fa-solid fa-comments"></i> Agenda de One a One
              </button>` : ''}
          </div>
        </div>

        <div class="mb-4 shrink-0 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 flex items-center flex-wrap gap-x-5 gap-y-2">
          <span class="text-xs text-slate-500 font-semibold uppercase tracking-wider">Legenda</span>
          ${EVENT_COLOR_LEGEND.map(o => `
            <span class="flex items-center gap-1.5 text-xs text-slate-300">
              <span class="w-2.5 h-2.5 rounded-full ${o.dot} shrink-0"></span>${o.l}
            </span>`).join('')}
        </div>

        <div class="flex-1 min-h-0 bg-slate-800 border border-slate-700 rounded-xl overflow-auto">
          <div class="agenda-grid">

            <div class="px-2.5 py-1 border-b border-r border-slate-700 bg-slate-800 sticky top-0 left-0 z-20 row-span-2 flex items-end">
              <span class="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Colaboradores</span>
            </div>

            ${weekDays.map((d, i) => {
              const isToday = toDateStr(d) === today;
              return `
                <div class="px-2 py-1 border-b border-l border-slate-700 text-center bg-slate-800 sticky top-0 z-10" style="grid-column: span 2;">
                  <p class="text-[10px] font-semibold ${isToday ? 'text-primary' : 'text-slate-400'}">${DAY_NAMES[i]}</p>
                  <p class="text-xs font-medium ${isToday ? 'text-primary' : 'text-white'}">${fmtShort(d)}</p>
                </div>`;
            }).join('')}

            ${weekDays.map(() => SHIFTS.map(s => `
                <div class="px-1 py-1 border-b border-l border-slate-700 text-center bg-slate-900/60">
                  <span class="text-[9px] font-semibold uppercase tracking-wide ${s === 'manha' ? 'text-amber-400' : 'text-orange-400'}">${SHIFT_LABEL[s]}</span>
                </div>`).join('')).join('')}

            ${active.length === 0
              ? `<div style="grid-column: span 11;" class="py-12 text-center text-slate-500 text-sm">Nenhum membro ativo.</div>`
              : active.map(m => `
                  <div class="px-2.5 py-1.5 border-t border-r border-slate-700 bg-slate-800/60 sticky left-0 z-10 flex items-center gap-1.5">
                    <span class="text-xs font-medium ${m.on_vacation ? 'text-slate-400' : 'text-white'} truncate">${m.name}</span>
                    ${m.on_vacation ? '<i class="fa-solid fa-umbrella-beach text-amber-400 text-[10px] shrink-0" title="De férias"></i>' : ''}
                  </div>
                  ${weekDays.map(d => SHIFTS.map(shift => {
                    const dateStr    = toDateStr(d);
                    const cellEvents = events
                      .filter(t => t.member_id === m.id && t.scheduled_date === dateStr && (t.shift === shift || t.shift === 'dia_todo'))
                      .sort((a, b) => (a.event_time || '').localeCompare(b.event_time || ''));
                    return `
                      <div class="border-t border-l border-slate-700 px-1 py-1 flex flex-col gap-0.5 min-h-[40px]">
                        ${cellEvents.map(t => this._card(t)).join('')}
                      </div>`;
                  }).join('')).join('')}
                `).join('')}
          </div>
        </div>
      </div>`;
  },

  _card(t) {
    const isPrincipal = t.priority === 'principal';
    const cardBg      = EVENT_COLOR_CARD_BG[t.event_color] || 'bg-slate-700/60 border-slate-600/80';
    const title       = t.event_time ? `${TYPE_LABEL[t.type] || t.type} · ${t.event_time}` : (TYPE_LABEL[t.type] || t.type);

    return `
      <div class="${cardBg} border rounded px-1.5 py-1
                  ${isPrincipal ? 'border-l-2 border-l-violet-500' : ''}"
           title="${title}">
        <span class="text-[11px] text-slate-300 truncate leading-tight block">${t.title}</span>
      </div>`;
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

  openOneOnOneModal() {
    const members = AppState.members
      .filter(m => m.active && m.one_on_one_plan)
      .map(m => ({
        member: m,
        entries: AppState.oneOnOnes
          .filter(o => o.member_id === m.id)
          .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || '')),
      }));

    document.getElementById('modal-container').innerHTML = `
      <div class="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4"
           onclick="AgendaCtrl._backdropClickOneOnOne(event)">
        <div class="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[80vh] flex flex-col"
             onclick="event.stopPropagation()">
          <div class="flex items-center justify-between mb-6 shrink-0">
            <h3 class="text-lg font-bold text-white">Agenda de One a One</h3>
            <button onclick="AgendaCtrl.closeOneOnOneModal()"
              class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div class="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3">
            ${members.length === 0
              ? `<p class="text-center text-slate-500 text-sm py-8">Nenhum colaborador com plano de 1:1 cadastrado.</p>`
              : members.map(({ member: m, entries }) => `
                  <div class="bg-slate-700/40 border border-slate-600 rounded-xl p-3.5">
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-sm font-medium text-white">${m.name}</span>
                      <span class="text-[9px] px-1.5 py-0.5 rounded-full border shrink-0 ${PLAN_COLOR[m.one_on_one_plan] || 'bg-slate-700 border-slate-600 text-slate-300'}">${PLAN_LABEL[m.one_on_one_plan] || m.one_on_one_plan}</span>
                    </div>
                    ${entries.length === 0
                      ? `<p class="text-xs text-slate-500">Nenhuma 1:1 agendada.</p>`
                      : `<div class="flex flex-col gap-1.5">
                          ${entries.map(o => `
                            <div class="flex items-center gap-2 text-xs text-slate-300">
                              <i class="fa-solid fa-calendar-day text-slate-500 text-[10px]"></i>
                              ${fmtShort(new Date(o.date + 'T00:00:00'))}${o.time ? ` · ${o.time.slice(0, 5)}` : ''}
                            </div>`).join('')}
                        </div>`}
                  </div>`).join('')}
          </div>
        </div>
      </div>`;
  },

  closeOneOnOneModal() {
    document.getElementById('modal-container').innerHTML = '';
  },

  _backdropClickOneOnOne(e) {
    if (e.target === e.currentTarget) this.closeOneOnOneModal();
  },

  // ── Criar evento ──────────────────────────────────────────────────────────

  openCreateEventModal() {
    const activeMembers = AppState.members.filter(m => m.active);
    document.getElementById('modal-container').innerHTML = `
      <div class="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4"
           onclick="AgendaCtrl._backdropClickCreateEvent(event)">
        <div class="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col"
             onclick="event.stopPropagation()">
          <div class="flex items-center justify-between p-5 border-b border-slate-700 shrink-0">
            <h3 class="font-bold text-white">Novo evento</h3>
            <button onclick="AgendaCtrl.closeCreateEventModal()"
              class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div class="overflow-y-auto flex-1 p-5">
            <form onsubmit="AgendaCtrl.createEvent(event)" class="flex flex-col gap-3">
              <input id="ag-title" type="text" required placeholder="Título do evento"
                class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white placeholder-slate-500
                       text-sm focus:outline-none focus:border-primary transition-colors">

              <div>
                <label class="block text-xs text-slate-400 mb-1">Data</label>
                <input id="ag-date" type="date" required value="${todayStr()}"
                  class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm
                         focus:outline-none focus:border-primary transition-colors">
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs text-slate-400 mb-1">Prioridade</label>
                  <select id="ag-priority"
                    class="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-2 text-white text-sm
                           focus:outline-none focus:border-primary transition-colors">
                    <option value="principal">Principal</option>
                    <option value="secundaria">Secundária</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs text-slate-400 mb-1">Turno</label>
                  <select id="ag-shift"
                    class="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-2 text-white text-sm
                           focus:outline-none focus:border-primary transition-colors">
                    <option value="manha">Manhã</option>
                    <option value="tarde">Tarde</option>
                    <option value="dia_todo">Dia todo</option>
                    <option value="livre">Livre</option>
                  </select>
                </div>
              </div>

              <div>
                <label class="block text-xs text-slate-400 mb-1">Tipo de demanda</label>
                <select id="ag-type" onchange="AgendaCtrl._onCreateEventTypeChange()"
                  class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm
                         focus:outline-none focus:border-primary transition-colors">
                  ${TYPE_OPTS.filter(o => o.v === 'treinamento' || o.v === 'reuniao').map(o => `<option value="${o.v}" ${o.v === 'treinamento' ? 'selected' : ''}>${o.l}</option>`).join('')}
                </select>
              </div>

              <div id="ag-time-wrap">
                <label class="block text-xs text-slate-400 mb-1">Horário <span class="text-danger">*</span></label>
                <input id="ag-time" type="time" required
                  class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm
                         focus:outline-none focus:border-primary transition-colors">
              </div>

              <div id="ag-color-wrap">
                <label class="block text-xs text-slate-400 mb-1">Cor na agenda</label>
                <select id="ag-color"
                  class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm
                         focus:outline-none focus:border-primary transition-colors">
                  ${EVENT_COLOR_OPTS.map(o => `<option value="${o.v}">${o.l}</option>`).join('')}
                </select>
              </div>

              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <label class="text-xs text-slate-400">Participantes <span class="text-danger">*</span></label>
                  <div class="flex gap-2">
                    <button type="button" onclick="AgendaCtrl._toggleAllCreateEventMembers(true)"
                      class="text-[10px] text-primary hover:text-violet-300 transition-colors">Selecionar todos</button>
                    <span class="text-slate-600 text-[10px]">|</span>
                    <button type="button" onclick="AgendaCtrl._toggleAllCreateEventMembers(false)"
                      class="text-[10px] text-slate-400 hover:text-slate-200 transition-colors">Desmarcar todos</button>
                  </div>
                </div>
                <div id="ag-members-wrap" class="flex flex-col gap-0.5 max-h-36 overflow-y-auto bg-slate-700/50 border border-slate-600 rounded-lg p-1.5">
                  ${activeMembers.length === 0
                    ? `<p class="text-slate-500 text-xs text-center py-2">Nenhum membro ativo.</p>`
                    : activeMembers.map(m => `
                        <label class="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-600/50 cursor-pointer select-none">
                          <input type="checkbox" value="${m.id}" class="accent-primary shrink-0">
                          <span class="text-sm text-slate-300 truncate">${m.name}</span>
                        </label>`).join('')}
                </div>
              </div>

              <button type="submit"
                class="bg-primary hover:bg-violet-600 text-white text-sm font-medium py-2.5 rounded-lg transition-colors mt-1">
                <i class="fa-solid fa-plus mr-1.5"></i>Criar evento
              </button>
            </form>
          </div>
        </div>
      </div>`;
    setTimeout(() => document.getElementById('ag-title')?.focus(), 50);
  },

  _onCreateEventTypeChange() {
    const type  = document.getElementById('ag-type')?.value;
    const needs = type === 'treinamento' || type === 'reuniao';
    document.getElementById('ag-time-wrap')?.classList.toggle('hidden', !needs);
    document.getElementById('ag-color-wrap')?.classList.toggle('hidden', !needs);
    const time = document.getElementById('ag-time');
    if (time) time.required = needs;
  },

  _toggleAllCreateEventMembers(select) {
    document.querySelectorAll('#ag-members-wrap input[type="checkbox"]').forEach(cb => {
      cb.checked = select;
    });
  },

  async createEvent(e) {
    e.preventDefault();
    const title    = document.getElementById('ag-title').value.trim();
    const date     = document.getElementById('ag-date').value;
    const priority = document.getElementById('ag-priority').value;
    const shift    = document.getElementById('ag-shift').value;
    const type     = document.getElementById('ag-type').value;
    const needsTime = type === 'treinamento' || type === 'reuniao';
    const time  = needsTime ? document.getElementById('ag-time').value : null;
    const color = needsTime ? document.getElementById('ag-color').value : null;
    const memberIds = Array.from(document.querySelectorAll('#ag-members-wrap input[type="checkbox"]:checked')).map(cb => cb.value);

    if (needsTime && !time) {
      window.Toast.show('Informe o horário para esse tipo de demanda.', 'warning'); return;
    }
    if (memberIds.length === 0) {
      window.Toast.show('Selecione ao menos um participante.', 'warning'); return;
    }

    const groupId = memberIds.length > 1 ? window.App.generateId() : null;
    const rows = memberIds.map(mid => ({
      id:             window.App.generateId(),
      title,
      member_id:      mid,
      scheduled_date: date,
      priority,
      shift,
      type,
      event_time:     time || null,
      event_color:    color || null,
      demand_id:      null,
      group_id:       groupId,
      status:         'pending',
    }));

    const { error } = await db.from('tb_aps_tasks').insert(rows);
    if (error) { window.Toast.show('Erro ao criar evento.', 'error'); return; }

    this._weekStart = getMondayOf(new Date(date + 'T12:00:00'));
    await window.App.loadWeekTasks(this._weekStart);
    this.closeCreateEventModal();
    this._render();
    window.Toast.show(rows.length > 1 ? `Evento criado para ${rows.length} membros.` : 'Evento criado.', 'success');
  },

  closeCreateEventModal() {
    document.getElementById('modal-container').innerHTML = '';
  },

  _backdropClickCreateEvent(e) {
    if (e.target === e.currentTarget) this.closeCreateEventModal();
  },
};
window.AgendaCtrl = AgendaCtrl;
