  const intakeEmail = 'sales@neatlyja.com';

  for (const form of document.querySelectorAll('form[data-subject]')) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const lines = [];
      for (const [label, value] of new FormData(form)) {
        const detail = label === 'Cleaning Specialist'
          ? (value ? form.elements.namedItem(label).selectedOptions[0].textContent : '')
          : value.trim();
        if (detail) lines.push(label + ': ' + detail);
      }
      const subject = encodeURIComponent('Neatly | ' + form.dataset.subject);
      const body = encodeURIComponent(lines.join('\r\n'));
      const status = form.querySelector('.status');
      const emailLink = document.createElement('a');
      emailLink.href = 'mailto:' + intakeEmail;
      emailLink.textContent = intakeEmail;
      status.replaceChildren('If your email app did not open, you can email your details to ', emailLink, '.');
      window.location.href = 'mailto:' + intakeEmail + '?subject=' + subject + '&body=' + body;
    });
  }

  const preference = document.querySelector('#booking-preference');

  if (preference) {
    const panel = document.querySelector('#specialist-choice');
    const specialist = panel.querySelector('select');
    const status = document.querySelector('#specialist-status');
    const requested = new URLSearchParams(window.location.search).get('specialist');
    const choose = 'Choose a Cleaning Specialist';

    function updateChoice() {
      const choosing = preference.value === choose;
      panel.hidden = !choosing;
      specialist.disabled = !choosing;
      specialist.required = choosing;
    }

    if (requested && !preference.value) preference.value = choose;
    preference.addEventListener('change', updateChoice);
    updateChoice();

    fetch('cleaners.json').then(response => {
      if (!response.ok) throw new Error('Directory unavailable');
      return response.json();
    }).then(profiles => {
      const approved = profiles.filter(profile => profile.approved === true);
      specialist.options[0].textContent = 'Select a Cleaning Specialist';
      for (const profile of approved) {
        const option = document.createElement('option');
        option.value = profile.id || JSON.stringify([profile.name, profile.location]);
        option.textContent = profile.name + ' · ' + profile.location;
        specialist.append(option);
      }
      if (requested && preference.value === choose && !specialist.value) {
        const available = approved.some(profile => (profile.id || JSON.stringify([profile.name, profile.location])) === requested);
        if (available) specialist.value = requested;
        else status.textContent = 'That profile is unavailable. Choose another specialist or ask Neatly to connect you.';
      }
      if (!approved.length) status.textContent = 'No specialists are listed yet. You can ask Neatly to connect you.';
    }).catch(() => {
      specialist.options[0].textContent = 'Directory unavailable';
      status.textContent = 'The directory could not load. Try refreshing or ask Neatly to connect you.';
    });
  }
