import { AppState } from '../../state.js';
import { getMondayOf, toDateStr, fmtShort } from '../../utils/date.js';

const TYPE_LABEL = {
  operacional: 'Operacional',
  analitica:   'Analítica',
  estrategia:  'Estratégia',
  treinamento: 'Treinamento',
  reuniao:     'Reunião',
  suporte:     'Suporte',
};
const TYPE_ORDER = ['operacional', 'analitica', 'estrategia', 'treinamento', 'reuniao', 'suporte'];
const TYPE_BAR = {
  operacional: 'bg-blue-500',
  analitica:   'bg-violet-500',
  estrategia:  'bg-amber-500',
  treinamento: 'bg-emerald-500',
  reuniao:     'bg-rose-500',
  suporte:     'bg-cyan-500',
};
const TYPE_HEX = {
  operacional: '#3b82f6',
  analitica:   '#8b5cf6',
  estrategia:  '#f59e0b',
  treinamento: '#10b981',
  reuniao:     '#f43f5e',
  suporte:     '#06b6d4',
};

export const RankingCtrl = {
  _container: null,
  _selectedMemberId: 'all',
  _rangeStart: null,
  _rangeEnd: null,

  init(container) {
    this._container = container;
    const monday = getMondayOf(new Date());
    const friday = new Date(monday); friday.setDate(monday.getDate() + 4);
    this._rangeStart = toDateStr(monday);
    this._rangeEnd   = toDateStr(friday);
    this._render();
  },

  onMemberChange(value) {
    this._selectedMemberId = value;
    this._render();
  },

  _monthWeeks(refDate) {
    const year  = refDate.getFullYear();
    const month = refDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay  = new Date(year, month + 1, 0);

    const weeks = [];
    let cursor = getMondayOf(firstDay);
    let idx = 1;
    while (cursor <= lastDay) {
      const friday = new Date(cursor); friday.setDate(cursor.getDate() + 4);
      const start = new Date(Math.max(cursor, firstDay));
      const end   = new Date(Math.min(friday, lastDay));
      if (start <= lastDay && end >= firstDay) {
        weeks.push({ label: `S${idx}`, start: toDateStr(start), end: toDateStr(end) });
        idx++;
      }
      cursor = new Date(cursor); cursor.setDate(cursor.getDate() + 7);
    }
    return weeks;
  },

  onRangeChange(field, value) {
    if (!value) return;
    if (field === 'start') this._rangeStart = value;
    if (field === 'end')   this._rangeEnd   = value;
    if (this._rangeStart > this._rangeEnd) {
      if (field === 'start') this._rangeEnd = value;
      else this._rangeStart = value;
    }
    this._render();
  },

  _render() {
    const { members, tasks } = AppState;
    const active = members.filter(m => m.active);

    const weekStart = this._rangeStart;
    const weekEnd    = this._rangeEnd;
    const weekLabel  = `${fmtShort(new Date(weekStart + 'T12:00:00'))} — ${fmtShort(new Date(weekEnd + 'T12:00:00'))}`;

    const allWeekTasks = tasks.filter(t => t.scheduled_date >= weekStart && t.scheduled_date <= weekEnd);
    let weekTasks = allWeekTasks;
    if (this._selectedMemberId !== 'all') {
      weekTasks = weekTasks.filter(t => t.member_id === this._selectedMemberId);
    }

    // ── Taxa geral ────────────────────────────────────────────────────────────
    const totalCurr = weekTasks.length;
    const doneCurr  = weekTasks.filter(t => t.status === 'done').length;
    const pctCurr   = totalCurr > 0 ? Math.round((doneCurr / totalCurr) * 100) : 0;

    // ── Distribuição por tipo (rosca) ────────────────────────────────────────
    const typeMap = {};
    for (const t of weekTasks) {
      if (!typeMap[t.type]) typeMap[t.type] = { total: 0, done: 0 };
      typeMap[t.type].total++;
      if (t.status === 'done') typeMap[t.type].done++;
    }
    const typeStats = TYPE_ORDER
      .filter(type => typeMap[type])
      .map(type => ({ type, ...typeMap[type], pct: Math.round((typeMap[type].done / typeMap[type].total) * 100) }));

    // ── Rankings de suporte / treinamento / reunião ──────────────────────────
    const rankingTypes = ['suporte', 'treinamento', 'reuniao'];
    const memberCounts = new Map();
    for (const m of active) {
      memberCounts.set(m.id, { name: m.name, suporte: 0, treinamento: 0, reuniao: 0 });
    }
    for (const t of allWeekTasks) {
      const g = memberCounts.get(t.member_id);
      if (g && rankingTypes.includes(t.type)) g[t.type]++;
    }
    const typeRankings = Object.fromEntries(rankingTypes.map(type => [
      type,
      [...memberCounts.values()]
        .sort((a, b) => b[type] - a[type] || a.name.localeCompare(b.name)),
    ]));

    // ── Evolução semanal do mês corrente ─────────────────────────────────────
    const monthWeeks = this._monthWeeks(new Date());
    const memberFilter = t => this._selectedMemberId === 'all' || t.member_id === this._selectedMemberId;
    const weeklyVolume = monthWeeks.map(w => ({
      ...w,
      total: tasks.filter(t => memberFilter(t) && t.scheduled_date >= w.start && t.scheduled_date <= w.end).length,
    }));

    this._container.innerHTML = `
      <div class="flex-1 flex flex-col min-h-0 overflow-y-auto">
        <!-- Cabeçalho -->
        <div class="mb-6 shrink-0 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 class="text-xl font-semibold text-white flex items-center gap-2">
              <i class="fa-solid fa-chart-line text-primary"></i> Visão Geral
            </h2>
            <p class="text-slate-400 text-sm mt-1">${weekLabel}</p>
          </div>
          <div class="flex items-end gap-2 flex-wrap">
            <div>
              <label class="block text-xs text-slate-400 mb-1">De</label>
              <input type="date" value="${this._rangeStart}" max="${this._rangeEnd}"
                onchange="RankingCtrl.onRangeChange('start', this.value)"
                class="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white
                       focus:outline-none focus:border-primary transition-colors">
            </div>
            <div>
              <label class="block text-xs text-slate-400 mb-1">Até</label>
              <input type="date" value="${this._rangeEnd}" min="${this._rangeStart}"
                onchange="RankingCtrl.onRangeChange('end', this.value)"
                class="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white
                       focus:outline-none focus:border-primary transition-colors">
            </div>
            <div>
              <label class="block text-xs text-slate-400 mb-1">Membro</label>
              <select onchange="RankingCtrl.onMemberChange(this.value)"
                class="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white
                       focus:outline-none focus:border-primary transition-colors min-w-[180px]">
                <option value="all" ${this._selectedMemberId === 'all' ? 'selected' : ''}>Toda a equipe</option>
                ${active.map(m => `<option value="${m.id}" ${this._selectedMemberId === m.id ? 'selected' : ''}>${m.name}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>

        <!-- Card de destaque -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 shrink-0">
          ${this._cardTaxaGeral(pctCurr, doneCurr, totalCurr)}
        </div>

        <!-- Corpo: rosca por tipo + evolução semanal + destaques -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          ${this._sectionDonut(typeStats, totalCurr)}
          ${this._sectionEvolucaoMensal(weeklyVolume)}
          ${this._sectionDestaques(typeRankings)}
        </div>

        <!-- Rankings: suporte / treinamento / reunião -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          ${this._sectionRankingTipo('suporte',     typeRankings.suporte,     'fa-headset')}
          ${this._sectionRankingTipo('treinamento', typeRankings.treinamento, 'fa-chalkboard-user')}
          ${this._sectionRankingTipo('reuniao',      typeRankings.reuniao,    'fa-users')}
        </div>
      </div>`;
  },

  // ── Card de destaque ────────────────────────────────────────────────────────

  _cardTaxaGeral(pct, done, total) {
    const allDone = done > 0 && done === total;
    return `
      <div class="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Taxa do período</p>
        <p class="text-3xl font-bold ${allDone ? 'text-accent' : 'text-white'}">${pct}<span class="text-lg font-normal text-slate-400">%</span></p>
        <p class="text-slate-400 text-xs mt-1">${done} de ${total} tarefa${total !== 1 ? 's' : ''} concluída${total !== 1 ? 's' : ''}</p>
        <div class="mt-3 w-full bg-slate-700 rounded-full h-1.5">
          <div class="h-1.5 rounded-full ${allDone ? 'bg-accent' : 'bg-primary'}" style="width:${pct}%"></div>
        </div>
      </div>`;
  },

  // ── Seção: gráfico de rosca por tipo ─────────────────────────────────────────

  _sectionDonut(typeStats, total) {
    if (typeStats.length === 0) {
      return `
        <div class="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <p class="text-sm font-semibold text-white mb-4">Demandas por tipo</p>
          <p class="text-slate-500 text-sm text-center py-8">Nenhuma tarefa nessa semana.</p>
        </div>`;
    }

    let acc = 0;
    const stops = typeStats.map(s => {
      const from = (acc / total) * 360;
      acc += s.total;
      const to = (acc / total) * 360;
      return `${TYPE_HEX[s.type]} ${from}deg ${to}deg`;
    }).join(', ');

    return `
      <div class="bg-slate-800 border border-slate-700 rounded-xl p-5 h-full flex flex-col">
        <p class="text-sm font-semibold text-white mb-4">Demandas por tipo</p>
        <div class="flex flex-col items-center gap-5">
          <div class="relative shrink-0" style="width:150px;height:150px">
            <div class="w-full h-full rounded-full" style="background:conic-gradient(${stops})"></div>
            <div class="absolute inset-[18%] bg-slate-800 rounded-full flex flex-col items-center justify-center">
              <span class="text-xl font-bold text-white">${total}</span>
              <span class="text-[9px] text-slate-400 uppercase tracking-wide">tarefa${total !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <div class="flex flex-col gap-2 flex-1 min-w-0 w-full">
            ${typeStats.map(s => {
              const share = Math.round((s.total / total) * 100);
              return `
                <div class="flex items-center justify-between gap-3">
                  <span class="flex items-center gap-2 text-sm text-slate-300 min-w-0">
                    <span class="w-2.5 h-2.5 rounded-sm ${TYPE_BAR[s.type]} shrink-0"></span>
                    <span class="truncate">${TYPE_LABEL[s.type] || s.type}</span>
                  </span>
                  <span class="text-xs text-slate-400 shrink-0">${s.total} · <span class="font-medium text-white">${share}%</span></span>
                </div>`;
            }).join('')}
          </div>
        </div>
      </div>`;
  },
  // ── Seção: destaques da semana ───────────────────────────────────────────────

  _sectionDestaques(typeRankings) {
    const items = [
      { type: 'suporte',     icon: 'fa-headset' },
      { type: 'treinamento', icon: 'fa-chalkboard-user' },
      { type: 'reuniao',     icon: 'fa-users' },
    ];
    return `
      <div class="bg-slate-800 border border-slate-700 rounded-xl p-5 h-full flex flex-col">
        <p class="text-sm font-semibold text-white mb-4">Destaques da semana</p>
        <div class="flex flex-col gap-3 flex-1 justify-center">
          ${items.map(({ type, icon }) => {
            const leader = typeRankings[type]?.[0];
            const hasScore = leader && leader[type] > 0;
            return `
              <div class="flex items-center gap-3 bg-slate-700/40 border border-slate-600/60 rounded-lg px-3 py-2.5">
                <span class="text-xl trophy-bounce shrink-0">${hasScore ? '🏆' : '<i class="fa-solid fa-trophy text-slate-600 text-lg"></i>'}</span>
                <div class="min-w-0 flex-1">
                  <p class="text-[10px] text-slate-500 uppercase tracking-wide flex items-center gap-1">
                    <i class="fa-solid ${icon}"></i>${TYPE_LABEL[type]}
                  </p>
                  ${hasScore
                    ? `<p class="text-sm text-white font-medium truncate">${leader.name} <span class="text-slate-400 font-normal">· ${leader[type]}</span></p>`
                    : `<p class="text-sm text-slate-500">Sem dados</p>`}
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>`;
  },

  // ── Seção: ranking por tipo (suporte / treinamento / reunião) ───────────────

  _sectionRankingTipo(type, ranking, icon) {
    const barCls = TYPE_BAR[type];
    const max = ranking.length > 0 ? Math.max(...ranking.map(g => g[type])) : 0;
    return `
      <div class="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <p class="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <i class="fa-solid ${icon} text-slate-400"></i>${TYPE_LABEL[type]}
        </p>
        ${ranking.length === 0
          ? `<p class="text-slate-500 text-sm text-center py-6">Nenhum membro ativo.</p>`
          : `<div class="flex flex-col gap-2.5">
               ${ranking.map((g, i) => `
                 <div>
                   <div class="flex items-center justify-between mb-1">
                     <span class="text-xs text-slate-300 truncate flex items-center gap-1.5">
                       <span class="text-slate-500 font-semibold shrink-0">${i + 1}º</span>${g.name}
                     </span>
                     <span class="text-xs font-medium text-white shrink-0">${g[type]}</span>
                   </div>
                   <div class="w-full bg-slate-700 rounded-full h-1.5">
                     <div class="h-1.5 rounded-full ${barCls}" style="width:${max > 0 ? Math.round((g[type] / max) * 100) : 0}%"></div>
                   </div>
                 </div>`).join('')}
             </div>`}
      </div>`;
  },
  // ── Seção: evolução semanal do mês ──────────────────────────────────────────

  _sectionEvolucaoMensal(weeklyVolume) {
    const max = Math.max(1, ...weeklyVolume.map(w => w.total));
    const monthLabel = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const PLOT_H = 130;
    const n = weeklyVolume.length;
    const slot = 100 / n;

    const points = weeklyVolume.map((w, i) => {
      const heightPct = w.total > 0 ? Math.max(4, (w.total / max) * 100) : 0;
      return { x: slot * (i + 0.5), y: PLOT_H - (heightPct / 100) * PLOT_H };
    });
    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    return `
      <div class="bg-slate-800 border border-slate-700 rounded-xl p-5 h-full flex flex-col">
        <p class="text-sm font-semibold text-white mb-1">Evolução semanal</p>
        <p class="text-xs text-slate-500 mb-5 capitalize">Volume de tarefas por semana · ${monthLabel}</p>
        <div class="relative flex-1" style="height:${PLOT_H}px">
          <svg class="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 100 ${PLOT_H}" preserveAspectRatio="none">
            <path d="${linePath}" fill="none" stroke="#facc15" stroke-width="2" vector-effect="non-scaling-stroke" />
            ${points.map(p => `<circle cx="${p.x}" cy="${p.y}" r="2.2" fill="#facc15" vector-effect="non-scaling-stroke" />`).join('')}
          </svg>
          <div class="absolute inset-0 flex items-end justify-around gap-3">
            ${weeklyVolume.map(w => {
              const heightPct = w.total > 0 ? Math.max(4, Math.round((w.total / max) * 100)) : 0;
              const rangeLabel = `${fmtShort(new Date(w.start + 'T12:00:00'))} – ${fmtShort(new Date(w.end + 'T12:00:00'))}`;
              return `
                <div class="flex flex-col items-center flex-1 h-full justify-end" title="${rangeLabel}">
                  <span class="text-xs font-medium text-white mb-1">${w.total}</span>
                  <div class="w-full max-w-[44px] bg-primary/70 rounded-t-md transition-all duration-500" style="height:${heightPct}%"></div>
                </div>`;
            }).join('')}
          </div>
        </div>
        <div class="flex items-center justify-around gap-3 mt-2">
          ${weeklyVolume.map(w => `<span class="flex-1 text-center text-[10px] text-slate-500 uppercase tracking-wide">${w.label}</span>`).join('')}
        </div>
      </div>`;
  },
};
window.RankingCtrl = RankingCtrl;
