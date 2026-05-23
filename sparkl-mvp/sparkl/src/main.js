/**
 * main.js — Application entry point.
 *
 * Registers all routes and starts the router.
 * Each route shows the appropriate page section and initializes its controller.
 */

import { route, fallback, startRouter, bindRouterLinks, navigate } from './js/router.js'
import { initBrowsePage } from './pages/browse.js'
import { initProfilePage } from './pages/profile.js'
import { initDashboardPage } from './pages/dashboard.js'
import { initApplyPage } from './pages/apply.js'
import './js/toast.js' // registers window.showToast

// ─── PAGE SWITCHER ────────────────────────────────────────────────────────────

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'))
  document.getElementById(`page-${id}`)?.classList.add('active')

  // Sync nav active state
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.page === id)
  })

  window.scrollTo({ top: 0, behavior: 'instant' })
}

// Make showPage available to inline handlers
window.showPage = showPage

// ─── ROUTES ───────────────────────────────────────────────────────────────────

// Home / browse
route('/', () => {
  showPage('home')
  initBrowsePage()
})

// Cleaner profile
route('/cleaner/:slug', ({ params }) => {
  showPage('profile')
  initProfilePage({ slug: params.slug })
})

// Client dashboard
route('/dashboard', () => {
  showPage('dashboard')
  initDashboardPage()
})

// Cleaner application
route('/apply', () => {
  showPage('apply')
  initApplyPage()
})

// Legal pages (static content, no controller needed)
route('/terms', () => showPage('terms'))
route('/privacy', () => showPage('privacy'))
route('/trust', () => showPage('trust'))

// 404 fallback → back to home
fallback(() => {
  showPage('home')
  initBrowsePage()
})

// ─── NAV LINKS ────────────────────────────────────────────────────────────────

// Wire up nav links that use data-page
document.querySelectorAll('[data-page]').forEach(link => {
  link.addEventListener('click', () => {
    const page = link.dataset.page
    const routeMap = {
      home: '/',
      dashboard: '/dashboard',
      apply: '/apply',
    }
    navigate(routeMap[page] || '/')
  })
})

// ─── START ────────────────────────────────────────────────────────────────────

bindRouterLinks()
startRouter()
