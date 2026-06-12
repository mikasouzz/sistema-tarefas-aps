import { db } from '../../db.js';
import { AppState, setAppState } from '../../state.js';

const ROLE_LABEL = {
  estagiario:  'Estagiário',
  tecnico:     'Técnico',
  analista_jr: 'Analista Júnior',
  analista_pl: 'Analista Pleno',
  analista_sr: 'Analista Sênior',
};
const REGIME_LABEL = { estagio: 'Estágio', clt: 'CLT' };

export const TeamCtrl = {
  _container: null,

  init(container) {
    this._container = container;
    this._render();
  },

  _render() {
    const { members } = AppState;
    this._container.innerHTML = `
      <div class="flex-1 flex flex-col min-h-0">
      <div class="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h2 class="text-xl font-semibold text-white">Gestão de Equipe</h2>
          <p class="text-slate-400 text-sm mt-1">${members.length} colaborador${members.length !== 1 ? 'es' : ''} cadastrado${members.length !== 1 ? 's' : ''}</p>
        </div>
        <button onclick="TeamCtrl.openForm()"
          class="flex items-center gap-2 bg-primary hover:bg-violet-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <i class="fa-solid fa-user-plus"></i> Adicionar
        </button>
      </div>

      <div class="flex-1 min-h-0 bg-slate-800 border border-slate-700 rounded-xl overflow-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
              <th class="text-left px-5 py-3 font-medium">Nome</th>
              <th class="text-left px-5 py-3 font-medium hidden sm:table-cell">Cargo</th>
              <th class="text-left px-5 py-3 font-medium hidden md:table-cell">Regime</th>
              <th class="text-left px-5 py-3 font-medium">Status</th>
              <th class="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-700/60">
            ${members.length === 0
              ? `<tr><td colspan="5" class="text-center py-10 text-slate-500">Nenhum colaborador cadastrado.</td></tr>`
              : members.map(m => `
                  <tr class="hover:bg-slate-700/30 transition-colors">
                    <td class="px-5 py-3.5 font-medium text-white">${m.name}</td>
                    <td class="px-5 py-3.5 text-slate-300 hidden sm:table-cell">${ROLE_LABEL[m.role] || m.role}</td>
                    <td class="px-5 py-3.5 hidden md:table-cell">
                      <span class="text-xs px-2 py-0.5 rounded-full border
                        ${m.regime === 'clt' ? 'bg-blue-900/40 border-blue-700 text-blue-300' : 'bg-amber-900/40 border-amber-700 text-amber-300'}">
                        ${REGIME_LABEL[m.regime] || m.regime}
                      </span>
                    </td>
                    <td class="px-5 py-3.5">
                      <span class="text-xs px-2 py-0.5 rounded-full ${m.active ? 'bg-emerald-900/40 border border-emerald-700 text-emerald-300' : 'bg-slate-700 text-slate-400'}">
                        ${m.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td class="px-5 py-3.5">
                      <div class="flex items-center gap-2 justify-end">
                        <button onclick="TeamCtrl.openForm('${m.id}')"
                          class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-600 transition-colors">
                          <i class="fa-solid fa-pen text-xs"></i>
                        </button>
                        <button onclick="TeamCtrl.toggleActive('${m.id}', ${m.active})"
                          class="w-7 h-7 flex items-center justify-center rounded-lg transition-colors
                            ${m.active ? 'text-slate-400 hover:text-danger hover:bg-slate-600' : 'text-slate-400 hover:text-accent hover:bg-slate-600'}">
                          <i class="fa-solid ${m.active ? 'fa-user-slash' : 'fa-user-check'} text-xs"></i>
                        </button>
                      </div>
                    </td>
                  </tr>`).join('')}
          </tbody>
        </table>
      </div>
      </div>`;
  },

  openForm(id) {
    const m = id ? AppState.members.find(x => x.id === id) : null;
    document.getElementById('modal-container').innerHTML = `
      <div class="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4"
           onclick="TeamCtrl._backdropClick(event)">
        <div class="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl"
             onclick="event.stopPropagation()">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-bold text-white">${m ? 'Editar Colaborador' : 'Novo Colaborador'}</h3>
            <button onclick="TeamCtrl.closeForm()"
              class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <form onsubmit="TeamCtrl.save(event,'${id || ''}')" class="flex flex-col gap-4">
            <div>
              <label class="block text-sm text-slate-400 mb-1.5">Nome completo</label>
              <input id="tf-name" type="text" required value="${m?.name || ''}" placeholder="Ex: João da Silva"
                class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white placeholder-slate-500
                       focus:outline-none focus:border-primary transition-colors">
            </div>
            <div>
              <label class="block text-sm text-slate-400 mb-1.5">Cargo</label>
              <select id="tf-role" required
                class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white
                       focus:outline-none focus:border-primary transition-colors">
                ${Object.entries(ROLE_LABEL).map(([v, l]) => `<option value="${v}" ${m?.role === v ? 'selected' : ''}>${l}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-sm text-slate-400 mb-1.5">Regime</label>
              <select id="tf-regime" required
                class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white
                       focus:outline-none focus:border-primary transition-colors">
                <option value="estagio" ${m?.regime === 'estagio' ? 'selected' : ''}>Estágio</option>
                <option value="clt"     ${m?.regime === 'clt'     ? 'selected' : ''}>CLT</option>
              </select>
            </div>
            <div class="flex gap-3 mt-2">
              <button type="button" onclick="TeamCtrl.closeForm()"
                class="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
                Cancelar
              </button>
              <button type="submit"
                class="flex-1 bg-primary hover:bg-violet-600 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
                ${m ? 'Salvar' : 'Adicionar'}
              </button>
            </div>
          </form>
        </div>
      </div>`;
    setTimeout(() => document.getElementById('tf-name')?.focus(), 50);
  },

  closeForm() {
    document.getElementById('modal-container').innerHTML = '';
  },

  _backdropClick(e) {
    if (e.target === e.currentTarget) this.closeForm();
  },

  async save(e, id) {
    e.preventDefault();
    const name   = document.getElementById('tf-name').value.trim();
    const role   = document.getElementById('tf-role').value;
    const regime = document.getElementById('tf-regime').value;

    let error;
    if (id) {
      ({ error } = await db.from('members').update({ name, role, regime }).eq('id', id));
    } else {
      const newId = window.App.generateId();
      ({ error } = await db.from('members').insert({ id: newId, name, role, regime, active: true }));
    }

    if (error) { window.Toast.show('Erro ao salvar.', 'error'); return; }

    // Reload members
    const { data } = await db.from('members').select('*').order('name');
    setAppState({ members: data || [] });
    this.closeForm();
    this._render();
    window.Toast.show(id ? 'Colaborador atualizado.' : 'Colaborador adicionado.', 'success');
  },

  async toggleActive(id, current) {
    const { error } = await db.from('members').update({ active: !current }).eq('id', id);
    if (error) { window.Toast.show('Erro ao atualizar.', 'error'); return; }
    const { data } = await db.from('members').select('*').order('name');
    setAppState({ members: data || [] });
    this._render();
    window.Toast.show(!current ? 'Membro reativado.' : 'Membro inativado.', 'info');
  },
};
window.TeamCtrl = TeamCtrl;
