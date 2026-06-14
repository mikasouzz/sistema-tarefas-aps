import { db } from '../../db.js';
import { AppState, setAppState } from '../../state.js';

export const RequestsCtrl = {
  _container: null,

  init(container) {
    this._container = container;
    this._render();
  },

  _render() {
    const requests = AppState.requests;
    this._container.innerHTML = `
      <div class="flex-1 flex flex-col min-h-0">
        <div class="mb-6 shrink-0">
          <h2 class="text-xl font-semibold text-white">Solicitações</h2>
          <p class="text-slate-400 text-sm mt-1">${requests.length} solicitaç${requests.length !== 1 ? 'ões' : 'ão'} pendente${requests.length !== 1 ? 's' : ''}</p>
        </div>

        <div class="flex-1 min-h-0 overflow-y-auto">
          ${requests.length === 0
            ? `<div class="text-center py-16 text-slate-500">
                 <i class="fa-solid fa-inbox text-4xl mb-3 block opacity-30"></i>
                 <p>Nenhuma solicitação pendente.</p>
               </div>`
            : `<div class="flex flex-col gap-3 max-w-2xl">
                 ${requests.map(r => this._card(r)).join('')}
               </div>`}
        </div>
      </div>`;
  },

  _card(r) {
    const date = new Date(r.created_at).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });
    return `
      <div class="bg-slate-800 border border-slate-700 rounded-xl p-5 flex flex-col gap-3">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="font-semibold text-white">${r.task_title}</p>
            <p class="text-sm text-slate-400 mt-0.5">${r.member_name} · ${date}</p>
          </div>
          <span class="shrink-0 text-xs px-2 py-0.5 rounded-full bg-rose-900/40 border border-rose-700 text-rose-300 flex items-center gap-1">
            <i class="fa-solid fa-circle-xmark text-[10px]"></i> Pendente
          </span>
        </div>
        <div class="bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2.5">
          <p class="text-xs text-slate-500 mb-1 uppercase tracking-wide font-medium">Justificativa</p>
          <p class="text-sm text-slate-300 leading-relaxed">${r.justification}</p>
        </div>
        <div class="flex gap-2">
          <button onclick="RequestsCtrl.reject('${r.id}')"
            class="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium py-2.5 rounded-lg transition-colors">
            Recusar
          </button>
          <button onclick="RequestsCtrl.accept('${r.id}','${r.task_id}')"
            class="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
            <i class="fa-solid fa-trash text-xs"></i> Aceitar e remover tarefa
          </button>
        </div>
      </div>`;
  },

  async accept(requestId, taskId) {
    const { error } = await db.from('tb_aps_tasks').delete().eq('id', taskId);
    if (error) { window.Toast.show('Erro ao remover tarefa.', 'error'); return; }
    // request é apagada em cascata pelo DB
    setAppState({
      tasks:    AppState.tasks.filter(t => t.id !== taskId),
      requests: AppState.requests.filter(r => r.id !== requestId),
    });
    window.Toast.show('Tarefa removida com sucesso.', 'success');
    this._render();
    window.App.refreshRequestsBadge();
  },

  async reject(requestId) {
    const { error } = await db.from('tb_aps_task_requests').delete().eq('id', requestId);
    if (error) { window.Toast.show('Erro ao recusar solicitação.', 'error'); return; }
    setAppState({ requests: AppState.requests.filter(r => r.id !== requestId) });
    window.Toast.show('Solicitação recusada.', 'info');
    this._render();
    window.App.refreshRequestsBadge();
  },
};
window.RequestsCtrl = RequestsCtrl;
