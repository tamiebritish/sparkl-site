/**
 * router.js — Hash-based SPA router.
 *
 * Uses URL hashes so the app has real navigable URLs:
 *   /                → home / browse
 *   /#/cleaner/:slug → cleaner profile
 *   /#/book/:slug    → booking modal open on profile
 *   /#/dashboard     → client dashboard
 *   /#/apply         → cleaner onboarding
 *
 * Each route maps to a page controller that handles its own rendering.
 */

const routes = {}
let _fallback = null

/**
 * Register a route handler.
 * pattern: string like '/cleaner/:slug'
 * handler: async function({ params, query })
 */
export function route(pattern, handler) {
  routes[pattern] = handler
}

/**
 * Register a 404 / fallback handler.
 */
export function fallback(handler) {
  _fallback = handler
}

/**
 * Navigate to a route, updating the URL hash.
 */
export function navigate(path) {
  window.location.hash = path
}

/**
 * Start listening for hash changes and handle the current URL.
 */
export function startRouter() {
  window.addEventListener('hashchange', handleRoute)
  handleRoute() // handle the initial page load
}

function handleRoute() {
  const hash = window.location.hash.slice(1) || '/'
  const [path, queryString] = hash.split('?')
  const query = Object.fromEntries(new URLSearchParams(queryString || ''))

  for (const [pattern, handler] of Object.entries(routes)) {
    const params = matchRoute(pattern, path)
    if (params !== null) {
      handler({ params, query })
      return
    }
  }

  if (_fallback) {
    _fallback({ path })
  }
}

/**
 * Returns a params object if path matches pattern, otherwise null.
 * e.g. matchRoute('/cleaner/:slug', '/cleaner/nadine-browne')
 *   → { slug: 'nadine-browne' }
 */
function matchRoute(pattern, path) {
  const patternParts = pattern.split('/')
  const pathParts = path.split('/')

  if (patternParts.length !== pathParts.length) return null

  const params = {}
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = decodeURIComponent(pathParts[i])
    } else if (patternParts[i] !== pathParts[i]) {
      return null
    }
  }
  return params
}

/**
 * Make all [data-route] anchor clicks use the router.
 * Usage in HTML: <a data-route href="#/dashboard">Dashboard</a>
 */
export function bindRouterLinks() {
  document.addEventListener('click', e => {
    const link = e.target.closest('[data-route]')
    if (!link) return
    const href = link.getAttribute('href')
    if (href?.startsWith('#')) {
      e.preventDefault()
      navigate(href.slice(1))
    }
  })
}
