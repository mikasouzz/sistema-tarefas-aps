import { db } from '../../db.js';
import { AppState, setAppState } from '../../state.js';

const SHIFT_LABEL    = { manha: 'Manhã', tarde: 'Tarde', livre: 'Livre' };
const TYPE_LABEL     = { operacional: 'Operacional', analitica: 'Analítica', estrategia: 'Estratégia', treinamento: 'Treinamento', reuniao: 'Reunião', suporte: 'Suporte' };
const PRIORITY_LABEL = { principal: 'Principal', secundaria: 'Secundária' };

const STATUS_LABEL = {
  pending:  'Pendente',
  accepted: 'Aceita',
  rejected: 'Recusada',
};

export const RequestsCtrl = {
  _container: null,
  _activeTab: 'removal',

  init(container) {
    this._container = container;
    this._render();
  },

  _render() {
    const removals   = AppState.requests;
    const insertions = AppState.insertRequests.filter(r => (r.status || 'pending') === 'pending');
    const history     = AppState.insertRequests.filter(r => (r.status || 'pending') !== 'pending')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    this._container.innerHTML = `
      <div class="flex-1 flex flex-col min-h-0">
        <div class="mb-5 shrink-0">
          <h2 class="text-xl font-semibold text-white">Solicitações</h2>
        </div>

        <div class="flex gap-1 mb-5 shrink-0 border-b border-slate-700">
          <button onclick="RequestsCtrl._setTab('removal')"
            class="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px
                   ${this._activeTab === 'removal' ? 'border-primary text-white' : 'border-transparent text-slate-400 hover:text-white'}">
            Remoção
            ${removals.length > 0 ? `<span class="ml-1.5 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">${removals.length}</span>` : ''}
          </button>
          <button onclick="RequestsCtrl._setTab('insertion')"
            class="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px
                   ${this._activeTab === 'insertion' ? 'border-primary text-white' : 'border-transparent text-slate-400 hover:text-white'}">
            Inserção
            ${insertions.length > 0 ? `<span class="ml-1.5 bg-primary/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">${insertions.length}</span>` : ''}
          </button>
          <button onclick="RequestsCtrl._setTab('history')"
            class="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px
                   ${this._activeTab === 'history' ? 'border-primary text-white' : 'border-transparent text-slate-400 hover:text-white'}">
            Histórico
          </button>
        </div>

        <div class="flex-1 min-h-0 overflow-y-auto">
          ${this._activeTab === 'removal'   ? this._removalList(removals)
            : this._activeTab === 'insertion' ? this._insertionList(insertions)
            : this._historyList(history)}
        </div>
      </div>`;
  },

  _setTab(tab) {
    this._activeTab = tab;
    this._render();
  },

  _removalList(requests) {
    if (requests.length === 0) {
      return `<div class="text-center py-16 text-slate-500">
        <i class="fa-solid fa-inbox text-4xl mb-3 block opacity-30"></i>
        <p>Nenhuma solicitação pendente.</p>
      </div>`;
    }
    return `<div class="flex flex-col gap-3 max-w-2xl">${requests.map(r => this._cardRemoval(r)).join('')}</div>`;
  },

  _insertionList(requests) {
    if (requests.length === 0) {
      return `<div class="text-center py-16 text-slate-500">
        <i class="fa-solid fa-inbox text-4xl mb-3 block opacity-30"></i>
        <p>Nenhuma solicitação pendente.</p>
      </div>`;
    }
    return `<div class="flex flex-col gap-3 max-w-2xl">${requests.map(r => this._cardInsertion(r)).join('')}</div>`;
  },

  _historyList(requests) {
    if (requests.length === 0) {
      return `<div class="text-center py-16 text-slate-500">
        <i class="fa-solid fa-clock-rotate-left text-4xl mb-3 block opacity-30"></i>
        <p>Nenhuma solicitação de inserção respondida ainda.</p>
      </div>`;
    }
    return `<div class="flex flex-col gap-2 max-w-2xl">${requests.map(r => this._cardHistory(r)).join('')}</div>`;
  },

  _cardHistory(r) {
    const sentAt = new Date(r.created_at).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    const isAccepted = r.status === 'accepted';
    return `
      <div class="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
        <div class="min-w-0">
          <p class="text-sm text-white font-medium truncate">${r.title}</p>
          <p class="text-xs text-slate-500 mt-0.5">${r.member_name} · ${sentAt}</p>
        </div>
        <span class="shrink-0 text-xs px-2 py-0.5 rounded-full border flex items-center gap-1
                     ${isAccepted ? 'bg-accent/20 border-accent/40 text-accent' : 'bg-slate-700 border-slate-600 text-slate-400'}">
          <i class="fa-solid ${isAccepted ? 'fa-check' : 'fa-xmark'} text-[10px]"></i> ${STATUS_LABEL[r.status] || r.status}
        </span>
      </div>`;
  },

  _cardRemoval(r) {
    const sentAt = new Date(r.created_at).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });
    const task = AppState.tasks.find(t => t.id === r.task_id);

    const fmtDate = str => {
      if (!str) return '—';
      const [, m, d] = str.split('-');
      return `${d}/${m}`;
    };

    const taskMeta = task ? `
      <div class="flex flex-wrap gap-1.5 mt-2">
        ${task.scheduled_date ? `<span class="text-[11px] px-2 py-0.5 rounded bg-slate-700 text-slate-400"><i class="fa-solid fa-calendar text-[9px] mr-1"></i>${fmtDate(task.scheduled_date)}</span>` : ''}
        ${task.shift        ? `<span class="text-[11px] px-2 py-0.5 rounded bg-slate-700 text-slate-400">${SHIFT_LABEL[task.shift] || task.shift}</span>` : ''}
        ${task.type         ? `<span class="text-[11px] px-2 py-0.5 rounded bg-slate-700 text-slate-400">${TYPE_LABEL[task.type] || task.type}</span>` : ''}
        ${task.priority     ? `<span class="text-[11px] px-2 py-0.5 rounded ${task.priority === 'principal' ? 'bg-violet-900/40 text-violet-300' : 'bg-slate-700 text-slate-400'}">${PRIORITY_LABEL[task.priority] || task.priority}</span>` : ''}
      </div>` : '';

    return `
      <div class="bg-slate-800 border border-slate-700 rounded-xl p-5 flex flex-col gap-3">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <p class="font-semibold text-white">${r.task_title}</p>
            <p class="text-sm text-slate-400 mt-0.5">${r.member_name} · <span class="text-slate-500">solicitado em ${sentAt}</span></p>
            ${taskMeta}
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

  _cardInsertion(r) {
    const sentAt = new Date(r.created_at).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });

    const fmtDate = str => {
      if (!str) return '—';
      const [, m, d] = str.split('-');
      return `${d}/${m}`;
    };

    return `
      <div class="bg-slate-800 border border-slate-700 rounded-xl p-5 flex flex-col gap-3">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <p class="font-semibold text-white">${r.title}</p>
            <p class="text-sm text-slate-400 mt-0.5">${r.member_name} · <span class="text-slate-500">solicitado em ${sentAt}</span></p>
            <div class="flex flex-wrap gap-1.5 mt-2">
              ${r.scheduled_date ? `<span class="text-[11px] px-2 py-0.5 rounded bg-slate-700 text-slate-400"><i class="fa-solid fa-calendar text-[9px] mr-1"></i>${fmtDate(r.scheduled_date)}</span>` : ''}
              ${r.shift     ? `<span class="text-[11px] px-2 py-0.5 rounded bg-slate-700 text-slate-400">${SHIFT_LABEL[r.shift] || r.shift}</span>` : ''}
              ${r.type      ? `<span class="text-[11px] px-2 py-0.5 rounded bg-slate-700 text-slate-400">${TYPE_LABEL[r.type] || r.type}</span>` : ''}
              ${r.priority  ? `<span class="text-[11px] px-2 py-0.5 rounded ${r.priority === 'principal' ? 'bg-violet-900/40 text-violet-300' : 'bg-slate-700 text-slate-400'}">${PRIORITY_LABEL[r.priority] || r.priority}</span>` : ''}
              ${r.event_time ? `<span class="text-[11px] px-2 py-0.5 rounded bg-slate-700 text-slate-400"><i class="fa-solid fa-clock text-[9px] mr-1"></i>${r.event_time}</span>` : ''}
            </div>
          </div>
          <span class="shrink-0 text-xs px-2 py-0.5 rounded-full bg-primary/20 border border-primary/40 text-primary flex items-center gap-1">
            <i class="fa-solid fa-plus text-[10px]"></i> Pendente
          </span>
        </div>
        ${r.justification ? `
          <div class="bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2.5">
            <p class="text-xs text-slate-500 mb-1 uppercase tracking-wide font-medium">Justificativa</p>
            <p class="text-sm text-slate-300 leading-relaxed">${r.justification}</p>
          </div>` : ''}
        <div class="flex gap-2">
          <button onclick="RequestsCtrl.rejectInsert('${r.id}')"
            class="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium py-2.5 rounded-lg transition-colors">
            Recusar
          </button>
          <button onclick="RequestsCtrl.acceptInsert('${r.id}')"
            class="flex-1 bg-primary hover:bg-primary/90 text-white text-sm font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
            <i class="fa-solid fa-plus text-xs"></i> Aceitar e criar tarefa
          </button>
        </div>
      </div>`;
  },

  async accept(requestId, taskId) {
    const { error } = await db.from('tb_aps_tasks').delete().eq('id', taskId);
    if (error) { window.Toast.show('Erro ao remover tarefa.', 'error'); return; }
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

  async acceptInsert(requestId) {
    const r = AppState.insertRequests.find(r => r.id === requestId);
    if (!r) return;

    const taskId = window.App.generateId();
    const taskPayload = {
      id:             taskId,
      title:          r.title,
      member_id:      r.member_id,
      type:           r.type   || null,
      shift:          r.shift  || null,
      priority:       r.priority || null,
      scheduled_date: r.scheduled_date || null,
      event_time:     r.event_time || null,
      status:         'pending',
    };

    const { error: taskErr } = await db.from('tb_aps_tasks').insert(taskPayload);
    if (taskErr) { window.Toast.show('Erro ao criar tarefa.', 'error'); return; }

    const { error: updErr } = await db.from('tb_aps_task_insert_requests').update({ status: 'accepted' }).eq('id', requestId);
    if (updErr) { window.Toast.show('Erro ao atualizar solicitação.', 'error'); return; }

    const member = AppState.members.find(m => m.id === r.member_id);
    setAppState({
      tasks:          [...AppState.tasks, { ...taskPayload, tb_aps_members: { name: r.member_name, role: member?.role } }],
      insertRequests: AppState.insertRequests.map(req => req.id === requestId ? { ...req, status: 'accepted' } : req),
    });

    window.Toast.show('Tarefa criada com sucesso.', 'success');
    this._render();
    window.App.refreshRequestsBadge();
  },

  async rejectInsert(requestId) {
    const { error } = await db.from('tb_aps_task_insert_requests').update({ status: 'rejected' }).eq('id', requestId);
    if (error) { window.Toast.show('Erro ao recusar solicitação.', 'error'); return; }
    setAppState({ insertRequests: AppState.insertRequests.map(r => r.id === requestId ? { ...r, status: 'rejected' } : r) });
    window.Toast.show('Solicitação recusada.', 'info');
    this._render();
    window.App.refreshRequestsBadge();
  },
};
window.RequestsCtrl = RequestsCtrl;
