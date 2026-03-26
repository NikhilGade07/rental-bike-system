/**
 * frontend/utils.js
 * ─────────────────────────────────────────────────────────────
 * Shared utilities:  Toast, Router, Session
 * ─────────────────────────────────────────────────────────────
 */

'use strict';

/* ══ TOAST NOTIFICATION SYSTEM ══════════════════════════════ */

const Toast = (() => {
  const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };

  function show(type, title, msg, duration = 4000) {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `
      <div class="toast-icon">${icons[type] || 'ℹ'}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        ${msg ? `<div class="toast-msg">${msg}</div>` : ''}
      </div>`;
    container.appendChild(el);
    setTimeout(() => {
      el.classList.add('removing');
      setTimeout(() => el.remove(), 350);
    }, duration);
  }

  return {
    success: (t, m) => show('success', t, m),
    error:   (t, m) => show('error',   t, m),
    info:    (t, m) => show('info',    t, m),
    warning: (t, m) => show('warning', t, m),
  };
})();

/* ══ ROUTER ══════════════════════════════════════════════════ */

const Router = (() => {
  let current = null;
  const pages = {};

  function register(id) {
    pages[id] = document.getElementById(id);
  }

  function navigate(id, callback) {
    if (current && pages[current]) pages[current].classList.remove('active');
    if (pages[id])                 pages[id].classList.add('active');
    current = id;
    document.querySelectorAll('[data-nav]').forEach(a => {
      a.classList.toggle('active', a.dataset.nav === id);
    });
    if (callback) callback();
  }

  function getCurrent() { return current; }

  return { register, navigate, getCurrent };
})();

/* ══ SESSION MANAGER ════════════════════════════════════════ */

const Session = (() => {
  const KEY = 'brs_current_user';

  function save(user)  { localStorage.setItem(KEY, JSON.stringify(user)); }
  function get()       { return JSON.parse(localStorage.getItem(KEY) || 'null'); }
  function clear()     { localStorage.removeItem(KEY); }
  function isAdmin()   { return get()?.role === 'admin'; }
  function isLoggedIn(){ return !!get(); }

  return { save, get, clear, isAdmin, isLoggedIn };
})();

/* ══ HELPERS ════════════════════════════════════════════════ */

/** $ shorthand for getElementById */
function $(id)   { return document.getElementById(id); }
/** $$ shorthand for querySelectorAll */
function $$(sel) { return document.querySelectorAll(sel); }

/** Format currency */
function fmtCurrency(amount) { return `$${parseFloat(amount).toFixed(2)}`; }

/** Format date */
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { day:'numeric', month:'short', year:'numeric' });
}

function statusBadge(status) {
  const map = { confirmed: 'badge-confirmed', returned: 'badge-available', cancelled: 'badge-rented' };
  return `<span class="badge ${map[status] || ''}">${status.charAt(0).toUpperCase()+status.slice(1)}</span>`;
}

// attach to global
window.BRS = window.BRS || {};
Object.assign(window.BRS, { Toast, Router, Session, $, $$, fmtCurrency, fmtDate, statusBadge });
