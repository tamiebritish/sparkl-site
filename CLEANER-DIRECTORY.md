# Cleaner directory publishing

Cleaner applications arrive through the existing email intake. Review them privately. After approval and permission to publish, add only the cleaner's public profile to `cleaners.json` and deploy the change. Remove the entry and redeploy to unlist a profile.

Each entry needs `approved: true`, `name`, `location`, `services` (an array of strings), and `bio`. Optional fields are `photo` (public image URL or relative path), `availability` (public summary), and `hourlyRate` (number in JMD). Omit the rate for quote-based work. Keep service labels consistent across profiles so the filters group them together.

The JSON file is publicly accessible. Keep pending applications, contact information, vetting documents, and internal notes out of the file.
