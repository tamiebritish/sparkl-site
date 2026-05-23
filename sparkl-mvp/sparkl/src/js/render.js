export function renderCleanerCard(cleaner) {
  const topBadge = cleaner.is_top_rated
    ? '<span class="badge-top">Top rated</span>'
    : '<span class="badge-verified">Verified</span>'

  const tags = (cleaner.services || [])
    .slice(0, 3)
    .map(t => `<span class="tag">${escapeHtml(t)}</span>`)
    .join('')

  const portrait = getPortraitUrl(cleaner)

  return `
    <div class="cleaner-card" data-id="${escapeHtml(cleaner.id)}" data-slug="${escapeHtml(cleaner.slug || cleaner.id)}">
      <div class="card-image">
        <img src="${portrait}" alt="Portrait placeholder for ${escapeHtml(cleaner.full_name || 'cleaner')}" loading="lazy">
        <div class="card-badge">${topBadge}</div>
        <button class="card-fav" aria-label="Save to favourites">Save</button>
      </div>
      <div class="card-body">
        <div class="card-header">
          <div class="card-name">${escapeHtml(cleaner.full_name)}</div>
          <div class="card-rating">
            <span class="star">Rating</span>
            ${escapeHtml(cleaner.rating_average?.toFixed(2) ?? '-')}
            <span style="color:var(--bark-light)">(${escapeHtml(cleaner.review_count ?? 0)})</span>
          </div>
        </div>
        <div class="card-sub">${escapeHtml(cleaner.neighbourhood)} / Hamilton</div>
        <div class="card-tags">${tags}</div>
        <div class="card-footer">
          <div class="card-price">$${escapeHtml(cleaner.hourly_rate)}<span>/hr</span></div>
          <button class="card-btn view-profile-btn">View profile</button>
        </div>
      </div>
    </div>
  `
}

export function renderProfileBadges(cleaner) {
  const badges = []
  if (cleaner.is_verified) badges.push('<span class="prof-badge verified">Sparkl verified</span>')
  if (cleaner.is_top_rated) badges.push('<span class="prof-badge top">Top rated</span>')
  return badges.join('')
}

export function renderAvailabilityGrid(availableDays = []) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  return days
    .map(d => {
      const open = availableDays.includes(d)
      return `<div class="avail-day ${open ? 'open' : 'closed'}">${d}</div>`
    })
    .join('')
}

export function renderServiceRows(services = [], hourlyRate) {
  const pricing = {
    Regular: `$${hourlyRate * 2}-$${hourlyRate * 3}`,
    'Deep Clean': `$${hourlyRate * 4}-$${hourlyRate * 5}`,
    'Move In/Out': `$${hourlyRate * 5}-$${hourlyRate * 7}`,
    'Post Reno': `$${hourlyRate * 6}-$${hourlyRate * 8}`,
    'Laundry (add-on)': '+$20',
    'Oven/Fridge (add-on)': '+$30',
  }

  return services
    .map(s => {
      const price = pricing[s] || `$${hourlyRate}/hr`
      return `
        <div class="service-row">
          <span class="service-name">${escapeHtml(s)}</span>
          <span class="service-price">${escapeHtml(price)}</span>
        </div>
      `
    })
    .join('')
}

export function renderReviews(reviews = []) {
  if (!reviews.length) {
    return '<p style="font-size:14px;color:var(--bark-light)">No reviews yet. Be the first to book.</p>'
  }

  return reviews
    .map(r => {
      const date = new Date(r.created_at).toLocaleDateString('en-CA', {
        year: 'numeric',
        month: 'short',
      })
      return `
        <div class="review-item">
          <div class="review-header">
            <span class="review-author">${escapeHtml(r.client_name)}</span>
            <span class="review-date">${date}</span>
          </div>
          <div class="review-stars">${escapeHtml(r.rating)}/5</div>
          <div class="review-text">${escapeHtml(r.review_text)}</div>
        </div>
      `
    })
    .join('')
}

export function renderBookingStatusPill(status) {
  const map = {
    pending: ['status-pending', 'Pending'],
    confirmed: ['status-upcoming', 'Confirmed'],
    completed: ['status-complete', 'Complete'],
    declined: ['status-declined', 'Declined'],
    cancelled: ['status-declined', 'Cancelled'],
  }
  const [cls, label] = map[status] || ['status-complete', status]
  return `<span class="status-pill ${cls}">${escapeHtml(label)}</span>`
}

export function renderBookingRow(booking) {
  const cleaner = booking.cleaners || {}
  const portrait = getPortraitUrl(cleaner)
  const date = booking.preferred_date
    ? new Date(booking.preferred_date).toLocaleDateString('en-CA', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '-'

  const rebookBtn =
    booking.status === 'completed'
      ? `<button class="rebook-btn" data-cleaner-slug="${escapeHtml(cleaner.slug)}">Rebook</button>`
      : ''

  return `
    <div class="booking-row">
      <div class="booking-ava"><img src="${portrait}" alt=""></div>
      <div class="booking-info">
        <div class="booking-name">${escapeHtml(cleaner.full_name || 'Cleaner')}</div>
        <div class="booking-detail">
          ${date} / ${escapeHtml(booking.service_type)} / ${escapeHtml(booking.home_size)}
        </div>
      </div>
      ${renderBookingStatusPill(booking.status)}
      ${rebookBtn}
    </div>
  `
}

export function escapeHtml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function getPortraitUrl(cleaner = {}) {
  if (cleaner.photo_url) return escapeHtml(cleaner.photo_url)

  const portraits = [
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=800&q=80',
  ]
  const key = String(cleaner.id || cleaner.slug || cleaner.full_name || '')
  const index = [...key].reduce((sum, char) => sum + char.charCodeAt(0), 0) % portraits.length
  return portraits[index]
}

export function renderSkeletonCards(container, count = 6) {
  container.innerHTML = Array(count)
    .fill(0)
    .map(
      () => `
      <div class="cleaner-card skeleton-card">
        <div class="card-image skeleton-block"></div>
        <div class="card-body">
          <div class="skeleton-line" style="width:60%;height:14px;margin-bottom:8px"></div>
          <div class="skeleton-line" style="width:40%;height:12px;margin-bottom:12px"></div>
          <div class="skeleton-line" style="width:80%;height:10px"></div>
        </div>
      </div>
    `
    )
    .join('')
}

export function renderErrorState(container, message) {
  container.innerHTML = `
    <div class="empty-state" style="grid-column:1/-1;text-align:center;padding:3rem">
      <p style="color:var(--bark-light);font-size:14px">${escapeHtml(message)}</p>
    </div>
  `
}

export function renderEmptyState(container, message) {
  container.innerHTML = `
    <div class="empty-state" style="grid-column:1/-1;text-align:center;padding:3rem">
      <p style="color:var(--bark-light);font-size:14px">${escapeHtml(message)}</p>
    </div>
  `
}
