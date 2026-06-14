import { db } from '../../db.js';
import { setAppState } from '../../state.js';
import { todayStr } from '../../utils/date.js';

const BATCH = 50; // rows por upsert

async function upsertBatches(table, rows) {
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await db.from(table).upsert(rows.slice(i, i + BATCH), { onConflict: 'id' });
    if (error) throw new Error(`Erro ao importar ${table}: ${error.message}`);
  }
}

export const BackupCtrl = {
  _container: null,
  _pendingData: null,

  init(container) {
    this._container = container;
    this._pendingData = null;
    this._render();
  },

  _render() {
    this._container.innerHTML = `
      <div class="flex-1 overflow-y-auto">
      <div class="mb-6">
        <h2 class="text-xl font-semibold text-white">Backup &amp; Restauração</h2>
        <p class="text-slate-400 text-sm mt-1">Exporte ou importe todos os dados do sistema em formato JSON.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">

        <!-- Exportar -->
        <div class="bg-slate-800 border border-slate-700 rounded-xl p-6 flex flex-col gap-4">
          <div class="w-12 h-12 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center">
            <i class="fa-solid fa-file-arrow-down text-accent text-xl"></i>
          </div>
          <div>
            <h3 class="font-semibold text-white mb-1">Exportar dados</h3>
            <p class="text-slate-400 text-sm leading-relaxed">
              Gera um arquivo <code class="bg-slate-700 px-1 rounded text-xs">.json</code> com
              todos os membros, tarefas, demandas, avisos, ausências e solicitações.
            </p>
          </div>
          <button onclick="BackupCtrl.exportJSON()"
            class="mt-auto flex items-center justify-center gap-2 bg-accent/20 hover:bg-accent/30 border border-accent/40
                   text-accent font-medium text-sm py-2.5 rounded-lg transition-colors">
            <i class="fa-solid fa-download"></i> Exportar JSON
          </button>
        </div>

        <!-- Importar -->
        <div class="bg-slate-800 border border-slate-700 rounded-xl p-6 flex flex-col gap-4">
          <div class="w-12 h-12 rounded-xl bg-warning/20 border border-warning/30 flex items-center justify-center">
            <i class="fa-solid fa-file-arrow-up text-warning text-xl"></i>
          </div>
          <div>
            <h3 class="font-semibold text-white mb-1">Importar dados</h3>
            <p class="text-slate-400 text-sm leading-relaxed">
              Carregue um arquivo de backup. Registros com o mesmo
              <code class="bg-slate-700 px-1 rounded text-xs">id</code> serão atualizados (upsert);
              novos registros serão inseridos.
            </p>
          </div>
          <label class="mt-auto cursor-pointer flex items-center justify-center gap-2 bg-warning/20 hover:bg-warning/30 border border-warning/40
                        text-warning font-medium text-sm py-2.5 rounded-lg transition-colors">
            <i class="fa-solid fa-upload"></i> Selecionar arquivo
            <input type="file" accept=".json" class="hidden" onchange="BackupCtrl.onFileSelect(event)">
          </label>
        </div>

      </div>

      <!-- Preview / resultado -->
      <div id="backup-feedback" class="mt-6 max-w-3xl"></div>
      </div>
    `;
  },

  // ─── EXPORT ─────────────────────────────────────────────────────────────────

  async exportJSON() {
    const btn = this._container.querySelector('button[onclick="BackupCtrl.exportJSON()"]');
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Exportando…';
    btn.disabled = true;

    try {
      const [mRes, tRes, nRes, aRes, rRes] = await Promise.all([
        db.from('tb_aps_members').select('*').order('name'),
        db.from('tb_aps_tasks').select('*').order('updated_at'),
        db.from('tb_aps_notices').select('*').order('created_at'),
        db.from('tb_aps_absences').select('*'),
        db.from('tb_aps_task_requests').select('*').order('created_at'),
      ]);
      if (mRes.error) throw new Error(mRes.error.message);
      if (tRes.error) throw new Error(tRes.error.message);
      if (nRes.error) throw new Error(nRes.error.message);
      if (aRes.error) throw new Error(aRes.error.message);
      if (rRes.error) throw new Error(rRes.error.message);

      const payload = {
        version:     1,
        exported_at: new Date().toISOString(),
        members:     mRes.data || [],
        tasks:       tRes.data || [],
        notices:     nRes.data || [],
        absences:    aRes.data || [],
        requests:    rRes.data || [],
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      Object.assign(document.createElement('a'), {
        href:     url,
        download: `backup-iss-${todayStr()}.json`,
      }).click();
      URL.revokeObjectURL(url);

      const total = payload.tasks.length;
      const demands = payload.tasks.filter(t => !t.member_id).length;
      window.Toast.show(`Exportado: ${payload.members.length} membros · ${total - demands} tarefas · ${demands} demandas · ${payload.notices.length} avisos · ${payload.absences.length} ausências · ${payload.requests.length} solicitações`, 'success', 6000);
    } catch (e) {
      window.Toast.show(`Erro na exportação: ${e.message}`, 'error');
    } finally {
      btn.innerHTML = orig;
      btn.disabled = false;
    }
  },

  // ─── IMPORT ─────────────────────────────────────────────────────────────────

  onFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = ''; // reseta input para permitir re-selecionar o mesmo arquivo

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        this._validateAndPreview(data);
      } catch {
        window.Toast.show('Arquivo JSON inválido ou corrompido.', 'error');
      }
    };
    reader.readAsText(file);
  },

  _validateAndPreview(data) {
    const feedback = document.getElementById('backup-feedback');

    // Validação estrutural
    if (!data.version || !Array.isArray(data.members) || !Array.isArray(data.tasks) || !Array.isArray(data.notices) || !Array.isArray(data.absences) || !Array.isArray(data.requests)) {
      feedback.innerHTML = `
        <div class="flex items-center gap-3 bg-danger/10 border border-danger/30 rounded-xl p-4 text-danger text-sm">
          <i class="fa-solid fa-circle-xmark text-xl"></i>
          Arquivo inválido: estrutura não reconhecida. Certifique-se de usar um backup gerado por este sistema.
        </div>`;
      return;
    }

    const members  = data.members;
    const notices  = data.notices;
    const absences = data.absences;
    const requests = data.requests;
    const demands  = data.tasks.filter(t => !t.member_id);
    const tasks    = data.tasks.filter(t => !!t.member_id);

    // Validação de referências cruzadas
    const memberIds = new Set(members.map(m => m.id));
    const demandIds = new Set(demands.map(d => d.id));

    const orphanTasks   = tasks.filter(t => !memberIds.has(t.member_id));
    const brokenDemands = tasks.filter(t => t.demand_id && !demandIds.has(t.demand_id));

    const exportedAt = data.exported_at
      ? new Date(data.exported_at).toLocaleString('pt-BR')
      : 'data desconhecida';

    this._pendingData = { members, notices, absences, requests, demands, tasks, memberIds, demandIds };

    feedback.innerHTML = `
      <div class="bg-slate-800 border border-slate-700 rounded-xl p-5 flex flex-col gap-4">
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-file-circle-check text-accent text-lg"></i>
          <div>
            <p class="font-semibold text-white text-sm">Preview do backup</p>
            <p class="text-slate-400 text-xs">Exportado em ${exportedAt}</p>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-3">
          ${this._statCard('fa-users', 'text-violet-400', members.length, 'Membros')}
          ${this._statCard('fa-list-check', 'text-blue-400', tasks.length, 'Tarefas')}
          ${this._statCard('fa-layer-group', 'text-amber-400', demands.length, 'Demandas')}
          ${this._statCard('fa-bell', 'text-green-400', notices.length, 'Avisos')}
          ${this._statCard('fa-calendar-xmark', 'text-rose-400', absences.length, 'Ausências')}
          ${this._statCard('fa-inbox', 'text-sky-400', requests.length, 'Solicitações')}
        </div>

        ${orphanTasks.length > 0 ? `
          <div class="flex items-start gap-2 bg-warning/10 border border-warning/30 rounded-lg p-3 text-sm text-warning">
            <i class="fa-solid fa-triangle-exclamation mt-0.5 shrink-0"></i>
            <span>
              <strong>${orphanTasks.length} tarefa${orphanTasks.length !== 1 ? 's' : ''}</strong>
              referencia${orphanTasks.length === 1 ? '' : 'm'} membros que não estão no arquivo.
              O campo <code class="bg-black/20 px-1 rounded">member_id</code> será mantido — o membro deve existir no Supabase.
            </span>
          </div>` : ''}

        ${brokenDemands.length > 0 ? `
          <div class="flex items-start gap-2 bg-warning/10 border border-warning/30 rounded-lg p-3 text-sm text-warning">
            <i class="fa-solid fa-link-slash mt-0.5 shrink-0"></i>
            <span>
              <strong>${brokenDemands.length} tarefa${brokenDemands.length !== 1 ? 's' : ''}</strong>
              referencia${brokenDemands.length === 1 ? '' : 'm'} demandas ausentes no arquivo.
              O vínculo <code class="bg-black/20 px-1 rounded">demand_id</code> será removido nessas tarefas.
            </span>
          </div>` : ''}

        <div class="flex items-start gap-2 bg-slate-700/50 border border-slate-600 rounded-lg p-3 text-sm text-slate-400">
          <i class="fa-solid fa-circle-info mt-0.5 shrink-0"></i>
          <span>
            Registros com <code class="bg-black/20 px-1 rounded">id</code> já existente no Supabase serão
            <strong class="text-slate-300">atualizados</strong>. Registros novos serão inseridos.
            Nenhum dado existente é deletado.
          </span>
        </div>

        <div class="flex gap-3">
          <button onclick="BackupCtrl.cancelImport()"
            class="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
            Cancelar
          </button>
          <button onclick="BackupCtrl.confirmImport()"
            class="flex-1 bg-primary hover:bg-violet-600 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
            <i class="fa-solid fa-cloud-arrow-up mr-1.5"></i>Confirmar importação
          </button>
        </div>
      </div>`;
  },

  _statCard(icon, color, count, label) {
    return `
      <div class="bg-slate-700/50 border border-slate-600 rounded-lg p-3 text-center">
        <i class="fa-solid ${icon} ${color} mb-1 block"></i>
        <p class="text-xl font-bold text-white">${count}</p>
        <p class="text-xs text-slate-400 mt-0.5">${label}</p>
      </div>`;
  },

  cancelImport() {
    this._pendingData = null;
    document.getElementById('backup-feedback').innerHTML = '';
  },

  async confirmImport() {
    if (!this._pendingData) return;
    const { members, notices, absences, requests, demands, tasks, demandIds } = this._pendingData;
    const feedback = document.getElementById('backup-feedback');
    const btn = feedback.querySelector('button[onclick="BackupCtrl.confirmImport()"]');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1.5"></i>Importando…';
    btn.disabled = true;

    try {
      // 1. Members
      if (members.length) await upsertBatches('tb_aps_members', members);

      // 2. Notices
      if (notices.length) await upsertBatches('tb_aps_notices', notices);

      // 3. Demandas (member_id IS NULL) — precisam existir antes das tasks com demand_id
      if (demands.length) await upsertBatches('tb_aps_tasks', demands);

      // 4. Tarefas — limpa demand_id se a demanda referenciada não está no arquivo
      const safeTasks = tasks.map(t => ({
        ...t,
        demand_id: t.demand_id && demandIds.has(t.demand_id) ? t.demand_id : null,
      }));
      if (safeTasks.length) await upsertBatches('tb_aps_tasks', safeTasks);

      // 5. Ausências — dependem de members
      if (absences.length) await upsertBatches('tb_aps_absences', absences);

      // 6. Solicitações — dependem de tasks
      if (requests.length) await upsertBatches('tb_aps_task_requests', requests);

      // Recarrega AppState
      const [mRes, tRes, nRes, aRes, rRes] = await Promise.all([
        db.from('tb_aps_members').select('*').order('name'),
        db.from('tb_aps_tasks').select('*, tb_aps_members(name, role)').not('member_id', 'is', null).order('scheduled_date'),
        db.from('tb_aps_notices').select('*').order('created_at', { ascending: false }),
        db.from('tb_aps_absences').select('*'),
        db.from('tb_aps_task_requests').select('*').order('created_at'),
      ]);
      setAppState({
        members:  mRes.data || [],
        tasks:    tRes.data || [],
        notices:  nRes.data || [],
        absences: aRes.data || [],
        requests: rRes.data || [],
      });

      this._pendingData = null;
      feedback.innerHTML = `
        <div class="flex items-center gap-3 bg-accent/10 border border-accent/30 rounded-xl p-4 text-accent text-sm">
          <i class="fa-solid fa-circle-check text-xl"></i>
          <span>Importação concluída com sucesso!
            <strong>${members.length}</strong> membros ·
            <strong>${tasks.length}</strong> tarefas ·
            <strong>${demands.length}</strong> demandas ·
            <strong>${notices.length}</strong> avisos ·
            <strong>${absences.length}</strong> ausências ·
            <strong>${requests.length}</strong> solicitações importados.
          </span>
        </div>`;
      window.Toast.show('Backup importado com sucesso.', 'success');
    } catch (e) {
      btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up mr-1.5"></i>Confirmar importação';
      btn.disabled = false;
      window.Toast.show(e.message, 'error');
    }
  },
};
window.BackupCtrl = BackupCtrl;
