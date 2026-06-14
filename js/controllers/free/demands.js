import { db } from '../../db.js';

export const FreeDemandsCtrl = {
  _container: null,

  async init(container) {
    this._container = container;
    container.innerHTML = `
      <div class="flex items-center gap-2 text-slate-500 py-12 justify-center">
        <i class="fa-solid fa-spinner fa-spin"></i> Carregando…
      </div>`;
    const { data, error } = await db
      .from('tb_aps_tasks')
      .select('id, title, demand_category, updated_at')
      .is('member_id', null)
      .order('updated_at', { ascending: false });
    if (error) { window.Toast.show('Erro ao carregar banco.', 'error'); return; }
    this._render(data || []);
  },

  _render(items) {
    const reprimidas = items.filter(i => i.demand_category === 'reprimida');
    const estudos    = items.filter(i => i.demand_category === 'estudo');

    this._container.innerHTML = `
      <div class="flex-1 flex flex-col min-h-0">
        <div class="mb-6 shrink-0">
          <h2 class="text-xl font-semibold text-white">Banco de Demandas</h2>
          <p class="text-slate-400 text-sm mt-1">Visão informativa — itens no radar da supervisão.</p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">

          <!-- Demandas Reprimidas -->
          <div class="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden flex flex-col">
            <div class="px-5 py-4 border-b border-slate-700 flex items-center gap-3 shrink-0">
              <div class="w-8 h-8 rounded-lg bg-rose-900/50 border border-rose-700 flex items-center justify-center">
                <i class="fa-solid fa-triangle-exclamation text-rose-400 text-sm"></i>
              </div>
              <div>
                <h3 class="font-semibold text-white text-sm">Demandas Reprimidas</h3>
                <p class="text-slate-400 text-xs">${reprimidas.length} item${reprimidas.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <ul class="divide-y divide-slate-700/50 overflow-y-auto flex-1">
              ${reprimidas.length === 0
                ? '<li class="px-5 py-6 text-slate-500 text-sm text-center">Nenhuma demanda reprimida.</li>'
                : reprimidas.map(i => `
                    <li class="px-5 py-3 text-sm text-slate-300 flex items-center gap-2">
                      <i class="fa-solid fa-circle text-rose-500 text-[6px] shrink-0"></i>
                      ${i.title}
                    </li>`).join('')}
            </ul>
          </div>

          <!-- Temas para Estudo & Dev -->
          <div class="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden flex flex-col">
            <div class="px-5 py-4 border-b border-slate-700 flex items-center gap-3 shrink-0">
              <div class="w-8 h-8 rounded-lg bg-blue-900/50 border border-blue-700 flex items-center justify-center">
                <i class="fa-solid fa-book-open text-blue-400 text-sm"></i>
              </div>
              <div>
                <h3 class="font-semibold text-white text-sm">Temas para Estudo &amp; Dev.</h3>
                <p class="text-slate-400 text-xs">${estudos.length} item${estudos.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <ul class="divide-y divide-slate-700/50 overflow-y-auto flex-1">
              ${estudos.length === 0
                ? '<li class="px-5 py-6 text-slate-500 text-sm text-center">Nenhum tema cadastrado.</li>'
                : estudos.map(i => `
                    <li class="px-5 py-3 text-sm text-slate-300 flex items-center gap-2">
                      <i class="fa-solid fa-circle text-blue-500 text-[6px] shrink-0"></i>
                      ${i.title}
                    </li>`).join('')}
            </ul>
          </div>

        </div>
      </div>`;
  },
};
window.FreeDemandsCtrl = FreeDemandsCtrl;
