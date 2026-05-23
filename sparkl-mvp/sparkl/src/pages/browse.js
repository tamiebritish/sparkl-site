/**
 * pages/browse.js — Browse / homepage controller.
 *
 * Responsible for: rendering the cleaner grid, handling filter pills,
 * and navigating to profiles on card click.
 */

import { getCleaners } from '../js/db.js'
import {
  renderCleanerCard,
  renderSkeletonCards,
  renderErrorState,
  renderEmptyState,
} from '../js/render.js'
import { navigate } from '../js/router.js'
import { showToast } from '../js/toast.js'

let listenersBound = false

export async function initBrowsePage() {
  const grid = document.getElementById('cleanerGrid')
  if (!grid) return

  if (!listenersBound) {
    listenersBound = true

    // Wire up filter pills
    document.querySelectorAll('.filter-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'))
        pill.classList.add('active')
        const tag = pill.dataset.filter
        loadCleaners(tag)
      })
    })

    // Wire up sort select
    document.getElementById('sortSelect')?.addEventListener('change', e => {
      const activeFilter = document.querySelector('.filter-pill.active')?.dataset.filter || 'All'
      loadCleaners(activeFilter, e.target.value)
    })
  }

  await loadCleaners('All')
}

async function loadCleaners(serviceType = 'All', sort = 'recommended') {
  const grid = document.getElementById('cleanerGrid')
  renderSkeletonCards(grid)

  try {
    let cleaners = await getCleaners({ serviceType })

    // Client-side sort (db already orders by top_rated + rating for 'recommended')
    if (sort === 'price-asc') {
      cleaners = cleaners.sort((a, b) => a.hourly_rate - b.hourly_rate)
    } else if (sort === 'price-desc') {
      cleaners = cleaners.sort((a, b) => b.hourly_rate - a.hourly_rate)
    } else if (sort === 'rating') {
      cleaners = cleaners.sort((a, b) => b.rating_average - a.rating_average)
    }

    if (!cleaners.length) {
      renderEmptyState(grid, 'No cleaners match this filter yet. Check back soon.')
      return
    }

    grid.innerHTML = cleaners.map(renderCleanerCard).join('')

    // Wire up card clicks after rendering
    grid.querySelectorAll('.cleaner-card').forEach(card => {
      card.addEventListener('click', e => {
        // Don't navigate if the fav button was clicked
        if (e.target.closest('.card-fav')) return
        const slug = card.dataset.slug
        navigate(`/cleaner/${slug}`)
      })

      // Fav button toggle (local state only for now — Phase 2 will persist)
      card.querySelector('.card-fav')?.addEventListener('click', e => {
        const btn = e.currentTarget
        const isSaved = btn.textContent === '♥'
        btn.textContent = isSaved ? '♡' : '♥'
        btn.style.color = isSaved ? '' : 'var(--terracotta)'
        showToast(isSaved ? 'Removed from saved' : 'Saved to favourites')
      })
    })
  } catch (err) {
    console.error('Failed to load cleaners:', err)
    renderErrorState(grid, 'Could not load cleaners right now. Please try again.')
  }
}
