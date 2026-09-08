import React from 'react';
import LegalPage from './LegalPage';

// Section headings only — bodies are placeholders until real copy is provided.
const SECTIONS = [
  { heading: '1. Introduction' },
  { heading: '2. Information We Collect' },
  { heading: '3. How We Use Your Information' },
  { heading: '4. Sharing & Disclosure' },
  { heading: '5. Cookies & Tracking Technologies' },
  { heading: '6. Data Retention & Security' },
  { heading: '7. Your Rights & Choices' },
  { heading: "8. Children's Privacy" },
  { heading: '9. International Data Transfers' },
  { heading: '10. Changes to This Policy' },
  { heading: '11. Contact Us' },
];

export default function PrivacyPolicy() {
  return <LegalPage title="Privacy Policy" sections={SECTIONS} />;
}
