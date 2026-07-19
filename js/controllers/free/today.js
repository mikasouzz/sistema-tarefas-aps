import { db } from '../../db.js';
import { todayStr } from '../../utils/date.js';
import { AppState, setAppState } from '../../state.js';

const PIN = '<i class="fa-solid fa-thumbtack text-amber-400 text-xs shrink-0 mt-0.5"></i>';

const TYPE_LABEL = {
  operacional: 'Operacional',
  analitica:   'Analítica',
  estrategia:  'Estratégia',
  treinamento: 'Treinamento',
  reuniao:     'Reunião',
  suporte:     'Suporte',
};
const TYPE_CLASS = {
  operacional: 'bg-blue-900/50 text-blue-300 border-blue-700',
  analitica:   'bg-violet-900/50 text-violet-300 border-violet-700',
  estrategia:  'bg-amber-900/50 text-amber-300 border-amber-700',
  treinamento: 'bg-emerald-900/50 text-emerald-300 border-emerald-700',
  reuniao:     'bg-rose-900/50 text-rose-300 border-rose-700',
  suporte:     'bg-cyan-900/50 text-cyan-300 border-cyan-700',
};
const SHIFT_HTML = {
  manha: '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium text-xs bg-amber-400/20 text-amber-400"><i class="fa-solid fa-sun text-xs"></i>Manhã</span>',
  tarde: '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium text-xs bg-orange-400/20 text-orange-400"><i class="fa-solid fa-cloud-sun text-xs"></i>Tarde</span>',
  livre: '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium text-xs bg-teal-400/20 text-teal-400"><i class="fa-solid fa-clock text-xs"></i>Livre</span>',
};
const INDICATOR_TYPES = [
  { type: 'suporte',     label: 'Suporte',      icon: 'fa-headset',         iconClass: 'bg-cyan-900/50 border-cyan-700 text-cyan-300' },
  { type: 'treinamento', label: 'Treinamentos', icon: 'fa-chalkboard-user', iconClass: 'bg-emerald-900/50 border-emerald-700 text-emerald-300' },
  { type: 'reuniao',     label: 'Reuniões',     icon: 'fa-users',           iconClass: 'bg-rose-900/50 border-rose-700 text-rose-300' },
];

export const TodayCtrl = {
  tasks: [],
  _container: null,
  _activeMemberId: null,

  async init(container) {
    this._container = container;
    container.innerHTML = `
      <div class="flex items-center gap-2 text-slate-500 py-12 justify-center">
        <i class="fa-solid fa-spinner fa-spin"></i> Carregando tarefas…
      </div>`;
    const today = todayStr();
    const { data, error } = await db
      .from('tb_aps_tasks')
      .select('*, tb_aps_members(name)')
      .eq('scheduled_date', today)
      .not('member_id', 'is', null);
    if (error) { window.Toast.show('Erro ao carregar tarefas.', 'error'); return; }
    this.tasks = data || [];
    this._render();
  },

  _noticesPanel() {
    const notices = [...AppState.notices].sort((a, b) =>
      (b.pinned - a.pinned) || new Date(b.created_at) - new Date(a.created_at)
    );
    return `
      <div class="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden flex flex-col min-h-0">
        <div class="px-4 py-3 border-b border-slate-700 flex items-center gap-2 shrink-0">
          <i class="fa-solid fa-bell text-amber-400 text-sm"></i>
          <p class="text-sm font-semibold text-white">Avisos</p>
        </div>
        <div class="divide-y divide-slate-700/60 overflow-y-auto flex-1">
          ${notices.length === 0
            ? `<div class="px-4 py-8 text-center text-slate-500 text-sm">
                 <i class="fa-solid fa-bell-slash text-2xl mb-2 block opacity-30"></i>
                 Nenhum aviso no momento.
               </div>`
            : notices.map(n => {
                const date = new Date(n.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                return `
                <div class="px-4 py-3">
                  <div class="flex items-center justify-between gap-2 mb-1">
                    <div class="flex items-center gap-1.5">
                      ${n.pinned ? PIN : ''}
                      <p class="text-sm font-semibold text-white leading-tight">${n.title}</p>
                    </div>
                    <span class="text-xs text-slate-500 shrink-0">${date}</span>
                  </div>
                  <p class="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">${n.content}</p>
                </div>`;
              }).join('')}
        </div>
      </div>`;
  },

  _render() {
    const c = this._container;

    const today = new Date().toLocaleDateString('pt-BR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

    if (this.tasks.length === 0) {
      c.innerHTML = `
        <div class="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 min-h-0">
          <div class="text-center py-20 text-slate-500">
            <i class="fa-solid fa-calendar-check text-5xl mb-4 block opacity-40"></i>
            <p class="text-lg">Nenhuma tarefa para hoje.</p>
            <p class="text-sm mt-1 capitalize text-slate-600">${today}</p>
          </div>
          ${this._noticesPanel()}
        </div>`;
      return;
    }

    const groups = this._groupByMember();

    const totalAll = this.tasks.length;
    const doneAll  = this.tasks.filter(t => t.status === 'done').length;
    const pct      = Math.round((doneAll / totalAll) * 100);
    const allDone  = doneAll === totalAll;

    c.innerHTML = `
      <div class="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 min-h-0">

        <!-- Tarefas -->
        <div class="flex flex-col min-h-0">
          <div class="mb-5 shrink-0">
            <h2 class="text-xl font-semibold text-white capitalize">${today}</h2>
            <p class="text-slate-400 text-sm mt-1">
              ${groups.length} membro${groups.length !== 1 ? 's' : ''} ·
              ${totalAll} tarefa${totalAll !== 1 ? 's' : ''} agendada${totalAll !== 1 ? 's' : ''}
            </p>
          </div>

          <div class="mb-6 shrink-0 bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-semibold text-white">Meta coletiva do dia</span>
              <span class="text-sm ${allDone ? 'text-accent font-medium' : 'text-slate-400'}">${doneAll} de ${totalAll} concluídas</span>
            </div>
            <div class="w-full bg-slate-700 rounded-full h-2.5">
              <div class="h-2.5 rounded-full transition-all duration-500 ${allDone ? 'bg-accent' : 'bg-primary'}"
                   style="width: ${pct}%"></div>
            </div>
            <p class="text-xs mt-2 ${allDone ? 'text-accent font-medium' : 'text-slate-500'}">
              ${allDone
                ? '<i class="fa-solid fa-trophy mr-1"></i>Todas as tarefas do dia foram concluídas!'
                : `${pct}% concluído`}
            </p>
          </div>

          ${this._indicatorCards()}

          <div class="flex-1 overflow-y-auto pr-1">
            <div class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              ${groups.map(g => this._memberRow(g)).join('')}
            </div>
          </div>
        </div>

        <!-- Avisos -->
        ${this._noticesPanel()}

      </div>`;
  },

  _indicatorCards() {
    const counts = {};
    for (const { type } of INDICATOR_TYPES) counts[type] = { manha: 0, tarde: 0, livre: 0 };
    for (const t of this.tasks) {
      if (counts[t.type] && counts[t.type][t.shift] !== undefined) counts[t.type][t.shift]++;
    }

    return `
      <div class="mb-6 shrink-0 grid grid-cols-1 sm:grid-cols-3 gap-3">
        ${INDICATOR_TYPES.map(({ type, label, icon, iconClass }) => {
          const c = counts[type];
          const total = c.manha + c.tarde + c.livre;
          return `
          <div class="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div class="flex items-center gap-2 mb-3">
              <div class="w-8 h-8 rounded-lg border ${iconClass} flex items-center justify-center shrink-0">
                <i class="fa-solid ${icon} text-xs"></i>
              </div>
              <div class="min-w-0">
                <p class="text-sm font-semibold text-white truncate">${label}</p>
                <p class="text-xs text-slate-500">${total} pessoa${total !== 1 ? 's' : ''} no dia</p>
              </div>
            </div>
            <div class="grid grid-cols-3 gap-2 text-center">
              <div>
                <p class="text-lg font-bold text-white">${c.manha}</p>
                <p class="text-[10px] text-slate-500 uppercase tracking-wide">Manhã</p>
              </div>
              <div>
                <p class="text-lg font-bold text-white">${c.tarde}</p>
                <p class="text-[10px] text-slate-500 uppercase tracking-wide">Tarde</p>
              </div>
              <div>
                <p class="text-lg font-bold text-white">${c.livre}</p>
                <p class="text-[10px] text-slate-500 uppercase tracking-wide">Livre</p>
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>`;
  },

  _groupByMember() {
    const map = new Map();
    for (const t of this.tasks) {
      const key = t.member_id;
      if (!map.has(key)) map.set(key, { name: t.tb_aps_members?.name || '—', memberId: key, tasks: [] });
      map.get(key).tasks.push(t);
    }
    const SHIFT_ORDER = { manha: 0, tarde: 1, livre: 2 };
    for (const g of map.values()) {
      g.tasks.sort((a, b) => {
        const shiftDiff = (SHIFT_ORDER[a.shift] ?? 99) - (SHIFT_ORDER[b.shift] ?? 99);
        if (shiftDiff !== 0) return shiftDiff;
        if (a.priority === 'principal' && b.priority !== 'principal') return -1;
        if (a.priority !== 'principal' && b.priority === 'principal') return  1;
        return 0;
      });
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  },

  _memberRow(group) {
    const member     = AppState.members.find(m => m.id === group.memberId);
    const onVacation = member?.on_vacation;
    const absence    = AppState.absences?.find(a => a.member_id === group.memberId && a.date === todayStr());

    const initial   = group.name.charAt(0).toUpperCase();
    const total     = group.tasks.length;
    const doneCount = group.tasks.filter(t => t.status === 'done').length;
    const allDone   = doneCount === total;

    const borderClass = onVacation ? 'border-amber-700/50' : absence ? 'border-rose-700/50' : 'border-slate-700';

    return `
      <button onclick="TodayCtrl._openMemberModal('${group.memberId}')"
        class="bg-slate-800 border ${borderClass} hover:border-primary/60 rounded-xl px-3 py-4 flex flex-col items-center gap-2 transition-colors text-center">
        <div class="relative">
          <div class="w-11 h-11 rounded-full flex items-center justify-center font-bold text-base shrink-0
                      ${allDone ? 'bg-accent/20 border border-accent/40 text-accent' : 'bg-primary/20 border border-primary/40 text-primary'}">
            ${allDone ? '<i class="fa-solid fa-check text-sm"></i>' : initial}
          </div>
          ${onVacation ? '<i class="fa-solid fa-umbrella-beach text-amber-400 text-xs absolute -top-1 -right-1 bg-slate-800 rounded-full p-0.5"></i>' : ''}
          ${absence && !onVacation ? '<i class="fa-solid fa-user-slash text-rose-400 text-xs absolute -top-1 -right-1 bg-slate-800 rounded-full p-0.5"></i>' : ''}
        </div>
        <div class="min-w-0 w-full">
          <p class="font-semibold text-white text-sm truncate">${group.name}</p>
          <p class="text-xs text-slate-400">${doneCount} de ${total}</p>
        </div>
      </button>`;
  },

  _openMemberModal(memberId) {
    this._activeMemberId = memberId;
    document.getElementById('modal-container').innerHTML = `
      <div class="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4"
           onclick="TodayCtrl._memberModalBackdrop(event)">
        <div class="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]"
             onclick="event.stopPropagation()">
          ${this._memberModalContent(memberId)}
        </div>
      </div>`;
  },

  _closeMemberModal() {
    this._activeMemberId = null;
    document.getElementById('modal-container').innerHTML = '';
  },

  _memberModalBackdrop(e) {
    if (e.target === e.currentTarget) this._closeMemberModal();
  },

  _refreshMemberModal() {
    if (!this._activeMemberId) return;
    const body = document.querySelector('#modal-container .bg-slate-800');
    if (body) body.innerHTML = this._memberModalContent(this._activeMemberId);
  },

  _memberModalContent(memberId) {
    const group = this._groupByMember().find(g => g.memberId === memberId);
    if (!group) return '';

    const member     = AppState.members.find(m => m.id === memberId);
    const onVacation = member?.on_vacation;
    const vacStart   = member?.vacation_start;
    const vacEnd     = member?.vacation_end;
    const fmtDate    = s => { if (!s) return ''; const [,mo,d] = s.split('-'); return `${d}/${mo}`; };

    const absence    = AppState.absences?.find(a => a.member_id === memberId && a.date === todayStr());
    const ABSENCE_LABEL = { manha: 'pela manhã', tarde: 'pela tarde', dia_todo: 'o dia todo' };

    const dividerClass = onVacation ? 'border-amber-700/50' : absence ? 'border-rose-700/50' : 'border-slate-700';

    const total     = group.tasks.length;
    const doneCount = group.tasks.filter(t => t.status === 'done').length;
    const allDone   = doneCount === total;

    const pendingInserts = AppState.insertRequests.filter(r => r.member_id === memberId).length;

    return `
        <div class="px-4 py-3 border-b ${dividerClass} flex flex-col gap-2">
          <div class="flex items-center justify-between gap-2">
            <div class="min-w-0 flex-1">
              <p class="font-semibold text-white text-base truncate">${group.name}</p>
              <p class="text-xs text-slate-400">${doneCount} de ${total} concluída${total !== 1 ? 's' : ''}</p>
            </div>
            ${onVacation ? '<i class="fa-solid fa-umbrella-beach text-amber-400 text-sm shrink-0"></i>' : ''}
            ${absence && !onVacation ? '<i class="fa-solid fa-user-slash text-rose-400 text-sm shrink-0"></i>' : ''}
            <button onclick="TodayCtrl._closeMemberModal()"
              class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors shrink-0">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          ${!allDone ? `
          <button onclick="TodayCtrl.completeAllForMember('${memberId}')"
            class="w-full py-1.5 flex items-center justify-center gap-1.5 text-xs font-medium bg-accent/10 hover:bg-accent/20 border border-accent/30 text-accent rounded-lg transition-colors">
            <i class="fa-solid fa-check-double text-[10px]"></i> Concluir todas
          </button>` : ''}
          <button onclick="TodayCtrl._openInsertModal('${memberId}')"
            class="w-full py-1.5 flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-primary border border-dashed border-slate-700 hover:border-primary/50 rounded-lg transition-colors">
            <i class="fa-solid fa-plus text-[10px]"></i> Solicitar nova tarefa
            ${pendingInserts > 0 ? `<span class="ml-1 bg-primary/20 text-primary text-[9px] font-bold px-1.5 py-0.5 rounded-full">${pendingInserts}</span>` : ''}
          </button>
        </div>
        ${onVacation ? `
          <div class="px-4 py-2 bg-amber-900/20 border-b border-amber-700/40 flex items-center gap-1.5">
            <i class="fa-solid fa-circle-info text-amber-400 text-xs"></i>
            <span class="text-xs text-amber-300">
              De férias${vacStart && vacEnd ? ` · ${fmtDate(vacStart)} a ${fmtDate(vacEnd)}` : ''}
            </span>
          </div>` : ''}
        ${absence && !onVacation ? `
          <div class="px-4 py-2 bg-rose-900/20 border-b border-rose-700/40 flex items-center gap-1.5">
            <i class="fa-solid fa-user-slash text-rose-400 text-xs"></i>
            <span class="text-xs text-rose-300">Ausente ${ABSENCE_LABEL[absence.shift] || ''}</span>
          </div>` : ''}
        <div class="flex flex-col gap-2 p-3">
          ${group.tasks.map(t => this._card(t)).join('')}
        </div>`;
  },

  _card(t) {
    const done      = t.status === 'done';
    const req       = AppState.requests?.find(r => r.task_id === t.id);
    const typeClass = TYPE_CLASS[t.type] || 'bg-slate-700 text-slate-300 border-slate-600';
    const hasTime   = (t.type === 'treinamento' || t.type === 'reuniao') && t.event_time;
    return `
      <div class="bg-slate-700/50 border border-slate-600 rounded-lg p-3 flex flex-col gap-2
                  ${done || req ? 'opacity-50' : ''} ${t.priority === 'principal' ? 'border-l-2 border-l-violet-500' : ''}">
        <div class="flex items-start justify-between gap-2">
          <h3 class="font-medium text-sm leading-tight ${done ? 'line-through text-slate-400' : 'text-white'}">${t.title}</h3>
          <button onclick="TodayCtrl.toggleStatus('${t.id}','${t.status}')"
            class="shrink-0 text-lg transition-colors ${done ? 'text-accent hover:text-slate-500' : 'text-slate-600 hover:text-accent'}">
            <i class="fa-solid ${done ? 'fa-circle-check' : 'fa-circle'}"></i>
          </button>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          ${SHIFT_HTML[t.shift] || ''}
          <span class="text-xs px-2 py-0.5 rounded-full font-medium ${t.priority === 'principal' ? 'bg-violet-700 text-white' : 'bg-slate-600 text-slate-300'}">
            ${t.priority === 'principal' ? 'Principal' : 'Secundária'}
          </span>
          <span class="text-xs px-2 py-0.5 rounded border ${typeClass}">${TYPE_LABEL[t.type] || t.type}</span>
          ${hasTime ? `
            <button onclick="TodayCtrl.showTime('${t.event_time}','${TYPE_LABEL[t.type]}')"
              class="text-warning hover:text-amber-300 transition-colors" title="Ver horário">
              <i class="fa-solid fa-star text-sm"></i>
            </button>` : ''}
        </div>
        ${!done ? `
        <div class="border-t border-slate-600/50 pt-2 flex justify-end">
          ${req
            ? `<span class="text-xs text-rose-400 flex items-center gap-1">
                 <i class="fa-solid fa-circle-xmark text-[10px]"></i> Aguardando supervisão
               </span>`
            : `<button onclick="TodayCtrl.handleRequest('${t.id}')"
                 class="text-xs text-slate-500 hover:text-rose-400 flex items-center gap-1 transition-colors">
                 <i class="fa-solid fa-circle-xmark text-[10px]"></i> Solicitar remoção
               </button>`}
        </div>` : ''}
      </div>`;
  },

  _openInsertModal(memberId) {
    const member = AppState.members.find(m => m.id === memberId);
    const memberName = member?.name || '—';
    const today = new Date().toISOString().slice(0, 10);
    document.getElementById('modal-container').innerHTML = `
      <div class="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4"
           onclick="TodayCtrl._insertBackdrop(event)">
        <div class="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]"
             onclick="event.stopPropagation()">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-bold text-white">Solicitar nova tarefa</h3>
            <button onclick="TodayCtrl._closeInsertModal()"
              class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div class="bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 mb-4">
            <p class="text-xs text-slate-500 mb-0.5">Membro</p>
            <p class="text-sm text-white font-medium">${memberName}</p>
          </div>
          <form onsubmit="TodayCtrl._submitInsertRequest(event,'${memberId}')">
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
                <select id="ins-type" onchange="TodayCtrl._toggleInsertEventTime()"
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
            <div class="mb-4">
              <label class="block text-sm text-slate-400 mb-1.5">Justificativa</label>
              <textarea id="ins-justification" rows="3" maxlength="200"
                placeholder="Por que esta tarefa precisa ser adicionada…"
                class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white placeholder-slate-500
                       focus:outline-none focus:border-primary transition-colors resize-none text-sm"></textarea>
            </div>
            <div class="flex gap-3">
              <button type="button" onclick="TodayCtrl._closeInsertModal()"
                class="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
                Cancelar
              </button>
              <button type="submit"
                class="flex-1 bg-primary hover:bg-primary/90 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
                Enviar solicitação
              </button>
            </div>
          </form>
        </div>
      </div>`;
    setTimeout(() => document.getElementById('ins-title')?.focus(), 50);
  },

  _closeInsertModal() {
    if (this._activeMemberId) this._openMemberModal(this._activeMemberId);
    else document.getElementById('modal-container').innerHTML = '';
  },

  _insertBackdrop(e) {
    if (e.target === e.currentTarget) this._closeInsertModal();
  },

  _toggleInsertEventTime() {
    const type = document.getElementById('ins-type')?.value;
    const wrap = document.getElementById('ins-time-wrap');
    if (wrap) wrap.classList.toggle('hidden', !['treinamento', 'reuniao'].includes(type));
  },

  async _submitInsertRequest(e, memberId) {
    e.preventDefault();
    const member      = AppState.members.find(m => m.id === memberId);
    const memberName  = member?.name || '—';
    const title       = document.getElementById('ins-title').value.trim();
    const type        = document.getElementById('ins-type').value || null;
    const shift       = document.getElementById('ins-shift').value || null;
    const priority    = document.getElementById('ins-priority').value || null;
    const scheduled_date = document.getElementById('ins-date').value || null;
    const showTime    = ['treinamento', 'reuniao'].includes(type);
    const event_time  = showTime ? (document.getElementById('ins-time').value || null) : null;
    const justification = document.getElementById('ins-justification').value.trim() || null;
    const id          = window.App.generateId();

    const { error } = await db.from('tb_aps_task_insert_requests').insert({
      id, member_id: memberId, member_name: memberName,
      title, type, shift, priority, scheduled_date, event_time, justification,
    });

    if (error) { window.Toast.show('Erro ao enviar solicitação.', 'error'); return; }

    setAppState({
      insertRequests: [...AppState.insertRequests, {
        id, member_id: memberId, member_name: memberName,
        title, type, shift, priority, scheduled_date, event_time, justification,
        created_at: new Date().toISOString(),
      }],
    });

    this._closeInsertModal();
    this._render();
    this._refreshMemberModal();
    window.Toast.show('Solicitação enviada para a supervisão.', 'success');
  },

  handleRequest(taskId) {
    if (AppState.requests?.find(r => r.task_id === taskId)) {
      window.Toast.show('Já existe uma solicitação pendente para esta tarefa.', 'info', 4000);
      return;
    }
    const task = this.tasks.find(t => t.id === taskId);
    if (task) this._openRequestModal(task);
  },

  _openRequestModal(task) {
    const memberName = AppState.members.find(m => m.id === task.member_id)?.name || '—';
    document.getElementById('modal-container').innerHTML = `
      <div class="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4"
           onclick="TodayCtrl._reqBackdrop(event)">
        <div class="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl"
             onclick="event.stopPropagation()">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-bold text-white">Solicitar remoção</h3>
            <button onclick="TodayCtrl._closeReqModal()"
              class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div class="bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 mb-4">
            <p class="text-xs text-slate-500 mb-0.5">Tarefa</p>
            <p class="text-sm text-white font-medium">${task.title}</p>
          </div>
          <form onsubmit="TodayCtrl._submitRequest(event,'${task.id}','${memberName}')">
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
              <button type="button" onclick="TodayCtrl._closeReqModal()"
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

  _closeReqModal() {
    if (this._activeMemberId) this._openMemberModal(this._activeMemberId);
    else document.getElementById('modal-container').innerHTML = '';
  },

  _reqBackdrop(e) {
    if (e.target === e.currentTarget) this._closeReqModal();
  },

  async _submitRequest(e, taskId, memberName) {
    e.preventDefault();
    const task          = this.tasks.find(t => t.id === taskId);
    const justification = document.getElementById('req-justification').value.trim();
    const id            = window.App.generateId();

    const { error } = await db.from('tb_aps_task_requests').insert({
      id,
      task_id:      taskId,
      task_title:   task?.title || '—',
      member_name:  memberName,
      justification,
    });

    if (error) { window.Toast.show('Erro ao enviar solicitação.', 'error'); return; }

    setAppState({
      requests: [...AppState.requests, {
        id, task_id: taskId, task_title: task?.title || '—',
        member_name: memberName, justification,
        created_at: new Date().toISOString(),
      }],
    });

    this._closeReqModal();
    this._render();
    this._refreshMemberModal();
    window.Toast.show('Solicitação enviada para a supervisão.', 'success');
  },

  async toggleStatus(id, current) {
    const next = current === 'done' ? 'pending' : 'done';
    const { error } = await db.from('tb_aps_tasks').update({ status: next }).eq('id', id);
    if (error) { window.Toast.show('Erro ao atualizar.', 'error'); return; }
    const task = this.tasks.find(t => t.id === id);
    if (task) task.status = next;
    this._render();
    this._refreshMemberModal();
    window.Toast.show(next === 'done' ? 'Tarefa concluída!' : 'Tarefa reaberta.', next === 'done' ? 'success' : 'info');
  },

  async completeAllForMember(memberId) {
    const pendingIds = this.tasks
      .filter(t => t.member_id === memberId && t.status !== 'done')
      .map(t => t.id);
    if (pendingIds.length === 0) return;

    const { error } = await db.from('tb_aps_tasks').update({ status: 'done' }).in('id', pendingIds);
    if (error) { window.Toast.show('Erro ao atualizar.', 'error'); return; }

    pendingIds.forEach(id => {
      const task = this.tasks.find(t => t.id === id);
      if (task) task.status = 'done';
    });
    this._render();
    this._refreshMemberModal();
    window.Toast.show('Tarefas concluídas!', 'success');
  },

  showTime(time, label) {
    window.Toast.show(`${label} às ${time}`, 'warning', 5000);
  },
};
window.TodayCtrl = TodayCtrl;
