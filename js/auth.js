import { db } from './db.js';
import { setAppState } from './state.js';

export const AuthCtrl = {
  openLogin() {
    document.getElementById('modal-container').innerHTML = `
      <div class="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4"
           onclick="AuthCtrl._backdropClick(event)">
        <div class="bg-slate-800 border border-slate-700 rounded-2xl p-8 w-full max-w-sm shadow-2xl"
             onclick="event.stopPropagation()">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h2 class="text-xl font-bold text-white">Acesso Supervisão</h2>
              <p class="text-slate-400 text-sm mt-0.5">Área restrita de edição</p>
            </div>
            <button onclick="AuthCtrl.closeLogin()"
              class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <form onsubmit="AuthCtrl.login(event)" class="flex flex-col gap-4">
            <div>
              <label class="block text-sm text-slate-400 mb-1.5">E-mail</label>
              <input id="auth-email" type="email" placeholder="email@exemplo.com" required autocomplete="username"
                class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white placeholder-slate-500
                       focus:outline-none focus:border-primary transition-colors">
            </div>
            <div>
              <label class="block text-sm text-slate-400 mb-1.5">Senha</label>
              <input id="auth-password" type="password" placeholder="••••••••" required autocomplete="current-password"
                class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white placeholder-slate-500
                       focus:outline-none focus:border-primary transition-colors">
            </div>
            <div id="auth-error" class="hidden text-rose-400 text-sm bg-rose-900/30 border border-rose-800 rounded-lg px-3 py-2"></div>
            <button type="submit" id="auth-btn"
              class="bg-primary hover:bg-violet-600 text-white font-semibold py-2.5 rounded-lg transition-colors mt-1">
              Entrar
            </button>
          </form>
        </div>
      </div>
    `;
    setTimeout(() => document.getElementById('auth-email')?.focus(), 50);
  },

  closeLogin() {
    document.getElementById('modal-container').innerHTML = '';
  },

  _backdropClick(e) {
    if (e.target === e.currentTarget) this.closeLogin();
  },

  async login(e) {
    e.preventDefault();
    const email    = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const btn      = document.getElementById('auth-btn');
    const errEl    = document.getElementById('auth-error');

    btn.disabled = true;
    btn.textContent = 'Entrando…';
    errEl.classList.add('hidden');

    const { error } = await db.auth.signInWithPassword({ email, password });

    if (error) {
      errEl.textContent = 'E-mail ou senha inválidos.';
      errEl.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = 'Entrar';
      return;
    }

    setAppState({ isAdmin: true });
    this.closeLogin();
    window.Toast.show('Bem-vindo, Supervisão!', 'success');
    window.App.navigate('admin');
  },

  async logout() {
    await db.auth.signOut();
    setAppState({ isAdmin: false });
    window.Toast.show('Sessão encerrada.', 'info');
    window.App.navigate('home');
  },

  async checkSession() {
    const { data } = await db.auth.getSession();
    if (data?.session) {
      setAppState({ isAdmin: true });
      return true;
    }
    return false;
  },
};
window.AuthCtrl = AuthCtrl;
