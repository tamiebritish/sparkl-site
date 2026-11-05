  const intakeEmail = 'sales@neatlyja.com';

  for (const form of document.querySelectorAll('form[data-subject]')) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const lines = [];
      for (const [label, value] of new FormData(form)) {
        const detail = value.trim();
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
