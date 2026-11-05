import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/+esm';

const db = createClient('https://idkefkgyiukoicdhrvms.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlka2Vma2d5aXVrb2ljZGhydm1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NTE0MDcsImV4cCI6MjA5MzAyNzQwN30.EsWqeDn1BSx6G_LitNP6SEgRBkh77MHC2kufhbFhBvE');
const signIn = document.querySelector('#booking-signin');
const signOut = document.querySelector('#booking-signout');
const accountStatus = document.querySelector('#account-status');
const request = document.querySelector('#booking-request');
const history = document.querySelector('#booking-history');
let generation = 0;

async function loadHistory(version) {
  const status = document.querySelector('#history-status');
  const list = document.querySelector('#booking-list');
  status.textContent = 'Loading bookings…';
  list.replaceChildren();
  const {data, error} = await db.from('booking_requests')
    .select('id, cleaner_id, created_at, preferred_date, service_type, status')
    .order('created_at', {ascending: false});
  if (version !== generation) return;
  if (error) {
    status.textContent = 'Your bookings could not be loaded. Please try again.';
    return;
  }
  status.textContent = data.length ? '' : 'You have no saved bookings yet.';
  for (const booking of data) {
    const row = document.createElement('li');
    const title = document.createElement('strong');
    title.textContent = booking.service_type + ' · ' + booking.status;
    row.append(title, document.createTextNode(' · ' + (booking.preferred_date || booking.created_at.slice(0, 10))));
    if (booking.cleaner_id && ['confirmed', 'completed'].includes(booking.status)) {
      const link = document.createElement('a');
      link.href = './?specialist=' + encodeURIComponent(booking.cleaner_id) + '#request';
      link.textContent = 'Book again';
      row.append(document.createTextNode(' · '), link);
    }
    list.append(row);
  }
}

function updateAccount(session, clearRequest = false) {
  const version = ++generation;
  signIn.hidden = Boolean(session);
  signOut.hidden = !session;
  accountStatus.textContent = session ? 'Signed in as ' + session.user.email : 'Sign in to save or view your bookings.';
  if (request) {
    request.hidden = !session;
    if (!session && clearRequest) {
      request.reset();
      request.querySelector('#booking-preference').dispatchEvent(new Event('change'));
      request.querySelector('.status').textContent = '';
    }
  }
  if (history) {
    history.hidden = !session;
    if (session) void loadHistory(version);
    else document.querySelector('#booking-list').replaceChildren();
  }
}

signIn.addEventListener('submit', async event => {
  event.preventDefault();
  const button = signIn.querySelector('button');
  button.disabled = true;
  try {
    const {error} = await db.auth.signInWithOtp({
      email: new FormData(signIn).get('email').trim(),
      options: {emailRedirectTo: window.location.origin + window.location.pathname + window.location.search}
    });
    accountStatus.textContent = error ? 'Could not send the sign-in link. Please try again.' : 'Check your email for your sign-in link.';
  } finally {
    button.disabled = false;
  }
});

signOut.addEventListener('click', async () => {
  const {error} = await db.auth.signOut();
  if (error) accountStatus.textContent = 'Could not sign out. Please try again.';
});

request?.addEventListener('submit', async event => {
  event.preventDefault();
  const button = request.querySelector('button[type="submit"]');
  const status = request.querySelector('.status');
  const fields = new FormData(request);
  const get = name => fields.get(name)?.trim() || null;
  const specialist = get('Cleaning Specialist');
  if (specialist && !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(specialist)) {
    status.textContent = 'This specialist is unavailable for online booking. Choose another or ask Neatly to connect you.';
    return;
  }
  button.disabled = true;
  try {
    const {data: {session}} = await db.auth.getSession();
    if (!session) {
      updateAccount(null);
      return;
    }
    const {error} = await db.from('booking_requests').insert({
      client_user_id: session.user.id,
      client_email: session.user.email,
      client_name: get('Full name'),
      client_phone: get('Phone'),
      cleaner_id: specialist,
      service_type: get('Service'),
      preferred_date: get('Preferred date'),
      property_type: get('Property type'),
      frequency: get('Frequency'),
      country: get('Country or territory'),
      region: get('Parish, state or province'),
      locality: get('City, town or community'),
      notes: get('Cleaning details')
    });
    if (error) {
      status.textContent = 'Your request could not be saved. Check the specialist selection and try again.';
      return;
    }
    const link = document.createElement('a');
    link.href = 'bookings.html';
    link.textContent = 'My Bookings';
    status.replaceChildren('Request saved. Track it in ', link, '.');
    request.reset();
    request.querySelector('#booking-preference').dispatchEvent(new Event('change'));
  } finally {
    button.disabled = false;
  }
});

db.auth.onAuthStateChange((event, session) => {
  if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
    setTimeout(() => updateAccount(session, event === 'SIGNED_OUT'), 0);
  }
});
