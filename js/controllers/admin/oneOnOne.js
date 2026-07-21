import { db } from '../../db.js';
import { AppState, setAppState } from '../../state.js';
import { getWeeksOfMonth, weekOfMonthIndex, fmtShort, monthInputVal, toDateStr, todayStr } from '../../utils/date.js';

const PLAN_LABEL = { quinzenal: 'Quinzenal', semanal: 'Semanal', mensal: 'Mensal' };
const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export const OneOnOneCtrl = {
  _container: null,
  _monthStart: (() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; })(),

  init(container) {
    this._container = container;
    this._render();
  },

  _render() {
    const year  = this._monthStart.getFullYear();
    const month = this._monthStart.getMonth();
    const weeks = getWeeksOfMonth(year, month);
    const today = todayStr();

    const members = AppState.members.filter(m => m.active && m.one_on_one_plan);

    const monthStart = toDateStr(weeks[0].start);
    const monthEnd    = toDateStr(weeks[weeks.length - 1].end);
    const entries = AppState.oneOnOnes.filter(o => o.date >= monthStart && o.date <= monthEnd);

    this._container.innerHTML = `
      <div class="flex-1 flex flex-col min-h-0">

        <div class="flex items-center justify-between mb-5 flex-wrap gap-3 shrink-0">
          <div>
            <h2 class="text-xl font-semibold text-white">One a One</h2>
            <p class="text-slate-400 text-sm mt-1">
              ${members.length === 0
                ? 'Nenhum colaborador com plano de 1:1 cadastrado.'
                : `${members.length} colaborador${members.length !== 1 ? 'es' : ''} com plano de 1:1`}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="OneOnOneCtrl.shiftMonth(-1)"
              class="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors">
              <i class="fa-solid fa-chevron-left text-xs"></i>
            </button>
            <input type="month" value="${monthInputVal(this._monthStart)}"
              onchange="OneOnOneCtrl.setMonth(this.value)"
              class="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white
                     focus:outline-none focus:border-primary transition-colors">
            <button onclick="OneOnOneCtrl.shiftMonth(1)"
              class="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors">
              <i class="fa-solid fa-chevron-right text-xs"></i>
            </button>
            <button onclick="OneOnOneCtrl.goToday()"
              class="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm transition-colors">
              Hoje
            </button>
            <button onclick="OneOnOneCtrl.openForm()"
              class="flex items-center gap-2 bg-primary hover:bg-violet-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              <i class="fa-solid fa-calendar-plus"></i> Agendar 1:1
            </button>
          </div>
        </div>

        <div class="flex-1 min-h-0 bg-slate-800 border border-slate-700 rounded-xl overflow-auto">
          <div style="display:grid; grid-template-columns: 180px repeat(${weeks.length}, minmax(160px, 1fr)); min-width: ${180 + weeks.length * 160}px;">

            <div class="px-2.5 py-2 border-b border-r border-slate-700 bg-slate-800 sticky top-0 left-0 z-20 flex items-end">
              <span class="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Colaboradores</span>
            </div>

            ${weeks.map((w, i) => {
              const isCurrent = today >= toDateStr(w.start) && today <= toDateStr(w.end);
              return `
                <div class="px-2 py-2 border-b border-l border-slate-700 text-center bg-slate-800 sticky top-0 z-10">
                  <p class="text-[10px] font-semibold ${isCurrent ? 'text-primary' : 'text-slate-400'}">Semana ${i + 1}</p>
                  <p class="text-xs font-medium ${isCurrent ? 'text-primary' : 'text-white'}">${fmtShort(w.start)}–${fmtShort(w.end)}</p>
                </div>`;
            }).join('')}

            ${members.length === 0
              ? `<div style="grid-column: span ${weeks.length + 1};" class="py-12 text-center text-slate-500 text-sm">
                   Nenhum colaborador com plano de 1:1 definido. Configure em Equipe.
                 </div>`
              : members.map(m => `
                  <div class="px-2.5 py-2 border-t border-r border-slate-700 bg-slate-800/60 sticky left-0 z-10 flex items-center justify-between gap-1.5">
                    <span class="text-xs font-medium text-white truncate">${m.name}</span>
                    <span class="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-900/40 border border-violet-700 text-violet-300 shrink-0">${PLAN_LABEL[m.one_on_one_plan] || m.one_on_one_plan}</span>
                  </div>
                  ${weeks.map((w, i) => {
                    const cellEntries = entries
                      .filter(o => o.member_id === m.id && weekOfMonthIndex(o.date) === i)
                      .sort((a, b) => a.date.localeCompare(b.date));
                    return `
                      <div class="border-t border-l border-slate-700 px-1.5 py-1.5 flex flex-col gap-1 min-h-[48px]">
                        ${cellEntries.map(o => this._card(o)).join('')}
                      </div>`;
                  }).join('')}
                `).join('')}
          </div>
        </div>
      </div>`;
  },

  _card(o) {
    return `
      <div class="bg-violet-900/40 border border-violet-700/70 rounded px-1.5 py-1 flex items-center justify-between gap-1.5 group">
        <span class="text-[11px] text-violet-200 truncate leading-tight flex items-center gap-1">
          <i class="fa-solid fa-people-arrows text-[10px]"></i>${fmtShort(new Date(o.date + 'T00:00:00'))}
        </span>
        <button onclick="OneOnOneCtrl.remove('${o.id}')"
          class="text-violet-300/60 hover:text-danger transition-colors opacity-0 group-hover:opacity-100">
          <i class="fa-solid fa-xmark text-[10px]"></i>
        </button>
      </div>`;
  },

  shiftMonth(delta) {
    const d = new Date(this._monthStart);
    d.setMonth(d.getMonth() + delta);
    this._monthStart = d;
    this._render();
  },

  goToday() {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    this._monthStart = d;
    this._render();
  },

  setMonth(val) {
    const [year, month] = val.split('-').map(Number);
    this._monthStart = new Date(year, month - 1, 1);
    this._render();
  },

  openForm() {
    const members = AppState.members.filter(m => m.active && m.one_on_one_plan);
    document.getElementById('modal-container').innerHTML = `
      <div class="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4"
           onclick="OneOnOneCtrl._backdropClick(event)">
        <div class="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl"
             onclick="event.stopPropagation()">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-bold text-white">Agendar 1:1</h3>
            <button onclick="OneOnOneCtrl.closeForm()"
              class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <form onsubmit="OneOnOneCtrl.save(event)" class="flex flex-col gap-4">
            <div>
              <label class="block text-sm text-slate-400 mb-1.5">Colaborador</label>
              <select id="oo-member" required
                class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white
                       focus:outline-none focus:border-primary transition-colors">
                ${members.length === 0
                  ? '<option value="">Nenhum colaborador com plano de 1:1</option>'
                  : members.map(m => `<option value="${m.id}">${m.name} (${PLAN_LABEL[m.one_on_one_plan] || m.one_on_one_plan})</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-sm text-slate-400 mb-1.5">Data do 1:1</label>
              <input id="oo-date" type="date" required
                class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white
                       focus:outline-none focus:border-primary transition-colors">
            </div>
            <div class="flex gap-3 mt-2">
              <button type="button" onclick="OneOnOneCtrl.closeForm()"
                class="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
                Cancelar
              </button>
              <button type="submit"
                class="flex-1 bg-primary hover:bg-violet-600 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
                Agendar
              </button>
            </div>
          </form>
        </div>
      </div>`;
  },

  closeForm() {
    document.getElementById('modal-container').innerHTML = '';
  },

  _backdropClick(e) {
    if (e.target === e.currentTarget) this.closeForm();
  },

  async save(e) {
    e.preventDefault();
    const member_id = document.getElementById('oo-member').value;
    const date       = document.getElementById('oo-date').value;
    if (!member_id || !date) return;

    const id = window.App.generateId();
    const { error } = await db.from('tb_aps_one_on_ones').insert({ id, member_id, date });
    if (error) { window.Toast.show('Erro ao agendar 1:1.', 'error'); return; }

    const { data } = await db.from('tb_aps_one_on_ones').select('*').order('date');
    setAppState({ oneOnOnes: data || [] });

    const [year, month] = date.split('-').map(Number);
    this._monthStart = new Date(year, month - 1, 1);

    this.closeForm();
    this._render();
    window.Toast.show(`1:1 agendado na Semana ${weekOfMonthIndex(date) + 1}.`, 'success');
  },

  async remove(id) {
    const { error } = await db.from('tb_aps_one_on_ones').delete().eq('id', id);
    if (error) { window.Toast.show('Erro ao remover 1:1.', 'error'); return; }
    const { data } = await db.from('tb_aps_one_on_ones').select('*').order('date');
    setAppState({ oneOnOnes: data || [] });
    this._render();
    window.Toast.show('1:1 removido.', 'info');
  },
};
window.OneOnOneCtrl = OneOnOneCtrl;
