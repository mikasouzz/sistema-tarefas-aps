import { db } from './db.js';
import { AppState, setAppState } from './state.js';
import { toDateStr } from './utils/date.js';

export const VERSION = 'v1.2';

const FREE_ROUTE  = { today: 'hoje', schedule: 'cronograma', demands: 'demandas', ranking: 'ranking', agenda: 'agenda' };
const FREE_TAB    = Object.fromEntries(Object.entries(FREE_ROUTE).map(([k, v]) => [v, k]));
const ADMIN_ROUTE = { dashboard: 'visao-geral', calendar: 'cronograma', team: 'equipe', history: 'historico', bank: 'banco', notices: 'avisos', requests: 'solicitacoes', agenda: 'agenda', oneOnOne: 'one-a-one', backup: 'backup' };
const ADMIN_TAB   = Object.fromEntries(Object.entries(ADMIN_ROUTE).map(([k, v]) => [v, k]));

function pendingRequestsCount() {
  const pendingInserts = AppState.insertRequests.filter(r => (r.status || 'pending') === 'pending').length;
  return AppState.requests.length + pendingInserts;
}

export const App = {
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  },

  // Busca tarefas alocadas (member_id NOT NULL) de uma semana específica
  // (segunda a sexta), em vez da tabela inteira — a tabela já passou de
  // 1000 linhas, que é o limite padrão de uma request do PostgREST/Supabase,
  // e um fetch sem filtro de data trunca silenciosamente os registros mais
  // recentes/futuros.
  async loadWeekTasks(weekStart) {
    const start = new Date(weekStart);
    const end   = new Date(weekStart);
    end.setDate(end.getDate() + 4);
    const { data, error } = await db.from('tb_aps_tasks')
      .select('*, tb_aps_members(name, role)')
      .not('member_id', 'is', null)
      .gte('scheduled_date', toDateStr(start))
      .lte('scheduled_date', toDateStr(end))
      .order('scheduled_date');
    if (error) window.Toast?.show('Erro ao carregar tarefas.', 'error');
    setAppState({ tasks: data || [] });
    return data || [];
  },

  // Tudo que não é tarefa (member_id/scheduled_date agnóstico) — pode ser
  // recarregado independente de qual semana cada view está mostrando.
  async loadAuxData() {
    const [mRes, nRes, aRes, rRes, iRes, gRes, oRes] = await Promise.all([
      db.from('tb_aps_members').select('*').order('name'),
      db.from('tb_aps_notices').select('*').order('created_at', { ascending: false }),
      db.from('tb_aps_absences').select('*'),
      db.from('tb_aps_task_requests').select('*').order('created_at', { ascending: false }),
      db.from('tb_aps_task_insert_requests').select('*').order('created_at', { ascending: false }),
      db.from('tb_aps_game_scores').select('*').order('created_at', { ascending: false }),
      db.from('tb_aps_one_on_ones').select('*').order('date'),
    ]);
    if (mRes.error) window.Toast?.show('Erro ao carregar membros.', 'error');
    setAppState({
      members:        mRes.data || [],
      notices:        nRes.data || [],
      absences:       aRes.data || [],
      requests:       rRes.data || [],
      insertRequests: iRes.data || [],
      gameScores:     gRes.data || [],
      oneOnOnes:      oRes.data || [],
    });
  },

  async loadData() {
    await Promise.all([
      this.loadAuxData(),
      this.loadWeekTasks(AppState.selectedWeekStart),
    ]);
  },

  navigate(view, tab, { updateHash = true } = {}) {
    const prevView = AppState.view;
    if (view === 'free'  && !tab) tab = AppState.freeTab;
    if (view === 'admin' && !tab) tab = AppState.adminTab;

    setAppState({ view });
    if (view === 'free'  && tab) setAppState({ freeTab: tab });
    if (view === 'admin' && tab) setAppState({ adminTab: tab });

    if (updateHash) {
      const hash = view === 'home'      ? ''
                 : view === 'changelog' ? 'changelog'
                 : view === 'free'      ? (FREE_ROUTE[tab]  || tab)
                 :                        `supervisao/${ADMIN_ROUTE[tab] || tab}`;
      if (location.hash !== '#' + hash) location.hash = hash;
    }

    const shellChanged = prevView !== view;
    if (shellChanged || view === 'home' || view === 'changelog') {
      this._renderShell(view);
    }
    if (view !== 'home' && view !== 'changelog') {
      this._renderTab(view, tab);
    }
  },

  _parseHash() {
    const hash = location.hash.slice(1);
    if (!hash || hash === '') return { view: null };
    if (hash === 'changelog') return { view: 'changelog' };
    if (hash.startsWith('supervisao/')) {
      const slug = hash.slice('supervisao/'.length);
      return { view: 'admin', tab: ADMIN_TAB[slug] || 'dashboard' };
    }
    return { view: 'free', tab: FREE_TAB[hash] || 'today' };
  },

  _renderShell(view) {
    const app = document.getElementById('app');
    if (view === 'home') {
      window.HomeCtrl.init(app);
      return;
    }
    if (view === 'changelog') {
      window.ChangelogCtrl.init(app);
      return;
    }
    app.innerHTML = view === 'free' ? this._freeShell() : this._adminShell();
  },

  _renderTab(view, tab) {
    const content = document.getElementById('content');
    document.querySelectorAll('[data-tab]').forEach(btn => {
      const active = btn.dataset.tab === tab;
      btn.classList.toggle('bg-primary',     active);
      btn.classList.toggle('text-white',     active);
      btn.classList.toggle('text-slate-400', !active);
    });

    if (view === 'free') {
      if (tab === 'today')    window.TodayCtrl.init(content);
      if (tab === 'schedule') window.ScheduleCtrl.init(content);
      if (tab === 'agenda')   window.AgendaCtrl.init(content);
      if (tab === 'demands')  window.FreeDemandsCtrl.init(content);
      if (tab === 'ranking')  window.RankingCtrl.init(content);
    }
    if (view === 'admin') {
      if (tab === 'dashboard') window.AdminDashCtrl.init(content);
      if (tab === 'calendar') window.CalendarCtrl.init(content);
      if (tab === 'team')     window.TeamCtrl.init(content);
      if (tab === 'history')  window.HistoryCtrl.init(content);
      if (tab === 'bank')     window.BankCtrl.init(content);
      if (tab === 'notices')   window.NoticesCtrl.init(content);
      if (tab === 'backup')    window.BackupCtrl.init(content);
      if (tab === 'requests')  window.RequestsCtrl.init(content);
      if (tab === 'agenda')    window.AgendaCtrl.init(content);
      if (tab === 'oneOnOne')  window.OneOnOneCtrl.init(content);
    }
  },

  _freeShell() {
    const t = AppState.freeTab;
    const btn = (tab, icon, label) => `
      <button data-tab="${tab}" onclick="App.navigate('free','${tab}')"
        class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors
               ${t === tab ? 'bg-primary text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}">
        <i class="fa-solid ${icon}"></i><span class="hidden sm:inline">${label}</span>
      </button>`;
    return `
      <div class="h-full flex flex-col">
        <nav class="bg-slate-800 border-b border-slate-700 px-4 sm:px-6 py-3 flex items-center justify-between shrink-0">
          <div class="flex items-center gap-3">
            <button onclick="App.navigate('home')"
              class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
              <i class="fa-solid fa-arrow-left text-sm"></i>
            </button>
            <span class="font-semibold text-white">Tarefas <span class="text-slate-400 font-normal text-sm">APS</span></span>
          </div>
          <div class="flex gap-1">
            ${btn('today',    'fa-calendar-day',   'Tarefas do Dia')}
            ${btn('schedule', 'fa-calendar-week',  'Cronograma')}
            ${btn('agenda',   'fa-calendar-check', 'Agenda')}
            ${btn('demands',  'fa-layer-group',    'Banco de Demandas')}
            ${btn('ranking',  'fa-chart-line',     'Visão Geral')}
          </div>
        </nav>
        <main id="content" class="flex-1 p-4 sm:p-6 overflow-hidden flex flex-col"></main>
      </div>`;
  },

  _adminShell() {
    const t = AppState.adminTab;
    const btn = (tab, icon, label) => `
      <button data-tab="${tab}" onclick="App.navigate('admin','${tab}')"
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full text-left
               ${t === tab ? 'bg-primary text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}">
        <i class="fa-solid ${icon} w-4 text-center shrink-0"></i>${label}
      </button>`;
    return `
      <div class="h-full flex">

        <!-- Sidebar -->
        <aside class="w-52 shrink-0 bg-slate-800 border-r border-slate-700 flex flex-col h-full">
          <div class="px-4 py-4 border-b border-slate-700">
            <p class="font-semibold text-white text-sm">Tarefas <span class="text-slate-400 font-normal">APS</span></p>
            <span class="mt-1 inline-block bg-violet-700 text-violet-100 text-xs px-2 py-0.5 rounded-full font-medium">Supervisão</span>
          </div>
          <nav class="flex-1 p-2 flex flex-col gap-0.5 overflow-y-auto">
            ${btn('dashboard', 'fa-gauge',             'Visão Geral')}
            ${btn('calendar', 'fa-calendar-alt',      'Cronograma')}
            ${btn('agenda',   'fa-calendar-check',    'Agenda')}
            ${btn('oneOnOne', 'fa-calendar-check',    'One a One')}
            ${btn('bank',     'fa-database',          'Banco & Estudos')}
            ${btn('team',     'fa-users',             'Equipe')}
            ${btn('notices',  'fa-bell',              'Avisos')}
            <div id="requests-badge-wrap" class="relative">
              ${btn('requests', 'fa-inbox', 'Solicitações')}
              ${pendingRequestsCount() > 0 ? `<span id="requests-badge" class="absolute right-3 top-1/2 -translate-y-1/2 bg-rose-500 text-white text-[10px] font-bold min-w-[16px] h-4 flex items-center justify-center rounded-full pointer-events-none px-1">${pendingRequestsCount()}</span>` : ''}
            </div>
            ${btn('history',  'fa-clock-rotate-left', 'Histórico')}
            ${btn('backup',   'fa-box-archive',       'Backup')}
          </nav>
          <div class="px-4 py-2 border-t border-slate-700">
            <button onclick="App.navigate('changelog')"
              class="w-full text-slate-600 hover:text-slate-400 text-xs mb-2 text-center transition-colors underline underline-offset-2">${VERSION}</button>
            <button onclick="AuthCtrl.logout()"
              class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-danger hover:bg-slate-700 transition-colors w-full text-left">
              <i class="fa-solid fa-right-from-bracket w-4 text-center shrink-0"></i>Sair
            </button>
          </div>
        </aside>

        <!-- Conteúdo -->
        <main id="content" class="flex-1 p-6 overflow-hidden flex flex-col"></main>
      </div>`;
  },

  refreshRequestsBadge() {
    const wrap = document.getElementById('requests-badge-wrap');
    if (!wrap) return;
    const count   = pendingRequestsCount();
    const cls     = 'absolute right-3 top-1/2 -translate-y-1/2 bg-rose-500 text-white text-[10px] font-bold min-w-[16px] h-4 flex items-center justify-center rounded-full pointer-events-none px-1';
    let badge     = document.getElementById('requests-badge');
    if (count > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.id = 'requests-badge';
        badge.className = cls;
        wrap.appendChild(badge);
      }
      badge.textContent = count;
    } else {
      badge?.remove();
    }
  },

  async init() {
    const hasSession = await window.AuthCtrl.checkSession();
    await this.loadData();

    const { view, tab } = this._parseHash();
    const target = (!hasSession && view === 'admin') ? 'home' : (view || (hasSession ? 'admin' : 'home'));
    this.navigate(target, tab, { updateHash: false });

    window.addEventListener('hashchange', () => {
      const { view: v, tab: t } = App._parseHash();
      if (v === 'admin' && !AppState.isAdmin) { App.navigate('home', null, { updateHash: false }); return; }
      App.navigate(v || 'home', t, { updateHash: false });
    });
  },
};
window.App = App;
