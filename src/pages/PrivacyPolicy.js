import React from 'react';
import LegalPage from './LegalPage';
import PRIVACY_POLICY from '../content/legal/privacyPolicy';

const CROSS_LINKS = [
  { phrase: 'Terms of Use', to: '/terms' },
];

export default function PrivacyPolicy() {
  return <LegalPage doc={PRIVACY_POLICY} crossLinks={CROSS_LINKS} />;
}
