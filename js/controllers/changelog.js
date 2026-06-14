import { VERSION } from '../app.js';

const RELEASES = [
  {
    version: 'v1.1',
    date: 'Junho 2026',
    label: 'Gestão da equipe',
    sections: [
      {
        title: 'Acesso Sistema',
        icon: 'fa-eye',
        color: 'text-accent',
        items: [
          {
            name: 'Solicitação de remoção de tarefa',
            desc: 'Membros podem solicitar a remoção de uma tarefa pendente informando uma justificativa (até 140 caracteres). A tarefa fica marcada como "Aguardando supervisão" até a resposta. Disponível nas views Tarefas do Dia e Cronograma.',
          },
          {
            name: 'Indicador de ausência no Cronograma',
            desc: 'Dias com ausência registrada exibem badge com o turno (Manhã, Tarde ou Dia todo) na coluna correspondente. Em dia todo, as tarefas ficam ocultas.',
          },
          {
            name: 'Indicador de férias no Cronograma',
            desc: 'Dias dentro do período de férias do membro exibem badge âmbar "Férias" na coluna, com tarefas ocultas. O cabeçalho também exibe o badge quando a semana selecionada cobre o período.',
          },
        ],
      },
      {
        title: 'Acesso Supervisão',
        icon: 'fa-lock',
        color: 'text-primary',
        items: [
          {
            name: 'Visão Geral (dashboard)',
            desc: 'Nova tela inicial do painel de supervisão. Exibe em tempo real: progresso de tarefas do dia, membros sem tarefas, ausentes, férias ativas e encerradas, tarefas pendentes de dias anteriores, próximas reuniões e treinamentos dos próximos 7 dias, e alerta de conflito entre turno cadastrado e horário informado.',
          },
          {
            name: 'Solicitações',
            desc: 'Nova aba para gerenciar pedidos de remoção enviados pela equipe. Exibe título, membro, data da solicitação, detalhes da tarefa (data agendada, turno, tipo, prioridade) e justificativa. Aceitar remove a tarefa; recusar descarta apenas a solicitação.',
          },
          {
            name: 'Férias na Equipe',
            desc: 'Cadastro de período de férias por membro. Exibe badge no campo Situação com as datas. Quando o período encerra, o badge muda para alerta laranja indicando que a supervisão deve atualizar o registro.',
          },
          {
            name: 'Ausências no Cronograma',
            desc: 'Células do calendário permitem registrar ausência diária por turno (Manhã, Tarde ou Dia todo) via modal. Dias de ausência ficam com tinta rosada; dias de férias bloqueados com tinta âmbar.',
          },
          {
            name: 'Finalizar tarefas no Cronograma',
            desc: 'Tarefas podem ser marcadas como concluídas ou pendentes diretamente nas células do calendário semanal, sem precisar navegar para outra tela. O toggle também está disponível dentro do modal de detalhes da célula.',
          },
        ],
      },
    ],
  },
  {
    version: 'v1.0',
    date: 'Junho 2026',
    label: 'Lançamento inicial',
    sections: [
      {
        title: 'Acesso Sistema',
        icon: 'fa-eye',
        color: 'text-accent',
        items: [
          {
            name: 'Tarefas do Dia',
            desc: 'Visualização das tarefas alocadas para o dia atual, agrupadas por membro. Exibe tipo, descrição e status de cada tarefa. Avisos fixados pela supervisão aparecem no topo do painel.',
          },
          {
            name: 'Cronograma Semanal',
            desc: 'Visão da semana completa (seg–sex) com tarefas por membro e dia. Permite navegar entre semanas. Tarefas são exibidas com tipo e status.',
          },
          {
            name: 'Banco de Demandas',
            desc: 'Lista todas as demandas e estudos ainda não alocados a nenhum membro. Possui filtro de busca por texto em tempo real.',
          },
          {
            name: 'Visão Geral',
            desc: 'Ranking semanal de tarefas concluídas por membro, com medalhas para os três primeiros. Exibe avisos da supervisão e permite navegar entre semanas.',
          },
        ],
      },
      {
        title: 'Acesso Supervisão',
        icon: 'fa-lock',
        color: 'text-primary',
        items: [
          {
            name: 'Cronograma',
            desc: 'Calendário semanal para atribuição de tarefas por membro e dia. Permite criar, editar e excluir tarefas diretamente nas células. Grupos de turno com separadores visuais. Modal de seleção do banco de demandas com filtro por texto em tempo real.',
          },
          {
            name: 'Equipe',
            desc: 'Cadastro, edição e exclusão de membros. Cada membro tem nome, cargo e turno definidos.',
          },
          {
            name: 'Histórico',
            desc: 'Consulta de tarefas por período com filtros por membro, tipo e status. Permite excluir registros individualmente.',
          },
          {
            name: 'Banco & Estudos',
            desc: 'Gestão das demandas do banco e estudos. Criação, edição, exclusão e movimentação de itens entre as categorias Banco e Estudos.',
          },
          {
            name: 'Avisos',
            desc: 'Criação e edição de avisos para a equipe. Avisos podem ser fixados no topo e ficam visíveis na Visão Geral e no painel de Tarefas do Dia.',
          },
          {
            name: 'Backup',
            desc: 'Exportação completa dos dados do sistema em formato JSON. Permite reimportar o arquivo para restaurar ou migrar dados.',
          },
        ],
      },
    ],
  },
];

export const ChangelogCtrl = {
  init(container) {
    const html = RELEASES.map(r => `
      <div class="mb-10">
        <div class="flex items-center gap-3 mb-1">
          <span class="text-lg font-bold text-white">${r.version}</span>
          <span class="bg-primary/20 text-primary text-xs font-medium px-2 py-0.5 rounded-full border border-primary/30">${r.label}</span>
        </div>
        <p class="text-slate-500 text-sm mb-6">${r.date}</p>

        <div class="flex flex-col gap-8">
          ${r.sections.map(s => `
            <div>
              <p class="flex items-center gap-2 text-sm font-semibold ${s.color} mb-3">
                <i class="fa-solid ${s.icon}"></i>${s.title}
              </p>
              <div class="flex flex-col gap-3">
                ${s.items.map(item => `
                  <div class="flex gap-3">
                    <span class="w-1.5 h-1.5 rounded-full bg-slate-500 mt-2 shrink-0"></span>
                    <p class="text-sm text-slate-300 leading-relaxed">
                      <span class="font-medium text-white">${item.name}</span>
                      <span class="text-slate-500"> — </span>
                      ${item.desc}
                    </p>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');

    container.innerHTML = `
      <div class="h-full flex flex-col">
        <nav class="bg-slate-800 border-b border-slate-700 px-4 sm:px-6 py-3 flex items-center gap-3 shrink-0">
          <button onclick="App.navigate('home')"
            class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
            <i class="fa-solid fa-arrow-left text-sm"></i>
          </button>
          <span class="font-semibold text-white">Changelog</span>
          <span class="text-slate-500 text-sm">${VERSION}</span>
        </nav>
        <main class="flex-1 overflow-y-auto">
          <div class="max-w-2xl mx-auto px-6 py-8">
            ${html}
          </div>
        </main>
      </div>
    `;
  },
};
window.ChangelogCtrl = ChangelogCtrl;
