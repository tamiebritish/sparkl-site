/**
 * pages/booking.js — Booking request modal controller.
 *
 * Three-step flow:
 *   Step 1: Client details + preferences
 *   Step 2: Confirmation summary
 *   Step 3: Success state
 *
 * Submits to Supabase booking_requests table on step 2 confirmation.
 */

import { submitBookingRequest } from '../js/db.js'
import {
  validateBookingForm,
  extractBookingFormData,
  showFormErrors,
  clearFormErrors,
  setButtonLoading,
} from '../js/forms.js'
import { escapeHtml } from '../js/render.js'

let _cleaner = null
let _step = 1
let _formData = {}

/**
 * Attach a cleaner to the booking modal and wire up the open button.
 */
export function initBookingModal(cleaner) {
  _cleaner = cleaner
  _step = 1

  // "Request Booking" button in the sidebar panel
  document.getElementById('openBookingBtn')?.addEventListener('click', openModal)

  // Quick rebook button (only shown to returning clients)
  document.getElementById('rebookBtn')?.addEventListener('click', openModal)

  // Close modal on overlay click
  document.getElementById('bookingModal')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal()
  })
}

export function openModal() {
  _step = 1
  _formData = {}
  renderStep()
  document.getElementById('bookingModal')?.classList.add('open')
}

function closeModal() {
  document.getElementById('bookingModal')?.classList.remove('open')
}

function renderStep() {
  renderStepIndicator()

  const content = document.getElementById('modalContent')
  if (!content) return

  if (_step === 1) content.innerHTML = renderStep1()
  else if (_step === 2) content.innerHTML = renderStep2()
  else content.innerHTML = renderStep3()

  // Bind step buttons after render
  document.getElementById('modalNext')?.addEventListener('click', handleNext)
  document.getElementById('modalBack')?.addEventListener('click', () => { _step--; renderStep() })
  document.getElementById('modalClose')?.addEventListener('click', closeModal)
  document.getElementById('modalToDashboard')?.addEventListener('click', () => {
    closeModal()
    window.location.hash = '/dashboard'
  })
}

async function handleNext() {
  if (_step === 1) {
    // Validate and collect form data
    const form = document.getElementById('bookingForm')
    const data = extractBookingFormData(form)
    const { valid, errors } = validateBookingForm(data)

    if (!valid) {
      showFormErrors(form, errors)
      return
    }

    clearFormErrors(form)
    _formData = { ...data, cleanerId: _cleaner.id }
    _step = 2
    renderStep()
  } else if (_step === 2) {
    // Submit to Supabase
    const btn = document.getElementById('modalNext')
    const resetBtn = setButtonLoading(btn, 'Sending…')

    try {
      await submitBookingRequest(_formData)
      _step = 3
      renderStep()
    } catch (err) {
      console.error('Booking submission error:', err)
      resetBtn()
      // Show inline error on the confirmation step
      const errEl = document.getElementById('confirmError')
      if (errEl) {
        errEl.textContent = 'Something went wrong. Please try again or email us.'
        errEl.style.display = 'block'
      }
    }
  }
}

function renderStepIndicator() {
  const labels = ['Details', 'Confirm', 'Done']
  const indicator = document.getElementById('stepIndicator')
  if (!indicator) return

  indicator.innerHTML = labels
    .map((label, i) => {
      const n = i + 1
      let cls = 'future'
      if (n < _step) cls = 'done'
      else if (n === _step) cls = 'current'
      const icon = n < _step ? '✓' : n
      const line = i < labels.length - 1 ? '<div class="step-line"></div>' : ''
      return `<div class="step-dot ${cls}" title="${label}">${icon}</div>${line}`
    })
    .join('')
}

// ─── STEP TEMPLATES ───────────────────────────────────────────────────────────

function renderStep1() {
  // Set min date to tomorrow
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  return `
    <h2>Request booking</h2>
    <div class="modal-sub">with ${escapeHtml(_cleaner.full_name)} · $${_cleaner.hourly_rate}/hr</div>

    <form id="bookingForm" novalidate>
      <div class="form-group">
        <label>Your name</label>
        <input name="client_name" type="text" placeholder="Full name" autocomplete="name" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Email</label>
          <input name="client_email" type="email" placeholder="you@email.com" autocomplete="email" />
        </div>
        <div class="form-group">
          <label>Phone</label>
          <input name="client_phone" type="tel" placeholder="(905) 000-0000" autocomplete="tel" />
        </div>
      </div>
      <div class="form-group">
        <label>Service type</label>
        <select name="service_type">
          <option value="">Select a service…</option>
          ${(_cleaner.services || []).map(s => `<option value="${s}">${escapeHtml(s)}</option>`).join('')}
        </select>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Preferred date</label>
          <input name="preferred_date" type="date" min="${minDate}" />
        </div>
        <div class="form-group">
          <label>Preferred time</label>
          <select name="preferred_time">
            <option value="">Select…</option>
            <option>8:00 AM</option>
            <option>9:00 AM</option>
            <option>10:00 AM</option>
            <option>12:00 PM</option>
            <option>1:00 PM</option>
            <option>2:00 PM</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>Home size</label>
        <select name="home_size">
          <option value="">Select…</option>
          <option>Studio / 1 bed</option>
          <option>2 bedrooms</option>
          <option>3 bedrooms</option>
          <option>4+ bedrooms</option>
        </select>
      </div>
      <div class="form-group">
        <label>Notes for ${escapeHtml(_cleaner.full_name)} <span style="font-weight:400;color:var(--bark-light)">(optional)</span></label>
        <textarea name="notes" placeholder="Pets, preferred products, areas to focus on…"></textarea>
      </div>
    </form>

    <div class="modal-footer">
      <button class="modal-btn-sec" id="modalClose">Cancel</button>
      <button class="modal-btn-pri" id="modalNext">Continue →</button>
    </div>
  `
}

function renderStep2() {
  return `
    <h2>Confirm request</h2>
    <div class="modal-sub">Review before sending to ${escapeHtml(_cleaner.full_name)}</div>

    <div style="background:var(--cream);border-radius:12px;padding:1.25rem;margin-bottom:1.25rem;border:1px solid var(--border)">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:1rem;padding-bottom:1rem;border-bottom:1px solid var(--border)">
        <div style="font-size:36px">${_cleaner.emoji_placeholder || '🧹'}</div>
        <div>
          <div style="font-weight:600">${escapeHtml(_cleaner.full_name)}</div>
          <div style="font-size:13px;color:var(--bark-light)">${escapeHtml(_cleaner.neighbourhood)} · ★ ${_cleaner.rating_average?.toFixed(2) ?? '—'}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px">
        <div><div style="color:var(--bark-light);margin-bottom:2px">Name</div><div style="font-weight:500">${escapeHtml(_formData.clientName)}</div></div>
        <div><div style="color:var(--bark-light);margin-bottom:2px">Email</div><div style="font-weight:500">${escapeHtml(_formData.clientEmail)}</div></div>
        <div><div style="color:var(--bark-light);margin-bottom:2px">Service</div><div style="font-weight:500">${escapeHtml(_formData.serviceType)}</div></div>
        <div><div style="color:var(--bark-light);margin-bottom:2px">Date &amp; time</div><div style="font-weight:500">${escapeHtml(_formData.preferredDate)} · ${escapeHtml(_formData.preferredTime)}</div></div>
        <div><div style="color:var(--bark-light);margin-bottom:2px">Home size</div><div style="font-weight:500">${escapeHtml(_formData.homeSize)}</div></div>
        <div><div style="color:var(--bark-light);margin-bottom:2px">Rate</div><div style="font-weight:500">$${_cleaner.hourly_rate}/hr</div></div>
      </div>
      ${_formData.notes ? `<div style="margin-top:12px;font-size:13px;color:var(--bark-mid);border-top:1px solid var(--border);padding-top:12px">"${escapeHtml(_formData.notes)}"</div>` : ''}
    </div>

    <p style="font-size:12px;color:var(--bark-light);line-height:1.7;margin-bottom:1rem">
      By sending this request you agree to Sparkl's
      <a href="#/terms" style="color:var(--sage)">Terms of Service</a>.
      ${escapeHtml(_cleaner.full_name)} will respond within 24 hours.
      Payment is only collected once the booking is confirmed.
    </p>

    <div id="confirmError" style="display:none;color:var(--terracotta);font-size:13px;margin-bottom:1rem"></div>

    <div class="modal-footer">
      <button class="modal-btn-sec" id="modalBack">← Back</button>
      <button class="modal-btn-pri" id="modalNext">Send Request ✓</button>
    </div>
  `
}

function renderStep3() {
  return `
    <div style="text-align:center;padding:1.5rem 0">
      <div style="font-size:56px;margin-bottom:1rem">🌿</div>
      <h2 style="margin-bottom:0.5rem">Request sent!</h2>
      <p style="color:var(--bark-mid);font-size:14px;line-height:1.7;margin-bottom:1.5rem">
        ${escapeHtml(_cleaner.full_name)} will respond within 24 hours.
        You'll receive a confirmation email at <strong>${escapeHtml(_formData.clientEmail)}</strong>
        once they accept. Keep your booking on Sparkl to stay protected.
      </p>
      <button class="modal-btn-pri" id="modalToDashboard" style="width:100%">
        View my bookings →
      </button>
    </div>
  `
}
