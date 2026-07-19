import { AppState } from '../../state.js';
import { getMondayOf, toDateStr, todayStr, fmtShort, weekInputVal } from '../../utils/date.js';

const DAY_NAMES  = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
const TYPE_LABEL = { treinamento: 'Treinamento', reuniao: 'Reunião' };
const TYPE_BADGE = {
  treinamento: 'bg-teal-900/50 text-teal-300 border-teal-700',
  reuniao:     'bg-violet-900/50 text-violet-300 border-violet-700',
};
const EVENT_COLOR_CARD_BG = {
  rosa:    'bg-pink-900/40 border-pink-700/70',
  azul:    'bg-blue-900/40 border-blue-700/70',
  amarelo: 'bg-yellow-500/30 border-yellow-400/70',
  cinza:   'bg-zinc-400/30 border-zinc-300/60',
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

  init(container) {
    this._container = container;
    this._render();
  },

  _render() {
    const weekDays  = getWeekDays(this._weekStart);
    const weekStart = toDateStr(weekDays[0]);
    const weekEnd   = toDateStr(weekDays[4]);
    const today     = todayStr();

    const events = AppState.tasks.filter(t =>
      (t.type === 'treinamento' || t.type === 'reuniao') &&
      t.scheduled_date >= weekStart &&
      t.scheduled_date <= weekEnd
    );

    const hasLivre = events.some(t => t.shift === 'livre');

    const totalEvents = events.length;

    const dayHeader = (day, i) => {
      const dateStr = toDateStr(day);
      const isToday = dateStr === today;
      const count   = events.filter(t => t.scheduled_date === dateStr).length;
      return `
        <div class="bg-slate-800 px-3 py-3 text-center">
          <p class="text-xs font-semibold ${isToday ? 'text-primary' : 'text-slate-400'}">${DAY_NAMES[i]}</p>
          <p class="text-sm font-bold ${isToday ? 'text-primary' : 'text-white'} mt-0.5">${fmtShort(day)}</p>
          ${count > 0 ? `<span class="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-400">${count} evento${count !== 1 ? 's' : ''}</span>` : ''}
        </div>`;
    };

    const shiftLabel = (icon, iconCls, label, labelCls) => `
      <div class="col-span-5 flex items-center gap-2 px-4 py-1.5 bg-slate-900/80">
        <i class="fa-solid ${icon} ${iconCls} text-[10px]"></i>
        <span class="text-[10px] font-semibold ${labelCls} uppercase tracking-widest">${label}</span>
      </div>`;

    const cell = (shift, day) => {
      const dateStr    = toDateStr(day);
      const cellEvents = events
        .filter(t => t.scheduled_date === dateStr && t.shift === shift)
        .sort((a, b) => (a.event_time || '').localeCompare(b.event_time || ''));

      // Agrupa por group_id quando presente; sem group_id = card individual
      const groups = [];
      const grupoMap = new Map();
      for (const t of cellEvents) {
        if (t.group_id) {
          if (grupoMap.has(t.group_id)) {
            grupoMap.get(t.group_id).members.push(t);
          } else {
            const g = { ...t, members: [t] };
            grupoMap.set(t.group_id, g);
            groups.push(g);
          }
        } else {
          groups.push({ ...t, members: [t] });
        }
      }

      return `
        <div class="bg-slate-800 p-1.5 flex flex-col gap-1 min-h-[80px]">
          ${groups.length === 0
            ? `<span class="text-slate-700 text-xs text-center block pt-5">—</span>`
            : groups.map(g => this._card(g)).join('')}
        </div>`;
    };

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
          </div>
        </div>

        <div class="flex-1 min-h-0 overflow-auto">
          <div class="rounded-xl overflow-hidden border border-slate-700" style="min-width:640px">
            <div class="grid gap-px bg-slate-700" style="grid-template-columns:repeat(5,1fr)">

              ${weekDays.map((d, i) => dayHeader(d, i)).join('')}

              ${shiftLabel('fa-sun', 'text-amber-400', 'Manhã', 'text-amber-400')}
              ${weekDays.map(d => cell('manha', d)).join('')}

              ${shiftLabel('fa-cloud-sun', 'text-orange-400', 'Tarde', 'text-orange-400')}
              ${weekDays.map(d => cell('tarde', d)).join('')}

              ${hasLivre ? shiftLabel('fa-clock', 'text-teal-400', 'Livre', 'text-teal-400') : ''}
              ${hasLivre ? weekDays.map(d => cell('livre', d)).join('') : ''}

            </div>
          </div>
        </div>
      </div>`;
  },

  _card(group) {
    const isPrincipal = group.priority === 'principal';
    const badgeCls    = TYPE_BADGE[group.type] || 'bg-slate-700 text-slate-300 border-slate-600';
    const cardBg      = EVENT_COLOR_CARD_BG[group.event_color] || 'bg-slate-700/60 border-slate-600/80';
    const VISIBLE     = 4;
    const extra       = group.members.length - VISIBLE;

    const avatars = group.members.slice(0, VISIBLE).map(t => {
      const name = t.tb_aps_members?.name || AppState.members.find(m => m.id === t.member_id)?.name || '?';
      return `<div class="w-5 h-5 rounded-full bg-primary/30 border border-primary/50 text-primary
                          flex items-center justify-center font-bold text-[10px] shrink-0"
                   title="${name}">${name.charAt(0).toUpperCase()}</div>`;
    }).join('');

    const singleName = group.members.length === 1
      ? (group.tb_aps_members?.name || AppState.members.find(m => m.id === group.member_id)?.name || '—')
      : '';

    return `
      <div class="${cardBg} border rounded p-2 flex flex-col gap-1.5
                  ${isPrincipal ? 'border-l-2 border-l-violet-500' : ''}">
        <div class="flex items-center justify-between gap-1">
          ${group.event_time
            ? `<span class="text-xs font-bold text-white">${group.event_time}</span>`
            : '<span></span>'}
          <span class="text-[10px] px-1.5 py-px rounded border ${badgeCls} shrink-0">
            ${TYPE_LABEL[group.type] || group.type}
          </span>
        </div>
        <p class="text-xs font-semibold text-white leading-tight truncate">${group.title}</p>
        <div class="flex items-center gap-1 flex-wrap">
          ${avatars}
          ${extra > 0 ? `<span class="text-[10px] text-slate-400">+${extra}</span>` : ''}
          ${singleName ? `<span class="text-xs text-slate-300 truncate">${singleName}</span>` : ''}
        </div>
      </div>`;
  },

  shiftWeek(delta) {
    const d = new Date(this._weekStart);
    d.setDate(d.getDate() + delta * 7);
    this._weekStart = d;
    this._render();
  },

  goToday() {
    this._weekStart = getMondayOf(new Date());
    this._render();
  },

  setWeek(val) {
    const [year, week] = val.split('-W').map(Number);
    const jan4 = new Date(year, 0, 4);
    const mon  = new Date(jan4);
    mon.setDate(jan4.getDate() - (jan4.getDay() || 7) + 1 + (week - 1) * 7);
    mon.setHours(0, 0, 0, 0);
    this._weekStart = mon;
    this._render();
  },
};
window.AgendaCtrl = AgendaCtrl;
