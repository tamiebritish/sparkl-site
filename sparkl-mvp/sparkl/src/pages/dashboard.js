/**
 * pages/dashboard.js — Client dashboard controller (Phase 1 version).
 *
 * Phase 1: Client enters their email to look up bookings (no auth yet).
 * Phase 2: Replace email lookup with real auth session.
 */

import { getBookingRequestsByClient } from '../js/db.js'
import { renderBookingRow, renderEmptyState, renderErrorState } from '../js/render.js'

let listenersBound = false

export function initDashboardPage() {
  if (listenersBound) return

  const lookupBtn = document.getElementById('dashLookupBtn')

  if (!lookupBtn) return

  listenersBound = true
  lookupBtn.addEventListener('click', async () => {
    const emailInput = document.getElementById('dashEmailInput')
    const email = emailInput?.value?.trim()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      emailInput?.classList.add('input-error')
      return
    }
    emailInput?.classList.remove('input-error')

    await loadBookings(email)
  })
}

async function loadBookings(email) {
  const lookupSection = document.getElementById('dashLookup')
  const bookingsSection = document.getElementById('dashBookings')

  lookupSection.style.display = 'none'
  bookingsSection.style.display = 'block'

  const list = document.getElementById('bookingsList')
  list.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--bark-light);font-size:14px">Loading…</div>'

  try {
    const bookings = await getBookingRequestsByClient(email)

    if (!bookings.length) {
      renderEmptyState(list, 'No bookings found for this email. Ready to book your first clean?')
      return
    }

    list.innerHTML = bookings.map(renderBookingRow).join('')

    // Wire up rebook buttons
    list.querySelectorAll('.rebook-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const cleanerSlug = btn.dataset.cleanerSlug
        if (cleanerSlug) window.location.hash = `/cleaner/${cleanerSlug}`
      })
    })
  } catch (err) {
    console.error('Dashboard load error:', err)
    renderErrorState(list, 'Could not load your bookings right now. Please try again.')
  }
}
