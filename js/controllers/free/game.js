import { db } from '../../db.js';
import { AppState, setAppState } from '../../state.js';
import { getMondayOf, toDateStr } from '../../utils/date.js';

const FILLER_WORDS = [
  'FOCO', 'META', 'EQUIPE', 'PRAZO', 'AGENDA', 'REVISAO', 'ENTREGA', 'PROCESSO',
  'QUALIDADE', 'ORGANIZAR', 'PLANEJAR', 'RESULTADO', 'DESEMPENHO', 'ROTINA',
  'DEMANDA', 'PRIORIDADE', 'CONCLUIR', 'PRODUTIVO', 'DISCIPLINA', 'CONSTANCIA',
];

function normalizeWord(s) {
  return (s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
}

export const GameCtrl = {
  _view: 'list', // 'list' | 'game'
  _selectedMemberId: null,
  _chosenGame: null,
  _raf: null,

  _lastWorkDayRef() {
    const now = new Date();
    const day = now.getDay(); // 0 = domingo, 6 = sábado
    if (day === 0) { now.setDate(now.getDate() - 2); } // domingo -> sexta anterior
    if (day === 6) { now.setDate(now.getDate() - 1); } // sábado  -> sexta anterior
    return now;
  },

  _weekRange() {
    const monday = getMondayOf(this._lastWorkDayRef());
    const friday = new Date(monday); friday.setDate(monday.getDate() + 4);
    return { start: toDateStr(monday), end: toDateStr(friday) };
  },

  _eligibleMembers() {
    const { start, end } = this._weekRange();
    const { members, tasks } = AppState;
    const weekTasks = tasks.filter(t => t.scheduled_date >= start && t.scheduled_date <= end);

    const byMember = new Map();
    for (const t of weekTasks) {
      if (!t.member_id) continue;
      if (!byMember.has(t.member_id)) byMember.set(t.member_id, { total: 0, done: 0 });
      const g = byMember.get(t.member_id);
      g.total++;
      if (t.status === 'done') g.done++;
    }

    return members
      .filter(m => m.active)
      .filter(m => {
        const g = byMember.get(m.id);
        return g && g.total > 0 && g.done === g.total;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  async openModal() {
    this._view = 'list';
    this._selectedMemberId = null;
    this._chosenGame = null;
    // AppState.tasks está escopado à semana que a view atual estava mostrando
    // (cronograma admin/livre podem estar em outra semana) — garante que a
    // semana corrente está carregada antes de calcular elegibilidade.
    const { start } = this._weekRange();
    await window.App.loadWeekTasks(new Date(start + 'T12:00:00'));
    this._render();
  },

  closeModal() {
    this._stopDino();
    this._stopWordSearchTimer();
    document.getElementById('modal-container').innerHTML = '';
  },

  _backdrop(e) {
    if (e.target === e.currentTarget) this.closeModal();
  },

  selectMember(memberId) {
    this._selectedMemberId = memberId;
    this._chosenGame = Math.random() < 0.5 ? 'dino' : 'wordsearch';
    this._view = 'game';
    this._render();
  },

  backToList() {
    this._stopDino();
    this._stopWordSearchTimer();
    this._view = 'list';
    this._selectedMemberId = null;
    this._render();
  },

  _stopWordSearchTimer() {
    if (this._wsTimerInterval) { clearInterval(this._wsTimerInterval); this._wsTimerInterval = null; }
  },

  _render() {
    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
      <div class="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4"
           onclick="GameCtrl._backdrop(event)">
        <div class="bg-slate-800 border border-slate-700 rounded-2xl w-full ${this._view === 'game' ? 'max-w-2xl' : 'max-w-md'} shadow-2xl max-h-[90vh] overflow-y-auto"
             onclick="event.stopPropagation()">
          ${this._view === 'list' ? this._listHTML() : this._gameHTML()}
        </div>
      </div>`;

    if (this._view === 'game') {
      if (this._chosenGame === 'dino') this._startDino();
      if (this._chosenGame === 'wordsearch') this._initWordSearch();
    }
  },

  _listHTML() {
    const eligible = this._eligibleMembers();
    return `
      <div class="flex items-center justify-between p-5 border-b border-slate-700">
        <h3 class="font-bold text-white flex items-center gap-2">
          <i class="fa-solid fa-gamepad text-primary"></i> Jogo desbloqueado
        </h3>
        <button onclick="GameCtrl.closeModal()"
          class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="p-5">
        <p class="text-sm text-slate-400 mb-4">
          Quem concluiu <span class="text-white font-medium">todas as tarefas da semana</span> já pode jogar. Clique no seu nome!
        </p>
        ${eligible.length === 0
          ? `<div class="text-center py-10 text-slate-500">
               <i class="fa-solid fa-lock text-3xl mb-3 block opacity-40"></i>
               <p class="text-sm">Ninguém desbloqueou o jogo ainda nesta semana.</p>
             </div>`
          : `<div class="flex flex-col gap-2">
               ${eligible.map(m => `
                 <button onclick="GameCtrl.selectMember('${m.id}')"
                   class="w-full flex items-center gap-3 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 hover:border-primary/60 rounded-lg px-4 py-3 transition-colors text-left">
                   <span class="w-8 h-8 rounded-full bg-accent/20 border border-accent/40 text-accent flex items-center justify-center font-bold text-sm shrink-0">
                     <i class="fa-solid fa-check text-xs"></i>
                   </span>
                   <span class="text-sm font-medium text-white flex-1 truncate">${m.name}</span>
                   <i class="fa-solid fa-chevron-right text-slate-500 text-sm"></i>
                 </button>`).join('')}
             </div>`}
      </div>`;
  },

  _gameHTML() {
    const member = AppState.members.find(m => m.id === this._selectedMemberId);
    return `
      <div class="flex items-center justify-between p-5 border-b border-slate-700">
        <div class="flex items-center gap-3">
          <button onclick="GameCtrl.backToList()"
            class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
            <i class="fa-solid fa-arrow-left text-xs"></i>
          </button>
          <h3 class="font-bold text-white flex items-center gap-2">
            <i class="fa-solid fa-trophy text-warning"></i> ${member?.name || '—'}
          </h3>
        </div>
        <button onclick="GameCtrl.closeModal()"
          class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="p-5">
        ${this._chosenGame === 'dino' ? this._dinoHTML() : this._wordSearchHTML()}
      </div>`;
  },

  // ── Jogo do dinossauro ───────────────────────────────────────────────────────

  _dinoHTML() {
    return `
      <p class="text-sm text-slate-400 mb-3 text-center">Pressione <span class="text-white font-medium">espaço</span> ou toque na tela para pular.</p>
      <div class="flex justify-center">
        <canvas id="dino-canvas" width="600" height="200" class="bg-slate-900 rounded-lg border border-slate-700 max-w-full"></canvas>
      </div>
      <p id="dino-score" class="text-center text-slate-300 text-sm mt-3">Pontos: 0</p>
      <div id="dino-save-wrap" class="flex justify-center mt-3"></div>
    `;
  },

  _startDino() {
    const canvas = document.getElementById('dino-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const GROUND_Y = H - 30;

    const dino = { x: 40, y: GROUND_Y - 30, w: 24, h: 30, vy: 0, jumping: false };
    const GRAVITY = 0.9, JUMP_V = -13;
    let obstacles = [];
    let speed = 5;
    let frame = 0;
    let score = 0;
    let gameOver = false;

    const jump = () => {
      if (gameOver) return;
      if (!dino.jumping) {
        dino.vy = JUMP_V;
        dino.jumping = true;
      }
    };

    const keyHandler = (e) => {
      if (e.code === 'Space') { e.preventDefault(); jump(); }
    };
    const clickHandler = () => jump();

    window.addEventListener('keydown', keyHandler);
    canvas.addEventListener('mousedown', clickHandler);
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); jump(); });

    this._dinoCleanup = () => {
      window.removeEventListener('keydown', keyHandler);
      canvas.removeEventListener('mousedown', clickHandler);
    };

    const loop = () => {
      frame++;
      ctx.clearRect(0, 0, W, H);

      // chão
      ctx.strokeStyle = '#475569';
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y); ctx.lineTo(W, GROUND_Y);
      ctx.stroke();

      if (!gameOver) {
        dino.vy += GRAVITY;
        dino.y += dino.vy;
        if (dino.y >= GROUND_Y - dino.h) {
          dino.y = GROUND_Y - dino.h;
          dino.vy = 0;
          dino.jumping = false;
        }

        if (frame % Math.max(40, 90 - Math.floor(speed * 3)) === 0) {
          obstacles.push({ x: W, w: 16, h: 30 + Math.random() * 20 });
        }
        obstacles.forEach(o => o.x -= speed);
        obstacles = obstacles.filter(o => o.x + o.w > 0);

        for (const o of obstacles) {
          const oy = GROUND_Y - o.h;
          if (dino.x < o.x + o.w && dino.x + dino.w > o.x && dino.y < oy + o.h && dino.y + dino.h > oy) {
            gameOver = true;
          }
        }

        score += 1;
        speed = 5 + Math.min(6, score / 300);
      }

      // bonequinho
      this._drawStickman(ctx, dino, gameOver ? 0 : frame);

      // obstáculos
      ctx.fillStyle = '#f87171';
      obstacles.forEach(o => ctx.fillRect(o.x, GROUND_Y - o.h, o.w, o.h));

      const finalScore = Math.floor(score / 5);
      const scoreEl = document.getElementById('dino-score');
      if (scoreEl) scoreEl.textContent = gameOver
        ? `Fim de jogo! Pontos: ${finalScore}`
        : `Pontos: ${finalScore}`;

      if (gameOver) {
        const saveWrap = document.getElementById('dino-save-wrap');
        if (saveWrap && !saveWrap.dataset.rendered) {
          saveWrap.dataset.rendered = '1';
          saveWrap.innerHTML = `
            <button onclick="GameCtrl._confirmSaveScore('dino', ${finalScore}, this)"
              class="flex items-center gap-2 bg-accent hover:bg-accent/90 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              <i class="fa-solid fa-floppy-disk"></i> Salvar resultado
            </button>`;
        }
        return;
      }

      this._raf = requestAnimationFrame(loop);
    };
    loop();
  },

  _drawStickman(ctx, dino, frame) {
    const cx = dino.x + dino.w / 2;
    const top = dino.y;
    const headR = dino.w * 0.28;
    const headCy = top + headR;
    const bodyTop = headCy + headR;
    const bodyBottom = top + dino.h * 0.72;
    const inAir = frame === 0 && dino.jumping;
    const legSwing = inAir ? 6 : Math.sin(frame * 0.35) * 6;

    ctx.strokeStyle = '#e2e8f0';
    ctx.fillStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    // cabeça
    ctx.beginPath();
    ctx.arc(cx, headCy, headR, 0, Math.PI * 2);
    ctx.fill();

    // corpo
    ctx.beginPath();
    ctx.moveTo(cx, bodyTop);
    ctx.lineTo(cx, bodyBottom);
    ctx.stroke();

    // braços
    ctx.beginPath();
    ctx.moveTo(cx, bodyTop + 4);
    ctx.lineTo(cx - 8, bodyTop + 12);
    ctx.moveTo(cx, bodyTop + 4);
    ctx.lineTo(cx + 8, bodyTop + 12);
    ctx.stroke();

    // pernas
    ctx.beginPath();
    ctx.moveTo(cx, bodyBottom);
    ctx.lineTo(cx - 7, bodyBottom + 10 + legSwing * 0.3);
    ctx.moveTo(cx, bodyBottom);
    ctx.lineTo(cx + 7, bodyBottom + 10 - legSwing * 0.3);
    ctx.stroke();
  },

  _stopDino() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
    if (this._dinoCleanup) { this._dinoCleanup(); this._dinoCleanup = null; }
  },

  async _confirmSaveScore(game, value, btnEl) {
    if (btnEl) {
      btnEl.disabled = true;
      btnEl.classList.add('opacity-60', 'cursor-not-allowed');
      btnEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando…';
    }

    const member = AppState.members.find(m => m.id === this._selectedMemberId);
    if (!member) return;
    const id = window.App.generateId();
    const row = { id, member_id: member.id, member_name: member.name, game, value };
    const { error } = await db.from('tb_aps_game_scores').insert(row);
    if (error) {
      console.error('Erro ao salvar pontuação do jogo:', error);
      window.Toast?.show('Não foi possível salvar sua pontuação.', 'error');
      if (btnEl) {
        btnEl.disabled = false;
        btnEl.classList.remove('opacity-60', 'cursor-not-allowed');
        btnEl.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Salvar resultado';
      }
      return;
    }
    setAppState({ gameScores: [{ ...row, created_at: new Date().toISOString() }, ...AppState.gameScores] });
    if (window.RankingCtrl?._container) window.RankingCtrl._render();
    if (btnEl) btnEl.innerHTML = '<i class="fa-solid fa-check"></i> Resultado salvo!';
    window.Toast?.show('Resultado salvo no ranking de destaques!', 'success', 3000);
  },

  // ── Caça-palavras ────────────────────────────────────────────────────────────

  _wordSearchHTML() {
    return `
      <p class="text-sm text-slate-400 mb-1 text-center">Encontre as palavras da lista arrastando o mouse sobre as letras.</p>
      <p id="ws-timer" class="text-center text-white font-medium text-sm mb-3">0s</p>
      <div class="flex flex-col lg:flex-row gap-5 items-start justify-center">
        <div id="ws-grid" class="grid select-none" style="grid-template-columns: repeat(12, minmax(0,1fr)); gap:2px; touch-action:none"></div>
        <div id="ws-words" class="flex flex-col gap-1.5 min-w-[160px]"></div>
      </div>
      <div id="ws-save-wrap" class="flex justify-center mt-4"></div>
    `;
  },

  _initWordSearch() {
    const SIZE = 12;
    const member = AppState.members.find(m => m.id === this._selectedMemberId);
    const { start, end } = this._weekRange();
    const doneTitles = AppState.tasks
      .filter(t => t.member_id === this._selectedMemberId && t.status === 'done' && t.scheduled_date >= start && t.scheduled_date <= end)
      .map(t => normalizeWord(t.title))
      .filter(w => w.length >= 3 && w.length <= SIZE);

    const uniqueTitles = [...new Set(doneTitles)];
    const words = [...uniqueTitles];
    const shuffledFillers = [...FILLER_WORDS].sort(() => Math.random() - 0.5);
    let fi = 0;
    while (words.length < 6 && fi < shuffledFillers.length) {
      const w = shuffledFillers[fi++];
      if (!words.includes(w) && w.length <= SIZE) words.push(w);
    }
    words.sort((a, b) => b.length - a.length);

    const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(''));
    const DIRS = [[0, 1], [1, 0], [1, 1], [-1, 1]];
    const placed = [];

    for (const word of words) {
      let ok = false;
      for (let attempt = 0; attempt < 60 && !ok; attempt++) {
        const [dr, dc] = DIRS[Math.floor(Math.random() * DIRS.length)];
        const maxRow = dr >= 0 ? SIZE - (dr * (word.length - 1)) : SIZE;
        const minRow = dr < 0 ? -dr * (word.length - 1) : 0;
        const maxCol = dc >= 0 ? SIZE - (dc * (word.length - 1)) : SIZE;
        const minCol = dc < 0 ? -dc * (word.length - 1) : 0;
        if (maxRow <= minRow || maxCol <= minCol) continue;
        const row = minRow + Math.floor(Math.random() * (maxRow - minRow));
        const col = minCol + Math.floor(Math.random() * (maxCol - minCol));

        let fits = true;
        for (let i = 0; i < word.length; i++) {
          const r = row + dr * i, c = col + dc * i;
          if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) { fits = false; break; }
          const cell = grid[r][c];
          if (cell && cell !== word[i]) { fits = false; break; }
        }
        if (!fits) continue;

        for (let i = 0; i < word.length; i++) {
          const r = row + dr * i, c = col + dc * i;
          grid[r][c] = word[i];
        }
        placed.push({ word, row, col, dr, dc });
        ok = true;
      }
    }

    const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (!grid[r][c]) grid[r][c] = ALPHA[Math.floor(Math.random() * ALPHA.length)];
      }
    }

    this._wsFound = new Set();
    this._wsPlaced = placed;
    this._wsStartTime = Date.now();
    this._wsFinished = false;
    if (this._wsTimerInterval) clearInterval(this._wsTimerInterval);
    this._wsTimerInterval = setInterval(() => {
      const timerEl = document.getElementById('ws-timer');
      if (!timerEl) { clearInterval(this._wsTimerInterval); return; }
      if (this._wsFinished) return;
      timerEl.textContent = `${Math.floor((Date.now() - this._wsStartTime) / 1000)}s`;
    }, 250);
    this._wsSelecting = false;
    this._wsStart = null;

    const gridEl = document.getElementById('ws-grid');
    gridEl.innerHTML = grid.map((row, r) => row.map((letter, c) => `
      <div data-r="${r}" data-c="${c}"
        class="ws-cell w-7 h-7 flex items-center justify-center text-xs font-bold text-slate-300 bg-slate-700/60 border border-slate-600 rounded-sm cursor-pointer">
        ${letter}
      </div>`).join('')).join('');

    const wordsEl = document.getElementById('ws-words');
    wordsEl.innerHTML = `
      <p class="text-xs text-slate-500 uppercase tracking-wide mb-1">Palavras (${member?.name || ''})</p>
      ${placed.map(p => `<span id="ws-word-${p.word}" class="text-sm text-slate-300">${p.word}</span>`).join('')}
    `;

    const cellAt = (r, c) => gridEl.querySelector(`[data-r="${r}"][data-c="${c}"]`);

    const cellsBetween = (r1, c1, r2, c2) => {
      const dr = Math.sign(r2 - r1), dc = Math.sign(c2 - c1);
      const len = Math.max(Math.abs(r2 - r1), Math.abs(c2 - c1)) + 1;
      const isStraight = (r1 === r2) || (c1 === c2) || (Math.abs(r2 - r1) === Math.abs(c2 - c1));
      if (!isStraight) return null;
      const cells = [];
      for (let i = 0; i < len; i++) cells.push({ r: r1 + dr * i, c: c1 + dc * i });
      return cells;
    };

    const clearPreview = () => {
      gridEl.querySelectorAll('.ws-cell.ws-preview').forEach(el => el.classList.remove('ws-preview', 'bg-primary/30'));
    };

    const tryMatch = (cells) => {
      const str = cells.map(({ r, c }) => grid[r][c]).join('');
      const strRev = [...str].reverse().join('');
      const match = placed.find(p => !this._wsFound.has(p.word) && (p.word === str || p.word === strRev));
      return match;
    };

    const onDown = (r, c) => {
      this._wsSelecting = true;
      this._wsStart = { r, c };
    };
    const onEnter = (r, c) => {
      if (!this._wsSelecting || !this._wsStart) return;
      clearPreview();
      const cells = cellsBetween(this._wsStart.r, this._wsStart.c, r, c);
      if (!cells) return;
      cells.forEach(({ r, c }) => {
        const el = cellAt(r, c);
        el.classList.add('ws-preview', 'bg-primary/30');
      });
    };
    const onUp = (r, c) => {
      if (!this._wsSelecting || !this._wsStart) return;
      const cells = cellsBetween(this._wsStart.r, this._wsStart.c, r, c);
      this._wsSelecting = false;
      clearPreview();
      if (!cells) return;
      const match = tryMatch(cells);
      if (match) {
        this._wsFound.add(match.word);
        cells.forEach(({ r, c }) => {
          const el = cellAt(r, c);
          el.classList.add('bg-accent/40', 'text-accent', 'border-accent/60');
        });
        const label = document.getElementById(`ws-word-${match.word}`);
        if (label) label.classList.add('line-through', 'text-accent');
        if (this._wsFound.size === placed.length && !this._wsFinished) {
          this._wsFinished = true;
          const seconds = Math.round((Date.now() - this._wsStartTime) / 1000);
          const timerEl = document.getElementById('ws-timer');
          if (timerEl) timerEl.textContent = `${seconds}s — concluído!`;
          const saveWrap = document.getElementById('ws-save-wrap');
          if (saveWrap) {
            saveWrap.innerHTML = `
              <button onclick="GameCtrl._confirmSaveScore('wordsearch', ${seconds}, this)"
                class="flex items-center gap-2 bg-accent hover:bg-accent/90 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                <i class="fa-solid fa-floppy-disk"></i> Salvar resultado
              </button>`;
          }
          window.Toast?.show('Você encontrou todas as palavras! 🎉', 'success', 4000);
        }
      }
      this._wsStart = null;
    };

    gridEl.querySelectorAll('.ws-cell').forEach(el => {
      const r = Number(el.dataset.r), c = Number(el.dataset.c);
      el.addEventListener('mousedown', () => onDown(r, c));
      el.addEventListener('mouseenter', () => onEnter(r, c));
      el.addEventListener('mouseup', () => onUp(r, c));
    });
    document.addEventListener('mouseup', () => { this._wsSelecting = false; clearPreview(); }, { once: true });
  },
};
window.GameCtrl = GameCtrl;
