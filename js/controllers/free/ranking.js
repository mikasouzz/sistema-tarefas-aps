import { AppState } from '../../state.js';
import { getMondayOf, toDateStr, fmtShort } from '../../utils/date.js';

const MEDALS = [
  '<i class="fa-solid fa-trophy text-amber-400 text-lg"></i>',
  '<i class="fa-solid fa-medal text-slate-300 text-lg"></i>',
  '<i class="fa-solid fa-medal text-amber-700 text-lg"></i>',
];

const SHIFT_LABEL = { manha: 'Manhã', tarde: 'Tarde', livre: 'Livre' };
const SHIFT_ICON  = {
  manha: '<i class="fa-solid fa-sun text-amber-400 text-base"></i>',
  tarde: '<i class="fa-solid fa-cloud-sun text-orange-400 text-base"></i>',
  livre: '<i class="fa-solid fa-clock text-teal-400 text-base"></i>',
};
const TYPE_LABEL = {
  operacional: 'Operacional',
  analitica:   'Analítica',
  estrategia:  'Estratégia',
  treinamento: 'Treinamento',
  reuniao:     'Reunião',
};
const TYPE_BAR = {
  operacional: 'bg-blue-500',
  analitica:   'bg-violet-500',
  estrategia:  'bg-amber-500',
  treinamento: 'bg-emerald-500',
  reuniao:     'bg-rose-500',
};

export const RankingCtrl = {
  _container: null,

  init(container) {
    this._container = container;
    this._render();
  },

  _weekRange(monday) {
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    return { start: toDateStr(monday), end: toDateStr(friday) };
  },

  _render() {
    const { members, tasks } = AppState;

    const monday     = getMondayOf(new Date());
    const lastMonday = new Date(monday); lastMonday.setDate(monday.getDate() - 7);

    const { start: weekStart, end: weekEnd }     = this._weekRange(monday);
    const { start: lastStart, end: lastEnd }     = this._weekRange(lastMonday);

    const weekTasks     = tasks.filter(t => t.scheduled_date >= weekStart && t.scheduled_date <= weekEnd);
    const lastWeekTasks = tasks.filter(t => t.scheduled_date >= lastStart && t.scheduled_date <= lastEnd);

    const weekLabel = `${fmtShort(monday)} — ${fmtShort(new Date(monday.getTime() + 4 * 86400000))}`;

    // ── Taxa geral ────────────────────────────────────────────────────────────
    const totalCurr = weekTasks.length;
    const doneCurr  = weekTasks.filter(t => t.status === 'done').length;
    const pctCurr   = totalCurr > 0 ? Math.round((doneCurr / totalCurr) * 100) : 0;

    // ── Evolução semanal ──────────────────────────────────────────────────────
    const totalLast = lastWeekTasks.length;
    const doneLast  = lastWeekTasks.filter(t => t.status === 'done').length;
    const pctLast   = totalLast > 0 ? Math.round((doneLast / totalLast) * 100) : null;
    const delta     = pctLast !== null ? pctCurr - pctLast : null;

    // ── Turno mais produtivo ──────────────────────────────────────────────────
    const shiftDone = { manha: 0, tarde: 0, livre: 0 };
    for (const t of weekTasks.filter(t => t.status === 'done')) {
      if (t.shift in shiftDone) shiftDone[t.shift]++;
    }
    const [bestShift, bestShiftCount] = Object.entries(shiftDone).sort((a, b) => b[1] - a[1])[0];

    // ── Taxa por tipo ─────────────────────────────────────────────────────────
    const typeMap = {};
    for (const t of weekTasks) {
      if (!typeMap[t.type]) typeMap[t.type] = { total: 0, done: 0 };
      typeMap[t.type].total++;
      if (t.status === 'done') typeMap[t.type].done++;
    }
    const typeStats = Object.entries(typeMap)
      .map(([type, s]) => ({ type, ...s, pct: Math.round((s.done / s.total) * 100) }))
      .sort((a, b) => b.pct - a.pct || b.total - a.total);

    // ── Ranking com evolução ──────────────────────────────────────────────────
    const rankMap = new Map();
    for (const m of members.filter(m => m.active)) {
      rankMap.set(m.id, { name: m.name, total: 0, done: 0, lastTotal: 0, lastDone: 0 });
    }
    for (const t of weekTasks) {
      if (!rankMap.has(t.member_id)) continue;
      const g = rankMap.get(t.member_id);
      g.total++; if (t.status === 'done') g.done++;
    }
    for (const t of lastWeekTasks) {
      if (!rankMap.has(t.member_id)) continue;
      const g = rankMap.get(t.member_id);
      g.lastTotal++; if (t.status === 'done') g.lastDone++;
    }
    const ranking = [...rankMap.values()]
      .filter(g => g.total > 0)
      .map(g => ({
        ...g,
        pct:     Math.round((g.done / g.total) * 100),
        lastPct: g.lastTotal > 0 ? Math.round((g.lastDone / g.lastTotal) * 100) : null,
        score:   g.done + (g.done * (g.done / g.total)),
      }))
      .sort((a, b) => b.score - a.score || b.done - a.done || a.name.localeCompare(b.name));

    this._container.innerHTML = `
      <!-- Cabeçalho -->
      <div class="mb-6">
        <h2 class="text-xl font-semibold text-white flex items-center gap-2">
          <i class="fa-solid fa-chart-line text-primary"></i> Visão Geral
        </h2>
        <p class="text-slate-400 text-sm mt-1">${weekLabel}</p>
      </div>

      <!-- 3 Cards de destaque -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        ${this._cardTaxaGeral(pctCurr, doneCurr, totalCurr)}
        ${this._cardEvolucao(pctCurr, pctLast, delta)}
        ${this._cardTurno(bestShift, bestShiftCount)}
      </div>

      <!-- Corpo: taxa por tipo + ranking -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        ${this._sectionTipos(typeStats)}
        ${this._sectionRanking(ranking)}
      </div>`;
  },

  // ── Cards de destaque ───────────────────────────────────────────────────────

  _cardTaxaGeral(pct, done, total) {
    const allDone = done > 0 && done === total;
    return `
      <div class="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Taxa da semana</p>
        <p class="text-3xl font-bold ${allDone ? 'text-accent' : 'text-white'}">${pct}<span class="text-lg font-normal text-slate-400">%</span></p>
        <p class="text-slate-400 text-xs mt-1">${done} de ${total} tarefa${total !== 1 ? 's' : ''} concluída${total !== 1 ? 's' : ''}</p>
        <div class="mt-3 w-full bg-slate-700 rounded-full h-1.5">
          <div class="h-1.5 rounded-full ${allDone ? 'bg-accent' : 'bg-primary'}" style="width:${pct}%"></div>
        </div>
      </div>`;
  },

  _cardEvolucao(pctCurr, pctLast, delta) {
    let badge, sub;
    if (delta === null) {
      badge = `<span class="text-slate-500 text-2xl font-bold">—</span>`;
      sub   = `<p class="text-slate-500 text-xs mt-1">Sem dados da semana anterior</p>`;
    } else if (delta > 0) {
      badge = `<span class="text-accent text-3xl font-bold">+${delta}<span class="text-lg font-normal">pp</span></span>`;
      sub   = `<p class="text-slate-400 text-xs mt-1"><i class="fa-solid fa-arrow-trend-up text-accent mr-1"></i>Era ${pctLast}% na semana passada</p>`;
    } else if (delta < 0) {
      badge = `<span class="text-danger text-3xl font-bold">${delta}<span class="text-lg font-normal">pp</span></span>`;
      sub   = `<p class="text-slate-400 text-xs mt-1"><i class="fa-solid fa-arrow-trend-down text-danger mr-1"></i>Era ${pctLast}% na semana passada</p>`;
    } else {
      badge = `<span class="text-slate-300 text-3xl font-bold">=${pctCurr}<span class="text-lg font-normal text-slate-400">%</span></span>`;
      sub   = `<p class="text-slate-400 text-xs mt-1"><i class="fa-solid fa-minus text-slate-400 mr-1"></i>Igual à semana passada</p>`;
    }
    return `
      <div class="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Evolução semanal</p>
        ${badge}
        ${sub}
      </div>`;
  },

  _cardTurno(shift, count) {
    const hasData = count > 0;
    return `
      <div class="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Turno mais produtivo</p>
        ${hasData
          ? `<div class="flex items-center gap-2">
               <span class="text-2xl">${SHIFT_ICON[shift]}</span>
               <span class="text-2xl font-bold text-white">${SHIFT_LABEL[shift]}</span>
             </div>
             <p class="text-slate-400 text-xs mt-1">${count} conclus${count !== 1 ? 'ões' : 'ão'} neste turno</p>`
          : `<span class="text-slate-500 text-2xl font-bold">—</span>
             <p class="text-slate-500 text-xs mt-1">Nenhuma tarefa concluída</p>`}
      </div>`;
  },

  // ── Seção: taxa por tipo ────────────────────────────────────────────────────

  _sectionTipos(typeStats) {
    return `
      <div class="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <p class="text-sm font-semibold text-white mb-4">Conclusão por tipo</p>
        ${typeStats.length === 0
          ? `<p class="text-slate-500 text-sm text-center py-8">Nenhuma tarefa nessa semana.</p>`
          : `<div class="flex flex-col gap-4">
               ${typeStats.map(s => `
                 <div>
                   <div class="flex items-center justify-between mb-1.5">
                     <span class="text-sm text-slate-300">${TYPE_LABEL[s.type] || s.type}</span>
                     <span class="text-xs text-slate-400">${s.done}/${s.total} · <span class="font-medium text-white">${s.pct}%</span></span>
                   </div>
                   <div class="w-full bg-slate-700 rounded-full h-2">
                     <div class="h-2 rounded-full transition-all duration-500 ${TYPE_BAR[s.type] || 'bg-slate-500'}"
                          style="width:${s.pct}%"></div>
                   </div>
                 </div>`).join('')}
             </div>`}
      </div>`;
  },

  // ── Seção: ranking ──────────────────────────────────────────────────────────

  _sectionRanking(ranking) {
    return `
      <div>
        <p class="text-sm font-semibold text-white mb-4">Ranking</p>
        ${ranking.length === 0
          ? `<div class="text-center py-12 text-slate-500 bg-slate-800 border border-slate-700 rounded-xl">
               <i class="fa-solid fa-trophy text-4xl mb-3 block opacity-20"></i>
               <p class="text-sm">Nenhuma tarefa registrada nessa semana.</p>
             </div>`
          : `<div class="flex flex-col gap-3">
               ${ranking.map((g, i) => this._row(g, i)).join('')}
             </div>`}
      </div>`;
  },

  _row(g, i) {
    const pct     = g.pct;
    const allDone = g.done === g.total && g.total > 0;
    const isTop3  = i < 3;
    const initial = g.name.charAt(0).toUpperCase();

    const memberDelta = g.lastPct !== null ? g.pct - g.lastPct : null;
    let evoBadge = '';
    if (memberDelta !== null) {
      if (memberDelta > 0)
        evoBadge = `<span class="text-xs text-accent font-medium"><i class="fa-solid fa-arrow-up text-[10px]"></i> +${memberDelta}pp</span>`;
      else if (memberDelta < 0)
        evoBadge = `<span class="text-xs text-danger font-medium"><i class="fa-solid fa-arrow-down text-[10px]"></i> ${memberDelta}pp</span>`;
      else
        evoBadge = `<span class="text-xs text-slate-500">→</span>`;
    }

    return `
      <div class="bg-slate-800 border ${isTop3 ? 'border-slate-600' : 'border-slate-700'} rounded-xl p-4 flex items-center gap-4">
        <div class="w-8 text-center shrink-0">
          ${isTop3 ? MEDALS[i] : `<span class="text-slate-500 font-bold text-sm">${i + 1}º</span>`}
        </div>
        <div class="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 bg-primary/20 border border-primary/40 text-primary">
          ${initial}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between mb-1.5">
            <div class="flex items-center gap-2 min-w-0">
              <span class="font-medium text-white text-sm truncate">${g.name}</span>
              ${evoBadge}
            </div>
            <span class="text-xs ${allDone ? 'text-accent font-medium' : 'text-slate-400'} shrink-0 ml-2">
              ${g.done} / ${g.total}
            </span>
          </div>
          <div class="w-full bg-slate-700 rounded-full h-1.5">
            <div class="h-1.5 rounded-full transition-all duration-500 ${allDone ? 'bg-accent' : 'bg-primary'}"
                 style="width:${pct}%"></div>
          </div>
        </div>
      </div>`;
  },
};
window.RankingCtrl = RankingCtrl;
