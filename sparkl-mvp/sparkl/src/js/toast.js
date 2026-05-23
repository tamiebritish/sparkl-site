/**
 * toast.js — Lightweight toast notification utility.
 *
 * Usage: import { showToast } from './toast.js'
 *        showToast('Saved to favourites')
 *        showToast('Something went wrong', 'error')
 */

let _toastTimeout = null

export function showToast(message, type = 'default') {
  const el = document.getElementById('toast')
  if (!el) return

  // Clear any pending hide
  if (_toastTimeout) clearTimeout(_toastTimeout)

  el.textContent = message
  el.className = 'toast show'
  if (type === 'error') el.classList.add('toast-error')

  _toastTimeout = setTimeout(() => {
    el.classList.remove('show')
  }, 2800)
}

// Make showToast available globally for inline onclick handlers
// (convenience only — prefer importing directly in modules)
window.showToast = showToast
