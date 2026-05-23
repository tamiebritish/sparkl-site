/**
 * forms.js — Form validation helpers and form-to-object extraction.
 *
 * Keeps form logic out of page controllers.
 */

// ─── VALIDATION ───────────────────────────────────────────────────────────────

/**
 * Validate a booking request form.
 * Returns { valid: boolean, errors: string[] }
 */
export function validateBookingForm(data) {
  const errors = []

  if (!data.clientName?.trim()) errors.push('Your name is required.')
  if (!data.clientEmail?.trim() || !isValidEmail(data.clientEmail)) {
    errors.push('A valid email address is required.')
  }
  if (!data.clientPhone?.trim()) errors.push('Your phone number is required.')
  if (!data.serviceType) errors.push('Please select a service type.')
  if (!data.preferredDate) errors.push('Please choose a preferred date.')
  if (!data.preferredTime) errors.push('Please choose a preferred time.')
  if (!data.homeSize) errors.push('Please select your home size.')

  // Prevent past dates
  if (data.preferredDate) {
    const chosen = new Date(data.preferredDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (chosen < today) errors.push('Preferred date cannot be in the past.')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Validate a cleaner application form.
 * Returns { valid: boolean, errors: string[] }
 */
export function validateApplicationForm(data) {
  const errors = []

  if (!data.fullName?.trim()) errors.push('Full name is required.')
  if (!data.email?.trim() || !isValidEmail(data.email)) {
    errors.push('A valid email address is required.')
  }
  if (!data.phone?.trim()) errors.push('Phone number is required.')
  if (!data.neighbourhood) errors.push('Please select your neighbourhood.')
  if (!data.yearsExperience) errors.push('Please select your experience level.')
  if (!data.services?.length) errors.push('Please select at least one service you offer.')
  if (!data.hourlyRate?.trim()) errors.push('Your hourly rate is required.')
  if (!data.bio?.trim() || data.bio.trim().length < 50) {
    errors.push('Bio must be at least 50 characters — help clients understand who you are.')
  }
  if (!data.availableDays?.length) errors.push('Please select at least one available day.')

  // All 4 agreement checkboxes required
  if (!data.agreedIcTerms) errors.push('You must acknowledge your status as an independent contractor.')
  if (!data.agreedBackgroundCheck) errors.push('You must consent to a background check.')
  if (!data.agreedPlatformTerms) errors.push("You must agree to Sparkl's platform terms.")
  if (!data.agreedNoOffPlatform) errors.push('You must agree not to solicit off-platform bookings.')

  return { valid: errors.length === 0, errors }
}

// ─── FORM EXTRACTION ──────────────────────────────────────────────────────────

/**
 * Read all booking request form fields into a plain object.
 */
export function extractBookingFormData(formEl) {
  return {
    clientName: formEl.querySelector('[name="client_name"]')?.value ?? '',
    clientEmail: formEl.querySelector('[name="client_email"]')?.value ?? '',
    clientPhone: formEl.querySelector('[name="client_phone"]')?.value ?? '',
    serviceType: formEl.querySelector('[name="service_type"]')?.value ?? '',
    preferredDate: formEl.querySelector('[name="preferred_date"]')?.value ?? '',
    preferredTime: formEl.querySelector('[name="preferred_time"]')?.value ?? '',
    homeSize: formEl.querySelector('[name="home_size"]')?.value ?? '',
    notes: formEl.querySelector('[name="notes"]')?.value ?? '',
  }
}

/**
 * Read all cleaner application form fields into a plain object.
 */
export function extractApplicationFormData(formEl) {
  const checked = (name) =>
    [...formEl.querySelectorAll(`[name="${name}"]`)]
      .filter(el => el.checked)
      .map(el => el.value)

  return {
    fullName: formEl.querySelector('[name="full_name"]')?.value ?? '',
    email: formEl.querySelector('[name="email"]')?.value ?? '',
    phone: formEl.querySelector('[name="phone"]')?.value ?? '',
    neighbourhood: formEl.querySelector('[name="neighbourhood"]')?.value ?? '',
    languages: formEl.querySelector('[name="languages"]')?.value ?? '',
    yearsExperience: formEl.querySelector('[name="years_experience"]')?.value ?? '',
    services: checked('services'),
    hourlyRate: formEl.querySelector('[name="hourly_rate"]')?.value ?? '',
    bio: formEl.querySelector('[name="bio"]')?.value ?? '',
    availableDays: checked('available_days'),
    agreedIcTerms: formEl.querySelector('[name="agreed_ic_terms"]')?.checked ?? false,
    agreedBackgroundCheck: formEl.querySelector('[name="agreed_background_check"]')?.checked ?? false,
    agreedPlatformTerms: formEl.querySelector('[name="agreed_platform_terms"]')?.checked ?? false,
    agreedNoOffPlatform: formEl.querySelector('[name="agreed_no_off_platform"]')?.checked ?? false,
  }
}

// ─── UI FEEDBACK ──────────────────────────────────────────────────────────────

/**
 * Show validation errors above a form.
 * Creates or updates a #form-errors element inside the form.
 */
export function showFormErrors(formEl, errors) {
  let errorBox = formEl.querySelector('.form-errors')
  if (!errorBox) {
    errorBox = document.createElement('div')
    errorBox.className = 'form-errors'
    formEl.prepend(errorBox)
  }
  errorBox.innerHTML = `
    <ul style="margin:0;padding-left:1.25rem">
      ${errors.map(e => `<li>${e}</li>`).join('')}
    </ul>
  `
  errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

/**
 * Clear any displayed form errors.
 */
export function clearFormErrors(formEl) {
  formEl.querySelector('.form-errors')?.remove()
}

// ─── UTILITIES ────────────────────────────────────────────────────────────────

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

/**
 * Set a button into a loading state and return a reset function.
 * Usage: const reset = setButtonLoading(btn, 'Sending…')
 *        // later: reset()
 */
export function setButtonLoading(btn, loadingText = 'Loading…') {
  const original = btn.textContent
  btn.disabled = true
  btn.textContent = loadingText
  return () => {
    btn.disabled = false
    btn.textContent = original
  }
}
