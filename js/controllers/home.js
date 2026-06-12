import { VERSION } from '../app.js';

export const HomeCtrl = {
  init(container) {
    container.innerHTML = `
      <div class="min-h-screen flex flex-col items-center justify-center p-6 gap-12">

        <!-- Brand -->
        <div class="text-center">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 mb-4">
            <i class="fa-solid fa-list-check text-2xl text-primary"></i>
          </div>
          <h1 class="text-3xl font-bold text-white tracking-tight">Sistema de Tarefas</h1>
          <p class="text-slate-400 mt-1 text-lg font-light">APS</p>
        </div>

        <!-- Access cards -->
        <div class="flex flex-col sm:flex-row gap-5 w-full max-w-xl">

          <button onclick="App.navigate('free')"
            class="flex-1 group bg-slate-800 border border-slate-700 hover:border-accent hover:bg-slate-750
                   rounded-2xl p-6 text-left transition-all duration-200 hover:shadow-lg hover:shadow-accent/10">
            <div class="w-12 h-12 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center mb-4
                        group-hover:bg-accent/30 transition-colors">
              <i class="fa-solid fa-eye text-accent text-lg"></i>
            </div>
            <h2 class="text-lg font-semibold text-white mb-1">Acesso Sistema</h2>
            <p class="text-slate-400 text-sm leading-relaxed">Visualize tarefas do dia, cronograma semanal e o banco de demandas da equipe.</p>
            <div class="mt-4 flex items-center gap-1.5 text-accent text-sm font-medium">
              <span>Entrar</span>
              <i class="fa-solid fa-arrow-right text-xs transition-transform group-hover:translate-x-1"></i>
            </div>
          </button>

          <button onclick="AuthCtrl.openLogin()"
            class="flex-1 group bg-slate-800 border border-slate-700 hover:border-primary hover:bg-slate-750
                   rounded-2xl p-6 text-left transition-all duration-200 hover:shadow-lg hover:shadow-primary/10">
            <div class="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center mb-4
                        group-hover:bg-primary/30 transition-colors">
              <i class="fa-solid fa-lock text-primary text-lg"></i>
            </div>
            <h2 class="text-lg font-semibold text-white mb-1">Acesso Edição</h2>
            <p class="text-slate-400 text-sm leading-relaxed">Gerencie equipe, atribua tarefas, consulte histórico e administre o banco de demandas.</p>
            <div class="mt-4 flex items-center gap-1.5 text-primary text-sm font-medium">
              <span>Entrar com login</span>
              <i class="fa-solid fa-arrow-right text-xs transition-transform group-hover:translate-x-1"></i>
            </div>
          </button>

        </div>

        <button onclick="App.navigate('changelog')"
          class="text-slate-600 hover:text-slate-400 text-xs transition-colors underline underline-offset-2">
          APS — Acesso interno · ${VERSION}
        </button>
      </div>
    `;
  },
};
window.HomeCtrl = HomeCtrl;
