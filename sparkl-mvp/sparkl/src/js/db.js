/**
 * db.js — All Supabase queries live here.
 *
 * This keeps data access in one place. If you swap Supabase for something
 * else later, you only change this file.
 */

import { supabase } from './supabase.js'

// ─── CLEANERS ────────────────────────────────────────────────────────────────

/**
 * Fetch all approved, publicly listed cleaners.
 * Only cleaners with status='approved' and is_listed=true appear on browse.
 */
export async function getCleaners({ serviceType } = {}) {
  let query = supabase
    .from('cleaners')
    .select('*')
    .eq('status', 'approved')
    .eq('is_listed', true)
    .order('is_top_rated', { ascending: false })
    .order('rating_average', { ascending: false })

  if (serviceType === 'Top Rated') {
    query = query.eq('is_top_rated', true)
  } else if (serviceType && serviceType !== 'All') {
    // services is a text[] column; filter if array contains the value
    query = query.contains('services', [serviceType])
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

/**
 * Fetch a single cleaner by their slug (url-friendly name).
 */
export async function getCleanerBySlug(slug) {
  const { data, error } = await supabase
    .from('cleaners')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'approved')
    .single()

  if (error) throw error
  return data
}

/**
 * Fetch a single cleaner by their ID.
 */
export async function getCleanerById(id) {
  const { data, error } = await supabase
    .from('cleaners')
    .select('*')
    .eq('id', id)
    .eq('status', 'approved')
    .single()

  if (error) throw error
  return data
}

// ─── REVIEWS ─────────────────────────────────────────────────────────────────

/**
 * Fetch reviews for a cleaner, most recent first.
 */
export async function getReviewsForCleaner(cleanerId) {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('cleaner_id', cleanerId)
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) throw error
  return data
}

// ─── BOOKING REQUESTS ────────────────────────────────────────────────────────

/**
 * Submit a new booking request.
 * Returns the created booking record.
 */
export async function submitBookingRequest(payload) {
  const { data, error } = await supabase
    .from('booking_requests')
    .insert([
      {
        cleaner_id: payload.cleanerId,
        client_name: payload.clientName,
        client_email: payload.clientEmail,
        client_phone: payload.clientPhone,
        service_type: payload.serviceType,
        preferred_date: payload.preferredDate,
        preferred_time: payload.preferredTime,
        home_size: payload.homeSize,
        notes: payload.notes,
        status: 'pending',
      },
    ])
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Fetch all booking requests for a cleaner (used in cleaner dashboard — Phase 2).
 */
export async function getBookingRequestsForCleaner(cleanerId) {
  const { data, error } = await supabase
    .from('booking_requests')
    .select('*')
    .eq('cleaner_id', cleanerId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Fetch all booking requests made by a client email (Phase 2 — pre-auth fallback).
 */
export async function getBookingRequestsByClient(clientEmail) {
  const { data, error } = await supabase
    .from('booking_requests')
    .select(`
      *,
      cleaners (
        id, slug, full_name, neighbourhood, emoji_placeholder, rating_average
      )
    `)
    .eq('client_email', clientEmail)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// ─── APPLICATIONS ────────────────────────────────────────────────────────────

/**
 * Submit a new cleaner application.
 * Goes into the applications table for admin review — does NOT
 * create a cleaners row until manually approved.
 */
export async function submitCleanerApplication(payload) {
  const { data, error } = await supabase
    .from('applications')
    .insert([
      {
        full_name: payload.fullName,
        email: payload.email,
        phone: payload.phone,
        neighbourhood: payload.neighbourhood,
        languages: payload.languages,
        years_experience: payload.yearsExperience,
        services: payload.services,
        hourly_rate: payload.hourlyRate,
        bio: payload.bio,
        available_days: payload.availableDays,
        agreed_ic_terms: payload.agreedIcTerms,
        agreed_background_check: payload.agreedBackgroundCheck,
        agreed_platform_terms: payload.agreedPlatformTerms,
        agreed_no_off_platform: payload.agreedNoOffPlatform,
        status: 'pending',
      },
    ])
    .select()
    .single()

  if (error) throw error
  return data
}
