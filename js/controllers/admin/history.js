import { db } from '../../db.js';
import { AppState } from '../../state.js';

const TYPE_LABEL  = { operacional:'Operacional', analitica:'Analítica', estrategia:'Estratégia', treinamento:'Treinamento', reuniao:'Reunião' };
const SHIFT_LABEL = { manha:'Manhã', tarde:'Tarde', livre:'Livre' };

export const HistoryCtrl = {
  _container: null,
  _results: [],

  init(container) {
    this._container = container;
    this._render([]);
  },

  _render(items) {
    const { members } = AppState;
    this._container.innerHTML = `
      <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 class="text-xl font-semibold text-white">Histórico e Auditoria</h2>
          <p class="text-slate-400 text-sm mt-1">Filtre e exporte registros de execuções.</p>
        </div>
        <button onclick="HistoryCtrl.exportCSV()"
          class="flex items-center gap-2 bg-accent/20 hover:bg-accent/30 border border-accent/40 text-accent text-sm font-medium
                 px-4 py-2 rounded-lg transition-colors">
          <i class="fa-solid fa-file-csv"></i> Exportar CSV
        </button>
      </div>

      <!-- Filters -->
      <div class="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-5">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label class="block text-xs text-slate-400 mb-1">Data inicial</label>
            <input id="h-start" type="date"
              class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm
                     focus:outline-none focus:border-primary transition-colors">
          </div>
          <div>
            <label class="block text-xs text-slate-400 mb-1">Data final</label>
            <input id="h-end" type="date"
              class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm
                     focus:outline-none focus:border-primary transition-colors">
          </div>
          <div>
            <label class="block text-xs text-slate-400 mb-1">Funcionário</label>
            <select id="h-member"
              class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm
                     focus:outline-none focus:border-primary transition-colors">
              <option value="">Todos</option>
              ${members.map(m => `<option value="${m.id}">${m.name}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-xs text-slate-400 mb-1">Palavra-chave</label>
            <input id="h-keyword" type="text" placeholder="Ex: relatório"
              class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm
                     placeholder-slate-500 focus:outline-none focus:border-primary transition-colors">
          </div>
        </div>
        <div class="mt-3 flex justify-end">
          <button onclick="HistoryCtrl.search()"
            class="bg-primary hover:bg-violet-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <i class="fa-solid fa-magnifying-glass mr-1.5"></i>Buscar
          </button>
        </div>
      </div>

      <!-- Results -->
      <div id="h-results">
        <div class="text-center py-12 text-slate-500">
          <i class="fa-solid fa-filter text-4xl mb-3 block opacity-30"></i>
          <p>Use os filtros acima para buscar registros.</p>
        </div>
      </div>`;
  },

  async search() {
    const start   = document.getElementById('h-start').value;
    const end     = document.getElementById('h-end').value;
    const memberId = document.getElementById('h-member').value;
    const keyword  = document.getElementById('h-keyword').value.trim().toLowerCase();
    const resultsEl = document.getElementById('h-results');

    resultsEl.innerHTML = `<div class="flex items-center gap-2 text-slate-500 py-8 justify-center">
      <i class="fa-solid fa-spinner fa-spin"></i> Buscando…</div>`;

    let q = db.from('tasks_iss')
      .select('*, members(name)')
      .not('member_id', 'is', null)
      .order('scheduled_date', { ascending: false });

    if (start) q = q.gte('scheduled_date', start);
    if (end)   q = q.lte('scheduled_date', end);
    if (memberId) q = q.eq('member_id', memberId);

    const { data, error } = await q;
    if (error) { window.Toast.show('Erro na busca.', 'error'); return; }

    let items = data || [];
    if (keyword) items = items.filter(t => t.title.toLowerCase().includes(keyword));
    this._results = items;
    this._renderTable(items, resultsEl);
  },

  _renderTable(items, container) {
    if (items.length === 0) {
      container.innerHTML = `<div class="text-center py-12 text-slate-500">
        <i class="fa-solid fa-inbox text-4xl mb-3 block opacity-30"></i>
        <p>Nenhum resultado encontrado.</p></div>`;
      return;
    }

    container.innerHTML = `
      <p class="text-sm text-slate-400 mb-3">${items.length} registro${items.length !== 1 ? 's' : ''} encontrado${items.length !== 1 ? 's' : ''}</p>
      <div class="bg-slate-800 border border-slate-700 rounded-xl overflow-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
              <th class="text-left px-4 py-3 font-medium">Data</th>
              <th class="text-left px-4 py-3 font-medium">Funcionário</th>
              <th class="text-left px-4 py-3 font-medium">Tarefa</th>
              <th class="text-left px-4 py-3 font-medium hidden sm:table-cell">Tipo</th>
              <th class="text-left px-4 py-3 font-medium hidden md:table-cell">Turno</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-700/60">
            ${items.map(t => {
              const [y, mo, d] = (t.scheduled_date || '').split('-');
              const dateDisplay = t.scheduled_date ? `${d}/${mo}/${y}` : '—';
              return `
                <tr class="hover:bg-slate-700/30 transition-colors">
                  <td class="px-4 py-3 text-slate-300 whitespace-nowrap">${dateDisplay}</td>
                  <td class="px-4 py-3 text-white font-medium">${t.members?.name || '—'}</td>
                  <td class="px-4 py-3 text-slate-300">${t.title}</td>
                  <td class="px-4 py-3 text-slate-400 hidden sm:table-cell">${TYPE_LABEL[t.type] || t.type}</td>
                  <td class="px-4 py-3 text-slate-400 hidden md:table-cell">${SHIFT_LABEL[t.shift] || t.shift}</td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  },

  exportCSV() {
    if (this._results.length === 0) {
      window.Toast.show('Faça uma busca antes de exportar.', 'warning');
      return;
    }
    const BOM  = '﻿';
    const head = ['Data', 'Funcionário', 'Título', 'Prioridade', 'Tipo', 'Turno', 'Horário'];
    const rows = this._results.map(t => {
      const [y, mo, d] = (t.scheduled_date || '').split('-');
      return [
        t.scheduled_date ? `${d}/${mo}/${y}` : '',
        t.members?.name  || '',
        t.title,
        t.priority === 'principal' ? 'Principal' : 'Secundária',
        TYPE_LABEL[t.type]  || t.type  || '',
        SHIFT_LABEL[t.shift]|| t.shift || '',
        t.event_time || '',
      ];
    });

    const csv  = BOM + [head, ...rows]
      .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), {
      href:     url,
      download: `historico-iss-${new Date().toISOString().split('T')[0]}.csv`,
    });
    a.click();
    URL.revokeObjectURL(url);
    window.Toast.show('CSV exportado com sucesso.', 'success');
  },
};
window.HistoryCtrl = HistoryCtrl;
