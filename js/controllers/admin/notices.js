import { db } from '../../db.js';
import { AppState, setAppState } from '../../state.js';

export const NoticesCtrl = {
  _container: null,
  _editingId: null,

  init(container) {
    this._container = container;
    this._editingId = null;
    this._render();
  },

  _render() {
    const notices = [...AppState.notices].sort((a, b) =>
      (b.pinned - a.pinned) || new Date(b.created_at) - new Date(a.created_at)
    );

    this._container.innerHTML = `
      <div class="flex-1 flex flex-col min-h-0">
      <div class="flex items-center justify-between mb-6 flex-wrap gap-3 shrink-0">
        <div>
          <h2 class="text-xl font-semibold text-white">Painel de Avisos</h2>
          <p class="text-slate-400 text-sm mt-1">Avisos visíveis para toda a equipe no painel de ranking.</p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">

        <!-- Formulário novo aviso -->
        <div class="bg-slate-800 border border-slate-700 rounded-xl p-5 overflow-y-auto">
          <p class="text-sm font-semibold text-slate-300 mb-4">
            <i class="fa-solid fa-plus text-primary mr-1.5"></i>Novo aviso
          </p>
          <form onsubmit="NoticesCtrl.save(event)" class="flex flex-col gap-3">
            <input id="n-title" type="text" required placeholder="Título"
              class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white
                     placeholder-slate-500 text-sm focus:outline-none focus:border-primary transition-colors">
            <textarea id="n-content" required placeholder="Texto do aviso…" rows="4"
              class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white
                     placeholder-slate-500 text-sm focus:outline-none focus:border-primary transition-colors resize-none"></textarea>
            <label class="flex items-center gap-2 cursor-pointer select-none text-sm text-slate-300">
              <input id="n-pinned" type="checkbox" class="accent-primary w-4 h-4">
              Fixar aviso no topo
            </label>
            <button type="submit"
              class="bg-primary hover:bg-violet-600 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
              <i class="fa-solid fa-paper-plane mr-1.5"></i>Publicar aviso
            </button>
          </form>
        </div>

        <!-- Lista de avisos -->
        <div class="flex flex-col gap-3 overflow-y-auto">
          ${notices.length === 0
            ? `<div class="text-center py-12 text-slate-500 bg-slate-800 border border-slate-700 rounded-xl">
                 <i class="fa-solid fa-bell-slash text-3xl mb-3 block opacity-30"></i>
                 <p class="text-sm">Nenhum aviso publicado.</p>
               </div>`
            : notices.map(n => this._card(n)).join('')}
        </div>

      </div>
      </div>

      <!-- Modal editar -->
      <div id="notices-modal"></div>`;
  },

  _card(n) {
    const date = new Date(n.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `
      <div class="bg-slate-800 border ${n.pinned ? 'border-amber-600/50' : 'border-slate-700'} rounded-xl p-4">
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-2 min-w-0">
            ${n.pinned ? '<i class="fa-solid fa-thumbtack text-amber-400 text-xs shrink-0 mt-0.5"></i>' : ''}
            <p class="font-semibold text-white text-sm truncate">${n.title}</p>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <button onclick="NoticesCtrl.openEdit('${n.id}')"
              class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
              <i class="fa-solid fa-pen text-xs"></i>
            </button>
            <button onclick="NoticesCtrl.delete('${n.id}')"
              class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-danger hover:bg-slate-700 transition-colors">
              <i class="fa-solid fa-trash text-xs"></i>
            </button>
          </div>
        </div>
        <p class="text-slate-300 text-sm mt-2 leading-relaxed whitespace-pre-wrap">${n.content}</p>
        <p class="text-slate-500 text-xs mt-3">${date}</p>
      </div>`;
  },

  async save(e) {
    e.preventDefault();
    const title   = document.getElementById('n-title').value.trim();
    const content = document.getElementById('n-content').value.trim();
    const pinned  = document.getElementById('n-pinned').checked;

    const row = {
      id:      window.App.generateId(),
      title,
      content,
      pinned,
    };
    const { error } = await db.from('tb_aps_notices').insert(row);
    if (error) { window.Toast.show('Erro ao publicar aviso.', 'error'); return; }

    setAppState({ notices: [row, ...AppState.notices] });
    document.getElementById('n-title').value   = '';
    document.getElementById('n-content').value = '';
    document.getElementById('n-pinned').checked = false;
    this._render();
    window.Toast.show('Aviso publicado.', 'success');
  },

  openEdit(id) {
    const n = AppState.notices.find(x => x.id === id);
    if (!n) return;

    document.getElementById('notices-modal').innerHTML = `
      <div class="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4"
           onclick="NoticesCtrl._backdropClick(event)">
        <div class="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl"
             onclick="event.stopPropagation()">
          <div class="flex items-center justify-between p-5 border-b border-slate-700">
            <h3 class="font-bold text-white">Editar aviso</h3>
            <button onclick="NoticesCtrl.closeEdit()"
              class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <form onsubmit="NoticesCtrl.update(event, '${n.id}')" class="p-5 flex flex-col gap-3">
            <input id="ne-title" type="text" required value="${n.title.replace(/"/g, '&quot;')}"
              class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white
                     text-sm focus:outline-none focus:border-primary transition-colors">
            <textarea id="ne-content" required rows="5"
              class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white
                     text-sm focus:outline-none focus:border-primary transition-colors resize-none">${n.content}</textarea>
            <label class="flex items-center gap-2 cursor-pointer select-none text-sm text-slate-300">
              <input id="ne-pinned" type="checkbox" class="accent-primary w-4 h-4" ${n.pinned ? 'checked' : ''}>
              Fixar aviso no topo
            </label>
            <div class="flex gap-3 mt-1">
              <button type="button" onclick="NoticesCtrl.closeEdit()"
                class="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
                Cancelar
              </button>
              <button type="submit"
                class="flex-1 bg-primary hover:bg-violet-600 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
                Salvar
              </button>
            </div>
          </form>
        </div>
      </div>`;
  },

  async update(e, id) {
    e.preventDefault();
    const title   = document.getElementById('ne-title').value.trim();
    const content = document.getElementById('ne-content').value.trim();
    const pinned  = document.getElementById('ne-pinned').checked;

    const { error } = await db.from('tb_aps_notices').update({ title, content, pinned }).eq('id', id);
    if (error) { window.Toast.show('Erro ao salvar.', 'error'); return; }

    setAppState({ notices: AppState.notices.map(n => n.id === id ? { ...n, title, content, pinned } : n) });
    this.closeEdit();
    this._render();
    window.Toast.show('Aviso atualizado.', 'success');
  },

  async delete(id) {
    const { error } = await db.from('tb_aps_notices').delete().eq('id', id);
    if (error) { window.Toast.show('Erro ao excluir.', 'error'); return; }

    setAppState({ notices: AppState.notices.filter(n => n.id !== id) });
    this._render();
    window.Toast.show('Aviso removido.', 'info');
  },

  closeEdit() {
    document.getElementById('notices-modal').innerHTML = '';
  },

  _backdropClick(e) {
    if (e.target === e.currentTarget) this.closeEdit();
  },
};
window.NoticesCtrl = NoticesCtrl;
