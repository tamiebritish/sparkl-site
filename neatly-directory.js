const filters = document.querySelector('#filters');
const locationFilter = document.querySelector('#location-filter');
const serviceFilter = document.querySelector('#service-filter');
const sortFilter = document.querySelector('#rate-sort');
const status = document.querySelector('#directory-status');
const list = document.querySelector('#cleaner-list');

function element(tag, text) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  return node;
}

function card(profile) {
  const node = element('article');
  node.style.cssText = 'background:white;border:1px solid var(--line);border-radius:8px;padding:1.25rem;overflow-wrap:anywhere';
  if (profile.photo) {
    const photo = element('img');
    photo.src = profile.photo;
    photo.alt = '';
    photo.loading = 'lazy';
    photo.style.cssText = 'width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:4px';
    node.append(photo);
  }
  const rate = Number.isFinite(profile.hourlyRate)
    ? new Intl.NumberFormat('en-JM', {style:'currency', currency:'JMD', currencyDisplay:'code'}).format(profile.hourlyRate) + ' per hour'
    : 'Rate by quote';
  const heading = element('h2', profile.name);
  heading.style.fontSize = '1.6rem';
  const details = element('details');
  details.append(element('summary', 'View profile'), element('p', profile.bio));
  if (profile.availability) details.append(element('p', 'Availability: ' + profile.availability));
  node.append(heading, element('p', profile.location), element('p', profile.services.join(' · ')), element('p', rate), details);
  return node;
}

function findProfiles(profiles, location, service, sort) {
  const search = location.trim().toLowerCase();
  return profiles.filter(p => p.approved === true && p.location.toLowerCase().includes(search) && (!service || p.services.includes(service))).sort((a,b) => {
    const byName = a.name.localeCompare(b.name);
    if (!sort) return byName;
    const aPriced = Number.isFinite(a.hourlyRate);
    const bPriced = Number.isFinite(b.hourlyRate);
    if (aPriced !== bPriced) return aPriced ? -1 : 1;
    if (!aPriced) return byName;
    return (sort === 'low' ? a.hourlyRate - b.hourlyRate : b.hourlyRate - a.hourlyRate) || byName;
  });
}

async function load() {
  const response = await fetch('cleaners.json');
  if (!response.ok) throw new Error('Directory unavailable');
  const profiles = (await response.json()).filter(p => p.approved === true);
  if (!profiles.length) {
    status.textContent = 'No cleaner profiles are listed yet. Approved profiles will appear here.';
    return;
  }
  for (const service of [...new Set(profiles.flatMap(p => p.services))].sort()) {
    const option = element('option', service);
    option.value = service;
    serviceFilter.append(option);
  }
  function render() {
    const matches = findProfiles(profiles, locationFilter.value, serviceFilter.value, sortFilter.value);
    status.textContent = matches.length ? matches.length + (matches.length === 1 ? ' cleaner found' : ' cleaners found') : 'No cleaners match these filters.';
    list.replaceChildren(...matches.map(card));
  }
  filters.hidden = false;
  locationFilter.addEventListener('input', render);
  serviceFilter.addEventListener('change', render);
  sortFilter.addEventListener('change', render);
  render();
}

load().catch(() => {
  status.textContent = 'The cleaner directory is unavailable right now. Please try again later.';
});
