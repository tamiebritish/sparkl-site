/**
 * pages/apply.js — Cleaner application form controller.
 *
 * Submits to Supabase applications table.
 * Application goes into pending review — admin approves before profile goes live.
 */

import { submitCleanerApplication } from '../js/db.js'
import {
  validateApplicationForm,
  extractApplicationFormData,
  showFormErrors,
  clearFormErrors,
  setButtonLoading,
} from '../js/forms.js'

let listenersBound = false

export function initApplyPage() {
  if (listenersBound) return

  const form = document.getElementById('applyForm')
  const submitBtn = document.getElementById('applySubmitBtn')

  if (!form || !submitBtn) return

  listenersBound = true
  submitBtn.addEventListener('click', async () => {
    const data = extractApplicationFormData(form)
    const { valid, errors } = validateApplicationForm(data)

    if (!valid) {
      showFormErrors(form, errors)
      return
    }

    clearFormErrors(form)
    const resetBtn = setButtonLoading(submitBtn, 'Submitting…')

    try {
      await submitCleanerApplication(data)
      showSuccessState()
    } catch (err) {
      console.error('Application submission error:', err)
      resetBtn()

      // Check for duplicate email
      if (err.code === '23505') {
        showFormErrors(form, ['An application with this email already exists. Contact us if you have questions.'])
      } else {
        showFormErrors(form, ['Something went wrong. Please try again or email hello@sparkl.ca'])
      }
    }
  })
}

function showSuccessState() {
  document.getElementById('onboardForm').style.display = 'none'
  document.getElementById('onboardSuccess').style.display = 'block'
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
