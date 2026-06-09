import { AppState } from '../../state.js';

function getMondayOf(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d;
}
function toLocalDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function fmtShort(d) {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

const MEDALS = [
  '<i class="fa-solid fa-trophy text-amber-400 text-lg"></i>',
  '<i class="fa-solid fa-medal text-slate-300 text-lg"></i>',
  '<i class="fa-solid fa-medal text-amber-700 text-lg"></i>',
];

export const RankingCtrl = {
  _container: null,

  init(container) {
    this._container = container;
    this._render();
  },

  _render() {
    const { members, tasks } = AppState;

    const monday  = getMondayOf(new Date());
    const friday  = new Date(monday); friday.setDate(monday.getDate() + 4);
    const weekStart = toLocalDateStr(monday);
    const weekEnd   = toLocalDateStr(friday);

    const weekTasks = tasks.filter(t =>
      t.scheduled_date >= weekStart && t.scheduled_date <= weekEnd
    );

    const map = new Map();
    for (const m of members.filter(m => m.active)) {
      map.set(m.id, { name: m.name, total: 0, done: 0 });
    }
    for (const t of weekTasks) {
      if (!map.has(t.member_id)) continue;
      const g = map.get(t.member_id);
      g.total++;
      if (t.status === 'done') g.done++;
    }

    const ranking = [...map.values()]
      .filter(g => g.total > 0)
      .sort((a, b) => b.done - a.done || b.total - a.total || a.name.localeCompare(b.name));

    const weekLabel = `${fmtShort(monday)} — ${fmtShort(friday)}`;

    this._container.innerHTML = `
      <div class="mb-6 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 class="text-xl font-semibold text-white flex items-center gap-2">
            <i class="fa-solid fa-ranking-star text-amber-400"></i> Ranking da Semana
          </h2>
          <p class="text-slate-400 text-sm mt-1">${weekLabel}</p>
        </div>
      </div>

      ${ranking.length === 0
        ? `<div class="text-center py-20 text-slate-500">
             <i class="fa-solid fa-trophy text-5xl mb-4 block opacity-20"></i>
             <p>Nenhuma tarefa registrada nessa semana.</p>
           </div>`
        : `<div class="flex flex-col gap-3 max-w-2xl">
             ${ranking.map((g, i) => this._row(g, i)).join('')}
           </div>`}`;
  },

  _row(g, i) {
    const pct     = g.total > 0 ? Math.round((g.done / g.total) * 100) : 0;
    const allDone = g.done === g.total && g.total > 0;
    const isTop3  = i < 3;
    const initial = g.name.charAt(0).toUpperCase();

    return `
      <div class="bg-slate-800 border ${isTop3 ? 'border-slate-600' : 'border-slate-700'} rounded-xl p-4 flex items-center gap-4">
        <div class="w-8 text-center shrink-0">
          ${isTop3 ? MEDALS[i] : `<span class="text-slate-500 font-bold text-sm">${i + 1}º</span>`}
        </div>
        <div class="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0
                    ${allDone ? 'bg-accent/20 border border-accent/40 text-accent' : 'bg-primary/20 border border-primary/40 text-primary'}">
          ${allDone ? '<i class="fa-solid fa-check text-xs"></i>' : initial}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between mb-1.5">
            <span class="font-medium text-white text-sm truncate">${g.name}</span>
            <span class="text-xs ${allDone ? 'text-accent font-medium' : 'text-slate-400'} shrink-0 ml-2">
              ${g.done} / ${g.total}
            </span>
          </div>
          <div class="w-full bg-slate-700 rounded-full h-1.5">
            <div class="h-1.5 rounded-full transition-all duration-500 ${allDone ? 'bg-accent' : 'bg-primary'}"
                 style="width: ${pct}%"></div>
          </div>
        </div>
      </div>`;
  },
};
window.RankingCtrl = RankingCtrl;
