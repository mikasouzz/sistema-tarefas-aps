const STYLES = {
  info:    { wrap: 'bg-slate-700 border-slate-600',   icon: 'fa-circle-info text-blue-400' },
  success: { wrap: 'bg-emerald-900 border-emerald-700', icon: 'fa-circle-check text-emerald-400' },
  error:   { wrap: 'bg-rose-900 border-rose-700',     icon: 'fa-circle-xmark text-rose-400' },
  warning: { wrap: 'bg-amber-900 border-amber-700',   icon: 'fa-triangle-exclamation text-amber-400' },
};

export const Toast = {
  show(message, type = 'info', duration = 4000) {
    const s = STYLES[type] || STYLES.info;
    const el = document.createElement('div');
    el.className = `toast-in pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg border text-sm shadow-xl ${s.wrap}`;
    el.innerHTML = `<i class="fa-solid ${s.icon} shrink-0"></i><span>${message}</span>`;
    document.getElementById('toast-container').appendChild(el);
    setTimeout(() => {
      el.classList.replace('toast-in', 'toast-out');
      setTimeout(() => el.remove(), 300);
    }, duration);
  },
};
window.Toast = Toast;
