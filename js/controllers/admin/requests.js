import { db } from '../../db.js';
import { AppState } from '../../state.js';

const SHIFT_LABEL    = { manha: 'Manhã', tarde: 'Tarde', dia_todo: 'Dia todo', livre: 'Livre' };
const TYPE_LABEL     = { operacional: 'Operacional', analitica: 'Analítica', estrategia: 'Estratégia', treinamento: 'Treinamento', reuniao: 'Reunião', suporte: 'Suporte' };
const PRIORITY_LABEL = { principal: 'Principal', secundaria: 'Secundária' };

export const RequestsCtrl = {
  _container: null,
  _activeTab: 'insertion',
  _taskMeta: new Map(),

  async init(container) {
    this._container = container;
    await this._loadTaskMeta();
    this._render();
  },

  // Tarefas referenciadas por notificações de remoção podem ter qualquer
  // scheduled_date (passada ou futura), então não dá pra contar com
  // AppState.tasks (escopado por semana para as outras views) — busca
  // só as tarefas necessárias, por id.
  async _loadTaskMeta() {
    const ids = AppState.requests.map(r => r.task_id).filter(Boolean);
    if (ids.length === 0) { this._taskMeta = new Map(); return; }
    const { data, error } = await db.from('tb_aps_tasks').select('*').in('id', ids);
    if (error) { window.Toast?.show('Erro ao carregar dados das tarefas.', 'error'); return; }
    this._taskMeta = new Map((data || []).map(t => [t.id, t]));
  },

  _render() {
    const insertions = [...AppState.insertRequests].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const removals    = [...AppState.requests].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    this._container.innerHTML = `
      <div class="flex-1 flex flex-col min-h-0">
        <div class="mb-5 shrink-0">
          <h2 class="text-xl font-semibold text-white">Notificações</h2>
          <p class="text-sm text-slate-400 mt-1">Inserções e remoções feitas pelo acesso público.</p>
        </div>

        <div class="flex gap-1 mb-5 shrink-0 border-b border-slate-700">
          <button onclick="RequestsCtrl._setTab('insertion')"
            class="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px
                   ${this._activeTab === 'insertion' ? 'border-primary text-white' : 'border-transparent text-slate-400 hover:text-white'}">
            Inserções
          </button>
          <button onclick="RequestsCtrl._setTab('removal')"
            class="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px
                   ${this._activeTab === 'removal' ? 'border-primary text-white' : 'border-transparent text-slate-400 hover:text-white'}">
            Remoções
          </button>
        </div>

        <div class="flex-1 min-h-0 overflow-y-auto">
          ${this._activeTab === 'insertion' ? this._insertionList(insertions) : this._removalList(removals)}
        </div>
      </div>`;
  },

  _setTab(tab) {
    this._activeTab = tab;
    this._render();
  },

  _insertionList(items) {
    if (items.length === 0) {
      return `<div class="text-center py-16 text-slate-500">
        <i class="fa-solid fa-inbox text-4xl mb-3 block opacity-30"></i>
        <p>Nenhuma inserção registrada ainda.</p>
      </div>`;
    }
    return `<div class="flex flex-col gap-3 max-w-2xl">${items.map(r => this._cardInsertion(r)).join('')}</div>`;
  },

  _removalList(items) {
    if (items.length === 0) {
      return `<div class="text-center py-16 text-slate-500">
        <i class="fa-solid fa-inbox text-4xl mb-3 block opacity-30"></i>
        <p>Nenhuma remoção registrada ainda.</p>
      </div>`;
    }
    return `<div class="flex flex-col gap-3 max-w-2xl">${items.map(r => this._cardRemoval(r)).join('')}</div>`;
  },

  _cardInsertion(r) {
    const sentAt = new Date(r.created_at).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
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
            <p class="text-sm text-slate-400 mt-0.5">${r.member_name} · <span class="text-slate-500">${sentAt}</span></p>
            <div class="flex flex-wrap gap-1.5 mt-2">
              ${r.scheduled_date ? `<span class="text-[11px] px-2 py-0.5 rounded bg-slate-700 text-slate-400"><i class="fa-solid fa-calendar text-[9px] mr-1"></i>${fmtDate(r.scheduled_date)}</span>` : ''}
              ${r.shift     ? `<span class="text-[11px] px-2 py-0.5 rounded bg-slate-700 text-slate-400">${SHIFT_LABEL[r.shift] || r.shift}</span>` : ''}
              ${r.type      ? `<span class="text-[11px] px-2 py-0.5 rounded bg-slate-700 text-slate-400">${TYPE_LABEL[r.type] || r.type}</span>` : ''}
              ${r.priority  ? `<span class="text-[11px] px-2 py-0.5 rounded ${r.priority === 'principal' ? 'bg-violet-900/40 text-violet-300' : 'bg-slate-700 text-slate-400'}">${PRIORITY_LABEL[r.priority] || r.priority}</span>` : ''}
              ${r.event_time ? `<span class="text-[11px] px-2 py-0.5 rounded bg-slate-700 text-slate-400"><i class="fa-solid fa-clock text-[9px] mr-1"></i>${r.event_time}</span>` : ''}
            </div>
          </div>
          <span class="shrink-0 text-xs px-2 py-0.5 rounded-full bg-primary/20 border border-primary/40 text-primary flex items-center gap-1">
            <i class="fa-solid fa-plus text-[10px]"></i> Criada
          </span>
        </div>
        ${r.justification ? `
          <div class="bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2.5">
            <p class="text-xs text-slate-500 mb-1 uppercase tracking-wide font-medium">Justificativa</p>
            <p class="text-sm text-slate-300 leading-relaxed">${r.justification}</p>
          </div>` : ''}
      </div>`;
  },

  _cardRemoval(r) {
    const sentAt = new Date(r.created_at).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    const task = this._taskMeta.get(r.task_id);
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
            <p class="text-sm text-slate-400 mt-0.5">${r.member_name} · <span class="text-slate-500">${sentAt}</span></p>
            ${taskMeta}
          </div>
          <span class="shrink-0 text-xs px-2 py-0.5 rounded-full bg-rose-900/40 border border-rose-700 text-rose-300 flex items-center gap-1">
            <i class="fa-solid fa-trash text-[10px]"></i> Removida
          </span>
        </div>
        <div class="bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2.5">
          <p class="text-xs text-slate-500 mb-1 uppercase tracking-wide font-medium">Justificativa</p>
          <p class="text-sm text-slate-300 leading-relaxed">${r.justification}</p>
        </div>
      </div>`;
  },
};
window.RequestsCtrl = RequestsCtrl;
