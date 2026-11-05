const signInStatus = document.querySelector('#account-status');
const showSignInFailure = () => {
  signInStatus.textContent = 'Sign-in is unavailable right now. Refresh the page to try again.';
};
const signInTimer = setTimeout(showSignInFailure, 8000);

import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/+esm').then(({createClient}) => {
const db = createClient('https://idkefkgyiukoicdhrvms.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlka2Vma2d5aXVrb2ljZGhydm1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NTE0MDcsImV4cCI6MjA5MzAyNzQwN30.EsWqeDn1BSx6G_LitNP6SEgRBkh77MHC2kufhbFhBvE');
const signIn = document.querySelector('#booking-signin');
const signOut = document.querySelector('#booking-signout');
const accountStatus = document.querySelector('#account-status');
const request = document.querySelector('#booking-request');
const history = document.querySelector('#booking-history');
let generation = 0;

const specialistHistory = document.querySelector('#specialist-history');
const quoteButton = document.querySelector('#preview-quote');
const quoteStatus = document.querySelector('#request-quote');
let savedQuote = null;

function money(amount, currency) {
  return new Intl.NumberFormat('en-JM', {style:'currency', currency, currencyDisplay:'code'}).format(amount / 100);
}

function line(parent, text) {
  const item = document.createElement('p');
  item.textContent = text;
  parent.append(item);
  return item;
}

function action(parent, title, handler) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'button';
  button.textContent = title;
  button.addEventListener('click', async () => {
    button.disabled = true;
    try { await handler(); } finally { button.disabled = false; }
  });
  parent.append(button);
}

function link(parent, label, href) {
  const anchor = document.createElement('a');
  anchor.textContent = label;
  anchor.href = href;
  parent.append(anchor);
}

function rowFor(list, title) {
  const row = document.createElement('li');
  row.style.marginBlock = '1.5rem';
  const heading = document.createElement('h2');
  heading.style.fontSize = '1.5rem';
  heading.textContent = title;
  row.append(heading);
  list.append(row);
  return row;
}

async function loadHistory(version) {
  const status = document.querySelector('#history-status');
  const list = document.querySelector('#booking-list');
  status.textContent = 'Loading bookings…';
  list.replaceChildren();
  const {data, error} = await db.rpc(specialistHistory ? 'neatly_specialist_requests' : 'neatly_booking_progress');
  if (version !== generation) return;
  if (error) {
    status.textContent = 'Could not load requests. Refresh to try again.';
    return;
  }
  status.textContent = data.length ? '' : 'No requests yet.';
  for (const item of data) {
    const row = rowFor(list, item.service);
    line(row, [item.date, item.time, item.area].filter(Boolean).join(' · '));
    const respond = async (rpc, args) => {
      const {error: failure} = await db.rpc(rpc, args);
      if (version !== generation) return;
      if (failure) status.textContent = 'Could not update this request. Refresh and try again.';
      else await loadHistory(version);
    };
    if (specialistHistory) {
      line(row, [item.property, item.hours ? item.hours + ' hours' : '', 'Status: ' + item.status].filter(Boolean).join(' · '));
      line(row, 'Specialist response: ' + item.response);
      if (item.payout !== null) line(row, 'Expected payout: ' + money(item.payout, item.currency));
      if (item.address) line(row, 'Service address: ' + item.address);
      if (item.response === 'pending' && item.status === 'pending') {
        action(row, 'Accept', () => respond('neatly_specialist_respond', {p_booking:item.id, p_accept:true}));
        action(row, 'Decline', () => respond('neatly_specialist_respond', {p_booking:item.id, p_accept:false}));
      }
      continue;
    }
    const steps = document.createElement('ol');
    for (const text of [
      'Request sent · ' + item.status,
      'Specialist response · ' + item.response,
      'Payment · ' + item.payment,
      item.status === 'completed' ? 'Clean confirmed' : 'Clean confirmation pending',
      'Specialist payout · ' + item.payout.replace('_', ' ')
    ]) {
      const step = document.createElement('li');
      step.textContent = text;
      steps.append(step);
    }
    row.append(steps);
    if (item.total !== null) {
      line(row, 'Service ' + money(item.subtotal,item.currency) + ' + Neatly fee ' +
        money(item.fee,item.currency) + ' = ' + money(item.total,item.currency));
    }
    if (item.status === 'pending' && item.response === 'accepted' && item.payment === 'unpaid') {
      if (item.payment_url?.startsWith('https://')) link(row, 'Pay to confirm', item.payment_url);
      else line(row, 'Accepted. Your payment link is being prepared.');
    }
    if (item.reported) line(row, 'Problem reported. Payout is on hold for review.');
    if (item.payment === 'paid' && !item.reported && item.payout === 'pending') {
      const todayInJamaica = new Intl.DateTimeFormat('en-CA', {timeZone:'America/Jamaica',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
      if (item.status === 'confirmed' && item.date && item.date <= todayInJamaica) {
        action(row, 'Confirm clean done', () => respond('neatly_client_action', {p_booking:item.id}));
      }
      if (['confirmed','completed'].includes(item.status)) {
        const problem = document.createElement('textarea');
        problem.maxLength = 1000;
        const label = document.createElement('label');
        label.textContent = 'Describe the problem';
        label.append(problem);
        const details = document.createElement('details');
        const summary = document.createElement('summary');
        summary.textContent = 'Report a problem';
        details.append(summary, label);
        action(details, 'Send report', () => {
          if (!problem.value.trim()) {
            status.textContent = 'Describe the problem before sending.';
            return;
          }
          return respond('neatly_client_action', {p_booking:item.id, p_problem:problem.value.trim()});
        });
        row.append(details);
      }
    }
    if (item.status === 'declined') link(row, 'Choose another specialist', 'cleaners.html');
    if (item.cleaner_id && ['confirmed','completed'].includes(item.status)) {
      link(row, 'Book again', './?specialist=' + encodeURIComponent(item.cleaner_id) + '#request');
    }
  }
}

function requestDetails() {
  const fields = new FormData(request);
  const get = key => fields.get(key)?.trim() || null;
  return {
    specialist:get('Cleaning Specialist'), service:get('Service'), hours:Number(get('Hours')),
    name:get('Full name'), phone:get('Phone'), date:get('Preferred date'), time:get('Preferred time'),
    property:get('Property type'), frequency:get('Frequency'), country:get('Country or territory'),
    region:get('Parish, state or province'), locality:get('City, town or community'),
    notes:get('Cleaning details'), address:get('Service address')
  };
}

function quoteKey(details) {
  return JSON.stringify([details.specialist, details.service, details.hours]);
}

request?.addEventListener('input', () => {
  if (savedQuote && savedQuote.key !== quoteKey(requestDetails())) {
    savedQuote = null;
    quoteStatus.textContent = 'The request changed. Check the price again.';
  }
});

quoteButton?.addEventListener('click', async () => {
  const details = requestDetails();
  savedQuote = null;
  if (!details.specialist) {
    quoteStatus.textContent = 'If Neatly helps you find a specialist, we’ll share a quote before payment.';
    return;
  }
  if (!details.service || !Number.isInteger(details.hours) || details.hours < 1 || details.hours > 12) {
    quoteStatus.textContent = 'Choose a service and enter between 1 and 12 estimated hours.';
    return;
  }
  quoteButton.disabled = true;
  try {
    const key = quoteKey(details);
    const {data, error} = await db.rpc('neatly_quote', {
      p_cleaner:details.specialist, p_service:details.service, p_hours:details.hours
    });
    if (key !== quoteKey(requestDetails())) return;
    if (error || !data) {
      quoteStatus.textContent = 'No online price is available for this selection. Choose another specialist or ask Neatly to connect you.';
      return;
    }
    savedQuote = {key, value:data};
    quoteStatus.textContent = 'Service ' + money(data.subtotal,data.currency) +
      ' + Neatly fee ' + money(data.fee,data.currency) + ' = ' + money(data.total,data.currency) + ' total.';
  } finally {
    quoteButton.disabled = false;
  }
});

function updateAccount(session, clearRequest = false) {
  clearTimeout(signInTimer);
  const version = ++generation;
  signIn.hidden = Boolean(session);
  signOut.hidden = !session;
  accountStatus.textContent = session ? 'Signed in as ' + session.user.email : (specialistHistory ? 'Sign in to see your assigned requests.' : 'Sign in to save or view your bookings.');
  if (request) {
    request.hidden = !session;
    if (!session && clearRequest) {
      request.reset();
      request.querySelector('#booking-preference').dispatchEvent(new Event('change'));
      request.querySelector('.status').textContent = '';
    }
  }
  if (history || specialistHistory) {
    (history || specialistHistory).hidden = !session;
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
  const details = requestDetails();
  if (details.specialist && savedQuote?.key !== quoteKey(details)) {
    status.textContent = 'Check the price breakdown before sending your request.';
    return;
  }
  button.disabled = true;
  try {
    const {error} = await db.rpc('neatly_request', {p_details:details, p_quote:savedQuote?.value ?? null});
    if (error) {
      status.textContent = 'Your request could not be saved. Check the details and refresh the quote before trying again.';
      return;
    }
    status.textContent = 'Request saved. Track it in ';
    link(status, 'My Bookings', 'bookings.html');
    request.reset();
    savedQuote = null;
    quoteStatus.textContent = '';
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
}).catch(() => {
  clearTimeout(signInTimer);
  showSignInFailure();
});
