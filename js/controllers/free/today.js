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
  tarde: '<i class="fa-solid fa-moon text-indigo-400" title="Tarde"></i>',
  livre: '<i class="fa-solid fa-wind text-teal-400"  title="Livre"></i>',
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
    const sorted = [...this.tasks].sort((a, b) => {
      if (a.priority === 'principal' && b.priority !== 'principal') return -1;
      if (a.priority !== 'principal' && b.priority === 'principal') return  1;
      return (a.members?.name || '').localeCompare(b.members?.name || '');
    });

    const today = new Date().toLocaleDateString('pt-BR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

    if (sorted.length === 0) {
      c.innerHTML = `
        <div class="text-center py-20 text-slate-500">
          <i class="fa-solid fa-calendar-check text-5xl mb-4 block opacity-40"></i>
          <p class="text-lg">Nenhuma tarefa para hoje.</p>
          <p class="text-sm mt-1 capitalize text-slate-600">${today}</p>
        </div>`;
      return;
    }

    c.innerHTML = `
      <div class="mb-6">
        <h2 class="text-xl font-semibold text-white capitalize">${today}</h2>
        <p class="text-slate-400 text-sm mt-1">${sorted.length} tarefa${sorted.length !== 1 ? 's' : ''} agendada${sorted.length !== 1 ? 's' : ''}</p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        ${sorted.map(t => this._card(t)).join('')}
      </div>`;
  },

  _card(t) {
    const done     = t.status === 'done';
    const typeClass = TYPE_CLASS[t.type] || 'bg-slate-700 text-slate-300 border-slate-600';
    const hasTime  = (t.type === 'treinamento' || t.type === 'reuniao') && t.event_time;
    return `
      <div class="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col gap-3 transition-opacity ${done ? 'opacity-50' : ''}">
        <div class="flex items-start justify-between gap-2">
          <h3 class="font-semibold leading-tight ${done ? 'line-through text-slate-400' : 'text-white'}">${t.title}</h3>
          <button onclick="TodayCtrl.toggleStatus('${t.id}','${t.status}')"
            class="shrink-0 text-xl transition-colors ${done ? 'text-accent hover:text-slate-500' : 'text-slate-600 hover:text-accent'}">
            <i class="fa-solid ${done ? 'fa-circle-check' : 'fa-circle'}"></i>
          </button>
        </div>

        <div class="flex items-center gap-2 text-sm text-slate-300">
          <i class="fa-solid fa-user text-slate-500 text-xs"></i>
          <span>${t.members?.name || '—'}</span>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs px-2 py-0.5 rounded-full font-medium ${t.priority === 'principal' ? 'bg-violet-700 text-white' : 'bg-slate-700 text-slate-300'}">
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
