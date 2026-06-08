import { db } from '../../db.js';

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
  manha: '<i class="fa-solid fa-sun text-amber-400" title="Manhã"></i>',
  tarde: '<i class="fa-solid fa-cloud-sun text-orange-400" title="Tarde"></i>',
  livre: '<i class="fa-solid fa-infinity text-teal-400" title="Livre"></i>',
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
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await db
      .from('tasks_iss')
      .select('*, members(name)')
      .eq('scheduled_date', today)
      .not('member_id', 'is', null);
    if (error) { window.Toast.show('Erro ao carregar tarefas.', 'error'); return; }
    this.tasks = data || [];
    this._render();
  },

  _render() {
    const c = this._container;

    const today = new Date().toLocaleDateString('pt-BR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

    if (this.tasks.length === 0) {
      c.innerHTML = `
        <div class="text-center py-20 text-slate-500">
          <i class="fa-solid fa-calendar-check text-5xl mb-4 block opacity-40"></i>
          <p class="text-lg">Nenhuma tarefa para hoje.</p>
          <p class="text-sm mt-1 capitalize text-slate-600">${today}</p>
        </div>`;
      return;
    }

    const groups = this._groupByMember();

    c.innerHTML = `
      <div class="mb-6">
        <h2 class="text-xl font-semibold text-white capitalize">${today}</h2>
        <p class="text-slate-400 text-sm mt-1">
          ${groups.length} membro${groups.length !== 1 ? 's' : ''} ·
          ${this.tasks.length} tarefa${this.tasks.length !== 1 ? 's' : ''} agendada${this.tasks.length !== 1 ? 's' : ''}
        </p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        ${groups.map(g => this._memberPanel(g)).join('')}
      </div>`;
  },

  _groupByMember() {
    const map = new Map();
    for (const t of this.tasks) {
      const key = t.member_id;
      if (!map.has(key)) map.set(key, { name: t.members?.name || '—', tasks: [] });
      map.get(key).tasks.push(t);
    }
    for (const g of map.values()) {
      g.tasks.sort((a, b) => {
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
          <span class="text-xs px-2 py-0.5 rounded-full font-medium ${t.priority === 'principal' ? 'bg-violet-700 text-white' : 'bg-slate-600 text-slate-300'}">
            ${t.priority === 'principal' ? 'Principal' : 'Secundária'}
          </span>
          <span class="text-xs px-2 py-0.5 rounded border ${typeClass}">${TYPE_LABEL[t.type] || t.type}</span>
          <span>${SHIFT_HTML[t.shift] || ''}</span>
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
