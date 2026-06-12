import { db } from './db.js';
import { AppState, setAppState } from './state.js';

export const VERSION = 'v1.0';

export const App = {
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  },

  async loadData() {
    const [mRes, tRes, nRes] = await Promise.all([
      db.from('members').select('*').order('name'),
      db.from('tasks_iss')
        .select('*, members(name, role)')
        .not('member_id', 'is', null)
        .order('scheduled_date'),
      db.from('notices').select('*').order('created_at', { ascending: false }),
    ]);
    if (mRes.error) window.Toast?.show('Erro ao carregar membros.', 'error');
    if (tRes.error) window.Toast?.show('Erro ao carregar tarefas.', 'error');
    setAppState({
      members: mRes.data  || [],
      tasks:   tRes.data  || [],
      notices: nRes.data  || [],
    });
  },

  navigate(view, tab) {
    const prevView = AppState.view;
    if (view === 'free'  && !tab) tab = AppState.freeTab;
    if (view === 'admin' && !tab) tab = AppState.adminTab;

    setAppState({ view });
    if (view === 'free'  && tab) setAppState({ freeTab: tab });
    if (view === 'admin' && tab) setAppState({ adminTab: tab });

    const shellChanged = prevView !== view;
    if (shellChanged || view === 'home') {
      this._renderShell(view);
    }
    if (view !== 'home') {
      this._renderTab(view, tab);
    }
  },

  _renderShell(view) {
    const app = document.getElementById('app');
    if (view === 'home') {
      window.HomeCtrl.init(app);
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
      if (tab === 'demands')  window.FreeDemandsCtrl.init(content);
      if (tab === 'ranking')  window.RankingCtrl.init(content);
    }
    if (view === 'admin') {
      if (tab === 'calendar') window.CalendarCtrl.init(content);
      if (tab === 'team')     window.TeamCtrl.init(content);
      if (tab === 'history')  window.HistoryCtrl.init(content);
      if (tab === 'bank')     window.BankCtrl.init(content);
      if (tab === 'notices')  window.NoticesCtrl.init(content);
      if (tab === 'backup')   window.BackupCtrl.init(content);
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
            ${btn('calendar', 'fa-calendar-alt',         'Cronograma')}
            ${btn('team',     'fa-users',                'Equipe')}
            ${btn('history',  'fa-clock-rotate-left',    'Histórico')}
            ${btn('bank',     'fa-database',             'Banco & Estudos')}
            ${btn('notices',  'fa-bell',                 'Avisos')}
            ${btn('backup',   'fa-box-archive',          'Backup')}
          </nav>
          <div class="px-4 py-2 border-t border-slate-700">
            <p class="text-slate-600 text-xs mb-2 text-center">${VERSION}</p>
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

  async init() {
    const hasSession = await window.AuthCtrl.checkSession();
    await this.loadData();
    this.navigate(hasSession ? 'admin' : 'home');
  },
};
window.App = App;
