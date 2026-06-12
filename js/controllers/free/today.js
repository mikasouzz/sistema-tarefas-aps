import { db } from '../../db.js';
import { todayStr } from '../../utils/date.js';
import { AppState } from '../../state.js';

const PIN = '<i class="fa-solid fa-thumbtack text-amber-400 text-xs shrink-0 mt-0.5"></i>';

const TYPE_LABEL = {
  operacional: 'Operacional',
  analitica:   'Analítica',
  estrategia:  'Estratégia',
  treinamento: 'Treinamento',
  reuniao:     'Reunião',
};
const TYPE_CLASS = {
  operacional: 'bg-blue-900/50 text-blue-300 border-blue-700',
  analitica:   'bg-violet-900/50 text-violet-300 border-violet-700',
  estrategia:  'bg-amber-900/50 text-amber-300 border-amber-700',
  treinamento: 'bg-emerald-900/50 text-emerald-300 border-emerald-700',
  reuniao:     'bg-rose-900/50 text-rose-300 border-rose-700',
};
const SHIFT_HTML = {
  manha: '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium text-xs bg-amber-400/20 text-amber-400"><i class="fa-solid fa-sun text-xs"></i>Manhã</span>',
  tarde: '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium text-xs bg-orange-400/20 text-orange-400"><i class="fa-solid fa-cloud-sun text-xs"></i>Tarde</span>',
  livre: '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium text-xs bg-teal-400/20 text-teal-400"><i class="fa-solid fa-clock text-xs"></i>Livre</span>',
};

export const TodayCtrl = {
  tasks: [],
  _container: null,

  async init(container) {
    this._container = container;
    container.innerHTML = `
      <div class="flex items-center gap-2 text-slate-500 py-12 justify-center">
        <i class="fa-solid fa-spinner fa-spin"></i> Carregando tarefas…
      </div>`;
    const today = todayStr();
    const { data, error } = await db
      .from('tasks_iss')
      .select('*, members(name)')
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

          <div class="flex-1 overflow-y-auto pr-1">
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              ${groups.map(g => this._memberPanel(g)).join('')}
            </div>
          </div>
        </div>

        <!-- Avisos -->
        ${this._noticesPanel()}

      </div>`;
  },

  _groupByMember() {
    const map = new Map();
    for (const t of this.tasks) {
      const key = t.member_id;
      if (!map.has(key)) map.set(key, { name: t.members?.name || '—', tasks: [] });
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

  _memberPanel(group) {
    const initial   = group.name.charAt(0).toUpperCase();
    const total     = group.tasks.length;
    const doneCount = group.tasks.filter(t => t.status === 'done').length;
    const allDone   = doneCount === total;

    return `
      <div class="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden flex flex-col">
        <div class="px-4 py-3 border-b border-slate-700 flex items-center gap-3">
          <div class="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0
                      ${allDone ? 'bg-accent/20 border border-accent/40 text-accent' : 'bg-primary/20 border border-primary/40 text-primary'}">
            ${allDone ? '<i class="fa-solid fa-check text-xs"></i>' : initial}
          </div>
          <div class="min-w-0 flex-1">
            <p class="font-semibold text-white text-sm truncate">${group.name}</p>
            <p class="text-xs text-slate-400">${doneCount} de ${total} concluída${total !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div class="flex flex-col gap-2 p-3">
          ${group.tasks.map(t => this._card(t)).join('')}
        </div>
      </div>`;
  },

  _card(t) {
    const done      = t.status === 'done';
    const typeClass = TYPE_CLASS[t.type] || 'bg-slate-700 text-slate-300 border-slate-600';
    const hasTime   = (t.type === 'treinamento' || t.type === 'reuniao') && t.event_time;
    return `
      <div class="bg-slate-700/50 border border-slate-600 rounded-lg p-3 flex flex-col gap-2 transition-opacity
                  ${done ? 'opacity-50' : ''} ${t.priority === 'principal' ? 'border-l-2 border-l-violet-500' : ''}">
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
      </div>`;
  },

  async toggleStatus(id, current) {
    const next = current === 'done' ? 'pending' : 'done';
    const { error } = await db.from('tasks_iss').update({ status: next }).eq('id', id);
    if (error) { window.Toast.show('Erro ao atualizar.', 'error'); return; }
    const task = this.tasks.find(t => t.id === id);
    if (task) task.status = next;
    this._render();
    window.Toast.show(next === 'done' ? 'Tarefa concluída!' : 'Tarefa reaberta.', next === 'done' ? 'success' : 'info');
  },

  showTime(time, label) {
    window.Toast.show(`${label} às ${time}`, 'warning', 5000);
  },
};
window.TodayCtrl = TodayCtrl;
