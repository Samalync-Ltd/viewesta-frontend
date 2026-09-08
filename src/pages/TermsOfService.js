import React from 'react';
import LegalPage from './LegalPage';

// Section headings only — bodies are placeholders until real copy is provided.
const SECTIONS = [
  { heading: '1. Introduction' },
  { heading: '2. Eligibility & Accounts' },
  { heading: '3. Subscriptions, Purchases & Billing' },
  { heading: '4. Acceptable Use' },
  { heading: '5. Content & Intellectual Property' },
  { heading: '6. Filmmaker Submissions' },
  { heading: '7. Termination' },
  { heading: '8. Disclaimers & Limitation of Liability' },
  { heading: '9. Governing Law' },
  { heading: '10. Changes to These Terms' },
  { heading: '11. Contact Us' },
];

export default function TermsOfService() {
  return <LegalPage title="Terms of Service" sections={SECTIONS} />;
}
