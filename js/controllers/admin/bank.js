import { db } from '../../db.js';

export const BankCtrl = {
  _container: null,
  _items: [],
  _countMap: {},

  async init(container) {
    this._container = container;
    container.innerHTML = `
      <div class="flex items-center gap-2 text-slate-500 py-12 justify-center">
        <i class="fa-solid fa-spinner fa-spin"></i> Carregando…
      </div>`;
    await this._load();
    this._render();
  },

  async _load() {
    const [itemsRes, assignRes] = await Promise.all([
      db.from('tasks_iss')
        .select('id, title, demand_category, updated_at')
        .is('member_id', null)
        .order('updated_at', { ascending: false }),
      db.from('tasks_iss')
        .select('demand_id')
        .not('demand_id', 'is', null),
    ]);
    if (itemsRes.error) window.Toast.show('Erro ao carregar banco.', 'error');

    this._items = itemsRes.data || [];
    this._countMap = {};
    for (const t of (assignRes.data || [])) {
      if (t.demand_id) this._countMap[t.demand_id] = (this._countMap[t.demand_id] || 0) + 1;
    }
  },

  _render() {
    const reprimidas = this._items.filter(i => i.demand_category === 'reprimida');
    const estudos    = this._items.filter(i => i.demand_category === 'estudo');

    this._container.innerHTML = `
      <div class="mb-6">
        <h2 class="text-xl font-semibold text-white">Banco &amp; Estudos</h2>
        <p class="text-slate-400 text-sm mt-1">
          Demandas permanecem no banco ao serem atribuídas — cada atribuição cria uma referência no cronograma.
        </p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        ${this._panel('reprimida', 'fa-triangle-exclamation', 'rose',  'Demandas Reprimidas',       reprimidas, 'Nova demanda reprimida…')}
        ${this._panel('estudo',    'fa-book-open',             'blue',  'Temas para Estudo &amp; Dev.', estudos,    'Novo tema de estudo…')}
      </div>`;
  },

  _panel(category, icon, color, title, items, placeholder) {
    const clr = {
      rose: { wrap: 'bg-rose-900/40 border-rose-700', icon: 'text-rose-400', dot: 'text-rose-500' },
      blue: { wrap: 'bg-blue-900/40 border-blue-700', icon: 'text-blue-400', dot: 'text-blue-500' },
    }[color];

    return `
      <div class="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden flex flex-col">
        <div class="px-5 py-4 border-b border-slate-700 flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg ${clr.wrap} border flex items-center justify-center">
            <i class="fa-solid ${icon} ${clr.icon} text-sm"></i>
          </div>
          <div>
            <h3 class="font-semibold text-white text-sm">${title}</h3>
            <p class="text-slate-400 text-xs">${items.length} item${items.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <ul class="divide-y divide-slate-700/50 flex-1">
          ${items.length === 0
            ? `<li class="px-5 py-6 text-slate-500 text-sm text-center">Nenhum item cadastrado.</li>`
            : items.map(i => {
                const count = this._countMap[i.id] || 0;
                return `
                  <li class="px-5 py-3 flex items-center justify-between gap-2 group">
                    <div class="flex items-center gap-2 min-w-0">
                      <i class="fa-solid fa-circle ${clr.dot} text-[6px] shrink-0"></i>
                      <span class="text-sm text-slate-300 truncate">${i.title}</span>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                      ${count > 0 ? `
                        <span class="text-xs text-slate-400 bg-slate-700 border border-slate-600 px-2 py-0.5 rounded-full"
                              title="${count} atribuição${count !== 1 ? 'ões' : ''} no cronograma">
                          <i class="fa-solid fa-link text-[10px] mr-1"></i>${count}
                        </span>` : ''}
                      <button onclick="BankCtrl.deleteItem('${i.id}')"
                        class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-600
                               hover:text-danger hover:bg-slate-700 transition-colors opacity-0 group-hover:opacity-100">
                        <i class="fa-solid fa-trash text-xs"></i>
                      </button>
                    </div>
                  </li>`;
              }).join('')}
        </ul>

        <form onsubmit="BankCtrl.addItem(event,'${category}')"
          class="px-4 py-3 border-t border-slate-700 flex gap-2">
          <input type="text" placeholder="${placeholder}" required
            id="bank-input-${category}"
            class="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm
                   placeholder-slate-500 focus:outline-none focus:border-primary transition-colors">
          <button type="submit"
            class="px-3 py-2 bg-primary hover:bg-violet-600 text-white rounded-lg transition-colors text-sm font-medium">
            <i class="fa-solid fa-plus"></i>
          </button>
        </form>
      </div>`;
  },

  async addItem(e, category) {
    e.preventDefault();
    const input = document.getElementById(`bank-input-${category}`);
    const title = input.value.trim();
    if (!title) return;

    const id = window.App.generateId();
    const { error } = await db.from('tasks_iss').insert({ id, title, demand_category: category, status: 'pending' });
    if (error) { window.Toast.show('Erro ao adicionar.', 'error'); return; }

    this._items.unshift({ id, title, demand_category: category, updated_at: new Date().toISOString() });
    input.value = '';
    this._render();
    window.Toast.show('Item adicionado.', 'success');
  },

  async deleteItem(id) {
    const count = this._countMap[id] || 0;
    if (count > 0) {
      const confirmed = window.confirm(
        `Esta demanda tem ${count} atribuição${count !== 1 ? 'ões' : ''} no cronograma.\nAs tarefas derivadas serão mantidas, mas perderão o vínculo com o banco.\n\nDeseja excluir mesmo assim?`
      );
      if (!confirmed) return;
    }
    const { error } = await db.from('tasks_iss').delete().eq('id', id);
    if (error) { window.Toast.show('Erro ao excluir.', 'error'); return; }
    this._items = this._items.filter(i => i.id !== id);
    delete this._countMap[id];
    this._render();
    window.Toast.show('Item removido.', 'info');
  },
};
window.BankCtrl = BankCtrl;
