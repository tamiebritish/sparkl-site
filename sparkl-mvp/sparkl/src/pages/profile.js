/**
 * pages/profile.js — Cleaner profile page controller.
 *
 * Loads cleaner data by slug, renders the full profile,
 * and wires up the booking request flow.
 */

import { getCleanerBySlug, getReviewsForCleaner } from '../js/db.js'
import {
  renderProfileBadges,
  renderAvailabilityGrid,
  renderServiceRows,
  renderReviews,
  escapeHtml,
} from '../js/render.js'
import { initBookingModal } from './booking.js'

export async function initProfilePage({ slug }) {
  showPage('profile')
  setProfileLoading(true)

  try {
    const [cleaner, reviews] = await Promise.all([
      getCleanerBySlug(slug),
      // We'll fetch reviews once we have the cleaner id — handled below
      Promise.resolve([]),
    ])

    // Fetch reviews separately now that we have the ID
    const reviewData = await getReviewsForCleaner(cleaner.id)

    renderProfile(cleaner, reviewData)
    initBookingModal(cleaner)
  } catch (err) {
    console.error('Failed to load profile:', err)
    document.getElementById('profileContent').innerHTML = `
      <div style="text-align:center;padding:4rem 2rem">
        <p style="color:var(--bark-light)">This profile could not be loaded. It may have been removed or made unavailable.</p>
        <button onclick="window.location.hash='/'" style="margin-top:1rem" class="card-btn">Back to browse</button>
      </div>
    `
  } finally {
    setProfileLoading(false)
  }
}

function renderProfile(cleaner, reviews) {
  // Avatar
  const avatarEl = document.getElementById('profAvatar')
  if (avatarEl) {
    avatarEl.textContent = cleaner.emoji_placeholder || '🧹'
    avatarEl.style.background = cleaner.avatar_bg_color || '#E8F2EC'
  }

  // Name, meta, badges, stats
  setText('profName', cleaner.full_name)
  setText('profMeta', `${cleaner.neighbourhood} · Hamilton  ·  ★ ${cleaner.rating_average?.toFixed(2) ?? '—'} (${cleaner.review_count ?? 0} reviews)`)
  setHtml('profBadges', renderProfileBadges(cleaner))
  setHtml('profStats', `
    <div class="stat"><div class="stat-num">${cleaner.review_count ?? 0}</div><div class="stat-lbl">Reviews</div></div>
    <div class="stat"><div class="stat-num">${cleaner.rating_average?.toFixed(2) ?? '—'}</div><div class="stat-lbl">Avg rating</div></div>
    <div class="stat"><div class="stat-num">$${escapeHtml(cleaner.hourly_rate)}</div><div class="stat-lbl">per hour</div></div>
  `)

  // Booking panel price
  setHtml('profPriceBig', `$${escapeHtml(cleaner.hourly_rate)}<span>/hr starting from</span>`)

  // Bio
  setText('profBio', cleaner.bio)

  // Services
  setHtml('profServices', renderServiceRows(cleaner.services || [], cleaner.hourly_rate))

  // Availability
  setHtml('profAvail', renderAvailabilityGrid(cleaner.available_days || []))

  // Reviews
  setHtml('profReviews', renderReviews(reviews))

  // Languages sidebar
  setText('profLangs', cleaner.languages || 'English')

  // Page title for SEO / tab
  document.title = `${cleaner.full_name} — Sparkl Hamilton`
}

function setProfileLoading(loading) {
  const content = document.getElementById('profileContent')
  if (content) content.style.opacity = loading ? '0.4' : '1'
}

function setText(id, text) {
  const el = document.getElementById(id)
  if (el) el.textContent = text ?? ''
}

function setHtml(id, html) {
  const el = document.getElementById(id)
  if (el) el.innerHTML = html
}
